import type semanticTypes from './game-semantic.cjs';
import type execution from './execution-context.cjs';
import type runtime from './game-runtime.cjs';
import type targetAPI from './runtime-target.cjs';
type Runtime=InstanceType<typeof runtime.Runtime>;
type Options=execution.Options & {out?:string;testEnvironment?:boolean;store?:string;timeoutMs?:number;authorization?:unknown;projectIntent?:string;projectGoal?:{scope?:unknown}};
interface Settings {testEnvironment?:boolean;resume?:boolean;reconcile?:unknown;evidence?:unknown;file?:string;intent?:unknown}
interface Overrides extends execution.Overrides {runtime?:NonNullable<ConstructorParameters<typeof runtime.Runtime>[1]>;readOutcome?:(effects:unknown,report:unknown,session:unknown)=>Promise<unknown[]>;reconcileOutcome?:(client:execution.BoundClient,effects:unknown,session:unknown)=>Promise<unknown[]>}
interface ErrorView {code?:unknown}
// These are property access views over local/SQLite records, not schema validation.
interface RequestView {mode:unknown;scope?:unknown;goal:{kind:unknown;scope?:unknown;maxSpend?:unknown;[key:string]:unknown};budget:{timeoutMs:number;maxActions:number;maxObservations:number;maxReplans?:number;maxSpend?:unknown};description?:unknown;name?:unknown;requiredCheckpoints?:unknown}
interface LegacyView {request:RequestView;experimental?:unknown;id:string;deadline:number;actions:number;observations:number;events?:unknown;target:{serial:string;package:string;userId:string;[key:string]:unknown};status:string;startedAt:string;proof?:unknown;pending?:unknown;readOnly?:boolean}
interface LinkView {format?:unknown;version?:unknown;store:string;sessionId:string}
interface DecisionView {scene:{choices:unknown[];facts:{choices:Record<string,unknown>[];[key:string]:unknown};[key:string]:unknown};outcomes?:{descriptor?:unknown;[key:string]:unknown}[];[key:string]:unknown}
interface EffectView {id:string;sessionId:string;status:string;action:{kind:semanticTypes.Intent;selected:unknown;capability?:{provider?:unknown};[key:string]:unknown};ack?:{dispatch?:unknown};executionBinding?:unknown;sceneRevision?:unknown;resourceGeneration?:unknown}
interface SceneFacts {domAgrees?:unknown;location?:unknown;passage?:unknown}
interface ProofView {status?:unknown;satisfied?:unknown;[key:string]:unknown}
interface ProviderReport {status:string;dispatch?:unknown;reason?:unknown;after?:SceneFacts|null;gameplay?:SceneFacts|null;goalProof?:ProofView|null;capabilities?:unknown;effectReceipts?:unknown[]}
interface CheckpointView {name?:unknown;predicate?:unknown;passage?:unknown}
interface SessionView {id:string;targetKey:string;target:targetAPI.Value;config:{mode:string;scope?:unknown;goal:RequestView['goal'];budget:RequestView['budget'];requiredCheckpoints?:string[]};machine:{value:string};proposal?:{action:EffectView['action']};scene:{revision:unknown;facts:unknown;[key:string]:unknown};decision:DecisionView;openEffects:EffectView[];historicalOpenEffects?:EffectView[];epoch:number;revision:number;deadline:number;actions:number;observations:number;spent:number;reserved:number;readOnly?:boolean;proof?:unknown;pending?:unknown;pauseReason?:unknown;stopReason?:unknown;resourceGeneration?:unknown;nativeIdentity?:unknown;resource?:{status?:unknown};reconciliationReads?:unknown;reconciliationError?:unknown;checkpoints?:unknown;routes?:unknown}
const fs:typeof import('node:fs')=require('node:fs'),path:typeof import('node:path')=require('node:path'),os:typeof import('node:os')=require('node:os');
const {randomUUID,createHash}:typeof import('node:crypto')=require('node:crypto');
const semantic=(require('./game-semantic.cjs') as typeof import('./game-semantic.cjs')),site=(require('./game-dol-provider.cjs') as typeof import('./game-dol-provider.cjs')),collectors=(require('./collectors.cjs') as typeof import('./collectors.cjs'));
const receipts=(require('./game-receipts.cjs') as typeof import('./game-receipts.cjs'));
const capabilities=require('./game-capabilities.cjs') as typeof import('./game-capabilities.cjs');
const {withinSpend,combinedLimit}=(require('./game-spend.cjs') as typeof import('./game-spend.cjs'));
const {validate,provider,probe,candidates}=capabilities;
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const keys=(v:unknown,allowed:string[])=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
function readJson(file:string,max=65536):unknown{if(!fs.statSync(file).isFile()||fs.statSync(file).size>max)throw Error('Invalid or oversized local record');return JSON.parse(fs.readFileSync(file,'utf8')) as unknown}
function loadLegacy(dir:string) {
  const state = readJson(path.join(dir, 'goal.json'), 262144) as LegacyView;
  validate(state.request);
  if (state.experimental !== true || !/^[a-f0-9-]{36}$/.test(state.id || '') || !Number.isFinite(state.deadline) || !Number.isSafeInteger(state.actions) ||
    !Number.isSafeInteger(state.observations) || state.actions < 0 || state.observations < 0 || state.actions > state.request.budget.maxActions || state.observations > state.request.budget.maxObservations ||
    !Array.isArray(state.events) || state.events.length > 256 || !keys(state.target, ['serial', 'package', 'userId', 'targetId', 'webviewSocket']) ||
    typeof state.target.serial !== 'string' || !/^[\w.:-]{1,128}$/.test(state.target.serial) || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(state.target.package || '') ||
    !/^\d+$/.test(state.target.userId || '') || !['active','paused','completed','exhausted','needs-result-interpretation'].includes(state.status) ||
    !Number.isFinite(Date.parse(state.startedAt)) || state.deadline !== Date.parse(state.startedAt) + state.request.budget.timeoutMs) throw Error('Invalid Goal journal');
  return state;
}

function validateSelection(selected:unknown,intent:unknown,g:unknown){
  if(!semantic.intents.includes(intent as semanticTypes.Intent))throw Error('Unreviewed Gameplay intent');
  const owner=capabilities.capability({selected});owner.validateAction(selected,intent,g);return owner;
}
function loadRuntime(){
  try{return (require('./game-runtime.cjs') as typeof import('./game-runtime.cjs')).Runtime}catch(e){if((e as ErrorView).code==='ERR_UNKNOWN_BUILTIN_MODULE'||(e as ErrorView).code==='MODULE_NOT_FOUND')throw Object.assign(Error('Gameplay Runtime requires XState and Node SQLite. Use Node.js 26+ and run npm ci --ignore-scripts --no-audit --no-fund in the Tools root. Generic diagnostics remain available.'),{code:'GAMEPLAY_RUNTIME_UNAVAILABLE'});throw e}
}
function open(store:string,overrides:Overrides={}){
  if(!path.isAbsolute(store))throw Error('Absolute shared Store required');
  const Runtime=loadRuntime();return new Runtime(store,{provider,leaseMs:120000,...overrides.runtime});
}
function link(dir:string){
  const l=readJson(path.join(path.resolve(dir),'goal.json'),262144) as LinkView;
  if(l.format!=='paisley-session-link')throw Error('Foundation history is read-only; start a new scoped Goal. No automatic migration or unknown-result dismissal.');
  if(l.version!==2||!path.isAbsolute(l.store)||!/^[-a-f0-9]{36}$/.test(l.sessionId))throw Error('Invalid Session link');
  // An existing Goal must not let Runtime initialization replace a missing ledger.
  try{const stat=fs.statSync(l.store);if(!stat.isFile()||stat.size===0)throw Error('Unavailable Store')}
  catch{throw Object.assign(Error('Original Session Store unavailable'),{code:'SESSION_STORE_UNAVAILABLE'})}
  return l;
}
function status(dir:string){const raw=readJson(path.join(path.resolve(dir),'goal.json'),262144) as LinkView;if(raw.format!=='paisley-session-link')return {...loadLegacy(path.resolve(dir)),readOnly:true};const l=link(dir),r=open(l.store);try{return r.status(l.sessionId)}finally{r.close()}}
function decisionView(raw:unknown)
{const decision=raw as DecisionView|null|undefined;
  if(!decision)return null;
  return {...decision,scene:{...decision.scene,choices:decision.scene.choices.map(capabilities.publicDescriptor),facts:{...decision.scene.facts,choices:decision.scene.facts.choices.map(({selector,...choice})=>choice)}},
    // A stored old request may lack the new envelope. Preserve its historical
    // fields; freshly observed decisions always have a persisted descriptor.
    outcomes:(decision.outcomes??[]).map(outcome=>outcome.descriptor?capabilities.publicOutcome(outcome):outcome)};
}
function view(raw:unknown){
  const s=raw as SessionView;
  if(s.readOnly)return{experimental:true,goalId:s.id,status:'foundation-history',readOnly:true,proof:s.proof||null,pending:!!s.pending,next:'start-a-new-scoped-goal'};
  const memory=(require('./game-runtime.cjs') as typeof import('./game-runtime.cjs')).memoryView(s);
  const combinedProof=capabilities.publicProof(s);
  const effects=s.openEffects??[],uuid=(value:unknown)=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value)?value:null;
  const pendingEffects={scope:'target',count:effects.length,truncated:effects.length>32,items:effects.slice(0,32).map(e=>({
    effectId:uuid(e?.id),sessionId:uuid(e?.sessionId),owner:uuid(e?.sessionId)?e.sessionId===s.id?'current-session':'other-session':'unknown',
    status:['prepared','dispatching','acknowledged'].includes(e?.status)?e.status:'unknown',
    actionKind:semantic.intents.includes(e?.action?.kind)?e.action.kind:'unknown',
    provider:['native-dol','clothing','project-experiment'].includes(e?.action?.capability?.provider as string)?e.action.capability!.provider:'unknown',
  }))};
  const state=s.machine.value;return{experimental:true,runtimeVersion:2,goalId:s.id,epoch:s.epoch,revision:s.revision,status:state==='completed'?'completed':s.stopReason==='checkpoint-failed'?'failed':s.stopReason==='cancelled'?'cancelled':s.stopReason?'exhausted':state==='paused'?'paused':state==='reconciling'?'needs-result-interpretation':'active',phase:state,actions:s.actions,observations:s.observations,pending:!!effects.length,pendingEffects,resourceGeneration:s.resourceGeneration??null,resourceStatus:s.resource?.status??null,historicalPendingEffects:(s.historicalOpenEffects??[]).map(e=>({effectId:uuid(e.id),sessionId:uuid(e.sessionId),status:e.status,resourceGeneration:e.resourceGeneration??null})),proof:combinedProof,reason:s.pauseReason||s.stopReason||null,decision:decisionView(s.decision),budget:{deadline:s.deadline,maxSpend:s.config.budget.maxSpend,spent:s.spent,reserved:s.reserved,actualSpendExceeded:!withinSpend(s.spent,s.config.budget.maxSpend)},reconciliation:{reads:s.reconciliationReads??0,maxReads:8,error:s.reconciliationError??null},checkpoints:s.checkpoints,requiredCheckpoints:s.config.requiredCheckpoints||[],routes:s.routes||[],...memory};
}
async function start(options:Options,rawRequest:unknown,overrides:Overrides={}){
  const request=validate(rawRequest) as RequestView;
  if(options.testEnvironment!==true||!options.out)throw Error('Explicit tested Goal target required');
  loadRuntime(); // Fail before ADB, output creation or a Session when Gameplay prerequisites are missing.
  const chrome=options.host==='chrome',chromeRecord=chrome?(require('./host-options.cjs') as typeof import('./host-options.cjs')).chrome(options,{gameplay:true}):null;
  const userId=chrome?null:(await(overrides.adb||collectors.android(options))('shell','am','get-current-user')).toString().trim();
  const authorization=request.scope??request.goal.scope;
  if(chrome){if(authorization)(require('./game-scope.cjs') as typeof import('./game-scope.cjs')).assertSessionTarget(authorization,chromeRecord!.target);await verifyChrome(chromeRecord!.target)}
  else if(authorization)(require('./game-scope.cjs') as typeof import('./game-scope.cjs')).assertTarget(options,{scope:authorization},userId,(await(overrides.adb||collectors.android(options))('shell','dumpsys','package',options.package!)).toString());
  const store=options.store||process.env.PAISLEY_PARK_STORE||path.join(process.env.LOCALAPPDATA||os.homedir(),'PaisleyPark','sessions-v2.sqlite');
  const r=open(store,overrides);let s:SessionView;
  try{
    const t=chrome?chromeRecord!.target:{serial:options.serial,package:options.package,userId};const resource=chrome?null:r.resource(hash([(t as targetAPI.Android).serial,(t as targetAPI.Android).package,(t as targetAPI.Android).userId]));
    const resourceProof=resource?await (require('./game-resource.cjs') as typeof import('./game-resource.cjs')).snapshot(overrides.adb||collectors.android(options),t as targetAPI.Android,authorization,resource as {id:string}):undefined;
    const nativeIdentityProof=chrome||resource?undefined:await (require('./game-resource.cjs') as typeof import('./game-resource.cjs')).identity(overrides.adb||collectors.android(options),t as targetAPI.Android,authorization);
    fs.mkdirSync(path.resolve(options.out));
    s=r.start(chrome?chromeRecord!.target:{serial:options.serial,package:options.package,userId,...(options.targetId?{targetId:options.targetId}:{}),...(options.webviewSocket?{webviewSocket:options.webviewSocket}:{})},{mode:request.mode,...(authorization?{scope:authorization}:{}),goal:{description:request.description??request.name,...request.goal,...(request.goal.kind==='purchase-one'?{maxSpend:request.goal.maxSpend===undefined?null:request.goal.maxSpend}:{})},...(request.requiredCheckpoints===undefined?{}:{requiredCheckpoints:request.requiredCheckpoints}),budget:{...request.budget,maxReplans:request.budget.maxReplans??192,maxSpend:combinedLimit(request.budget.maxSpend,request.goal.maxSpend)}},{resourceProof,nativeIdentityProof}) as SessionView;
    try{fs.writeFileSync(path.join(options.out,'goal.json'),JSON.stringify({format:'paisley-session-link',version:2,sessionId:s.id,store:path.resolve(store)},null,2),{flag:'wx'})}catch(e){r.stop(s.id,'session-link-write-failed');throw e}
  }finally{r.close()}
  return advance(options.out,{testEnvironment:true},overrides);
}
function rejectionReceipts(raw:unknown){const effects=raw as EffectView[];return effects.filter(e=>e.status==='dispatching'&&e.ack?.dispatch==='not-dispatched').map(e=>({attemptId:e.id,outcome:'not-occurred',remoteClosed:true,spent:0,source:'reviewed claimed synchronous guard rejection'}))}
async function verifyChrome(target:unknown){
  const host=new ((require('./chrome-host.cjs') as typeof import('./chrome-host.cjs')).ChromeHost)(target as targetAPI.Chrome);try{await host.open();await host.assertBound()}finally{host.close()}
}
async function verifyResource(r:Runtime,s:SessionView,options:Options,overrides:Overrides){
  r.assertResource(s as unknown as Parameters<Runtime['assertResource']>[0]);
  if(s.target.host==='chrome'){if(s.nativeIdentity||s.resourceGeneration)throw Error('Chrome Session has Android resource identity');if(options.authorization)(require('./game-scope.cjs') as typeof import('./game-scope.cjs')).assertSessionTarget(options.authorization,s.target);await verifyChrome(s.target);return}
  if(!s.resourceGeneration){
    if(!s.nativeIdentity)throw Error('Original native resource identity unavailable for this historical Session');
    const proof=await (require('./game-resource.cjs') as typeof import('./game-resource.cjs')).identity(overrides.adb||collectors.android(options),s.target,options.authorization);
    if(proof.id!==s.nativeIdentity)throw Error('Native data generation changed');
    r.assertResource(s as unknown as Parameters<Runtime['assertResource']>[0]);return;
  }
  const proof=await (require('./game-resource.cjs') as typeof import('./game-resource.cjs')).snapshot(overrides.adb||collectors.android(options),s.target,options.authorization,r.resource(s.targetKey) as {id:string});
  if(proof.id!==s.resourceGeneration)throw Error('Session native data generation changed');
  r.assertResource(s as unknown as Parameters<Runtime['assertResource']>[0]);
}
async function recoverWithMaintenance(r:Runtime,s:SessionView,client:execution.BoundClient,dir:string,effects:unknown){
  const candidates=r.receiptRetirements(s.id) as unknown[];
  if(candidates.length){
    let summary;
    try{
      const result=await (require('./game-receipts.cjs') as typeof import('./game-receipts.cjs')).cleanup(client,candidates);
      r.confirmReceiptRetirements(s.id,result.retired);
      summary={status:result.available?'available':'unavailable',candidates:candidates.length,retired:result.retired.length,remaining:result.remaining,capacity:result.capacity};
    }catch{
      summary={status:'failed',candidates:candidates.length,retired:0,capacity:64};
    }
    // Maintenance is after durable settlement; failure neither settles nor replays.
    fs.writeFileSync(path.join(dir,'receipt-maintenance-'+randomUUID()+'.json'),JSON.stringify(summary,null,2),{flag:'wx'});
  }
  return receipts.recover(client,effects);
}
async function dispatchReady(r:Runtime,s:SessionView,dir:string,overrides:Overrides={}){
  if(s.machine.value!=='ready'||!s.proposal)throw Error('No current accepted Decision');
  const approvedOwner=capabilities.validateDescriptor(s.proposal.action,s.config.goal);
  approvedOwner.assertTerminalSupport?.(s.proposal.action.selected);
  // A visible control is not a declared Outcome producer. Do not create an
  // uncloseable effect merely because the raw Action runner can click it.
  if(!approvedOwner.prepare&&typeof overrides.readOutcome!=='function')return view(r.pause(s.id,'reviewed-action-outcome-unavailable'));
  // Measured native shop attestation takes 84s; retain the existing bounded Journey window.
  const authorization=s.config.scope??s.config.goal.scope,executionWindow=(require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).authorized(authorization)?120000:30000;
  const options:Options={...(require('./host-options.cjs') as typeof import('./host-options.cjs')).fromTarget(s.target),testEnvironment:true,gameplay:true,authorization,...(s.config.goal.kind==='project-experiment'?{projectGoal:s.config.goal}:{}),timeoutMs:Math.max(1,Math.min(executionWindow,s.deadline-Date.now()))};
    await verifyResource(r,s,options,overrides);
    const e=r.prepare(s.id,{expected:s}) as EffectView|null;if(!e)return view(r.status(s.id));
    const descriptor=e.action,selected=descriptor.selected,intent=descriptor.kind,rawOwner=capabilities.validateDescriptor(descriptor,s.config.goal),scene=s.scene;
    type Owner=typeof rawOwner;const owner:Omit<Owner,'prepare'> & Partial<Pick<Owner,'prepare'>>=rawOwner;
    options.projectIntent=intent;
    if(e.sceneRevision!==scene.revision)throw Error('Reserved Scene mismatch');
    const postReservation=r.reserveObservation(s.id);if(!postReservation)return view(r.status(s.id));
    const out=path.join(dir,'action-'+e.id);let report:ProviderReport|undefined,binding:unknown;
    await r.dispatch(e.id,async(attempt,claim)=>{
      report=await site.act({...options,out},owner.prepare?null:selected,intent,{...overrides,
        bindExecution:value=>{binding=(r.bindExecution(e.id,value) as EffectView).executionBinding},
        reserve:()=>{const claimed=claim();if(binding&&JSON.stringify((claimed as EffectView).executionBinding)!==JSON.stringify(binding))throw Error('Claimed execution binding changed')},
        expectedScene:scene.facts,probeGoal:probe(s.config.goal),probeOutcome:client=>recoverWithMaintenance(r,s,client,dir,[r.effect(e.id)]),
        probeCapabilities:client=>capabilities.observe(client,s.config.goal),authorizeCostedControl:mapped=>capabilities.authorizeCostedControl(mapped,descriptor,s.config.goal),
        ...(owner.prepare?{prepareAction:client=>owner.prepare!(client,descriptor,s.config.goal,e.id,{scope:options.authorization})}:{})}) as unknown as ProviderReport;
      return{dispatch:report!.dispatch,record:'action-'+e.id+'/semantic.json',reason:report!.reason||report!.status};
    },{deferred:true});
    const actionReport=report as ProviderReport|undefined;
    // Not-dispatched is an authoritative preflight/guard rejection. Ack alone never closes a business effect.
    const effect=r.effect(e.id) as EffectView,closing=[...rejectionReceipts([effect]),...(actionReport?.effectReceipts||[])];
    let post:{gameplay:SceneFacts;goalProof:ProofView;capabilities?:unknown}|null=actionReport?.after?.domAgrees&&actionReport.goalProof?.status==='available'?{gameplay:actionReport.after,goalProof:actionReport.goalProof,capabilities:actionReport.capabilities}:null;
    if(!post){const reread=await site.observe({...options,out:path.join(dir,'observation-'+randomUUID())},{...overrides,probeGoal:probe(s.config.goal),probeOutcome:client=>recoverWithMaintenance(r,s,client,dir,[effect]),probeCapabilities:client=>capabilities.observe(client,s.config.goal)}) as unknown as ProviderReport;if(reread.status==='observed'&&reread.gameplay?.domAgrees&&reread.goalProof?.status==='available'){post=reread as ProviderReport & {gameplay:SceneFacts;goalProof:ProofView};closing.push(...(reread.effectReceipts||[]))}}
    if(!post)return view(r.failObservation(s.id,postReservation,'reliable-post-action-observation-unavailable'));
    const after={...scene,revision:s.epoch+1,choices:capabilities.choicesFrom(post,s.epoch+1,s.config.goal),facts:post.gameplay,location:post.gameplay!.location||'unknown',goalProof:post.goalProof};
    if(overrides.readOutcome)closing.push(...await overrides.readOutcome([effect],report,s));
    await verifyResource(r,s,options,overrides);
    s=r.observe(s.id,after,closing,{reservation:postReservation}) as SessionView;if(['blocked','paused'].includes(actionReport?.status as string)&&!s.stopReason&&s.machine.value!=='completed')s=r.pause(s.id,actionReport!.reason||'execution-interrupted') as SessionView;return view(s);
}
async function advance(directory:string,settings:Settings,overrides:Overrides={}){
  if(settings.testEnvironment!==true)throw Error('Goal execution requires explicit test environment');
  if(settings.reconcile!==undefined||settings.evidence!==undefined)throw Error('Model interpretation cannot settle shared effects; a reviewed terminal Outcome reader is required');
  const dir=path.resolve(directory),l=link(dir),r=open(l.store,overrides);
  try{
    let s=r.status(l.sessionId) as SessionView;if(s.machine.value==='completed')return view(s);
    if(settings.resume){r.resume(s.id);s=r.status(s.id) as SessionView}
    if(s.stopReason)return view(s);
    let selected;if(settings.file){selected=readJson(settings.file as string);validateSelection(selected,settings.intent,s.config.goal)}else if(settings.intent)throw Error('Intent requires an action');
    const options={...(require('./host-options.cjs') as typeof import('./host-options.cjs')).fromTarget(s.target),testEnvironment:true,gameplay:true,authorization:s.config.scope??s.config.goal.scope,timeoutMs:Math.max(1,Math.min(30000,s.deadline-Date.now()))};
    await verifyResource(r,s,options,overrides);
    const reservation=r.reserveObservation(s.id);if(!reservation)return view(r.status(s.id));
    const observed=await site.observe({...options,out:path.join(dir,'observation-'+randomUUID())},{...overrides,probeGoal:probe(s.config.goal),probeOutcome:client=>recoverWithMaintenance(r,s,client,dir,s.openEffects),probeCapabilities:client=>capabilities.observe(client,s.config.goal)}) as unknown as ProviderReport;
    if(observed.status!=='observed'||!observed.gameplay?.domAgrees||observed.goalProof?.status!=='available')return view(r.failObservation(s.id,reservation,'reliable-original-observation-unavailable'));
    const choices=selected?[capabilities.legacyDescriptor(selected,settings.intent,s.config.goal,hash([selected,settings.intent]))]:capabilities.choicesFrom(observed,s.epoch+1,s.config.goal);
    const scene={source:'original DoL semantic provider',revision:s.epoch+1,location:observed.gameplay!.location||'unknown',choices,facts:observed.gameplay,goalProof:observed.goalProof};
    // Only reviewed local Outcome readers can close dispatched attempts; CLI model narratives cannot.
    const resolutions=[...rejectionReceipts(s.openEffects),...(observed.effectReceipts||[]),...(overrides.readOutcome?await overrides.readOutcome(s.openEffects,observed,s):[])];
    await verifyResource(r,s,options,overrides);
    s=r.observe(s.id,scene,resolutions,{reservation}) as SessionView;if(s.machine.value!=='waitingDecision'||!selected)return view(s);
    const d=s.decision,p={...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:(choices[0] as {ref:unknown}).ref,reason:'Reviewed legacy command adapted to the current Session request',plan:['Execute selected current action','Observe original state and replan'],beliefs:[]};
    s=r.propose(s.id,p) as SessionView;return await dispatchReady(r,s,dir,overrides);
  }finally{r.close()}
}
async function session(directory:string,operation:string,settings:Settings={},overrides:Overrides={}){
  if(operation==='status')return view(status(directory));
  if(operation==='request'||operation==='resume')return advance(directory,{testEnvironment:settings.testEnvironment,resume:operation==='resume'},overrides);
  if(settings.testEnvironment!==true)throw Error('Session changes require explicit test environment');
  if(operation==='reconcile'){
    const dir=path.resolve(directory),l=link(dir),r=open(l.store,overrides);let reservation;
    try{
      const original=r.status(l.sessionId) as SessionView;if(!original.openEffects.some(e=>e.sessionId===original.id))return view(original);
      reservation=r.reserveReconciliation(original.id);const s=r.status(original.id) as SessionView,effects=s.openEffects.filter(e=>e.sessionId===s.id);
      const deadline=Date.now()+30000,options={...(require('./host-options.cjs') as typeof import('./host-options.cjs')).fromTarget(s.target),testEnvironment:true,gameplay:true,authorization:s.config.scope??s.config.goal.scope,timeoutMs:30000,out:path.join(dir,'reconciliation-'+randomUUID())};
      if(s.target.host==='chrome'){
        await verifyResource(r,s,options,overrides);
        if(Date.now()>=deadline)throw Error('Reconciliation deadline');
        options.timeoutMs=Math.max(1,deadline-Date.now());
      }
      const observed=await site.observe(options,{...overrides,probeOutcome:async client=>{
        // A reviewed cleanup reader shares this transport and cannot create a new execution window.
        let timer:ReturnType<typeof setTimeout>|undefined;try{
          if(Date.now()>=deadline)throw Error('Reconciliation deadline');
          return await Promise.race([
            (async()=>[...await receipts.recover(client,effects),...(overrides.reconcileOutcome?await overrides.reconcileOutcome(client,effects,s):[])])(),
            new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Reconciliation deadline')),Math.max(1,deadline-Date.now()))}),
          ]);
        }finally{clearTimeout(timer)}
      }}) as unknown as ProviderReport;
      if(Date.now()>=deadline||observed.status!=='observed'||!observed.gameplay?.domAgrees)throw Error('Reliable reconciliation observation unavailable');
      const closing=[...rejectionReceipts(effects),...(observed.effectReceipts||[])];
      return view(r.reconcile(s.id,closing,{reservation}));
    }catch(error){
      if(reservation){try{return view(r.failReconciliation(l.sessionId,reservation,'reviewed-reconciliation-read-or-result-failed'))}catch{/* A replaced lease/reservation must not accept this late read. */}}
      throw error;
    }finally{r.close()}
  }
  let checkpoint,checkpointObservation;
  if(operation==='checkpoint'){
    checkpoint=readJson(settings.file as string) as CheckpointView;const s=status(directory) as SessionView;
    if(s.config.mode!=='development'||!s.config.requiredCheckpoints?.includes(checkpoint.name as string)||!keys(checkpoint,['name','predicate','passage'])||!['goal-satisfied','scene-passage'].includes(checkpoint.predicate as string)||checkpoint.predicate==='scene-passage'&&(typeof checkpoint.passage!=='string'||checkpoint.passage.length>128)||checkpoint.predicate==='goal-satisfied'&&checkpoint.passage!==undefined)throw Error('Invalid requested original-state checkpoint');
    const current=await advance(directory,{testEnvironment:true},overrides) as unknown as {phase?:unknown;revision?:unknown;proof:{satisfied?:unknown};decision:{scene:{facts:{passage?:unknown}}}};
    if(current.phase!=='waitingDecision')return current;
    checkpointObservation={revision:current.revision,passed:checkpoint.predicate==='goal-satisfied'?current.proof.satisfied:current.decision.scene.facts.passage===checkpoint.passage};
  }
  const dir=path.resolve(directory),l=link(dir),r=open(l.store,overrides);
  try{
    if(operation==='propose')return view(r.propose(l.sessionId,readJson(settings.file as string)));
    if(operation==='dispatch')return await dispatchReady(r,r.status(l.sessionId) as SessionView,dir,overrides);
    if(operation==='cancel')return view({...(r.stop(l.sessionId) as object),openEffects:(r.status(l.sessionId) as SessionView).openEffects});
    if(operation==='checkpoint'){
      const s=r.status(l.sessionId) as SessionView;
      await verifyResource(r,s,{...s.target,authorization:s.config.scope??s.config.goal.scope},overrides);
      return view(r.checkpoint(l.sessionId,{name:checkpoint!.name,passed:checkpointObservation!.passed,source:'fresh original DoL state: '+checkpoint!.predicate},{revision:checkpointObservation!.revision}));
    }
    throw Error('Unsupported Session operation');
  }finally{r.close()}
}
const api={open,validate,provider,rejectionReceipts,start,advance,status,view,session,candidates} as {open:typeof open;validate:typeof validate;provider:typeof provider;rejectionReceipts:typeof rejectionReceipts;start:typeof start;advance:typeof advance;status:typeof status;view:typeof view;session:typeof session;candidates:typeof candidates;goalReader:typeof import('./game-goal-reader.cjs').goalReader};
// Compatibility for direct local probe callers; new native sessions never load
// the clothing reader or optional integration through this legacy export.
Object.defineProperty(api,'goalReader',{enumerable:true,get:()=>(require('./game-goal-reader.cjs') as typeof import('./game-goal-reader.cjs')).goalReader});

export = api;
