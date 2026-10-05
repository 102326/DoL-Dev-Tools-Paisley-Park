// Explicit owned-origin Android fixture. Reuses reviewed ZIPs from the desktop Mod Workshop.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{promisify}=require('node:util'),{execFile}=require('node:child_process'),{randomUUID,createHash}=require('node:crypto');
const collectors=require('../../scripts/lib/collectors.cjs'),{connect}=require('../../scripts/lib/cdp.cjs'),css=require('../../scripts/lib/css.cjs'),{redact}=require('../../scripts/lib/privacy.cjs'),{compare}=require('../../scripts/lib/evidence-tools.cjs');
const execute=promisify(execFile),sha=b=>createHash('sha256').update(b).digest('hex'),pause=ms=>new Promise(r=>setTimeout(r,ms));
const [serial,pkg,gameArg,inputArg,outArg,authorization]=process.argv.slice(2),game=gameArg&&path.resolve(gameArg),input=inputArg&&path.resolve(inputArg),out=outArg&&path.resolve(outArg),name='DoLDevToolsWorkshopFixture',scope='#dol-dev-tools-packaged-workshop',contexts=new Map();
let run,ctx,client,server,port,origin,url,preflightUrl,ownedId,frame,root,reverseAcknowledged=false,cookieSeen=false;
const save=()=>fs.writeFileSync(path.join(out,'workshop.json'),JSON.stringify(run,null,2));
async function evaluateIn(documentIdentity,expression){
 if(!documentIdentity)throw Error('Document identity unavailable');
 const active=()=>contexts.get(documentIdentity.contextId)?.uniqueId===documentIdentity.uniqueId&&contexts.get(documentIdentity.contextId)?.frameId===documentIdentity.frameId;
 if(!active()||(await ctx.adb('shell','pidof',pkg)).toString().trim()!==ctx.appPid||!active())throw Error('Pinned document/App identity unavailable');
 const guarded=`(()=>{if(location.href!==${JSON.stringify(documentIdentity.url)})throw Error('Document URL changed');return (${expression})})()`;
 const response=await client.send('Runtime.evaluate',{expression:guarded,uniqueContextId:documentIdentity.uniqueId,awaitPromise:true,returnByValue:true});
 if(response.exceptionDetails)throw Error('Pinned evaluation failed');return response.result?.value;
}
async function evaluate(expression){return evaluateIn(frame,expression)}
async function rootEvaluate(expression){
 const current=(await client.send('Page.getFrameTree')).frameTree.frame;
 if(current.id!==root?.frameId||current.loaderId!==root.loaderId||current.url!==root.url)throw Error('Parent document changed');
 return evaluateIn(root,`(()=>{if(location.origin===${JSON.stringify(origin)})throw Error('Parent origin conflict');return (${expression})})()`);
}
async function freshFrame(targetUrl=url,ready=`document.readyState==='complete'&&!!window.SugarCube?.State&&typeof window.modUtils?.getModLoadController==='function'&&typeof window.modUtils?.getModAndFromInfo==='function'`){
 const previous=frame?.frameId;frame=null;run.stage=targetUrl===preflightUrl?'origin-preflight':'owned-frame-create';run.cleanup.frame='unknown; mount may occur';save();
 await rootEvaluate(`(()=>{const id=${JSON.stringify(ownedId)},old=document.getElementById(id);if(old){if(old.getAttribute('data-dol-dev-owned')!==id)throw Error('Frame ownership conflict');old.remove()}const n=document.createElement('iframe');n.id=id;n.setAttribute('data-dol-dev-owned',id);n.setAttribute('sandbox','allow-scripts allow-same-origin');n.setAttribute('aria-hidden','true');n.tabIndex=-1;n.style.cssText='position:fixed;left:8px;top:8px;width:80px;height:80px;border:0;pointer-events:none;';n.src=${JSON.stringify(targetUrl)};document.body.append(n);return true})()`);
 const deadline=Date.now()+60000;
 while(Date.now()<deadline){
  const tree=(await client.send('Page.getFrameTree')).frameTree,found=[];let count=0;
  if(tree.frame.id!==root.frameId||tree.frame.loaderId!==root.loaderId||tree.frame.url!==root.url)throw Error('Parent document changed');
  function visit(item){if(++count>100)throw Error('Frame inventory exceeds bound');if(item.frame.url===targetUrl)found.push(item.frame.id);for(const child of item.childFrames||[])visit(child)}visit(tree);
  if(found.length>1)throw Error('Owned frame ambiguous');
  if(found.length===1&&found[0]!==previous){
   const matches=[...contexts.values()].filter(c=>c.frameId===found[0]&&c.origin===origin);if(matches.length>1)throw Error('Owned context ambiguous');
   if(matches.length===1){frame={frameId:found[0],contextId:matches[0].id,uniqueId:matches[0].uniqueId,url:targetUrl};if(await evaluate(ready)){run.frameGenerations=(run.frameGenerations||0)+1;save();return}}
  }
  await pause(200);
 }
 throw Error('Fresh owned frame unavailable');
}
async function main(){
 if(authorization!=='--test-environment=yes'||!serial||!/^[A-Za-z0-9._:-]{1,128}$/.test(serial)||!pkg||!/^[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)+$/.test(pkg)||!game||!input||!out||fs.existsSync(out)||fs.statSync(game).size>128*1024*1024||fs.statSync(path.join(input,'workshop.json')).size>65536)throw Error('Explicit test target, owned desktop Workshop, game HTML and new output required');
 const source=JSON.parse(fs.readFileSync(path.join(input,'workshop.json'),'utf8'));if(source.status!=='complete'||source.source!=='Isolated packaged Mod Workshop'||source.phases?.length!==2||source.cleanup?.browser!=='closed'||source.cleanup?.server!=='closed')throw Error('Reviewed complete desktop Workshop with confirmed cleanup required');
 const template=fs.readFileSync(path.join(__dirname,'mod-fixture.js'),'utf8'),zips={};
 for(const [label,version,size] of [['before','1.0.0',20],['after','1.0.1',48]]){
  const phase=source.phases.find(p=>p.label===label),file=path.join(input,'project',label+'.mod.zip');if(!phase||phase.status!=='complete'||phase.version!==version||fs.statSync(file).size>65536)throw Error('Owned ZIP provenance unavailable');const bytes=fs.readFileSync(file),expected=template.replace('const size = 20;',`const size = ${size};`);if(sha(bytes)!==phase.artifactSha256||sha(expected)!==phase.sourceSha256)throw Error('Owned ZIP/source SHA mismatch');
  const boot={name,version,styleFileList:[],scriptFileList:[],scriptFileList_preload:['fixture.js'],tweeFileList:[],imgFileList:[]};
  const result=await execute(process.env.DOL_WORKSHOP_PYTHON||'python',['-c',"import sys,zipfile,json,hashlib\nwith zipfile.ZipFile(sys.argv[1]) as z:\n assert z.namelist()==['boot.json','fixture.js'] and all(i.file_size<=65536 for i in z.infolist())\n assert z.testzip() is None\n print(json.dumps({'boot':json.loads(z.read('boot.json')),'sourceSha256':hashlib.sha256(z.read('fixture.js')).hexdigest()}))",file],{timeout:10000,maxBuffer:65536,windowsHide:true});const checked=JSON.parse(result.stdout);if(JSON.stringify(checked.boot)!==JSON.stringify(boot)||checked.sourceSha256!==phase.sourceSha256)throw Error('ZIP contains unexpected files/content');zips[label]={bytes,phase};
 }
 const original=fs.readFileSync(game),text=original.toString('utf8'),pattern=/<script\b[^>]*>\s*window\.modDataValueZipList\s*=\s*(\[[\s\S]*?\])\s*;?\s*<\/script>/g,blocks=[...text.matchAll(pattern)];if(sha(original)!==source.gameHtmlSha256||blocks.length!==1)throw Error('Reviewed game source mismatch');const embedded=JSON.parse(blocks[0][1]);if(!Array.isArray(embedded)||embedded.length>100||embedded.some(v=>typeof v!=='string'||!/^[A-Za-z0-9+/=]+$/.test(v)))throw Error('Unexpected embedded registry');const html=Buffer.from(text.replace(pattern,'<script>window.modDataValueZipList = [];</script>'));if(sha(html)!==source.servedHtmlSha256)throw Error('Game transformation mismatch');
 fs.mkdirSync(out);ownedId='dol-dev-owned-frame-'+randomUUID();run={schemaVersion:1,incidentId:randomUUID(),source:'Owned-origin Android packaged Mod Workshop',captureStart:new Date().toISOString(),status:'failed',selectedDevice:'explicit; serial omitted',targetPackage:pkg,origin:'owned localhost origin; empty storage preflight required; primary game storage not accessed',desktopIncidentId:source.incidentId,gameHtmlSha256:source.gameHtmlSha256,servedHtmlSha256:source.servedHtmlSha256,phases:[],cleanup:{frame:'not-created',reverse:'not-created',forward:'not-created',runtime:'not-enabled',server:'not-created',storage:'no clearing; owned origin fixture may remain'},limits:'frame document recreation only; no App restart/native WebView recreation/APK install',privacy:{content:'owned CSS/source SHA only; no screenshots/console/game state'}};save();
 ctx={options:{serial,package:pkg},adb:collectors.android({serial}),cleanup:[]};run.stage='app-observation';save();await require('../../scripts/lib/action.cjs').execute(ctx,{type:'wake'});await collectors.device(ctx);run.stage='app-ready-wait';save();let app=await collectors.app(ctx);const readyDeadline=Date.now()+5000;while(app.foregroundMatches!==true&&Date.now()<readyDeadline){await pause(200);app=await collectors.app(ctx)}if(!ctx.appPid||app.foregroundMatches!==true)throw Error('Selected test App must be the unique foreground process');run.appPid=ctx.appPid;save();
 run.cleanup.forward='unknown; allocation attempted';save();await collectors.forward(ctx);run.cleanup.forward='allocated';save();
 server=http.createServer((req,res)=>{
  const route=req.url===new URL(url).pathname?'game':req.url===new URL(preflightUrl).pathname?'preflight':null;
  if(!route||req.method!=='GET'){res.statusCode=404;res.end();return}
  cookieSeen ||= typeof req.headers.cookie==='string'&&req.headers.cookie.length>0;
  if(cookieSeen){res.statusCode=409;res.end();return}
  res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Security-Policy',"default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; img-src 'none'; frame-src 'none'; worker-src 'none'; form-action 'none'");
  res.end(route==='game'?html:'<!doctype html><html><head><title>Owned origin preflight</title></head><body></body></html>');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 port=String(server.address().port);origin='http://127.0.0.1:'+port;const token=randomUUID();url=origin+'/'+token+'/game';preflightUrl=origin+'/'+token+'/preflight';run.cleanup.server='listening';save();
 const mappings=()=>ctx.adb('reverse','--list').then(b=>b.toString().trim().split('\n').map(s=>s.trim().split(/\s+/).slice(-2)));
 if((await mappings()).some(m=>m[0]==='tcp:'+port))throw Error('Device reverse port already owned');
 run.cleanup.reverse='unknown; allocation attempted';save();await ctx.adb('reverse','--no-rebind','tcp:'+port,'tcp:'+port);reverseAcknowledged=true;
 const allocated=(await mappings()).filter(m=>m[0]==='tcp:'+port);if(allocated.length!==1||allocated[0][1]!=='tcp:'+port)throw Error('Owned reverse confirmation unavailable');run.cleanup.reverse='allocated';save();
 run.stage='cdp-connect';save();client=await connect(ctx.endpoint,10000,(method,p)=>{
  if(method==='Runtime.executionContextCreated'){
   const c=p.context;
   if(c.auxData?.isDefault===true&&typeof c.auxData.frameId==='string'&&Number.isSafeInteger(c.id)&&typeof c.uniqueId==='string'&&(c.origin===origin||c.auxData.frameId===root?.frameId)){
    if(contexts.size>=8&&!contexts.has(c.id))throw Error('Owned contexts exceed bound');contexts.set(c.id,{id:c.id,uniqueId:c.uniqueId,frameId:c.auxData.frameId,origin:c.origin});
   }
  }else if(method==='Runtime.executionContextDestroyed')contexts.delete(p.executionContextId);else if(method==='Runtime.executionContextsCleared')contexts.clear();
 });
 // Capability is confirmed by scoped command replies; no native WebView /json/protocol request.
 await client.send('Page.enable');const parent=(await client.send('Page.getFrameTree')).frameTree.frame;
 if(typeof parent.id!=='string'||typeof parent.loaderId!=='string'||typeof parent.url!=='string'||new URL(parent.url).origin===origin)throw Error('Parent document/origin unavailable');
 root={frameId:parent.id,loaderId:parent.loaderId,url:parent.url};
 run.stage='runtime-enable';run.cleanup.runtime='unknown; enable attempted';save();await client.send('Runtime.enable');run.cleanup.runtime='enabled';save();
 const parents=[...contexts.values()].filter(c=>c.frameId===root.frameId);if(parents.length!==1)throw Error('Parent default context unavailable');root.contextId=parents[0].id;root.uniqueId=parents[0].uniqueId;
 await freshFrame(preflightUrl,`document.readyState==='complete'`);
 const empty=await evaluate(`(async()=>{if(typeof indexedDB.databases!=='function'||typeof caches?.keys!=='function')throw Error('Origin preflight unsupported');return localStorage.length===0&&sessionStorage.length===0&&document.cookie===''&&(await indexedDB.databases()).length===0&&(await caches.keys()).length===0&&(!navigator.serviceWorker||(await navigator.serviceWorker.getRegistrations()).length===0)})()`);
 if(empty!==true||cookieSeen)throw Error('Origin already has state; no clearing allowed');run.originPreflight={empty:true,parentOriginExcluded:true,content:'counts/presence only; no names or values retained'};save();await freshFrame();
 if(!(await evaluate(`(async()=>{const c=modUtils.getModLoadController();return (await c.listModIndexDB()).length===0&&(await c.loadHiddenModList()).length===0&&!modUtils.getMod(${JSON.stringify(name)})})()`)))throw Error('Fresh owned Mod storage required');
 for(const label of ['before','after']){
  const {bytes,phase}=zips[label],step={label,sourceSha256:phase.sourceSha256,artifactSha256:phase.artifactSha256,version:phase.version,status:'unknown',captureStart:new Date().toISOString()};run.phases.push(step);run.stage=label+'-persist';step.persistenceOutcome='unknown; owned write may occur';save();
  const persisted=await evaluate(`(async()=>{const c=modUtils.getModLoadController(),names=await c.listModIndexDB();if(names.some(n=>n!==${JSON.stringify(name)})||(await c.loadHiddenModList()).length)throw Error('Storage ownership changed');await c.addModIndexDB(${JSON.stringify(name)},${JSON.stringify(bytes.toString('base64'))});return (await c.listModIndexDB()).length===1&&(await c.listModIndexDB())[0]===${JSON.stringify(name)}})()`);if(persisted!==true)throw Error('Persistence unconfirmed');step.persisted=true;step.persistenceOutcome='confirmed';save();await freshFrame();
  const loaded=await evaluate(`(()=>{const m=modUtils.getModAndFromInfo(${JSON.stringify(name)}),files=m?.mod?.scriptFileList_preload;if(!Array.isArray(files)||files.length!==1||files[0][0]!=='fixture.js'||typeof files[0][1]!=='string'||files[0][1].length>65536)throw Error('Own loaded source unavailable');return {from:m.from,version:m.mod.version,source:files[0][1]}})()`);const loadedSha=sha(loaded.source);delete loaded.source;if(loaded.from!=='IndexDB'||loaded.version!==phase.version||loadedSha!==phase.sourceSha256)throw Error('Loaded provenance mismatch');step.loaded={...loaded,sourceSha256:loadedSha,newFrameConfirmed:true};
  const start=new Date().toISOString(),data=redact({...css.contract(await evaluate(css.expression(scope))),scopeHash:sha(scope)}),buttons=data.nodes.filter(n=>n.tag==='button'),size=label==='before'?20:48;if(buttons.length!==1||buttons[0].rect.width!==size||buttons[0].rect.height!==size)throw Error('Actual frame CSS mismatch');step.observed={width:buttons[0].rect.width,height:buttons[0].rect.height};
  const dir=path.join(out,label);fs.mkdirSync(dir);const incidentId=randomUUID(),body=JSON.stringify({schemaVersion:1,incidentId,source:'Owned Android frame CSS',capturedAt:new Date().toISOString(),data},null,2),end=new Date().toISOString();fs.writeFileSync(path.join(dir,'css-contract.json'),body,{flag:'wx'});fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({schemaVersion:1,incidentId,toolVersion:require('../../package.json').version,profile:'evidence',status:'complete',captureStart:start,captureEnd:end,integrations:[],privacy:{content:'owned frame CSS only',requiresManualReview:true},steps:[{name:'css-contract',source:'Owned Android frame CSS',required:true,status:'completed',captureStart:start,captureEnd:end,artifact:{filename:'css-contract.json',sha256:sha(body)}}]},null,2),{flag:'wx'});step.incidentId=incidentId;step.status='complete';step.captureEnd=end;save();
 }
 if(compare(path.join(out,'before'),path.join(out,'after'),path.join(out,'comparison')).status!=='complete')throw Error('Evidence comparison incomplete');run.status='verification-complete';save();
}
main().catch(()=>{if(run){run.status=run.phases.some(p=>p.persisted)?'partial':'failed';run.reason='owned-android-mod-workshop-failed; no retry';save()}console.error('Owned Android Mod Workshop failed; retained evidence remains local.');process.exitCode=1}).finally(async()=>{
 if(run&&client){if(run.cleanup.frame!=='not-created'){try{const absent=await rootEvaluate(`(()=>{const id=${JSON.stringify(ownedId)},n=document.getElementById(id);if(!n)return true;if(n.getAttribute('data-dol-dev-owned')!==id)return false;n.remove();return !document.getElementById(id)})()`);run.cleanup.frame=absent?'confirmed absent':'unknown'}catch{run.cleanup.frame='unknown'}}if(run.cleanup.runtime!=='not-enabled'){try{await client.send('Runtime.disable');run.cleanup.runtime='disabled'}catch{run.cleanup.runtime='unknown'}}}client?.close();
 if(run&&port&&reverseAcknowledged){try{const lines=(await ctx.adb('reverse','--list')).toString().trim().split('\n').map(s=>s.trim().split(/\s+/).slice(-2));const matches=lines.filter(m=>m[0]==='tcp:'+port);if(matches.length!==1||matches[0][1]!=='tcp:'+port)throw Error('Reverse ownership unknown');await ctx.adb('reverse','--remove','tcp:'+port);if((await ctx.adb('reverse','--list')).toString().split('\n').some(s=>s.trim().split(/\s+/).slice(-2)[0]==='tcp:'+port))throw Error('Reverse removal unconfirmed');run.cleanup.reverse='removed'}catch{run.cleanup.reverse='unknown'}}
 if(run&&ctx?.forwardPort){try{await collectors.removeForward(ctx);run.cleanup.forward='removed'}catch{run.cleanup.forward='unknown'}}
 if(server&&run)run.cleanup.server=await new Promise(resolve=>{const timer=setTimeout(()=>resolve('unknown'),2000);try{server.close(error=>{clearTimeout(timer);resolve(error?'unknown':'closed')});server.closeAllConnections()}catch{clearTimeout(timer);resolve('unknown')}});
 if(run){if(run.status==='verification-complete'){run.status=run.cleanup.frame==='confirmed absent'&&run.cleanup.runtime==='disabled'&&run.cleanup.reverse==='removed'&&run.cleanup.forward==='removed'&&run.cleanup.server==='closed'?'complete':'partial';if(run.status==='partial')process.exitCode=1}run.captureEnd=new Date().toISOString();save();console.log('Owned Android Mod Workshop '+run.status+'; frame/transport/server cleanup recorded. No APK or primary game inventory targeted.')}
});
