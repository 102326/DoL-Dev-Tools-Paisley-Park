'use strict';
// Opt-in synthetic Chrome check; no game, SDK, global Profile or model task.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {promisify}=require('node:util'),{execFile}=require('node:child_process');
const root=path.resolve(process.env.PAISLEY_TOOL_ROOT||path.join(__dirname,'../../..'));
const pc=require(root+'/scripts/lib/pc-session.cjs'),{connect}=require(root+'/scripts/lib/cdp.cjs');
const runFile=promisify(execFile),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const [chrome,outArg]=process.argv.slice(2),out=path.resolve(outArg||'');
const report={schemaVersion:1,node:process.version,platform:process.platform,scope:'Synthetic Chrome Integration document binding only',checks:[]};
let instance,admin,server,gate,peerId,sequence=0;const clients=[];
async function until(fn){const end=Date.now()+8000;while(Date.now()<end){try{if(await fn())return}catch{}await pause(25)}throw Error('Fixture readiness unavailable')}
function check(name){report.checks.push(name)}
async function capture(moduleFile,name){
 const target=path.join(out,name);
 await runFile(process.execPath,[root+'/scripts/dol-dev.cjs','evidence','--host','chrome','--host-file',instance.hostFile,'--out',target,'--scope','body','--window-ms','0','--integration-file',moduleFile],{timeout:25000,maxBuffer:2*1024*1024});
 const manifest=JSON.parse(fs.readFileSync(path.join(target,'manifest.json'),'utf8'));
 assert.equal(manifest.status,'complete','optional result must not invalidate successful Generic capture');
 assert.ok(manifest.steps.find(s=>s.name==='dom-contract'&&s.status==='completed'));
 return {manifest,target,step:manifest.steps.find(s=>s.name==='integration-0')};
}
async function rebind(name){const hostFile=path.join(out,name+'.json');const url=await admin.evaluate('location.href');await pc.bind(instance.hostFile,instance.record.target.targetId,url,hostFile);instance.hostFile=hostFile}
async function main(){
 if(!chrome||!outArg)throw Error('Usage: verify.cjs ABS_CHROME NEW_OUTPUT');fs.mkdirSync(out,{mode:0o700});
 const html=path.join(out,'fixture.html');fs.writeFileSync(html,'<!doctype html><title>Neutral Integration</title><p id="marker">fixture</p><script>window.documentGeneration=crypto.randomUUID()</script>',{flag:'wx'});
 instance=await pc.start({file:html,chrome,port:'18776',mode:'headless',out:path.join(out,'instance')});
 admin=await connect(instance.record.target.endpoint,5000,()=>{},instance.record.target.targetId);clients.push(admin);await until(()=>admin.evaluate('Boolean(window.documentGeneration)'));
 server=http.createServer(async(req,res)=>{try{await gate();res.end('ready')}catch{res.statusCode=500;res.end('failed')}});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const url='http://127.0.0.1:'+server.address().port;
 function moduleFile(name,changes=''){
  const file=path.join(out,name+'.cjs');fs.writeFileSync(file,`let detected;module.exports={contractVersion:1,describe:()=>({name:'neutral-integration',version:'1'}),detect:async({client})=>{detected=await client.evaluate('window.documentGeneration');await fetch(${JSON.stringify(url)});return 'available'},collect:async({client})=>({status:'available',detectedGeneration:detected,collectedGeneration:await client.evaluate('window.documentGeneration')}),redact:value=>value,${changes}}`,{flag:'wx'});return file;
 }
 const normal=moduleFile('normal');gate=async()=>{};
 const stable=await capture(normal,'stable');assert.equal(stable.step.status,'completed');assert.equal(stable.manifest.integrations[0].status,'available');
 const data=JSON.parse(fs.readFileSync(path.join(stable.target,'integration-0.json'),'utf8')).data;
 assert.equal(data.detectedGeneration,data.collectedGeneration);check('formal Evidence CLI uses reviewed worker on the original Chrome document');
 // Keep collection on the selected foreground page; background screenshots have a separate Windows limitation.
 peerId=(await admin.send('Target.createTarget',{url:instance.url,background:true})).targetId;
 const other=await connect(instance.record.target.endpoint,3000,()=>{},peerId);clients.push(other);await until(()=>other.evaluate('Boolean(window.documentGeneration)'));
 await other.evaluate('window.documentGeneration="interfering-page"');
 const exact=await capture(normal,'exact-target');const exactData=JSON.parse(fs.readFileSync(path.join(exact.target,'integration-0.json'),'utf8')).data;
 assert.equal(exactData.collectedGeneration,data.collectedGeneration);check('same-URL peer never substitutes for the selected target');
 const roundtrip=moduleFile('before-worker-binding','describe:async()=>{await fetch('+JSON.stringify(url)+');return {name:"neutral-integration",version:"1"}}');
 let roundtripGates=0;
 gate=async()=>{if(++roundtripGates===1)await admin.evaluate('(()=>{const original=location.href;location.hash="temporary";history.replaceState(null,"",original)})()')};
 const returned=await capture(roundtrip,'before-binding-roundtrip');assert.equal(returned.manifest.integrations[0].reason,'integration-document-failed');assert.equal(returned.step.status,'failed');check('parent remembers a URL roundtrip before the worker binds, even when current identity fields match');
 gate=async()=>{};await rebind('roundtrip-rebound');
 for(const mode of ['hash','reload']){
  gate=async()=>{const before=await admin.evaluate('window.documentGeneration');if(mode==='hash')await admin.evaluate('location.hash="changed-'+(++sequence)+'"');else{await admin.send('Page.reload');await until(async()=>{const next=await admin.evaluate('window.documentGeneration');return next&&next!==before})}};
  const changed=await capture(normal,mode);assert.equal(changed.step.status,'failed');assert.equal(changed.manifest.integrations[0].status,'failed');assert.equal(changed.manifest.integrations[0].reason,'integration-document-failed');
  const failure=JSON.parse(fs.readFileSync(path.join(changed.target,'integration-0.json'),'utf8')).data;assert.equal(failure.status,'failed');assert.equal(failure.detectedGeneration,undefined);assert.equal(failure.collectedGeneration,undefined);
  check(mode+' between detect and collect rejects mixed data while retaining Generic Evidence');
  gate=async()=>{};await rebind(mode+'-rebound');
 }
 const after=await capture(normal,'after-rebind');assert.equal(after.step.status,'completed');check('explicit new-document binding permits a new collection');
 const redaction=moduleFile('redaction','redact:async value=>{await fetch('+JSON.stringify(url)+');return value}');
 let gates=0;gate=async()=>{if(++gates===2)await admin.evaluate('location.hash="redact-change"')};
 const last=await capture(redaction,'redaction-change');assert.equal(last.manifest.integrations[0].reason,'integration-document-failed');assert.equal(last.step.status,'failed');check('document change during redact cannot publish a stale successful Integration');
 gate=async()=>{};await rebind('last-rebound');
 const missing=await capture(path.join(out,'missing.cjs'),'missing');assert.equal(missing.step.status,'failed');assert.equal(missing.manifest.integrations[0].reason,'integration-load-failed');check('missing local module remains optional and does not erase Generic artifacts');
 // Read-only hang proves worker recovery; no remote mutation or automatic retry.
 const attempts=path.join(out,'hang-attempts.txt');
 const hang=moduleFile('hang','collect:async({client})=>{require("node:fs").appendFileSync('+JSON.stringify(attempts)+',"attempt\\n");await client.evaluate("new Promise(()=>{})");return {status:"available"}}');
 const timeout=await capture(hang,'timeout');assert.equal(timeout.step.status,'failed');assert.equal(timeout.manifest.integrations[0].status,'failed');assert.equal(fs.readFileSync(attempts,'utf8'),'attempt\n');check('unresolved remote read returns a bounded optional failure with exactly one module attempt');
 gate=async()=>{const response=await fetch(instance.record.target.endpoint+'/json/close/'+instance.record.target.targetId);assert.equal(response.ok,true);await until(()=>!admin.isOpen())};
 const closed=await capture(normal,'closed-target');assert.equal(closed.manifest.integrations[0].reason,'integration-document-failed');assert.equal(closed.step.status,'failed');assert.equal(await other.evaluate('window.documentGeneration'),'interfering-page');check('closed original target fails without adopting the surviving same-URL peer');
 report.status='passed';
}
main().catch(error=>{report.status='failed';report.failure=error.code||error.message;process.exitCode=1}).finally(async()=>{
 clients.forEach(c=>c.close());
 try{if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}await instance?.stop();report.cleanup='confirmed'}catch{report.cleanup='unconfirmed';process.exitCode=1}
 if(outArg&&fs.existsSync(out))fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify(report));
});
