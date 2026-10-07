const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {spawnSync}=require('node:child_process');
const {Runtime}=require('../scripts/lib/game-runtime.cjs'),capabilities=require('../scripts/lib/game-capabilities.cjs'),goal=require('../scripts/lib/game-goal.cjs');
const config={mode:'gameplay',goal:{description:'Do a native activity then return',kind:'reach-passage',passage:'Home Return'},budget:{timeoutMs:60000,maxActions:8,maxObservations:20,maxReplans:20,maxSpend:0}};
const control={ref:'native',kind:'navigation',cost:0,risk:'normal',label:'Take original route',selected:{type:'web-click',selector:'#original'},capability:{provider:'native-dol',name:'control'}};
function scene(passage,choices=[control]){return {source:'original DoL semantic provider',revision:1,location:'town',facts:{passage,domAgrees:true,surface:'passage',narrative:'Ordinary native event',choices:[]},goalProof:{status:'available',satisfied:passage==='Home Return',passage},choices}}
function proposal(s,ref,cognition){return {...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,s.decision[k]])),actionRef:ref,reason:'Current original control; continue native goal',plan:['Resolve event','Return to target'],beliefs:[],...(cognition?{cognition}:{})}}
function fixture(t){const base=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-providers-')),file=path.join(base,'sessions.sqlite'),r=new Runtime(file,{provider:capabilities.provider});const handles=[r];t.after(()=>{for(const h of handles)h.close();assert.ok(base.startsWith(os.tmpdir()+path.sep));fs.rmSync(base,{recursive:true,force:true})});return {r,file,handles,s:r.start({serial:'fixture',package:'com.example.native',userId:'0'},config)}}

test('native request, original probe, candidates and store host work with clothing/SW modules unavailable',()=>{
  const source=`const assert=require('node:assert/strict'),Module=require('node:module'),vm=require('node:vm');
    const load=Module._load;Module._load=function(id,...args){if(/game-clothing-provider|game-goal-reader|game-shop|soft-and-wet/.test(id))throw Error('Forbidden domain dependency '+id);return load.call(this,id,...args)};
    const goal=require('./scripts/lib/game-goal.cjs'),native=require('./scripts/lib/game-native-provider.cjs');
    const request=goal.validate({name:'native-activity',mode:'gameplay',goal:{kind:'reach-passage',passage:'Park'},budget:{timeoutMs:60000,maxActions:8,maxObservations:20}});
    const state={passage:'Unexpected Native Conversation',variables:{}};Object.defineProperty(state.variables,'wardrobe',{get(){throw Error('Inventory access')}});
    const proof=vm.runInNewContext('('+native.reader.toString()+')(goal)',{goal:request.goal,window:{SugarCube:{State:state}},document:{querySelectorAll:()=>[{getAttribute:()=>state.passage}]}});
    assert.equal(proof.status,'available');assert.equal(proof.satisfied,false);
    const candidate=goal.candidates({choices:[{index:0,label:'Continue',safe:true,requiresQuote:false,centerActionable:true,selector:'#native'}]},1,proof,null,request.goal)[0];
    assert.equal(candidate.capability.provider,'native-dol');assert.equal(goal.provider.validateGoal(request.goal),true);
    assert.equal(goal.provider.validateReceipt({evidence:undefined},{action:candidate}),true);
    assert.deepEqual(goal.provider.canPrepare(candidate,request.goal,{effects:[]}),true);
    const observed=${JSON.stringify(scene('Unexpected Native Conversation'))};assert.equal(goal.provider.scene(observed,request.goal).choices[0].capability.provider,'native-dol');
    const stateRequest=goal.validate({...request,goal:{kind:'native-state',passage:'Park',conditions:[{field:'timeStamp',op:'gte',value:1}]}});
    state.variables.timeStamp=0;
    const stateProof=vm.runInNewContext('('+native.reader.toString()+')(goal)',{goal:stateRequest.goal,window:{SugarCube:{State:state}},document:{querySelectorAll:()=>[{getAttribute:()=>state.passage}]}});
    observed.goalProof=stateProof;assert.deepEqual(goal.provider.trace(observed,stateRequest.goal).distances,[1,1]);
    const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),{Runtime}=require('./scripts/lib/game-runtime.cjs');
    const base=fs.mkdtempSync(path.join(os.tmpdir(),'native-no-domain-')),file=path.join(base,'session.sqlite');let first,second;
    try{first=new Runtime(file,{provider:goal.provider});const state=first.start({serial:'fixture',package:'com.example.native',userId:'0'},{...${JSON.stringify(config)},goal:{...stateRequest.goal,description:'Advance native time then return'}});
      first.observe(state.id,observed);second=new Runtime(file,{provider:goal.provider});second.resume(state.id);
      const current=second.observe(state.id,observed);assert.equal(goal.view(current).decision.scene.choices[0].capability.provider,'native-dol');
      assert.equal(current.deadline,state.deadline);assert.equal(current.actions,0);
    }finally{second?.close();first?.close();assert.ok(base.startsWith(os.tmpdir()+path.sep));fs.rmSync(base,{recursive:true,force:true})}`;
  const result=spawnSync(process.execPath,['--experimental-sqlite','-e',source],{cwd:path.resolve(__dirname,'..'),encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
});

test('native event memory and original goal survive a new store host; native terminal outcomes remain domain independent',async t=>{
  const f=fixture(t);let s=f.r.observe(f.s.id,scene('Town'));
  f.r.propose(s.id,proposal(s,control.ref,{subgoals:[{id:'return',description:'Return to original goal',status:'active',sourceEpoch:s.epoch}],events:[{id:'dialogue',description:'Handle current native dialogue',sourceEpoch:s.epoch,returnTo:'return'}]}));
  const e=f.r.prepare(s.id);await f.r.dispatch(e.id,async()=>({dispatch:'acknowledged'}));
  s=f.r.observe(s.id,scene('Random Native Dialogue'),[{attemptId:e.id,outcome:'occurred',remoteClosed:true,spent:0,source:'reviewed native synchronous receiver fixture'}]);
  assert.equal(s.machine.value,'waitingDecision');assert.equal(s.decision.outcomes[0].descriptor.capability.provider,'native-dol');
  const deadline=s.deadline,host=new Runtime(f.file,{provider:capabilities.provider});f.handles.push(host);host.resume(s.id);
  s=host.observe(s.id,scene('Native Activity'));assert.equal(s.deadline,deadline);assert.equal(s.actions,1);assert.equal(s.decision.cognition.events[0].returnTo,'return');assert.equal(s.decision.cognition.events[0].needsReview,true);
  assert.equal(s.decision.outcomes.length,1);assert.equal(host.effect(e.id).status,'settled');
  const publicView=goal.view(s);assert.equal(publicView.decision.outcomes[0].descriptor.selected,undefined);
  const historical=JSON.parse(JSON.stringify(s));delete historical.decision.outcomes;assert.deepEqual(goal.view(historical).decision.outcomes,[]);
  s=host.observe(s.id,scene('Home Return',[]));assert.equal(s.machine.value,'completed');assert.deepEqual(s.config.goal,config.goal);
});

test('goal predicate and action provider compose independently; durable metadata and receipt binding cannot impersonate another capability',async t=>{
  const f=fixture(t),clothing={ref:'domain',kind:'equip',cost:0,risk:'normal',selected:{type:'sw-wardrobe',operation:'equip',slot:'head',variable:'hairpin',colour:'black'},capability:{provider:'clothing',name:'wardrobe'}};
  let s=f.r.observe(f.s.id,scene('Native Activity',[control,clothing]));
  assert.deepEqual(s.decision.scene.choices.map(c=>c.capability.provider),['native-dol','clothing']);
  assert.throws(()=>f.r.observe(s.id,scene('Native Activity',[{...clothing,capability:control.capability}])),/identity mismatch/);
  f.r.propose(s.id,proposal(s,clothing.ref));const e=f.r.prepare(s.id);await f.r.dispatch(e.id,async()=>({dispatch:'acknowledged'}));
  const receipt={attemptId:e.id,outcome:'occurred',remoteClosed:true,spent:0,source:'reviewed domain fixture'};
  assert.throws(()=>capabilities.provider.validateReceipt(receipt,{...e,executionBinding:{provider:'dol-shop-native'}}),/binding\/capability mismatch/);
  assert.throws(()=>capabilities.provider.validateReceipt(receipt,{...e,executionBinding:{provider:'unknown-provider'}}),/Unreviewed/);
  assert.equal(capabilities.provider.validateReceipt(receipt,{...e,executionBinding:{provider:'soft-and-wet-native-head'}}),true);
  assert.throws(()=>capabilities.provider.validateReceipt(receipt,{...e,executionBinding:{provider:'dol-wardrobe-native'}}),/implementation mismatch/);
  const original={...clothing,selected:{...clothing.selected,type:'dol-wardrobe',accessoryColour:'black',modder:null}};
  assert.equal(capabilities.validateDescriptor(original,config.goal).id,'clothing');
  assert.equal(capabilities.provider.validateReceipt(receipt,{...e,action:original,executionBinding:{provider:'dol-wardrobe-native'}}),false);
  assert.throws(()=>capabilities.provider.validateReceipt(receipt,{...e,action:original,executionBinding:{provider:'soft-and-wet-native-head'}}),/implementation mismatch/);
  s=f.r.observe(s.id,scene('Native Activity',[control]),[receipt]);
  const view=goal.view(s);assert.equal(view.proof.satisfied,false);assert.equal(view.decision.outcomes[0].descriptor.capability.provider,'clothing');assert.equal(view.decision.outcomes[0].descriptor.selected,undefined);
});

test('native state goal survives a new host and cannot complete over a pending effect',async t=>{
  const f=fixture(t),g={description:'Advance native time and return',kind:'native-state',passage:'Home Return',conditions:[{field:'timeStamp',op:'gte',value:12}]};
  f.r.stop(f.s.id);const started=f.r.start(f.s.target,{...config,goal:g});
  const native=require('../scripts/lib/game-native-provider.cjs');
  function stateScene(passage,timeStamp){
    const value=scene(passage);value.goalProof=vm.runInNewContext('('+native.reader.toString()+')(goal)',{goal:g,window:{SugarCube:{State:{passage,variables:{timeStamp}}}},document:{querySelectorAll:()=>[{getAttribute:()=>passage}]}});return value;
  }
  let s=f.r.observe(started.id,stateScene('Home Return',10));assert.equal(s.goalSatisfied,false);
  f.r.propose(s.id,proposal(s,control.ref));const e=f.r.prepare(s.id);
  await f.r.dispatch(e.id,async()=>({dispatch:'acknowledged'}));
  const host=new Runtime(f.file,{provider:capabilities.provider});f.handles.push(host);host.resume(s.id);
  s=host.observe(s.id,stateScene('Home Return',12));assert.equal(s.goalSatisfied,true);assert.equal(s.machine.value,'reconciling');assert.equal(s.openEffects.length,1);
  s=host.observe(s.id,stateScene('Native Activity',12),[{attemptId:e.id,outcome:'occurred',remoteClosed:true,spent:0,source:'reviewed native activity fixture'}]);
  assert.equal(s.machine.value,'waitingDecision');assert.equal(s.goalSatisfied,false);assert.equal(s.actions,1);assert.equal(s.deadline,started.deadline);
  assert.equal(s.routes.at(-1).progressed,false); // Time improved, but the return condition regressed.
  s=host.observe(s.id,stateScene('Home Return',12));assert.equal(s.machine.value,'completed');assert.deepEqual(s.config.goal,g);
});
