// One-shot target-owned recipe: native recreate + same-package APK update.
// No automatic retry of actions, screenshots, Console, game state or real saves.
const fs=require('node:fs'),path=require('node:path'),{promisify}=require('node:util'),{execFile}=require('node:child_process');
const {randomUUID,createHash}=require('node:crypto'),collectors=require('../../scripts/lib/collectors.cjs');
const {connect,targets}=require('../../scripts/lib/cdp.cjs'),native=require('../../integrations/examples/native-lifecycle.cjs');
const execute=promisify(execFile),sha=v=>createHash('sha256').update(v).digest('hex');
const PKG='org.doldevtools.validation.lyra051213',COMPONENT=PKG+'/org.doldevtools.validation.ProbeActivity';
const ORIGINAL='com.vrelnir.dol.lyra.uicompat051213';
const CERT='efdbb6da72670f631293b17d9b197b0db9aa1457e4c14d36c0d2ad3b07cbb02f';
const [serial,v1Arg,v2Arg,outArg,jdkArg,toolsArg,authority]=process.argv.slice(2);
let ctx,client,run,out,original,initialForward,initialReverse,ownInstall=false,installAttempted=false;
const save=()=>{if(run)fs.writeFileSync(path.join(out,'native-workshop.json'),JSON.stringify(run,null,2))};
const assert=(ok,reason)=>{if(!ok)throw Error(reason)};
const delay=()=>new Promise(resolve=>setTimeout(resolve,500));
async function adb(...args){return (await ctx.adb(...args)).toString().trim()}
async function shell(...args){return adb('shell',...args)}
async function mappings(type){return (await adb(type,'--list')).split('\n').map(s=>s.trim()).filter(Boolean).sort()}
async function identity(pkg){
 const text=await shell('dumpsys','package',pkg),block=text.split(`Package [${pkg}]`)[1]?.split(/\n\s*Package \[/)[0];
 assert(block,'package-identity-unavailable');
 const uid=block.match(/\b(?:userId|appId)=(\d+)/)?.[1],version=block.match(/\bversionCode=(\d+)/)?.[1];
 const installed=(await shell('pm','path','--user','0',pkg)).match(/^package:(\/data\/app\/[^\r\n]+\/base\.apk)$/)?.[1];
 assert(uid&&version&&installed,'package-identity-invalid');
 const uidRows=(await shell('pm','list','packages','--user','0','-U',pkg)).split('\n').filter(v=>v===`package:${pkg} uid:${uid}`);
 assert(Number(uid)>=10000&&uidRows.length===1,'package-uid-association-invalid');
 const hash=(await shell('sha256sum',installed)).split(/\s+/)[0];assert(/^[0-9a-f]{64}$/.test(hash),'installed-hash-unavailable');
 return {uid,versionCode:Number(version),apkSha256:hash};
}
async function foreground(){assert(await shell('am','get-current-user')==='0','selected-user-changed');const app=await collectors.app(ctx);assert(app.foregroundMatches&&ctx.appPid,'target-not-foreground');return app}
async function releaseForward(){client?.close();client=null;if(ctx.forwardPort)await collectors.removeForward(ctx)}
async function readSnapshot(expectedVersion){
 const value=await client.evaluate(`(()=>({status:'available',data:JSON.parse(DoLNativeLifecycle.snapshot()),
   page:{documentComplete:document.readyState==='complete',passages:document.querySelectorAll('#passages').length,
   sugarCube:typeof globalThis.SugarCube?.State?.passage==='string'}}))()`);
 const data=native.redact(value).data;
 assert(data.packageName===PKG&&data.versionCode===expectedVersion&&String(data.nativePid)===ctx.appPid,'native-identity-mismatch');
 return {...data,page:{documentComplete:value.page.documentComplete===true,passages:value.page.passages===1,sugarCube:value.page.sugarCube===true}};
}
async function ready(version,previous=null){
 const deadline=Date.now()+45000;
 while(Date.now()<deadline){
  try{
   await foreground();
   if(!ctx.forwardPort)await collectors.forward(ctx);
   if(!client?.isOpen()){
    client?.close();client=null;
    const pages=(await targets(ctx.endpoint,1500)).filter(p=>p.type==='page'&&['https://localhost/index.html','http://localhost/index.html','file:///android_asset/www/index.html'].includes(p.url));
    assert(pages.length===1,'unique-local-game-target-required');client=await connect(ctx.endpoint,2000,()=>{},pages[0].id);
   }
   const snapshot=await readSnapshot(version);
   if(previous&&snapshot.activityInstance===previous.activityInstance){await delay();continue}
   if(Object.values(snapshot.page).every(v=>v===true))return snapshot;
  }catch{client?.close();client=null}
  await delay();
 }
 throw Error('native-game-readiness-timeout');
}
async function checkedBuild(dir,version){
 const source=path.resolve(dir),report=JSON.parse(fs.readFileSync(path.join(source,'build-report.json'),'utf8'));
 assert(report.applicationId===PKG&&report.versionCode===version&&report.certificateSha256===CERT&&
  report.signatureVerified===true&&report.zipAlignmentVerified===true&&report.networkPermission===false&&report.cloudBackupAllowed===false,'build-report-invalid');
 const own=path.join(out,'input-'+version);fs.mkdirSync(own);
 const apk=path.join(own,'validation.apk');fs.copyFileSync(path.join(source,'validation.apk'),apk,fs.constants.COPYFILE_EXCL);
 assert(sha(fs.readFileSync(apk))===report.apkSha256,'artifact-sha-mismatch');
 const java=path.join(jdkArg,'bin/java.exe'),toolRoot=path.resolve(toolsArg),aapt=path.join(toolRoot,'sdk/android-15/aapt.exe');
 const cert=await execute(java,['-cp',path.join(toolRoot,'uber-apk-signer-1.3.0.jar'),'com.android.apksigner.ApkSignerTool','verify','--print-certs',apk],{windowsHide:true,timeout:15000});
 assert(cert.stdout.includes('certificate SHA-256 digest: '+CERT),'certificate-mismatch');
 const badge=(await execute(aapt,['dump','badging',apk],{windowsHide:true,timeout:10000})).stdout;
 const xml=(await execute(aapt,['dump','xmltree',apk,'AndroidManifest.xml'],{windowsHide:true,timeout:10000})).stdout;
 assert(badge.includes(`package: name='${PKG}' versionCode='${version}'`)&&badge.includes("launchable-activity: name='org.doldevtools.validation.ProbeActivity'"),'apk-target-mismatch');
 assert(!xml.includes('E: uses-permission')&&!xml.includes('android:sharedUserId')&&!xml.includes(ORIGINAL)&&
  /android:allowBackup[^\n]*=\(type 0x12\)0x0\s/.test(xml)&&/android:debuggable[^\n]*=\(type 0x12\)0xffffffff\s/.test(xml),'apk-isolation-mismatch');
 return {apk,versionCode:version,apkSha256:report.apkSha256,probeSourceSha256:report.probeSourceSha256};
}
async function main(){
 assert(/^[\w.:-]{1,128}$/.test(serial||'')&&v1Arg&&v2Arg&&outArg&&jdkArg&&toolsArg&&authority==='--test-environment=yes','explicit-test-environment-required');
 out=path.resolve(outArg);fs.mkdirSync(out);
 run={schemaVersion:1,incidentId:randomUUID(),source:'Target-owned offline Lyra native validation copy',captureStart:new Date().toISOString(),
  status:'failed',targetPackage:PKG,selectedDevice:'explicit; serial omitted',phases:[],cleanup:{},
  scope:'Activity recreation including its actual WebView; local business APK update; no independent WebView-only recreate',
  omitted:'screenshots, Console, log bodies, saves, cloud, game text; real business Mod update remains separate'};save();
 ctx={options:{serial,package:PKG},adb:collectors.android({serial}),cleanup:[]};
 assert(await adb('get-state')==='device'&&await shell('am','get-current-user')==='0','selected-user-device-unavailable');
 initialForward=await mappings('forward');initialReverse=await mappings('reverse');
 original=await identity(ORIGINAL);run.originalApp=original;save();
 assert((await collectors.app({...ctx,options:{serial,package:ORIGINAL}})).foregroundMatches,'original-app-must-be-foreground');
 const existing=(await shell('pm','list','packages','-u',PKG)).split('\n').some(v=>v==='package:'+PKG);
 assert(!existing,'validation-package-already-exists');
 const first=await checkedBuild(v1Arg,51201),second=await checkedBuild(v2Arg,51202);
 assert(first.probeSourceSha256===second.probeSourceSha256,'probe-source-mismatch');
 run.builds=[first,second].map(({apk,...metadata})=>metadata);save();
 assert(await shell('am','get-current-user')==='0'&&(await collectors.app({...ctx,options:{serial,package:ORIGINAL}})).foregroundMatches,'initial-foreground-changed');
 // Actions are dispatched once. Uncertain installation remains recorded, never retried.
 run.phases.push({name:'install-v1',status:'dispatched'});installAttempted=true;save();
 const install=(await ctx.adb.execute(['install','--user','0',first.apk],{timeout:120000})).toString();
 assert(/\bSuccess\b/.test(install),'initial-install-unconfirmed');
 const before=await identity(PKG);assert(before.versionCode===51201&&before.apkSha256===first.apkSha256,'installed-v1-mismatch');
 ownInstall=true;run.installOwnership='confirmed by this install success and actual APK SHA/version/UID';
 run.phases.at(-1).status='complete';run.phases.at(-1).identity=before;save();
 await require('../../scripts/lib/action.cjs').execute(ctx,{type:'wake'});
 await shell('am','start','--user','0','-n',COMPONENT,'-a','android.intent.action.MAIN');
 const snapshot=await ready(51201);run.beforeRecreate=snapshot;save();
 const filename='dol-dev-tools-native-'+run.incidentId+'.txt',content=run.incidentId,sentinelHash=sha(content);
 run.sentinel={filename,sha256:sentinelHash,status:'creation-dispatched'};save();
 await shell('run-as',PKG,'sh','-c',`'mkdir -p files && set -C && printf %s ${content} > files/${filename}'`);
 assert((await shell('run-as',PKG,'sha256sum','files/'+filename)).split(/\s+/)[0]===sentinelHash,'sentinel-creation-unconfirmed');
 run.sentinel.status='created';save();
 await foreground();assert((await readSnapshot(51201)).activityInstance===snapshot.activityInstance,'stale-native-instance');
 run.phases.push({name:'native-activity-recreate',status:'dispatched'});save();
 await shell('am','start','--user','0','-n',COMPONENT,'-a',PKG+'.RECREATE','--es','activityInstance',snapshot.activityInstance);
 client.close();client=null;
 const recreated=await ready(51201,snapshot);run.afterRecreate=recreated;save();
 assert(recreated.nativePid===snapshot.nativePid&&recreated.processSession===snapshot.processSession&&
  recreated.activityInstance!==snapshot.activityInstance&&recreated.activityIdentity!==snapshot.activityIdentity&&
  recreated.webViewInstance!==snapshot.webViewInstance&&recreated.webViewIdentity!==snapshot.webViewIdentity,'native-recreate-not-proven');
 run.phases.at(-1).status='complete';save();
 await releaseForward();
 const current=await identity(PKG);assert(JSON.stringify(current)===JSON.stringify(before),'update-precondition-changed');
 await foreground();
 run.phases.push({name:'apk-update-v2',status:'dispatched'});save();
 assert(sha(fs.readFileSync(second.apk))===second.apkSha256,'update-input-changed');
 const update=(await ctx.adb.execute(['install','-r','--user','0',second.apk],{timeout:120000})).toString();
 assert(/\bSuccess\b/.test(update),'update-unconfirmed');
 const after=await identity(PKG);assert(after.uid===before.uid&&after.versionCode===51202&&after.apkSha256===second.apkSha256,'updated-identity-mismatch');
 assert((await shell('run-as',PKG,'sha256sum','files/'+filename)).split(/\s+/)[0]===sentinelHash,'sentinel-retention-failed');
 run.sentinel.status='preserved-after-update';run.phases.at(-1).identity=after;save();
 await shell('am','start','--user','0','-n',COMPONENT,'-a','android.intent.action.MAIN');
 const updated=await ready(51202);run.afterUpdate=updated;
 assert(updated.processSession!==recreated.processSession,'update-running-generation-unproven');
 run.phases.at(-1).status='complete';run.status='verification-complete';save();
}
main().catch(error=>{
 if(run){run.status=run.phases.some(p=>p.status==='complete')?'partial':'failed';run.reason=/^[a-z0-9-]+$/.test(error.message)?error.message:'operation-failed; raw output omitted';save()}
 else console.error('Explicit test device, two builds, new output, local tools and authority required');process.exitCode=1;
}).finally(async()=>{
 if(!run)return;
 try{await releaseForward();run.cleanup.forward='removed'}catch{run.cleanup.forward='unknown'}
 try{assert(JSON.stringify(await mappings('forward'))===JSON.stringify(initialForward)&&JSON.stringify(await mappings('reverse'))===JSON.stringify(initialReverse),'existing-mappings-changed');run.cleanup.existingMappings='unchanged'}catch{run.cleanup.existingMappings='unknown'}
 try{assert(JSON.stringify(await identity(ORIGINAL))===JSON.stringify(original),'original-app-metadata-changed');run.cleanup.originalApp='installed APK SHA, version and UID unchanged'}catch{run.cleanup.originalApp='unknown'}
 // Restore foreground only if our own package still owns it; never override another task's focus.
 try{if(ownInstall){assert(await shell('am','get-current-user')==='0','cleanup-user-changed');const app=await collectors.app(ctx);if(app.foregroundMatches){await shell('am','force-stop','--user','0',PKG);await shell('am','start','--user','0','-n',ORIGINAL+'/com.vrelnir.dol.MainActivity','-a','android.intent.action.MAIN');
   const restored=await collectors.app({...ctx,options:{serial,package:ORIGINAL}});assert(restored.foregroundMatches,'original-foreground-unconfirmed');run.cleanup.foreground='original App foreground confirmed'}else run.cleanup.foreground='other foreground preserved'}}catch{run.cleanup.foreground='unknown'}
 run.cleanup.validationCopy=ownInstall?'retained; no uninstall or clear; owned sentinel retained':installAttempted?'installation attempted; ownership unconfirmed; left untouched':'not installed';
 if(run.status==='verification-complete'){
  run.status=run.cleanup.forward==='removed'&&run.cleanup.existingMappings==='unchanged'&&run.cleanup.originalApp!=='unknown'&&run.cleanup.foreground!=='unknown'?'complete':'partial';
  if(run.status!=='complete')process.exitCode=1;
 }
 run.captureEnd=new Date().toISOString();save();console.log('Native validation '+run.status+'; details in local native-workshop.json.');
});
