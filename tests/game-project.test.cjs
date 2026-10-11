'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {operation}=require('../scripts/lib/game-project-provider.cjs');
test('project asynchronous preflight rechecks its receiver and namespace before marking or executing',async()=>{
 for(const changed of ['root','namespace']){
  const node={isConnected:true},records=Object.create(null),context={nonce:'nonce',records},window={receipts:context};let root=node,resolveRead,marked=0,executed=0;
  const run=vm.runInNewContext('('+operation.toString()+')',{window,document:{querySelector:()=>root},TextEncoder});
  const before={money:5},promise=run(node,{namespace:'receipts',binding:{contextNonce:'nonce'},attemptId:'attempt',before,inputs:{}},
   ()=>new Promise(resolve=>{resolveRead=resolve}),()=>executed++,()=>({occurred:true,spent:0}),()=>marked++);
  if(changed==='root')root={isConnected:true};else window.receipts={nonce:'other',records:Object.create(null)};
  resolveRead(before);const result=await promise;
  assert.equal(result.guardRejected,true);assert.equal(marked,0);assert.equal(executed,0);assert.deepEqual(Object.keys(records),[]);
 }
});
test('shipped currency Recipe proves preparation without calling it a purchase or accepting unrelated state drift',()=>{
 const recipe=require('../docs/recipes/project-state.cjs'),state={passage:'Bedroom',turns:1,variables:{money:5}},realm={window:{SugarCube:{State:state}}};
 const functions=Object.fromEntries(['read','quote','execute','outcome'].map(k=>[k,vm.runInNewContext('('+recipe.operations[0][k].toString()+')',realm)]));
 assert.equal(recipe.operations[0].intent,'experiment');assert.throws(()=>functions.read({amount:-1}),/Invalid/);
 const inputs={amount:10},before=functions.read(inputs);assert.equal(functions.quote(before,inputs),0);functions.execute(inputs);
 const result=functions.outcome(before,functions.read(inputs),inputs);assert.equal(result.occurred,true);assert.equal(result.spent,0);assert.equal(state.variables.money,10);
 state.turns++;assert.equal(functions.outcome(before,functions.read(inputs),inputs).occurred,false);
});

test('explicit passage-transition Recipe can settle a fresh native root, while default, mismatched roots and new namespaces stay Unknown',async()=>{
 for(const mode of ['permitted','default','mismatch','new-namespace']){
  const old={isConnected:true},fresh={isConnected:true,getAttribute:()=>mode==='mismatch'?'Wrong':'Bedroom'},records=Object.create(null),context={nonce:'nonce',records},window={receipts:context,SugarCube:{State:{passage:'Bedroom'}}};let root=old;
  const run=vm.runInNewContext('('+operation.toString()+')',{window,document:{querySelector:()=>root,querySelectorAll:()=>[root]},TextEncoder});
  const result=await run(old,{namespace:'receipts',binding:{contextNonce:'nonce'},attemptId:'attempt',before:{loaded:false},inputs:{},...(mode==='default'?{}:{sceneTransition:'passage'})},
    ()=>({loaded:root===fresh}),()=>{root=fresh;old.isConnected=false;if(mode==='new-namespace')window.receipts={nonce:'another'}},()=>({occurred:true,spent:0}),()=>{});
  assert.equal(result.ok,mode==='permitted');assert.equal(records.attempt.status,mode==='permitted'?'terminal':'started');
 }
});

test('post-action read failure retains completed execution as a fact without inventing business Outcome',async()=>{
 const node={isConnected:true},records=Object.create(null),context={nonce:'nonce',records},window={receipts:context};let reads=0;
 const run=vm.runInNewContext('('+operation.toString()+')',{window,document:{querySelector:()=>node},TextEncoder});
 await assert.rejects(run(node,{namespace:'receipts',binding:{contextNonce:'nonce'},attemptId:'attempt',before:{value:1},inputs:{}},()=>{if(reads++)throw Error('Unknown post-state shape');return {value:1}},async()=>{},()=>({occurred:true,spent:0}),()=>{}),/Unknown post-state/);
 assert.equal(records.attempt.status,'started');assert.equal(records.attempt.executionCompleted,true);assert.equal(records.attempt.phase,'project-script-completed');assert.equal(records.attempt.outcome,undefined);
});

test('project script or observer replacing its owned record cannot be overwritten into terminal success',async()=>{
 for(const phase of ['execute','outcome']){
 const node={isConnected:true},records=Object.create(null),context={nonce:'nonce',records},window={receipts:context},replacement={status:'foreign'};
 const run=vm.runInNewContext('('+operation.toString()+')',{window,document:{querySelector:()=>node},TextEncoder});
 const result=await run(node,{namespace:'receipts',binding:{contextNonce:'nonce'},attemptId:'attempt',before:{value:1},inputs:{}},()=>({value:1}),async()=>{if(phase==='execute')records.attempt=replacement},()=>{if(phase==='outcome')records.attempt=replacement;return {occurred:true,spent:0}},()=>{});
 assert.equal(result.ok,false);assert.equal(records.attempt,replacement);
 }
});
