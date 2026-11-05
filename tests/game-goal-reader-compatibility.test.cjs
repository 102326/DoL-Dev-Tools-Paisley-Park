const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),vm=require('node:vm');
const entry=path.resolve(__dirname,'../scripts/lib/game-goal-reader.cjs'),baseline=new Module(entry,module);
baseline.filename=entry;baseline.paths=Module._nodeModulePaths(path.dirname(entry));baseline._compile(fs.readFileSync(path.join(__dirname,'fixtures/typed-goal-reader-baseline/game-goal-reader.cjs'),'utf8'),entry);
const original=baseline.exports,current=require('../scripts/lib/game-goal-reader.cjs');
function observe(api,goal,variant){
 const item={variable:'hairpin',colour:'black',accessory_colour:'white',modder:null};
 const state={passage:'Synthetic Room',turns:3,variables:{money:variant==='over-spend'?80:90,worn:{head:variant==='empty'?{variable:'naked'}:item},wardrobe:{head:variant==='empty'?[]:[item]}}};
 if(variant==='oversized')state.variables.wardrobe.head=Array(513).fill(item);
 const roots=variant==='ambiguous'?[{},{}]:[{getAttribute:()=>variant==='mismatch'?'Different':state.passage}];
 return JSON.parse(JSON.stringify(vm.runInNewContext(`(${api.goalReader.toString()})(${JSON.stringify(goal)})`,{window:{SugarCube:{State:state},__paisleyParkGameplayReceiptsV1:{nonce:'synthetic'}},document:{querySelectorAll:()=>roots}})));
}
test('goal probes retain original state and DOM outcomes across all owned goal kinds',()=>{
 const goals=[{kind:'reach-passage',passage:'Synthetic Room'},{kind:'equip',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'white'},{kind:'equip-matching',slot:'head',colour:'black'},{kind:'purchase-and-equip',slot:'head',colour:'black'},{kind:'purchase-one',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'white',baselineMoney:100,baselineCount:0,unitCost:10,maxSpend:10}];
 for(const goal of goals)for(const variant of ['normal','empty','over-spend','oversized','ambiguous','mismatch'])assert.deepEqual(observe(current,goal,variant),observe(original,goal,variant));
 assert.deepEqual(Object.keys(current),Object.keys(original));
});
test('goal normalization and quotes retain original outputs and rejection classifications',()=>{
 const budget={timeoutMs:1000,maxActions:1,maxObservations:1,maxSpend:0};
 const normalize=(api,request)=>{try{return{data:api.validate(request)}}catch(e){return{error:e.message}}};
 const base={name:'synthetic',mode:'gameplay',budget,goal:{kind:'reach-passage',passage:'Synthetic Room'}};
 for(const patch of [{},{name:12},{budget:{...budget,maxSpend:null}},{budget:{...budget,maxSpend:-1}},{goal:{kind:'purchase-one',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'white',baselineMoney:100,baselineCount:0,unitCost:0}},{goal:{kind:'equip',slot:['head'],variable:'hairpin',colour:0}}])assert.deepEqual(normalize(current,{...base,...patch}),normalize(original,{...base,...patch}));
 const shop={status:'available',destination:'wardrobe',space:1,quantity:1,variable:'hairpin',colour:'black',accessoryColour:'white',money:100,count:0,wornCount:0,cost:10};
 for(const patch of [{},{count:1},{space:0},{quantity:513},{pattern:'unsupported'}])assert.deepEqual(current.quoteFromShop({...shop,...patch},{kind:'purchase-and-equip',colour:'black'}),original.quoteFromShop({...shop,...patch},{kind:'purchase-and-equip',colour:'black'}));
});
test('validated Goal requests cannot lose required fields during JSON normalization',()=>{
 const goal={kind:'reach-passage',passage:'Synthetic Room'},budget={timeoutMs:1000,maxActions:1,maxObservations:1},base={name:'synthetic',mode:'gameplay',goal,budget};
 for(const request of [Object.create(base),{...base,goal:Object.create(goal)},{...base,budget:Object.create(budget)},{...base,goal:Object.assign(Object.create({toJSON(){return {}}}),goal)}])assert.throws(()=>current.validate(request));
 assert.deepEqual(current.validate(structuredClone(base)),original.validate(structuredClone(base)));
});
