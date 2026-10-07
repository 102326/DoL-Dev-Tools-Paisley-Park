const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {operation}=require('../scripts/lib/game-wardrobe-operation.cjs');
const copy=v=>JSON.parse(JSON.stringify(v));
function fixture({strip=false,fault}={}){
  const white={variable:'hairpin',colour:'white',accessory_colour:'white',lastTaken:'wardrobe'},black={...white,colour:'black',accessory_colour:'black'};
  const v={worn:{head:white},wardrobe:{head:[black]},money:500,timeStamp:10140},state={passage:'Wardrobe',turns:31,variables:v,activeIndex:0,history:[{title:'Wardrobe',variables:copy(v)}]};
  const context={nonce:'nonce',records:Object.create(null)},window={SugarCube:{State:state},receipts:context};
  const original=()=>{state.history[state.activeIndex].variables=copy(v)};window.updateMoment=original;
  const root={isConnected:true,contains:n=>n===node||n===list,querySelector:()=>null},list={};let clicks=0;
  const node={click(){
    clicks++;if(fault==='throw')throw Error('original failed');
    const previous=copy(v.worn.head);previous.lastTaken='wardrobe';
    v.worn.head=strip?{variable:'naked'}:v.wardrobe.head.shift();v.wardrobe.head.push(previous);
    if(fault==='money')v.money--;
    if(fault==='inventory')v.wardrobe.head=[];
    if(fault==='foreign-owner')window.updateMoment=()=>{};
    if(fault!=='no-moment')window.updateMoment();
    if(fault==='twice')window.updateMoment();
    if(fault==='stale-history')state.history[0].variables.money--;
  }};
  const document={querySelector:s=>s==='#wardrobeList'?list:root,querySelectorAll:s=>s==='#wardrobeList'?[list]:[root]};
  const request=strip?{type:'dol-wardrobe',operation:'unequip',slot:'head'}:{type:'dol-wardrobe',operation:'equip',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',modder:null};
  const read=r=>({status:'available',index:r.operation==='equip'?v.wardrobe.head.findIndex(i=>i.colour===r.colour):null,
    before:copy({turns:state.turns,time:v.timeStamp,money:v.money,worn:v.worn.head,inventory:v.wardrobe.head,...(r.operation==='equip'?{item:v.wardrobe.head.find(i=>i.colour===r.colour)}:{})})});
  const config={namespace:'receipts',binding:{contextNonce:'nonce'},attemptId:'attempt',request,before:read(request).before};
  const run=()=>vm.runInNewContext(`(${operation.toString()})(node,config,read,check)`,{window,document,node,config,read,check:phase=>fault==='source-'+phase?false:undefined});
  return {run,window,state,context,config,original,clicks:()=>clicks};
}
test('native head receipt requires the original moment and exact same-passage outcome; duplicate attempts never replay',()=>{
  for(const strip of [false,true]){
    const f=fixture({strip}),r=f.run();assert.equal(r.ok,true);assert.equal(r.receipt.status,'terminal');assert.equal(r.receipt.spent,0);
    assert.equal(r.receipt.remoteClosed,true);assert.equal(r.receipt.evidence.originalMomentUpdates,1);assert.equal(r.receipt.evidence.samePassage,true);
    assert.equal(f.window.updateMoment,f.original);assert.equal(f.state.variables.worn.head.variable,strip?'naked':'hairpin');
    assert.equal(f.state.variables.wardrobe.head.length,strip?2:1);assert.equal(f.state.turns,31);
    assert.equal(f.run().guardRejected,true);assert.equal(f.clicks(),1);
  }
});
test('preflight failures leave zero clicks and no receipt',()=>{
  for(const fault of ['source-before','stale','moment-descriptor','history']){
    const f=fixture({fault});if(fault==='stale')f.config.before.money--;
    if(fault==='moment-descriptor')Object.defineProperty(f.window,'updateMoment',{writable:false});
    if(fault==='history')f.state.history[0].title='Bedroom';
    assert.equal(f.run().guardRejected,true);assert.equal(f.clicks(),0);assert.deepEqual(Object.keys(f.context.records),[]);
  }
});
test('changed business result, unclosed callback or source leave an unsettled receipt, with owned observers restored',()=>{
  for(const fault of ['money','inventory','no-moment','twice','throw','stale-history','source-after']){
    const f=fixture({fault});assert.equal(f.run().ok,false,fault);assert.equal(f.context.records.attempt.status,'started',fault);
    assert.equal(f.window.updateMoment,f.original,fault);assert.equal(f.run().guardRejected,true);assert.equal(f.clicks(),1);
  }
});
test('foreign observer ownership is preserved and never certified as terminal',()=>{
  const f=fixture({fault:'foreign-owner'});assert.equal(f.run().ok,false);assert.notEqual(f.window.updateMoment,f.original);
  assert.equal(f.context.records.attempt.status,'started');assert.equal(f.run().guardRejected,true);assert.equal(f.clicks(),1);
});
