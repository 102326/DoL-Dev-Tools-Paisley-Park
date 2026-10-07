const test=require('node:test'),assert=require('node:assert/strict');
const {readFileSync}=require('node:fs'),{runInNewContext}=require('node:vm');
const {createRequire}=require('node:module'),{resolve}=require('node:path');
const {createHash}=require('node:crypto');
const {prepare}=require('../scripts/lib/game-native-navigation.cjs');
const attempt='12345678-1234-4123-8123-123456789abc';
const descriptor={kind:'navigation',destination:'TownPark',selected:{type:'web-click',selector:'#native'}};

test('native preparation requires a reviewed local environment and valid attempt before touching CDP',async()=>{
  let calls=0;const client={async send(){calls++;throw Error('Must not connect')}};
  for(const [id,review] of [[attempt,undefined],['a'.repeat(36),async()=>({})],[attempt,{guard:'approved'}]])
    await assert.rejects(prepare(client,descriptor,{},id,review),e=>e.code==='MAPPING_UNAVAILABLE');
  assert.equal(calls,0);
});

test('native attestation refusal releases its owned group and keeps cleanup failure distinct',async()=>{
  for(const cleanupFails of [false,true]){
    const calls=[];const client={async send(method,p){
      calls.push({method,p});
      if(method==='Runtime.evaluate')return{result:{objectId:'node'}};
      if(method==='Runtime.callFunctionOn')return p.returnByValue?{result:{value:'function changedHandler(){}'}}:{result:{objectId:'click'}};
      if(method==='Runtime.releaseObjectGroup'){if(cleanupFails)throw Error('owned release failed');return{}}
      throw Error('Unexpected CDP call');
    }};
    let reviewed=false;
    await assert.rejects(prepare(client,descriptor,{},attempt,async()=>{reviewed=true}),e=>{
      assert.equal(e.code,cleanupFails?'NATIVE_BINDING_CLEANUP_FAILED':'MAPPING_UNAVAILABLE');
      if(cleanupFails)assert.equal(e.errors.length,2);
      return true;
    });
    assert.equal(reviewed,false);
    const group=calls[0].p.objectGroup;assert.match(group,/^dol-native-navigation-/);
    assert.equal(calls.at(-1).method,'Runtime.releaseObjectGroup');assert.equal(calls.at(-1).p.objectGroup,group);
  }
});

test('literal null callback continues only for empty payload; missing and wrong bindings fail closed',async()=>{
  const path=resolve(__dirname,'../scripts/lib/game-native-navigation.cjs'),nativeRequire=createRequire(path);
  const hashes={click:'1fe31b22406ad38960860a394c640f8ecc9c491836d1db89e05873a3280eb7ad',once:'8cf443079fa20802a53dace28633b5e289d6a2e89ea30a880bb5ac5255f2f129',
    shadow:'1f8b3777011d6353ce4e1c57f25d6e12101242cd7b2a51e0cefb8c2df2c2d952',done:'955a929297fdeb6d4f9b4f7ecb379bc25cd1d45b8f293f685c7e38c41cf60077',
    play:'c5367af6062819253bd9fbd427f4789b88a6e32fb170f0ba61a4d3cf34629abd'};
  const localRequire=name=>name==='node:crypto'?{randomUUID:()=>attempt,createHash:()=>({update(value){this.value=value;return this},digest(){return hashes[this.value]||createHash('sha256').update(this.value).digest('hex')}})}:
    name==='./game-receipts.cjs'?{namespace:'reviewed',context:async()=> 'nonce'}:
    name==='./game-native-history.cjs'?{bind:async()=> 'history',checkHistory(){},sources:{}}:nativeRequire(name);
  const isolated={exports:{}};
  runInNewContext(`(function(require,module,exports,Buffer){${readFileSync(path,'utf8')}\n})`,{})(localRequire,isolated,isolated.exports,Buffer);
  const {attest,prepare:isolatedPrepare}=isolated.exports;
  const value=(type,objectId)=>({type,objectId}),scope=(id,bindings)=>({internalProperties:[{name:'[[Scopes]]',value:{objectId:id+'-scopes'}}],bindings});
  function clientFor(callbackBinding,payload='',{guardCompileFails=false}={}){
    const calls=[];let compiledGuard;
    const bindings={click:{fn:value('function','once')},once:{fn:value('function','shadow')},shadow:{
      ...(callbackBinding===undefined?{}:{callback:callbackBinding}),doneCallback:value('function','done'),shadowContext:value('object','context'),startCallback:{type:'undefined'}},
      done:{passage:{type:'string',value:'TownPark'},Engine:value('object','engine')},play:Object.fromEntries(['prehistory','predisplay','prerender','postrender','postdisplay'].map(n=>[n,value('object',n)]))};
    const client={async send(method,p){calls.push({method,p});
      if(method==='Runtime.evaluate'){
        if(p.expression.startsWith('(function(nativeEnvPhase,nativeEnvInputs)')){
          compiledGuard=p.expression.slice(1,-1);
          return guardCompileFails?{exceptionDetails:{text:'compile failed'}}:{result:{type:'function',objectId:'compiledGuard'}};
        }
        return {result:{objectId:p.expression.includes('querySelectorAll')?'node':p.expression.endsWith('.Engine')?'engine':p.expression.endsWith('.State')?'state':'wikifier'}};
      }
      if(method==='Runtime.getProperties'){
        if(p.objectId.endsWith('-scopes'))return {result:[{value:{description:'Closure (reviewed)',objectId:p.objectId.replace('-scopes','-bindings')}}]};
        if(p.objectId.endsWith('-bindings'))return {result:Object.entries(bindings[p.objectId.replace('-bindings','')]||{}).map(([name,v])=>({name,value:v}))};
        return scope(p.objectId,bindings[p.objectId]);
      }
      if(method==='Runtime.callFunctionOn'){
        if(p.functionDeclaration.includes('Function.prototype.toString'))return {result:{value:p.objectId==='compiledGuard'?compiledGuard:p.objectId}};
        if(p.returnByValue)return {result:{value:p.objectId==='node'&&p.functionDeclaration.includes('ctx.payload')?
          {passage:'Start2',turns:1,time:0,money:0,payload}:true}};
        return {result:{objectId:p.objectId==='node'?'click':'play'}};
      }
      if(method==='Runtime.releaseObjectGroup')return {};
      throw Error('Unexpected '+method);
    }};
    return {client,calls};
  }
  const nullBinding={type:'object',subtype:'null',value:null};
  const accepted=clientFor(nullBinding);
  assert.equal((await attest(clientFor(nullBinding).client,descriptor)).objects.state,'state');
  const prepared=await isolatedPrepare(accepted.client,descriptor,{},attempt,async()=>({terminalReviewed:true,id:'reviewed',guard:'return undefined',arguments:[],objects:{jq:'jq',footer:'footer'}}));
  assert.deepEqual(JSON.parse(JSON.stringify(prepared.arguments[4])),{value:null});
  assert.match(prepared.source,/observedInputs\[4\]!==null/);
  assert.equal(accepted.calls.some(c=>c.p?.objectId==='callback'),false);
  assert.equal(accepted.calls.some(c=>c.method==='Runtime.releaseObjectGroup'),false);
  const fresh={terminalReviewed:true,id:'reviewed',guard:'return undefined',arguments:[],objects:{jq:'jq',footer:'footer'},sceneEpochSha256:'a'.repeat(64)};
  const stamped=await isolatedPrepare(clientFor(nullBinding).client,descriptor,{},attempt,async()=>fresh);
  const changed=await isolatedPrepare(clientFor(nullBinding).client,descriptor,{},attempt,async()=>({...fresh,sceneEpochSha256:'b'.repeat(64)}));
  assert.equal(stamped.executionBinding.contract,prepared.executionBinding.contract);
  assert.equal(changed.executionBinding.contract,stamped.executionBinding.contract);
  assert.notEqual(stamped.executionBinding.requestDigest,prepared.executionBinding.requestDigest);
  assert.notEqual(changed.executionBinding.requestDigest,stamped.executionBinding.requestDigest);
  for(const sceneEpochSha256 of ['bad',null]){
    const {client,calls}=clientFor(nullBinding);
    await assert.rejects(isolatedPrepare(client,descriptor,{},attempt,async()=>({...fresh,sceneEpochSha256})),e=>e.code==='MAPPING_UNAVAILABLE');
    assert.equal(calls.at(-1).method,'Runtime.releaseObjectGroup');
  }
  const large=clientFor(nullBinding),largeGuard='/*'+'reviewed inventory '.repeat(1100)+'*/return undefined';
  const bounded=await isolatedPrepare(large.client,descriptor,{},attempt,async()=>({terminalReviewed:true,id:'large-reviewed',guard:largeGuard,arguments:[],objects:{jq:'jq',footer:'footer'}}));
  assert.ok(Buffer.byteLength(bounded.operation.source)<32768);
  assert.equal(bounded.operation.source.includes('reviewed inventory'),false);
  const compiled=large.calls.find(c=>c.method==='Runtime.evaluate'&&c.p.expression.startsWith('(function(nativeEnvPhase,nativeEnvInputs)'));
  assert.equal(compiled.p.objectGroup,bounded.objectGroups[0]);
  assert.deepEqual(JSON.parse(JSON.stringify(bounded.arguments.at(-1))),{objectId:'compiledGuard'});
  const badCompile=clientFor(nullBinding,'',{guardCompileFails:true});
  await assert.rejects(isolatedPrepare(badCompile.client,descriptor,{},attempt,async()=>({terminalReviewed:true,id:'reviewed',guard:'return undefined',arguments:[],objects:{jq:'jq',footer:'footer'}})),e=>e.cause?.message==='Native environment guard compilation failed');
  assert.equal(badCompile.calls.at(-1).method,'Runtime.releaseObjectGroup');
  const reviewed={terminalReviewed:true,id:'reviewed',guard:'return undefined',arguments:[{objectId:'timeMonitor'}],monitorIndex:0,monitorDigest:'b'.repeat(64),objects:{jq:'jq',footer:'footer'}};
  const monitored=clientFor(nullBinding),withMonitor=await isolatedPrepare(monitored.client,descriptor,{},attempt,async()=>reviewed);
  assert.notEqual(withMonitor.executionBinding.contract,prepared.executionBinding.contract);
  assert.deepEqual(JSON.parse(JSON.stringify(withMonitor.arguments[18])),{objectId:'timeMonitor'});
  assert.match(withMonitor.source,/observedInputs\[18\]/);
  assert.match(withMonitor.operation.source,/observedInputs\[18\]/);
  for(const invalid of [{...reviewed,monitorIndex:1},{...reviewed,monitorDigest:'bad'},{...reviewed,monitorIndex:undefined}]){
    const {client,calls}=clientFor(nullBinding);
    await assert.rejects(isolatedPrepare(client,descriptor,{},attempt,async()=>invalid),e=>e.code==='MAPPING_UNAVAILABLE');
    assert.equal(calls.at(-1).method,'Runtime.releaseObjectGroup');
  }
  for(const [binding,text] of [[undefined,''],[{type:'undefined'},''],[nullBinding,'nonempty']]){
    const {client,calls}=clientFor(binding,text);
    await assert.rejects(attest(client,descriptor),/destination binding missing|callback binding unavailable|null callback has nonempty payload/);
    assert.equal(calls.at(-1).method,'Runtime.releaseObjectGroup');
  }
});
