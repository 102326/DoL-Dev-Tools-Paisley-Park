'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{spawnSync}=require('node:child_process');
const {Runtime,machine}=require('../runtime.cjs'),{Receiver}=require('../fixture.cjs');
const {createMachine,createActor,fromPromise}=require('xstate');
const target={serial:'fixture-device',package:'com.example.fixture',userId:'0'};
const config={mode:'gameplay',goal:{description:'Reach Home after a bounded purchase',location:'Home'},budget:{timeoutMs:60000,maxActions:8,maxObservations:32,maxReplans:16,maxSpend:100}};
function fixture(t,options={}){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-m1-'));const opened=[];
  const open=()=>{const r=new Runtime(path.join(dir,'sessions.sqlite'),options);opened.push(r);return r};
  const receiver=new Receiver(path.join(dir,'receiver.sqlite'),{location:options.location||'Shop'});
  t.after(()=>{receiver.close();for(const r of opened){try{r.close()}catch{}}assert.ok(path.resolve(dir).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(dir,{recursive:true,force:true})});
  return {dir,r:open(),open,receiver};
}
function proposal(d,ref='buy-cap'){return {...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:ref,reason:'Use current original scene and the unchanged user Goal',plan:['Buy once','Return home'],beliefs:[{claim:'The current shop offers a cap',sourceEpoch:d.epoch}]}}
function decision(f,c=config){const s=f.r.start(target,c),o=f.r.observe(s.id,f.receiver.observe());return {s:o,p:proposal(o.decision)}}
function ready(f,c=config){const {s,p}=decision(f,c);f.r.propose(s.id,p);return {s,e:f.r.prepare(s.id)}}
function observe(f,id){return f.r.observe(id,f.receiver.observe(),f.receiver.receipts(f.r.status(id).openEffects))}

test('expired pending reconciliation settles once without renewing or evaluating the Goal',async t=>{
  let now=1000;const f=fixture(t,{clock:()=>now}),{s,e}=ready(f);
  await f.r.dispatch(e.id,a=>f.receiver.dispatch(a));now=s.deadline+1;
  f.r.provider={...f.r.provider,satisfied(){throw Error('Cleanup must not evaluate the Goal')}};
  const token=f.r.reserveReconciliation(s.id),reserved=f.r.status(s.id);
  assert.equal(reserved.deadline,s.deadline);assert.equal(reserved.observations,s.observations);assert.equal(reserved.reconciliationReads,1);
  const done=f.r.reconcile(s.id,f.receiver.receipts(reserved.openEffects),{reservation:token});
  assert.equal(done.machine.value,'halted');assert.equal(done.stopReason,'deadline-exhausted');assert.equal(done.goalSatisfied,false);
  assert.equal(done.openEffects.length,0);assert.equal(done.spent,40);assert.equal(done.reserved,0);assert.equal(f.receiver.calls(),1);
  await assert.rejects(f.r.dispatch(e.id,a=>f.receiver.dispatch(a)));assert.equal(f.receiver.calls(),1);
  assert.throws(()=>f.r.reserveReconciliation(s.id),/own pending/);
});

test('failed cleanup is charged across hosts, bounded, fenced and cannot claim another active Session',async t=>{
  let now=1000;const f=fixture(t,{clock:()=>now}),{s,e}=ready(f);await f.r.dispatch(e.id,a=>f.receiver.dispatch(a,{delay:true}));
  assert.throws(()=>f.r.reserveReconciliation(s.id),/exhausted or stopped/);now=s.deadline+1;
  const old=f.r.reserveReconciliation(s.id),other=f.open();other.resume(s.id);
  assert.throws(()=>f.r.reconcile(s.id,[],{reservation:old}),/lease|Stale/);
  assert.throws(()=>f.r.failReconciliation(s.id,old,'read-failed'),/lease|Stale/);
  for(let i=1;i<8;i++){const host=f.open(),token=host.reserveReconciliation(s.id);host.failReconciliation(s.id,token,'read-failed');assert.equal(host.status(s.id).reconciliationReads,i+1)}
  const before=f.r.status(s.id);assert.throws(()=>f.open().reserveReconciliation(s.id),/budget exhausted/);assert.deepEqual(f.r.status(s.id),before);
  assert.equal(before.openEffects[0].id,e.id);assert.equal(before.deadline,s.deadline);assert.equal(before.stopReason,'deadline-exhausted');assert.equal(f.receiver.calls(),1);
  // A new Session has no right to charge its cleanup allowance against the old effect.
  const current=f.r.start(target,config);assert.throws(()=>f.r.reserveReconciliation(current.id),/own pending/);assert.equal(f.r.status(current.id).reconciliationReads,0);
  assert.throws(()=>f.r.reserveReconciliation(s.id),/budget exhausted/);
  const g=fixture(t,{clock:()=>now}),pending=ready(g);g.r.stop(pending.s.id,'cancelled');
  const active=g.r.start(target,config);assert.throws(()=>g.r.reserveReconciliation(pending.s.id),/another Session/);assert.equal(g.r.status(pending.s.id).reconciliationReads,0);assert.equal(g.r.status(active.id).stopReason,null);
});

test('cleanup preserves cancelled history and actual overspend; invalid or foreign receipts roll back',async t=>{
  const f=fixture(t),{s,e}=ready(f);f.r.claimDispatch(e.id);f.r.stop(s.id,'cancelled');const token=f.r.reserveReconciliation(s.id);
  const receipt={attemptId:e.id,outcome:'occurred',remoteClosed:true,spent:120,source:'reviewed original terminal state'};
  const foreign=fixture(t),foreignEffect=ready(foreign).e;
  const before=f.r.status(s.id);assert.throws(()=>f.r.reconcile(s.id,[{...receipt,attemptId:foreignEffect.id}],{reservation:token}),/Effect not found/);assert.deepEqual(f.r.status(s.id),before);
  const done=f.r.reconcile(s.id,[receipt],{reservation:token});assert.equal(done.stopReason,'cancelled');assert.equal(done.spent,120);assert.equal(done.machine.value,'halted');
  assert.equal(require('../../../scripts/lib/game-goal.cjs').view(done).budget.actualSpendExceeded,true);
  const g=fixture(t),prepared=ready(g);g.r.stop(prepared.s.id,'cancelled');const reservation=g.r.reserveReconciliation(prepared.s.id),original=g.r.status(prepared.s.id);
  assert.throws(()=>g.r.reconcile(prepared.s.id,[{...receipt,attemptId:prepared.e.id}],{reservation}),/cannot have occurred/);assert.deepEqual(g.r.status(prepared.s.id),original);
  const closed=g.r.reconcile(prepared.s.id,[],{reservation});assert.equal(closed.openEffects.length,0);assert.equal(closed.spent,0);assert.equal(g.r.effect(prepared.e.id).result.outcome,'not-occurred');
});
test('atomic Proposal acceptance rejects stale, duplicate, reordered and untrusted updates',t=>{
  const f=fixture(t),{s,p}=decision(f);const before=f.r.status(s.id);
  for(const bad of [{...p,epoch:p.epoch-1},{...p,requestId:'old'},{...p,planRevision:5},{...p,memoryRevision:8},{...p,bindingGeneration:99},{...p,permissions:{deleteExistingSave:true}},{...p,actionRef:'delete-save'},{...p,beliefs:[{claim:'Invented current truth',sourceEpoch:0}]}]){
    assert.throws(()=>f.r.propose(s.id,bad));assert.deepEqual(f.r.status(s.id),before);
  }
  const accepted=f.r.propose(s.id,p);assert.equal(accepted.memoryRevision,1);assert.equal(accepted.replans,1);
  assert.throws(()=>f.r.propose(s.id,p));assert.deepEqual(f.r.status(s.id).beliefs,p.beliefs.map(v=>({...v,needsReview:false})));
});
test('restart restores cognition/budget, invalidates old decisions and never dispatches',t=>{
  const f=fixture(t),{s,p}=decision(f);f.r.propose(s.id,p);const r=f.open();const resumed=r.resume(s.id);
  assert.equal(resumed.planRevision,1);assert.equal(resumed.replans,1);assert.equal(resumed.deadline,s.deadline);assert.equal(f.receiver.calls(),0);assert.throws(()=>r.propose(s.id,p));
  const next=r.observe(s.id,f.receiver.observe());assert.equal(next.decision.plan[0],'Buy once');assert.equal(next.decision.memoryRevision,2);assert.equal(next.decision.beliefs[0].needsReview,true);assert.notEqual(next.decision.bindingGeneration,p.bindingGeneration);
});
test('event stack survives independent hosts, same-scene invalidation and atomic return planning',t=>{
 const f=fixture(t),{s,p}=decision(f),event={id:'detour',description:'Resolve the current ordinary event',sourceEpoch:s.epoch,returnTo:'purchase'};
 const cognitive={subgoals:[{id:'purchase',description:'Buy a matching cap',status:'active',sourceEpoch:s.epoch}],events:[event]};
 f.r.propose(s.id,{...p,cognition:cognitive});const second=f.open();second.resume(s.id);
 let d=second.observe(s.id,f.receiver.observe()).decision;
 assert.equal(d.cognition.events.at(-1).id,'detour');assert.equal(d.cognition.events[0].needsReview,true);assert.equal(d.cognition.subgoals[0].needsReview,true);assert.equal(f.receiver.calls(),0);
 // A legacy Proposal omits cognition and must preserve the return pointer.
 second.propose(s.id,proposal(d));d=second.observe(s.id,f.receiver.observe()).decision;
 assert.equal(d.cognition.events[0].returnTo,'purchase');assert.equal(d.beliefs[0].needsReview,true);
 const before=second.status(s.id),base=proposal(d);
 for(const cognition of [{subgoals:[],events:[{...event,sourceEpoch:d.epoch}]},{...cognitive,events:[event,event]},{subgoals:[{...cognitive.subgoals[0],description:'Changed old claim'}],events:[event]},{subgoals:[{...d.cognition.subgoals[0],needsReview:false}],events:d.cognition.events}, {subgoals:Array.from({length:9},(_,i)=>({id:'g'+i,description:'g',status:'active',sourceEpoch:d.epoch})),events:[]}]){
  assert.throws(()=>second.propose(s.id,{...base,cognition}));assert.deepEqual(second.status(s.id),before);
 }
 for(const bad of [123,undefined,{toString(){throw Error('Must not coerce an id')}}]){
  assert.throws(()=>second.propose(s.id,{...base,cognition:{subgoals:[{...cognitive.subgoals[0],id:bad,sourceEpoch:d.epoch}],events:[]}}));
  assert.throws(()=>second.propose(s.id,{...base,cognition:{subgoals:[],events:[{...event,id:'typed',sourceEpoch:d.epoch,returnTo:bad}]}}));
  assert.deepEqual(second.status(s.id),before);
 }
 second.propose(s.id,{...base,plan:['Resume the original purchase goal'],cognition:{subgoals:d.cognition.subgoals,events:[]}});
 const third=f.open();third.resume(s.id);d=third.observe(s.id,f.receiver.observe()).decision;
 assert.equal(d.plan[0],'Resume the original purchase goal');assert.equal(d.cognition.events.length,0);assert.equal(d.cognition.subgoals[0].status,'active');assert.equal(d.cognition.subgoals[0].needsReview,true);assert.equal(f.receiver.calls(),0);
 third.propose(s.id,{...proposal(d),cognition:{subgoals:[],events:[]}});assert.deepEqual(third.status(s.id).cognition,{subgoals:[],events:[]});
});
test('old Session documents load empty event memory; interpreted subgoal success cannot complete a Goal or checkpoint',async t=>{
 const f=fixture(t),{s,p}=decision(f);const raw=f.r.load(s.id);delete raw.cognition;delete raw.memoryNeedsReview;f.r.save(raw);
 assert.deepEqual(f.open().status(s.id).cognition,{subgoals:[],events:[]});
 f.r.propose(s.id,{...p,cognition:{subgoals:[{id:'claimed-done',description:'Host thinks the Goal is done',status:'satisfied',sourceEpoch:s.epoch}],events:[]}});
 const e=f.r.prepare(s.id);await f.r.dispatch(e.id,a=>f.receiver.dispatch(a,{delay:true}));
 const oldPending=f.r.load(s.id);delete oldPending.memoryNeedsReview;f.r.save(oldPending);
 const pending=f.open().status(s.id);assert.equal(pending.beliefs[0].sourceEpoch,pending.epoch);assert.equal(pending.beliefs[0].needsReview,true);
 assert.equal(require('../../../scripts/lib/game-goal.cjs').view(pending).beliefs[0].needsReview,true);
 let next=f.r.observe(s.id,f.receiver.observe());assert.equal(next.goalSatisfied,false);assert.equal(next.machine.value,'reconciling');assert.equal(next.openEffects.length,1);
 const g=fixture(t),development={...config,mode:'development',requiredCheckpoints:['original-return']},ready=decision(g,development);
 g.r.propose(ready.s.id,{...ready.p,cognition:{subgoals:[{id:'home',description:'Claimed home',status:'satisfied',sourceEpoch:ready.s.epoch}],events:[]}});
 next=g.r.observe(ready.s.id,{...g.receiver.observe(),location:'Home'});assert.equal(next.goalSatisfied,true);assert.notEqual(next.machine.value,'completed');assert.equal(next.checkpoints.length,0);
});
test('reservation failure rolls back actions, money and effects before any executor call',t=>{
  const f=fixture(t),{s,p}=decision(f);f.r.propose(s.id,p);const save=f.r.saveEffect;f.r.saveEffect=()=>{throw Error('disk unavailable')};
  assert.throws(()=>f.r.prepare(s.id),/disk/);f.r.saveEffect=save;const actual=f.r.status(s.id);assert.equal(actual.actions,0);assert.equal(actual.reserved,0);assert.equal(actual.openEffects.length,0);assert.equal(f.receiver.calls(),0);
});
test('prepared reservations are atomically abandoned; no attempt can dispatch after closure',async t=>{
  const f=fixture(t),{s,e}=ready(f);const resumed=f.r.resume(s.id),result=observe(f,s.id);
  assert.equal(resumed.machine.value,'reconciling');assert.equal(result.openEffects.length,0);assert.equal(result.reserved,0);assert.equal(result.actions,1);
  await assert.rejects(f.r.dispatch(e.id,a=>f.receiver.dispatch(a)));assert.equal(f.receiver.calls(),0);
});
test('execution binding persists once, is idempotent, and rejects invalid or conflicting data atomically',t=>{
  const f=fixture(t),{e}=ready(f);
  const binding={provider:'native-wardrobe',contract:'head-wear-v1',contextNonce:'123e4567-e89b-42d3-a456-426614174000',requestDigest:'a'.repeat(64)};
  for(const bad of [{...binding,extra:true},{...binding,provider:''},{...binding,contract:'x'.repeat(65)},{...binding,contextNonce:'not-a-uuid'},{...binding,requestDigest:'A'.repeat(64)}]){
    assert.throws(()=>f.r.bindExecution(e.id,bad),/Invalid execution binding/);
    assert.equal(f.r.effect(e.id).executionBinding,undefined);
  }
  assert.deepEqual(f.r.bindExecution(e.id,binding).executionBinding,binding);
  assert.deepEqual(f.r.bindExecution(e.id,{...binding}).executionBinding,binding);
  const before=f.r.effect(e.id);
  assert.throws(()=>f.r.bindExecution(e.id,{...binding,requestDigest:'b'.repeat(64)}),/Conflicting execution binding/);
  assert.deepEqual(f.r.effect(e.id),before);assert.equal(f.receiver.calls(),0);
});
test('execution binding is fenced by claim, pause, epoch, lease and independent Store writers',t=>{
  let now=1000;const f=fixture(t,{clock:()=>now,leaseMs:100}),{s,e}=ready(f),other=f.open();
  const binding={provider:'native-wardrobe',contract:'head-wear-v1',contextNonce:'123e4567-e89b-42d3-a456-426614174000',requestDigest:'a'.repeat(64)};
  f.r.bindExecution(e.id,binding);
  assert.deepEqual(other.bindExecution(e.id,binding).executionBinding,binding);
  assert.throws(()=>other.bindExecution(e.id,{...binding,contract:'other'}),/Conflicting execution binding/);
  assert.deepEqual(f.r.effect(e.id).executionBinding,binding);
  f.r.claimDispatch(e.id);assert.throws(()=>other.bindExecution(e.id,binding),/Attempt no longer bindable/);
  const second=fixture(t,{clock:()=>now,leaseMs:100}),{s:session,e:prepared}=ready(second);
  second.r.pause(session.id,'review required');assert.throws(()=>second.r.bindExecution(prepared.id,binding),/Attempt no longer bindable/);
  second.r.resume(session.id);assert.throws(()=>second.r.bindExecution(prepared.id,binding),/Attempt no longer bindable/);
  const third=fixture(t,{clock:()=>now,leaseMs:100}),{e:expired}=ready(third);
  now+=101;assert.throws(()=>third.r.bindExecution(expired.id,binding),/lease/);
  const fourth=fixture(t),{s:closedSession,e:settled}=ready(fourth);
  observe(fourth,closedSession.id);assert.throws(()=>fourth.r.bindExecution(settled.id,binding),/Attempt no longer bindable/);
});
test('acknowledged receipt remains pending until original outcome is reconciled',async t=>{
  const f=fixture(t),{s,e}=ready(f);await f.r.dispatch(e.id,a=>f.receiver.dispatch(a));
  assert.equal(f.r.status(s.id).openEffects.length,1);assert.equal(f.r.status(s.id).reserved,40);
  await assert.rejects(f.r.dispatch(e.id,a=>f.receiver.dispatch(a)));const after=observe(f,s.id);
  assert.equal(after.openEffects.length,0);assert.equal(after.spent,40);assert.equal(after.reserved,0);assert.equal(f.receiver.original().count,1);assert.equal(f.receiver.calls(),1);
});
test('Goal true does not clear a remote inflight effect or release its budget',async t=>{
  const f=fixture(t),{s,e}=ready(f);await f.r.dispatch(e.id,a=>f.receiver.dispatch(a,{delay:true}));
  const projected={...f.receiver.observe(),location:'Home'};const still=f.r.observe(s.id,projected,f.receiver.receipts(f.r.status(s.id).openEffects));
  assert.equal(still.goalSatisfied,true);assert.equal(still.machine.value,'reconciling');assert.equal(still.reserved,40);assert.equal(still.openEffects.length,1);
  assert.equal(still.decision,null);f.receiver.complete(e.id);const reconciled=observe(f,s.id);assert.equal(reconciled.spent,40);assert.equal(reconciled.openEffects.length,0);
});
test('cancellation and lease handoff preserve cross-Session blocking of late effects',async t=>{
  let now=1000;const f=fixture(t,{clock:()=>now,leaseMs:100}),{s,e}=ready(f);await f.r.dispatch(e.id,a=>f.receiver.dispatch(a,{delay:true}));
  f.r.stop(s.id);const next=f.r.start(target,config);const blocked=observe(f,next.id);assert.equal(blocked.machine.value,'reconciling');assert.equal(blocked.openEffects[0].sessionId,s.id);assert.equal(blocked.decision,null);
  const falseNegative={attemptId:e.id,outcome:'not-occurred',remoteClosed:false,spent:0,source:'unchanged money and count'};
  assert.equal(f.r.observe(next.id,f.receiver.observe(),[falseNegative]).openEffects.length,1);
  f.receiver.complete(e.id);const cleared=observe(f,next.id);assert.equal(cleared.openEffects.length,0);assert.equal(f.r.status(s.id).spent,40);assert.equal(f.r.status(s.id).stopReason,'cancelled');assert.equal(f.receiver.calls(),1);
});
test('expired lease cannot dispatch; a second active writer cannot claim the same target',async t=>{
  let now=1000;const f=fixture(t,{clock:()=>now,leaseMs:100}),{s,e}=ready(f);const other=f.open();assert.throws(()=>other.start(target,config),/owned/);
  now+=101;await assert.rejects(f.r.dispatch(e.id,a=>f.receiver.dispatch(a)),/lease/);const n=other.start(target,config);assert.equal(n.bindingGeneration,2);assert.equal(other.status(n.id).openEffects.length,1);assert.equal(f.receiver.calls(),0);
});
test('noncanonical Android user aliases cannot bypass an open effect or active lease',async t=>{
  const f=fixture(t),{s,e}=ready(f);await f.r.dispatch(e.id,a=>f.receiver.dispatch(a,{delay:true}));
  for(const userId of ['00','01','0000000000','2147483648'])assert.throws(()=>f.r.start({...target,userId},config),/canonical target/);
  assert.equal(f.r.status(s.id).openEffects.length,1);assert.equal(f.receiver.calls(),1);
});
test('original Session resumes after a successor reconciles its attempt',async t=>{
  let now=1000;const f=fixture(t,{clock:()=>now,leaseMs:100}),{s,e}=ready(f);await f.r.dispatch(e.id,a=>f.receiver.dispatch(a));
  now+=101;const successor=f.r.start(target,config);observe(f,successor.id);assert.equal(f.r.status(s.id).spent,40);assert.equal(f.r.status(s.id).machine.value,'reconciling');
  f.r.stop(successor.id);const resumed=f.r.resume(s.id);assert.equal(resumed.machine.value,'observing');assert.equal(resumed.actions,1);assert.equal(resumed.spent,40);assert.equal(resumed.deadline,s.deadline);
  const next=observe(f,s.id);assert.ok(next.decision);assert.equal(f.receiver.calls(),1);
});
test('fresh original receiver guard prevents executing a stale semantic action',async t=>{
  const f=fixture(t),{s,e}=ready(f);f.receiver.db.prepare('UPDATE world SET revision=revision+1 WHERE id=1').run();
  const ack=await f.r.dispatch(e.id,a=>f.receiver.dispatch(a));assert.equal(ack.ack.dispatch,'not-dispatched');const result=observe(f,s.id);assert.equal(result.openEffects.length,0);assert.equal(result.spent,0);assert.equal(result.actions,1);assert.equal(f.receiver.original().count,0);
});
test('last allowed plan/action can complete; deadline and parent budgets never reset',async t=>{
  let now=1000;const f=fixture(t,{clock:()=>now,location:'Bedroom',leaseMs:120000});const c={...config,goal:{description:'Reach street',location:'Street'},budget:{...config.budget,maxActions:1,maxReplans:1}};
  const {s,p}=decision(f,c);f.r.propose(s.id,{...p,actionRef:'go-street'});const e=f.r.prepare(s.id);assert.ok(e);await f.r.dispatch(e.id,a=>f.receiver.dispatch(a));const complete=observe(f,s.id);assert.equal(complete.machine.value,'completed');assert.equal(complete.actions,1);assert.equal(complete.replans,1);
  const next=f.r.start(target,config);now=next.deadline;const halted=observe(f,next.id);assert.equal(halted.machine.value,'halted');assert.equal(halted.decision,null);const resumed=f.r.resume(next.id);assert.equal(resumed.deadline,next.deadline);assert.equal(resumed.stopReason,'budget-exhausted');
});
test('repeated no-effect decisions end at parent hard caps without an implicit new budget',async t=>{
  const f=fixture(t),c={...config,budget:{...config.budget,maxActions:2,maxReplans:2}},s=f.r.start(target,c);let observed=observe(f,s.id);
  for(let i=0;i<2;i++){f.r.propose(s.id,proposal(observed.decision));const e=f.r.prepare(s.id);await f.r.dispatch(e.id,a=>f.receiver.dispatch(a,{delay:true}));f.receiver.cancelRemote(e.id);observed=observe(f,s.id)}
  assert.equal(observed.machine.value,'halted');assert.equal(observed.stopReason,'budget-exhausted');assert.equal(observed.actions,2);assert.equal(observed.replans,2);assert.equal(observed.decision,null);assert.equal(observed.spent,0);
  const resumed=f.r.resume(s.id);assert.equal(resumed.actions,2);assert.equal(resumed.deadline,s.deadline);assert.equal(resumed.stopReason,'budget-exhausted');
});
test('completed Session is an immutable historical result and cannot reacquire a target',t=>{
  const f=fixture(t),s=f.r.start(target,{...config,goal:{description:'Already at the shop',location:'Shop'}});const complete=observe(f,s.id);assert.equal(complete.machine.value,'completed');
  assert.throws(()=>f.r.resume(s.id),/Closed Session/);assert.throws(()=>f.r.observe(s.id,{...f.receiver.observe(),location:'Home'}),/Closed Session/);assert.throws(()=>f.r.stop(s.id),/Closed Session/);
  assert.equal(f.r.status(s.id).goalSatisfied,true);assert.ok(f.r.start(target,config));
});
test('unavailable and dangerous actions cannot be smuggled into a valid scene',t=>{
  const f=fixture(t),s=f.r.start(target,config);for(const bad of [{...f.receiver.observe(),choices:[{ref:'delete',kind:'buy',cost:0,risk:'delete-existing-save',destination:'Home'}]},{...f.receiver.observe(),javascript:'window.deleteSave()'}])assert.throws(()=>f.r.observe(s.id,bad));
  assert.equal(f.r.status(s.id).observations,0);assert.equal(f.receiver.calls(),0);
});
test('required budget fields and target types cannot be omitted/coerced',t=>{
  const f=fixture(t);for(const name of Object.keys(config.budget)){const b={...config.budget};delete b[name];assert.throws(()=>f.r.start(target,{...config,budget:b}),/budget/)}
  assert.throws(()=>f.r.start({...target,userId:0},config),/target/);assert.equal(f.receiver.calls(),0);
});
test('unsupported Store/Session version fails without automatic migration',t=>{
  const f=fixture(t),{s}=decision(f);const original=f.r.load(s.id);f.r.save({...original,version:999});assert.throws(()=>f.r.resume(s.id),/Session/);f.r.save(original);
  f.r.db.exec('PRAGMA user_version=999');assert.throws(()=>new Runtime(path.join(f.dir,'sessions.sqlite')),/schema/);assert.equal(f.r.db.prepare('PRAGMA user_version').get().user_version,999);
});
test('stable XState invocation restoration restarts work; production dispatch is outside invocation',async t=>{
  let calls=0;const risky=createMachine({initial:'working',states:{working:{invoke:{src:fromPromise(()=>{calls++;return new Promise(()=>{})})}}}});
  const a=createActor(risky).start();await new Promise(resolve=>setImmediate(resolve));const snap=JSON.parse(JSON.stringify(a.getPersistedSnapshot()));a.stop();const b=createActor(risky,{snapshot:snap}).start();await new Promise(resolve=>setImmediate(resolve));b.stop();assert.equal(calls,2);
  const safe=createActor(machine).start();safe.send({type:'PENDING'});const saved=JSON.parse(JSON.stringify(safe.getPersistedSnapshot()));safe.stop();const restored=createActor(machine,{snapshot:saved}).start();assert.equal(restored.getSnapshot().value,'reconciling');assert.deepEqual(saved.children,{});restored.stop();
});
for(const crash of ['before-mark','after-mark','after-remote'])test(`actual process death at ${crash} preserves reconciliation and does not replay`,t=>{
  const f=fixture(t,{location:'Bedroom'}),s=f.r.start(target,{...config,goal:{description:'Reach shop',location:'Shop'}});const observed=f.r.observe(s.id,f.receiver.observe());const p=proposal(observed.decision,'go-street');const file=path.join(f.dir,'proposal.json');fs.writeFileSync(file,JSON.stringify(p));
  const cli=path.resolve(__dirname,'../cli.cjs');const run=(...args)=>spawnSync(process.execPath,[...process.execArgv.filter(v=>v==='--experimental-sqlite'),cli,...args],{encoding:'utf8'});
  assert.equal(run('propose',f.dir,s.id,file).status,0);const died=run('dispatch',f.dir,s.id,'-',crash);assert.equal(died.status,79,died.stderr);
  const resumed=run('resume',f.dir,s.id);assert.equal(resumed.status,0,resumed.stderr);const status=JSON.parse(resumed.stdout).result;assert.equal(status.actions,1);assert.equal(f.receiver.calls(),crash==='after-remote'?1:0);
  const read=run('observe',f.dir,s.id);assert.equal(read.status,0,read.stderr);const after=JSON.parse(read.stdout).result;
  if(crash==='after-mark'){assert.equal(after.machine.value,'reconciling');assert.equal(after.openEffects.length,1)}else assert.equal(after.openEffects.length,0);
  assert.equal(f.receiver.calls(),crash==='after-remote'?1:0);
});


test('deferred claim is fenced after prepared closure and never sends a late request',async t=>{
  const f=fixture(t),{s,e}=ready(f);let release,calls=0;
  const work=f.r.dispatch(e.id,async(attempt,claim)=>{await new Promise(resolve=>release=resolve);claim();calls++;return f.receiver.dispatch(attempt)},{deferred:true});
  observe(f,s.id);release();await work;assert.equal(calls,0);assert.equal(f.r.effect(e.id).status,'settled');assert.equal(f.r.status(s.id).reserved,0);
});

test('unclaimed deferred executor failure remains authoritatively not dispatched',async t=>{
  const f=fixture(t),{s,e}=ready(f);const ack=await f.r.dispatch(e.id,async()=>{throw Error('preflight failed')},{deferred:true});
  assert.equal(ack.status,'prepared');assert.equal(ack.ack.dispatch,'not-dispatched');assert.equal(observe(f,s.id).openEffects.length,0);assert.equal(f.receiver.calls(),0);
});


test('a deferred caller without the claim cannot downgrade the winner or publish a stale preflight ack',async t=>{
  const f=fixture(t),{s,e}=ready(f);let release;
  const losing=f.r.dispatch(e.id,async()=>{await new Promise(resolve=>release=resolve);throw Error('failed independent preflight')},{deferred:true});
  await f.r.dispatch(e.id,async(attempt,claim)=>{claim();return f.receiver.dispatch(attempt,{delay:true})},{deferred:true});
  release();await losing;assert.equal(f.r.effect(e.id).status,'acknowledged');assert.equal(f.r.effect(e.id).ack.dispatch,'acknowledged');
  const pending=observe(f,s.id);assert.equal(pending.openEffects.length,1);assert.equal(pending.reserved,40);assert.equal(f.receiver.calls(),1);
});


test('pause fences a prepared attempt; resume never replays it or restores the old decision',async t=>{
  const f=fixture(t),{s,e}=ready(f);f.r.pause(s.id,'original observation lost');let calls=0;
  await f.r.dispatch(e.id,async(attempt,claim)=>{claim();calls++;return f.receiver.dispatch(attempt)},{deferred:true});
  assert.equal(calls,0);assert.equal(f.receiver.calls(),0);assert.equal(f.r.status(s.id).machine.value,'paused');
  f.r.resume(s.id);assert.equal(observe(f,s.id).openEffects.length,0);await assert.rejects(f.r.dispatch(e.id,a=>f.receiver.dispatch(a)));assert.equal(f.receiver.calls(),0);
});


test('observation reservation is charged once and host resume fences late responses',t=>{
  const f=fixture(t),s=f.r.start(target,config),old=f.r.reserveObservation(s.id);
  assert.equal(f.r.status(s.id).observations,1);f.r.resume(s.id);
  assert.throws(()=>f.r.observe(s.id,f.receiver.observe(),[],{reservation:old}),/Stale observation/);
  assert.throws(()=>f.r.failObservation(s.id,old,'old failure'),/Stale observation/);
  const next=f.r.reserveObservation(s.id);const fresh=f.r.observe(s.id,f.receiver.observe(),[],{reservation:next});assert.equal(fresh.observations,2);
});

test('goal distance progress is conservative and settlement accounting stays atomic',async t=>{
  const hash=v=>require('node:crypto').createHash('sha256').update(JSON.stringify(v)).digest('hex');
  for(const [before,after,expected] of [
    [[4,2],[3,2],true],[[4,2],[4,2],false],[[4,2],[5,2],false],[[4,2],[3,3],false],
    [[4,2],undefined,false],[undefined,[3,2],false],[[4,2],[3],false],[undefined,undefined,true],
  ]){
    const f=fixture(t);let distances=before,phase=0;
    f.r.provider={...f.r.provider,trace:()=>({key:hash('scene'),progress:hash(phase),description:'native activity',...(distances===undefined?{}:{distances})})};
    const {s,e}=ready(f);assert.equal(e.reservedSpend,40);
    await f.r.dispatch(e.id,a=>f.receiver.dispatch(a));distances=after;phase++;
    const settled=observe(f,s.id);
    assert.equal(settled.routes.at(-1).progressed,expected);
    assert.equal(settled.spent,40);assert.equal(settled.reserved,0);assert.equal(settled.actions,1);
    assert.equal(settled.deadline,s.deadline);assert.equal(settled.openEffects.length,0);
  }
});

test('invalid distance traces reject sparse/nonfinite data and roll back pending settlement',async t=>{
  const f=fixture(t);let distances=[4,2];
  f.r.provider={...f.r.provider,trace:()=>({key:'a'.repeat(64),progress:'b'.repeat(64),description:'native activity',distances})};
  const {s,e}=ready(f);await f.r.dispatch(e.id,a=>f.receiver.dispatch(a));
  const before=f.r.status(s.id),effect=f.r.effect(e.id);
  for(const malformed of [[],Array(2),[4,,2],[-1],[NaN],[Infinity],['0'],[null],Array(10).fill(0)]){
    distances=malformed;assert.throws(()=>observe(f,s.id),/Invalid reviewed progress trace/);
    assert.deepEqual(f.r.status(s.id),before);assert.deepEqual(f.r.effect(e.id),effect);
  }
  distances=[3,2];f.r.saveEffect({...effect,trace:{...effect.trace,distances:[null]}});
  const malformedEffect=f.r.effect(e.id);
  assert.throws(()=>observe(f,s.id),/Invalid reviewed progress trace/);
  assert.deepEqual(f.r.status(s.id).openEffects,[malformedEffect]);assert.equal(f.r.status(s.id).spent,0);assert.equal(f.r.status(s.id).reserved,40);
  f.r.saveEffect(effect);const done=observe(f,s.id);assert.equal(done.spent,40);assert.equal(done.reserved,0);assert.equal(done.routes.at(-1).progressed,true);
});
