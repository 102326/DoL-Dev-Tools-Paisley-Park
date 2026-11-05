const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const current=require('../scripts/lib/game-receipts.cjs'),original=require('./fixtures/typed-receipts-baseline/game-receipts.cjs');
const id='123e4567-e89b-42d3-a456-426614174000';
async function exercise(api,mode){
 const window={},context=vm.createContext({window,TextEncoder}),client={evaluate:async expression=>JSON.parse(JSON.stringify(vm.runInContext(expression,context)))};
 if(mode==='missing'){const rows=await api.recover(client,[{id,status:'dispatching',executionBinding:{provider:'native-dol',contract:'reviewed-v1',contextNonce:id,requestDigest:'a'.repeat(64)}}]);return{rows,created:Object.hasOwn(window,api.namespace)}}
 const nonce=await api.context(client);assert.equal(await api.context(client),nonce);const ns=window[api.namespace],property=Object.getOwnPropertyDescriptor(window,api.namespace);
 assert.equal(Object.isFrozen(ns),true);assert.equal(Object.getPrototypeOf(ns.records),null);assert.equal(property.writable,false);assert.equal(property.configurable,false);assert.equal(property.enumerable,false);
 const binding={provider:'native-dol',contract:'reviewed-v1',contextNonce:nonce,requestDigest:'a'.repeat(64)},result={outcome:'occurred',remoteClosed:true,spent:10,evidence:{synthetic:true}};
 ns.records[id]={...binding,attemptId:id,status:'terminal',...result,...(mode==='started'?{status:'started'}:mode==='wrong-digest'?{requestDigest:'b'.repeat(64)}:{})};
 const effect={id,status:'dispatching',executionBinding:binding};const recovered=await api.recover(client,[effect]);let retired,error;
 try{retired=await api.cleanup(client,[{...effect,status:mode==='pending'?'dispatching':'settled',result}])}catch(e){error=e.message}
 return JSON.parse(JSON.stringify({recovered,retired,error,recordPresent:Object.hasOwn(ns.records,id)}));
}
test('receipt probes preserve the fixed original namespace recovery and committed retirement behavior',async()=>{
 assert.deepEqual(Object.keys(current),Object.keys(original));assert.equal(current.namespace,original.namespace);
 for(const mode of ['good','started','wrong-digest','pending','missing'])assert.deepEqual(await exercise(current,mode),await exercise(original,mode),mode);
});
