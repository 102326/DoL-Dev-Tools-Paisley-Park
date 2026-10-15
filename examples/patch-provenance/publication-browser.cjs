'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
assert.equal(process.argv.length,7,'Usage: node publication-browser.cjs REVIEWED_UTILS_TS TYPESCRIPT_JS PLAYWRIGHT_ENTRY CHROME_EXE NEW_OUT');
const [utilsFile,compilerFile,playwrightFile,chrome,out]=process.argv.slice(2).map(v=>path.resolve(v));
assert.ok(!fs.existsSync(out),'Output must not exist');
const ts=require(compilerFile),{chromium}=require(playwrightFile),hash=v=>createHash('sha256').update(v).digest('hex');
const integration=require('../../integrations/examples/patch-observation.cjs');
const source=fs.readFileSync(utilsFile,'utf8'),ast=ts.createSourceFile(utilsFile,source,ts.ScriptTarget.Latest,true);
const owner=ast.statements.find(n=>ts.isClassDeclaration(n)&&n.name?.text==='ModUtils');assert(owner);
const methods=owner.members.filter(n=>ts.isMethodDeclaration(n)&&n.name.getText(ast)==='replaceFollowSC2DataInfo');assert.equal(methods.length,1);
const method=methods[0].getText(ast);
const compiled=ts.transpileModule('class OwnedNativePublication { '+method+' } window.OwnedNativePublication=OwnedNativePublication;',
 {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const observerSource=fs.readFileSync(path.join(__dirname,'observe.cjs'),'utf8');
fs.mkdirSync(out);
const report={status:'running',scope:'exact native method extracted by TypeScript AST; real Chrome DOM; synthetic data/node constructors only',source:{file:utilsFile,sha256:hash(source),methodSha256:hash(method),compiledSha256:hash(compiled),upstreamCommit:'unknown; local reviewed source, not a Git checkout'},cases:[]};
let server,context;
(async()=>{try{
 server=http.createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/native.js'){res.setHeader('Content-Type','application/javascript');res.end(compiled);return}
  if(req.url==='/'){res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Owned Native Publication Fixture</title><div id="owned-root"></div><script src="/native.js"></script>');return}
  res.statusCode=404;res.end();
 });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin='http://127.0.0.1:'+server.address().port;
 context=await chromium.launchPersistentContext(path.join(out,'owned-profile'),{executablePath:chrome,headless:true,chromiumSandbox:true,args:['--no-first-run','--disable-background-networking','--disable-component-update','--disable-sync']});
 report.browser={version:context.browser()?.version(),origin,privateProfileUsed:false};
 const page=await context.newPage();await page.goto(origin,{waitUntil:'load'});
 await page.addScriptTag({content:'(()=>{const module={exports:{}};'+observerSource+';window.OwnedPatchObserver=module.exports;})()'});
 for(const mode of ['success','constructor-fails','append-fails-after-removal']){
  const results=[];
  for(const observed of [false,true])results.push(await page.evaluate(({mode,observed})=>{
   const root=document.querySelector('#owned-root');root.replaceChildren();let flushes=0;
   const node=(name,tag='div')=>{const n=document.createElement(tag);n.dataset.owned=name;if(tag==='script')n.type='application/x-owned-fixture';return n};
   const oldScript=node('old-script','script'),oldStyle=node('old-style','style'),oldPassage=node('old-passage','tw-passagedata');root.append(oldScript,oldStyle,oldPassage);
   const snapshot=()=>[...root.children].map(n=>n.dataset.owned),before=snapshot(),events=[];
   const manager={rootNode:root,makeScriptNode:()=>node('new-script','script'),makeStyleNode:()=>node('new-style','style'),
    makePassageNode(item){if(mode==='constructor-fails')throw Error('owned-node-construction-failed');const n=node(item.name,'tw-passagedata');n.textContent=item.content;return n},
    flushAfterPatchCache(){flushes++}};
   const api=new window.OwnedNativePublication();api.pSC2DataManager=manager;
   const original=api.replaceFollowSC2DataInfo,originalAppend=root.appendChild;
   let wrapper;
   if(observed){wrapper=function(...args){events.push({phase:'started',nodes:snapshot()});try{const value=Reflect.apply(original,this,args);events.push({phase:'completed',nodes:snapshot()});return value}catch(e){events.push({phase:'failed',nodes:snapshot()});throw e}};api.replaceFollowSC2DataInfo=wrapper}
   if(mode==='append-fails-after-removal')root.appendChild=function(n){if(n.dataset.owned==='new-passage')throw Error('owned-append-failed');return Reflect.apply(originalAppend,this,[n])};
   let error=null,returnedUndefined=false;
   try{returnedUndefined=api.replaceFollowSC2DataInfo({passageDataItems:{items:[{name:'new-passage',content:'owned content'}]}},{styleNode:[oldStyle],scriptNode:[oldScript],passageDataNodes:[oldPassage]})===undefined}
   catch(e){error=e.message}
   finally{root.appendChild=originalAppend;if(observed){if(api.replaceFollowSC2DataInfo!==wrapper)throw Error('observer ownership lost');api.replaceFollowSC2DataInfo=original}}
   return {mode,before,after:snapshot(),flushes,error,returnedUndefined,events,methodRestored:api.replaceFollowSC2DataInfo===original};
  },{mode,observed}));
  const [control,observed]=results;
  const comparable=({events,...rest})=>rest;assert.deepEqual(comparable(control),comparable(observed));assert.equal(observed.methodRestored,true);
  if(mode==='success'){assert.deepEqual(observed.after,['new-script','new-style','new-passage']);assert.equal(observed.flushes,1);assert.equal(observed.returnedUndefined,true)}
  if(mode==='constructor-fails'){assert.deepEqual(observed.after,observed.before);assert.equal(observed.flushes,0);assert.equal(observed.error,'owned-node-construction-failed')}
  if(mode==='append-fails-after-removal'){assert.deepEqual(observed.after,['new-script','new-style']);assert.equal(observed.flushes,0);assert.equal(observed.error,'owned-append-failed')}
  report.cases.push({...observed,controlMatches:true});
 }
 report.cooperative=await page.evaluate(async sourceSha256=>{
  const root=document.querySelector('#owned-root');root.replaceChildren();let flushes=0;
  const originalNode=document.createElement('tw-passagedata');root.append(originalNode);
  const api=new window.OwnedNativePublication();api.pSC2DataManager={rootNode:root,
   makeScriptNode:()=>document.createElement('script'),makeStyleNode:()=>document.createElement('style'),
   makePassageNode:item=>{const n=document.createElement('tw-passagedata');n.textContent=item.content;return n},flushAfterPatchCache:()=>{flushes++}};
  const item={name:'Owned',content:'alpha'},sc={passageDataItems:{items:[item],map:new Map([['Owned',item]])}};
  const result=Promise.resolve(17),replacer={do_patch(ri,value){if(this!==replacer||value!==sc)throw Error('Binding lost');item.content='beta';return result}};
  const original=replacer.do_patch,originalPublish=api.replaceFollowSC2DataInfo;
  const observer=window.OwnedPatchObserver.install({replacer,utils:api,resources:['Owned'],identity:{documentId:'owned-chrome-fixture',sourceSha256}});
  const samePromise=replacer.do_patch({mod:{name:'OwnedMod'}},sc)===result;await result;
  const returnedUndefined=api.replaceFollowSC2DataInfo(sc,{styleNode:[],scriptNode:[],passageDataNodes:[originalNode]})===undefined;
  const immediately=observer.read();
  const deadline=performance.now()+1000;
  while(JSON.stringify(observer.read()).includes('digest-pending')&&performance.now()<deadline)await new Promise(resolve=>setTimeout(resolve,0));
  const beforeStop=observer.read(),cleanup=observer.stop();
  return {samePromise,returnedUndefined,flushes,domText:root.querySelector('tw-passagedata')?.textContent,immediately,beforeStop,cleanup,
   restored:replacer.do_patch===original&&api.replaceFollowSC2DataInfo===originalPublish};
 },hash(method));
 const c=report.cooperative;assert.equal(c.samePromise,true);assert.equal(c.returnedUndefined,true);assert.equal(c.flushes,1);assert.equal(c.domText,'beta');assert.equal(c.restored,true);
 assert.equal(c.beforeStop.observerErrors,0);assert.equal(JSON.stringify(c.beforeStop).includes('digest-pending'),false);
 assert.deepEqual(c.beforeStop.events.map(e=>e.phase),['resolved','returned']);
 assert.equal(c.beforeStop.events[0].before[0].sha256,hash('alpha'));assert.equal(c.beforeStop.events[0].after[0].sha256,hash('beta'));
 assert.deepEqual(c.cleanup,{patch:'restored',publication:'restored'});
 report.observerSourceSha256=hash(observerSource);
 // The bridge is a controlled fixture, not a probe installed in a real game.
 const captured=await page.evaluate(observation=>({schemaVersion:1,document:{nonce:'owned-chrome-fixture',timeOrigin:performance.timeOrigin},
  status:'stopped',observation:{...observation,active:false}}),c.beforeStop);
 await page.evaluate(record=>{window.WhiteSnakePatchProbe={read:()=>record}},captured);
 const ctx={client:{evaluate:expression=>page.evaluate(expression)}};
 const sameDocument=await integration.collect(ctx);assert.equal(sameDocument.status,'available');
 await page.reload({waitUntil:'load'});
 await page.evaluate(record=>{window.WhiteSnakePatchProbe={read:()=>record}},captured);
 const replacedDocument=await integration.collect(ctx);assert.equal(replacedDocument.status,'unsupported');
 assert.equal(replacedDocument.reason,'capture-document-mismatch');
 await page.evaluate(()=>{delete window.WhiteSnakePatchProbe});
 const absent=await integration.collect(ctx);assert.equal(absent.status,'unavailable');
 report.integration={scope:'production module evaluation through Playwright client; synthetic bridge in owned Chrome, not Integration Worker or real DoL',
  sameDocument:sameDocument.status,replacedDocument:replacedDocument.status,absent:absent.status};
 report.status='passed';
}catch(e){report.status='failed';report.error=e.message;process.exitCode=1}
finally{
 let browserClosed=false,serverClosed=false;
 try{await context?.close();browserClosed=true}catch{process.exitCode=1;report.status='failed'}
 try{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}serverClosed=true}catch{process.exitCode=1;report.status='failed'}
 report.cleanup={ownedContextClosed:browserClosed,ownedServerClosed:serverClosed};
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,status:report.status,cases:report.cases.map(c=>c.mode),cleanup:report.cleanup}));
}})();
