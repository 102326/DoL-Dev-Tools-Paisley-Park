import type cdp from './cdp.cjs';
declare namespace contracts {
 type Client=Pick<cdp.Client,'send'>;
 interface CaptureLimit {maxResponseBytes:number}
 type Wrapper={handlerSha256:string;captured:{name:unknown;sha256:string}&({type:'object';property:'handler'}|{type:'function';property?:never})};
 interface Options {retain?:boolean;handlerSha256?:string;wrapperChain?:Wrapper[]}
 interface Widget {name:string;sha256:string;source:string;passage:string;handlerBinding:string;objectId?:unknown;bodyHandlerId?:unknown;definitionId?:unknown;wrapperBindings?:{objectId:unknown;property:string;valueId:unknown}[];wrapperFunctionIds?:unknown[];objectGroup?:string}
 interface FunctionMacro {name:string;sha256:string;source:string;handlerBinding:string;objectId?:unknown;functionId?:unknown;objectGroup?:string}
}
// Property views describe access, not validated CDP envelopes. Opaque remote IDs
// remain unknown; only the original runtime checks establish each returned fact.
interface RemoteObject {type?:unknown;objectId?:unknown;value?:unknown;description?:unknown}
interface Property {name?:unknown;value?:RemoteObject}
interface RemoteView {exceptionDetails?:unknown;result?:RemoteObject}
interface PropertiesView {result?:Property[];internalProperties?:Property[]}
const {loadedWidget}:typeof import('./browser/widget-source.cjs')=require('./browser/widget-source.cjs');
const { createHash, randomUUID }:typeof import('node:crypto') = require('node:crypto');

const MAX_SOURCE = 32768;



function one(properties:PropertiesView|null|undefined, name:unknown) {
  const hits = properties?.result?.filter(item => item.name === name);
  if (hits?.length !== 1 || !hits[0].value) throw Error('Widget binding unavailable: ' + name);
  return hits[0].value;
}

async function attestWidget(client:contracts.Client, name:string, expectedSha256:string, { retain = false, handlerSha256, wrapperChain = [] }:contracts.Options = {}):Promise<contracts.Widget> {
  if (!client || typeof client.send !== 'function'
    || typeof name !== 'string' || !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(name)
    || typeof expectedSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(expectedSha256) || typeof retain !== 'boolean' || handlerSha256 !== undefined && (typeof handlerSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(handlerSha256))) {
    throw Error('Invalid widget attestation request');
  }
  if (!Array.isArray(wrapperChain) || wrapperChain.length > 4 || wrapperChain.some(step =>
    !step || Object.keys(step).some(k => !['handlerSha256','captured'].includes(k)) || typeof step.handlerSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(step.handlerSha256) ||
    !step.captured || Object.keys(step.captured).some(k => !['name','type','property','sha256'].includes(k)) || !/^[A-Za-z_$][\w$]{0,63}$/.test((step.captured.name || '') as string) ||
    !['function','object'].includes(step.captured.type) || typeof step.captured.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(step.captured.sha256) ||
    (step.captured.type === 'object' ? step.captured.property !== 'handler' : step.captured.property !== undefined))) throw Error('Invalid widget wrapper chain');
  const objectGroup = 'dol-widget-attest-' + randomUUID();
  const properties = (objectId:unknown) => client.send('Runtime.getProperties', { objectId, ownProperties: true, generatePreview: false }) as Promise<PropertiesView>;
  let result:contracts.Widget|undefined, failure:unknown, failed=false;
  try {
    const evaluated = await client.send('Runtime.evaluate', {
      expression: 'window.SugarCube?.Macro?.get?.(' + JSON.stringify(name) + ')?.handler',
      returnByValue: false, objectGroup, silent: true,
    }) as RemoteView;
    const handler = evaluated?.result;
    if (evaluated?.exceptionDetails || handler?.type !== 'function' || !handler!.objectId) throw Error('Widget handler unavailable');
    if(handlerSha256!==undefined){
      const evaluatedHandler=await client.send('Runtime.callFunctionOn',{objectId:handler!.objectId,functionDeclaration:'function() { return Function.prototype.toString.call(this); }',returnByValue:true}) as RemoteView;
      if(evaluatedHandler.exceptionDetails||typeof evaluatedHandler.result?.value!=='string'||createHash('sha256').update(evaluatedHandler.result.value).digest('hex')!==handlerSha256)throw Error('Widget handler source hash mismatch');
    }
    let bodyHandler = handler;
    const wrapperBindings:NonNullable<contracts.Widget['wrapperBindings']> = [], wrapperFunctionIds:unknown[] = [];
    const verifySource = async (id:unknown, expected:string) => {
      const evaluatedSource = await client.send('Runtime.callFunctionOn', { objectId: id, functionDeclaration: 'function() { return Function.prototype.toString.call(this); }', returnByValue: true }) as RemoteView;
      const source = evaluatedSource.result?.value;
      if (evaluatedSource.exceptionDetails || typeof source !== 'string' || Buffer.byteLength(source) > MAX_SOURCE || createHash('sha256').update(source).digest('hex') !== expected) throw Error('Widget wrapper source hash mismatch');
    };
    for (const step of wrapperChain) {
      wrapperFunctionIds.push(bodyHandler!.objectId);
      await verifySource(bodyHandler.objectId, step.handlerSha256);
      const ownWrapper = await properties(bodyHandler.objectId);
      const scopeId = ownWrapper.internalProperties?.find(p => p.name === '[[Scopes]]')?.value?.objectId;
      if (!scopeId) throw Error('Widget wrapper scopes unavailable');
      const scopes = await properties(scopeId);
      let binding;
      for (const scope of scopes.result || []) {
        if (!/^(Closure|Block)\b/.test(((scope.value?.description || '') as string) as string) || !scope.value!.objectId) continue;
        const entries = await properties(scope.value!.objectId);
        if (entries.result?.some(p => p.name === step.captured.name)) { binding = one(entries, step.captured.name); break; }
      }
      if (!binding?.objectId || binding.type !== step.captured.type) throw Error('Widget wrapper captured binding unavailable');
      if (step.captured.type === 'object') {
        const next = one(await properties(binding.objectId), 'handler');
        if (next.type !== 'function' || !next.objectId) throw Error('Widget wrapper definition handler unavailable');
        wrapperBindings.push({ objectId: binding.objectId, property: 'handler', valueId: next.objectId });
        bodyHandler = next;
      } else bodyHandler = binding;
      await verifySource(bodyHandler.objectId, step.captured.sha256);
    }
    const own = await properties(bodyHandler.objectId);
    const scopes = own?.internalProperties?.filter(item => item.name === '[[Scopes]]');
    if (scopes?.length !== 1 || !scopes[0].value?.objectId) throw Error('Widget closure scopes unavailable');
    const scopeList = await properties(scopes[0].value.objectId);
    if (!Array.isArray(scopeList?.result)) throw Error('Widget closure scopes unavailable');
    const candidates = [];
    for (const scope of scopeList.result) {
      if (!/^(Closure|Block)\b/.test((scope.value?.description || '') as string) || !scope.value!.objectId) continue;
      const entries = await properties(scope.value!.objectId);
      if (!Array.isArray(entries?.result)) throw Error('Widget closure unavailable');
      if (entries.result.some(item => item.name === 'widgetCode' || item.name === 'widgetDefCtx')) { candidates.push(entries); break; }
    }
    if (candidates.length !== 1) throw Error('Widget closure binding ambiguous or missing');
    const code = one(candidates[0], 'widgetCode');
    const definition = one(candidates[0], 'widgetDefCtx');
    if (code.type !== 'string' || typeof code.value !== 'string' || code.value.length > MAX_SOURCE
      || Buffer.byteLength(code.value, 'utf8') > MAX_SOURCE || !definition.objectId) {
      throw Error('Widget captured source unavailable');
    }
    const definitionProperties = await properties(definition.objectId);
    const payload = one(definitionProperties, 'payload');
    if (!payload.objectId) throw Error('Widget definition payload unavailable');
    const payloadProperties = await properties(payload.objectId);
    const item = one(payloadProperties, '0');
    if (!item.objectId || one(payloadProperties, 'length').value !== 1) throw Error('Widget definition payload ambiguous');
    const itemProperties = await properties(item.objectId);
    const contents = one(itemProperties, 'contents');
    if (contents.type !== 'string' || contents.value !== code.value) throw Error('Widget captured definition mismatch');
    const story = await client.send('Runtime.evaluate', {
      expression: '(' + loadedWidget.toString() + ')(' + JSON.stringify(name) + ',' + MAX_SOURCE + ')',
      returnByValue: true, objectGroup, silent: true,
    }) as RemoteView;
    const loaded = story?.result?.value as {error?:unknown;body?:unknown;passage?:unknown}|null|undefined;
    if (story?.exceptionDetails || loaded?.error || typeof loaded?.body !== 'string'
      || typeof loaded.passage !== 'string' || loaded.passage.length > 128
      || loaded.body !== code.value) throw Error('Widget loaded Story source mismatch');
    const sha256 = createHash('sha256').update(code.value).digest('hex');
    if (sha256 !== expectedSha256) throw Error('Widget source hash mismatch');
    result = {
      name, sha256, source: code.value, passage: loaded.passage,
      handlerBinding: 'closure widgetCode = widgetDefCtx.payload[0].contents = unique Story widget body',
      ...(retain ? { objectId: handler.objectId, bodyHandlerId: bodyHandler.objectId, definitionId: definition.objectId, wrapperBindings, wrapperFunctionIds, objectGroup } : {}),
    };
  } catch (error) { failed=true; failure = error; }
  // The reviewed executor owns these exact objects until the guarded operation ends.
  if (retain && !failed) return result!;
  try { await client.send('Runtime.releaseObjectGroup', { objectGroup }) as RemoteView; }
  catch (error) {
    if (failed) throw Object.assign(new AggregateError([failure, error], 'Widget attestation and object cleanup failed'), { code: 'NATIVE_BINDING_CLEANUP_FAILED' });
    throw Object.assign(new Error('Widget object cleanup failed', { cause: error }), { code: 'NATIVE_BINDING_CLEANUP_FAILED' });
  }
  if (failed) throw failure;
  return result!;
}

// Some loaded Mods replace a Twee widget with a captured JS function. The wrapper
// text alone identifies none of that function's business behavior.
async function attestFunctionMacro(client:contracts.Client, name:string, expectedSha256:string, { retain = false, handlerSha256 }:Pick<contracts.Options,'retain'|'handlerSha256'> = {}):Promise<contracts.FunctionMacro> {
  if (!client || typeof client.send !== 'function' || typeof name!=='string' || !/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(name) || typeof expectedSha256!=='string' || !/^[a-f0-9]{64}$/.test(expectedSha256) || typeof retain !== 'boolean' || handlerSha256 !== undefined && (typeof handlerSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(handlerSha256))) throw Error('Invalid function macro attestation');
  const objectGroup = 'dol-function-macro-' + randomUUID();
  const properties = (objectId:unknown) => client.send('Runtime.getProperties', { objectId, ownProperties: true, generatePreview: false }) as Promise<PropertiesView>;
  let result:contracts.FunctionMacro|undefined, failure:unknown, failed=false;
  try {
    const evaluated = await client.send('Runtime.evaluate', { expression: 'window.SugarCube?.Macro?.get?.(' + JSON.stringify(name) + ')?.handler', returnByValue: false, objectGroup, silent: true }) as RemoteView;
    const handler = evaluated?.result;
    if (evaluated.exceptionDetails || handler?.type !== 'function' || !handler.objectId) throw Error('Function macro handler unavailable');
    if(handlerSha256!==undefined){
      const evaluatedHandler=await client.send('Runtime.callFunctionOn',{objectId:handler.objectId,functionDeclaration:'function() { return Function.prototype.toString.call(this); }',returnByValue:true}) as RemoteView;
      if(evaluatedHandler.exceptionDetails||typeof evaluatedHandler.result?.value!=='string'||createHash('sha256').update(evaluatedHandler.result.value).digest('hex')!==handlerSha256)throw Error('Function macro handler source hash mismatch');
    }
    const entries = await properties(handler.objectId);
    const scopeId = entries.internalProperties?.find(p => p.name === '[[Scopes]]')?.value?.objectId;
    if (!scopeId) throw Error('Function macro scopes unavailable');
    const scopes = await properties(scopeId), matches = [];
    for (const scope of scopes.result || []) {
      if (!/^(Closure|Block)\b/.test((scope.value?.description || '') as string) || !scope.value!.objectId) continue;
      const values = await properties(scope.value!.objectId);
      for (const entry of values.result || []) if (entry.name === 'macroFunction') matches.push(entry.value);
      // Lexical resolution uses the innermost binding. Do not expand unrelated
      // outer game/module closures after finding the actual captured function.
      if (matches.length) break;
    }
    if (matches.length !== 1 || matches[0]?.type !== 'function' || !matches[0].objectId) throw Error('Function macro binding ambiguous or missing');
    const evaluatedSource = await client.send('Runtime.callFunctionOn', { objectId: matches[0].objectId, functionDeclaration: 'function() { return Function.prototype.toString.call(this); }', returnByValue: true }) as RemoteView;
    const source = evaluatedSource?.result?.value;
    if (evaluatedSource.exceptionDetails || typeof source !== 'string' || Buffer.byteLength(source) > MAX_SOURCE || createHash('sha256').update(source).digest('hex') !== expectedSha256) throw Error('Function macro source hash mismatch');
    result = { name, sha256: expectedSha256, source, handlerBinding: 'registered handler closure macroFunction', ...(retain ? { objectId: handler.objectId, functionId: matches[0].objectId, objectGroup } : {}) };
  } catch (error) { failed=true; failure = error; }
  if (retain && !failed) return result!;
  try { await client.send('Runtime.releaseObjectGroup', { objectGroup }) as RemoteView; }
  catch (error) { throw Object.assign(new AggregateError([...(failed ? [failure] : []), error], 'Function macro object cleanup failed'), { code: 'NATIVE_BINDING_CLEANUP_FAILED' }); }
  if (failed) throw failure;
  return result!;
}

// Shared by reviewed original-operation contracts; helpers do not prove business semantics.
async function functionSource(client:contracts.Client, objectId:unknown):Promise<string> {
  const result = await client.send('Runtime.callFunctionOn', { objectId, functionDeclaration: 'function() { return Function.prototype.toString.call(this); }', returnByValue: true }) as RemoteView;
  if (result.exceptionDetails || typeof result.result?.value !== 'string' || Buffer.byteLength(result.result.value) > 32768) throw Error('Native function source unavailable');
  return result.result.value;
}
async function captured(client:contracts.Client, objectId:unknown, name:unknown, type:unknown = 'function', options?:contracts.CaptureLimit):Promise<unknown> {
  if(options!==undefined&&(!options||typeof options!=='object'||Array.isArray(options)||Reflect.ownKeys(options).length!==1||
    !Object.hasOwn(options,'maxResponseBytes')||!Number.isSafeInteger(options.maxResponseBytes)||options.maxResponseBytes<1||options.maxResponseBytes>16*1024*1024))throw Error('Invalid native capture response limit');
  const own = await client.send('Runtime.getProperties', { objectId, ownProperties: true, generatePreview: false }) as PropertiesView;
  const scopesId = own.internalProperties?.find(p => p.name === '[[Scopes]]')?.value?.objectId;
  if (!scopesId) throw Error('Native captured helper unavailable');
  const scopes = await client.send('Runtime.getProperties', { objectId: scopesId, ownProperties: true, generatePreview: false }) as PropertiesView, matches:unknown[] = [];
  for (const scope of scopes.result || []) {
    if (!/^(Closure|Block)\b/.test((scope.value?.description || '') as string) || !scope.value!.objectId) continue;
    const entries = await client.send('Runtime.getProperties', { objectId: scope.value!.objectId, ownProperties: true, generatePreview: false }, options) as PropertiesView;
    for (const entry of entries.result || []) if (entry.name === name) {
      if (entry.value?.type !== type || !entry.value!.objectId) throw Error('Native captured helper unavailable');
      matches.push(entry.value!.objectId);
    }
    if (matches.length) break;
  }
  if (matches.length !== 1) throw Error('Native captured helper ambiguous or missing');
  return matches[0];
}
async function member(client:contracts.Client, objectId:unknown, expression:string, objectGroup?:string):Promise<unknown> {
  const bound = await client.send('Runtime.callFunctionOn', {objectId,functionDeclaration:'function(){return ('+expression+');}',returnByValue:false,...(objectGroup?{objectGroup}:{})}) as RemoteView;
  if (bound.exceptionDetails || !bound.result?.objectId) throw Error('Native display binding unavailable');
  return bound.result.objectId;
}
async function sameObject(client:contracts.Client, left:unknown, right:unknown):Promise<boolean> {
  const result = await client.send('Runtime.callFunctionOn', { objectId:left, functionDeclaration:'function(other){return this===other}', arguments:[{objectId:right}], returnByValue:true }) as RemoteView;
  if (result.exceptionDetails || typeof result.result?.value !== 'boolean') throw Error('Native UI identity unavailable');
  return result.result.value;
}
const contracts = { attestWidget, attestFunctionMacro, functionSource, captured, member, sameObject };
export = contracts;
