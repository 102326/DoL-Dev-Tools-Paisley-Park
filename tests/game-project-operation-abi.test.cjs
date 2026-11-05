'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const legacy=require('../scripts/lib/game-project-provider.cjs').operation;
const {operation}=require('../scripts/lib/browser-abi/project-operation.cjs');
test('project operation preserves the persisted v1/v2 browser source ABI',()=>{
  assert.equal(operation.name,'operation');
  assert.equal(operation.length,6);
  assert.equal(createHash('sha256').update(operation.toString()).digest('hex'),'7ae01d788237c4d8148b38d26ee3cb553f20ba4eaf4572a1788409275d997f94');
  assert.equal(operation.toString(),legacy.toString());
});

test('extracted operation preserves v1 and v2 terminal receipts',async()=>{
  const vm=require('node:vm');
  for(const transition of [false,true]){
    const old={isConnected:true};
    const fresh={isConnected:true,getAttribute:()=> 'Bedroom'};
    const records=Object.create(null),context={nonce:'nonce',records};
    const window={receipts:context,SugarCube:{State:{passage:'Bedroom'}}};
    let root=old,marked=0;
    const run=vm.runInNewContext(`(${operation.toString()})`,{window,document:{querySelector:()=>root,querySelectorAll:()=>[root]},TextEncoder});
    const binding={contextNonce:'nonce',contract:transition?'project-recipe-v2':'project-recipe-v1'};
    const result=await run(old,{namespace:'receipts',binding,attemptId:'attempt',before:{value:1},inputs:{},recipeSha256:'sha',operation:'change',...(transition?{sceneTransition:'passage'}:{})},
      ()=>({value:root===fresh?2:1}),()=>{if(transition){root=fresh;old.isConnected=false}},()=>({occurred:true,spent:0}),()=>marked++);
    assert.equal(marked,1);
    assert.equal(result.ok,true);
    assert.equal(records.attempt.status,'terminal');
    assert.equal(records.attempt.contract,binding.contract);
    assert.equal(records.attempt.evidence.operation,'change');
  }
});
