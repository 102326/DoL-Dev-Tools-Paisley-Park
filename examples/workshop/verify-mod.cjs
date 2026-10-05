// Explicit acceptance fixture: genuine ZIP/ModLoader persistence, in a new owned browser profile only.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{promisify}=require('node:util'),{execFile,spawn}=require('node:child_process'),{randomUUID,createHash}=require('node:crypto');
const {connect,targets}=require('../../scripts/lib/cdp.cjs'),css=require('../../scripts/lib/css.cjs'),{redact}=require('../../scripts/lib/privacy.cjs'),{compare}=require('../../scripts/lib/evidence-tools.cjs');
const execute=promisify(execFile),sha=v=>createHash('sha256').update(v).digest('hex'),pause=ms=>new Promise(r=>setTimeout(r,ms));
const [gameArg,outArg,authorization]=process.argv.slice(2),game=gameArg&&path.resolve(gameArg),out=outArg&&path.resolve(outArg);
const browserFile=process.env.DOL_WORKSHOP_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',python=process.env.DOL_WORKSHOP_PYTHON||'python',name='DoLDevToolsWorkshopFixture',scope='#dol-dev-tools-packaged-workshop';
let server,browser,client,record,endpoint;
const save=()=>fs.writeFileSync(path.join(out,'workshop.json'),JSON.stringify(record,null,2));
async function waitFor(expression,seconds=30){const end=Date.now()+seconds*1000;while(Date.now()<end){try{if(await client.evaluate(expression))return}catch{}await pause(200)}throw Error('Fixture observation deadline exceeded')}
async function main(){
 if(!game||!out||authorization!=='--isolated-browser=yes'||!fs.statSync(browserFile).isFile()||!fs.statSync(game).isFile()||fs.statSync(game).size>128*1024*1024)throw Error('Existing game HTML, new output, browser and isolated-browser declaration required');
 await execute(python,['-c','import zipfile'],{timeout:5000,maxBuffer:65536,windowsHide:true});
 const original=fs.readFileSync(game),text=original.toString('utf8'),embedded=/<script\b[^>]*>\s*window\.modDataValueZipList\s*=\s*(\[[\s\S]*?\])\s*;?\s*<\/script>/g,blocks=[...text.matchAll(embedded)];
 if(blocks.length!==1)throw Error('Exactly one standard embedded Mod data block required');const entries=JSON.parse(blocks[0][1]);if(!Array.isArray(entries)||entries.length>100||entries.some(v=>typeof v!=='string'||!/^[A-Za-z0-9+/=]+$/.test(v)))throw Error('Unexpected embedded Mod block');
 // Narrow in-memory transformation of the public embedded registry; original game file stays untouched.
 const html=Buffer.from(text.replace(embedded,'<script>window.modDataValueZipList = [];</script>'));fs.mkdirSync(out);
 record={schemaVersion:1,incidentId:randomUUID(),source:'Isolated packaged Mod Workshop',captureStart:new Date().toISOString(),status:'failed',gameHtmlSha256:sha(original),servedHtmlSha256:sha(html),transformation:'standard embedded Mod registry replaced with empty array in memory',androidDeployment:'not performed',phases:[],privacy:{content:'owned fixture only',requiresManualReview:true},profileRetention:'new owned profile retained locally; no existing profile opened'};save();
 const project=path.join(out,'project');fs.mkdirSync(project);fs.copyFileSync(path.join(__dirname,'mod-fixture.js'),path.join(project,'fixture.js'));
 // No assets, proxying or remote requests. The caller supplies its own licensed game; it is not copied into the package.
 server=http.createServer((req,res)=>{if(req.url!=='/'||req.method!=='GET'){res.statusCode=404;res.end();return}res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self' data: blob: 'unsafe-inline' 'unsafe-eval'; connect-src 'none'; img-src 'none'; frame-src 'none'; worker-src 'none'; form-action 'none'");res.end(html)});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});const url='http://127.0.0.1:'+server.address().port+'/';
 const profile=path.join(out,'browser-profile');fs.mkdirSync(profile);
 browser=spawn(browserFile,['--headless=new','--no-first-run','--disable-extensions','--disable-background-networking','--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,url],{windowsHide:true,stdio:'ignore'});
 let spawnError=false;browser.on('error',()=>{spawnError=true});const active=path.join(profile,'DevToolsActivePort');for(let i=0;i<100&&!fs.existsSync(active)&&!spawnError;i++)await pause(100);
 if(spawnError||!fs.existsSync(active))throw Error('Owned browser startup unavailable');const port=fs.readFileSync(active,'utf8').split('\n')[0];if(!/^\d+$/.test(port))throw Error('Invalid browser port');endpoint='http://127.0.0.1:'+port;
 let pages;for(let i=0;i<50;i++){pages=(await targets(endpoint)).filter(p=>p.type==='page'&&p.url===url);if(pages.length===1)break;await pause(100)}if(pages?.length!==1)throw Error('Owned page unavailable');client=await connect(endpoint,10000,()=>{},pages[0].id);
 await client.send('Page.enable');record.stage='public-api-preflight';save();
 try{await waitFor(`document.readyState==='complete'&&!!window.SugarCube?.State&&!!window.modUtils&&typeof modUtils.getModLoadController==='function'&&typeof modUtils.getModAndFromInfo==='function'`,60)}catch(error){record.publicCapabilities=await client.evaluate(`({readyState:document.readyState,protocol:location.protocol,scripts:document.scripts.length,sugarcube:!!window.SugarCube?.State,utils:typeof window.modUtils,controller:typeof window.modUtils?.getModLoadController,provenance:typeof window.modUtils?.getModAndFromInfo,manager:typeof window.modSC2DataManager})`).catch(()=>({status:'unavailable'}));save();throw error}
 const empty=await client.evaluate(`(async()=>{const c=modUtils.getModLoadController();return (await c.listModIndexDB()).length===0&&(await c.loadHiddenModList()).length===0&&!modUtils.getMod(${JSON.stringify(name)})})()`);if(!empty)throw Error('Fresh Mod storage or name precondition failed');
 async function buildDeploy(label,version){
  const boot={name,version,styleFileList:[],scriptFileList:[],scriptFileList_preload:['fixture.js'],tweeFileList:[],imgFileList:[]};fs.writeFileSync(path.join(project,'boot.json'),JSON.stringify(boot));
  const sourceHash=sha(fs.readFileSync(path.join(project,'fixture.js'))),bootHash=sha(fs.readFileSync(path.join(project,'boot.json'))),zip=path.join(project,label+'.mod.zip');
  const phase={label,version,captureStart:new Date().toISOString(),sourceSha256:sourceHash,bootSha256:bootHash,status:'unknown'};record.phases.push(phase);record.stage=label+'-build';save();
  // Target-owned fixed build: Python stdlib ZIP, exactly two known files, exclusive output.
  await execute(python,['-c',"import sys,zipfile,pathlib\np=pathlib.Path(sys.argv[1])\nwith zipfile.ZipFile(sys.argv[2],'x',compression=zipfile.ZIP_STORED) as z:\n for n in ('boot.json','fixture.js'): z.write(p/n,n)\nwith zipfile.ZipFile(sys.argv[2]) as z:\n assert z.testzip() is None and z.namelist()==['boot.json','fixture.js']\n for n in z.namelist(): assert z.read(n)==(p/n).read_bytes()",project,zip],{timeout:10000,maxBuffer:65536,windowsHide:true});
  const bytes=fs.readFileSync(zip);if(bytes.length>65536)throw Error('Fixture ZIP exceeds bound');phase.artifactSha256=sha(bytes);save();
  record.stage=label+'-persist';save();
  const deployed=await client.evaluate(`(async()=>{const c=modUtils.getModLoadController(),names=await c.listModIndexDB();if(names.some(n=>n!==${JSON.stringify(name)})||(await c.loadHiddenModList()).length)throw Error('Storage ownership changed');const data=${JSON.stringify(bytes.toString('base64'))},b=Uint8Array.from(atob(data),c=>c.charCodeAt(0)),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',b)),v=>v.toString(16).padStart(2,'0')).join('');const boot=await c.checkModZipFileIndexDB(data);if(boot?.name!==${JSON.stringify(name)}||boot.version!==${JSON.stringify(version)}||digest!==${JSON.stringify(phase.artifactSha256)})throw Error('Deployment input mismatch');await c.addModIndexDB(${JSON.stringify(name)},data);return {sha256:digest,persisted:(await c.listModIndexDB()).length===1&&(await c.listModIndexDB())[0]===${JSON.stringify(name)}}})()`);
  if(!deployed?.persisted||deployed.sha256!==phase.artifactSha256)throw Error('Persistence confirmation unavailable');phase.deployment=deployed;save();
  record.stage=label+'-reload';save();const previous=(await client.send('Page.getFrameTree')).frameTree.frame.loaderId;await client.send('Page.reload',{ignoreCache:true});
  let current;const deadline=Date.now()+30000;while(Date.now()<deadline){current=(await client.send('Page.getFrameTree')).frameTree.frame.loaderId;if(current&&current!==previous)break;await pause(100)}if(!current||current===previous)throw Error('New document loader unavailable');phase.newDocumentConfirmed=true;save();
  await waitFor(`(()=>{const n=document.querySelector(${JSON.stringify(scope+' button')});return document.readyState==='complete'&&n?.getBoundingClientRect().width===${label==='before'?20:48}&&window.modUtils?.getMod(${JSON.stringify(name)})?.version===${JSON.stringify(version)}})()`,60);
  // ModLoader releases ZIP objects after startup. Its public ModInfo retains this fixture's preload source.
  record.stage=label+'-loaded-source';save();
  const loaded=await client.evaluate(`(()=>{const m=modUtils.getModAndFromInfo(${JSON.stringify(name)}),files=m?.mod?.scriptFileList_preload,meta={from:m?.from??null,version:m?.mod?.version??null,sourceEntries:Array.isArray(files)?files.length:null};if(!Array.isArray(files)||files.length!==1||files[0][0]!=='fixture.js'||typeof files[0][1]!=='string'||files[0][1].length>65536)return {...meta,sourceStatus:'unavailable'};return {...meta,ownedSource:files[0][1]}})()`);
  if(typeof loaded?.ownedSource==='string'){loaded.sourceSha256=sha(loaded.ownedSource);delete loaded.ownedSource}
  phase.loaded=loaded;save();if(loaded?.from!=='IndexDB'||loaded.version!==version||loaded.sourceSha256!==sourceHash)throw Error('Loaded Mod provenance mismatch');phase.status='complete';phase.captureEnd=new Date().toISOString();save();
 }
 async function capture(label){
  const dir=path.join(out,label);fs.mkdirSync(dir);const incidentId=randomUUID(),start=new Date().toISOString(),data=redact({...css.contract(await client.evaluate(css.expression(scope))),scopeHash:sha(scope)}),source='Owned packaged Mod CSS';
  const body=JSON.stringify({schemaVersion:1,incidentId,source,capturedAt:new Date().toISOString(),data},null,2);fs.writeFileSync(path.join(dir,'css-contract.json'),body,{flag:'wx'});const end=new Date().toISOString();
  const button=data.nodes.filter(n=>n.tag==='button');if(button.length!==1)throw Error('Fixture button not unique');
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({schemaVersion:1,incidentId,toolVersion:require('../../package.json').version,profile:'evidence',captureStart:start,captureEnd:end,status:'complete',steps:[{name:'css-contract',source,required:true,status:'completed',captureStart:start,captureEnd:end,artifact:{filename:'css-contract.json',sha256:sha(body)}}],integrations:[],privacy:{content:'owned fixture only',requiresManualReview:true}},null,2),{flag:'wx'});return {incidentId,width:button[0].rect.width,height:button[0].rect.height};
 }
 await buildDeploy('before','1.0.0');record.before=await capture('before');save();if(record.before.width!==20||record.before.height!==20)throw Error('Baseline mismatch');
 const file=path.join(project,'fixture.js'),source=fs.readFileSync(file,'utf8');if(!source.includes('const size = 20;'))throw Error('Implicated source unavailable');fs.writeFileSync(file,source.replace('const size = 20;','const size = 48;'));
 await buildDeploy('after','1.0.1');record.after=await capture('after');save();if(record.after.width!==48||record.after.height!==48)throw Error('Fixed fixture mismatch');
 const result=compare(path.join(out,'before'),path.join(out,'after'),path.join(out,'comparison'));if(result.status!=='complete'||!result.comparisons.some(c=>c.step==='css-contract'&&c.changes?.length))throw Error('Comparison unavailable');
 record.status='verification-complete';save();
}
async function cleanup(){
 const result={browser:'not-created',server:'not-created'};
 if(browser){
  let acknowledged=false;try{await client?.send('Browser.close');acknowledged=!!client}catch{}client?.close();
  const exited=ms=>{if(browser.exitCode!==null||browser.signalCode!==null)return Promise.resolve(true);return new Promise(resolve=>{const done=ok=>{clearTimeout(timer);browser.off('exit',onExit);resolve(ok)},onExit=()=>done(true),timer=setTimeout(()=>done(false),ms);browser.once('exit',onExit)})};
  let confirmed=await exited(2000);if(!confirmed){try{browser.kill()}catch{}confirmed=await exited(3000)}
  let portClosed=false;if(endpoint){try{await fetch(endpoint+'/json/list',{signal:AbortSignal.timeout(1000),redirect:'error'})}catch(error){portClosed=error.cause?.code==='ECONNREFUSED'}}
  result.browser=confirmed&&portClosed?'closed':'unknown';result.closeAcknowledged=acknowledged;result.rootProcessExited=confirmed;result.endpointRefused=portClosed;
 }
 if(server){result.server=await new Promise(resolve=>{let settled=false;const done=status=>{if(settled)return;settled=true;clearTimeout(timer);resolve(status)},timer=setTimeout(()=>done('unknown'),2000);try{server.close(error=>done(error?'unknown':'closed'));server.closeAllConnections()}catch{done('unknown')}})}
 return result;
}
main().catch(()=>{if(record){record.status=record.phases.some(p=>p.deployment?.persisted||p.status==='complete')?'partial':'failed';record.reason='packaged-workshop-verification-failed; no automatic retry';save()}console.error('Packaged Mod Workshop failed; inspect retained local evidence.');process.exitCode=1}).finally(async()=>{
 const result=await cleanup();if(record){record.cleanup=result;if(record.status==='verification-complete'){record.status=result.browser==='closed'&&result.server==='closed'?'complete':'partial';if(record.status==='partial'){record.reason='owned-resource-cleanup-unconfirmed';process.exitCode=1}}record.captureEnd=new Date().toISOString();save();if(record.status==='complete')console.log('Packaged Mod Workshop complete: ZIP persisted, reloaded from IndexDB, source SHA matched, 20x20 -> 48x48; owned browser/server closure confirmed.')}
});
