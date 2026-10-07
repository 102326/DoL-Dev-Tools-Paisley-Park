const test=require('node:test'),assert=require('node:assert/strict'),{runInNewContext}=require('node:vm'),radio=require('../scripts/lib/game-native-radio.cjs'),native=require('../scripts/lib/game-native-provider.cjs');
function fixture(change=()=>{}){
  const before={passage:'Scene',turns:9,time:130,money:500,other:'{"combat":1}',value:'rest',checked:false};let current={...before},clicks=0;
  const state={active:{},activeIndex:0,history:[{}],variables:{},temporary:{}},root={isConnected:true},context={version:1,nonce:'nonce',records:Object.create(null)};
  const window={SugarCube:{State:state},reviewed:context},document={querySelector:()=>root};
  const node={click(){clicks++;current={...current,value:'scream',checked:true};change({current,state,window,context,root})}};
  const config={namespace:'reviewed',attemptId:'12345678-1234-4123-8123-123456789abc',field:'mouthaction',value:'scream',binding:{provider:'native-dol',contract:'native-radio-123456789abc',contextNonce:'nonce',requestDigest:'a'.repeat(64)}};
  const run=()=>runInNewContext(`(${radio.operation.toString()})(node,config,epoch,check,read)`,{window,document,node,config,epoch:{before},check:()=>undefined,read:()=>({...current})});
  return {run,config,context,clicks:()=>clicks};
}
test('one original radio click settles selection only, preserves other state and forbids replay',()=>{
  const f=fixture(),r=f.run();assert.equal(r.ok,true);assert.equal(r.receipt.evidence.to,'scream');assert.equal(r.receipt.evidence.otherStateStable,true);
  const effect={action:{kind:'menu',cost:0},executionBinding:r.receipt};assert.equal(native.validateReceipt(r.receipt,effect),true);
  assert.equal(native.validateReceipt(r.receipt,{...effect,action:{kind:'navigation',cost:0}}),false);
  assert.equal(native.validateReceipt({...r.receipt,evidence:{...r.receipt.evidence,otherStateStable:false}},effect),false);
  assert.equal(f.run().guardRejected,true);assert.equal(f.clicks(),1);
});
test('unexpected side effects, state replacement or unsuccessful selection stay unresolved without replay',()=>{
  for(const change of [f=>{f.current.money--},f=>{f.current.other='changed'},f=>{f.state.temporary.changed=true},f=>{f.current.value='rest'},f=>{f.current.checked=false},f=>{f.state.variables={}},f=>{f.state.history=[{}]},f=>{f.root.isConnected=false},()=>{throw Error('click failed')}]){
    const f=fixture(change);assert.equal(f.run().ok,false);assert.equal(f.context.records[f.config.attemptId].status,'started');assert.equal(f.run().guardRejected,true);assert.equal(f.clicks(),1);
  }
});
