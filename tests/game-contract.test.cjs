const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const vm = require('node:vm');
const { attestWidget, attestFunctionMacro, captured } = require('../scripts/lib/game-contract.cjs');

const name = 'wardrobewear';
const body = '\n\t<<set $worn.head to "checked">>\n';
const sha256 = value => createHash('sha256').update(value).digest('hex');

function fixture({ storyBody = body, widgetName = name, scopes = true, cleanupFails = false, duplicate = false, wrapped = false } = {}) {
  const calls = [];
  const passage = value => ({ title: 'Widgets Wardrobe', text: '<<widget "'+widgetName+'">>' + value + '<</widget>>' });
  const passages = duplicate ? [passage(storyBody), passage(storyBody)] : [passage(storyBody)];
  const values = {
    handler: { internalProperties: scopes ? [{ name: '[[Scopes]]', value: { objectId: 'scopes' } }] : [] },
    scopes: { result: [{ name: '0', value: { objectId: 'closure', description: 'Closure (handler)' } }] },
    closure: { result: [
      { name: 'widgetCode', value: { type: 'string', value: body } },
      { name: 'widgetDefCtx', value: { type: 'object', objectId: 'definition' } },
    ] },
    definition: { result: [{ name: 'payload', value: { objectId: 'payload' } }] },
    payload: { result: [
      { name: '0', value: { type: 'object', objectId: 'item' } },
      { name: 'length', value: { type: 'number', value: 1 } },
    ] },
    item: { result: [{ name: 'contents', value: { type: 'string', value: body } }] },
  };
  const sources = {handler:'function handler(){return t.apply(this,this.args)}',first:'function(){t.handler.call(this)}',middle:'function handler(){return t.apply(this,this.args)}',second:'function(){n.handler.call(this)}',body:'function handler(){return widgetCode}'};
  const wrapperChain = [];
  if (wrapped) {
    values.body = values.handler;
    for (const [id, name, type, next] of [['handler','t','function','first'],['first','t','object','definition1'],['middle','t','function','second'],['second','n','object','definition2']]) {
      values[id]={internalProperties:[{name:'[[Scopes]]',value:{objectId:id+'-scopes'}}]};
      values[id+'-scopes']={result:[{value:{description:'Block (define)',objectId:id+'-closure'}}]};
      values[id+'-closure']={result:[{name,value:{type,objectId:next}}]};
      const target = type==='object'?(next==='definition1'?'middle':'body'):next;
      if(type==='object')values[next]={result:[{name:'handler',value:{type:'function',objectId:target}}]};
      wrapperChain.push({handlerSha256:sha256(sources[id]),captured:{name,type,...(type==='object'?{property:'handler'}:{}),sha256:sha256(sources[target])}});
    }
  }
  const client = { async send(method, params) {
    calls.push({ method, params });
    if (method === 'Runtime.evaluate' && params.expression.includes('getAllWidget')) {
      return { result: { value: vm.runInNewContext(params.expression, { window: { SugarCube: { Story: { getAllWidget: () => passages } } } }) } };
    }
    if (method === 'Runtime.evaluate') return { result: { type: 'function', objectId: 'handler' } };
    if (method === 'Runtime.getProperties') return values[params.objectId];
    if (method === 'Runtime.callFunctionOn') return {result:{value:sources[params.objectId]}};
    if (method === 'Runtime.releaseObjectGroup') {
      if (cleanupFails) throw Error('release failed');
      return {};
    }
    throw Error('Unexpected CDP call');
  } };
  return { client, calls, wrapperChain, sources, values };
}

test('attests captured handler code, definition payload and unique loaded Story body', async () => {
  const f = fixture();
  const result = await attestWidget(f.client, name, sha256(body));
  assert.equal(result.sha256, sha256(body));
  assert.equal(result.source, body);
  assert.equal(result.passage, 'Widgets Wardrobe');
  assert.match(result.handlerBinding, /closure widgetCode/);
  const group = f.calls.find(call => call.method === 'Runtime.evaluate').params.objectGroup;
  assert.match(group, /^dol-widget-attest-/);
  assert.equal(f.calls.at(-1).method, 'Runtime.releaseObjectGroup');
  assert.equal(f.calls.at(-1).params.objectGroup, group);
});
test('native hyphenated widget names retain exact body and closure identity checks',async()=>{
  const widgetName='canvas-model-override',f=fixture({widgetName});
  assert.equal((await attestWidget(f.client,widgetName,sha256(body))).source,body);
  const changed=fixture({widgetName,storyBody:'changed'});
  await assert.rejects(attestWidget(changed.client,widgetName,sha256(body)),/Story source mismatch/);
  const duplicate=fixture({widgetName,duplicate:true});
  await assert.rejects(attestWidget(duplicate.client,widgetName,sha256(body)),/Story source mismatch/);
});

test('rejects changed or duplicate loaded widget bodies and releases the object group', async () => {
  for (const options of [{ storyBody: 'changed' }, { duplicate: true }]) {
    const f = fixture(options);
    await assert.rejects(attestWidget(f.client, name, sha256(body)), /Story source mismatch/);
    assert.equal(f.calls.at(-1).method, 'Runtime.releaseObjectGroup');
  }
  const wrongHash = fixture();
  await assert.rejects(attestWidget(wrongHash.client, name, sha256('other')), /source hash mismatch/);
  assert.equal(wrongHash.calls.at(-1).method, 'Runtime.releaseObjectGroup');
});

test('rejects an unexposed closure scope and invalid identity input', async () => {
  const f = fixture({ scopes: false });
  await assert.rejects(attestWidget(f.client, name, sha256(body)), /closure scopes unavailable/);
  assert.equal(f.calls.at(-1).method, 'Runtime.releaseObjectGroup');
  await assert.rejects(attestWidget(f.client, '../wardrobewear', sha256(body)), /Invalid widget attestation request/);
});

test('reports cleanup failure instead of returning a successful attestation', async () => {
  const f = fixture({ cleanupFails: true });
  await assert.rejects(attestWidget(f.client, name, sha256(body)), e => e.code === 'NATIVE_BINDING_CLEANUP_FAILED' && /object cleanup failed/.test(e.message));
  assert.equal(f.calls.at(-1).method, 'Runtime.releaseObjectGroup');
  const failed = fixture({ storyBody: 'changed', cleanupFails: true });
  await assert.rejects(attestWidget(failed.client, name, sha256(body), { retain: true }), e =>
    e.code === 'NATIVE_BINDING_CLEANUP_FAILED' && e instanceof AggregateError && e.errors.length === 2 && /Story source mismatch/.test(e.errors[0].message));
});

test('execution attestation retains the exact proven handler and definition until caller cleanup', async () => {
  const f = fixture();
  const result = await attestWidget(f.client, name, sha256(body), { retain: true });
  assert.equal(result.objectId, 'handler'); assert.equal(result.definitionId, 'definition');
  assert.equal(f.calls.some(c => c.method === 'Runtime.releaseObjectGroup'), false);
  await f.client.send('Runtime.releaseObjectGroup', { objectGroup: result.objectGroup });
  const failed = fixture({ storyBody: 'changed' });
  await assert.rejects(attestWidget(failed.client, name, sha256(body), { retain: true }), /Story source mismatch/);
  assert.equal(failed.calls.at(-1).method, 'Runtime.releaseObjectGroup');
});

test('known wrappers reach the actual captured Twee body, retaining each mutable original definition handler', async () => {
  const f=fixture({wrapped:true});
  const options={retain:true,handlerSha256:sha256(f.sources.handler),wrapperChain:f.wrapperChain};
  const proven=await attestWidget(f.client,name,sha256(body),options);
  assert.equal(proven.objectId,'handler');assert.equal(proven.bodyHandlerId,'body');
  assert.deepEqual(proven.wrapperBindings,[{objectId:'definition1',property:'handler',valueId:'middle'},{objectId:'definition2',property:'handler',valueId:'body'}]);
  await f.client.send('Runtime.releaseObjectGroup',{objectGroup:proven.objectGroup});
  const changed=fixture({wrapped:true});changed.sources.middle='function handler(){unknownOperation()}';
  await assert.rejects(attestWidget(changed.client,name,sha256(body),{...options,wrapperChain:changed.wrapperChain}),/wrapper source hash mismatch/);
  assert.equal(changed.calls.at(-1).method,'Runtime.releaseObjectGroup');
  const wrongBody=fixture({wrapped:true,storyBody:'other body'});
  await assert.rejects(attestWidget(wrongBody.client,name,sha256(body),{...options,wrapperChain:wrongBody.wrapperChain}),/Story source mismatch/);
  assert.equal(wrongBody.calls.at(-1).method,'Runtime.releaseObjectGroup');
  const shadowed=fixture({wrapped:true});
  shadowed.values.scopes.result.unshift({value:{description:'Block (inner)',objectId:'shadowed'}});
  shadowed.values.shadowed={result:[{name:'widgetCode',value:{type:'string',value:'<<set $money to 0>>'}}]};
  await assert.rejects(attestWidget(shadowed.client,name,sha256(body),{...options,wrapperChain:shadowed.wrapperChain}),/binding unavailable/);
  assert.equal(shadowed.calls.at(-1).method,'Runtime.releaseObjectGroup');
});

test('function macro attestation binds the nearest captured function and rejects a changed body', async () => {
  const handlerSource = 'function handler(){return macroFunction()}';
  const source = 'function exposure(){return 1}';
  for (const [changed, cleanupFails] of [[false,false],[true,false],[true,true]]) {
    const calls = [];
    const client = { async send(method, params) {
      calls.push({method,params});
      if(method==='Runtime.evaluate')return {result:{type:'function',objectId:'handler'}};
      if(method==='Runtime.callFunctionOn')return {result:{value:params.objectId==='handler'?handlerSource:changed?'function exposure(){return 2}':source}};
      if(method==='Runtime.getProperties') {
        if(params.objectId==='handler')return {internalProperties:[{name:'[[Scopes]]',value:{objectId:'scopes'}}]};
        if(params.objectId==='scopes')return {result:[{value:{objectId:'inner',description:'Closure (macro)'}},{value:{objectId:'outer',description:'Closure (unrelated)'}}]};
        if(params.objectId==='inner')return {result:[{name:'macroFunction',value:{type:'function',objectId:'function'}}]};
        throw Error('Must not expand unrelated outer scopes');
      }
      if(method==='Runtime.releaseObjectGroup'){if(cleanupFails)throw Error('release failed');return {}}
      throw Error('Unexpected CDP call');
    }};
    const options={retain:true,handlerSha256:sha256(handlerSource)};
    if(changed) {
      await assert.rejects(attestFunctionMacro(client,'exposure',sha256(source),options), e => cleanupFails ?
        e.code === 'NATIVE_BINDING_CLEANUP_FAILED' && e instanceof AggregateError && e.errors.length === 2 : /source hash mismatch/.test(e.message));
      assert.equal(calls.at(-1).method,'Runtime.releaseObjectGroup');
    } else {
      const proven=await attestFunctionMacro(client,'exposure',sha256(source),options);
      assert.equal(proven.functionId,'function');assert.equal(proven.objectId,'handler');
      assert.equal(calls.some(c=>c.method==='Runtime.releaseObjectGroup'),false);
      await client.send('Runtime.releaseObjectGroup',{objectGroup:proven.objectGroup});
    }
  }
  for(const attest of [attestWidget,attestFunctionMacro]) {
    await assert.rejects(attest({send() {throw Error('Invalid input must not reach CDP')}},'exposure',sha256(source),{handlerSha256:{toString:()=>sha256(handlerSource)}}),/Invalid/);
  }
});

test('captured opts into a bounded response only for the nearest closure object',async()=>{
  const calls=[],client={async send(method,params,options){
    calls.push({method,objectId:params.objectId,options});
    if(params.objectId==='handler')return {internalProperties:[{name:'[[Scopes]]',value:{objectId:'scopes'}}]};
    if(params.objectId==='scopes')return {result:[
      {value:{description:'Closure (nearest)',objectId:'inner'}},
      {value:{description:'Closure (outer)',objectId:'outer'}}]};
    if(params.objectId==='inner')return {result:[{name:'Engine',value:{type:'object',objectId:'engine'}}]};
    if(params.objectId==='outer')throw Error('Must not expand outer scope');
    throw Error('Unexpected CDP call');
  }};
  assert.equal(await captured(client,'handler','Engine','object',{maxResponseBytes:8*1024*1024}),'engine');
  assert.deepEqual(calls.map(c=>[c.objectId,c.options]),[['handler',undefined],['scopes',undefined],['inner',{maxResponseBytes:8*1024*1024}]]);
  calls.length=0;
  assert.equal(await captured(client,'handler','Engine','object'),'engine');
  assert.equal(calls[2].options,undefined);
  calls.length=0;
  await assert.rejects(captured(client,'handler','Engine','object',{maxResponseBytes:16*1024*1024+1}),/Invalid native capture response limit/);
  assert.equal(calls.length,0);
});

test('native navigation rejects changed source before expanding closures and preserves cleanup failure',async()=>{
  const {attest}=require('../scripts/lib/game-native-navigation.cjs');
  for(const cleanupFails of [false,true]){
    const calls=[],client={async send(method,params){
      calls.push({method,params});
      if(method==='Runtime.evaluate')return {result:{objectId:'node'}};
      if(method==='Runtime.callFunctionOn')return params.functionDeclaration.includes('Function.prototype.toString')?
        {result:{value:'function changedControl(){return null}'}}:{result:{objectId:'click'}};
      if(method==='Runtime.releaseObjectGroup'){if(cleanupFails)throw Error('Own object group cleanup failed');return {}}
      throw Error('Unknown source must not expand any closure');
    }};
    await assert.rejects(attest(client,{kind:'navigation',destination:'NativeScene',selected:{type:'web-click',selector:'#native'}}),
      error=>cleanupFails?error instanceof AggregateError&&error.errors.some(e=>/cleanup/.test(e.message)):/source profile changed/.test(error.message));
    assert.equal(calls.some(c=>c.method==='Runtime.getProperties'),false);
    assert.equal(calls.at(-1).method,'Runtime.releaseObjectGroup');
    assert.equal(calls.at(-1).params.objectGroup,calls[0].params.objectGroup);
  }
});
