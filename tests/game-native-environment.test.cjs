const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {collect,capture,check,ordered,tooltipMovesAllowed,normalizedMetadata,bind}=require('../scripts/lib/game-native-environment.cjs');

test('serialized native environment guard follows actual owners and preserves meaningful event order',()=>{
  function first(){}function second(){}function updateCaptionTooltip(){}
  const row=(name,value,mode='identity',meta=null)=>({name,value,mode,meta,source:Function.prototype.toString.call(value)});
  const refs=[row('engine',first),row('event.0',first,'event',{phase:'passageend',namespace:'',selector:null}),
    row('event.1',updateCaptionTooltip,'event',{phase:'passageend',namespace:'',selector:null}),
    row('event.2',second,'event',{phase:'passageend',namespace:'',selector:null})];
  const before={flags:{engineAutosave:['autosave'],version:'test'},refs,owners:[{name:'addon',value:{}}],texts:[{name:'footer',value:'known'}],jq:{},footer:{},addon:{},blocked:new Set()};
  const guard=vm.runInNewContext(`(()=>{const ordered=${ordered.toString()},tooltipMovesAllowed=${tooltipMovesAllowed.toString()};return ${check.toString()}})()`);
  const current=()=>({...before,flags:JSON.parse(JSON.stringify(before.flags)),refs:refs.map(r=>({...r})),owners:before.owners.map(r=>({...r})),texts:before.texts.map(r=>({...r}))});
  const moved=current();moved.refs=[moved.refs[0],moved.refs[1],moved.refs[3],moved.refs[2]];
  assert.equal(guard(moved,before),undefined); // actual off/on of the same tooltip
  const front=current();front.refs=[front.refs[0],front.refs[2],front.refs[1],front.refs[3]];
  assert.equal(guard(front,before),'native-profile-functions-changed');
  [moved.refs[1],moved.refs[2]]=[moved.refs[2],moved.refs[1]];
  assert.equal(guard(moved,before),'native-profile-functions-changed');
  const owner=current();owner.owners[0].value={};assert.equal(guard(owner,before),'native-profile-owner-changed');
  const flags=current();flags.flags.engineAutosave.push('new');assert.equal(guard(flags,before),'native-profile-flags-changed');
  const fn=current();fn.refs[0].value=function first(){};assert.equal(guard(fn,before),'native-profile-functions-changed');
  const text=current();text.texts[0].value='changed';assert.equal(guard(text,before),'native-profile-text-changed');
  const metadata=refs.slice(1).map(r=>({name:r.name,mode:r.mode,meta:r.meta,functionName:r.value.name,sha256:r.source}));
  assert.deepEqual(normalizedMetadata(metadata),normalizedMetadata([metadata[0],metadata[2],metadata[1]]));
  assert.notDeepEqual(normalizedMetadata(metadata),normalizedMetadata([metadata[2],metadata[0],metadata[1]]));
});

test('native bundle binding refuses unreviewed or changed profiles before accepting remote owners',async()=>{
  let calls=[];const client={async send(method,p){calls.push({method,p});
    if(method==='Runtime.evaluate')return{result:{objectId:'bundle'}};
    return{result:{value:{flags:{enabled:true},functions:[],texts:[]}}};
  }},held={objectGroup:'owned-native-group'};
  await assert.rejects(bind(client,held,{terminalReviewed:false}),/Reviewed/);assert.equal(calls.length,0);
  await assert.rejects(bind(client,held,{terminalReviewed:true,id:'fixture',flags:{enabled:false},functions:[],texts:[]}),/differs/);
  assert.equal(calls.length,2);assert.equal(calls[0].p.objectGroup,held.objectGroup);
  assert.equal(calls.some(c=>c.method==='Runtime.releaseObjectGroup'),false); // outer prepare owns cleanup
});

test('successful bundle binding transfers only its outer owned group and serializes all guard dependencies',async()=>{
  const calls=[],profile={terminalReviewed:true,id:'fixture',flags:{enabled:true},functions:[],texts:[]};
  const client={async send(method,p){calls.push({method,p});
    if(method==='Runtime.evaluate')return{result:{objectId:'bundle'}};
    if(p.returnByValue)return{result:{value:{flags:{enabled:true},functions:[],texts:[]}}};
    return{result:{objectId:'owner-'+calls.length}};
  }};
  const result=await bind(client,{objectGroup:'owned-outer'},profile);
  assert.equal(result.id,'fixture');assert.deepEqual(result.arguments,[{objectId:'bundle'}]);
  assert.equal(calls.filter(c=>c.p.returnByValue!==true).every(c=>c.p.objectGroup==='owned-outer'),true);
  assert.equal(calls.some(c=>c.method==='Runtime.releaseObjectGroup'),false);
  assert.doesNotThrow(()=>new Function('nativeEnvInputs',result.guard));
  assert.match(result.guard,/tooltipMovesAllowed=/);
});

test('serialized native inventory works without ModLoader, Maple or a UI Runtime and rejects later registry changes',()=>{
  let calls=0;const business=()=>{calls++;throw Error('Inventory must never call business functions')};
  const passages=Object.fromEntries(['PassageHeader','PassageFooter','Bedroom','StoryCaption'].map(name=>[name,{text:name,processText:business}]));
  const window={SugarCube:{State:{variables:{options:{autosaveDisabled:true}}},Story:{get:name=>passages[name],has:()=>false},Macro:{get:()=>undefined},
    Engine:{isIdle:business},UIBar:{update:business},Config:{passages:{},navigation:{},saves:{autosave:false},ui:{updateStoryElements:true}}},jQuery:{_data:()=>({}),event:{trigger:business}}};
  const run=vm.runInNewContext(`(()=>{const collect=${collect.toString()},ordered=${ordered.toString()},tooltipMovesAllowed=${tooltipMovesAllowed.toString()};
    const before=(${capture.toString()})();return {before,read:collect,check:current=>(${check.toString()})(current,before)}})()`,{window,document:{}});
  assert.equal(run.before.addon,null);assert.equal(run.before.blocked,null);assert.equal(run.before.flags.sc2Count,0);
  assert.equal(run.before.flags.autosaveDisabled,true);assert.equal(run.check(run.read()),undefined);assert.equal(calls,0);
  window.modSC2DataManager={};assert.throws(run.read,/owner unavailable/);
  window.modSC2DataManager={sc2EventTracer:{callback:[{addonPluginTable:[],triggerHookWhenSC2:business}]}};
  const current=run.read();assert.equal(current.flags.sc2Count,1);assert.equal(run.check(current),'native-profile-flags-changed');assert.equal(calls,0);
  window.modSC2DataManager.sc2EventTracer.callback[0].addonPluginTable.push({modName:'maplebirch',hookPoint:null});
  assert.throws(run.read,/owner unavailable/); // A present, broken integration is never treated as absent.
});
