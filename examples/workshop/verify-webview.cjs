// Explicit test App check. Deploys this repository's fixed fixture only; never an arbitrary supplied script.
const fs=require('node:fs'),path=require('node:path'),{promisify}=require('node:util'),{execFile}=require('node:child_process'),{randomUUID,createHash}=require('node:crypto');
const collectors=require('../../scripts/lib/collectors.cjs'),{connect}=require('../../scripts/lib/cdp.cjs'),css=require('../../scripts/lib/css.cjs'),{redact}=require('../../scripts/lib/privacy.cjs'),{compare}=require('../../scripts/lib/evidence-tools.cjs');
const execute=promisify(execFile),sha=v=>createHash('sha256').update(v).digest('hex');
const [serial,packageName,outArg,authority]=process.argv.slice(2);let ctx,client,run,out,ownedId,deployed=false;
async function main(){
 if(!/^[\w.:-]{1,128}$/.test(serial||'')||!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(packageName||'')||!outArg||authority!=='--test-environment=yes')throw Error('Explicit test device/App/output required');
 out=path.resolve(outArg);fs.mkdirSync(out);const project=path.join(out,'project');fs.mkdirSync(project);
 for(const file of ['webview-fixture.js'])fs.copyFileSync(path.join(__dirname,file),path.join(project,file));
 // Fixed target-owned build/deploy commands; their output stays inside this copied fixture project.
 fs.writeFileSync(path.join(project,'build.cjs'),"const fs=require('node:fs');fs.mkdirSync('dist',{recursive:true});fs.copyFileSync('webview-fixture.js','dist/webview-fixture.js');");
 fs.writeFileSync(path.join(project,'deploy.cjs'),"const fs=require('node:fs');fs.mkdirSync('deployed',{recursive:true});fs.copyFileSync('dist/webview-fixture.js','deployed/webview-fixture.js');");
 run={schemaVersion:1,source:'Owned WebView Workshop fixture',incidentId:randomUUID(),captureStart:new Date().toISOString(),status:'failed',selectedDevice:'explicit; serial omitted',targetPackage:packageName,phases:[],cleanup:{fixture:'not deployed',forward:'not allocated'},businessModDeployment:'not performed; transient owned DOM only',screenshots:'not collected'};
 const save=()=>fs.writeFileSync(path.join(out,'workshop.json'),JSON.stringify(run,null,2));save();
 ctx={options:{serial,package:packageName},adb:collectors.android({serial}),cleanup:[]};
 await require('../../scripts/lib/action.cjs').execute(ctx,{type:'wake'});
 await collectors.device(ctx);await collectors.app(ctx);if(!ctx.appPid)throw Error('Unique target PID required');run.appPid=ctx.appPid;save();
 run.cleanup.forward='unknown; allocation may occur';save();await collectors.forward(ctx);run.cleanup.forward='allocated; cleanup pending';save();
 client=await connect(ctx.endpoint,5000);ownedId='dol-dev-workshop-'+randomUUID();
 async function deploy(label){
  const phase={label,status:'unknown',captureStart:new Date().toISOString()};run.phases.push(phase);save();
  await execute(process.execPath,['build.cjs'],{cwd:project,timeout:10000,windowsHide:true});await execute(process.execPath,['deploy.cjs'],{cwd:project,timeout:10000,windowsHide:true});
  const raw=fs.readFileSync(path.join(project,'deployed/webview-fixture.js'),'utf8');phase.sourceSha256=sha(fs.readFileSync(path.join(project,'webview-fixture.js')));phase.buildSha256=sha(fs.readFileSync(path.join(project,'dist/webview-fixture.js')));phase.deployedSha256=sha(raw);if(phase.sourceSha256!==phase.buildSha256||phase.buildSha256!==phase.deployedSha256)throw Error('Fixture provenance mismatch');
  if((await ctx.adb('shell','pidof',packageName)).toString().trim()!==ctx.appPid)throw Error('App changed');
  deployed=true;run.cleanup.fixture='unknown; deployment may occur';save();const observed=await client.evaluate('('+raw+')('+JSON.stringify(ownedId)+')');phase.observed={width:observed.width,height:observed.height};phase.status='complete';phase.captureEnd=new Date().toISOString();save();return observed;
 }
 async function capture(label){
  const dir=path.join(out,label);fs.mkdirSync(dir);const start=new Date().toISOString(),incidentId=randomUUID(),data=css.contract(await client.evaluate(css.expression('#'+ownedId))),body=JSON.stringify({schemaVersion:1,incidentId,source:'Owned fixture scoped CSS',capturedAt:new Date().toISOString(),data:redact({...data,scopeHash:sha('#'+ownedId)})},null,2);fs.writeFileSync(path.join(dir,'css-contract.json'),body,{flag:'wx'});
  fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({schemaVersion:1,incidentId,toolVersion:require('../../package.json').version,profile:'evidence',captureStart:start,captureEnd:new Date().toISOString(),status:'complete',integrations:[],privacy:{content:'owned fixture CSS only',requiresManualReview:true},steps:[{name:'css-contract',source:'Owned fixture scoped CSS',required:true,status:'completed',captureStart:start,captureEnd:new Date().toISOString(),artifact:{filename:'css-contract.json',sha256:sha(body)}}]},null,2),{flag:'wx'});return incidentId;
 }
 const first=await deploy('baseline');run.beforeIncidentId=await capture('before');save();if(first.width!==20||first.height!==20)throw Error('Baseline mismatch');
 const sourceFile=path.join(project,'webview-fixture.js'),raw=fs.readFileSync(sourceFile,'utf8');if(!raw.includes('const size = 20;'))throw Error('Expected source unavailable');fs.writeFileSync(sourceFile,raw.replace('const size = 20;','const size = 48;'));
 const second=await deploy('scoped-fix');run.afterIncidentId=await capture('after');save();if(second.width!==48||second.height!==48)throw Error('Fixed layout mismatch');
 const diff=compare(path.join(out,'before'),path.join(out,'after'),path.join(out,'comparison'));if(diff.status!=='complete'||!diff.comparisons.some(c=>c.step==='css-contract'&&c.changes.length))throw Error('Comparison incomplete');run.status='complete';save();
}
main().catch(()=>{if(run){run.status=run.beforeIncidentId?'partial':'failed';run.reason='owned-webview-fixture-verification-failed; no retry'}else console.error('Explicit test target/new output required');process.exitCode=1}).finally(async()=>{
 if(run&&deployed){try{const removed=await client.evaluate(`(()=>{const id=${JSON.stringify(ownedId)},n=document.getElementById(id);if(!n)return true;if(n.getAttribute('data-dol-dev-owned')!==id)return false;n.remove();return !document.getElementById(id)})()`);run.cleanup.fixture=removed?'confirmed absent':'unknown; identity conflict'}catch{run.cleanup.fixture='unknown; CDP cleanup unconfirmed'}}
 client?.close();if(ctx?.forwardPort){try{await collectors.removeForward(ctx);run.cleanup.forward='removed'}catch{run.cleanup.forward='unknown; forward ownership/cleanup unconfirmed'}}
 if(run){if(run.status==='complete'&&(run.cleanup.fixture!=='confirmed absent'||run.cleanup.forward!=='removed')){run.status='partial';process.exitCode=1}run.captureEnd=new Date().toISOString();fs.writeFileSync(path.join(out,'workshop.json'),JSON.stringify(run,null,2));console.log('Owned WebView Workshop '+run.status+'; transient fixture and forwarding cleanup recorded.')}
});
