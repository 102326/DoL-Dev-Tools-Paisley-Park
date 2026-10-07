const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {prepare,checkBindings}=require('../scripts/lib/game-wardrobe-native.cjs');
function fixture(){
  const active={variables:{}},state={active,variables:active.variables},handler=()=>{},definition={payload:[{contents:'reviewed body'}]},owned=()=>42;
  const window={SugarCube:{State:state,Macro:{get:()=>({handler})}},owned},get=()=>active.variables;
  Object.defineProperty(window,'V',{get,configurable:true,enumerable:false});
  const bundle={state,active,getter:get,macros:[{name:'wardrobewear',handler,definition,body:'reviewed body',functionSource:null}],
    globals:[{expr:'window.owned',value:owned,source:String(owned)}],captures:[]};
  return {window,bundle,run:()=>vm.runInNewContext(`(${checkBindings.toString()})(bundle)`,{window,bundle})};
}
test('native wardrobe bindings retain actual State, active getter, registered handler, body and function',()=>{
  assert.equal(fixture().run(),undefined);
  for(const change of [f=>f.window.SugarCube.State={...f.bundle.state},f=>f.bundle.active={variables:f.bundle.state.variables},
    f=>f.bundle.getter=()=>f.bundle.state.variables,f=>f.window.SugarCube.Macro.get=()=>({handler:()=>{}}),
    f=>f.bundle.macros[0].definition.payload[0].contents='different body',f=>f.window.owned=()=>43,
    f=>f.bundle.globals[0].source='different source']){
    const f=fixture();change(f);assert.notEqual(f.run(),undefined);
  }
});
test('invalid native attempt and request cannot touch CDP or dispatch',async()=>{
  let calls=0;const client={evaluate(){calls++;throw Error('must not read')},send(){calls++;throw Error('must not send')}};
  await assert.rejects(prepare(client,{type:'dol-wardrobe',operation:'unequip',slot:'head'},'not-an-attempt'),e=>e.code==='MAPPING_UNAVAILABLE');
  await assert.rejects(prepare(client,{type:'dol-wardrobe',operation:'delete',slot:'head'},null,{attestOnly:true}));assert.equal(calls,0);
});
