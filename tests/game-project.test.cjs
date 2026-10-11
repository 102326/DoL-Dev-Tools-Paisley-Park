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
