'use strict';
const fs=require('node:fs'), path=require('node:path');
const {randomUUID,createHash}=require('node:crypto');
const {DatabaseSync}=require('node:sqlite');
const {createMachine,createActor}=require('xstate');
const machine=createMachine({id:'session',initial:'observing',on:{STOP:'.halted',PAUSE:'.paused',PENDING:'.reconciling'},states:{
  observing:{on:{OBSERVED:'waitingDecision',GOAL:'completed'}},
  waitingDecision:{on:{PROPOSED:'ready',OBSERVE:'observing',GOAL:'completed'}},
  ready:{on:{DISPATCH:'reconciling',OBSERVE:'observing',GOAL:'completed'}},
  reconciling:{on:{SETTLED:'observing'}},paused:{on:{RESUME:'observing'}},halted:{},completed:{}
}});
const text=(v,max=512)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const integer=v=>Number.isSafeInteger(v)&&v>=0;
const strict=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
const json=v=>{const raw=JSON.stringify(v);if(!raw||Buffer.byteLength(raw)>262144)throw Error('Oversized record');return raw};
const copy=v=>JSON.parse(json(v));
const digest=v=>createHash('sha256').update(json(v)).digest('hex');
const routeAction=a=>digest([a.kind,a.label??null,a.destination??null,a.selected??a.ref]);
function checkedTrace(v){
  if(!strict(v,['key','progress','description','distances'])||!text(v.description,128)||![v.key,v.progress].every(k=>/^[a-f0-9]{64}$/.test(k))||
    v.distances!==undefined&&(!Array.isArray(v.distances)||v.distances.length<1||v.distances.length>9||!Array.from(v.distances).every(d=>Number.isFinite(d)&&d>=0)))throw Error('Invalid reviewed progress trace');
  return copy(v);
}
function trace(provider,scene,goal){return provider.trace?checkedTrace(provider.trace(scene,goal)):null}
function progressed(before,after){
  checkedTrace(before);checkedTrace(after);
  if(before.distances===undefined&&after.distances===undefined)return before.progress!==after.progress;
  return !!before.distances&&!!after.distances&&before.distances.length===after.distances.length&&
    after.distances.every((d,i)=>d<=before.distances[i])&&after.distances.some((d,i)=>d<before.distances[i]);
}
const key=t=>createHash('sha256').update(JSON.stringify([t.serial,t.package,t.userId])).digest('hex');
const emptyCognition=()=>({subgoals:[],events:[]});
function cognition(value,previous,epoch,{stored=false}={}){
  if(!strict(value,['subgoals','events'])||Object.keys(value).length!==2)throw Error('Invalid event memory');
  const fields={subgoals:['id','description','status','sourceEpoch'],events:['id','description','sourceEpoch','returnTo']},limits={subgoals:8,events:4},result={};
  for(const kind of ['subgoals','events']){
    const list=value[kind];if(!Array.isArray(list)||list.length>limits[kind])throw Error('Invalid event memory');const seen=new Set();
    result[kind]=list.map(entry=>{
      if(!strict(entry,[...fields[kind],...(stored?[]:['needsReview'])])||!text(entry.id,64)||!/^[A-Za-z0-9._-]{1,64}$/.test(entry.id)||seen.has(entry.id)||!text(entry.description,256)||!integer(entry.sourceEpoch)||entry.sourceEpoch>epoch||
        kind==='subgoals'&&!['active','blocked','satisfied'].includes(entry.status)||kind==='events'&&entry.returnTo!==null&&(!text(entry.returnTo,64)||!/^[A-Za-z0-9._-]{1,64}$/.test(entry.returnTo)))throw Error('Invalid event memory');
      seen.add(entry.id);const old=previous?.[kind]?.find(v=>v.id===entry.id);
      if(!stored&&entry.sourceEpoch!==epoch&&(!old||fields[kind].some(k=>entry[k]!==old[k])))throw Error('Old event interpretation must be retained unchanged or reviewed in the current epoch');
      // Freshness is derived by the core; a host cannot make an old source current with a flag.
      if(entry.needsReview!==undefined&&entry.needsReview!==(entry.sourceEpoch!==epoch))throw Error('Invalid event freshness');
      return Object.fromEntries(fields[kind].map(k=>[k,entry[k]]));
    });
  }
  const ids=new Set(result.subgoals.map(v=>v.id));if(result.events.some(v=>v.returnTo!==null&&!ids.has(v.returnTo)))throw Error('Dangling event return target');
  return result;
}
function memoryView(s){
  // An older document has no freshness flag: require review rather than silently
  // treating a pre-dispatch interpretation as confirmed current state.
  const fresh=v=>({...v,needsReview:s.memoryNeedsReview!==false||v.sourceEpoch!==s.epoch});
  return {beliefs:s.beliefs.map(fresh),cognition:{subgoals:s.cognition.subgoals.map(fresh),events:s.cognition.events.map(fresh)}};
}
function move(s,event){
  const actor=createActor(machine,s.machine?{snapshot:s.machine}:{}).start();
  try{if(event){if(!actor.getSnapshot().can({type:event}))throw Error('Invalid lifecycle transition');actor.send({type:event})}s.machine=copy(actor.getPersistedSnapshot());return s.machine.value}
  finally{actor.stop()}
}
function target(t){if(!strict(t,['serial','package','userId','targetId','webviewSocket'])||!text(t.serial,128)||!/^[\w.:-]+$/.test(t.serial)||!text(t.package,128)||!/^\w+(?:\.\w+)+$/.test(t.package)||!text(t.userId,10)||!/^(?:0|[1-9]\d*)$/.test(t.userId)||Number(t.userId)>2147483647||t.targetId!==undefined&&!/^[A-Za-z0-9._:-]{1,128}$/.test(t.targetId)||t.webviewSocket!==undefined&&!/^(?:browser_)?webview_devtools_remote_\d+$/.test(t.webviewSocket))throw Error('Explicit canonical target required');return copy(t)}
function config(c,validateGoal){
  if(!strict(c,['goal','mode','budget','requiredCheckpoints'])||!text(c.goal?.description)||!validateGoal(c.goal)||!['gameplay','development'].includes(c.mode))throw Error('Invalid Goal configuration');
  if(c.requiredCheckpoints!==undefined&&(!Array.isArray(c.requiredCheckpoints)||c.mode!=='development'||c.requiredCheckpoints.length>8||!c.requiredCheckpoints.every(v=>text(v,128))||new Set(c.requiredCheckpoints).size!==c.requiredCheckpoints.length))throw Error('Invalid required checkpoints');
  const fields=['timeoutMs','maxActions','maxObservations','maxReplans','maxSpend'],b=c.budget;if(!strict(b,fields)||!fields.every(k=>integer(b[k]))||b.timeoutMs<1000||b.timeoutMs>3600000||b.maxActions<1||b.maxActions>64||b.maxObservations<1||b.maxObservations>192||b.maxReplans<1||b.maxReplans>192||b.maxSpend>100000000)throw Error('Invalid budget');return copy(c);
}
// One shared control/ledger core. Reviewed providers own facts and business predicates; no dispatch in XState actions/invocations.
class Runtime{
  constructor(file,{clock=Date.now,leaseMs=30000,provider}={}){
    if(!path.isAbsolute(file)||!integer(leaseMs)||leaseMs<1)throw Error('Explicit Store required');
    if(!provider||!['validateGoal','scene','satisfied'].every(k=>typeof provider[k]==='function')||['validateReceipt','canPrepare'].some(k=>provider[k]!==undefined&&typeof provider[k]!=='function'))throw Error('Reviewed semantic provider required');this.provider=provider;this.clock=clock;this.leaseMs=leaseMs;fs.mkdirSync(path.dirname(file),{recursive:true});this.db=new DatabaseSync(file);
    try{
      const version=this.db.prepare('PRAGMA user_version').get().user_version;
      const tables=this.db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
      if(version!==2&&(version!==0||tables.length))throw Error('Unsupported Store schema; no automatic migration');
      this.db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=1000;');
      this.db.exec(`CREATE TABLE IF NOT EXISTS targets(k TEXT PRIMARY KEY,owner TEXT,generation INTEGER NOT NULL,until_ms INTEGER NOT NULL);
        CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY,doc TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS effects(id TEXT PRIMARY KEY,target_key TEXT NOT NULL,session_id TEXT NOT NULL,status TEXT NOT NULL,doc TEXT NOT NULL);
        CREATE INDEX IF NOT EXISTS open_effects ON effects(target_key,status); PRAGMA user_version=2;`);
    }catch(e){this.db.close();throw e}
  }
  close(){this.db.close()}
  transaction(fn){this.db.exec('BEGIN IMMEDIATE');try{const value=fn();this.db.exec('COMMIT');return value}catch(e){this.db.exec('ROLLBACK');throw e}}
  load(id){const row=this.db.prepare('SELECT doc FROM sessions WHERE id=?').get(id);if(!row)throw Error('Session not found');const s=JSON.parse(row.doc);if(s.version!==2||s.id!==id||key(s.target)!==s.targetKey||!integer(s.revision)||!integer(s.actions)||!integer(s.observations)||!integer(s.replans)||!integer(s.spent)||!integer(s.reserved)||!integer(s.deadline)||!integer(s.bindingGeneration)||!integer(s.epoch)||!integer(s.planRevision)||!integer(s.memoryRevision)||!machine.states[s.machine?.value]||!Array.isArray(s.checkpoints)||s.checkpoints.length>32||s.observationAttempt!==undefined&&!/^[a-f0-9-]{36}$/.test(s.observationAttempt))throw Error('Invalid Session');target(s.target);config(s.config,this.provider.validateGoal);s.cognition=cognition(s.cognition??emptyCognition(),null,s.epoch,{stored:true});if(s.memoryNeedsReview!==undefined&&typeof s.memoryNeedsReview!=='boolean')throw Error('Invalid memory freshness');s.reconciliationReads??=0;if(!integer(s.reconciliationReads)||s.reconciliationReads>8||s.reconciliationAttempt!==undefined&&!/^[a-f0-9-]{36}$/.test(s.reconciliationAttempt))throw Error('Invalid reconciliation state');return s}
  save(s){this.db.prepare('INSERT INTO sessions(id,doc) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET doc=excluded.doc').run(s.id,json(s))}
  effects(k){return this.db.prepare("SELECT doc FROM effects WHERE target_key=? AND status!='settled'").all(k).map(row=>JSON.parse(row.doc))}
  effect(id){const row=this.db.prepare('SELECT doc FROM effects WHERE id=?').get(id);if(!row)throw Error('Effect not found');return JSON.parse(row.doc)}
  outcomeContext(s){
    const rows=this.db.prepare('SELECT doc FROM effects WHERE session_id=? LIMIT 65').all(s.id);
    if(rows.length>64)throw Error('Session effect bound exceeded');
    return {effects:rows.map(row=>{const e=JSON.parse(row.doc);return copy({id:e.id,status:e.status,action:e.action,result:e.result,executionBinding:e.executionBinding})}),spent:s.spent,reserved:s.reserved,budget:copy(s.config.budget)};
  }
  allowedAction(s,action,context){
    if(!this.provider.canPrepare)return true;
    const allowed=this.provider.canPrepare(copy(action),copy(s.config.goal),copy(context??this.outcomeContext(s)));
    if(typeof allowed!=='boolean')throw Error('Synchronous reviewed action constraint required');
    return allowed;
  }
  saveEffect(e){this.db.prepare('INSERT INTO effects VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,doc=excluded.doc').run(e.id,e.targetKey,e.sessionId,e.status,json(e))}
  own(s){const lease=this.db.prepare('SELECT * FROM targets WHERE k=?').get(s.targetKey);if(!lease||lease.owner!==s.id||lease.generation!==s.bindingGeneration||lease.until_ms<=this.clock())throw Error('Target lease lost');this.db.prepare('UPDATE targets SET until_ms=? WHERE k=?').run(this.clock()+this.leaseMs,s.targetKey);return lease}
  claim(s,force=false){
    const old=this.db.prepare('SELECT * FROM targets WHERE k=?').get(s.targetKey),now=this.clock();
    if(old&&old.owner!==s.id&&old.until_ms>now)throw Error('Target owned by another Session');
    const generation=old?(old.owner===s.id&&old.until_ms>now&&!force?old.generation:old.generation+1):1;
    this.db.prepare('INSERT INTO targets VALUES(?,?,?,?) ON CONFLICT(k) DO UPDATE SET owner=excluded.owner,generation=excluded.generation,until_ms=excluded.until_ms').run(s.targetKey,s.id,generation,now+this.leaseMs);
    s.bindingGeneration=generation;
  }
  exhausted(s,{planning=true}={}){const b=s.config.budget;return this.clock()>=s.deadline||s.actions>=b.maxActions||s.observations>=b.maxObservations||(planning&&s.replans>=b.maxReplans)||s.spent>b.maxSpend}
  halt(s,reason){this.invalidateMemory(s);s.stopReason=reason;s.decision=null;s.proposal=null;delete s.observationAttempt;delete s.reconciliationAttempt;move(s,'STOP');this.db.prepare('UPDATE targets SET until_ms=0 WHERE k=? AND owner=?').run(s.targetKey,s.id)}
  invalidateMemory(s){if(!s.memoryNeedsReview&&(s.beliefs.length||s.cognition.subgoals.length||s.cognition.events.length))s.memoryRevision++;s.memoryNeedsReview=true}
  start(t,c){return this.transaction(()=>{const s={version:2,id:randomUUID(),target:target(t),config:config(c,this.provider.validateGoal),revision:0,epoch:0,planRevision:0,memoryRevision:0,actions:0,observations:0,replans:0,spent:0,reserved:0,plan:[],beliefs:[],cognition:emptyCognition(),memoryNeedsReview:false,decision:null,proposal:null,stopReason:null,goalSatisfied:false,checkpoints:[]};s.targetKey=key(s.target);s.deadline=this.clock()+s.config.budget.timeoutMs;move(s);this.claim(s);this.save(s);return s})}
  resume(id){return this.transaction(()=>{const s=this.load(id);if(s.machine.value==='completed')throw Error('Closed Session; start a new Goal');this.claim(s,true);this.invalidateMemory(s);s.revision++;s.epoch++;s.decision=null;s.proposal=null;delete s.observationAttempt;delete s.reconciliationAttempt;delete s.pauseReason;if(!s.stopReason){if(this.effects(s.targetKey).length)move(s,'PENDING');else{if(s.machine.value==='paused')move(s,'RESUME');else if(s.machine.value==='reconciling')move(s,'SETTLED');else if(s.machine.value!=='observing')move(s,'OBSERVE')}}this.save(s);return s})}
  reserveObservation(id){return this.transaction(()=>{
    const s=this.load(id);this.own(s);if(s.machine.value==='completed'||s.stopReason)return null;
    if(s.observations>=s.config.budget.maxObservations||this.clock()>=s.deadline){this.halt(s,'observation-budget-exhausted');s.revision++;this.save(s);return null}
    this.invalidateMemory(s);s.observations++;s.revision++;s.decision=null;s.proposal=null;s.observationAttempt=randomUUID();
    if(['ready','waitingDecision'].includes(s.machine.value))move(s,'OBSERVE');this.save(s);return s.observationAttempt;
  })}
  failObservation(id,reservation,reason){return this.transaction(()=>{
    const s=this.load(id);this.own(s);if(s.observationAttempt!==reservation)throw Error('Stale observation attempt');delete s.observationAttempt;
    s.revision++;s.decision=null;s.proposal=null;
    if(s.observations>=s.config.budget.maxObservations||this.clock()>=s.deadline)this.halt(s,'observation-budget-exhausted');
    else{if(!text(reason,128))throw Error('Observation failure reason required');s.pauseReason=reason;move(s,'PAUSE')}
    this.save(s);return {...s,openEffects:this.effects(s.targetKey)};
  })}
  pause(id,reason){return this.transaction(()=>{const s=this.load(id);if(s.machine.value==='completed'||s.stopReason)throw Error('Closed Session');this.own(s);if(!text(reason,128))throw Error('Pause reason required');this.invalidateMemory(s);s.pauseReason=reason;s.decision=null;s.proposal=null;delete s.observationAttempt;s.revision++;move(s,'PAUSE');this.save(s);return {...s,openEffects:this.effects(s.targetKey)}})}
  checkpointsPassed(s){return(s.config.requiredCheckpoints||[]).every(name=>s.checkpoints.some(c=>c.name===name&&c.passed))}
  blockedRoute(s,a){const current=trace(this.provider,s.scene,s.config.goal);return !!current&&(s.routes||[]).filter(r=>r.from===current.key&&r.progress===current.progress&&r.actionKey===routeAction(a)&&!r.progressed).length>=3}
  checkpoint(id,c,{revision}={}){return this.transaction(()=>{const s=this.load(id);this.own(s);if(revision!==undefined&&revision!==s.revision)throw Error('Stale checkpoint observation');if(s.stopReason||s.machine.value==='completed'||s.config.mode!=='development'||!strict(c,['name','attemptId','passed','source'])||!text(c.name,128)||typeof c.passed!=='boolean'||!text(c.source,256)||s.checkpoints.length>=32)throw Error('Invalid development checkpoint');if(c.attemptId&&this.effect(c.attemptId).sessionId!==s.id)throw Error('Checkpoint attempt mismatch');s.checkpoints.push({...copy(c),epoch:s.epoch,revision:s.revision});s.revision++;s.decision=null;s.proposal=null;if(['ready','waitingDecision'].includes(s.machine.value))move(s,'OBSERVE');if(!c.passed)this.halt(s,'checkpoint-failed');else if(s.goalSatisfied&&this.checkpointsPassed(s)&&!this.effects(s.targetKey).length){if(s.machine.value==='paused')move(s,'RESUME');move(s,'GOAL');s.decision=null;s.proposal=null;this.db.prepare('UPDATE targets SET until_ms=0 WHERE k=? AND owner=?').run(s.targetKey,s.id)}this.save(s);return {...s,openEffects:this.effects(s.targetKey)}})}
  stop(id,reason='cancelled'){return this.transaction(()=>{const s=this.load(id);if(s.machine.value==='completed')throw Error('Closed Session');this.own(s);this.halt(s,reason);s.revision++;this.save(s);this.db.prepare('UPDATE targets SET until_ms=0 WHERE k=? AND owner=?').run(s.targetKey,s.id);return s})}
  status(id){const s=this.load(id);return {...s,...memoryView(s),openEffects:this.effects(s.targetKey)}}
  reserveReconciliation(id){return this.transaction(()=>{
    const s=this.load(id);
    if(s.machine.value==='completed'||!s.stopReason&&this.clock()<s.deadline&&s.observations<s.config.budget.maxObservations||!this.effects(s.targetKey).some(e=>e.sessionId===s.id))throw Error('Cleanup requires an exhausted or stopped Session with its own pending effects');
    if((s.reconciliationReads??0)>=8)throw Error('Reconciliation read budget exhausted');
    this.claim(s,true);this.invalidateMemory(s);s.reconciliationReads=(s.reconciliationReads??0)+1;s.epoch++;s.revision++;s.decision=null;s.proposal=null;
    delete s.observationAttempt;delete s.pauseReason;s.stopReason??=this.clock()>=s.deadline?'deadline-exhausted':'observation-budget-exhausted';
    move(s,'STOP');s.reconciliationAttempt=randomUUID();this.save(s);return s.reconciliationAttempt;
  })}
  reconcile(id,resolutions,{reservation}={}){return this.transaction(()=>{
    const s=this.load(id);this.own(s);if(!reservation||s.reconciliationAttempt!==reservation||!s.stopReason||s.machine.value!=='halted')throw Error('Stale reconciliation attempt');
    this.settleResults(s,resolutions,undefined,{ownerOnly:true});delete s.reconciliationAttempt;delete s.reconciliationError;s.revision++;
    this.halt(s,s.stopReason);this.save(s);return {...s,openEffects:this.effects(s.targetKey)};
  })}
  failReconciliation(id,reservation,reason){return this.transaction(()=>{
    const s=this.load(id);this.own(s);if(!reservation||s.reconciliationAttempt!==reservation||!text(reason,128))throw Error('Stale or invalid reconciliation failure');
    delete s.reconciliationAttempt;s.reconciliationError=reason;s.revision++;this.halt(s,s.stopReason);this.save(s);return {...s,openEffects:this.effects(s.targetKey)};
  })}
  settleResults(s,resolutions,afterTrace,{ownerOnly=false}={}){
    if(!Array.isArray(resolutions)||resolutions.length>64)throw Error('Invalid resolution batch');
    // Closing prepared reservations holds the same write transaction as dispatch claiming.
    for(const e of this.effects(s.targetKey))if(e.status==='prepared'&&(!ownerOnly||e.sessionId===s.id))resolutions=[...resolutions,{attemptId:e.id,outcome:'not-occurred',remoteClosed:true,spent:0,source:'coordinator: reservation never crossed dispatch boundary'}];
    for(const r of resolutions){
      if(!strict(r,['attemptId','outcome','remoteClosed','spent','source','evidence'])||!text(r.attemptId,64)||!['occurred','not-occurred','unknown'].includes(r.outcome)||typeof r.remoteClosed!=='boolean'||!integer(r.spent)||!text(r.source,128)||r.evidence!==undefined&&(!r.evidence||typeof r.evidence!=='object'||Array.isArray(r.evidence)||Buffer.byteLength(JSON.stringify(r.evidence))>4096||!this.provider.validateReceipt))throw Error('Invalid result receipt');
      const e=this.effect(r.attemptId);if(e.targetKey!==s.targetKey||ownerOnly&&e.sessionId!==s.id)throw Error('Result target/owner mismatch');
      if(this.provider.validateReceipt&&this.provider.validateReceipt(copy(r),copy(e))!==true)throw Error('Unverified result evidence');
      if(e.status==='settled'){
        if(r.outcome!=='unknown'&&(r.outcome!==e.result.outcome||r.spent!==e.result.spent||r.remoteClosed!==e.result.remoteClosed||JSON.stringify(r.evidence??null)!==JSON.stringify(e.result.evidence??null)))throw Error('Conflicting settled result');
        continue;
      }
      if(r.outcome==='unknown'||r.remoteClosed!==true)continue;
      if(e.status==='prepared'&&r.outcome!=='not-occurred')throw Error('Prepared reservation cannot have occurred');
      if(r.outcome==='not-occurred'&&r.spent!==0)throw Error('Impossible no-effect receipt');
      const owner=e.sessionId===s.id?s:this.load(e.sessionId);if(!integer(owner.reserved-e.reservedSpend)||!integer(owner.spent+r.spent))throw Error('Invalid settlement accounting');owner.reserved-=e.reservedSpend;owner.spent+=r.spent;
      e.status='settled';e.result=copy(r);this.saveEffect(e);owner.revision++;if(owner!==s)this.save(owner);
      if(owner===s&&e.trace&&afterTrace){
        s.routes=[...(s.routes||[]),{attemptId:e.id,epoch:s.epoch+1,from:e.trace.key,to:afterTrace.key,progress:e.trace.progress,progressed:progressed(e.trace,afterTrace),description:e.trace.description+' → '+afterTrace.description,actionKey:routeAction(e.action),action:(e.action.label||e.action.kind).slice(0,160),outcome:r.outcome,reason:(e.ack?.reason||r.source).slice(0,128)}].slice(-16);s.memoryRevision++;
      }
    }
  }
  // Only a reviewed original-state reader supplies scene and per-attempt terminal receipts.
  observe(id,observed,resolutions=[],{reservation}={}){return this.transaction(()=>{
    const s=this.load(id);if(s.machine.value==='completed')throw Error('Closed Session; start a new Goal');this.own(s);if(reservation!==undefined&&s.observationAttempt!==reservation)throw Error('Stale observation attempt');observed=this.provider.scene(observed,s.config.goal);const afterTrace=trace(this.provider,observed,s.config.goal);
    this.settleResults(s,resolutions,afterTrace);
    if(reservation===undefined&&s.observations>=s.config.budget.maxObservations){this.halt(s,'observation-budget-exhausted');s.revision++;this.save(s);return {...s,openEffects:this.effects(s.targetKey)}}
    this.invalidateMemory(s);s.epoch++;s.memoryNeedsReview=false;s.revision++;if(reservation===undefined)s.observations++;delete s.observationAttempt;delete s.pauseReason;s.scene=observed;
    const satisfied=this.provider.satisfied(copy(observed),copy(s.config.goal),this.outcomeContext(s));
    if(typeof satisfied!=='boolean')throw Error('Synchronous reviewed Goal result required');
    s.goalSatisfied=satisfied;s.decision=null;s.proposal=null;
    const pending=this.effects(s.targetKey);
    if(s.stopReason){move(s,'STOP')}
    else if(pending.length){move(s,'PENDING')}
    else if(s.spent>s.config.budget.maxSpend){this.halt(s,'actual-spend-exceeded')}
    else{
      if(s.machine.value==='reconciling')move(s,'SETTLED');else if(s.machine.value==='paused')move(s,'RESUME');else if(s.machine.value!=='observing'&&s.machine.value!=='completed')move(s,'OBSERVE');
      if(s.goalSatisfied&&this.checkpointsPassed(s)&&s.machine.value!=='completed')move(s,'GOAL');
      else if(!s.goalSatisfied&&s.machine.value!=='completed'&&this.exhausted(s)){this.halt(s,'budget-exhausted')}
      else if(s.machine.value!=='completed'){
        const context=this.outcomeContext(s);
        move(s,'OBSERVED');s.decision={protocol:1,requestId:randomUUID(),sessionId:s.id,bindingGeneration:s.bindingGeneration,epoch:s.epoch,revision:s.revision,planRevision:s.planRevision,memoryRevision:s.memoryRevision,goal:s.config.goal,scene:{...s.scene,choices:s.scene.choices.filter(a=>!this.blockedRoute(s,a)&&this.allowedAction(s,a,context))},plan:s.plan,...memoryView(s),routes:s.routes||[],outcomes:context.effects.filter(e=>e.status==='settled').map(e=>({attemptId:e.id,kind:e.action.kind,descriptor:e.action,...e.result})),requiredCheckpoints:s.config.requiredCheckpoints||[],checkpoints:s.checkpoints,budget:{...s.config.budget,deadline:s.deadline,actions:s.actions,observations:s.observations,replans:s.replans,spent:s.spent,reserved:s.reserved}};
      }
    }
    this.save(s);if(s.machine.value==='completed'||s.stopReason)this.db.prepare('UPDATE targets SET until_ms=0 WHERE k=? AND owner=?').run(s.targetKey,s.id);return {...s,openEffects:pending};
  })}
  propose(id,p){return this.transaction(()=>{
    const s=this.load(id);this.own(s);const d=s.decision;
    if(!strict(p,['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision','actionRef','reason','plan','beliefs','cognition'])||!d||s.stopReason||s.machine.value!=='waitingDecision'||this.exhausted(s))throw Error('No current decision');
    for(const field of ['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'])if(p[field]!==d[field])throw Error('Stale decision envelope');
    if(!text(p.reason)||!Array.isArray(p.plan)||p.plan.length>8||!p.plan.every(v=>text(v,256))||!Array.isArray(p.beliefs)||p.beliefs.length>16||!p.beliefs.every(v=>strict(v,['claim','sourceEpoch','needsReview'])&&text(v.claim,256)&&integer(v.sourceEpoch)&&v.sourceEpoch<=s.epoch&&(v.sourceEpoch===s.epoch||s.beliefs.some(old=>old.claim===v.claim&&old.sourceEpoch===v.sourceEpoch))&&(v.needsReview===undefined||v.needsReview===(v.sourceEpoch!==s.epoch))))throw Error('Invalid cognitive update');
    const nextCognition=p.cognition===undefined?s.cognition:cognition(p.cognition,s.cognition,s.epoch);
    const selected=s.scene.choices.find(a=>a.ref===p.actionRef);if(!selected||selected.risk!=='normal'||selected.cost+s.spent+s.reserved>s.config.budget.maxSpend)throw Error('Action unavailable or outside budget');
    if(this.blockedRoute(s,selected))throw Error('Repeated route made no original goal progress; choose another current action');
    if(!d.scene.choices.some(a=>a.ref===selected.ref))throw Error('Action not offered in the current decision');
    if(this.effects(s.targetKey).length)throw Error('Target has unresolved effect');
    s.plan=copy(p.plan);s.beliefs=p.beliefs.map(({claim,sourceEpoch})=>({claim,sourceEpoch}));s.cognition=copy(nextCognition);s.memoryNeedsReview=false;s.planRevision++;s.memoryRevision++;s.replans++;s.revision++;s.proposal={action:copy(selected),sceneRevision:s.scene.revision,reason:p.reason};s.decision=null;move(s,'PROPOSED');this.save(s);return s;
  })}
  prepare(id){return this.transaction(()=>{
    const s=this.load(id);this.own(s);if(s.stopReason||s.machine.value!=='ready'||!s.proposal||this.effects(s.targetKey).length)throw Error('Dispatch not ready');
    if(this.exhausted(s,{planning:false})){this.halt(s,'budget-exhausted');this.save(s);return null}
    if(!this.allowedAction(s,s.proposal.action))throw Error('Action conflicts with verified Session outcomes');
    const e={version:2,id:randomUUID(),targetKey:s.targetKey,sessionId:s.id,generation:s.bindingGeneration,epoch:s.epoch,status:'prepared',action:s.proposal.action,sceneRevision:s.proposal.sceneRevision,reservedSpend:s.proposal.action.cost};
    const beforeTrace=trace(this.provider,s.scene,s.config.goal);if(beforeTrace)e.trace=beforeTrace;
    if(s.spent+s.reserved+e.reservedSpend>s.config.budget.maxSpend)throw Error('Spend budget exhausted');
    this.invalidateMemory(s);s.actions++;s.reserved+=e.reservedSpend;s.revision++;move(s,'DISPATCH');this.saveEffect(e);this.save(s);return e;
  })}
  bindExecution(attemptId,binding){return this.transaction(()=>{
    const e=this.effect(attemptId),s=this.load(e.sessionId);this.own(s);
    if(e.status!=='prepared'||s.stopReason||s.machine.value!=='reconciling'||e.generation!==s.bindingGeneration||e.epoch!==s.epoch||this.clock()>=s.deadline)throw Error('Attempt no longer bindable');
    if(!strict(binding,['provider','contract','contextNonce','requestDigest'])||Object.keys(binding).length!==4||!text(binding.provider,64)||!text(binding.contract,64)||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(binding.contextNonce)||!/^[a-f0-9]{64}$/.test(binding.requestDigest))throw Error('Invalid execution binding');
    if(e.executionBinding){
      if(Object.keys(binding).some(k=>e.executionBinding[k]!==binding[k]))throw Error('Conflicting execution binding');
      return e;
    }
    e.executionBinding=copy(binding);this.saveEffect(e);return e;
  })}
  claimDispatch(attemptId){return this.transaction(()=>{
    const e=this.effect(attemptId),s=this.load(e.sessionId);this.own(s);
    if(e.status!=='prepared'||s.stopReason||s.machine.value!=='reconciling'||e.generation!==s.bindingGeneration||e.epoch!==s.epoch||this.clock()>=s.deadline)throw Error('Attempt no longer dispatchable');
    e.status='dispatching';delete e.ack;this.saveEffect(e);return e;
  })}
  async dispatch(attemptId,executor,{fault=()=>{},deferred=false}={}){
    let marked=false;
    const claim=()=>{if(marked)throw Error('Attempt already claimed');const e=this.claimDispatch(attemptId);marked=true;fault('after-mark');return e};
    const e=deferred?this.transaction(()=>{const e=this.effect(attemptId),s=this.load(e.sessionId);this.own(s);if(e.status!=='prepared')throw Error('Attempt no longer dispatchable');return e}):claim();
    let result;try{result=await executor(copy(e),claim);fault('after-remote')}catch(error){result={dispatch:marked?'unknown':'not-dispatched',reason:'executor-error'}}
    return this.transaction(()=>{
      const current=this.effect(attemptId);if(current.status==='settled')return current;
      if(!marked&&current.status!=='prepared')return current; // Another caller crossed the boundary; its uncertainty cannot be downgraded.
      if(!['acknowledged','unknown','not-dispatched'].includes(result?.dispatch)||(!marked&&result.dispatch!=='not-dispatched'))throw Error('Invalid dispatch acknowledgement');
      current.status=marked?(result.dispatch==='acknowledged'?'acknowledged':'dispatching'):'prepared';current.ack=copy(result);this.saveEffect(current);return current;
    });
  }
}
module.exports={Runtime,machine,move,memoryView};
