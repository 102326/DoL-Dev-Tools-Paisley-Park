const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module'),{createHash}=require('node:crypto');
const baseline=path.join(__dirname,'fixtures/typed-native-street-baseline/street.cjs');
const current=process.env.F13_STREET_MODULE || path.join(__dirname,'../scripts/lib/game-native-street-recovery.cjs');
const baseRequire=createRequire(path.join(__dirname,'../scripts/lib/game-native-street-recovery.cjs'));
const sha=value=>createHash('sha256').update(value).digest('hex');
function fixture(file,primary,failPrimary,failCleanup){
 const id='28e28a5c-720c-413c-b3de-da249d43b33f',before={passage:'Orphanage',turns:33,time:10200,money:500};
 const selected={type:'web-click',selector:'original-unique-link'};
 const executionBinding={provider:'native-dol',contract:'native-passage-8128aafb01db',contextNonce:'5b9d5405-759a-4353-8b5b-720f7b3e5e95',requestDigest:sha(JSON.stringify({attemptId:id,selected,destination:'Domus Street',before,payloadSha256:sha('<<pass 1>>'),environment:'dol051213-native-first-street-v1'}))};
 const effect={id,status:'dispatching',action:{kind:'navigation',selected,destination:'Domus Street'},executionBinding,ack:{dispatch:'unknown',reason:'native-environment-changed'}};
 const cleanup=Error('cleanup failed'),candidate={before,after:{turns:34,time:10260,money:500},history:{}};
 const frames=[],client={evaluate:async expression=>{frames.push({evaluate:expression});return candidate},async send(method,params){frames.push({method,params});if(method==='Runtime.releaseObjectGroup'){if(failCleanup)throw cleanup;return{}};if(method==='Runtime.callFunctionOn')return {result:{type:'undefined'}};throw Error('unexpected');}};
 const module={exports:{}},load=name=>name==='node:crypto'?{createHash,randomUUID:()=> '00000000-0000-4000-8000-000000000000'}:name==='./game-native-profile.cjs'?{reviewClosedStreet:async()=>{if(failPrimary)throw primary;return {guard:'return undefined;',arguments:[{objectId:'fixture'}]}}}:baseRequire(name);
 vm.runInNewContext('(function(require,module){'+fs.readFileSync(file,'utf8')+'\n})',{})(load,module);
 return {module,client,effect,cleanup,frames};
}
async function rejection(call){try{await call();assert.fail('expected rejection')}catch(error){return error}}
test('legacy fixture demonstrates that cleanup drops falsy primary failures',async()=>{
 for(const value of [undefined,null,false,0,'']){const f=fixture(baseline,value,true,true),error=await rejection(()=>f.module.exports.recoverClosed(f.client,f.effect));assert.equal(error.code,'NATIVE_BINDING_CLEANUP_FAILED');assert.equal(error.errors.length,1);assert.equal(error.errors[0],f.cleanup)}
});
test('cleanup preserves falsy primary failures and keeps cleanup-only and primary-only behavior',async()=>{
 for(const value of [undefined,null,false,0,'']){const f=fixture(current,value,true,true),error=await rejection(()=>f.module.exports.recoverClosed(f.client,f.effect));assert.equal(error.code,'NATIVE_BINDING_CLEANUP_FAILED');assert.equal(error.errors.length,2);assert.equal(error.errors[0],value);assert.equal(error.errors[1],f.cleanup);
  const clean=fixture(current,value,true,false);assert.equal(await rejection(()=>clean.module.exports.recoverClosed(clean.client,clean.effect)),value);
 }
 const only=fixture(current,undefined,false,true),error=await rejection(()=>only.module.exports.recoverClosed(only.client,only.effect));assert.equal(error.code,'NATIVE_BINDING_CLEANUP_FAILED');assert.equal(error.errors.length,1);assert.equal(error.errors[0],only.cleanup);
});

test('successful closed recovery matches legacy frames and receipt',async()=>{
 const old=fixture(baseline,undefined,false,false),now=fixture(current,undefined,false,false);
 const oldResult=await old.module.exports.recoverClosed(old.client,old.effect),newResult=await now.module.exports.recoverClosed(now.client,now.effect);
 assert.deepEqual(JSON.parse(JSON.stringify(newResult)),JSON.parse(JSON.stringify(oldResult)));
 assert.deepEqual(JSON.parse(JSON.stringify(now.frames)),JSON.parse(JSON.stringify(old.frames)));
});
