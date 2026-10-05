// Target-owned one-shot WebView-only reconstruction. Never dispatches into another App.
const fs=require('node:fs'),path=require('node:path'),{promisify}=require('node:util'),{execFile}=require('node:child_process');
const {createHash,randomUUID}=require('node:crypto'),collectors=require('../../scripts/lib/collectors.cjs');
const {targets,connect}=require('../../scripts/lib/cdp.cjs'),native=require('../../integrations/examples/native-lifecycle.cjs');
const css=require('../../scripts/lib/css.cjs'),{redact}=require('../../scripts/lib/privacy.cjs');
const execute=promisify(execFile),sha=v=>createHash('sha256').update(v).digest('hex'),pause=()=>new Promise(r=>setTimeout(r,500));
const PKG='org.doldevtools.validation.lyra051213',ORIGINAL='com.vrelnir.dol.lyra.uicompat051213',COMPONENT=PKG+'/org.doldevtools.validation.ProbeActivity';
const CERT='efdbb6da72670f631293b17d9b197b0db9aa1457e4c14d36c0d2ad3b07cbb02f';
const BASE='d546a14f609a6d3235464550b100be16e790ec5c892d119d29ede150f549e66e';
const SCRIPT='9a1543e0b0f564a66a452fb78378c8a1d4217d12193ad09b061919e7564aac7d',STYLE='19441abe5690e2e4253544d2091ca5415d6ce42b0f7934c51e17efa8325f83dd';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const assert=(ok,reason)=>{if(!ok)throw Error(reason)};
function readReceipt(file){const info=fs.statSync(file);assert(info.isFile()&&info.size<=1048576,'receipt-size-invalid');return JSON.parse(fs.readFileSync(file,'utf8'))}
function ownership(n,b){
 assert(typeof n?.incidentId==='string'&&UUID.test(n.incidentId)&&n.status==='complete'&&n.source==='Target-owned offline Lyra native validation copy'&&n.targetPackage===PKG,'native-ownership-invalid');
 const installed=Array.isArray(n.phases)&&n.phases.find(p=>p.name==='apk-update-v2'&&p.status==='complete')?.identity;
 assert(installed?.versionCode===51202&&installed.apkSha256===BASE&&typeof installed.uid==='string'&&/^\d{5,6}$/.test(installed.uid),'native-installation-invalid');
 assert(n.sentinel?.filename==='dol-dev-tools-native-'+n.incidentId+'.txt'&&typeof n.sentinel.sha256==='string'&&/^[0-9a-f]{64}$/.test(n.sentinel.sha256)&&n.sentinel.status==='preserved-after-update','native-sentinel-invalid');
 assert(b?.status==='complete'&&typeof b.incidentId==='string'&&UUID.test(b.incidentId)&&b.source==='Reviewed DoLGameUI releases in target-owned main game'&&b.nativeIncidentId===n.incidentId&&b.targetPackage===PKG,'business-ownership-invalid');
 const updated=Array.isArray(b.phases)&&b.phases.find(p=>p.name==='update-business-mod'&&p.status==='complete')?.observed;
 assert(updated?.from==='IndexDB'&&updated.runtimeVersion==='2.1.0'&&updated.scriptSha256===SCRIPT&&updated.styleSha256===STYLE,'business-release-invalid');
 return {uid:installed.uid,apkSha256:installed.apkSha256,sentinel:n.sentinel,nativeIncidentId:n.incidentId,businessIncidentId:b.incidentId};
}
function resumeOwnership(owned,previous){
 assert(previous?.status==='partial'&&typeof previous.incidentId==='string'&&UUID.test(previous.incidentId)&&previous.source==='Target-owned offline Lyra WebView-only recipe'&&previous.targetPackage===PKG&&previous.nativeIncidentId===owned.nativeIncidentId&&previous.businessIncidentId===owned.businessIncidentId,'resume-ownership-invalid');
 assert(previous.build?.apkSha256==='78e14d8d4f78464a6525108b74f0ae5308d7b382226aecf4205c2bb8e77be5fe'&&previous.build.probeSourceSha256==='4fa06e60c6923a17d40d12d21a3b66f8aa6bab137bd9a51b533ad41d36cd0990'&&previous.build.certificateSha256===CERT&&previous.before?.versionCode===51203&&Array.isArray(previous.phases)&&previous.phases.some(p=>p.name==='update-owned-probe-v3'&&p.status==='complete'),'resume-installation-invalid');
 return previous.build.apkSha256;
}
async function run(args){
 const [serial,nativeArg,businessArg,buildArg,outArg,jdkArg,toolsArg,authority,resumeFlag,resumeArg]=args;
 assert(/^[\w.:-]{1,128}$/.test(serial||'')&&nativeArg&&businessArg&&buildArg&&outArg&&jdkArg&&toolsArg&&authority==='--test-environment=yes','explicit-test-environment-required');
 assert(args.length===8||args.length===10&&resumeFlag==='--resume-from'&&resumeArg,'explicit-resume-receipt-required');
 const owned=ownership(readReceipt(nativeArg),readReceipt(businessArg)),previous=resumeArg?readReceipt(resumeArg):null,baselineAPK=resumeArg?resumeOwnership(owned,previous):BASE,baseVersion=resumeArg?51203:51202,version=51204,out=path.resolve(outArg);fs.mkdirSync(out);
 const report={schemaVersion:1,incidentId:randomUUID(),source:'Target-owned offline Lyra WebView-only recipe',captureStart:new Date().toISOString(),status:'running',nativeIncidentId:owned.nativeIncidentId,businessIncidentId:owned.businessIncidentId,targetPackage:PKG,phases:[],cleanup:{},scope:'same-Activity actual WebView replacement; fixed DoLGameUI settings/persistence; no full save or game regression',privacy:'no screenshot, Console, game text, saves or raw protocol bodies'};
 if(previous)report.resumeFromIncidentId=previous.incidentId;
 report.baselineInstallation={apkSha256:baselineAPK,versionCode:baseVersion};
 const save=()=>fs.writeFileSync(path.join(out,'webview-workshop.json'),JSON.stringify(report,null,2));save();
 const ctx={options:{serial,package:PKG},adb:collectors.android({serial}),cleanup:[]};let client,mapsBefore,reverseBefore,original,verifiedOwnership=false;
 const shell=async(...a)=>(await ctx.adb('shell',...a)).toString().trim();
 const maps=async(type)=>(await ctx.adb(type,'--list')).toString().split('\n').map(s=>s.trim()).filter(Boolean).sort();
 async function installed(pkg){const p=(await shell('pm','path','--user','0',pkg)).match(/^package:(\/data\/app\/[^\r\n]+\/base\.apk)$/)?.[1];assert(p,'installed-apk-unavailable');return(await shell('sha256sum',p)).split(/\s+/)[0]}
 async function foreground(){assert(await shell('am','get-current-user')==='0','selected-user-changed');assert((await collectors.app(ctx)).foregroundMatches&&ctx.appPid,'selected-foreground-unavailable')}
 async function identity(version){const n=native.redact({status:'available',data:JSON.parse(await client.evaluate('DoLNativeLifecycle.snapshot()'))}).data;assert(n.packageName===PKG&&n.versionCode===version&&String(n.nativePid)===ctx.appPid,'native-identity-invalid');return n}
 async function release(){client?.close();client=null;if(ctx.forwardPort)await collectors.removeForward(ctx)}
 async function ready(version,old=null){const deadline=Date.now()+45000;while(Date.now()<deadline){try{
  await foreground();if(!ctx.forwardPort)await collectors.forward(ctx);
  if(!client?.isOpen()){const pages=(await targets(ctx.endpoint,1500)).filter(p=>p.type==='page'&&p.url==='https://localhost/index.html');assert(pages.length===1,'unique-local-game-required');client=await connect(ctx.endpoint,2500,()=>{},pages[0].id)}
  const n=await identity(version),pageReady=await client.evaluate("document.readyState==='complete'&&!!SugarCube?.State&&document.querySelectorAll('#passages').length===1&&DoLGameUI?.version==='2.1.0'");
  report.lastObservation={snapshot:n,pageReady:pageReady===true,capturedAt:new Date().toISOString()};save();if((!old||n.webViewInstance!==old.webViewInstance)&&pageReady)return n;
 }catch{client?.close();client=null}await pause()}throw Error('webview-readiness-timeout')}
 async function sentinel(){assert((await shell('run-as',PKG,'sha256sum','files/'+owned.sentinel.filename)).split(/\s+/)[0]===owned.sentinel.sha256,'owned-sentinel-changed')}
 async function checkOwnership(allowed){
  assert(await shell('am','get-current-user')==='0'&&allowed.includes(await installed(PKG)),'owned-copy-changed');
  assert((await shell('pm','list','packages','--user','0','-U',PKG)).split('\n').includes(`package:${PKG} uid:${owned.uid}`),'owned-uid-changed');
  await sentinel();
 }
 async function settings(version,label){
  await foreground();const n=await identity(version);
  const loaded=await client.evaluate(`(async()=>{const m=modUtils.getModAndFromInfo('DoLGameUI'),d=m?.mod;
   const hash=async(list,name)=>{const files=Array.isArray(list)?list.filter(f=>f?.name===name):[];if(files.length!==1||typeof files[0].content!=='string'||files[0].content.length>1048576)return null;return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(files[0].content))),v=>v.toString(16).padStart(2,'0')).join('')};
   return {from:m?.from,version:d?.version,runtimeVersion:DoLGameUI?.version,scriptSha256:await hash(d?.cache?.scriptFileItems?.items,'game-ui.js'),styleSha256:await hash(d?.cache?.styleFileItems?.items,'game-ui.css'),settingsClosed:!document.getElementById('dol-midnight-controls')?.open}})()`);
  assert(loaded.from==='IndexDB'&&loaded.version==='2.1.0'&&loaded.runtimeVersion==='2.1.0'&&loaded.scriptSha256===SCRIPT&&loaded.styleSha256===STYLE&&loaded.settingsClosed,'business-source-or-scene-changed');
  await client.evaluate('DoLGameUI.openSettings(); true');const deadline=Date.now()+5000;let visible=false;
  while(Date.now()<deadline){visible=await client.evaluate("(()=>{const n=document.getElementById('dol-midnight-controls');return !!n?.open&&n.getBoundingClientRect().width>0&&n.querySelectorAll('.dmt-close').length===1})()");if(visible)break;await pause()}assert(visible,'settings-open-unconfirmed');
  const data=redact({...css.contract(await client.evaluate(css.expression('#dol-midnight-controls'))),scopeHash:sha('#dol-midnight-controls')});
  const dir=path.join(out,label);fs.mkdirSync(dir);const incidentId=randomUUID(),time=new Date().toISOString(),body=JSON.stringify({schemaVersion:1,incidentId,source:'WebView-only settings CSS',capturedAt:time,data},null,2);
  fs.writeFileSync(path.join(dir,'css-contract.json'),body,{flag:'wx'});fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({schemaVersion:1,incidentId,toolVersion:require('../../package.json').version,profile:'evidence',status:data.truncated?'partial':'complete',captureStart:time,captureEnd:new Date().toISOString(),integrations:[],privacy:{content:'scoped settings CSS; no text or input values',requiresManualReview:true},steps:[{name:'css-contract',source:'WebView-only settings CSS',required:true,status:'completed',captureStart:time,captureEnd:time,artifact:{filename:'css-contract.json',sha256:sha(body)}}]},null,2),{flag:'wx'});
  await require('../../scripts/lib/action.cjs').execute({...ctx,ensureWebview:async()=>{await foreground();assert((await identity(version)).webViewInstance===n.webViewInstance,'settings-instance-changed');return client}},{type:'web-click',selector:'#dol-midnight-controls .dmt-close'});
  assert(await client.evaluate("!document.getElementById('dol-midnight-controls')?.open"),'settings-close-unconfirmed');assert(!data.truncated,'settings-css-incomplete');
  return {...loaded,settingsOpenedAndClosed:true,cssIncidentId:incidentId,cssNodeCount:data.nodes.length};
 }
 try {
  assert(await shell('am','get-current-user')==='0'&&await installed(PKG)===baselineAPK,'owned-copy-changed');
  assert((await shell('pm','list','packages','--user','0','-U',PKG)).split('\n').includes(`package:${PKG} uid:${owned.uid}`),'owned-uid-changed');verifiedOwnership=true;
  mapsBefore=await maps('forward');reverseBefore=await maps('reverse');original=await installed(ORIGINAL);
  assert((await collectors.app({...ctx,options:{serial,package:ORIGINAL}})).foregroundMatches,'original-foreground-required');await sentinel();
  const build=readReceipt(path.join(buildArg,'build-report.json'));
  assert(build.applicationId===PKG&&build.versionCode===version&&build.certificateSha256===CERT&&build.signatureVerified===true&&build.zipAlignmentVerified===true&&build.networkPermission===false&&build.cloudBackupAllowed===false&&build.probeSourceSha256===sha(fs.readFileSync(path.join(__dirname,'ProbeActivity.java'))),'build-invalid');
  const apk=path.join(out,'validation-update.apk');fs.copyFileSync(path.join(buildArg,'validation.apk'),apk,fs.constants.COPYFILE_EXCL);assert(sha(fs.readFileSync(apk))===build.apkSha256,'artifact-changed');
  const tool=path.resolve(toolsArg),java=path.join(jdkArg,'bin/java.exe');
  const cert=(await execute(java,['-cp',path.join(tool,'uber-apk-signer-1.3.0.jar'),'com.android.apksigner.ApkSignerTool','verify','--print-certs',apk],{timeout:15000,windowsHide:true})).stdout;
  assert(cert.includes('certificate SHA-256 digest: '+CERT),'v3-certificate-invalid');
  const badge=(await execute(path.join(tool,'sdk/android-15/aapt.exe'),['dump','badging',apk],{timeout:10000,windowsHide:true})).stdout;
  const xml=(await execute(path.join(tool,'sdk/android-15/aapt.exe'),['dump','xmltree',apk,'AndroidManifest.xml'],{timeout:10000,windowsHide:true})).stdout;
  assert(badge.includes(`package: name='${PKG}' versionCode='${version}'`)&&badge.includes("launchable-activity: name='org.doldevtools.validation.ProbeActivity'")&&!xml.includes('E: uses-permission')&&!xml.includes('android:sharedUserId')&&!xml.includes(ORIGINAL)&&/android:allowBackup[^\n]*=\(type 0x12\)0x0\s/.test(xml)&&/android:debuggable[^\n]*=\(type 0x12\)0xffffffff\s/.test(xml),'isolation-invalid');
  report.build={apkSha256:build.apkSha256,probeSourceSha256:build.probeSourceSha256,certificateSha256:CERT};save();
  await require('../../scripts/lib/action.cjs').execute(ctx,{type:'wake'});await shell('am','start','--user','0','-n',COMPONENT,'-a','android.intent.action.MAIN');await ready(baseVersion);
  report.baseline=await settings(baseVersion,'baseline');await release();await foreground();
  await checkOwnership([baselineAPK]);assert(sha(fs.readFileSync(apk))===build.apkSha256,'update-precondition-changed');
  report.phases.push({name:'update-owned-probe',versionCode:version,status:'dispatched'});save();
  const installedResult=(await ctx.adb.execute(['install','-r','--user','0',apk],{timeout:120000})).toString();assert(/\bSuccess\b/.test(installedResult),'v3-install-unconfirmed');
  assert(await installed(PKG)===build.apkSha256&&(await shell('pm','list','packages','--user','0','-U',PKG)).split('\n').includes(`package:${PKG} uid:${owned.uid}`),'v3-installed-identity-invalid');await sentinel();report.phases.at(-1).status='complete';save();
  await shell('am','start','--user','0','-n',COMPONENT,'-a','android.intent.action.MAIN');const before=await ready(version);report.before=before;report.beforeSettings=await settings(version,'before');save();
  await foreground();assert((await identity(version)).webViewInstance===before.webViewInstance,'stale-webview-precondition');
  report.phases.push({name:'native-webview-only-recreate',status:'dispatched'});save();
  await shell('am','start','--user','0','-n',COMPONENT,'-a',PKG+'.WEBVIEW_RECREATE','--es','activityInstance',before.activityInstance,'--es','webViewInstance',before.webViewInstance);
  client.close();client=null;const after=await ready(version,before);report.after=after;save();
  assert(after.nativePid===before.nativePid&&after.processSession===before.processSession&&after.activityInstance===before.activityInstance&&after.activityIdentity===before.activityIdentity&&after.webViewInstance!==before.webViewInstance&&after.webViewIdentity!==before.webViewIdentity,'webview-only-object-proof-failed');
  report.afterSettings=await settings(version,'after');await sentinel();report.phases.at(-1).status='complete';save();
  // Deliberately stale-token negative test, not a retry of the successful operation.
  await foreground();report.phases.push({name:'stale-webview-token-rejected',status:'dispatched'});save();
  await shell('am','start','--user','0','-n',COMPONENT,'-a',PKG+'.WEBVIEW_RECREATE','--es','activityInstance',before.activityInstance,'--es','webViewInstance',before.webViewInstance);
  await pause();assert((await identity(version)).webViewInstance===after.webViewInstance,'stale-token-mutated-view');report.phases.at(-1).status='complete';save();
  await release();await checkOwnership([build.apkSha256]);await foreground();report.phases.push({name:'app-restart-retention',status:'dispatched'});save();await require('../../scripts/lib/action.cjs').execute(ctx,{type:'restart'});
  const restarted=await ready(version);assert(restarted.processSession!==after.processSession,'restart-generation-unconfirmed');report.afterRestart=restarted;report.afterRestartSettings=await settings(version,'after-restart');await sentinel();report.phases.at(-1).status='complete';report.status='verification-complete';save();
 } catch(error) {report.status='partial';report.reason=/^[a-z0-9-]+$/.test(error.message)?error.message:'operation-failed-raw-output-omitted';save();process.exitCode=1}
 finally {
  try{await release();report.cleanup.forward='removed'}catch{report.cleanup.forward='unknown'}
  try{assert(JSON.stringify(await maps('forward'))===JSON.stringify(mapsBefore)&&JSON.stringify(await maps('reverse'))===JSON.stringify(reverseBefore),'mappings-changed');report.cleanup.existingMappings='unchanged'}catch{report.cleanup.existingMappings='unknown'}
  try{assert(await installed(ORIGINAL)===original,'original-apk-changed');report.cleanup.originalApk='unchanged'}catch{report.cleanup.originalApk='unknown'}
  try{if(verifiedOwnership&&(await collectors.app(ctx)).foregroundMatches){await checkOwnership([baselineAPK,...(report.build?.apkSha256?[report.build.apkSha256]:[])]);await shell('am','force-stop','--user','0',PKG);await shell('am','start','--user','0','-n',ORIGINAL+'/com.vrelnir.dol.MainActivity','-a','android.intent.action.MAIN');assert((await collectors.app({...ctx,options:{serial,package:ORIGINAL}})).foregroundMatches,'original-foreground-unconfirmed');report.cleanup.foreground='original restored'}else report.cleanup.foreground='other foreground preserved'}catch{report.cleanup.foreground='unknown'}
  report.cleanup.validationCopy='retained; no clear, uninstall, save or Mod deletion';if(report.status==='verification-complete')report.status=Object.values(report.cleanup).includes('unknown')?'partial':'complete';report.captureEnd=new Date().toISOString();save();if(report.status!=='complete')process.exitCode=1;
  console.log('WebView-only '+report.status+'; local webview-workshop.json retains phase and cleanup proof.');
 }
 return report;
}
module.exports={ownership,resumeOwnership,run};
if(require.main===module)run(process.argv.slice(2)).catch(()=>{console.error('Valid owned receipts, reviewed build, new output and test authority required; no raw input emitted.');process.exitCode=1});
