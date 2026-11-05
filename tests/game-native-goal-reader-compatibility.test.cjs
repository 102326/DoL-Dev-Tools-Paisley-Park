const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const previous=require('./fixtures/typed-native-goal-baseline/reader.cjs').reader;
const current=require('../scripts/lib/game-native-provider.cjs').reader;
function run(reader,state,goal,domPassage='Fixture room',rootCount=1){
 const roots=Array.from({length:rootCount},()=>({getAttribute:()=>domPassage}));
 const context=vm.createContext({window:{SugarCube:{State:state}},document:{querySelectorAll:()=>roots}});
 return JSON.parse(JSON.stringify(vm.runInContext(`(${reader.toString()})(${JSON.stringify(goal)})`,context)));
}
test('ordinary typed native Goal reader preserves fixed legacy observations across seven scenes',()=>{
 const state={passage:'Fixture room',variables:{plants_known:['synthetic-leaf'],money:100}};
 const cases=[
  [state,{kind:'reach-passage',passage:'Fixture room'}],
  [state,{kind:'reach-passage',passage:'Other room'}],
  [state,{kind:'native-knowledge',collection:'plants_known',entry:'synthetic-leaf'}],
  [state,{kind:'native-knowledge',collection:'plants_known',entry:'unknown-leaf'}],
  [state,{kind:'native-state',conditions:[{field:'money',op:'gte',value:90}]}],
  [state,{kind:'native-state',conditions:[{field:'absent',op:'eq',value:0}]}],
  [state,{kind:'reach-passage',passage:'Fixture room'},'Different DOM room']
 ];
 for(const args of cases)assert.deepEqual(run(current,...args),run(previous,...args));
});
