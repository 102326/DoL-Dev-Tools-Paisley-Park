const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),{resolve}=require('node:path'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
const sha=s=>createHash('sha256').update(s).digest('hex');

function fixture({cleanupFails=false,changedHandler=false,changedEffects=false,bedroom=false,bedroomReturn=false,wardrobeReturn=false,kitchen=false,hall=false,eventContinue=false,timeBindFails=false,changedFunction=false,changedRandom=false,changedCapture=false,brush=false,bathroom=false,brushContinue=false,hallSettled=false,changedPool=false,changedFloat=false,changedState=false,nestedCapture=false,changedNestedCapture=false,globalCapture=false}={}){
  const daily=brush||bathroom||brushContinue;
  hall=hall||daily||hallSettled;
  hall=hall||eventContinue;
  bedroom=bedroom||bedroomReturn||wardrobeReturn;
  const path=resolve(__dirname,'../scripts/lib/game-native-profile.cjs'),nativeRequire=createRequire(path);
  function effects(){}function effectsHandler(){}function npcHandler(){}function kitchenFilter(){}function kitchenFilterHandler(){}
  const passage={text:'A native introductory scene.',tags:[]},registry={effects:{handler:effectsHandler},npc:{handler:npcHandler}};
  const window={Time:{hour:7,minute:0,second:0},SugarCube:{State:{passage:kitchen?'Bedroom':bedroom?'Orphanage Intro':'Start2',variables:{options:{autosaveDisabled:true},ironmanmode:false,
    stress:1,stressmax:100,wear_outfit:'none',daily:{robin:{}},foodstuff:{bread:{knows_recipe:false}}},temporary:{}},Story:{get:()=>passage},Macro:{get:name=>registry[name]}}};
  const profile={id:'native-fixture',receiving:{passage:'Orphanage Intro',sha256:sha(passage.text),tags:'[]'},widgets:{npc:'a'.repeat(64)},
    handlerSha256:{effects:sha(effectsHandler.toString()),npc:sha(npcHandler.toString())},effectsSha256:sha(effects.toString())};
  const bedroomWidgets=['bedclotheson','home_effects','getTarget','wardrobeSelection','updateWornClothingLocation',...(wardrobeReturn?['cleanupOnWardrobeExit']:[])];
  const bedroomProfile={id:'bedroom-fixture',before:'Orphanage Intro',receiving:{passage:'Bedroom',sha256:sha(passage.text),tags:'[]'},
    widgets:Object.fromEntries(bedroomWidgets.map(name=>[name,'a'.repeat(64)])),
    handlerSha256:Object.fromEntries(bedroomWidgets.map(name=>[name,sha(npcHandler.toString())]))};
  if(bedroom)for(const name of bedroomWidgets)registry[name]={handler:npcHandler};
  if(bedroomReturn)window.SugarCube.State.passage='Orphanage';
  if(wardrobeReturn)window.SugarCube.State.passage='Wardrobe';
  const kitchenWidgets=['robinorphanagekitchen','ingredientsSupplied','ingredientsExceptions','kitchenDisplay','kitchenDisplayRecipes','kitchenDisplayOptions','kitchenDisplayRecipe'];
  const kitchenProfile={id:'kitchen-fixture',before:'Bedroom',payload:'<<pass 1>>',receiving:{passage:'Kitchen',sha256:sha(passage.text),tags:'[]'},
    widgets:Object.fromEntries(kitchenWidgets.map(name=>[name,'a'.repeat(64)])),functionMacros:{kitchenFilter:sha(kitchenFilter.toString())},
    handlerSha256:{...Object.fromEntries(kitchenWidgets.map(name=>[name,sha(npcHandler.toString())])),kitchenFilter:sha(kitchenFilterHandler.toString())}};
  if(kitchen){for(const name of kitchenWidgets)registry[name]={handler:npcHandler};registry.kitchenFilter={handler:kitchenFilterHandler}}
  const monitor={check:()=>undefined},objects={effects,effectsHandler,npcHandler,kitchenFilter,kitchenFilterHandler,monitor,changed:function changed(){}},released=[];let captures=0,timeCalls=0,timeMinutes;
  function random(){}function statChange(){}function label(){}function rngHandler(){}
  const hallProfile={id:'hall-fixture',before:'Kitchen',payload:'<<pass 1>><<kitchenExit>>',timeSeconds:60,
    receiving:{passage:'Orphanage',sha256:sha(passage.text),tags:'[]'},widgets:{kitchenExit:'a'.repeat(64)},
    functionMacros:{label:sha(label.toString())},functionCaptures:{label:{fn:sha(statChange.toString())}},
    handlerSha256:{kitchenExit:sha(npcHandler.toString()),label:sha(kitchenFilterHandler.toString()),rng:sha(rngHandler.toString())},
    globalFunctions:{random:sha(random.toString()),'statDisplay.statChange':sha(statChange.toString())},
    continue:{id:'hall-continue-fixture',before:'Orphanage',payload:'<<endevent>>',timeSeconds:0}};
  if(nestedCapture)hallProfile.functionCaptures.label['fn.inner']=sha(effects.toString());
  if(globalCapture)hallProfile.globalCaptures={random:{inner:sha(effects.toString())}};
  if(hall){
    Object.assign(objects,{random,statChange,label,rngHandler});
    Object.assign(registry,{kitchenExit:{handler:npcHandler},label:{handler:kitchenFilterHandler},rng:{handler:rngHandler}});
    const v=window.SugarCube.State.variables;
    Object.assign(v,{stress:0,stressmax:10000,exposed:0,hoursGoneFromHome:0,robinmissing:0,renttime:7,debug:0,
      home_event_timer:3,orphan_hope:0,orphan_reb:0,location:'home',carried:{handheld:{name:'naked',variable:'naked'}}});
    v.worn={upper:{name:'sundress'},handheld:{name:'naked',variable:'naked'}};
    window.Time={days:0,hour:7,month:9};window.C={npc:{Robin:{init:0}}};
    window.SugarCube.Scripting={evalJavaScript:name=>name==='setup'?{clothes:{handheld:[{variable:'naked'}]}}:name==='random'?objects.random:objects.statChange};
    window.SugarCube.State.passage='Kitchen';
    if(eventContinue){
      Object.assign(v,{dancing:0,npc:[],per_npc:{},NPCList:Array.from({length:6},()=>({})),rng:1});
      v.worn.neck={name:'naked'};v.daily.homeEvent=1;v.orphan_reb=-2;window.SugarCube.State.passage='Orphanage';
    }
  }
  function weighted(){}function float(){}function combined(){}function poolHandler(){}
  const dailyProfile={bathroom:{id:'bathroom-fixture',before:'Orphanage',payload:'<<pass 1>>',timeSeconds:60,
    receiving:{passage:'Bathroom',sha256:sha(passage.text),tags:'[]'},widgets:{},handlerSha256:{},globalFunctions:{}},
    brush:{id:'brush-fixture',before:'Bathroom',payload:'<<pass 5>>',timeSeconds:300,
      receiving:{passage:'Bathroom Brush',sha256:sha(passage.text),tags:'[]'},widgets:{},functionMacros:{},functionCaptures:{},
      handlerSha256:{runeventpool:sha(poolHandler.toString())},
      globalFunctions:{rollWeightedRandomFromArray:sha(weighted.toString()),randomFloat:sha(float.toString()),'setup.bodyliquid.combined':sha(combined.toString())}},
    continued:{id:'brush-continue-fixture',before:'Bathroom Brush',payload:'<<endevent>><<canvas-model-override "clear">><<run delete $bathroomExit>>',timeSeconds:0,widgets:{},handlerSha256:{}}};
  if(daily||hallSettled){
    const state=window.SugarCube.State,v=state.variables;
    Object.assign(v,{pblevel:1,pbstrip:0,pblevelballs:1,makeup:{owned:{hairdye:[]}},dancing:0,npc:[],per_npc:{},NPCList:Array.from({length:6},()=>({})),rng:1});
    v.worn.neck={name:'naked'};v.daily.homeEvent=1;
    for(const name of ['robinroom_link','home_outside','endevent','endnpc','clearnpc']){
      hallProfile.widgets[name]='a'.repeat(64);hallProfile.handlerSha256[name]=sha(npcHandler.toString());registry[name]={handler:npcHandler};
    }
    hallProfile.globalFunctions['EventSystem.clear']=sha(statChange.toString());
    Object.assign(objects,{weighted,float,combined,poolHandler,state});registry.runeventpool={handler:poolHandler};
    window.SugarCube.Scripting.evalJavaScript=name=>name==='setup'?{clothes:{handheld:[{variable:'naked'}]}}:
      name==='random'?objects.random:name==='rollWeightedRandomFromArray'?objects.weighted:name==='randomFloat'?objects.float:
      name==='setup.bodyliquid.combined'?objects.combined:objects.statChange;
    state.passage=brush?'Bathroom':brushContinue?'Bathroom Brush':hallSettled?'Bedroom':'Orphanage';
  }
  if(changedEffects){objects.effectsReplacement=vm.runInNewContext('('+effectsHandler.toString()+')');registry.effects.handler=objects.effectsReplacement;}
  const contract={attestWidget:async(_c,name)=>({name,objectId:changedHandler?'changed':'npcHandler',objectGroup:'owned-'+name}),
    attestFunctionMacro:async(_c,name)=>({name,objectId:changedFunction?'changed':'kitchenFilterHandler',functionId:hall?'label':'kitchenFilter',objectGroup:'owned-'+name}),
    captured:async(_c,id,key)=>key==='rollWeightedRandomFromArray'?(changedPool?'changed':'weighted'):key==='randomFloat'?(changedFloat?'changed':'float'):key==='State'?(changedState?'changed':'state'):
      key==='random'?(changedRandom?'changed':'random'):key==='fn'?(changedCapture?'changed':'statChange'):key==='inner'?(changedNestedCapture?'changed':'effects'):'effects',functionSource:async(_c,id)=>objects[id].toString(),
    member:async(_c,id,expression)=>{const fn=vm.runInNewContext(`(function(){return ${expression}})`,{window}).call(objects[id]);return Object.keys(objects).find(key=>objects[key]===fn)},
    sameObject:async(_c,a,b)=>objects[a]===objects[b]};
  const localRequire=name=>name==='./game-native-environment.cjs'?{bind:async()=>({arguments:[{objectId:'environment'}],guard:'return undefined'})}:
    name==='./game-native-generic-landing.cjs'?{review:async()=>({id:'generic-navigation-fixture'})}:
    name==='./game-native-intro-profile.json'?profile:name==='./game-native-bedroom-profile.json'?bedroomProfile:
    name==='./game-native-kitchen-profile.json'?kitchenProfile:
    name==='./game-native-hall-profile.json'?hallProfile:
    name==='./game-native-daily-profile.json'?dailyProfile:
    name==='./game-native-time.cjs'?{bind:async(_c,_h,options)=>{timeCalls++;timeMinutes=options.minutes;if(timeBindFails)throw Error('Time binding failed');return {objectId:'monitor',digest:'b'.repeat(64)}}}:
    name==='./game-contract.cjs'?contract:nativeRequire(name);
  const module={exports:{}};
  vm.runInNewContext(`(function(require,module,exports,Buffer){${readFileSync(path,'utf8')}\n})`,{})(localRequire,module,module.exports,Buffer);
  const client={evaluate:async expression=>expression.startsWith('Time.minute+')?vm.runInNewContext(expression,{Time:window.Time}):expression.includes('daily?.homeEvent')?window.SugarCube.State.variables.daily.homeEvent===1:true,async send(method,p){
    if(method==='Runtime.evaluate'){
      const id=p.expression.includes('Scripting.evalJavaScript')?(p.expression.includes('rollWeightedRandomFromArray')?'weighted':p.expression.includes('randomFloat')?'float':p.expression.includes('bodyliquid')?'combined':p.expression.includes('statDisplay')||p.expression.includes('EventSystem')?'statChange':'random'):p.expression.includes('"rng"')?'rngHandler':p.expression.includes('"runeventpool"')?'poolHandler':'effectsHandler';
      return {result:{type:'function',objectId:id}};
    }
    if(method==='Runtime.releaseObjectGroup'){released.push(p.objectGroup);if(cleanupFails)throw Error('Owned cleanup failed');return {}}
    if(method==='Runtime.callFunctionOn'){
      const args=(p.arguments||[]).map(arg=>objects[arg.objectId]);
      const value=vm.runInNewContext(`(${p.functionDeclaration})`,{window}).call(objects[p.objectId],...args);
      if(p.returnByValue)return {result:{value}};
      const objectId='bundle-'+(++captures);objects[objectId]=value;return {result:{objectId}};
    }
    throw Error('Unexpected CDP request');
  }};
  return {review:module.exports.review,client,window,registry,passage,objects,released,monitor,get timeCalls(){return timeCalls},get timeMinutes(){return timeMinutes},
    held:{before:{passage:wardrobeReturn?'Wardrobe':daily||hallSettled?window.SugarCube.State.passage:eventContinue||bedroomReturn?'Orphanage':hall?'Kitchen':kitchen?'Bedroom':bedroom?'Orphanage Intro':'Start2'},destination:brush?'Bathroom Brush':daily?'Bathroom':hall?'Orphanage':kitchen?'Kitchen':bedroom?'Bedroom':'Orphanage Intro',payload:wardrobeReturn?'<<cleanupOnWardrobeExit>>':brush?dailyProfile.brush.payload:brushContinue?dailyProfile.continued.payload:bathroom||hallSettled?'<<pass 1>>':eventContinue?'<<endevent>>':hall?hallProfile.payload:kitchen||bedroomReturn?'<<pass 1>>':'',objectGroup:'owned-native'}};
}

test('native wardrobe return binds original cleanup and Bedroom receiver without a time or UI assumption',async()=>{
  const f=fixture({wardrobeReturn:true}),e=await f.review(f.client,f.held);
  assert.equal(f.timeCalls,0);assert.ok(f.released.includes('owned-cleanupOnWardrobeExit'));
  const guard=vm.runInNewContext(`(function(nativeEnvPhase,nativeEnvInputs){${e.guard}})`,{window:f.window}),inputs=[{},f.objects[e.arguments[1].objectId]];
  assert.equal(guard('before',inputs),undefined);
  f.window.SugarCube.State.variables.bus='clothingshop';assert.equal(guard('before',inputs),'native-wardrobe-bus-reset-unreviewed');
  delete f.window.SugarCube.State.variables.bus;f.window.SugarCube.State.passage='Bedroom';assert.equal(guard('after',inputs),undefined);
  await assert.rejects(f.review(f.client,{...f.held,payload:''}),/not yet reviewed/);
});

test('native capture paths retain reviewed inner functions and reject changed nested helper sources',async()=>{
  const f=fixture({hall:true,nestedCapture:true}),e=await f.review(f.client,f.held);
  assert.equal(f.objects[e.arguments[1].objectId].functions.length,3);
  const changed=fixture({hall:true,nestedCapture:true,changedNestedCapture:true});
  await assert.rejects(changed.review(changed.client,changed.held),/Native captured function changed/);
  assert.ok(changed.released.includes('owned-label'));
});

test('native global helper captures share the reviewed bounded path and retained source checks',async()=>{
  const f=fixture({hall:true,globalCapture:true}),e=await f.review(f.client,f.held);
  assert.equal(f.objects[e.arguments[1].objectId].functions.length,3);
  const changed=fixture({hall:true,globalCapture:true,changedNestedCapture:true});
  await assert.rejects(changed.review(changed.client,changed.held),/Native captured function changed/);
});

test('native daily activity binds the five-minute witness, nested helper and actual event-pool owners',async()=>{
  const f=fixture({brush:true}),e=await f.review(f.client,f.held);
  assert.equal(f.timeMinutes,5);assert.equal(f.timeCalls,1);
  const inputs=[{},f.objects[e.arguments[1].objectId],f.monitor];
  const guard=vm.runInNewContext(`(function(nativeEnvPhase,nativeEnvInputs){${e.guard}})`,{window:f.window});
  assert.equal(guard('before',inputs),undefined);
  f.window.SugarCube.State.passage='Bathroom Brush';f.window.SugarCube.State.variables.bathroomExit='Bathroom';
  assert.equal(guard('after',inputs),undefined);
  f.objects.combined=function replacement(){};assert.equal(guard('after',inputs),'native-profile-functions-changed');
  for(const options of [{changedPool:true},{changedFloat:true},{changedState:true}]){
    const changed=fixture({brush:true,...options});await assert.rejects(changed.review(changed.client,changed.held),/owner changed/);
    assert.ok(changed.released.length>0);
  }
});
test('native settled hall, bathroom and activity continuation reuse one binding chain without forcing events',async()=>{
  for(const options of [{hallSettled:true},{bathroom:true},{brushContinue:true}]){
    const f=fixture(options),e=await f.review(f.client,f.held);
    assert.equal(f.timeCalls,options.brushContinue?0:1);
    const inputs=[{},f.objects[e.arguments[1].objectId],...(options.brushContinue?[]:[f.monitor])];
    const guard=vm.runInNewContext(`(function(nativeEnvPhase,nativeEnvInputs){${e.guard}})`,{window:f.window});
    assert.equal(guard('before',inputs),undefined);
    f.window.SugarCube.State.passage=f.held.destination;assert.equal(guard('after',inputs),undefined);
    await assert.rejects(f.review(f.client,{...f.held,payload:''}),/not yet reviewed/);
  }
});

test('native event binds lexical functions and original exit payload; changed owners and captures cannot close an effect',async()=>{
  const f=fixture({hall:true}),environment=await f.review(f.client,f.held);
  assert.equal(f.timeCalls,1);assert.deepEqual(f.released,['owned-kitchenExit','owned-label']);
  const inputs=[{},f.objects[environment.arguments[1].objectId],f.monitor];
  assert.equal(inputs[1].functions.length,2);
  const guard=vm.runInNewContext(`(function(nativeEnvPhase,nativeEnvInputs){${environment.guard}})`,{window:f.window});
  assert.equal(guard('before',inputs),undefined);
  const state=f.window.SugarCube.State;
  state.passage='Orphanage';state.variables.daily.homeEvent=1;state.variables.rng=14;state.variables.orphan_hope=-2;
  assert.equal(guard('after',inputs),undefined);
  const original=f.objects.random;f.objects.random=function replacedRandom(){};
  assert.equal(guard('after',inputs),'native-profile-functions-changed');f.objects.random=original;
  for(const options of [{changedRandom:true},{changedCapture:true},{cleanupFails:true}]){
    const bad=fixture({hall:true,...options});
    await assert.rejects(bad.review(bad.client,bad.held),options.cleanupFails?e=>e.code==='NATIVE_BINDING_CLEANUP_FAILED':/changed/);
    assert.ok(bad.released.includes('owned-label'));
  }
  await assert.rejects(f.review(f.client,{...f.held,payload:'<<pass 1>>'}),/not yet reviewed/);
});
test('native event continuation reuses receiving bindings without advancing time or pretending to satisfy the parent Goal',async()=>{
  const f=fixture({eventContinue:true}),environment=await f.review(f.client,f.held);
  assert.equal(f.timeCalls,0);assert.equal(environment.monitorIndex,undefined);
  const inputs=[{},f.objects[environment.arguments[1].objectId]];
  const guard=vm.runInNewContext(`(function(nativeEnvPhase,nativeEnvInputs){${environment.guard}})`,{window:f.window});
  assert.equal(guard('before',inputs),undefined);assert.equal(guard('after',inputs),undefined);
  f.window.SugarCube.State.variables.npc.push('Robin');
  assert.equal(guard('before',inputs),'native-hall-cleanup-unreviewed');
});
test('native Bedroom return reuses the receiving envelope with the same minute witness',async()=>{
  const f=fixture({bedroomReturn:true}),environment=await f.review(f.client,f.held);
  assert.equal(f.timeCalls,1);assert.equal(environment.monitorIndex,2);assert.equal(f.released.length,5);
  const inputs=[{},f.objects[environment.arguments[1].objectId],f.monitor];
  const guard=vm.runInNewContext(`(function(nativeEnvPhase,nativeEnvInputs){${environment.guard}})`,{window:f.window});
  assert.equal(guard('before',inputs),undefined);f.window.SugarCube.State.passage='Bedroom';assert.equal(guard('after',inputs),undefined);
  f.monitor.check=()=> 'changed';assert.equal(guard('after',inputs),'native-time-binding-changed');
  await assert.rejects(f.review(f.client,{...f.held,payload:''}),/not yet reviewed/);
});

test('native landing binds actual reviewed widgets and guards body, tags, scene, UI absence and save settings',async()=>{
  const f=fixture(),environment=await f.review(f.client,f.held);
  assert.deepEqual(f.released,['owned-npc']);assert.equal(environment.arguments.length,2);
  const inputs=[{},f.objects[environment.arguments[1].objectId]];
  const guard=vm.runInNewContext(`(function(nativeEnvPhase,nativeEnvInputs){${environment.guard}})`,{window:f.window});
  assert.equal(guard('before',inputs),undefined);
  f.window.SugarCube.State.passage='Orphanage Intro';assert.equal(guard('after',inputs),undefined);
  f.window.SugarCube.State.passage='Different';assert.equal(guard('after',inputs),'native-receiving-scene-unreviewed');
  f.window.SugarCube.State.passage='Orphanage Intro';f.passage.tags=['autosave'];assert.equal(guard('after',inputs),'native-profile-text-changed');f.passage.tags=[];
  f.passage.text+=' changed';assert.equal(guard('after',inputs),'native-profile-text-changed');f.passage.text=inputs[1].body;
  f.registry.npc.handler=function replaced(){};assert.equal(guard('after',inputs),'native-profile-owner-changed');f.registry.npc.handler=inputs[1].macros[1].handler;
  f.window.DoLGameUI={};assert.equal(guard('after',inputs),'native-profile-flags-changed');delete f.window.DoLGameUI;
  f.window.SugarCube.State.variables.options.autosaveDisabled=false;assert.equal(guard('after',inputs),'native-profile-flags-changed');
});

test('native landing refuses changed widget identity, preserves cleanup failure and does not widen its route',async()=>{
  const effects=fixture({changedEffects:true});await assert.rejects(effects.review(effects.client,effects.held),/effects handler changed during review/);assert.deepEqual(effects.released,['owned-npc']);
  const changed=fixture({changedHandler:true});await assert.rejects(changed.review(changed.client,changed.held),/widget handler changed/);assert.deepEqual(changed.released,['owned-npc']);
  const cleanup=fixture({cleanupFails:true});await assert.rejects(cleanup.review(cleanup.client,cleanup.held),e=>e.code==='NATIVE_BINDING_CLEANUP_FAILED');assert.deepEqual(cleanup.released,['owned-npc']);
  const route=fixture();await assert.rejects(route.review(route.client,{...route.held,payload:'<<pass 1>>'}),/not yet reviewed/);assert.deepEqual(route.released,[]);
});

test('first Bedroom entry retains five widgets and refuses branch and save gates',async()=>{
  const f=fixture({bedroom:true}),environment=await f.review(f.client,f.held);
  assert.deepEqual(f.released,['owned-bedclotheson','owned-home_effects','owned-getTarget','owned-wardrobeSelection','owned-updateWornClothingLocation']);
  const inputs=[{},f.objects[environment.arguments[1].objectId]];
  const guard=vm.runInNewContext(`(function(nativeEnvPhase,nativeEnvInputs){${environment.guard}})`,{window:f.window});
  assert.equal(guard('before',inputs),undefined);
  f.window.SugarCube.State.passage='Bedroom';assert.equal(guard('after',inputs),undefined);
  const v=f.window.SugarCube.State.variables;
  for(const [key,value] of [['stress',100],['stressmax',Infinity],['possessed',true],['passout',true],['combat',1],['replayScene',true],
    ['passageOverride','Elsewhere'],['christmas',1],['nextPassageCheck','Bed'],['robinbed','yours'],['study',1],['unbind',1],['wear_outfit','clotheson']]){
    const prior=v[key];v[key]=value;
    assert.equal(guard('after',inputs),'native-bedroom-first-entry-unreviewed',key);
    if(prior===undefined)delete v[key];else v[key]=prior;
  }
  for(const held of [{...f.held,before:{passage:'Other'}},{...f.held,destination:'Other'}])
    assert.equal((await f.review(f.client,held)).id,'generic-navigation-fixture');
  await assert.rejects(f.review(f.client,{...f.held,payload:'<<pass 1>>'}),/not yet reviewed/);
  const changed=fixture({bedroom:true,changedHandler:true});
  await assert.rejects(changed.review(changed.client,changed.held),/widget handler changed/);
  assert.equal(changed.released.length,5);
});

test('first Kitchen entry binds the reviewed function and time monitor without fallback',async()=>{
  const f=fixture({kitchen:true}),environment=await f.review(f.client,f.held);
  assert.equal(f.timeCalls,1);assert.equal(environment.monitorIndex,2);assert.equal(environment.monitorDigest,'b'.repeat(64));
  assert.equal(environment.arguments.length,3);assert.equal(environment.arguments[2].objectId,'monitor');
  assert.equal(f.released.length,8);assert.ok(f.released.includes('owned-kitchenFilter'));
  const inputs=[{},f.objects[environment.arguments[1].objectId],f.monitor];
  const guard=vm.runInNewContext(`(function(nativeEnvPhase,nativeEnvInputs){${environment.guard}})`,{window:f.window});
  assert.equal(guard('before',inputs),undefined);
  f.window.SugarCube.State.passage='Kitchen';assert.equal(guard('after',inputs),undefined);
  f.monitor.check=()=> 'changed';
  f.window.SugarCube.State.passage='Bedroom';assert.equal(guard('before',inputs),'native-time-binding-changed');
  f.window.SugarCube.State.passage='Kitchen';
  assert.equal(guard('after',inputs),'native-time-binding-changed');
  f.monitor.check=()=>undefined;
  const v=f.window.SugarCube.State.variables,t=f.window.SugarCube.State.temporary;
  for(const [owner,key,value] of [[v.daily.robin,'orphanageKitchen',1],[v,'lastRecipeViewed','recipe'],[v,'phase2',1],
    [t,'foodSearch',true],[v.foodstuff.bread,'knows_recipe',true]]){
    const prior=owner[key];owner[key]=value;
    f.window.SugarCube.State.passage='Bedroom';
    assert.equal(guard('before',inputs),'native-kitchen-first-entry-unreviewed',key);
    f.window.SugarCube.State.passage='Kitchen';
    assert.equal(guard('after',inputs),'native-kitchen-first-entry-unreviewed',key);
    if(prior===undefined)delete owner[key];else owner[key]=prior;
  }
  const wrongFunction=fixture({kitchen:true,changedFunction:true});
  await assert.rejects(wrongFunction.review(wrongFunction.client,wrongFunction.held),/widget handler changed/);
  assert.equal(wrongFunction.released.length,8);
  const failedTime=fixture({kitchen:true,timeBindFails:true});
  await assert.rejects(failedTime.review(failedTime.client,failedTime.held),/Time binding failed/);
  assert.equal(failedTime.timeCalls,1);assert.equal(failedTime.released.length,8);
  for(const held of [{...f.held,before:{passage:'Other'}},{...f.held,destination:'Other'}]){
    const route=fixture({kitchen:true});
    assert.equal((await route.review(route.client,held)).id,'generic-navigation-fixture');
    assert.equal(route.timeCalls,0);
  }
  await assert.rejects(f.review(f.client,{...f.held,payload:''}),/not yet reviewed/);
});
