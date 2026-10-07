const {test}=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const goal=require('../scripts/lib/game-goal.cjs');
function fixture(t,config={}) {
  // This coordinator fixture has a toy synchronous receiver, not a real DoL
  // link/Engine/profile. Its explicit local Outcome hook owns that test path.
  const native=require('../scripts/lib/game-native-provider.cjs');
  if(native.prepare){t.mock.method(native,'prepare');native.prepare=undefined;}
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'dol-goal-'));
  t.after(()=>{assert.ok(path.resolve(base).startsWith(path.resolve(os.tmpdir())+path.sep));fs.rmSync(base,{recursive:true,force:true})});
  const state={passage:'Bedroom',turns:1,variables:{location:'home',timeStamp:100,worn:{head:{variable:'naked',colour:null}}}};
  Object.defineProperty(state.variables,'wardrobe',{get(){if(config.purchaseInventory)return{head:config.purchaseInventory};throw Error('Full inventory must not be read by Goal coordinator')}});
  let clicks=0,forward=false,lost=false,user='0',evaluations=0,quoted=false;
  class Element {
    isConnected=true;tagName='A';textContent='normal game choice';
    getAttribute(name){return name==='data-passage'?this===root?state.passage:'Wardrobe':name==='href'?null:name==='aria-label'?this.textContent:null}
    getBoundingClientRect(){return{left:1,top:1,width:100,height:30}}
    getClientRects(){return[1]} contains(n){return n===this||(this.children||[]).some(child=>child.contains(n))}
    querySelectorAll(){return config.hideChoice?[]:[node]} querySelector(){return null}
    closest(selector){if(selector==='[inert]'||selector==='form')return null;if(selector.includes('.buy-button'))return quoted?root:null;if(selector.includes('#saves'))return config.save?root:null;return selector.includes('#passages')?root:null}
    matches(selector){if(selector.startsWith(':disabled'))return false;return !!config.save && selector.includes('.deleteButton')}
    click(){clicks++;state.passage=config.routes?.shift()||'Wardrobe';state.turns++;state.variables.timeStamp++;if(config.equip)state.variables.worn.head={variable:'test_cap',colour:'black'}}
  }
  const root=new Element(),node=new Element(),html={children:[root],classList:{contains:()=>false}};root.tagName='DIV';root.parentElement=html;root.children=[node];node.parentElement=root;node.children=[];
  const globals={window:{SugarCube:{State:state}},HTMLElement:Element,innerWidth:400,innerHeight:700,
    getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1',pointerEvents:'auto'}),
    document:{documentElement:html,querySelector:()=>root,
      querySelectorAll:s=>s.startsWith('html > ')?[node]:s==='#passages > .passage'?[root]:s.includes('data-passage="Wardrobe"')?(state.passage==='Bedroom'?[node]:[]):s==='#choice'?[node]:[],elementFromPoint:()=>node}};
  if(config.progressingNarrative)globals.document.createTreeWalker=()=>{let read=false;return{nextNode:()=>read?null:(read=true,{parentElement:root,textContent:'Ordinary conversation stage '+clicks})}};
  const adb=async(...args)=>{
    const c=args.join(' ');
    if(c==='get-state')return Buffer.from('device');
    if(c==='shell am get-current-user')return Buffer.from(user);
    if(c.startsWith('shell dumpsys package'))return Buffer.from(`Package [com.example.game]\nversionName=1.0 versionCode=1\n User ${user}: installed=true`);
    if(c.includes('dumpsys activity'))return Buffer.from(`mResumedActivity: ActivityRecord{ u${user} com.example.game/.Main }`);
    if(c.includes('dumpsys window displays'))return Buffer.from(`mCurrentFocus=Window{ u${user} com.example.game/.Main }`);
    if(c==='shell pidof com.example.game')return Buffer.from('123');
    if(c==='shell cat /proc/net/unix')return Buffer.from('@webview_devtools_remote_123');
    if(c==='forward tcp:0 localabstract:webview_devtools_remote_123'){forward=true;return Buffer.from('55555')}
    if(c==='forward --list')return Buffer.from(forward?'test-device tcp:55555 localabstract:webview_devtools_remote_123\n':'');
    if(c==='forward --remove tcp:55555')forward=false;
    return Buffer.alloc(0);
  };
  const connect=async()=>({close(){},isOpen:()=>true,
    async evaluate(expression){evaluations++;return vm.runInNewContext(expression,globals)},
    async send(method,params){
      if(method==='Runtime.evaluate')return{result:{objectId:'node'}};
      if(method!=='Runtime.callFunctionOn')return{};
      if(config.commerceDrift&&params.functionDeclaration.includes('const observedRoot'))quoted=true;
      const result=vm.runInNewContext(`(${params.functionDeclaration})`,globals).call(node);
      if(config.nativeAckLost&&result?.receipt&&!lost){lost=true;throw Error('Native acknowledgement lost')}
      if(config.nativeContextLost&&result?.receipt&&!lost){lost=true;globals.window={SugarCube:globals.window.SugarCube}}
      if(config.userDrift && !params.functionDeclaration.includes('observedRoot'))user='1';
      if(config.disconnect && clicks && !lost){lost=true;throw Error('Acknowledgement lost')}
      return{result:{value:result}};
    }});
  const file=path.join(base,'action.json');fs.writeFileSync(file,JSON.stringify({type:'web-click',selector:'#choice'}));
  // Explicit reviewed local receiver hook; returning no proof deliberately
  // exercises unknown/pending without claiming that the mock click is terminal.
  return{base,file,state,globals,options:{serial:'test-device',package:'com.example.game',out:path.join(base,'goal'),store:path.join(base,'sessions.sqlite'),testEnvironment:true},overrides:{adb,connect,readOutcome:async()=>[]},
    stats:()=>({clicks,forward,evaluations}),request:{name:'wardrobe',mode:'gameplay',goal:{kind:'reach-passage',passage:'Wardrobe'},budget:{timeoutMs:60000,maxActions:8,maxObservations:20}}};
}
const step=f=>({testEnvironment:true,file:f.file,intent:'navigation'});

test('original task description survives the CLI adapter, stored request and rebind with unchanged predicate and budget',async t=>{
  const f=fixture(t);f.request.description='通过原生游戏入口前往目标地点，普通偏航自行处理，保持原预算。';
  const first=await goal.start(f.options,f.request,f.overrides);
  assert.equal(first.decision.goal.description,f.request.description);
  assert.equal(first.decision.goal.passage,f.request.goal.passage);
  const next=await goal.session(f.options.out,'resume',{testEnvironment:true},f.overrides);
  assert.equal(next.decision.goal.description,f.request.description);
  assert.equal(next.decision.goal.passage,f.request.goal.passage);
  assert.equal(next.budget.deadline,first.budget.deadline);assert.equal(next.budget.maxSpend,first.budget.maxSpend);
  assert.equal(next.actions,0);assert.equal(f.stats().clicks,0);
});

test('a current native control without a declared Outcome path pauses before reservation or click',async t=>{
  const f=fixture(t);delete f.overrides.readOutcome;
  const current=await goal.start(f.options,f.request,f.overrides),d=current.decision;
  const p={...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:d.scene.choices[0].ref,reason:'Choose current native control',plan:[],beliefs:[]};
  const file=path.join(f.base,'proposal.json');fs.writeFileSync(file,JSON.stringify(p));
  await goal.session(f.options.out,'propose',{testEnvironment:true,file},f.overrides);
  const before=goal.status(f.options.out),reads=f.stats().evaluations;
  const result=await goal.session(f.options.out,'dispatch',{testEnvironment:true},f.overrides),after=goal.status(f.options.out);
  assert.equal(result.reason,'reviewed-action-outcome-unavailable');assert.equal(result.phase,'paused');assert.equal(result.pending,false);
  assert.equal(after.actions,before.actions);assert.equal(after.observations,before.observations);assert.equal(after.reserved,before.reserved);assert.equal(after.deadline,before.deadline);
  assert.equal(after.proposal,null);assert.equal(f.stats().clicks,0);assert.equal(f.stats().evaluations,reads);
});

test('cleanup API charges failed reads before I/O across new hosts and never dispatches or renews the deadline',async t=>{
  let now=Date.now();const f=fixture(t);f.overrides.runtime={clock:()=>now};await goal.start(f.options,f.request,f.overrides);
  await goal.advance(f.options.out,step(f),f.overrides);const before=goal.status(f.options.out);assert.equal(before.openEffects.length,1);now=before.deadline+1;
  let reads=0;t.mock.method(require('../scripts/lib/game-dol-provider.cjs'),'observe',async()=>{reads++;assert.equal(goal.status(f.options.out).reconciliationReads,reads);throw Error('Reader unavailable')});
  for(let i=0;i<8;i++){const state=await goal.session(f.options.out,'reconcile',{testEnvironment:true},f.overrides);assert.equal(state.status,'exhausted');assert.equal(state.pending,true);assert.equal(state.reconciliation.reads,i+1)}
  await assert.rejects(goal.session(f.options.out,'reconcile',{testEnvironment:true},f.overrides),/budget exhausted/);
  const after=goal.status(f.options.out);assert.equal(reads,8);assert.equal(after.deadline,before.deadline);assert.equal(after.observations,before.observations);assert.equal(after.actions,before.actions);assert.equal(f.stats().clicks,1);assert.equal(after.reconciliationError,'reviewed-reconciliation-read-or-result-failed');
});

test('cleanup API accepts only reviewed terminal receipts and leaves an expired satisfied Goal stopped',async t=>{
  let now=Date.now();const f=fixture(t);f.overrides.runtime={clock:()=>now};await goal.start(f.options,f.request,f.overrides);await goal.advance(f.options.out,step(f),f.overrides);
  const before=goal.status(f.options.out);assert.equal(before.goalSatisfied,true);assert.equal(before.openEffects.length,1);now=before.deadline+1;
  t.mock.method(require('../scripts/lib/game-receipts.cjs'),'recover',async()=>[]);
  t.mock.method(require('../scripts/lib/game-dol-provider.cjs'),'observe',async(options,overrides)=>{assert.equal(overrides.probeGoal,undefined);assert.equal(options.timeoutMs,30000);return {status:'observed',gameplay:{domAgrees:true},effectReceipts:await overrides.probeOutcome({})}});
  f.overrides.reconcileOutcome=async(client,effects)=>effects.map(e=>({attemptId:e.id,outcome:'occurred',remoteClosed:true,spent:0,source:'reviewed fixture synchronous terminal result'}));
  const result=await goal.session(f.options.out,'reconcile',{testEnvironment:true},f.overrides);assert.equal(result.status,'exhausted');assert.equal(result.pending,false);assert.equal(result.phase,'halted');assert.equal(f.stats().clicks,1);
  assert.equal(goal.status(f.options.out).deadline,before.deadline);assert.equal(goal.status(f.options.out).actions,before.actions);
});

test('cleanup reader shares the bounded transport and rejects a late terminal result',async t=>{
  let now=Date.now();const f=fixture(t);f.overrides.runtime={clock:()=>now};await goal.start(f.options,f.request,f.overrides);await goal.advance(f.options.out,step(f),f.overrides);
  now=goal.status(f.options.out).deadline+1;let wall=Date.now(),closed=false;
  t.mock.method(Date,'now',()=>wall);t.mock.method(require('../scripts/lib/game-receipts.cjs'),'recover',async()=>[]);
  const client={};t.mock.method(require('../scripts/lib/game-dol-provider.cjs'),'observe',async(options,overrides)=>{try{return{status:'observed',gameplay:{domAgrees:true},effectReceipts:await overrides.probeOutcome(client)}}finally{closed=true}});
  f.overrides.reconcileOutcome=async(actual,effects)=>{assert.equal(actual,client);wall+=30001;return effects.map(e=>({attemptId:e.id,outcome:'occurred',remoteClosed:true,spent:0,source:'late result'}))};
  const result=await goal.session(f.options.out,'reconcile',{testEnvironment:true},f.overrides);assert.equal(result.pending,true);assert.equal(result.reconciliation.reads,1);assert.equal(closed,true);assert.equal(f.stats().clicks,1);
});

test('a non-returning cleanup hook times out, releases its transport and retains the pending effect',async t=>{
  let now=Date.now();const f=fixture(t);f.overrides.runtime={clock:()=>now};await goal.start(f.options,f.request,f.overrides);await goal.advance(f.options.out,step(f),f.overrides);
  now=goal.status(f.options.out).deadline+1;t.mock.timers.enable({apis:['setTimeout','Date'],now:Date.now()});
  let entered,closed=false;const started=new Promise(resolve=>{entered=resolve});
  t.mock.method(require('../scripts/lib/game-receipts.cjs'),'recover',async()=>[]);
  t.mock.method(require('../scripts/lib/game-dol-provider.cjs'),'observe',async(options,overrides)=>{try{return{status:'observed',gameplay:{domAgrees:true},effectReceipts:await overrides.probeOutcome({})}}finally{closed=true}});
  f.overrides.reconcileOutcome=()=>{entered();return new Promise(()=>{})};
  const pending=goal.session(f.options.out,'reconcile',{testEnvironment:true},f.overrides);await started;t.mock.timers.tick(30001);
  const result=await pending;assert.equal(result.pending,true);assert.equal(result.phase,'halted');assert.equal(result.reconciliation.reads,1);assert.equal(closed,true);assert.equal(f.stats().clicks,1);
});

// This fixture has only immediate synchronous effects; the receipt provider is local reviewed test code.
function terminal(f){f.overrides.readOutcome=async effects=>effects.filter(e=>e.ack?.dispatch==='acknowledged').map(e=>({attemptId:e.id,outcome:'occurred',remoteClosed:true,spent:0,source:'reviewed fixture synchronous handler and original receiver state'}));return f}

test('shared Runtime spans normal events and completes from original state with terminal proof',async t=>{
  const f=terminal(fixture(t,{routes:['Rent Event','Bedroom','Wardrobe']}));assert.equal((await goal.start(f.options,f.request,f.overrides)).status,'active');
  for(const intent of ['navigation','dialogue','navigation']){const r=await goal.advance(f.options.out,{...step(f),intent},f.overrides);assert.equal(r.status,f.state.passage==='Wardrobe'?'completed':'active');assert.equal(r.pending,false)}
  const s=goal.status(f.options.out);assert.equal(s.actions,3);assert.equal(s.machine.value,'completed');assert.equal(s.scene.goalProof.satisfied,true);assert.equal(f.stats().forward,false);
  await goal.advance(f.options.out,step(f),f.overrides);assert.equal(f.stats().clicks,3);
});

test('ack and Goal true never clear unknown outcome; model reconciliation is rejected',async t=>{
  for(const disconnect of [false,true]){
    const f=fixture(t,{disconnect});await goal.start(f.options,f.request,f.overrides);
    const r=await goal.advance(f.options.out,step(f),f.overrides);assert.equal(r.proof.satisfied,true);assert.equal(r.pending,true);assert.equal(r.phase,'reconciling');assert.equal(f.stats().clicks,1);
    const again=await goal.advance(f.options.out,step(f),f.overrides);assert.equal(again.proof.satisfied,true);assert.equal(again.pending,true);assert.equal(f.stats().clicks,1);
    await assert.rejects(goal.advance(f.options.out,{...step(f),reconcile:'occurred',evidence:f.file},f.overrides),/Model interpretation/);
  }
});

test('preflight failure closes unclaimed reservation, preserves budgets and allows replanning',async t=>{
  const f=fixture(t);await goal.start(f.options,f.request,f.overrides);
  fs.writeFileSync(f.file,JSON.stringify({type:'sw-wardrobe',operation:'select-slot',slot:'head'}));
  const r=await goal.advance(f.options.out,{testEnvironment:true,file:f.file,intent:'menu'},f.overrides);
  assert.equal(r.status,'active');assert.equal(r.pending,false);assert.equal(r.actions,1);assert.equal(f.stats().clicks,0);assert.equal(goal.status(f.options.out).reserved,0);
});

test('original equip predicate reads requested slot; failed development checkpoint survives resume and true Goal',async t=>{
  const f=terminal(fixture(t,{equip:true}));f.request.goal={kind:'equip',slot:'head',variable:'test_cap',colour:'black'};
  assert.equal((await goal.start(f.options,f.request,f.overrides)).proof.satisfied,false);
  const done=await goal.advance(f.options.out,{...step(f),intent:'equip'},f.overrides);assert.equal(done.status,'completed');assert.equal(done.proof.source,'original SugarCube worn slot fields');
  const g=fixture(t);g.request.mode='development';await goal.start(g.options,g.request,g.overrides);
  const {Runtime}=require('../scripts/lib/game-runtime.cjs'),s=goal.status(g.options.out),r=new Runtime(g.options.store,{provider:goal.provider});
  try{r.checkpoint(s.id,{name:'starting-contract',passed:false,source:'required original DOM assertion failed'});r.resume(s.id);const after=r.status(s.id);assert.equal(after.stopReason,'checkpoint-failed');assert.equal(after.checkpoints[0].passed,false)}finally{r.close()}
  g.state.passage='Wardrobe';assert.equal((await goal.advance(g.options.out,{testEnvironment:true},g.overrides)).status,'failed');assert.equal(g.stats().clicks,0);
});

test('hard save boundary and strict selection inputs remain active under shared dispatch',async t=>{
  const f=fixture(t,{save:true});await goal.start(f.options,f.request,f.overrides);
  const r=await goal.advance(f.options.out,step(f),f.overrides);assert.equal(r.status,'paused');assert.equal(r.pending,false);assert.equal(r.reason,'save-write-or-destruction');assert.equal(f.stats().clicks,0);
  await assert.rejects(goal.advance(f.options.out,{...step(f),intent:'overwrite-save'},f.overrides));await assert.rejects(goal.advance(f.options.out,{testEnvironment:false},f.overrides));
  assert.throws(()=>goal.validate({...f.request,goal:{kind:'delete-save'}}));
});

test('target user drift pauses without a click; observation/action limits use persisted parent budgets',async t=>{
  const f=fixture(t,{userDrift:true});await goal.start(f.options,f.request,f.overrides);
  assert.equal((await goal.advance(f.options.out,step(f),f.overrides)).status,'paused');assert.equal(f.stats().clicks,0);
  const g=terminal(fixture(t,{routes:['Normal Event']}));g.request.budget.maxActions=1;await goal.start(g.options,g.request,g.overrides);const after=await goal.advance(g.options.out,step(g),g.overrides);assert.equal(after.status,'exhausted');assert.equal(after.actions,1);assert.equal(g.stats().clicks,1);
  assert.equal((await goal.advance(g.options.out,step(g),g.overrides)).actions,1);assert.equal(g.stats().clicks,1);
});

test('legacy Foundation journals are read-only and cannot clear shared ledger or run old engine',async t=>{
  const f=fixture(t);fs.mkdirSync(f.options.out);const started=Date.now();
  fs.writeFileSync(path.join(f.options.out,'goal.json'),JSON.stringify({experimental:true,id:'11111111-1111-1111-1111-111111111111',request:f.request,target:{serial:'test-device',package:'com.example.game',userId:'0'},status:'needs-result-interpretation',startedAt:new Date(started).toISOString(),deadline:started+60000,actions:1,observations:2,events:[],pending:{id:'old'}}));
  assert.equal(goal.view(goal.status(f.options.out)).status,'foundation-history');await assert.rejects(goal.advance(f.options.out,step(f),f.overrides),/read-only/);assert.equal(f.stats().clicks,0);
});


test('failed original observations consume persisted budget before reads; resume does not create free retries',async t=>{
  const f=fixture(t);f.request.budget.maxObservations=1;let reads=0;
  t.mock.method(require('../scripts/lib/game-dol-provider.cjs'),'observe',async()=>{reads++;return{status:'failed'}});
  assert.equal((await goal.start(f.options,f.request,f.overrides)).status,'exhausted');
  const s=goal.status(f.options.out);assert.equal(s.observations,1);assert.equal(s.stopReason,'observation-budget-exhausted');
  await goal.advance(f.options.out,{testEnvironment:true,resume:true},f.overrides);await goal.advance(f.options.out,{testEnvironment:true},f.overrides);
  assert.equal(reads,1);assert.equal(goal.status(f.options.out).observations,1);assert.equal(goal.status(f.options.out).deadline,s.deadline);
});

test('a stale unclaimed preflight copy cannot settle a later claimed request',async t=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'dol-preflight-cas-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const {Runtime}=require('../experiments/gold-runtime/runtime.cjs'),{Receiver}=require('../experiments/gold-runtime/fixture.cjs');
  const r=new Runtime(path.join(base,'sessions.sqlite')),receiver=new Receiver(path.join(base,'receiver.sqlite'),{location:'Shop'});
  try{
    const s=r.start({serial:'fixture-device',package:'com.example.fixture',userId:'0'},{mode:'gameplay',goal:{description:'Return Home',location:'Home'},budget:{timeoutMs:60000,maxActions:8,maxObservations:32,maxReplans:16,maxSpend:100}});
    const d=r.observe(s.id,receiver.observe()).decision;r.propose(s.id,{...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:'buy-cap',reason:'reviewed current candidate',plan:[],beliefs:[]});const e=r.prepare(s.id);
    await r.dispatch(e.id,async()=>({dispatch:'not-dispatched'}),{deferred:true});const oldClosing=goal.rejectionReceipts([r.effect(e.id)]);
    await r.dispatch(e.id,async(attempt,claim)=>{claim();return receiver.dispatch(attempt,{delay:true})},{deferred:true});
    const after=r.observe(s.id,receiver.observe(),oldClosing);assert.equal(after.openEffects.length,1);assert.equal(after.reserved,40);assert.equal(receiver.row(e.id).status,'inflight');assert.equal(receiver.calls(),1);
  }finally{receiver.close();r.close()}
});

test('migrated purchase predicate uses exact original variant/count and actual spend, not UI inventory',t=>{
  const f=fixture(t,{purchaseInventory:[{variable:'hairpin',colour:'black',accessory_colour:'black'}]});f.state.variables.money=950;
  const request={kind:'purchase-one',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',baselineMoney:1000,baselineCount:0,unitCost:500,maxSpend:500};
  // Run the unchanged original reader in its real target global scope.
  const expression=`(${goal.goalReader.toString()})(${JSON.stringify(request)})`;
  const source={window:{SugarCube:{State:f.state}},document:{querySelectorAll:()=>[{getAttribute:()=>f.state.passage}]}};
  let proof=vm.runInNewContext(expression,source);assert.equal(proof.satisfied,true);assert.equal(proof.spent,50);assert.equal(proof.priceMatches,false);
  f.state.variables.money=499;proof=vm.runInNewContext(expression,source);assert.equal(proof.satisfied,false);
  f.state.variables.money=1000;proof=vm.runInNewContext(expression,source);assert.equal(proof.satisfied,false);
});


test('Generic DOM CLI remains usable with SQLite and XState unavailable',t=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'dol-generic-independent-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const denied=path.join(base,'deny-gameplay.cjs');fs.writeFileSync(denied,`const m=require('node:module'),original=m._load;m._load=function(id,...args){if(id==='xstate'||id==='node:sqlite')throw Object.assign(Error('Gameplay dependency unavailable'),{code:'MODULE_NOT_FOUND'});return original.call(this,id,...args)};`);
  const before=path.join(base,'before.json'),after=path.join(base,'after.json'),out=path.join(base,'diff.json');
  fs.writeFileSync(before,JSON.stringify({schemaVersion:1,nodes:[{address:'0',id:'old'}]}));fs.writeFileSync(after,JSON.stringify({schemaVersion:1,nodes:[{address:'0',id:'new'}]}));
  const run=require('node:child_process').spawnSync(process.execPath,['-r',denied,path.resolve(__dirname,'../scripts/dol-dev.cjs'),'dom-diff','--before',before,'--after',after,'--out',out],{encoding:'utf8'});
  assert.equal(run.status,0,run.stderr);assert.deepEqual(JSON.parse(fs.readFileSync(out,'utf8')).data.changes[0].fields,['id']);
});


test('host Session protocol resolves control references, handles a normal detour and rejects old decisions without manual selectors',async t=>{
  const f=terminal(fixture(t,{routes:['Rent Event','Wardrobe']}));let current=await goal.start(f.options,f.request,f.overrides);
  assert.equal(current.decision.scene.choices.length,1);assert.equal(current.decision.scene.choices[0].selected,undefined);assert.equal(current.decision.scene.facts.choices[0].selector,undefined);
  const proposed=[];
  for(let step=0;step<2;step++){
    const d=current.decision,choice=d.scene.choices[0],p={...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:choice.ref,reason:'Use the current safe visible choice and continue the unchanged target',plan:['Resolve current scene','Continue the original target'],beliefs:[{claim:'Current destination is observed, not a remembered selector',sourceEpoch:d.epoch}]};
    const file=path.join(f.base,'proposal-'+step+'.json');fs.writeFileSync(file,JSON.stringify(p));proposed.push(file);
    assert.equal((await goal.session(f.options.out,'propose',{testEnvironment:true,file},f.overrides)).phase,'ready');assert.equal(f.stats().clicks,step);
    current=await goal.session(f.options.out,'dispatch',{testEnvironment:true},f.overrides);assert.equal(f.stats().clicks,step+1);
    if(step===0){assert.equal(current.phase,'waitingDecision');assert.equal(current.decision.scene.facts.passage,'Rent Event');assert.equal(current.decision.plan[0],'Resolve current scene');await assert.rejects(goal.session(f.options.out,'propose',{testEnvironment:true,file},f.overrides),/Stale decision/)}
  }
  assert.equal(current.status,'completed');assert.equal(current.pending,false);assert.equal(goal.status(f.options.out).planRevision,2);
  await assert.rejects(goal.session(f.options.out,'dispatch',{testEnvironment:true},f.overrides));assert.equal(f.stats().clicks,2);
});

test('missing Gameplay prerequisites report installation steps before any Android I/O or local Session writes',t=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'dol-runtime-prerequisites-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  for(const dependency of ['xstate','node:sqlite']){
    const denied=path.join(base,dependency==='xstate'?'deny-xstate.cjs':'deny-sqlite.cjs'),out=path.join(base,dependency==='xstate'?'goal-xstate':'goal-sqlite'),store=path.join(base,'sessions.sqlite');
    fs.writeFileSync(denied,`const m=require('node:module'),original=m._load;m._load=function(id,...args){if(id===${JSON.stringify(dependency)})throw Object.assign(Error('Missing dependency'),{code:'MODULE_NOT_FOUND'});return original.call(this,id,...args)};
      require(${JSON.stringify(path.resolve(__dirname,'../scripts/lib/collectors.cjs'))}).android=()=>{throw Error('Android I/O before prerequisites')};`);
    const file=path.join(base,'goal.json');fs.writeFileSync(file,JSON.stringify({name:'dependency-check',mode:'gameplay',goal:{kind:'reach-passage',passage:'Bedroom'},budget:{timeoutMs:60000,maxActions:2,maxObservations:4}}));
    const run=require('node:child_process').spawnSync(process.execPath,['--experimental-sqlite','-r',denied,path.resolve(__dirname,'../scripts/dol-dev.cjs'),'game-goal-start','--file',file,'--serial','DEVICE','--package','com.example.game','--out',out,'--store',store,'--test-environment','yes'],{encoding:'utf8'});
    assert.equal(run.status,1);assert.match(run.stderr,/Gameplay Runtime requires XState and Node SQLite/);assert.match(run.stderr,/npm ci --ignore-scripts --no-audit --no-fund in the Tools root/);assert.match(run.stderr,/--experimental-sqlite/);
    assert.equal(run.stderr.includes('Android I/O'),false);assert.equal(fs.existsSync(out),false);assert.equal(fs.existsSync(store),false);
  }
});

test('conditional equipment keeps the original colour/return condition instead of binding success to the chosen item',async t=>{
  const f=terminal(fixture(t,{equip:true,purchaseInventory:[{variable:'another_cap',colour:'white'},{variable:'test_cap',colour:'black'}],routes:['Wardrobe','Bedroom']}));
  f.request.goal={kind:'equip-matching',slot:'head',colour:'black',passage:'Bedroom'};
  assert.throws(()=>goal.validate({...f.request,goal:{...f.request.goal,variable:'selected_cap'}}),/conditional/);
  const initial=await goal.start(f.options,f.request,f.overrides);assert.equal(initial.proof.satisfied,false);assert.equal(initial.proof.items.length,1);assert.equal(initial.proof.items[0].variable,'test_cap');
  const dressed=await goal.advance(f.options.out,{...step(f),intent:'equip'},f.overrides);assert.equal(dressed.proof.wornMatches,true);assert.equal(dressed.status,'active');
  const returned=await goal.advance(f.options.out,step(f),f.overrides);assert.equal(returned.status,'completed');assert.deepEqual(goal.status(f.options.out).config.goal,{description:f.request.name,...f.request.goal});
  f.state.variables.worn.head.colour='white';const proof=vm.runInNewContext(`(${goal.goalReader.toString()})(${JSON.stringify(f.request.goal)})`,{window:{SugarCube:{State:f.state}},document:{querySelectorAll:()=>[{getAttribute:()=>f.state.passage}]}});assert.equal(proof.satisfied,false);
});

test('development wardrobe check uses the same host/effect path and cannot complete before required original assertions',async t=>{
  const f=terminal(fixture(t,{equip:true,purchaseInventory:[{variable:'test_cap',colour:'black'}]}));
  f.request.mode='development';f.request.goal={kind:'equip-matching',slot:'head',colour:'black',passage:'Wardrobe'};f.request.requiredCheckpoints=['starting-bedroom','original-equipped'];
  await goal.start(f.options,f.request,f.overrides);
  const checkpoint=async(name,predicate,passage)=>{const file=path.join(f.base,name+'.json');fs.writeFileSync(file,JSON.stringify({name,predicate,...(passage?{passage}:{})}));return goal.session(f.options.out,'checkpoint',{testEnvironment:true,file},f.overrides)};
  assert.equal((await checkpoint('starting-bedroom','scene-passage','Bedroom')).checkpoints[0].passed,true);
  const dressed=await goal.advance(f.options.out,{...step(f),intent:'equip'},f.overrides);assert.equal(dressed.proof.satisfied,true);assert.equal(dressed.status,'active');assert.equal(dressed.pending,false);
  const done=await checkpoint('original-equipped','goal-satisfied');assert.equal(done.status,'completed');assert.equal(done.checkpoints.length,2);assert.equal(f.stats().clicks,1);
  const g=fixture(t);g.request.mode='development';g.request.requiredCheckpoints=['required-start'];await goal.start(g.options,g.request,g.overrides);
  const file=path.join(g.base,'failed.json');fs.writeFileSync(file,JSON.stringify({name:'required-start',predicate:'scene-passage',passage:'Wardrobe'}));
  assert.equal((await goal.session(g.options.out,'checkpoint',{testEnvironment:true,file},g.overrides)).status,'failed');
  g.state.passage='Wardrobe';assert.equal((await goal.session(g.options.out,'resume',{testEnvironment:true},g.overrides)).status,'failed');assert.equal(g.stats().clicks,0);
});

test('rolling route memory survives host rebinding and rejects a no-progress loop while a new event remains actionable',async t=>{
  const f=terminal(fixture(t,{routes:['Bedroom','Bedroom','Bedroom']}));let current=await goal.start(f.options,f.request,f.overrides);
  for(let i=0;i<3;i++){
    const d=current.decision,file=path.join(f.base,'loop-'+i+'.json');fs.writeFileSync(file,JSON.stringify({...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:d.scene.choices[0].ref,reason:'Try current route',plan:['Continue target'],beliefs:[]}));
    await goal.session(f.options.out,'propose',{testEnvironment:true,file},f.overrides);current=await goal.session(f.options.out,'dispatch',{testEnvironment:true},f.overrides);
  }
  assert.equal(current.phase,'waitingDecision');assert.equal(current.decision.scene.choices.length,0);assert.equal(current.decision.routes.length,3);assert.equal(f.stats().clicks,3);
  const before=goal.status(f.options.out);current=await goal.session(f.options.out,'resume',{testEnvironment:true},f.overrides);assert.equal(current.decision.routes.length,3);assert.equal(current.decision.scene.choices.length,0);assert.equal(current.actions,before.actions);assert.equal(goal.status(f.options.out).deadline,before.deadline);
  const d=current.decision,s=goal.status(f.options.out),forged=path.join(f.base,'blocked-route.json');fs.writeFileSync(forged,JSON.stringify({...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:s.scene.choices[0].ref,reason:'Retry hidden route',plan:[],beliefs:[]}));
  await assert.rejects(goal.session(f.options.out,'propose',{testEnvironment:true,file:forged},f.overrides),/no original goal progress/);assert.equal(f.stats().clicks,3);
  f.state.passage='New Normal Event';current=await goal.session(f.options.out,'request',{testEnvironment:true},f.overrides);assert.equal(current.phase,'waitingDecision');assert.equal(current.decision.scene.choices.length,1);assert.equal(current.decision.routes.length,3);
});

test('native commerce cannot become a zero-cost menu candidate; original quote binds the purchase reference',()=>{
  const facts={choices:[{safe:true,requiresQuote:true,centerActionable:true,selector:'#buy-send-home',label:'Buy',index:0}]};
  assert.equal(goal.candidates(facts,1).length,0);
  const g={kind:'purchase-one',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',baselineMoney:1000,baselineCount:0,unitCost:500,maxSpend:500};
  const shop={status:'available',variable:'hairpin',colour:'black',accessoryColour:'black',money:1000,count:0,cost:500,quantity:1,destination:'wardrobe',space:2};
  const quote=goal.candidates(facts,1,null,shop,g)[0];assert.equal(quote.kind,'buy');assert.equal(quote.cost,500);assert.equal(quote.selected.type,'dol-shop');
  for(const changed of [{cost:501},{money:999},{count:1},{destination:'worn'},{colour:'white'},{space:0}])assert.equal(goal.candidates(facts,1,null,{...shop,...changed},g).length,0);
  const quantity=goal.candidates(facts,1,null,{...shop,quantity:2},g)[0];assert.equal(quantity.kind,'menu');assert.equal(quantity.cost,0);assert.equal(quantity.selected.operation,'quantity-one');
});

test('final guard blocks a control becoming commerce outside the observed candidate window',async t=>{
  const f=fixture(t,{hideChoice:true,commerceDrift:true});await goal.start(f.options,f.request,f.overrides);
  const result=await goal.advance(f.options.out,{...step(f),intent:'menu'},f.overrides);
  assert.equal(f.stats().clicks,0);assert.equal(result.pending,false);assert.equal(goal.status(f.options.out).spent,0);
});

test('checkpoint CAS rejects another host observation instead of substituting its successful state',async t=>{
  const f=fixture(t);f.request.mode='development';f.request.requiredCheckpoints=['start'];await goal.start(f.options,f.request,f.overrides);
  const {Runtime}=require('../scripts/lib/game-runtime.cjs'),original=Runtime.prototype.observe;let injected=false;
  t.mock.method(Runtime.prototype,'observe',function(...args){const observed=original.apply(this,args);if(!injected){injected=true;queueMicrotask(()=>{const rival=new Runtime(f.options.store,{provider:goal.provider});try{const s=rival.status(observed.id),next=JSON.parse(JSON.stringify(s.scene));next.revision++;next.facts.passage='Wardrobe';next.goalProof.satisfied=true;rival.observe(s.id,next)}finally{rival.close()}})}return observed});
  const file=path.join(f.base,'race.json');fs.writeFileSync(file,JSON.stringify({name:'start',predicate:'scene-passage',passage:'Wardrobe'}));
  await assert.rejects(goal.session(f.options.out,'checkpoint',{testEnvironment:true,file},f.overrides),/Stale checkpoint observation/);assert.equal(goal.status(f.options.out).checkpoints.length,0);assert.equal(goal.status(f.options.out).machine.value,'waitingDecision');
});

test('four legitimate same-passage dialogue stages remain actionable as narrative progresses',async t=>{
  const f=terminal(fixture(t,{progressingNarrative:true,routes:['Bedroom','Bedroom','Bedroom','Bedroom','Wardrobe']}));let current=await goal.start(f.options,f.request,f.overrides);
  for(let i=0;i<5;i++){
    const d=current.decision;assert.equal(d.scene.choices.length,1);const file=path.join(f.base,'dialogue-'+i+'.json');fs.writeFileSync(file,JSON.stringify({...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:d.scene.choices[0].ref,reason:'Handle next observed conversation stage',plan:['Complete conversation then resume target'],beliefs:[]}));
    await goal.session(f.options.out,'propose',{testEnvironment:true,file},f.overrides);current=await goal.session(f.options.out,'dispatch',{testEnvironment:true},f.overrides);
  }
  assert.equal(current.status,'completed');assert.equal(f.stats().clicks,5);
});

test('native binding failures prevent operation; a durable terminal survives lost ack and a new host settles it once',async t=>{
  const {Runtime}=require('../scripts/lib/game-runtime.cjs'),native=require('../integrations/soft-and-wet/native-head.cjs'),receipts=require('../scripts/lib/game-receipts.cjs');
  for(const fault of ['binding','claim','lost-ack','started','context-lost']) await t.test(fault,async t=>{
    const f=fixture(t,{nativeAckLost:fault==='lost-ack',nativeContextLost:fault==='context-lost'});await goal.start(f.options,f.request,f.overrides);
    fs.writeFileSync(f.file,JSON.stringify({type:'sw-wardrobe',operation:'equip',slot:'head',variable:'hairpin',colour:'black'}));
    if(fault==='binding')t.mock.method(Runtime.prototype,'bindExecution',()=>{throw Error('Injected durable write failure')});
    if(fault==='claim')t.mock.method(Runtime.prototype,'claimDispatch',()=>{throw Error('Injected fenced claim')});
    t.mock.method(native,'prepare',async(client,request,attemptId)=>{
      const binding={provider:'soft-and-wet-native-head',contract:'fixture-sync',contextNonce:await receipts.context(client),requestDigest:'a'.repeat(64)};
      const record={...binding,attemptId,status:fault==='started'?'started':'terminal',outcome:'occurred',remoteClosed:true,spent:0};
      return {action:{type:'web-click',selector:'#choice'},objectIds:[],arguments:[],source:'',executionBinding:binding,interpretation:{operation:'equip'},
        operation:{name:'fixture-native',source:`globalThis.nativeOperationCalls=(globalThis.nativeOperationCalls||0)+1;window.SugarCube.State.passage='Wardrobe';const receipt=${JSON.stringify(record)};window[${JSON.stringify(receipts.namespace)}].records[${JSON.stringify(attemptId)}]=Object.freeze(receipt);return {ok:true,receipt};`}};
    });
    const result=await goal.advance(f.options.out,{...step(f),intent:'equip'},f.overrides);
    assert.equal(f.stats().clicks,0,'internal operation must not also click');
    if(['binding','claim'].includes(fault)) {
      assert.equal(f.globals.nativeOperationCalls||0,0);assert.equal(result.pending,false);assert.equal(result.proof.satisfied,false);
    } else {
      const calls=f.globals.nativeOperationCalls||0;
      assert.equal(calls,1);assert.equal(result.proof.satisfied,true);
      const next=await goal.session(f.options.out,'request',{testEnvironment:true},f.overrides);
      const uncertain=['started','context-lost'].includes(fault);
      assert.equal(next.pending,uncertain);assert.equal(next.phase,uncertain?'reconciling':'completed');
      assert.equal(f.globals.nativeOperationCalls||0,calls,'new host must never replay');
      if(fault==='lost-ack') {
        const r=new Runtime(f.options.store,{provider:goal.provider});try {
          const effect=r.db.prepare('SELECT doc FROM effects WHERE target_key=?').get(goal.status(f.options.out).targetKey);
          const e=JSON.parse(effect.doc);assert.equal(e.status,'settled');assert.equal(e.ack.dispatch,'unknown');assert.equal(e.result.outcome,'occurred');
        }finally{r.close()}
      }
    }
  });
});
