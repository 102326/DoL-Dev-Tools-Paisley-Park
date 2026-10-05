// Reviewed business Mod releases, installed only in this round's native validation copy.
// Uses the loader's public persistence API. Does not edit UI sources or real App storage.
const fs=require('node:fs'),path=require('node:path'),{promisify}=require('node:util'),{execFile}=require('node:child_process');
const {createHash,randomUUID}=require('node:crypto'),collectors=require('../../scripts/lib/collectors.cjs');
const {connect,targets}=require('../../scripts/lib/cdp.cjs'),integration=require('../../scripts/lib/integration.cjs');
const native=require('../../integrations/examples/native-lifecycle.cjs'),css=require('../../scripts/lib/css.cjs'),{redact}=require('../../scripts/lib/privacy.cjs');
const execute=promisify(execFile),sha=v=>createHash('sha256').update(v).digest('hex'),pause=()=>new Promise(r=>setTimeout(r,500));
const PKG='org.doldevtools.validation.lyra051213',ORIGINAL='com.vrelnir.dol.lyra.uicompat051213';
const COMPONENT=PKG+'/org.doldevtools.validation.ProbeActivity',NAME='DoLGameUI';
const HASHES=['b92913789c4738e516b92b00ec79f8be85b95dd3b66d74b67b16b203ed39f014','f416fb74d878a49295f07f471d216d373f0b723daa281dbe53edb2dc4fa8a1a0'];
const [serial,receiptArg,beforeArg,afterArg,outArg,authority]=process.argv.slice(2);
let ctx,client,out,run,receipt,owned=false,initialForward,initialReverse,originalSha;
const assert=(ok,reason)=>{if(!ok)throw Error(reason)},save=()=>{if(run)fs.writeFileSync(path.join(out,'business-workshop.json'),JSON.stringify(run,null,2))};
async function adb(...args){return (await ctx.adb(...args)).toString().trim()}
async function shell(...args){return adb('shell',...args)}
async function maps(type){return (await adb(type,'--list')).split('\n').map(s=>s.trim()).filter(Boolean).sort()}
async function installed(pkg){
 const apk=(await shell('pm','path','--user','0',pkg)).match(/^package:(\/data\/app\/[^\r\n]+\/base\.apk)$/)?.[1];assert(apk,'installed-apk-unavailable');
 return (await shell('sha256sum',apk)).split(/\s+/)[0];
}
async function release(){client?.close();client=null;if(ctx?.forwardPort)await collectors.removeForward(ctx)}
async function foreground(){assert(await shell('am','get-current-user')==='0','user-changed');const app=await collectors.app(ctx);assert(app.foregroundMatches&&ctx.appPid,'target-not-foreground')}
async function identity(){
 const parsed=JSON.parse(await client.evaluate('DoLNativeLifecycle.snapshot()'));
 const data=native.redact({status:'available',data:parsed}).data;
 assert(data.packageName===PKG&&data.versionCode===51202&&String(data.nativePid)===ctx.appPid,'native-identity-mismatch');return data;
}
async function ready(version=null,old=null){
 const deadline=Date.now()+45000;
 while(Date.now()<deadline){try{
  await foreground();if(!ctx.forwardPort)await collectors.forward(ctx);
  if(!client?.isOpen()){
   client?.close();const pages=(await targets(ctx.endpoint,1500)).filter(p=>p.type==='page'&&p.url==='https://localhost/index.html');
   assert(pages.length===1,'unique-game-target-required');client=await connect(ctx.endpoint,2000,()=>{},pages[0].id);
  }
  const now=await identity();
  const ok=await client.evaluate(`document.readyState==='complete'&&!!globalThis.SugarCube?.State&&document.querySelectorAll('#passages').length===1&&typeof modUtils?.getModLoadController==='function'&&typeof modUtils?.getModAndFromInfo==='function'`);
  if(ok&&(!old||old.activityInstance!==now.activityInstance)&&(!version||await client.evaluate(`DoLGameUI?.version===${JSON.stringify(version)}`)))return now;
 }catch{client?.close();client=null}await pause()}
 throw Error('business-game-readiness-timeout');
}
async function recreate(version){
 await foreground();const old=await identity();
 await shell('am','start','--user','0','-n',COMPONENT,'-a',PKG+'.RECREATE','--es','activityInstance',old.activityInstance);
 client.close();client=null;const now=await ready(version,old);
 assert(now.processSession===old.processSession&&now.activityIdentity!==old.activityIdentity&&now.webViewIdentity!==old.webViewIdentity,'business-native-recreate-unproven');return now;
}
async function artifact(file,index){
 const bytes=fs.readFileSync(file);assert(bytes.length<1048576&&sha(bytes)===HASHES[index],'reviewed-mod-artifact-mismatch');
 const copy=path.join(out,'input-'+index+'.mod.zip');fs.writeFileSync(copy,bytes,{flag:'wx'});
 const command="import sys,zipfile,json,hashlib\nwith zipfile.ZipFile(sys.argv[1]) as z:\n b=json.loads(z.read('boot.json'))\n assert z.testzip() is None and b['name']=='DoLGameUI' and b['version']==sys.argv[2]\n assert b['scriptFileList']==['game-ui.js'] and b['styleFileList']==['game-ui.css']\n assert any(d['modName']=='GameVersion' and '=0.5.12.13' in d['version'] for d in b['dependenceInfo'])\n print(json.dumps({'version':b['version'],'scriptSha256':hashlib.sha256(z.read('game-ui.js')).hexdigest(),'styleSha256':hashlib.sha256(z.read('game-ui.css')).hexdigest()}))";
 const result=await execute(process.env.DOL_WORKSHOP_PYTHON||'python',['-c',command,copy,index?'2.1.0':'2.0.3'],{timeout:10000,windowsHide:true,maxBuffer:65536});
 return {bytes,...JSON.parse(result.stdout),artifactSha256:HASHES[index]};
}
async function prove(mod,label){
 const loaded=await client.evaluate(`(async()=>{const m=modUtils.getModAndFromInfo(${JSON.stringify(NAME)}),d=m?.mod;
  const hash=async(files,name)=>{if(!Array.isArray(files))return null;const rows=files.filter(r=>r?.name===name);if(rows.length!==1||typeof rows[0].content!=='string'||rows[0].content.length>1048576)return null;
   return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(rows[0].content))),v=>v.toString(16).padStart(2,'0')).join('')};
  return {from:m?.from,version:d?.version,runtimeVersion:globalThis.DoLGameUI?.version,scriptSha256:await hash(d?.cache?.scriptFileItems?.items,'game-ui.js'),styleSha256:await hash(d?.cache?.styleFileItems?.items,'game-ui.css')}})()`);
 assert(loaded.from==='IndexDB'&&loaded.version===mod.version&&loaded.runtimeVersion===mod.version&&loaded.scriptSha256===mod.scriptSha256&&loaded.styleSha256===mod.styleSha256,'loaded-business-provenance-mismatch');
 await client.evaluate('DoLGameUI.openSettings(); true');
 const deadline=Date.now()+5000;let visible=false;
 while(Date.now()<deadline){visible=await client.evaluate(`(()=>{const n=document.getElementById('dol-midnight-controls');return !!n?.open&&n.getBoundingClientRect().width>0&&n.querySelectorAll('.dmt-close').length===1})()`);if(visible)break;await pause()}
 assert(visible,'business-settings-unavailable');
 const data=redact({...css.contract(await client.evaluate(css.expression('#dol-midnight-controls'))),scopeHash:sha('#dol-midnight-controls')});
 const dir=path.join(out,label);fs.mkdirSync(dir);const incidentId=randomUUID(),time=new Date().toISOString();
 const body=JSON.stringify({schemaVersion:1,incidentId,source:'Business UI settings CSS',capturedAt:time,data},null,2);fs.writeFileSync(path.join(dir,'css-contract.json'),body,{flag:'wx'});
 fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({schemaVersion:1,incidentId,toolVersion:require('../../package.json').version,profile:'evidence',status:data.truncated?'partial':'complete',captureStart:time,captureEnd:new Date().toISOString(),integrations:[],privacy:{content:'scoped settings CSS only; no text or input values',requiresManualReview:true},steps:[{name:'css-contract',source:'Business UI settings CSS',required:true,status:'completed',captureStart:time,captureEnd:time,artifact:{filename:'css-contract.json',sha256:sha(body)}}]},null,2),{flag:'wx'});
 await require('../../scripts/lib/action.cjs').execute({...ctx,ensureWebview:async()=>{await foreground();await identity();return client}},{type:'web-click',selector:'#dol-midnight-controls .dmt-close'});
 assert(await client.evaluate("!document.getElementById('dol-midnight-controls')?.open"),'business-settings-close-unconfirmed');
 return {...loaded,settingsOpenedAndClosed:true,cssIncidentId:incidentId,cssNodeCount:data.nodes.length,cssIncomplete:data.truncated};
}
async function main(){
 assert(/^[\w.:-]{1,128}$/.test(serial||'')&&receiptArg&&beforeArg&&afterArg&&outArg&&authority==='--test-environment=yes','explicit-owned-test-target-required');
 assert(fs.statSync(receiptArg).isFile()&&fs.statSync(receiptArg).size<=1048576,'native-receipt-size-invalid');
 receipt=JSON.parse(fs.readFileSync(receiptArg,'utf8'));
 assert(typeof receipt.incidentId==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(receipt.incidentId)&&
  receipt.sentinel?.filename==='dol-dev-tools-native-'+receipt.incidentId+'.txt'&&typeof receipt.sentinel.sha256==='string'&&
  /^[0-9a-f]{64}$/.test(receipt.sentinel.sha256)&&receipt.source==='Target-owned offline Lyra native validation copy'&&Array.isArray(receipt.phases),'native-receipt-invalid');
 assert(receipt.status==='complete'&&receipt.targetPackage===PKG&&receipt.afterUpdate?.versionCode===51202&&receipt.sentinel?.status==='preserved-after-update','native-ownership-receipt-required');
 const update=receipt.phases.find(p=>p.name==='apk-update-v2'&&p.status==='complete')?.identity;
 assert(update?.versionCode===51202&&/^[0-9a-f]{64}$/.test(update.apkSha256)&&/^\d+$/.test(update.uid),'native-receipt-identity-invalid');
 out=path.resolve(outArg);fs.mkdirSync(out);run={schemaVersion:1,incidentId:randomUUID(),source:'Reviewed DoLGameUI releases in target-owned main game',captureStart:new Date().toISOString(),status:'failed',targetPackage:PKG,nativeIncidentId:receipt.incidentId,phases:[],cleanup:{},scope:'business settings open/close and persistent release update; no complete-game regression claim',privacy:'no screenshots, Console, game state, saves or raw bodies'};save();
 ctx={options:{serial,package:PKG},adb:collectors.android({serial}),cleanup:[]};
 assert(await adb('get-state')==='device'&&await shell('am','get-current-user')==='0','selected-device-user-unavailable');
 assert(await installed(PKG)===update.apkSha256,'owned-installation-changed');
 assert((await shell('pm','list','packages','--user','0','-U',PKG)).split('\n').filter(v=>v===`package:${PKG} uid:${update.uid}`).length===1,'owned-uid-changed');owned=true;
 initialForward=await maps('forward');initialReverse=await maps('reverse');originalSha=await installed(ORIGINAL);
 assert((await collectors.app({...ctx,options:{serial,package:ORIGINAL}})).foregroundMatches,'original-foreground-required');
 const mods=[await artifact(beforeArg,0),await artifact(afterArg,1)];run.artifacts=mods.map(({bytes,...m})=>m);save();
 await require('../../scripts/lib/action.cjs').execute(ctx,{type:'wake'});await shell('am','start','--user','0','-n',COMPONENT,'-a','android.intent.action.MAIN');await ready();
 const available=await integration.collect(ctx,path.join(__dirname,'../../integrations/examples/native-lifecycle.cjs'));
 assert(available.status==='available','native-worker-integration-failed');run.nativeIntegration=available;save();
 assert(await client.evaluate(`(async()=>{const c=modUtils.getModLoadController();return (await c.listModIndexDB()).length===0&&(await c.loadHiddenModList()).length===0})()`),'fresh-business-storage-required');
 for(const [index,mod] of mods.entries()){
  await foreground();const phase={name:index?'update-business-mod':'install-business-baseline',version:mod.version,status:'dispatched',artifactSha256:mod.artifactSha256};run.phases.push(phase);save();
  const persisted=await client.evaluate(`(async()=>{if(JSON.parse(DoLNativeLifecycle.snapshot()).packageName!==${JSON.stringify(PKG)})throw Error('Wrong target');
   const c=modUtils.getModLoadController(),names=await c.listModIndexDB();if((await c.loadHiddenModList()).length||names.some(n=>n!==${JSON.stringify(NAME)})||names.length!==${index})throw Error('Storage changed');
   const encoded=${JSON.stringify(mod.bytes.toString('base64'))},bytes=Uint8Array.from(atob(encoded),v=>v.charCodeAt(0)),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('');
   const boot=await c.checkModZipFileIndexDB(encoded);if(boot?.name!==${JSON.stringify(NAME)}||boot.version!==${JSON.stringify(mod.version)}||hash!==${JSON.stringify(mod.artifactSha256)})throw Error('Input mismatch');
   await c.addModIndexDB(${JSON.stringify(NAME)},encoded);return (await c.listModIndexDB()).length===1&&(await c.listModIndexDB())[0]===${JSON.stringify(NAME)}})()`);
  assert(persisted===true,'business-persistence-unconfirmed');phase.persisted=true;save();
  phase.native=await recreate(mod.version);phase.observed=await prove(mod,index?'after':'before');phase.status='complete';save();
 }
 await release();run.phases.push({name:'app-restart-retention',status:'dispatched'});save();
 const previous=run.phases[1].native;await require('../../scripts/lib/action.cjs').execute(ctx,{type:'restart'});
 const restarted=await ready('2.1.0');assert(restarted.processSession!==previous.processSession,'restart-generation-unproven');
 run.phases.at(-1).native=restarted;run.phases.at(-1).observed=await prove(mods[1],'after-restart');run.phases.at(-1).status='complete';
 assert((await shell('run-as',PKG,'sha256sum','files/'+receipt.sentinel.filename)).split(/\s+/)[0]===receipt.sentinel.sha256,'owned-sentinel-retention-failed');run.sentinelPreserved=true;run.status='verification-complete';save();
}
main().catch(error=>{if(run){run.status=run.phases.some(p=>p.persisted)?'partial':'failed';run.reason=/^[a-z0-9-]+$/.test(error.message)?error.message:'operation-failed; raw output omitted';save()}else console.error('Reviewed releases, completed native receipt and explicit test authority required');process.exitCode=1}).finally(async()=>{
 if(!run)return;try{await release();run.cleanup.forward='removed'}catch{run.cleanup.forward='unknown'}
 try{assert(JSON.stringify(await maps('forward'))===JSON.stringify(initialForward)&&JSON.stringify(await maps('reverse'))===JSON.stringify(initialReverse),'mappings-changed');run.cleanup.existingMappings='unchanged'}catch{run.cleanup.existingMappings='unknown'}
 try{assert(await installed(ORIGINAL)===originalSha,'original-apk-changed');run.cleanup.originalApp='APK unchanged'}catch{run.cleanup.originalApp='unknown'}
 try{if(owned){assert(await shell('am','get-current-user')==='0','cleanup-user-changed');if((await collectors.app(ctx)).foregroundMatches){await shell('am','force-stop','--user','0',PKG);await shell('am','start','--user','0','-n',ORIGINAL+'/com.vrelnir.dol.MainActivity','-a','android.intent.action.MAIN');assert((await collectors.app({...ctx,options:{serial,package:ORIGINAL}})).foregroundMatches,'restore-unconfirmed');run.cleanup.foreground='original App confirmed'}else run.cleanup.foreground='other foreground preserved'}}catch{run.cleanup.foreground='unknown'}
 run.cleanup.businessMod='owned test-copy installation retained; no deletion or clearing';
 if(run.status==='verification-complete'){run.status=Object.values(run.cleanup).every(v=>v!=='unknown')&&run.phases.every(p=>p.observed?.cssIncomplete===false)?'complete':'partial';if(run.status==='partial')process.exitCode=1}
 run.captureEnd=new Date().toISOString();save();console.log('Business Mod validation '+run.status+'; local evidence retained.');
});
