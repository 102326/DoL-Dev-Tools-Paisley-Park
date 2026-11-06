import type targetsType from './runtime-target.cjs';
declare namespace pcSession {
 interface OwnedRecord {format:'paisley-owned-chrome';version:1;profilePath:string;executable:string;resourceDigest:string;target:targetsType.Chrome&{document:targetsType.Document};[key:string]:unknown}
 interface Options {out?:string;file?:string;chrome?:string;mode?:string;port?:string;resources?:string;scope?:string;probe?:string;'host-file'?:string;'resume-from'?:string;'allow-resource-update'?:string;'test-environment'?:string;[key:string]:unknown}
 interface CaptureReport {schemaVersion:number;incidentId:string;capturedAt:string;status:'not-dispatched'|'dispatching-unknown'|'dispatch-acknowledged'|'observed'|'failed';identity:unknown;action:unknown;businessOutcome:'not-inferred';automaticReplay:false;remoteCancellationGuaranteed:false;probeSha256?:string;artifacts:{file:string;sha256:string}[];privacy:string;failure?:{code:string;cause:string}}
}
'use strict';
const fs:typeof import('node:fs')=require('node:fs'),path:typeof import('node:path')=require('node:path'),{createHash,randomUUID}:typeof import('node:crypto')=require('node:crypto');
const {ChromeHost}:typeof import('./chrome-host.cjs')=require('./chrome-host.cjs'),{target}:typeof import('./runtime-target.cjs')=require('./runtime-target.cjs');
const {targets}:typeof import('./cdp.cjs')=require('./cdp.cjs');
const invalid=()=>Object.assign(Error('Invalid owned PC input'),{code:'PC_INPUT_INVALID'});
function json(file:string|undefined,max=16384):unknown{try{if(!path.isAbsolute(file||'')||!fs.statSync(file!).isFile()||fs.statSync(file!).size>max)throw invalid();return JSON.parse(fs.readFileSync(file!,'utf8'))}catch{throw invalid()}}
function record(file:string|undefined):pcSession.OwnedRecord{
 const r=json(file) as Record<string,unknown>;
 if(!r||typeof r!=='object'||Array.isArray(r)||typeof r.profilePath!=='string'||typeof r.executable!=='string'||typeof r.resourceDigest!=='string'||r.format!=='paisley-owned-chrome'||r.version!==1||!path.isAbsolute((r.profilePath as string)||'')||!path.isAbsolute((r.executable as string)||'')||
    !/^[a-f0-9]{64}$/.test((r.resourceDigest as string)||'')||(r.target as {profilePath?:unknown}|null|undefined)?.profilePath!==fs.realpathSync(r.profilePath as string))throw invalid();
 const validated=target(r.target);r.target=validated;if(validated.host!=='chrome'||!validated.document)throw invalid();return r as unknown as pcSession.OwnedRecord;
}
function save(file:string,value:unknown){fs.writeFileSync(file,JSON.stringify(value,null,2),{flag:'wx',mode:0o600})}
function pcCleanup(errors:unknown[]){return Object.assign(new AggregateError(errors,'Owned PC cleanup unconfirmed',{cause:errors[0]}),{code:'PC_CLEANUP_UNCONFIRMED'})}
async function pages(file:string|undefined){
 const r=record(file),h=new ChromeHost(r.target);
 await h.verifyBrowser();
 return (await targets(r.target.endpoint) as Record<string,unknown>[]).filter(p=>p.type==='page').map(p=>({targetId:p.id,url:p.url,title:p.title,sameOrigin:(()=>{try{return new URL(p.url as string).origin===r.target.origin}catch{return false}})()}));
}
async function bind(file:string|undefined,targetId:string,url:string,out:string){
 const r=record(file),wanted=new URL(url);
 if(!targetId||typeof out!=='string'||!path.isAbsolute(out)||wanted.origin!==r.target.origin||wanted.username||wanted.password)throw invalid();
 const candidates=(await pages(file)).filter(p=>p.targetId===targetId&&p.url===wanted.href);
 if(candidates.length!==1)throw Object.assign(Error('Select an exact live target ID and URL from pc-pages'),{code:'PC_TARGET_UNAVAILABLE'});
 const fresh:targetsType.Chrome={...r.target,targetId};delete fresh.document;
 const h=await new ChromeHost(fresh).open();
 try{if(h.binding!.url!==wanted.href)throw invalid();const next={...r,target:{...fresh,document:h.binding!}};save(out,next);return next}finally{h.close()}
}
async function start(options:pcSession.Options){
 if(!options.out||!path.isAbsolute(options.file||'')||!path.isAbsolute(options.chrome||'')||!['headless','visible'].includes(options.mode as string)||!/^[0-9]{4,5}$/.test(options.port||'')||options['allow-resource-update']!==undefined&&(options['allow-resource-update']!=='yes'||!options['resume-from']))throw invalid();
 const bundle=(require('./pc-http.cjs') as typeof import('./pc-http.cjs')).load(options.file!,options.resources);
 const resume=options['resume-from']?record(options['resume-from']):undefined;
 if(resume&&(resume.resourceDigest!==bundle.digest&&options['allow-resource-update']!=='yes'||resume.target.origin!=='http://127.0.0.1:'+Number(options.port)))throw Object.assign(Error('Keep the original origin and review resource changes for a retained profile'),{code:'PC_RESUME_IDENTITY_CHANGED'});
 const output=path.resolve(options.out);fs.mkdirSync(output,{mode:0o700});
 save(path.join(output,'resources.json'),{schemaVersion:1,resourceDigest:bundle.digest,inventory:bundle.inventory});
 const server=await (require('./pc-http.cjs') as typeof import('./pc-http.cjs')).serve(bundle,Number(options.port));let browser;
 try{browser=await (require('./chrome-launch.cjs') as typeof import('./chrome-launch.cjs')).launch({out:path.join(output,'chrome'),executable:options.chrome!,url:server.url,mode:options.mode as 'headless'|'visible',resourceDigest:bundle.digest,resume,allowResourceUpdate:options['allow-resource-update']==='yes'});}
 catch(e){
  // Best-effort evidence must neither expose raw errors nor replace the launch
  // failure. Exclusive creation preserves peer files; HTTP cleanup still runs.
  try{save(path.join(output,'startup-failure.json'),{schemaVersion:1,phase:'launch-refused-before-http-shutdown',readyRecordReturned:false,
   diagnostic:(require('./diagnostics.cjs') as typeof import('./diagnostics.cjs')).describe(e)??{code:'PC_START_FAILED',stage:'pc.start'},
   http:server.startupProgress?.()??null,httpDoesNotProveDocumentCommit:true})}catch{/* Original failure and owned cleanup take precedence. */}
  try{await server.close()}catch(cleanup){throw pcCleanup([e,cleanup])}throw e;
 }
 return {...browser,url:server.url,async stop(){let failed=false,failure:unknown;try{await browser!.stop()}catch(e){failed=true;failure=e}
  try{await server.close()}catch(cleanup){throw pcCleanup([...(failed?[failure]:[]),cleanup])}if(failed)throw failure}};
}
async function capture(options:pcSession.Options,act=false){
 const r=record(options['host-file']);
 const scope=options.scope||'body';if(typeof scope!=='string'||!scope.trim()||scope.length>256||!options.out)throw invalid();
 let action:unknown,probe:string|undefined;
 if(act){if(options['test-environment']!=='yes')throw invalid();action=json(options.file,65536);(require('./action.cjs') as typeof import('./action.cjs')).validate(action);if(!(action as {type:string}).type.startsWith('web-'))throw invalid()}
 if(options.probe){if(!path.isAbsolute(options.probe)||fs.statSync(options.probe).size>32768)throw invalid();probe=fs.readFileSync(options.probe,'utf8');if(!probe.trim())throw invalid()}
 const output=path.resolve(options.out);fs.mkdirSync(output,{mode:0o700});
 const report:pcSession.CaptureReport={schemaVersion:1,incidentId:randomUUID(),capturedAt:new Date().toISOString(),status:'not-dispatched',
  identity:{profileId:r.target.profileId,browserId:r.target.browserId,targetId:r.target.targetId,document:r.target.document},
  action:act?(require('./action.cjs') as typeof import('./action.cjs')).summary(action):undefined,businessOutcome:'not-inferred',automaticReplay:false,remoteCancellationGuaranteed:false,
  probeSha256:probe?createHash('sha256').update(probe).digest('hex'):undefined,artifacts:[],privacy:'Local; review screenshots, probe results and document URLs before sharing'};
 const checkpoint=()=>{save(path.join(output,'manifest.pending'),report);fs.renameSync(path.join(output,'manifest.pending'),path.join(output,'manifest.json'))};
 const artifact=(name:string,value:unknown,binary=false)=>{const bytes=binary?value as Buffer:Buffer.from(JSON.stringify(value,null,2));fs.writeFileSync(path.join(output,name),bytes,{flag:'wx',mode:0o600});report.artifacts.push({file:name,sha256:createHash('sha256').update(bytes).digest('hex')})};
 checkpoint();let host:InstanceType<typeof ChromeHost>|undefined;
 try{
  host=await new ChromeHost(r.target).open();
  if(probe)artifact('state-before.json',await host.evaluate(probe));
  if(act){
   // Durable intent precedes dispatch. Process death here keeps uncertainty, never an instruction to retry.
   report.status='dispatching-unknown';checkpoint();
   await (require('./action.cjs') as typeof import('./action.cjs')).executeWeb({assertForeground:()=>host!.assertBound(),ensureWebview:async()=>host,client:host},action);
   report.status='dispatch-acknowledged';checkpoint();
  }
  artifact('dom.json',await host.evaluate((require('./dom.cjs') as typeof import('./dom.cjs')).expression(scope)));
  artifact('css.json',await host.evaluate((require('./css.cjs') as typeof import('./css.cjs')).expression(scope)));
  if(probe)artifact('state-after.json',await host.evaluate(probe));
  const shot=await host.send('Page.captureScreenshot',{format:'png'}) as {data:string};artifact('screenshot.png',Buffer.from(shot.data,'base64'),true);
  artifact('events.json',host.capture.snapshot());
  report.status=act?'dispatch-acknowledged':'observed';checkpoint();return report;
 }catch(e){
  report.failure={code:['PC_DOCUMENT_CHANGED','WEB_ACTION_REJECTED','ETIMEDOUT','CDP_CONNECTION_CLOSED'].includes((e as {code?:unknown}|null|undefined)?.code as string)?(e as {code:string}).code:'PC_CAPTURE_FAILED',cause:'See current target and original action evidence; no automatic retry'};
  if(!act)report.status='failed';checkpoint();throw e;
 }finally{host?.close()}
}
const pcSession={record,pages,bind,start,capture};
export = pcSession;
