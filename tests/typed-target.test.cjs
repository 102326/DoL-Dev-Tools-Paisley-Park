'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const target=require('../scripts/lib/runtime-target.cjs'),diagnostic=require('../scripts/lib/diagnostics.cjs');
test('typed leaf modules preserve CJS exports and fixed Android/Chrome target keys',()=>{
 assert.deepEqual(Reflect.ownKeys(target),['target','key']);assert.deepEqual(Reflect.ownKeys(diagnostic),['describe','cdpTimeout']);
 const android={serial:'offline-device',package:'com.example.game',userId:'0',targetId:'page'};
 const chrome={host:'chrome',profileId:'a'.repeat(64),browserId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',processId:123,endpoint:'http://127.0.0.1:9222',origin:'http://127.0.0.1:8000',targetId:'page'};
 assert.equal(target.key(android),'2a4ebda98875e93d52b15f7ff78dc4756e78ef0079e106b8b344b6a56e63ac38');
 assert.equal(target.key(chrome),'f39e77213dcd6737a56273f3c7bea7cdf5a726c4f49cf22ef331b63ae2dd53fd');
 for(const value of [123,false])assert.deepEqual(target.target({...android,targetId:value}),{...android,targetId:value},'legacy optional coercion remains a runtime boundary, not a new string guarantee');
 const cloned=target.target(android);assert.notEqual(cloned,android);assert.equal(Object.hasOwn(cloned,'host'),false);
 assert.throws(()=>target.target({...android,host:'android'}),/Explicit canonical target required/);
 assert.equal(target.key({...chrome,targetId:'other-page'}),target.key(chrome));
});
