const test=require('node:test'),assert=require('node:assert/strict'),{runInNewContext}=require('node:vm');
const {preflight,operation}=require('../scripts/lib/game-shop-menu-operation.cjs'),menu=require('../scripts/lib/game-shop-menu-native.cjs'),clothing=require('../scripts/lib/game-clothing-provider.cjs');
const attempt='12345678-1234-4123-8123-123456789abc';
function fixture(from='item',change=()=>{}){
  const before={passage:'Clothing Shop',turns:47,time:11490,money:500,choice:from==='item'?1:null,view:from,inventory:{head:[]},worn:{head:{variable:'hairpin',colour:'white'}}};
  let snapshot=structuredClone(before),clicks=0;
  const state={passage:'Clothing Shop',active:{},activeIndex:0,history:[{}]},root={contains:()=>true,querySelector:()=>null},container={isConnected:true};
  const context={version:1,nonce:'nonce',records:Object.create(null)},window={SugarCube:{State:state,Engine:{isIdle:()=>true}},reviewed:context};
  const node={isConnected:true,click(){clicks++;node.isConnected=false;snapshot={...snapshot,view:from==='item'?'catalogue':'main',choice:null};change({snapshot,state,root,container,context,window})}};
  const document={querySelectorAll:selector=>selector==='#clothingShop-div'?[container]:[root],querySelector:selector=>selector==='#clothingShop-div'?container:root};
  const config={namespace:'reviewed',binding:{provider:'dol-shop-native',contract:'shop-menu-123456789abc',contextNonce:'nonce',requestDigest:'a'.repeat(64)},attemptId:attempt,before};
  const run=()=>runInNewContext(`(${operation.toString()})(node,config,readCurrent,checkSources,(${preflight.toString()}))`,{window,document,node,config,readCurrent:()=>structuredClone(snapshot),checkSources:()=>undefined});
  return {run,context,node,config,clicks:()=>clicks};
}
test('original return control closes each fresh menu stage once without claiming a purchase',()=>{
  for(const from of ['item','catalogue']){
    const f=fixture(from),r=f.run();assert.equal(r.ok,true);assert.equal(f.clicks(),1);
    assert.equal(r.receipt.spent,0);assert.equal(r.receipt.evidence.kind,'shop-menu');assert.equal(r.receipt.evidence.to,from==='item'?'catalogue':'main');
    assert.equal(f.run().guardRejected,true);assert.equal(f.clicks(),1);
    const effect={action:{kind:'menu',cost:0,selected:{type:'dol-shop',operation:'return-menu'}},executionBinding:r.receipt};
    assert.equal(menu.validateReceipt(r.receipt,effect),true);assert.equal(menu.validateReceipt({...r.receipt,evidence:undefined},effect),false);
    assert.equal(menu.validateReceipt({...r.receipt,spent:1},effect),false);
    assert.equal(menu.validateReceipt(r.receipt,{...effect,executionBinding:{provider:'native-dol',contract:r.receipt.contract}}),false);
  }
});
test('browse uses the same menu executor, verifies the original head category and keeps business state stable',()=>{
  const f=fixture('main',({snapshot})=>{snapshot.view='catalogue';snapshot.slot='head'});Object.assign(f.config,{browse:true,expectedView:'catalogue',expectedSlot:'head'});
  const r=f.run();assert.equal(r.ok,true);assert.equal(r.receipt.evidence.to,'catalogue');
  assert.equal(menu.validateReceipt(r.receipt,{action:{kind:'menu',cost:0,selected:{operation:'browse'}},executionBinding:r.receipt}),true);
  const wrong=fixture('main',({snapshot})=>{snapshot.view='catalogue';snapshot.slot='upper'});Object.assign(wrong.config,{browse:true,expectedView:'catalogue',expectedSlot:'head'});assert.equal(wrong.run().ok,false);
  const item=fixture('catalogue',({snapshot})=>{snapshot.view='item';snapshot.slot='head';snapshot.choice=1});Object.assign(item.config,{browse:true,expectedView:'item',expectedSlot:'head',expectedChoice:1});assert.equal(item.run().ok,true);
  const index=fixture('catalogue',({snapshot})=>{snapshot.view='item';snapshot.slot='head';snapshot.choice=2});Object.assign(index.config,{browse:true,expectedView:'item',expectedSlot:'head',expectedChoice:1});assert.equal(index.run().ok,false);
});
test('money, inventory, worn state, history, view and error drift remain started and are never replayed',()=>{
  for(const change of [f=>{f.snapshot.money--},f=>{f.snapshot.inventory.head.push({variable:'other'})},f=>{f.snapshot.worn.head.colour='black'},
    f=>{f.snapshot.time++},f=>{f.snapshot.turns++},f=>{f.snapshot.view='main'},f=>{f.state.history=[{}]},f=>{f.root.querySelector=()=>({})},f=>{f.window.SugarCube.Engine.isIdle=()=>false}]){
    const f=fixture('item',change);assert.equal(f.run().ok,false);assert.equal(f.context.records[attempt].status,'started');assert.equal(f.run().guardRejected,true);assert.equal(f.clicks(),1);
  }
  const full=fixture();for(let n=0;n<64;n++)full.context.records[n]={};assert.equal(full.run().guardRejected,true);assert.equal(full.clicks(),0);
});
test('shop return is a zero-cost domain action and does not change the parent Goal',async()=>{
  const goal={kind:'purchase-and-equip',slot:'head',colour:'black'},facts={passage:'Clothing Shop',choices:[{safe:true,destination:null,label:'(1) 返回'}]};
  const [c]=clothing.candidates(facts,2,null,null,goal);assert.equal(c.selected.operation,'return-menu');assert.equal(c.kind,'menu');assert.equal(c.cost,0);
  assert.equal(clothing.validateDescriptor(c,goal),c);assert.throws(()=>clothing.validateDescriptor({...c,cost:500},goal));
  assert.throws(()=>clothing.validateDescriptor({...c,quote:{}},goal));assert.equal(clothing.candidates({...facts,passage:'Other'},2,null,null,goal).length,0);
  assert.throws(()=>clothing.validateAction({type:'dol-shop',operation:'return-menu',selector:'a'},'menu',goal));
  assert.throws(()=>clothing.validateAction({type:'dol-shop',operation:'browse'},'menu',goal));
  let calls=0;await assert.rejects(menu.prepare({send(){calls++}},c.selected,goal,'invalid'),e=>e.code==='MAPPING_UNAVAILABLE');assert.equal(calls,0);
});
