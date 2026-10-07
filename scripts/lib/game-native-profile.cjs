'use strict';
const {bind}=require('./game-native-environment.cjs');
const profile=require('./game-native-profile.json');
const nativeIntro=require('./game-native-intro-profile.json');
const nativeBedroom=require('./game-native-bedroom-profile.json');
const nativeBedroomReturn={...nativeBedroom,id:'dol051213-native-bedroom-return-minute-v1',before:'Orphanage',payload:'<<pass 1>>',timeSeconds:60};
const nativeBedroomFromWardrobe={...nativeBedroom,id:'dol051213-native-bedroom-wardrobe-return-v1',before:'Wardrobe',payload:'<<cleanupOnWardrobeExit>>',timeSeconds:0,
  widgets:{...nativeBedroom.widgets,cleanupOnWardrobeExit:'7a9d7e768b59beb3ee231529ee5ab9c180a62acd358e751201dd116330b9c0a0'},
  handlerSha256:{...nativeBedroom.handlerSha256,cleanupOnWardrobeExit:nativeBedroom.handlerSha256.home_effects}};
const nativeKitchen=require('./game-native-kitchen-profile.json');
const nativeHall=require('./game-native-hall-profile.json');
const nativeHallContinue={...nativeHall,...nativeHall.continue};
const {checkHall}=require('./game-native-hall-state.cjs');
const daily=require('./game-native-daily-profile.json');
const {checkDaily}=require('./game-native-daily-state.cjs');
const nativeBathroom={...daily.bathroom,widgets:{...Object.fromEntries(['robinroom_link','home_outside'].map(k=>[k,nativeHall.widgets[k]])),...daily.bathroom.widgets},
  handlerSha256:{...Object.fromEntries(['robinroom_link','home_outside'].map(k=>[k,nativeHall.handlerSha256[k]])),...daily.bathroom.handlerSha256}};
const nativeBrush={...nativeHall,...daily.brush,widgets:{...nativeHall.widgets,...daily.brush.widgets},
  functionMacros:{...nativeHall.functionMacros,...daily.brush.functionMacros},functionCaptures:{...nativeHall.functionCaptures,...daily.brush.functionCaptures},
  globalFunctions:{...nativeHall.globalFunctions,...daily.brush.globalFunctions},handlerSha256:{...nativeHall.handlerSha256,...daily.brush.handlerSha256}};
const nativeBrushContinue={...nativeBathroom,...daily.continued,widgets:{...nativeBathroom.widgets,...daily.continued.widgets,...Object.fromEntries(['endevent','endnpc','clearnpc'].map(k=>[k,nativeHall.widgets[k]]))},
  handlerSha256:{...nativeBathroom.handlerSha256,...daily.continued.handlerSha256,...Object.fromEntries(['endevent','endnpc','clearnpc'].map(k=>[k,nativeHall.handlerSha256[k]]))},
  globalFunctions:{...nativeBathroom.globalFunctions,'EventSystem.clear':nativeHall.globalFunctions['EventSystem.clear']}};
const nativeHallFromBedroom={...nativeHall,id:'dol051213-native-hall-bedroom-event-v1',before:'Bedroom',payload:'<<pass 1>>'};
const nativeHallSettled={...nativeHallContinue,id:'dol051213-native-hall-settled-minute-v1',before:'Bedroom',payload:'<<pass 1>>',timeSeconds:60};
const nativeBedroomFromBathroom={...nativeBedroomReturn,id:'dol051213-native-bedroom-bathroom-minute-v1',before:'Bathroom'};
const garden=require('./game-native-garden-profile.json');
const {checkGarden,collectSeedRequirements,sameSeedRequirements}=require('./game-native-garden-state.cjs');
const hourly=require('./game-native-hour-profile.json');
const {checkHour}=require('./game-native-hour-state.cjs');
const nativeGarden={...garden.garden,widgets:{home_effects:nativeBedroom.widgets.home_effects,...garden.garden.widgets},
  handlerSha256:{home_effects:nativeBedroom.handlerSha256.home_effects,...garden.garden.handlerSha256}};
const nativeFlowers={...garden.flowers,widgets:{...garden.flowers.widgets,tendingPlantSeedsOptions:garden.till.widgets.tendingPlantSeedsOptions},
  handlerSha256:{...garden.flowers.handlerSha256,tendingPlantSeedsOptions:garden.till.handlerSha256.tendingPlantSeedsOptions}};
const nativeTill={...nativeFlowers,...garden.till,widgets:{...nativeFlowers.widgets,...garden.till.widgets},
  handlerSha256:{...nativeFlowers.handlerSha256,...garden.till.handlerSha256,wearProp:daily.brush.handlerSha256.wearProp},
  functionMacros:{...garden.till.functionMacros,wearProp:daily.brush.functionMacros.wearProp},
  globalFunctions:{...nativeFlowers.globalFunctions,...garden.till.globalFunctions,...Object.fromEntries(['normaliseKey','removeDiacritics','normaliseFileName'].map(k=>[k,daily.brush.globalFunctions[k]]))}};
const nativeSeeds=garden.seeds;
const nativeFlowersFromSeeds={...nativeFlowers,id:'dol051213-native-flowers-seeds-return-v1',before:'Garden Flowers Seeds'};
const nativeGardenFromFlowers={...nativeGarden,id:'dol051213-native-garden-flowers-return-v1',before:'Garden Flowers',payload:'<<endevent>>',timeSeconds:0,
  widgets:{...nativeGarden.widgets,...Object.fromEntries(['endevent','endnpc','clearnpc'].map(k=>[k,nativeHall.widgets[k]]))},
  handlerSha256:{...nativeGarden.handlerSha256,...Object.fromEntries(['endevent','endnpc','clearnpc'].map(k=>[k,nativeHall.handlerSha256[k]]))},
  globalFunctions:{...nativeGarden.globalFunctions,'EventSystem.clear':nativeHall.globalFunctions['EventSystem.clear']}};
const nativeHallFromGarden={...nativeHallSettled,id:'dol051213-native-hall-garden-minute-v1',before:'Garden'};
const street=require('./game-native-street-profile.json'),{checkStreet}=require('./game-native-street-state.cjs');
const nativeStreet={...nativeHall,...street,widgets:{...nativeHall.widgets,...street.widgets},
  handlerSha256:{...nativeHall.handlerSha256,...street.handlerSha256},globalFunctions:{...nativeHall.globalFunctions,...street.globalFunctions}};
const {createHash}=require('node:crypto');
const {attestWidget,attestFunctionMacro,captured,functionSource,member,sameObject}=require('./game-contract.cjs');
const sha=s=>createHash('sha256').update(s).digest('hex');

// Finite native landings independent of UI/Maple. This is a receiving envelope,
// not a Journey controller; other scenes need their own relevant evidence.
async function reviewNativeLanding(client,held,landing) {
  const duration=(landing.timeSeconds||0)/60;
  const crossHour=duration>0&&await client.evaluate(`Time.minute+${duration}>=60`);
  const reviewed={...nativeIntro,...landing,widgets:{...landing.widgets,...(crossHour?hourly.widgets:{})},
    handlerSha256:{effects:nativeIntro.handlerSha256.effects,...landing.handlerSha256,...(crossHour?hourly.handlerSha256:{})},
    functionMacros:{...landing.functionMacros,...(crossHour?hourly.functionMacros:{})},
    globalFunctions:{...landing.globalFunctions,...(crossHour?hourly.globalFunctions:{})}};
  const before=landing.before||'Start2';
  if(held.before.passage!==before||held.destination!==reviewed.receiving.passage||held.payload.trim()!==(landing.payload||''))
    throw Error('Native destination/payload not yet reviewed');
  const environment=await bind(client,held,reviewed);
  const widgets=[],globals=[],closures=[];let failure;
  async function retainCaptured(id,captures){
    for(const [key,expected] of Object.entries(captures||{})){
      const path=key.split('.');
      if(path.length>3||path.some(k=>!/^[A-Za-z][A-Za-z0-9_]*$/.test(k)))throw Error('Invalid native capture profile');
      let functionId=id;for(const part of path)functionId=await captured(client,functionId,part,'function');
      if(sha(await functionSource(client,functionId))!==expected)throw Error('Native captured function changed');
      closures.push({functionId});
    }
  }
  try {
  for(const [name,hash] of Object.entries(reviewed.widgets))
    widgets.push(await attestWidget(client,name,hash,{handlerSha256:reviewed.handlerSha256[name],retain:true}));
  for(const [name,hash] of Object.entries(reviewed.functionMacros)){
    const widget=await attestFunctionMacro(client,name,hash,{handlerSha256:reviewed.handlerSha256[name],retain:true});
    widgets.push(widget);
    await retainCaptured(widget.functionId,landing.functionCaptures?.[name]);
  }
  for(const [name,hash] of Object.entries(reviewed.globalFunctions)){
    // These are reviewed local profile names, never model-supplied expressions.
    if(name.length>128||!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)*$/.test(name)||!/^[a-f0-9]{64}$/.test(hash))throw Error('Invalid native function profile');
    const expression=`window.SugarCube.Scripting.evalJavaScript(${JSON.stringify(name)})`;
    const r=await client.send('Runtime.evaluate',{expression,objectGroup:held.objectGroup,returnByValue:false,silent:true});
    if(r.exceptionDetails||r.result?.type!=='function'||!r.result.objectId||sha(await functionSource(client,r.result.objectId))!==hash)
      throw Error('Native receiving function changed');
    globals.push({name,objectId:r.result.objectId});
    await retainCaptured(r.result.objectId,landing.globalCaptures?.[name]);
  }
  if(landing===nativeHall||landing===nativeHallFromBedroom||landing===nativeStreet){
    const r=await client.send('Runtime.evaluate',{expression:'window.SugarCube.Macro.get("rng").handler',objectGroup:held.objectGroup,returnByValue:false,silent:true});
    if(r.exceptionDetails||r.result?.type!=='function'||!r.result.objectId)throw Error('Native RNG handler unavailable');
    const random=await captured(client,r.result.objectId,'random','function',{maxResponseBytes:16*1024*1024});
    if(!await sameObject(client,random,globals.find(g=>g.name==='random').objectId))throw Error('Native RNG lexical owner changed');
  }
  if(landing===nativeBrush){
    const r=await client.send('Runtime.evaluate',{expression:'window.SugarCube.Macro.get("runeventpool").handler',objectGroup:held.objectGroup,returnByValue:false,silent:true});
    if(r.exceptionDetails||r.result?.type!=='function'||!r.result.objectId)throw Error('Native event pool handler unavailable');
    const weighted=await captured(client,r.result.objectId,'rollWeightedRandomFromArray','function',{maxResponseBytes:16*1024*1024});
    if(!await sameObject(client,weighted,globals.find(g=>g.name==='rollWeightedRandomFromArray').objectId))throw Error('Native event pool lexical owner changed');
    const float=await captured(client,weighted,'randomFloat','function',{maxResponseBytes:16*1024*1024});
    if(!await sameObject(client,float,globals.find(g=>g.name==='randomFloat').objectId))throw Error('Native event pool RNG owner changed');
    const state=await captured(client,float,'State','object',{maxResponseBytes:16*1024*1024});
    const actual=await member(client,float,'window.SugarCube.State',held.objectGroup);
    if(!await sameObject(client,state,actual))throw Error('Native event pool State owner changed');
  }
  const r=await client.send('Runtime.evaluate',{expression:'window.SugarCube.Macro.get("effects").handler',returnByValue:false,objectGroup:held.objectGroup,silent:true});
  if(r.exceptionDetails||!r.result?.objectId||sha(await functionSource(client,r.result.objectId))!==reviewed.handlerSha256.effects)
    throw Error('Native effects handler changed');
  const effects=await captured(client,r.result.objectId,'effects');
  let streetRefs=[];
  if(landing===nativeStreet){
    const proxy=await client.send('Runtime.evaluate',{expression:'Time.isBloodMoon',objectGroup:held.objectGroup,returnByValue:false,silent:true});
    if(proxy.exceptionDetails||proxy.result?.type!=='function'||!proxy.result.objectId)throw Error('Native street clock unavailable');
    const value=await captured(client,proxy.result.objectId,'value'),target=await captured(client,proxy.result.objectId,'target','object');
    if(sha(await functionSource(client,value))!==street.bloodMoonSha256||!await sameObject(client,value,await member(client,target,'this.isBloodMoon',held.objectGroup)))throw Error('Native street clock differs');
    const inactive=await captured(client,globals.find(g=>g.name==='getKylarLocation').objectId,'InactiveLocation','object');
    streetRefs=[{objectId:target},{objectId:value},{objectId:inactive}];
  }
  const functionMacros=[...widgets.filter(r=>r.functionId),...closures];
  const bundle=await client.send('Runtime.callFunctionOn',{objectId:effects,objectGroup:held.objectGroup,returnByValue:false,
    arguments:[...functionMacros.map(r=>({objectId:r.functionId})),...globals.map(r=>({objectId:r.objectId})),...streetRefs],functionDeclaration:`function(){
    const sc=window.SugarCube,p=sc.Story.get(${JSON.stringify(reviewed.receiving.passage)}),source=Function.prototype.toString.call(this);
    if(typeof p.text!=='string'||p.text.length>32768||!Array.isArray(p.tags)||p.tags.length>16||source.length>65536)throw Error('Native receiving bound');
    const macros=${JSON.stringify(Object.keys(reviewed.handlerSha256))}.map(name=>Object.freeze({name,handler:sc.Macro.get(name)?.handler}));
    const args=Array.from(arguments),functions=args.slice(0,${functionMacros.length}).map(value=>Object.freeze({value,source:Function.prototype.toString.call(value)}));
    const globals=args.slice(${functionMacros.length},${functionMacros.length+globals.length}).map((value,i)=>Object.freeze({name:${JSON.stringify(globals.map(g=>g.name))}[i],value,source:Function.prototype.toString.call(value)}));
    return Object.freeze({body:p.text,tags:JSON.stringify(p.tags),effects:this,source,macros:Object.freeze(macros),functions:Object.freeze(functions),globals:Object.freeze(globals)
      ${landing===nativeSeeds?`,seedRequirements:(${collectSeedRequirements.toString()})()`:''}
      ${landing===nativeTill?`,tilled:sc.State.variables.plots.garden.filter(p=>p.till===1).length`:''}
      ${landing===nativeStreet?`,street:Object.freeze({target:args[${functionMacros.length+globals.length}],bloodMoon:args[${functionMacros.length+globals.length+1}],
        source:Function.prototype.toString.call(args[${functionMacros.length+globals.length+1}]),inactive:args[${functionMacros.length+globals.length+2}]})`:''}});
  }`});
  if(bundle.exceptionDetails||!bundle.result?.objectId)throw Error('Native receiving bundle unavailable');
  const objectId=bundle.result.objectId;
  const currentEffects=await member(client,objectId,'this.macros[0].handler',held.objectGroup);
  if(!await sameObject(client,r.result.objectId,currentEffects))throw Error('Native effects handler changed during review');
  for(const widget of widgets){
    const index=Object.keys(reviewed.handlerSha256).indexOf(widget.name);
    const current=await member(client,objectId,`this.macros[${index}].handler`,held.objectGroup);
    if(!await sameObject(client,widget.objectId,current))throw Error('Native widget handler changed during review');
  }
  const metadata=await client.send('Runtime.callFunctionOn',{objectId,returnByValue:true,functionDeclaration:`function(){return {body:this.body,tags:this.tags,source:this.source,handlers:this.macros.map(r=>({name:r.name,source:typeof r.handler==='function'?Function.prototype.toString.call(r.handler):null}))
    ${landing===nativeSeeds?`,seedRequirements:Object.fromEntries(['items','sets'].map(k=>[k,this.seedRequirements[k].map(({name,sets,source})=>({name,...(sets===undefined?{}:{sets:JSON.parse(sets)}),source}))]))`:''}}}`});
  const value=metadata.result?.value;
  if(metadata.exceptionDetails||!value||typeof value.body!=='string'||sha(value.body)!==reviewed.receiving.sha256||
    value.tags!==reviewed.receiving.tags||typeof value.source!=='string'||sha(value.source)!==reviewed.effectsSha256||
    !Array.isArray(value.handlers)||value.handlers.length!==Object.keys(reviewed.handlerSha256).length||
    value.handlers.some((r,i)=>r.name!==Object.keys(reviewed.handlerSha256)[i]||typeof r.source!=='string'||sha(r.source)!==reviewed.handlerSha256[r.name]))
    throw Error('Native receiving evidence changed');
  if(landing===nativeSeeds&&sha(JSON.stringify(value.seedRequirements))!==landing.seedRequirementsSha256)throw Error('Native seed requirements changed');
  environment.arguments.push({objectId});
  if(landing===nativeKitchen||landing.timeSeconds>0){
    const monitor=await require('./game-native-time.cjs').bind(client,held,{minutes:(landing.timeSeconds||60)/60,allowHourCrossing:crossHour});
    environment.monitorIndex=environment.arguments.length;
    environment.monitorDigest=monitor.digest;
    environment.arguments.push({objectId:monitor.objectId});
  }
  environment.guard=`const sc=window.SugarCube,scene=sc.State,e=nativeEnvInputs[1],p=sc.Story.get(${JSON.stringify(reviewed.receiving.passage)});
    ${crossHour?`const hourReason=(${checkHour.toString()})(nativeEnvPhase);if(hourReason!==undefined)return hourReason;`:''}
    if(typeof window.DoLGameUI!=='undefined'||scene.variables.options?.autosaveDisabled!==true||scene.variables.ironmanmode!==false)return 'native-profile-flags-changed';
    if(nativeEnvPhase==='after'?scene.passage!==${JSON.stringify(reviewed.receiving.passage)}:scene.passage!==${JSON.stringify(before)})return 'native-receiving-scene-unreviewed';
    ${[nativeBedroom,nativeBedroomReturn,nativeBedroomFromBathroom,nativeBedroomFromWardrobe].includes(landing)?`const v=scene.variables;
    if(!Number.isFinite(v.stress)||!Number.isFinite(v.stressmax)||v.stress>=v.stressmax||v.possessed||v.passout||v.combat||v.replayScene||v.passageOverride||v.christmas||v.nextPassageCheck||
       v.robinbed==='yours'||v.study===1||v.unbind===1||v.wear_outfit!=='none')return 'native-bedroom-first-entry-unreviewed';`:''}
    ${landing===nativeBedroomFromWardrobe?`if(nativeEnvPhase==='before'&&['clothingshop','baitShop'].includes(scene.variables.bus))return 'native-wardrobe-bus-reset-unreviewed';`:''}
    ${landing===nativeKitchen?`const v=scene.variables;
    if(v.daily?.robin?.orphanageKitchen||v.lastRecipeViewed||v.phase2||scene.temporary.foodSearch||
       Object.values(v.foodstuff).some(r=>r.knows_recipe))return 'native-kitchen-first-entry-unreviewed';`:''}
    ${[nativeHall,nativeHallFromBedroom,nativeHallContinue,nativeHallSettled,nativeHallFromGarden].includes(landing)?`const hallReason=(${checkHall.toString()})(nativeEnvPhase,${landing===nativeHallContinue||landing===nativeHallSettled||landing===nativeHallFromGarden});if(hallReason!==undefined)return hallReason;
    `:''}
    ${landing===nativeStreet?`const streetReason=(${checkStreet.toString()})(nativeEnvPhase);if(streetReason!==undefined)return streetReason;
    const timeAddon=window.modSC2DataManager.sc2EventTracer.callback[0].addonPluginTable.find(r=>r.modName==='DoLTimeWrapperAddon').hookPoint.timeWrapperAddon;
    if(timeAddon._timeProxyManager.originTime!==e.street.target||e.street.target.isBloodMoon!==e.street.bloodMoon||Function.prototype.toString.call(e.street.bloodMoon)!==e.street.source||
       JSON.stringify(e.street.inactive)!=='{"area":"inactive","state":"inactive"}')return 'native-first-street-clock-or-location-changed';`:''}
    ${[nativeBathroom,nativeBrush,nativeBrushContinue].includes(landing)?`const dailyReason=(${checkDaily.toString()})(nativeEnvPhase,${JSON.stringify(landing===nativeBathroom?'bathroom':landing===nativeBrush?'brush':'continued')});if(dailyReason!==undefined)return dailyReason;`:''}
    ${[nativeGarden,nativeGardenFromFlowers,nativeFlowers,nativeFlowersFromSeeds,nativeSeeds,nativeTill].includes(landing)?`const gardenReason=(${checkGarden.toString()})(nativeEnvPhase,${JSON.stringify(landing===nativeTill?'till':landing===nativeSeeds?'seeds':[nativeGarden,nativeGardenFromFlowers].includes(landing)?'garden':'flowers')});if(gardenReason!==undefined)return gardenReason;`:''}
    ${landing===nativeTill?`if(!Number.isSafeInteger(e.tilled)||e.tilled<0||e.tilled>=3||scene.variables.plots.garden.filter(p=>p.till===1).length!==e.tilled+(nativeEnvPhase==='after'?1:0))return 'native-till-result-unavailable';`:''}
    ${landing===nativeSeeds?`if(!(${sameSeedRequirements.toString()})(e.seedRequirements,(${collectSeedRequirements.toString()})()))return 'native-seed-requirements-changed';`:''}
    ${environment.monitorIndex!==undefined?`if(nativeEnvInputs[${environment.monitorIndex}].check()!==undefined)return 'native-time-binding-changed';`:''}
    if(p.text!==e.body||JSON.stringify(p.tags)!==e.tags)return 'native-profile-text-changed';
    if(e.macros.some(r=>sc.Macro.get(r.name)?.handler!==r.handler))return 'native-profile-owner-changed';
    if(Function.prototype.toString.call(e.effects)!==e.source)return 'native-profile-functions-changed';
    if(e.functions.some(r=>Function.prototype.toString.call(r.value)!==r.source))return 'native-profile-functions-changed';
    ${globals.length?`if(e.globals.some(r=>r.value!==sc.Scripting.evalJavaScript(r.name)||Function.prototype.toString.call(r.value)!==r.source))return 'native-profile-functions-changed';`:''}
    ${environment.guard}`;
  return environment;
  } catch(error) {failure=error;throw error}
  finally {
    const errors=[];
    for(const widget of widgets)try{await client.send('Runtime.releaseObjectGroup',{objectGroup:widget.objectGroup})}catch(error){errors.push(error)}
    if(errors.length)throw Object.assign(new AggregateError([...(failure?[failure]:[]),...errors],'Native widget binding cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'});
  }
}

// Specific activity envelopes keep their stronger business proof. Ordinary
// navigation reuses the original engine/Scene contract instead of a route list.
async function review(client,held) {
  if(await client.evaluate('typeof window.DoLGameUI==="undefined"')){
    const landings=[nativeIntro,nativeBedroom,nativeBedroomReturn,nativeBedroomFromBathroom,nativeBedroomFromWardrobe,nativeKitchen,
      nativeHall,nativeHallFromBedroom,nativeHallContinue,nativeHallSettled,nativeBathroom,nativeBrush,nativeBrushContinue,
      nativeGarden,nativeFlowers,nativeHallFromGarden,nativeSeeds,nativeFlowersFromSeeds,nativeGardenFromFlowers,nativeTill,nativeStreet];
    const homeEventDone=held.before.passage==='Bedroom'&&held.destination==='Orphanage'?
      await client.evaluate('window.SugarCube.State.variables.daily?.homeEvent===1'):false;
    const route=landings.find(r=>(r.before||'Start2')===held.before.passage&&r.receiving.passage===held.destination&&
      (r===nativeHallFromBedroom?!homeEventDone:r===nativeHallSettled?homeEventDone:true));
    const ordinaryStreet=route===nativeStreet&&await client.evaluate('window.SugarCube.State.variables.tutorial===1');
    // A changed known activity cannot downgrade itself to a navigation proof.
    if(route&&!ordinaryStreet&&held.payload.trim()!==(route.payload||''))throw Error('Native destination/payload not yet reviewed');
    // Ordinary navigation has its own engine/history/Scene Outcome. It does
    // not need a bespoke handler for every newly encountered Passage, and it
    // cannot certify a domain activity or settle an older unresolved action.
    if(!route||ordinaryStreet)
      return require('./game-native-generic-landing.cjs').review(client,held);
    return reviewNativeLanding(client,held,route);
  }
  const cleanup=held.before.passage==='Wardrobe'&&held.payloadSha256==='977ccb610b9cdb5931d651de1390c4bcaf15768d8b4c9ba5ca3908e49ccba63e';
  if(held.destination!=='Bedroom'||held.payload.trim()!==''&&!cleanup)throw Error('Native destination/payload not yet reviewed');
  if(cleanup)await require('./game-contract.cjs').attestWidget(client,'cleanupOnWardrobeExit','7a9d7e768b59beb3ee231529ee5ab9c180a62acd358e751201dd116330b9c0a0');
  const environment=await bind(client,held,profile);
  // The operation closes a finite actual navigation, never the whole Mod world.
  // A different receiving Scene stays unknown until its own envelope is reviewed.
  environment.guard=`const scene=window.SugarCube.State;
    if(nativeEnvPhase==='after'?scene.passage!=="Bedroom":scene.passage!==${JSON.stringify(held.before.passage)})return 'native-receiving-scene-unreviewed';
    ${environment.guard}`;
  return environment;
}
// Read-only recovery reuses the same receiver/source review. It cannot dispatch
// a control or certify a different legacy contract.
async function reviewClosedStreet(client,held){
  if(held.legacyContract!=='native-passage-8128aafb01db')throw Error('Unreviewed legacy street contract');
  return reviewNativeLanding(client,held,nativeStreet);
}
module.exports={review,reviewClosedStreet};
