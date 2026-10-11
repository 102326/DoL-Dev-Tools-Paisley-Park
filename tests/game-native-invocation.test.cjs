const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {bind}=require('../scripts/lib/game-native-invocation.cjs');
test('native callable binding rejects missing or changed callable source and releases its retained object',async()=>{
 for(const source of ['function click() { [native code] }','function changed() {}']){
  const released=[],client={async send(method,p){if(method==='Runtime.releaseObject'){released.push(p.objectId);return{}}
   assert.equal(method,'Runtime.callFunctionOn');return p.returnByValue?{result:{value:source}}:{result:{type:'function',objectId:'click'}}}};
  if(source.includes('[native code]'))assert.deepEqual(await bind(client,'receiver'),{receiverId:'receiver',callableId:'click'});
  else{await assert.rejects(bind(client,'receiver'),/Unreviewed/);assert.deepEqual(released,['click'])}
 }
});
test('binding reads data descriptors without evaluating a click getter',async()=>{
 let getters=0;class Element{}const node=new Element();Object.defineProperty(node,'click',{get(){getters++;throw Error('Getter side effect')}});
 const client={async send(method,p){assert.equal(method,'Runtime.callFunctionOn');const value=vm.runInNewContext(`(${p.functionDeclaration})`,{HTMLElement:Element}).call(node);return {result:{value}}}};
 await assert.rejects(bind(client,'receiver'));assert.equal(getters,0);
});
