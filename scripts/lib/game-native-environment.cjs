'use strict';
// First representative native environment inventory. This reads real owners;
// it never invokes original handlers, widgets, game actions or save operations.
// Eligibility is a local reviewed profile, not a Runtime-wide gameplay rule.
function collect() {
  const sc=window.SugarCube,jq=window.jQuery,v=sc?.State?.variables;
  if(!sc||!jq||!v)throw Error('Native environment unavailable');
  const refs=[],texts=[],owners=[],phases=['passageinit','passagestart','passagerender','passagedisplay','passageend'];
  // Exact public lifecycle spellings; do not derive aliases from display text.
  const hooks=['whenSC2PassageInit','whenSC2PassageStart','whenSC2PassageRender','whenSC2PassageDisplay','whenSC2PassageEnd'];
  const fn=(name,value,mode='identity',meta=null)=>{
    if(value!==undefined&&typeof value!=='function')throw Error('Unexpected native function kind: '+name);
    refs.push({name,value,mode,meta});
  };
  const text=(name,value)=>{if(typeof value!=='string'||value.length>32768)throw Error('Native text bound: '+name);texts.push({name,value})};
  const own=(object,key)=>{const d=object&&Object.getOwnPropertyDescriptor(object,key);if(!d||!Object.hasOwn(d,'value'))throw Error('Native own data field unavailable: '+key);return d.value};
  const owner=(name,value)=>{if(!value||!['object','function'].includes(typeof value))throw Error('Native owner unavailable: '+name);owners.push({name,value})};
  const footer=sc.Story.get('PassageFooter'),header=sc.Story.get('PassageHeader');
  fn('jq.trigger',jq.event.trigger);fn('footer.processText',footer.processText);fn('header.processText',header.processText);
  fn('config.onProcess',sc.Config.passages.onProcess);fn('config.navigation',sc.Config.navigation.override);fn('engine.isIdle',sc.Engine.isIdle);
  text('PassageHeader',header.text);text('PassageFooter',footer.text);
  text('Bedroom',sc.Story.get('Bedroom').text);text('StoryCaption',sc.Story.get('StoryCaption').text);
  fn('uibar.update',sc.UIBar.update);
  for(const name of ['maplebirchHeader','maplebirchFooter','CE_CheatExtendedVersion','CEstatebox','CE_sideBarIcon','CE_originalCheatButton','cleanupOnWardrobeExit','pass'])fn('macro.'+name,sc.Macro.get(name)?.handler);
  const events=jq._data(document,'events');
  const phaseShape=[];
  for(const phase of [...phases,'passageoverride','historyupdate']){
    const handlers=events?.[':'+phase]||[];if(!Array.isArray(handlers)||handlers.length>24)throw Error('Native event bound');
    phaseShape.push({name:phase,count:handlers.length});
    Array.from(handlers).forEach((h,index)=>{
      if(!h||typeof h.handler!=='function'||h.selector!==undefined&&h.selector!==null&&typeof h.selector!=='string')throw Error('Event registration unavailable');
      fn('event.'+phase+'.'+index,h.handler,'event',{phase,namespace:h.namespace||'',selector:h.selector??null});
    });
  }
  const windowHistory=jq._data(window,'events')?.[':historyupdate']||[];
  if(!Array.isArray(windowHistory)||windowHistory.length>24)throw Error('Native window event bound');
  phaseShape.push({name:'window.historyupdate',count:windowHistory.length});
  Array.from(windowHistory).forEach((h,index)=>{
    if(!h||typeof h.handler!=='function')throw Error('Window event registration unavailable');
    fn('event.window.historyupdate.'+index,h.handler,'event',{phase:'window.historyupdate',namespace:h.namespace||'',selector:h.selector??null});
  });
  const manager=window.modSC2DataManager,tracer=manager?.sc2EventTracer,callbacks=manager===undefined?[]:tracer?.callback;
  if(manager!==undefined)owner('sc2.tracer',tracer);
  if(!Array.isArray(callbacks)||callbacks.length>8)throw Error('Native callback bound');
  callbacks.forEach((owner,index)=>{if(!owner||typeof owner!=='object')throw Error('Native callback owner unavailable');
    owners.push({name:'sc2.'+index,value:owner});
    for(const hook of hooks)fn('sc2.'+index+'.'+hook,owner[hook]);
  });
  const addon=callbacks[0]??null,table=addon===null?[]:addon.addonPluginTable;
  if(!Array.isArray(table)||table.length>32)throw Error('Native addon bound');
  const tableShape=[];
  const addonInitialized=[];
  table.forEach((record,index)=>{
    if(!record||typeof record.modName!=='string'||record.modName.length>128||!record.hookPoint)throw Error('Addon owner unavailable');
    tableShape.push(record.modName);
    owner('addon.'+index,record.hookPoint);
    for(const hook of hooks)fn('addon.'+index+'.'+hook,record.hookPoint[hook]);
    if(['ModdedClothesAddon','ModdedHairAddon','ModdedFeatsAddon'].includes(record.modName)){
      addonInitialized.push({name:record.modName,isInit:record.hookPoint.isInit});
      fn('addon.'+index+'.init',record.hookPoint.init);
    }
  });
  fn('addon.trigger',addon?.triggerHookWhenSC2);
  const matches=table.filter(r=>r.modName==='maplebirch');
  // Native gameplay does not require Maple or any UI Runtime. Present Maple
  // hooks retain their reviewed extended inventory; absent hooks are absent.
  if(matches.length===0){
    if(refs.length>320)throw Error('Native function inventory bound');
    const flags={autosaveDisabled:v.options?.autosaveDisabled===true,ironmanmode:v.ironmanmode===true,
      engineAutosave:sc.Config.saves.autosave,updateStoryElements:sc.Config.ui.updateStoryElements,
      specialPassages:['PassageReady','PassageDone','StoryDisplayTitle','StoryBanner','StorySubtitle','StoryAuthor','StoryMenu'].map(name=>({name,exists:sc.Story.has(name)})),
      phaseShape,tableShape,sc2Count:callbacks.length,addonInitialized,ceToggle:v.CE_Toggle,
      wearOutfit:v.wear_outfit,possessed:!!v.possessed,passout:!!v.passout,combat:v.combat===1,
      replayScene:!!v.replayScene,pageLoading:window.pageLoading};
    return {refs,texts,flags:JSON.parse(JSON.stringify(flags)),owners,jq,footer,addon,blocked:null};
  }
  if(matches.length!==1)throw Error('Maple owner unavailable');
  const maple=matches[0].hookPoint,registry=maple.modules.registry;
  owner('maple.modules',maple.modules);owner('maple.events',maple.events);
  const modules=registry.modules,states=registry.states;
  if(!(modules instanceof Map)||!(states instanceof Map)||modules.size>16||states.size>16)throw Error('Maple module bound');
  for(const name of ['run','init','phase','execute','topologicalOrder','ready'])fn('maple.modules.'+name,maple.modules[name]);
  for(const name of ['trigger','pending'])fn('maple.events.'+name,maple.events[name]);
  const moduleShape=[];
  for(const [key,owner] of modules){
    if(typeof key!=='string'||key.length>64)throw Error('Maple module identity unavailable');
    moduleShape.push({name:key,state:states.get(key)});
    owners.push({name:'maple.module.'+key,value:owner});
    for(const name of ['preInit','Init','postInit'])fn('maple.module.'+key+'.'+name,owner[name]);
  }
  const mapleEvents=[];
  for(const phase of phases){
    const key=':'+phase,entries=maple.events.events.get(key)||[];if(!Array.isArray(entries)||entries.length>16)throw Error('Maple event bound');
    mapleEvents.push({phase,count:entries.length});entries.forEach((e,index)=>fn('maple.event.'+phase+'.'+index,e.callback));
  }
  const dynamic=modules.get('dynamic'),items=own(dynamic,'items');if(!(items instanceof Map))throw Error('Dynamic item registry unavailable');
  const dynamicState=items.get('State'),stateEvents=own(dynamicState,'stateEvents');
  owner('maple.state',dynamicState);owner('maple.stateEvents',stateEvents);
  const gate=own(own(stateEvents,'gate'),'items'),append=own(own(stateEvents,'append'),'items');
  if(!(gate instanceof Map)||!(append instanceof Map)||gate.size>8||append.size>8)throw Error('State event bound');
  fn('maple.dynamic.trigger',dynamic.trigger);fn('maple.state.trigger',dynamicState.trigger);
  fn('maple.state.gate',dynamicState.processGateEvents);fn('maple.state.append',dynamicState.processAppendEvents);
  const notice=gate.get('notice');
  owner('maple.notice',notice);
  if(!notice||typeof notice!=='object')throw Error('Native notice unavailable');
  for(const name of ['cond','matches','match','checkPassage','evaluate','run','tryRun'])fn('maple.notice.'+name,notice[name]);
  const zone=dynamic.core.tool.zone;
  owner('maple.zone',zone);
  for(const name of ['play','render'])fn('maple.zone.'+name,zone[name]);
  const zoneShape=['Header','Footer','CustomLinkZone','CaptionDescription','CaptionAfterDescription','StatusBar','MenuBig','MenuSmall'].map(name=>{
    const value=own(zone.data,name);if(!Array.isArray(value)||value.length>8||value.some(x=>typeof x!=='string'||x.length>128))throw Error('Relevant zone contribution unavailable');
    return{name,entries:value.slice()};
  });
  const blocked=maple.blockedPassages;if(!(blocked instanceof Set))throw Error('Maple passage exclusions unavailable');
  if(refs.length>320)throw Error('Native function inventory bound');
  const flags={autosaveDisabled:v.options?.autosaveDisabled===true,ironmanmode:v.ironmanmode===true,
    engineAutosave:sc.Config.saves.autosave,updateStoryElements:sc.Config.ui.updateStoryElements,
    specialPassages:['PassageReady','PassageDone','StoryDisplayTitle','StoryBanner','StorySubtitle','StoryAuthor','StoryMenu'].map(name=>({name,exists:sc.Story.has(name)})),
    mapleOnStart:maple.onStart,maplePreInit:maple.modules.initPhase?.preInitCompleted,mapleMainInit:maple.modules.initPhase?.mainInitCompleted,
    mapleStoredVersion:v.maplebirch?.version,mapleModuleVersion:modules.get('var')?.version,
    mapleAfters:Array.from(maple.events.afters?.keys?.()||[]).filter(key=>typeof key==='string'&&key.startsWith(':passage')),
    gateKeys:[...gate.keys()],appendKeys:[...append.keys()],noticeActive:'true'===localStorage.getItem('verifiedAge')&&!localStorage.getItem('maplebirchFrameworkNotice'),
    noticePassages:notice.extra?.passage,noticeAction:typeof notice.action,noticeOutput:notice.output,
    zoneShape,phaseShape,moduleShape,mapleEvents,tableShape,sc2Count:callbacks.length,
    addonInitialized,ceToggle:v.CE_Toggle,
    wearOutfit:v.wear_outfit,possessed:!!v.possessed,passout:!!v.passout,combat:v.combat===1,
    replayScene:!!v.replayScene,pageLoading:window.pageLoading};
  return {refs,texts,flags:JSON.parse(JSON.stringify(flags)),owners,jq,footer,addon,blocked};
}

// Only the reviewed tooltip handler may move in its phase: it off/on registers
// itself during a normal render. All other event ordering remains significant.
function ordered(refs) {
  return [...refs.filter(r=>r.mode!=='event'),...refs.filter(r=>r.mode==='event'&&r.value?.name!=='updateCaptionTooltip'),
    ...refs.filter(r=>r.mode==='event'&&r.value?.name==='updateCaptionTooltip')];
}
function tooltipMovesAllowed(current,before) {
  const name=r=>r.functionName??r.value?.name;
  const phases=new Set(before.filter(r=>r.mode==='event').map(r=>r.meta?.phase));
  for(const phase of phases){
    const old=before.filter(r=>r.mode==='event'&&r.meta?.phase===phase),rows=current.filter(r=>r.mode==='event'&&r.meta?.phase===phase);
    const previous=old.findIndex(r=>name(r)==='updateCaptionTooltip'),now=rows.findIndex(r=>name(r)==='updateCaptionTooltip');
    if(previous!==now&&(phase!=='passageend'||previous<0||now!==rows.length-1))return false;
  }
  return true;
}
const sameFlags=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
function check(current, before,flagsMatch=(a,b)=>JSON.stringify(a)===JSON.stringify(b)) {
  if(flagsMatch(current.flags,before.flags)!==true)return 'native-profile-flags-changed';
  if(current.jq!==before.jq||current.footer!==before.footer||current.addon!==before.addon||current.blocked!==before.blocked)
    return 'native-profile-owner-changed';
  if(current.owners.length!==before.owners.length||current.owners.some((r,i)=>r.name!==before.owners[i].name||r.value!==before.owners[i].value))
    return 'native-profile-owner-changed';
  if(current.texts.length!==before.texts.length||current.texts.some((r,i)=>r.name!==before.texts[i].name||r.value!==before.texts[i].value))
    return 'native-profile-text-changed';
  const actual=ordered(current.refs),expected=ordered(before.refs);
  if(!tooltipMovesAllowed(current.refs,before.refs)||actual.length!==expected.length||actual.some((r,i)=>{
    const old=expected[i];
    return r.mode!==old.mode||(r.mode!=='event'&&r.name!==old.name)||JSON.stringify(r.meta)!==JSON.stringify(old.meta)||
      r.value!==old.value||(typeof r.value==='function'?Function.prototype.toString.call(r.value):null)!==old.source;
  }))return 'native-profile-functions-changed';
}
// Capture sources with the owned bundle, not inside the serialized operation.
// The host compares their hashes with reviewed evidence before accepting it.
function capture() {
  const snapshot=collect();
  for(const row of snapshot.refs){
    row.source=typeof row.value==='function'?Function.prototype.toString.call(row.value):null;
    if(row.source!==null&&row.source.length>32768)throw Error('Native function source bound');
    Object.freeze(row);
  }
  for(const row of snapshot.owners)Object.freeze(row);
  for(const row of snapshot.texts)Object.freeze(row);
  Object.freeze(snapshot.refs);Object.freeze(snapshot.owners);Object.freeze(snapshot.texts);
  return Object.freeze(snapshot);
}
function metadata() {
  return {hasAddon:this.addon!==null,flags:this.flags,functions:this.refs.map(({name,mode,meta,source,value})=>({name,mode,meta,source,functionName:value?.name??null})),texts:this.texts};
}
function normalizedMetadata(rows) {
  const clean=r=>r.mode==='event'?{...r,name:undefined}:r;
  return [...rows.filter(r=>r.mode!=='event'),...rows.filter(r=>r.mode==='event'&&r.functionName!=='updateCaptionTooltip'),
    ...rows.filter(r=>r.mode==='event'&&r.functionName==='updateCaptionTooltip')].map(clean);
}
async function bind(client,held,profile,flagsMatch=sameFlags) {
  const {createHash}=require('node:crypto');
  const sha=value=>createHash('sha256').update(value).digest('hex');
  if(!profile||profile.terminalReviewed!==true||typeof profile.id!=='string'||!Array.isArray(profile.functions)||!Array.isArray(profile.texts)||typeof flagsMatch!=='function')
    throw Error('Reviewed native environment profile required');
  const evaluated=await client.send('Runtime.evaluate',{expression:`(()=>{const collect=${collect.toString()};return (${capture.toString()})()})()`,returnByValue:false,objectGroup:held.objectGroup,silent:true});
  const bundle=evaluated.result?.objectId;
  if(evaluated.exceptionDetails||!bundle)throw Error('Native environment capture unavailable');
  const result=await client.send('Runtime.callFunctionOn',{objectId:bundle,functionDeclaration:metadata.toString(),returnByValue:true});
  const value=result.result?.value;
  if(result.exceptionDetails||!value)throw Error('Native environment metadata unavailable');
  const functions=value.functions.map(({source,...row})=>({...row,sha256:source===null?null:sha(source)}));
  const texts=value.texts.map(({name,value})=>({name,sha256:sha(value)}));
  if(flagsMatch(value.flags,profile.flags)!==true||!tooltipMovesAllowed(functions,profile.functions)||JSON.stringify(normalizedMetadata(functions))!==JSON.stringify(normalizedMetadata(profile.functions))||JSON.stringify(texts)!==JSON.stringify(profile.texts))
    throw Error('Native environment differs from reviewed profile');
  const member=async key=>{
    const r=await client.send('Runtime.callFunctionOn',{objectId:bundle,functionDeclaration:`function(){return this[${JSON.stringify(key)}]}`,returnByValue:false,objectGroup:held.objectGroup});
    if(r.exceptionDetails||!r.result?.objectId)throw Error('Native environment owner unavailable');return r.result.objectId;
  };
  return {id:profile.id,terminalReviewed:true,arguments:[{objectId:bundle}],
    objects:{jq:await member('jq'),footer:await member('footer'),...(value.hasAddon===true?{addon:await member('addon')}:{})},
    guard:`const collect=${collect.toString()},ordered=${ordered.toString()},tooltipMovesAllowed=${tooltipMovesAllowed.toString()},sameFlags=${sameFlags.toString()};return (${check.toString()})(collect(),nativeEnvInputs[0],${flagsMatch.toString()});`};
}
module.exports={collect,ordered,check,tooltipMovesAllowed,capture,metadata,normalizedMetadata,bind,sameFlags};
