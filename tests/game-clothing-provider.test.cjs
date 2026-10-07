const test=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const clothing=require('../scripts/lib/game-clothing-provider.cjs');

const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const purchaseGoal={kind:'purchase-one',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',baselineMoney:1000,baselineCount:0,unitCost:500,maxSpend:500};
const shop={status:'available',variable:'hairpin',colour:'black',accessoryColour:'black',money:1000,count:0,cost:500,quantity:1,destination:'wardrobe',space:2};
const prepared=state=>({action:{type:'web-click',selector:'#buy-send-home > .buy-button > .buy-button-inner'},interpretation:{...state,operation:'buy-one'}});

test('clothing provider owns only reviewed clothing Goals and retains browser predicate validation',()=>{
  assert.equal(clothing.id,'clothing');
  for(const kind of ['equip','equip-matching','purchase-one','purchase-and-equip'])assert.equal(clothing.supportsGoal({kind}),true);
  assert.equal(clothing.supportsGoal({kind:'reach-passage',passage:'Bedroom'}),false);
  assert.equal(clothing.validateGoal({...purchaseGoal,description:'buy one'}),true);
  assert.equal(clothing.validateGoal({...purchaseGoal,unitCost:0}),false);
  assert.equal(clothing.validateGoal({kind:'reach-passage',passage:'Bedroom'}),false);
  assert.equal(clothing.validateRequest({name:'x',mode:'gameplay',goal:purchaseGoal,budget:{timeoutMs:1000,maxActions:1,maxObservations:1,maxSpend:500}}).goal.kind,'purchase-one');
});

test('candidate refs and quote semantics match legacy clothing choices, with durable capability',()=>{
  const [buy]=clothing.candidates({},3,null,shop,purchaseGoal);
  assert.deepEqual(buy.capability,{provider:'clothing',name:'shop'});
  assert.equal(buy.ref,digest([3,buy.selected,shop]));
  assert.equal(buy.cost,500);
  assert.equal(clothing.validateDescriptor(buy,purchaseGoal),buy);
  assert.equal(clothing.authorizeCostedControl(prepared(shop),buy,purchaseGoal),true);
  assert.equal(clothing.candidates({},3,null,{...shop,cost:501},purchaseGoal).length,0);
  const [quantity]=clothing.candidates({},3,null,{...shop,quantity:2},purchaseGoal);
  assert.equal(quantity.kind,'menu');assert.equal(quantity.cost,0);
  assert.equal(clothing.authorizeCostedControl(prepared(shop),quantity,purchaseGoal),false);
  const request={type:'sw-wardrobe',operation:'equip',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',modder:null};
  const [equip]=clothing.candidates({},3,{equipmentActions:[{request,label:'Hairpin'}]},null,{kind:'equip-matching',slot:'head',colour:'black'});
  assert.equal(equip.ref,digest([3,request]));assert.deepEqual(equip.capability,{provider:'clothing',name:'wardrobe'});
  assert.equal(clothing.validateAction(request,'equip',{kind:'equip-matching'}),require('../integrations/soft-and-wet/gameplay.cjs'));
  const native={...request,type:'dol-wardrobe'};
  const [nativeEquip]=clothing.candidates({},3,{equipmentActions:[{request:native,label:'Hairpin'}]},null,{kind:'equip-matching',slot:'head',colour:'black'});
  assert.equal(clothing.validateDescriptor(nativeEquip,{kind:'equip-matching'}),nativeEquip);
  assert.equal(clothing.validateAction(native,'equip',{kind:'equip-matching'}),require('../scripts/lib/game-wardrobe.cjs'));
  assert.throws(()=>clothing.validateAction(native,'menu',{kind:'equip-matching'}),/intent mismatch/);
});

test('reserved buy-one cost and conditional quote cannot be laundered into a menu or another variant',()=>{
  const [buy]=clothing.candidates({},1,null,shop,purchaseGoal),mapping=prepared(shop);
  for(const changed of [{...buy,cost:0},{...buy,cost:501},{...buy,kind:'menu'},{...buy,selected:{type:'dol-shop',operation:'quantity-one'}}]){
    assert.equal(clothing.authorizeCostedControl(mapping,changed,purchaseGoal),false);
  }
  assert.throws(()=>clothing.validateDescriptor({...buy,cost:0},purchaseGoal),/Invalid reviewed candidate/);
  assert.equal(clothing.authorizeCostedControl({interpretation:{operation:'buy-one'}},buy,purchaseGoal),false);
  assert.equal(clothing.authorizeCostedControl({action:mapping.action,interpretation:{operation:'buy-one',cost:500}},buy,purchaseGoal),false);
  assert.equal(clothing.authorizeCostedControl(mapping,{...buy,selected:{type:'sw-wardrobe',operation:'equip',slot:'head'}},purchaseGoal),false);
  assert.equal(clothing.authorizeCostedControl(mapping,{...buy,selected:{type:'dol-shop',operation:'quantity-one'},kind:'menu',cost:0},purchaseGoal),false);
  assert.throws(()=>clothing.validateAction({type:'dol-shop',operation:'buy-one'},'buy',{kind:'equip'}),/Shop intent\/Goal mismatch/);
  const conditional={kind:'purchase-and-equip',slot:'head',colour:'black'};
  assert.throws(()=>clothing.validateDescriptor({...buy,capability:{provider:'clothing',name:'shop'}},conditional),/Invalid reviewed candidate/);
  assert.equal(clothing.authorizeCostedControl(mapping,buy,conditional),false);
  const [quoted]=clothing.candidates({},1,null,{...shop,wornCount:0,modder:null},conditional);
  assert.equal(quoted.cost,500);
  assert.equal(clothing.validateDescriptor(quoted,conditional),quoted);
  assert.equal(clothing.authorizeCostedControl(prepared({...shop,wornCount:0,modder:null}),quoted,conditional),true);
  assert.equal(clothing.authorizeCostedControl(mapping,{...quoted,quote:{...quoted.quote,unitCost:501}},conditional),false);
});

test('optional shop observation preserves reviewed unsupported reason; proof and progress remain domain scoped',async()=>{
  assert.deepEqual(await clothing.observe({}, {kind:'equip'}),{});
  assert.deepEqual(await clothing.observe({send:async()=>{throw Object.assign(Error('unavailable'),{code:'MAPPING_UNAVAILABLE'})}},purchaseGoal),
    {shop:{status:'unsupported',source:'reviewed original DoL shop mapping',reason:'verified-selected-shop-context-unavailable'}});
  const proof={source:'original',satisfied:false,worn:{variable:'naked'},owned:[]};
  const state={config:{goal:{kind:'purchase-and-equip'}},scene:{goalProof:proof},goalSatisfied:true};
  assert.equal(clothing.publicProof(state).satisfied,true);
  assert.deepEqual(clothing.traceProgress(proof),[false,{variable:'naked'},null,null,[]]);
  assert.deepEqual(clothing.publicOutcome({descriptor:{quote:{unitCost:5}},result:{outcome:'occurred'}}).quote,{unitCost:5});
});

test('an unsupported native wardrobe item is omitted without invalidating the original Goal proof',async()=>{
  const request={type:'dol-wardrobe',operation:'equip',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',modder:null};
  let reads=0;const proof=await clothing.probe({kind:'equip-matching',slot:'head',colour:'black'})({evaluate:async()=>++reads===1?
    {status:'available',passage:'Wardrobe',satisfied:false,items:[]}:[{request,label:'Hairpin'},{request:{...request,variable:'unreviewed-hat'},label:'Other'}]});
  assert.equal(proof.status,'available');assert.deepEqual(proof.equipmentActions,[{request,label:'Hairpin'}]);
});

test('a quoted conditional purchase delegates its actual attempt to the native producer without rewriting the parent Goal',async t=>{
  const native=require('../scripts/lib/game-shop-native.cjs'),g={kind:'purchase-and-equip',slot:'head',colour:'black',passage:'Bedroom'};
  const [descriptor]=clothing.candidates({},1,null,{...shop,wornCount:0,modder:null},g),before=JSON.stringify(g);
  const client={},attempt='123e4567-e89b-42d3-a456-426614174000',mapping={executionBinding:{provider:'dol-shop-native'}};
  t.mock.method(native,'prepare',async(c,selected,concrete,id,options)=>{
    assert.equal(c,client);assert.equal(selected,descriptor.selected);assert.equal(id,attempt);assert.equal(options.quote,descriptor.quote);
    assert.equal(concrete.kind,'purchase-one');assert.equal(concrete.unitCost,descriptor.quote.unitCost);return mapping;
  });
  assert.equal(await clothing.prepare(client,descriptor,g,attempt),mapping);assert.equal(JSON.stringify(g),before);
});
