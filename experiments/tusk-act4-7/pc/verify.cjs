'use strict';
// Own synthetic content, real installed Chrome and actual CLI subprocesses. No game input.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn,execFileSync}=require('node:child_process');
const root=path.resolve(process.env.PAISLEY_TOOL_ROOT||path.join(__dirname,'../../..')),pc=require(root+'/scripts/lib/pc-session.cjs'),{connect}=require(root+'/scripts/lib/cdp.cjs');
const [chrome,outArg,mode='headless']=process.argv.slice(2),out=path.resolve(outArg||'');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let server,admin;const results={schemaVersion:1,mode,node:process.version,platform:process.platform,checks:[]};
async function stopServer(){
 if(!server)return;
 if(server.exitCode===null&&server.signalCode===null){
  const closed=new Promise(r=>server.once('close',()=>r(true)));
  if(process.platform==='win32'){
   // Windows process signals bypass Node's cleanup handlers; close only this owned browser.
   const record=pc.record(path.join(out,'instance/chrome/host.json'));
   await new (require(root+'/scripts/lib/chrome-host.cjs').ChromeHost)(record.target).verifyBrowser();
   const pages=await require(root+'/scripts/lib/cdp.cjs').targets(record.target.endpoint);
   const page=pages.find(p=>p.type==='page');assert.ok(page,'owned browser must expose a cleanup target');
   const cleanup=await connect(record.target.endpoint,5000,()=>{},page.id);
   try{await cleanup.send('Browser.close')}finally{cleanup.close()}
  }else server.kill('SIGINT');
  assert.equal(await Promise.race([closed,pause(10000).then(()=>false)]),true,'pc-start must close');
 }
 server=null;
}
function cli(args){return execFileSync(process.execPath,[root+'/scripts/dol-dev.cjs',...args],{encoding:'utf8',timeout:20000})}
async function until(fn){const until=Date.now()+15000;while(Date.now()<until){try{const value=await fn();if(value)return value}catch{}await pause(50)}throw Error('Fixture readiness unavailable')}
function check(name){results.checks.push(name)}
async function main(){
 if(!chrome||!outArg||!['visible','headless'].includes(mode))throw Error('Usage: verify.cjs ABS_CHROME NEW_OUTPUT [headless|visible]');fs.mkdirSync(out,{mode:0o700});
 const fixture=path.join(__dirname,'fixture'),resources=path.join(out,'resources.json'),probe=path.join(out,'probe.js');
 fs.writeFileSync(resources,JSON.stringify({schemaVersion:1,resources:[{urlPath:'/assets/site.css',file:path.join(fixture,'site.css')},{urlPath:'/assets/app.js',file:path.join(fixture,'app.js')}]}));
 fs.writeFileSync(probe,'window.neutralWorkshop.read()');
 const port=mode==='headless'?18767:18768;
 server=spawn(process.execPath,[root+'/scripts/dol-dev.cjs','pc-start','--file',path.join(fixture,'index.html'),'--resources',resources,'--chrome',chrome,'--port',String(port),'--mode',mode,'--out',path.join(out,'instance')],{stdio:['ignore','pipe','pipe']});
 let output='',errors='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>errors+=d);
 let info;try{info=await until(()=>{if(server.exitCode!==null)throw Error('Startup failed');return output.includes('\n')&&JSON.parse(output.split('\n')[0])})}catch(e){fs.writeFileSync(path.join(out,'startup-stderr.log'),errors);throw e}
 let hostFile=info.hostFile,r=pc.record(hostFile);results.browser=r.browserVersion;
 admin=await connect(r.target.endpoint,5000,()=>{},r.target.targetId);
 await until(()=>admin.evaluate('Boolean(window.neutralWorkshop)'));
 cli(['pc-observe','--host-file',hostFile,'--probe',probe,'--out',path.join(out,'before')]);
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,'before/state-after.json'))).credits,100);check('CLI launch, external JS/CSS and private observation');
 const action=path.join(out,'action.json');fs.writeFileSync(action,JSON.stringify({type:'web-click',selector:'#purchase'}));
 cli(['pc-action','--host-file',hostFile,'--file',action,'--probe',probe,'--out',path.join(out,'purchase'),'--test-environment','yes']);
 const after=JSON.parse(fs.readFileSync(path.join(out,'purchase/state-after.json')));assert.deepEqual({credits:after.credits,tokens:after.tokens},{credits:90,tokens:1});
 assert.equal(await admin.evaluate('Number(document.querySelector("#tokens").textContent)'),1);check('shared Web Action dispatch and independent fixture state/DOM verify one effect');
 const journey=path.join(out,'journey.json');fs.writeFileSync(journey,JSON.stringify({schemaVersion:1,scope:'main',timeoutMs:20000,steps:[{type:'web-click',selector:'#save'},{type:'wait',selector:'#tokens',condition:'visible',timeoutMs:1000},{type:'checkpoint',capture:['dom','css','console','network','storage','environment','web-performance','screenshot']}]}));
 cli(['journey','--host','chrome','--host-file',hostFile,'--file',journey,'--out',path.join(out,'journey'),'--test-environment','yes']);
 const journeyResult=JSON.parse(fs.readFileSync(path.join(out,'journey/manifest.json')));assert.equal(journeyResult.status,'complete');assert.equal(journeyResult.steps[2].artifacts.length,8);check('shared Journey executes Web Action, waits and captures eight bound Chrome checkpoints');
 const {ChromeHost}=require(root+'/scripts/lib/chrome-host.cjs');let held=await new ChromeHost(r.target).open();held.close();await assert.rejects(held.evaluate('window.neutralWorkshop.read()'));await held.open();assert.equal((await held.evaluate('window.neutralWorkshop.read()')).tokens,1);held.close();check('explicit reconnect retains the same document; disconnected operation refuses dispatch');
 // Keep the duplicate behind the selected page: background screenshot scheduling is a separate Chrome limit.
 const decoy=(await admin.send('Target.createTarget',{url:info.url,background:true})).targetId;
 await until(async()=>JSON.parse(cli(['pc-pages','--host-file',hostFile])).length===2);
 const before=JSON.parse(fs.readFileSync(path.join(out,'before/state-after.json')));
 await admin.send('Page.reload');await until(async()=>{const v=await admin.evaluate('window.neutralWorkshop.read()');return v.documentId!==before.documentId});
 assert.throws(()=>cli(['pc-action','--host-file',hostFile,'--file',action,'--out',path.join(out,'stale'),'--test-environment','yes']));
 assert.equal(await admin.evaluate('window.neutralWorkshop.read().tokens'),0);check('same-URL reload rejects old document before dispatch');
 const rebound=path.join(out,'rebound.json');cli(['pc-bind','--host-file',hostFile,'--target-id',r.target.targetId,'--url',info.url,'--out',rebound]);hostFile=rebound;
 cli(['pc-action','--host-file',hostFile,'--file',action,'--probe',probe,'--out',path.join(out,'rebound-action'),'--test-environment','yes']);
 assert.equal(await admin.evaluate('window.neutralWorkshop.read().tokens'),1);const other=await connect(r.target.endpoint,5000,()=>{},decoy);try{assert.equal(await other.evaluate('window.neutralWorkshop.read().tokens'),0)}finally{other.close()}
 check('explicit target selects one of duplicate URLs without changing the decoy');
 await admin.evaluate('location.hash="new"');assert.throws(()=>cli(['pc-observe','--host-file',hostFile,'--out',path.join(out,'old-hash')]));
 const hash=path.join(out,'hash.json');cli(['pc-bind','--host-file',hostFile,'--target-id',r.target.targetId,'--url',info.url+'#new','--out',hash]);
 cli(['pc-observe','--host-file',hash,'--out',path.join(out,'after-hash')]);check('hash change invalidates old binding and can be explicitly rebound');
 held=await new ChromeHost(pc.record(hash).target).open();const preflight=held.assertBound.bind(held);let race=true;
 held.assertBound=async()=>{await preflight();if(race){race=false;await admin.evaluate('history.pushState(null,"","#race")')}};
 await assert.rejects(held.evaluate('document.querySelector("#purchase").click()'));held.close();assert.equal(await admin.evaluate('window.neutralWorkshop.read().tokens'),1);check('same-context URL change between preflight and evaluation cannot click');
 const raceFile=path.join(out,'race.json');cli(['pc-bind','--host-file',hash,'--target-id',r.target.targetId,'--url',info.url+'#race','--out',raceFile]);
 const saveAction=path.join(out,'save-action.json');fs.writeFileSync(saveAction,JSON.stringify({type:'web-click',selector:'#save'}));
 cli(['pc-action','--host-file',raceFile,'--file',saveAction,'--out',path.join(out,'save'),'--test-environment','yes']);
 await admin.send('Target.closeTarget',{targetId:r.target.targetId});assert.throws(()=>cli(['pc-observe','--host-file',hash,'--out',path.join(out,'closed')]));check('closed target does not adopt duplicate page');
 admin.close();admin=null;await stopServer();
 const resumed=await pc.start({file:path.join(fixture,'index.html'),resources,chrome,port:String(port),mode,out:path.join(out,'resumed'),'resume-from':info.hostFile});
 try{
  assert.equal(resumed.record.target.profileId,r.target.profileId);assert.equal(resumed.record.target.origin,r.target.origin);assert.notEqual(resumed.record.target.browserId,r.target.browserId);
  const loadAction=path.join(out,'load-action.json');fs.writeFileSync(loadAction,JSON.stringify({type:'web-click',selector:'#load'}));
  cli(['pc-action','--host-file',resumed.hostFile,'--file',loadAction,'--probe',probe,'--out',path.join(out,'retained-load'),'--test-environment','yes']);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out,'retained-load/state-after.json'))).tokens,1);check('retained profile resumes only the original origin and resource snapshot; saved fixture state survives');
  const uncertainHost=await new ChromeHost(resumed.record.target).open(),observer=await connect(resumed.record.target.endpoint,5000,()=>{},resumed.record.target.targetId);
  try{
   const pending=uncertainHost.evaluate('(()=>{document.querySelector("#purchase").click();return new Promise(r=>setTimeout(()=>r("ack"),4000))})()').then(()=>({ack:true}),e=>({code:e.code}));
   await until(async()=>(await observer.evaluate('window.neutralWorkshop.read().tokens'))===2);uncertainHost.close();assert.equal((await pending).ack,undefined);
   await uncertainHost.open();assert.equal((await uncertainHost.evaluate('window.neutralWorkshop.read()')).tokens,2);check('effect before lost ACK remains uncertain; reconnect observes once without re-dispatch');
  }finally{uncertainHost.close();observer.close()}
 }finally{await resumed.stop()}
 const updatedScript=path.join(out,'updated-app.js'),updatedResources=path.join(out,'updated-resources.json');
 fs.writeFileSync(updatedScript,fs.readFileSync(path.join(fixture,'app.js'),'utf8')+'\nwindow.reviewedBuildMarker="synthetic-update";\n');
 fs.writeFileSync(updatedResources,JSON.stringify({schemaVersion:1,resources:[{urlPath:'/assets/site.css',file:path.join(fixture,'site.css')},{urlPath:'/assets/app.js',file:updatedScript}]}));
 const updateOptions={file:path.join(fixture,'index.html'),resources:updatedResources,chrome,port:String(port),mode,out:path.join(out,'updated'),'resume-from':resumed.hostFile};
 await assert.rejects(pc.start({...updateOptions,out:path.join(out,'unreviewed-update')}),{code:'PC_RESUME_IDENTITY_CHANGED'});
 assert.equal(fs.existsSync(path.join(out,'unreviewed-update')),false);
 const updated=await pc.start({...updateOptions,'allow-resource-update':'yes'});
 try{
  assert.equal(updated.record.previousResourceDigest,resumed.record.resourceDigest);assert.equal(updated.record.target.profileId,r.target.profileId);
  const observed=await new ChromeHost(updated.record.target).open();try{assert.equal(await observed.evaluate('window.reviewedBuildMarker'),'synthetic-update')}finally{observed.close()}
  cli(['pc-action','--host-file',updated.hostFile,'--file',path.join(out,'load-action.json'),'--probe',probe,'--out',path.join(out,'updated-load'),'--test-environment','yes']);
  assert.equal(JSON.parse(fs.readFileSync(path.join(out,'updated-load/state-after.json'))).tokens,1);check('reviewed source update keeps profile and origin; unreviewed resource change refuses; actual new marker verified');
 }finally{await updated.stop()}
 results.status='passed';
}
main().catch(e=>{results.status='failed';results.failure=e.message;process.exitCode=1}).finally(async()=>{
 admin?.close();try{await stopServer()}catch(e){
  results.cleanup='unconfirmed';results.cleanupFailure=e.message;process.exitCode=1;
  // The verifier owns this Node child, but cannot close a browser whose identity failed.
  try{if(server&&server.exitCode===null&&server.signalCode===null)server.kill('SIGKILL')}catch{results.serverTermination='unconfirmed'}
  server?.stdout?.destroy();server?.stderr?.destroy();server?.unref();
 }
 if(outArg&&fs.existsSync(out)){fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results));
});
