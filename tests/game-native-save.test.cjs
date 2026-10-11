'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),save=require('../scripts/lib/game-native-save.cjs');
function fixture({timers={setTimeout,clearTimeout},readback,detailReadback}={}){
  let item,details=[],adds=0;
  const add=function(value){adds++;return {value}};
  const proto={};Object.defineProperty(proto,'add',{value:add,writable:true,configurable:true,enumerable:false});
  const handlers=new Set(),loadHandlers=new Set(),state={marshalForSave(){},deltaDecode:d=>d};
  const idb={active:true,saveState(){},setItem(){},deleteItem(){},loadState(){},async getItem(){return item},async getSaveDetails(){return details}};
  if(readback)idb.getItem=readback;
  if(detailReadback)idb.getSaveDetails=detailReadback;
  Object.defineProperty(idb,'dbName',{get:()=> 'owned-db'});
  const held=Object.freeze({status:'started'}),context={records:{attempt:held}},window={StartConfig:{version:'0.5.12.13'},idb,IDBObjectStore:{prototype:proto},SugarCube:{State:state,Save:{onSave:{handlers},onLoad:{handlers:loadHandlers}}},receipts:context};
  const realText=Function.prototype.toString;const FunctionShim={prototype:{toString:{call:f=>f===add?'function add() { [native code] }':realText.call(f)}}};
  const realm=vm.createContext({window,Function:FunctionShim,Set,Map,Promise,...timers});
  const watcher=vm.runInContext('('+save.capture.toString()+')("receipts")',realm),frame={index:0,history:[{title:'NativeScene',variables:{money:10,timeStamp:20}}]};
  function transaction(date=100){
    const tx={db:{name:'owned-db'},mode:'readwrite',objectStoreNames:['saves','details'],events:{},addEventListener(k,f){(this.events[k]??=[]).push(f)},removeEventListener(k,f){this.events[k]=(this.events[k]||[]).filter(fn=>fn!==f)}};
    for(const f of handlers)f({date,state:frame},{type:'autosave'});
    const data={slot:0,data:frame},meta={slot:0,data:{date}};
    for(const [name,v] of [['saves',data],['details',meta]])proto.add.call(Object.assign(Object.create(proto),{name,transaction:tx}),v);
    return {complete(){item=data;details=[meta];for(const f of tx.events.complete||[])f()},abort(){for(const f of tx.events.abort||[])f()}};
  }
  const receipt={attemptId:'attempt',status:'terminal',evidence:{kind:'native-passage'}};
  return {watcher,transaction,window,held,context,receipt,proto,add,handlers,stored:()=>item,storedDetails:()=>details,adds:()=>adds,corrupt(){item={...item,data:{index:0,history:[{title:'WrongScene',variables:{money:0,timeStamp:20}}]}}}};
}
test('native autosave waits for actual transaction completion and independent archive readback',async()=>{
  const f=fixture();f.watcher.install();const tx=f.transaction();let resolved=false;
  const pending=f.watcher.finish(f.receipt,f.context,f.held).then(r=>{resolved=true;return r});
  await new Promise(resolve=>setImmediate(resolve));assert.equal(resolved,false);assert.equal(f.context.records.attempt,f.held);
  tx.complete();const result=await pending;assert.equal(result.ok,true);assert.equal(result.receipt.evidence.save.count,1);
  assert.equal(save.validateEvidence(result.receipt.evidence.save),true);assert.equal(f.context.records.attempt,result.receipt);
  assert.equal(f.adds(),2);assert.equal(f.proto.add,f.add);assert.equal(f.handlers.size,0);
});

test('observer lifetime expires during never-ending readback and cannot publish a late terminal',async()=>{
 for(const method of ['getItem','getSaveDetails']){
  let expire,resolveRead;
  const deferred=()=>new Promise(resolve=>{resolveRead=resolve});
  const f=fixture({timers:{setTimeout(fn){expire=fn;return 1},clearTimeout(){}},...(method==='getItem'?{readback:deferred}:{detailReadback:deferred})});
  f.watcher.install();const tx=f.transaction();tx.complete();
  const pending=f.watcher.finish(f.receipt,f.context,f.held);
  await new Promise(resolve=>setImmediate(resolve));
  expire();
  assert.equal(f.proto.add,f.add,'deadline must restore prototype while readback is pending');
  assert.equal(f.handlers.size,0);assert.equal(f.context.records.attempt,f.held);
  assert.equal((await pending).ok,false);
  resolveRead(method==='getItem'?f.stored():f.storedDetails());await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.context.records.attempt,f.held,'late result cannot settle the unknown save');
 }
});

test('readback that resolves within the deadline still settles; a throwing reader leaves Unknown and restores ownership',async()=>{
 for(const fault of ['delay','throw']){
  let resolveRead;const f=fixture({readback:()=>fault==='throw'?Promise.reject(Error('Read failed')):new Promise(resolve=>{resolveRead=resolve})});
  f.watcher.install();f.transaction().complete();const pending=f.watcher.finish(f.receipt,f.context,f.held);
  await new Promise(resolve=>setImmediate(resolve));if(resolveRead)resolveRead(f.stored());
  assert.equal((await pending).ok,fault==='delay');assert.equal(f.proto.add,f.add);assert.equal(f.handlers.size,0);
  if(fault==='throw')assert.equal(f.context.records.attempt,f.held);
 }
});

test('save handler table replacement does not strand the owned hook in its original Set',async()=>{
 const f=fixture();f.watcher.install();const foreign=new Set();f.window.SugarCube.Save.onSave.handlers=foreign;
 assert.equal((await f.watcher.finish(f.receipt,f.context,f.held)).ok,false);
 assert.equal(f.handlers.size,0);assert.equal(foreign.size,0);assert.equal(f.proto.add,f.add);assert.equal(f.context.records.attempt,f.held);
});

test('installed save observer is bounded even if its caller never reaches finish',()=>{
  let expire;const f=fixture({timers:{setTimeout(fn){expire=fn;return 1},clearTimeout(){}}});
  f.watcher.install();assert.equal(typeof expire,'function');expire();
  assert.equal(f.proto.add,f.add);assert.equal(f.handlers.size,0);assert.equal(f.context.records.attempt,f.held);
});
test('aborted native save stays started and never publishes business terminal',async()=>{
  const f=fixture();f.watcher.install();const tx=f.transaction();const pending=f.watcher.finish(f.receipt,f.context,f.held);tx.abort();
  const result=await pending;assert.equal(result.ok,false);assert.equal(f.context.records.attempt,f.held);assert.equal(f.proto.add,f.add);assert.equal(f.handlers.size,0);
});
test('no save and observer ownership conflict have distinct closure results',async()=>{
  let f=fixture();f.watcher.install();assert.equal((await f.watcher.finish(f.receipt,f.context,f.held)).ok,true);assert.equal(f.context.records.attempt.evidence.save.count,0);
  f=fixture();f.watcher.install();const foreign=function(){};Object.defineProperty(f.proto,'add',{value:foreign,writable:true,configurable:true});
  assert.equal((await f.watcher.finish(f.receipt,f.context,f.held)).ok,false);assert.equal(f.context.records.attempt,f.held);assert.equal(f.proto.add,foreign);assert.equal(f.handlers.size,0);
});
test('scope and save-flag relaxation retain every unrelated native invariant',()=>{
  const before={autosaveDisabled:true,ironmanmode:false,engineAutosave:['autosave'],combat:false};
  assert.equal(save.flags({...before,autosaveDisabled:false,ironmanmode:true,engineAutosave:true},before),true);
  assert.equal(save.flags({...before,combat:true},before),false);assert.equal(save.flags({...before,engineAutosave:()=>true},before),false);
  assert.equal(save.authorized({intents:['save']}),false);
  assert.equal(save.validateEvidence({kind:'native-idb-save',slot:0,count:1,transactions:0,committed:true,readBack:true}),false);
});
test('native commit without matching stored projection and namespace ownership cannot settle',async()=>{
  for(const fault of ['archive','namespace']){const f=fixture();f.watcher.install();const tx=f.transaction();tx.complete();
    if(fault==='archive')f.corrupt();else f.window.receipts={records:{attempt:f.held}};
    assert.equal((await f.watcher.finish(f.receipt,f.context,f.held)).ok,false);assert.equal(f.context.records.attempt,f.held);assert.equal(f.proto.add,f.add);assert.equal(f.handlers.size,0);
  }
});
test('scoped save receipt requires its own witness; legacy receipts never inherit save permission',()=>{
  const e={executionBinding:{contract:'native-radio-save-'+'a'.repeat(12)}},r={outcome:'occurred',remoteClosed:true,evidence:{kind:'native-radio'}};
  assert.equal(save.receipt(r,e),null);const withSave={...r,evidence:{...r.evidence,save:{kind:'native-idb-save',slot:0,count:0,transactions:0,committed:true,readBack:true}}};
  const checked=save.receipt(withSave,e);assert.equal(checked.e.executionBinding.contract,'native-radio-'+'a'.repeat(12));assert.equal(Object.hasOwn(checked.r.evidence,'save'),false);
  assert.equal(save.receipt(withSave,{executionBinding:{contract:'native-radio-'+'a'.repeat(12)}}),null);
  assert.ok(Object.hasOwn(withSave.evidence,'save'));assert.match(e.executionBinding.contract,/-save-/);
});
