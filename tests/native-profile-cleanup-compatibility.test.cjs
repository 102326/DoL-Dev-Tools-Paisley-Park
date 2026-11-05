const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const {fixture}=require('./fixtures/typed-native-profile-baseline/profile-fixture.cjs');
const old=path.join(__dirname,'fixtures/typed-native-profile-baseline/profile.cjs');
const current=process.env.F13_PROFILE_MODULE||path.join(__dirname,'../scripts/lib/game-native-profile.cjs');
async function rejected(f){try{await f.review(f.client,f.held);assert.fail('expected rejection')}catch(e){return e}}
function make(file,options){process.env.F13_PROFILE_MODULE=file;try{return fixture(options)}finally{delete process.env.F13_PROFILE_MODULE}}
test('legacy profile omits falsy primary on release failure',async()=>{for(const primaryValue of [undefined,null,false,0,'']){
 const f=make(old,{primaryEnabled:true,primaryValue,cleanupFails:true}),e=await rejected(f);assert.equal(e.code,'NATIVE_BINDING_CLEANUP_FAILED');assert.equal(e.errors.length,1);assert.equal(e.errors[0].message,'Owned cleanup failed');assert.ok(f.released.length);
}});
test('profile release preserves primary failures including falsy values',async()=>{for(const primaryValue of [undefined,null,false,0,'']){
 const f=make(current,{primaryEnabled:true,primaryValue,cleanupFails:true}),e=await rejected(f);assert.equal(e.code,'NATIVE_BINDING_CLEANUP_FAILED');assert.equal(e.errors.length,2);assert.equal(e.errors[0],primaryValue);assert.equal(e.errors[1].message,'Owned cleanup failed');
 const clean=make(current,{primaryEnabled:true,primaryValue});assert.equal(await rejected(clean),primaryValue);
}const only=make(current,{cleanupFails:true}),e=await rejected(only);assert.equal(e.code,'NATIVE_BINDING_CLEANUP_FAILED');assert.equal(e.errors.length,1);assert.equal(e.errors[0].message,'Owned cleanup failed');});
test('successful profile preserves legacy guard, arguments and RPC frames',async()=>{
 const before=make(old,{}),after=make(current,{});
 function record(f){const frames=[],send=f.client.send.bind(f.client),evaluate=f.client.evaluate.bind(f.client);f.client.send=async(method,params)=>{frames.push({method,params});return send(method,params)};f.client.evaluate=async expression=>{frames.push({evaluate:expression});return evaluate(expression)};return frames}
 const oldFrames=record(before),newFrames=record(after),oldResult=await before.review(before.client,before.held),newResult=await after.review(after.client,after.held);
 assert.deepEqual(JSON.parse(JSON.stringify(newResult)),JSON.parse(JSON.stringify(oldResult)));
 assert.deepEqual(JSON.parse(JSON.stringify(newFrames)),JSON.parse(JSON.stringify(oldFrames)));
});
