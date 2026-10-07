const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const shop=require('../scripts/lib/game-shop.cjs'),goal=require('../scripts/lib/game-goal.cjs');
function fixture(){
 const item={name:'hairpin',variable:'hairpin',index:1,slot:'head',colour_options:['black','white'],accessory_colour_options:['black','white']};
 const v={clothingShopSlot:'head',clothes_choice:1,tryOn:{value:0,ownedStored:{head:null},tryingOn:{head:null},showUnderEquip:{},showEquip:{}},buyMultiple:1,wardrobes:{shopReturn:'wardrobe'},wardrobe:{head:[]},
   money:1000,colouraction:'black',accessorycolouraction:'white',worn:{head:{variable:'naked',colour:0}}};
 const temp={...item},state={passage:'Clothing Shop',variables:v,temporary:{realSlot:'head',realIndex:1,temp_choice:temp,clothingCost:500,spaceLeft:10}};
 const fn=()=>500,root={getAttribute:()=>state.passage},button={classList:{contains:()=>false},querySelectorAll:()=>[{}]};
 const globals={window:{SugarCube:{State:state},setup:{clothes:{head:[null,item]}},getClothingCost:fn},document:{querySelectorAll:s=>s==='#passages > .passage'?[root]:[button]}};
 const request={name:'one',mode:'gameplay',goal:{kind:'purchase-one',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'white',baselineMoney:1000,baselineCount:0,unitCost:500,maxSpend:500},budget:{timeoutMs:60000,maxActions:3,maxObservations:10}};
 const read=()=>vm.runInNewContext(`(${shop.reader.toString()})(goal,window.getClothingCost)`,{...globals,goal:request.goal});
 const proof=()=>vm.runInNewContext(`(${goal.goalReader.toString()})(goal)`,{...globals,goal:request.goal});
 return {item,v,temp,state,fn,globals,request,read,proof,button};
}
test('native purchase reads no optional Runtime and refuses price, quantity, variant, budget, destination, capacity and original baseline drift',()=>{
 const f=fixture();assert.equal(goal.validate(f.request).goal.kind,'purchase-one');assert.equal(f.read().status,'available');
 const snapshot=vm.runInNewContext(`(${shop.reader.toString()})(null,window.getClothingCost)`,f.globals);
 assert.equal(snapshot.cost,500);assert.equal(snapshot.count,0);assert.equal(snapshot.quantity,1);assert.equal(snapshot.accessoryColour,'white');
 for(const mutate of [x=>x.v.buyMultiple=2,x=>x.v.money=999,x=>x.v.wardrobes.shopReturn='other',x=>x.v.accessorycolouraction='black',
   x=>x.v.colouraction='random',x=>x.state.temporary.spaceLeft=0,x=>x.state.temporary.clothingCost=501,x=>x.request.goal.unitCost=501,
   x=>x.item.outfitPrimary={lower:1},x=>x.item.outfitPrimary=null,x=>x.temp.outfitSecondary=0,x=>x.v.worn.head=null,x=>x.v.wardrobe.head.push(null),x=>x.v.tryOn.value=1,x=>x.v.wardrobe.head.push({variable:'hairpin',colour:'black',accessory_colour:'white'})]){
   const x=fixture();mutate(x);assert.equal(x.read().status,'unsupported');
 }
 const low=fixture();low.request.goal.maxSpend=499;assert.throws(()=>goal.validate(low.request));
 const unreviewed=fixture();assert.equal(vm.runInNewContext(`(${shop.reader.toString()})(goal,()=>500)`,{...unreviewed.globals,goal:unreviewed.request.goal}).status,'unsupported');
 assert.throws(()=>shop.validate({type:'dol-shop',operation:'buy-one',script:'unreviewed'}));
});
test('zero try-on total does not authorize original outfit restoration or hidden try-on cost changes',()=>{
 const safe=fixture();safe.v.tryOn.ownedStored.head={variable:'naked',colour:0};assert.equal(safe.read().status,'available');
 for(const mutate of [
  x=>delete x.v.tryOn.ownedStored,x=>x.v.tryOn.ownedStored.head=undefined,x=>x.v.tryOn.ownedStored.head='naked',x=>x.v.tryOn.ownedStored.head=[],
  x=>x.v.tryOn.ownedStored.head={variable:'shirt',outfitPrimary:{upper:'shirt'}},
  x=>x.v.tryOn.ownedStored.head={variable:'shirt',outfitSecondary:['upper','shirt']},
  x=>x.v.worn.head.outfitPrimary={lower:'skirt'},x=>x.v.worn.head.outfitSecondary=['upper','shirt'],
  x=>x.v.tryOn.tryingOn.head={variable:'hairpin'},x=>delete x.v.tryOn.tryingOn.head,
  x=>x.v.tryOn.showUnderEquip.head=undefined,x=>x.v.tryOn.showEquip.head=0,
  x=>x.v.tryOn.showEquip=[]]){
  const x=fixture();mutate(x);assert.equal(x.read().status,'unsupported');
  assert.equal(vm.runInNewContext(`(${shop.reader.toString()})(null,window.getClothingCost)`,x.globals).status,'unsupported');
 }
});

test('shop observations reject index/name/modder recovery before invoking the original price reader',()=>{
 for(const mutate of [x=>x.temp.modder='different',x=>x.temp.name='different',x=>delete x.temp.name,
  x=>x.temp.index=2,x=>x.globals.window.setup.clothes.head[0]={...x.item},x=>x.globals.window.setup.clothes.head.push({...x.item})]){
  const f=fixture();mutate(f);let calls=0;const price=()=>{calls++;throw Error('Recovery must not run')};f.globals.window.getClothingCost=price;
  for(const selected of [null,f.request.goal]){
   assert.equal(vm.runInNewContext(`(${shop.reader.toString()})(selected,price)`,{...f.globals,selected,price}).status,'unsupported');
  }
  assert.equal(calls,0);
 }
});
test('purchase truth requires bounded original debit and exact inventory increase; price differences stay explicit',()=>{
 const f=fixture();assert.equal(f.proof().satisfied,false);f.v.money=500;assert.equal(f.proof().satisfied,false);
 f.v.wardrobe.head.push({variable:'hairpin',colour:'black',accessory_colour:'black'});assert.equal(f.proof().satisfied,false);
 f.v.wardrobe.head[0].accessory_colour='white';assert.equal(f.proof().satisfied,true);
 f.v.money=499;assert.equal(f.proof().satisfied,false);f.v.money=950;assert.equal(f.proof().satisfied,true);assert.equal(f.proof().priceMatches,false);f.v.money=500;
 f.v.wardrobe.head.push({...f.v.wardrobe.head[0]});assert.equal(f.proof().satisfied,false);
 f.v.wardrobe.head=null;assert.equal(f.proof().status,'unavailable');
});
test('unsupported price-reader binding releases every owned remote object and does not run page cost or dispatch',async()=>{
 const released=[];let called=0;
 const client={async send(method,p){if(method==='Runtime.evaluate')return{result:{objectId:String(++called)}};
   if(method==='Runtime.callFunctionOn')return{result:{value:'unreviewed source'}};
   if(method==='Runtime.releaseObject')released.push(p.objectId);else throw Error('unexpected method');},evaluate(){throw Error('Must not invoke unreviewed page reader')}};
 await assert.rejects(shop.prepare(client,{type:'dol-shop',operation:'buy-one'},fixture().request.goal),{code:'MAPPING_UNAVAILABLE'});
 assert.equal(released.length,called);
});

test('native shop preparation retains the registered money closure without a global, and preserves binding/cleanup failures',async()=>{
 const fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module'),{createHash}=require('node:crypto');
 const file=path.resolve(__dirname,'../scripts/lib/game-shop.cjs'),nativeRequire=createRequire(file);
 for(const fault of [null,'handler','attestation','cleanup']){
  const f=fixture(),objects=new Map(),released=[],groups=[];let i=0,attested=0;
  const handler=function handler(){},debit=function nativeMoney(){};
  f.globals.window.SugarCube.Macro={get:()=>({handler})};
  objects.set('native-handler',handler);objects.set('native-debit',debit);
  const client={evaluate:async source=>vm.runInNewContext(source,f.globals),async send(method,p){
   if(method==='Runtime.evaluate'){
    const value=vm.runInNewContext(p.expression,f.globals);if(value===undefined)return{result:{type:'undefined'}};
    const id=String(++i);objects.set(id,value);return{result:{type:typeof value,objectId:id}};
   }
   if(method==='Runtime.callFunctionOn')return{result:{value:vm.runInNewContext('('+p.functionDeclaration+')',f.globals).call(objects.get(p.objectId),...(p.arguments||[]).map(a=>Object.hasOwn(a,'value')?a.value:objects.get(a.objectId)))}};
   if(method==='Runtime.releaseObject'){released.push(p.objectId);return{}}
   if(method==='Runtime.releaseObjectGroup'){groups.push(p.objectGroup);if(fault==='cleanup')throw Error('Group cleanup failed');return{}}
   throw Error('Unexpected transport');
  }};
  const contracts={attestFunctionMacro:async(_c,name,hash,options)=>{
   attested++;assert.equal(name,'money');assert.equal(hash,'9f3af72846a7105de0cef60158fa6b094c67e635330364e34544d3329aa30f37');assert.equal(options.retain,true);
   if(fault==='attestation')throw Error('Original source differs');return{objectId:'native-handler',functionId:'native-debit',objectGroup:'native-money'};
  },sameObject:async(_c,a,b)=>fault!=='handler'&&fault!=='cleanup'&&objects.get(a)===objects.get(b)};
  const module={exports:{}},require=name=>name==='./game-contract.cjs'?contracts:nativeRequire(name);
  // Substitute only the fixture price fingerprint; actual source rejection is
  // covered above, and closure source validation belongs to game-contract tests.
  const source=fs.readFileSync(file,'utf8').replace(shop.costSourceSha256,createHash('sha256').update(String(f.fn)).digest('hex'));
  vm.runInNewContext('(function(require,module){'+source+'\n})',{})(require,module);
  if(fault){await assert.rejects(module.exports.prepare(client,{type:'dol-shop',operation:'buy-one'},f.request.goal),e=>e.code===(fault==='cleanup'?'NATIVE_BINDING_CLEANUP_FAILED':'MAPPING_UNAVAILABLE'));
   assert.equal(released.length,6);assert.deepEqual(groups,fault==='attestation'?[]:['native-money']);
  }else{
   const mapped=await module.exports.prepare(client,{type:'dol-shop',operation:'buy-one'},f.request.goal);
   assert.equal(mapped.interpretation.debitBinding,'registered native macroFunction');assert.deepEqual(Array.from(mapped.objectGroups),['native-money']);
   assert.equal(mapped.arguments[6].objectId,'native-debit');assert.equal(mapped.executionBinding,undefined);assert.equal(mapped.operation,undefined);
   const check=()=>vm.runInNewContext('(function(node,observedInputs){'+mapped.source+'})',f.globals)(null,mapped.arguments.map(a=>objects.get(a.objectId)));
   assert.equal(check(),undefined);f.globals.window.money=()=>{};assert.equal(check().guardRejected,true);
  }
  assert.equal(attested,1);
 }
});
