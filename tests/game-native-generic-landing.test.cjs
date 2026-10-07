const test=require('node:test'),assert=require('node:assert/strict'),{runInNewContext}=require('node:vm');
const {check,navigationFlags}=require('../scripts/lib/game-native-generic-landing.cjs');
test('navigation accepts normal combat state transitions while retaining environment and save boundaries',()=>{
  const before={combat:false,autosaveDisabled:true,engineAutosave:false,phaseShape:[]};
  assert.equal(navigationFlags({...before,combat:true},before),true);
  assert.equal(navigationFlags(before,{...before,combat:true}),true);
  for(const after of [{...before,combat:1},{...before,autosaveDisabled:false},{...before,engineAutosave:true},{...before,phaseShape:['foreign']}])
    assert.equal(navigationFlags(after,before),false);
  assert.equal(require('../scripts/lib/game-native-environment.cjs').sameFlags({...before,combat:true},before),false);
});
function fixture(){
  const variables={},state={passage:'Source',variables},passage={text:'receiver',tags:[]},effects=function effects(){},handler=function handler(){},getter=()=>variables;
  const root={getAttribute:()=>state.passage,querySelector:()=>null},window={SugarCube:{State:state,Story:{get:()=>passage},Macro:{get:()=>({handler})},Engine:{isIdle:()=>true}}};
  Object.defineProperty(window,'V',{get:getter,configurable:true});
  return {window,document:{querySelectorAll:()=>[root]},root,state,passage,epoch:{state,destination:'Destination',before:'Source',passage,text:passage.text,tags:'[]',handler,effects,getter,effectsSource:effects.toString()}};
}
const run=(f,phase)=>runInNewContext(`(${check.toString()})(epoch,phase)`,{...f,phase});
test('navigation closes a healthy actual Scene, including a normal redirect, without claiming an activity',()=>{
  const f=fixture();assert.equal(run(f,'before'),undefined);
  f.state.passage='Destination';assert.equal(run(f,'after'),undefined);
  f.state.passage='RandomEvent';assert.equal(run(f,'after'),undefined);
  assert.equal(run(f,'before'),'native-navigation-start-changed');
});
test('navigation rejects changed source ownership, receiver epoch and lost Scene before accepting a terminal',()=>{
  for(const change of [f=>{f.window.SugarCube.State={...f.state}},f=>{Object.defineProperty(f.window,'V',{get:()=>f.state.variables})},
    f=>{f.window.DoLGameUI={}},f=>{f.passage.text+='new'},f=>{f.passage.tags.push('new')},
    f=>{f.window.SugarCube.Story.get=()=>({...f.passage})},f=>{f.window.SugarCube.Macro.get=()=>({handler:()=>{}})}]){
    const f=fixture();change(f);assert.equal(run(f,'after'),'native-navigation-source-epoch-changed');
  }
  for(const change of [f=>{f.document.querySelectorAll=()=>[]},f=>{f.root.getAttribute=()=> 'stale'},f=>{f.root.querySelector=()=>({})},
    f=>{f.window.SugarCube.Engine.isIdle=()=>false}]){
    const f=fixture();change(f);assert.equal(run(f,'after'),'native-navigation-scene-unavailable');
  }
});
