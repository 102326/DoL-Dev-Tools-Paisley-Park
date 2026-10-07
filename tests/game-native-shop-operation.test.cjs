const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {operation}=require('../scripts/lib/game-shop-operation.cjs'),{validatePurchaseReceipt}=require('../scripts/lib/game-goal-reader.cjs');
const copy=v=>JSON.parse(JSON.stringify(v));
function fixture(fault){
 const variant={slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',modder:null};
 const quote={variant,baselineMoney:500,baselineCount:0,baselineWornCount:0,unitCost:500};
 const v={money:500,timeStamp:10140,worn:{head:{variable:'hairpin',colour:'white',accessory_colour:'white'}},
  wardrobe:{head:[]},moneyStats:{clothes:{earned:0,earnedCount:0,spent:0,spentCount:0}}};
 const state={passage:'Clothing Shop',turns:32,variables:v,activeIndex:0,history:[{title:'Clothing Shop',variables:copy(v)}]},context={nonce:'nonce',records:Object.create(null)};
 const window={SugarCube:{State:state},receipts:context},original=()=>{state.history[0].variables=copy(v)};window.updateMoment=original;
 let clicks=0;const node={isConnected:true,click(){
  clicks++;if(fault==='throw')throw Error('Original failed');
  if(fault!=='no-item')v.wardrobe.head.push({variable:'hairpin',colour:fault==='variant'?'white':'black',accessory_colour:'black'});
  if(fault==='duplicate')v.wardrobe.head.push(copy(v.wardrobe.head[0]));
  if(fault!=='no-debit')v.money-=fault==='wrong-debit'?400:500;
  if(fault!=='no-stats'){v.moneyStats.clothes.spent+=500;v.moneyStats.clothes.spentCount++;v.moneyStats.clothes.spentTimeStamp=fault==='elapsed-clock'?v.timeStamp:63797883090}
  if(fault==='worn')v.worn.head.colour='black';
  if(fault==='time')v.timeStamp++;
  if(fault==='foreign-owner')window.updateMoment=()=>{};
  if(fault!=='no-moment')window.updateMoment();
  if(fault==='twice')window.updateMoment();
  if(fault==='stale-history')state.history[0].variables.money=500;
 }};
 const list={},root={isConnected:true,contains:n=>n===node||n===list,querySelector:()=>fault==='render-error'?{}:null};
 const document={querySelector:s=>s==='#clothes-list'?list:root,querySelectorAll:s=>s==='#clothes-list'?[list]:[root]};
 const read=()=>copy({variant,turns:state.turns,time:v.timeStamp,clock:63797883090,money:v.money,count:v.wardrobe.head.filter(i=>i.colour==='black').length,wornCount:0,
  inventory:v.wardrobe.head,worn:v.worn.head,stats:v.moneyStats.clothes,quantity:1,destination:'wardrobe',cost:500});
 const binding={provider:'dol-shop-native',contract:'shop-buy-one-123456789abc',contextNonce:'nonce'},config={namespace:'receipts',binding,attemptId:'attempt',quote,before:read()};
 const run=()=>vm.runInNewContext(`(${operation.toString()})(node,config,read,check)`,{window,document,node,config,read,check:phase=>fault==='source-'+phase?'changed':undefined});
 return {run,window,state,context,config,original,clicks:()=>clicks};
}
test('native purchase closes once only with original debit, appended variant, moneyStats and moment submission',()=>{
 const f=fixture(),r=f.run();assert.equal(r.ok,true);assert.equal(r.receipt.spent,500);assert.equal(r.receipt.remoteClosed,true);
 assert.equal(validatePurchaseReceipt(r.receipt,{action:{kind:'buy',quote:f.config.quote},executionBinding:f.config.binding}),true);
 assert.equal(f.window.updateMoment,f.original);assert.equal(f.state.variables.money,0);assert.equal(f.run().guardRejected,true);assert.equal(f.clicks(),1);
});
test('changed quote, budget, original snapshot or owned context rejects before dispatch',()=>{
 for(const fault of ['source-before','budget','snapshot','nonce','history','moment']){
  const f=fixture(fault);if(fault==='budget')f.config.quote.unitCost=501;
  if(fault==='snapshot')f.config.before.money--;
  if(fault==='nonce')f.config.binding.contextNonce='other';
  if(fault==='history')f.state.history[0].title='Bedroom';
  if(fault==='moment')Object.defineProperty(f.window,'updateMoment',{writable:false});
  assert.equal(f.run().guardRejected,true,fault);assert.equal(f.clicks(),0);assert.deepEqual(Object.keys(f.context.records),[]);
 }
});
test('partial business, differing amount/variant or missing terminal proof stays pending and cannot replay',()=>{
 for(const fault of ['elapsed-clock','no-item','variant','duplicate','no-debit','wrong-debit','no-stats','worn','time','no-moment','twice','throw','stale-history','render-error','source-after']){
  const f=fixture(fault);assert.equal(f.run().ok,false,fault);assert.equal(f.context.records.attempt.status,'started',fault);
  assert.equal(f.window.updateMoment,f.original,fault);assert.equal(f.run().guardRejected,true,fault);assert.equal(f.clicks(),1);
 }
});
test('foreign moment ownership is preserved without a terminal receipt',()=>{
 const f=fixture('foreign-owner');assert.equal(f.run().ok,false);assert.notEqual(f.window.updateMoment,f.original);
 assert.equal(f.context.records.attempt.status,'started');assert.equal(f.run().guardRejected,true);assert.equal(f.clicks(),1);
});
