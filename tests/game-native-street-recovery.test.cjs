const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module'),{createHash}=require('node:crypto');
const recovery=require('../scripts/lib/game-native-street-recovery.cjs'),{validateReceipt}=require('../scripts/lib/game-native-provider.cjs');
const sha=s=>createHash('sha256').update(s).digest('hex');
function fixture(){
 const before={passage:'Orphanage',turns:33,time:10200,money:500},id='28e28a5c-720c-413c-b3de-da249d43b33f';
 const selected={type:'web-click',selector:'original-unique-link'},binding={provider:'native-dol',contract:'native-passage-8128aafb01db',contextNonce:'5b9d5405-759a-4353-8b5b-720f7b3e5e95',
  requestDigest:sha(JSON.stringify({attemptId:id,selected,destination:'Domus Street',before,payloadSha256:sha('<<pass 1>>'),environment:'dol051213-native-first-street-v1'}))};
 const effect={id,status:'dispatching',action:{kind:'navigation',selected,destination:'Domus Street'},executionBinding:binding,ack:{dispatch:'unknown',reason:'native-environment-changed'}};
 const v={timeStamp:10260,money:500,tutorial:1,NPCList:Array.from({length:6},()=>({})),npc:[],options:{autosaveDisabled:true},ironmanmode:false};
 const previous={title:'Orphanage',variables:{tutorial:0,timeStamp:10200,money:500,NPCList:Array.from({length:6},()=>({incoming:true}))}},current={title:'Domus Street',variables:{...JSON.parse(JSON.stringify(v)),tutorial:0,NPCList:JSON.parse(JSON.stringify(previous.variables.NPCList))}};
 const state={history:[{}, {}, {},previous,current],expired:Array(29).fill('previous'),activeIndex:4,turns:34,passage:'Domus Street',variables:v};
 const record=Object.freeze({...binding,attemptId:id,status:'started',diagnostics:Object.freeze({reason:'native-environment-changed',phases:5,footerCalls:1,addonPending:0,addonFulfilled:5,addonRejected:0,observersRestored:true,historyCreated:true})});
 const context={nonce:binding.contextNonce,records:{[id]:record}},root={getAttribute:()=>state.passage,querySelector:()=>null};
 const window={receipts:context,__paisleyParkGameplayReceiptsV1:context,SugarCube:{State:state,Config:{history:{maxStates:5,maxExpired:100}},Engine:{isIdle:()=>true}}},document={querySelectorAll:()=>[root]};
 const read=()=>vm.runInNewContext(`(${recovery.readClosed.toString()})('receipts',effect)`,{window,document,effect});
 return {effect,before,v,previous,current,state,context,root,window,document,read};
}
test('closed street proof binds immutable original phase diagnostics to adjacent original history without changing the started record',()=>{
 const f=fixture(),record=f.context.records[f.effect.id],result=f.read();assert.deepEqual(JSON.parse(JSON.stringify(result.before)),f.before);
 assert.equal(result.history.newMoment,true);assert.equal(result.history.expiredBefore,28);assert.equal(f.context.records[f.effect.id],record);
 for(const mutate of [x=>x.context.nonce='other',x=>x.state.turns++,x=>x.v.money--,x=>x.v.timeStamp++,x=>x.current.variables.money--,
  x=>x.previous.title='Other',x=>x.previous.variables.tutorial=1,x=>x.v.npc.push({}),x=>x.v.NPCList.pop(),x=>x.v.options.autosaveDisabled=false,
  x=>x.state.activeIndex=3,x=>x.state.expired=Array(100).fill('previous'),x=>x.window.SugarCube.Engine.isIdle=()=>false,
  x=>x.context.records[x.effect.id]={...record},x=>x.context.records[x.effect.id]=Object.freeze({...record,diagnostics:Object.freeze({...record.diagnostics,addonPending:1})})]){
  const x=fixture();mutate(x);assert.equal(x.read(),null);
 }
});
test('recovery reuses reviewed receiver bindings, rejects a changed request digest and preserves cleanup failure',async()=>{
 const file=path.resolve(__dirname,'../scripts/lib/game-native-street-recovery.cjs'),nativeRequire=createRequire(file);
 for(const fault of [null,'digest','guard','cleanup']){
  const f=fixture(),released=[];let reviewed=0;
  const client={evaluate:async s=>vm.runInNewContext(s,{window:f.window,document:f.document}),async send(method,p){
   if(method==='Runtime.callFunctionOn')return{result:fault==='guard'?{type:'string',value:'changed'}:{type:'undefined'}};
   if(method==='Runtime.releaseObjectGroup'){released.push(p.objectGroup);if(fault==='cleanup')throw Error('Cleanup failed');return{}}
   throw Error('Unexpected I/O');
  }};
  const module={exports:{}},require=name=>name==='./game-native-profile.cjs'?{reviewClosedStreet:async(_c,held)=>{
   reviewed++;assert.equal(held.legacyContract,f.effect.executionBinding.contract);assert.equal(held.before.turns,33);
   return{arguments:[{objectId:'reviewed-environment'}],guard:'return undefined;'};
  }}:nativeRequire(name);
  vm.runInNewContext('(function(require,module){'+fs.readFileSync(file,'utf8')+'\n})',{})(require,module);
  if(fault==='digest')f.effect.executionBinding.requestDigest='0'.repeat(64);
  if(fault==='cleanup')await assert.rejects(module.exports.recoverClosed(client,f.effect),{code:'NATIVE_BINDING_CLEANUP_FAILED'});
  else{const result=await module.exports.recoverClosed(client,f.effect);if(fault)assert.equal(result,null);else{assert.equal(validateReceipt(result,f.effect),true);assert.equal(result.spent,0);assert.equal(result.evidence.time,undefined)}}
  assert.equal(reviewed,fault==='digest'?0:1);assert.equal(released.length,fault==='digest'?0:1);assert.equal(f.context.records[f.effect.id].status,'started');
 }
});
