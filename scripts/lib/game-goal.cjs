const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {randomUUID,createHash}=require('node:crypto');
const semantic=require('./game-semantic.cjs'),site=require('./game-dol-provider.cjs'),collectors=require('./collectors.cjs');
const receipts=require('./game-receipts.cjs');
const capabilities=require('./game-capabilities.cjs');
const {validate,provider,probe,candidates}=capabilities;
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const keys=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
function readJson(file,max=65536){if(!fs.statSync(file).isFile()||fs.statSync(file).size>max)throw Error('Invalid or oversized local record');return JSON.parse(fs.readFileSync(file,'utf8'))}
function loadLegacy(dir) {
  const state = readJson(path.join(dir, 'goal.json'), 262144);
  validate(state.request);
  if (state.experimental !== true || !/^[a-f0-9-]{36}$/.test(state.id || '') || !Number.isFinite(state.deadline) || !Number.isSafeInteger(state.actions) ||
    !Number.isSafeInteger(state.observations) || state.actions < 0 || state.observations < 0 || state.actions > state.request.budget.maxActions || state.observations > state.request.budget.maxObservations ||
    !Array.isArray(state.events) || state.events.length > 256 || !keys(state.target, ['serial', 'package', 'userId', 'targetId', 'webviewSocket']) ||
    typeof state.target.serial !== 'string' || !/^[\w.:-]{1,128}$/.test(state.target.serial) || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(state.target.package || '') ||
    !/^\d+$/.test(state.target.userId || '') || !['active','paused','completed','exhausted','needs-result-interpretation'].includes(state.status) ||
    !Number.isFinite(Date.parse(state.startedAt)) || state.deadline !== Date.parse(state.startedAt) + state.request.budget.timeoutMs) throw Error('Invalid Goal journal');
  return state;
}

function validateSelection(selected,intent,g){
  if(!semantic.intents.includes(intent))throw Error('Unreviewed Gameplay intent');
  const owner=capabilities.capability({selected});owner.validateAction(selected,intent,g);return owner;
}
function loadRuntime(){
  try{return require('./game-runtime.cjs').Runtime}catch(e){if(e.code==='ERR_UNKNOWN_BUILTIN_MODULE'||e.code==='MODULE_NOT_FOUND')throw Object.assign(Error('Gameplay Runtime requires XState and Node SQLite. Run npm ci --ignore-scripts --no-audit --no-fund in the Tools root; Node 22.12 needs --experimental-sqlite. Generic diagnostics remain available.'),{code:'GAMEPLAY_RUNTIME_UNAVAILABLE'});throw e}
}
function open(store,overrides={}){
  if(!path.isAbsolute(store))throw Error('Absolute shared Store required');
  const Runtime=loadRuntime();return new Runtime(store,{provider,leaseMs:120000,...overrides.runtime});
}
function link(dir){const l=readJson(path.join(path.resolve(dir),'goal.json'),262144);if(l.format!=='paisley-session-link')throw Error('Foundation history is read-only; start a new scoped Goal. No automatic migration or unknown-result dismissal.');if(l.version!==2||!path.isAbsolute(l.store)||!/^[-a-f0-9]{36}$/.test(l.sessionId))throw Error('Invalid Session link');return l}
function status(dir){const raw=readJson(path.join(path.resolve(dir),'goal.json'),262144);if(raw.format!=='paisley-session-link')return {...loadLegacy(path.resolve(dir)),readOnly:true};const l=link(dir),r=open(l.store);try{return r.status(l.sessionId)}finally{r.close()}}
function decisionView(decision){
  if(!decision)return null;
  return {...decision,scene:{...decision.scene,choices:decision.scene.choices.map(capabilities.publicDescriptor),facts:{...decision.scene.facts,choices:decision.scene.facts.choices.map(({selector,...choice})=>choice)}},
    // A stored old request may lack the new envelope. Preserve its historical
    // fields; freshly observed decisions always have a persisted descriptor.
    outcomes:(decision.outcomes??[]).map(outcome=>outcome.descriptor?capabilities.publicOutcome(outcome):outcome)};
}
function view(s){
  if(s.readOnly)return{experimental:true,goalId:s.id,status:'foundation-history',readOnly:true,proof:s.proof||null,pending:!!s.pending,next:'start-a-new-scoped-goal'};
  const memory=require('./game-runtime.cjs').memoryView(s);
  const combinedProof=capabilities.publicProof(s);
  const state=s.machine.value;return{experimental:true,runtimeVersion:2,goalId:s.id,epoch:s.epoch,revision:s.revision,status:state==='completed'?'completed':s.stopReason==='checkpoint-failed'?'failed':s.stopReason==='cancelled'?'cancelled':s.stopReason?'exhausted':state==='paused'?'paused':state==='reconciling'?'needs-result-interpretation':'active',phase:state,actions:s.actions,observations:s.observations,pending:!!s.openEffects?.length,proof:combinedProof,reason:s.pauseReason||s.stopReason||null,decision:decisionView(s.decision),budget:{deadline:s.deadline,maxSpend:s.config.budget.maxSpend,spent:s.spent,reserved:s.reserved,actualSpendExceeded:s.spent>s.config.budget.maxSpend},reconciliation:{reads:s.reconciliationReads??0,maxReads:8,error:s.reconciliationError??null},checkpoints:s.checkpoints,requiredCheckpoints:s.config.requiredCheckpoints||[],routes:s.routes||[],...memory};
}
async function start(options,request,overrides={}){
  request=validate(request);
  if(options.testEnvironment!==true||!options.out)throw Error('Explicit tested Goal target required');
  loadRuntime(); // Fail before ADB, output creation or a Session when Gameplay prerequisites are missing.
  const userId=(await(overrides.adb||collectors.android(options))('shell','am','get-current-user')).toString().trim();
  const store=options.store||process.env.PAISLEY_PARK_STORE||path.join(process.env.LOCALAPPDATA||os.homedir(),'PaisleyPark','sessions-v2.sqlite');
  const r=open(store,overrides);let s;
  try{
    fs.mkdirSync(path.resolve(options.out));
    s=r.start({serial:options.serial,package:options.package,userId,...(options.targetId?{targetId:options.targetId}:{}),...(options.webviewSocket?{webviewSocket:options.webviewSocket}:{})},{mode:request.mode,goal:{description:request.description??request.name,...request.goal},...(request.requiredCheckpoints===undefined?{}:{requiredCheckpoints:request.requiredCheckpoints}),budget:{...request.budget,maxReplans:request.budget.maxReplans??192,maxSpend:request.budget.maxSpend??request.goal.maxSpend??0}});
    try{fs.writeFileSync(path.join(options.out,'goal.json'),JSON.stringify({format:'paisley-session-link',version:2,sessionId:s.id,store:path.resolve(store)},null,2),{flag:'wx'})}catch(e){r.stop(s.id,'session-link-write-failed');throw e}
  }finally{r.close()}
  return advance(options.out,{testEnvironment:true},overrides);
}
function rejectionReceipts(effects){return effects.filter(e=>e.status==='dispatching'&&e.ack?.dispatch==='not-dispatched').map(e=>({attemptId:e.id,outcome:'not-occurred',remoteClosed:true,spent:0,source:'reviewed claimed synchronous guard rejection'}))}
async function dispatchReady(r,s,dir,overrides={}){
  if(s.machine.value!=='ready'||!s.proposal)throw Error('No current accepted Decision');
  const descriptor=s.proposal.action,selected=descriptor.selected,intent=descriptor.kind,owner=capabilities.validateDescriptor(descriptor,s.config.goal),scene=s.scene;
  // A visible control is not a declared Outcome producer. Do not create an
  // uncloseable effect merely because the raw Action runner can click it.
  if(!owner.prepare&&typeof overrides.readOutcome!=='function')return view(r.pause(s.id,'reviewed-action-outcome-unavailable'));
  const options={...s.target,expectedUserId:s.target.userId,testEnvironment:true,gameplay:true,timeoutMs:Math.max(1,Math.min(30000,s.deadline-Date.now()))};
    const e=r.prepare(s.id);if(!e)return view(r.status(s.id));
    const postReservation=r.reserveObservation(s.id);if(!postReservation)return view(r.status(s.id));
    const out=path.join(dir,'action-'+e.id);let report,binding;
    await r.dispatch(e.id,async(attempt,claim)=>{
      report=await site.act({...options,out},owner.prepare?null:selected,intent,{...overrides,
        bindExecution:value=>{binding=r.bindExecution(e.id,value).executionBinding},
        reserve:()=>{const claimed=claim();if(binding&&JSON.stringify(claimed.executionBinding)!==JSON.stringify(binding))throw Error('Claimed execution binding changed')},
        expectedScene:scene.facts,probeGoal:probe(s.config.goal),probeOutcome:client=>receipts.recover(client,[r.effect(e.id)]),
        probeCapabilities:client=>capabilities.observe(client,s.config.goal),authorizeCostedControl:mapped=>capabilities.authorizeCostedControl(mapped,descriptor,s.config.goal),
        ...(owner.prepare?{prepareAction:client=>owner.prepare(client,descriptor,s.config.goal,e.id)}:{})});
      return{dispatch:report.dispatch,record:'action-'+e.id+'/semantic.json',reason:report.reason||report.status};
    },{deferred:true});
    // Not-dispatched is an authoritative preflight/guard rejection. Ack alone never closes a business effect.
    const effect=r.effect(e.id),closing=[...rejectionReceipts([effect]),...(report?.effectReceipts||[])];
    let post=report?.after?.domAgrees&&report.goalProof?.status==='available'?{gameplay:report.after,goalProof:report.goalProof,capabilities:report.capabilities}:null;
    if(!post){const reread=await site.observe({...options,out:path.join(dir,'observation-'+randomUUID())},{...overrides,probeGoal:probe(s.config.goal),probeOutcome:client=>receipts.recover(client,[effect]),probeCapabilities:client=>capabilities.observe(client,s.config.goal)});if(reread.status==='observed'&&reread.gameplay?.domAgrees&&reread.goalProof?.status==='available'){post=reread;closing.push(...(reread.effectReceipts||[]))}}
    if(!post)return view(r.failObservation(s.id,postReservation,'reliable-post-action-observation-unavailable'));
    const after={...scene,revision:s.epoch+1,choices:capabilities.choicesFrom(post,s.epoch+1,s.config.goal),facts:post.gameplay,location:post.gameplay.location||'unknown',goalProof:post.goalProof};
    if(overrides.readOutcome)closing.push(...await overrides.readOutcome([effect],report,s));
    s=r.observe(s.id,after,closing,{reservation:postReservation});if(['blocked','paused'].includes(report?.status)&&!s.stopReason&&s.machine.value!=='completed')s=r.pause(s.id,report.reason||'execution-interrupted');return view(s);
}
async function advance(directory,settings,overrides={}){
  if(settings.testEnvironment!==true)throw Error('Goal execution requires explicit test environment');
  if(settings.reconcile!==undefined||settings.evidence!==undefined)throw Error('Model interpretation cannot settle shared effects; a reviewed terminal Outcome reader is required');
  const dir=path.resolve(directory),l=link(dir),r=open(l.store,overrides);
  try{
    let s=r.status(l.sessionId);if(s.machine.value==='completed')return view(s);
    if(settings.resume){r.resume(s.id);s=r.status(s.id)}
    if(s.stopReason)return view(s);
    let selected;if(settings.file){selected=readJson(settings.file);validateSelection(selected,settings.intent,s.config.goal)}else if(settings.intent)throw Error('Intent requires an action');
    const options={...s.target,expectedUserId:s.target.userId,testEnvironment:true,gameplay:true,timeoutMs:Math.max(1,Math.min(30000,s.deadline-Date.now()))};
    const reservation=r.reserveObservation(s.id);if(!reservation)return view(r.status(s.id));
    const observed=await site.observe({...options,out:path.join(dir,'observation-'+randomUUID())},{...overrides,probeGoal:probe(s.config.goal),probeOutcome:client=>receipts.recover(client,s.openEffects),probeCapabilities:client=>capabilities.observe(client,s.config.goal)});
    if(observed.status!=='observed'||!observed.gameplay?.domAgrees||observed.goalProof?.status!=='available')return view(r.failObservation(s.id,reservation,'reliable-original-observation-unavailable'));
    const choices=selected?[capabilities.legacyDescriptor(selected,settings.intent,s.config.goal,hash([selected,settings.intent]))]:capabilities.choicesFrom(observed,s.epoch+1,s.config.goal);
    const scene={source:'original DoL semantic provider',revision:s.epoch+1,location:observed.gameplay.location||'unknown',choices,facts:observed.gameplay,goalProof:observed.goalProof};
    // Only reviewed local Outcome readers can close dispatched attempts; CLI model narratives cannot.
    const resolutions=[...rejectionReceipts(s.openEffects),...(observed.effectReceipts||[]),...(overrides.readOutcome?await overrides.readOutcome(s.openEffects,observed,s):[])];
    s=r.observe(s.id,scene,resolutions,{reservation});if(s.machine.value!=='waitingDecision'||!selected)return view(s);
    const d=s.decision,p={...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:choices[0].ref,reason:'Reviewed legacy command adapted to the current Session request',plan:['Execute selected current action','Observe original state and replan'],beliefs:[]};
    s=r.propose(s.id,p);return await dispatchReady(r,s,dir,overrides);
  }finally{r.close()}
}
async function session(directory,operation,settings={},overrides={}){
  if(operation==='status')return view(status(directory));
  if(operation==='request'||operation==='resume')return advance(directory,{testEnvironment:settings.testEnvironment,resume:operation==='resume'},overrides);
  if(settings.testEnvironment!==true)throw Error('Session changes require explicit test environment');
  if(operation==='reconcile'){
    const dir=path.resolve(directory),l=link(dir),r=open(l.store,overrides);let reservation;
    try{
      const original=r.status(l.sessionId);if(!original.openEffects.some(e=>e.sessionId===original.id))return view(original);
      reservation=r.reserveReconciliation(original.id);const s=r.status(original.id),effects=s.openEffects.filter(e=>e.sessionId===s.id);
      const deadline=Date.now()+30000,options={...s.target,expectedUserId:s.target.userId,testEnvironment:true,gameplay:true,timeoutMs:30000,out:path.join(dir,'reconciliation-'+randomUUID())};
      const observed=await site.observe(options,{...overrides,probeOutcome:async client=>{
        // A reviewed cleanup reader shares this transport and cannot create a new execution window.
        let timer;try{
          if(Date.now()>=deadline)throw Error('Reconciliation deadline');
          return await Promise.race([
            (async()=>[...await receipts.recover(client,effects),...(overrides.reconcileOutcome?await overrides.reconcileOutcome(client,effects,s):[])])(),
            new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Reconciliation deadline')),Math.max(1,deadline-Date.now()))}),
          ]);
        }finally{clearTimeout(timer)}
      }});
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
    checkpoint=readJson(settings.file);const s=status(directory);
    if(s.config.mode!=='development'||!s.config.requiredCheckpoints?.includes(checkpoint.name)||!keys(checkpoint,['name','predicate','passage'])||!['goal-satisfied','scene-passage'].includes(checkpoint.predicate)||checkpoint.predicate==='scene-passage'&&(typeof checkpoint.passage!=='string'||checkpoint.passage.length>128)||checkpoint.predicate==='goal-satisfied'&&checkpoint.passage!==undefined)throw Error('Invalid requested original-state checkpoint');
    const current=await advance(directory,{testEnvironment:true},overrides);
    if(current.phase!=='waitingDecision')return current;
    checkpointObservation={revision:current.revision,passed:checkpoint.predicate==='goal-satisfied'?current.proof.satisfied:current.decision.scene.facts.passage===checkpoint.passage};
  }
  const dir=path.resolve(directory),l=link(dir),r=open(l.store,overrides);
  try{
    if(operation==='propose')return view(r.propose(l.sessionId,readJson(settings.file)));
    if(operation==='dispatch')return await dispatchReady(r,r.status(l.sessionId),dir,overrides);
    if(operation==='cancel')return view({...r.stop(l.sessionId),openEffects:r.status(l.sessionId).openEffects});
    if(operation==='checkpoint'){
      return view(r.checkpoint(l.sessionId,{name:checkpoint.name,passed:checkpointObservation.passed,source:'fresh original DoL state: '+checkpoint.predicate},{revision:checkpointObservation.revision}));
    }
    throw Error('Unsupported Session operation');
  }finally{r.close()}
}
module.exports={validate,provider,rejectionReceipts,start,advance,status,view,session,candidates};
// Compatibility for direct local probe callers; new native sessions never load
// the clothing reader or optional integration through this legacy export.
Object.defineProperty(module.exports,'goalReader',{enumerable:true,get:()=>require('./game-goal-reader.cjs').goalReader});
