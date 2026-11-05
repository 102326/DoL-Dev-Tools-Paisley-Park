import type cdp from './cdp.cjs';
import type action from './action.cjs';
import type predicates from './game-goal-reader.cjs';
import type receiptsAPI from './game-receipts.cjs';
import type business from './game-native-business-bindings.cjs';
import type mapping from './game-shop.cjs';
declare namespace nativeShop {
 type Client=Pick<cdp.Client,'send'|'evaluate'>;
 type Request=mapping.Request;
 interface Options {quote?:predicates.Quote;attestOnly?:boolean;scope?:unknown}
 interface Attested {status:'attested';actions:false;profile:string;before:unknown;widgets:number;functions:number;bindingCleanup:'completed'}
 interface Prepared {clickReceiverObjectId:unknown;action:{type:'web-click';selector:string};arguments:{objectId:unknown}[];objectGroups:string[];objectIds:unknown[];source:string;executionBinding:receiptsAPI.Binding;interpretation:Record<string,unknown>&{provider:'dol-shop-native';contract:string;execution:'native-operation'};operation:Readonly<action.Operation>}
 type SourceFunction=(...args:unknown[])=>unknown;
}
// Bounded ports to existing JS producers. Opaque IDs and page snapshots stay unknown.
type Mapped=mapping.Prepared;
interface Held {objectGroup:string;objects:{state:unknown;node:unknown;click:unknown;context:unknown};release:()=>Promise<void>;payloadSha256:string;shadowKeys:unknown;payload:unknown}
interface Control {attest:(client:nativeShop.Client,descriptor:{kind:'menu';selected:{type:'web-click';selector:string}},options:{allowShopPropagationStops:true})=>Promise<Held>;clickReader:nativeShop.SourceFunction}
interface SaveWatch {objectId:unknown;digest:string}
interface Save {bind:(client:nativeShop.Client,scope:unknown,group:string)=>Promise<SaveWatch|null>;execution:(source:string,index:number)=>string}
interface Environment {bind:(client:nativeShop.Client,held:{objectGroup:string},profile:unknown,flagsMatch:undefined,allowSave:boolean)=>Promise<{guard:string;arguments:{objectId:unknown}[]}>}
interface RemoteView {exceptionDetails?:unknown;result?:{type?:unknown;objectId?:unknown;value?:unknown}}
const {branch,readCurrent,dateGetterOf,sourceCheck}:{branch:nativeShop.SourceFunction;readCurrent:nativeShop.SourceFunction;dateGetterOf:nativeShop.SourceFunction;sourceCheck:nativeShop.SourceFunction}=require('./browser-abi/native-shop.cjs');
const {createHash}:typeof import('node:crypto')=require('node:crypto'),shop:typeof import('./game-shop.cjs')=require('./game-shop.cjs'),control:Control=require('./game-native-control.cjs'),contracts:typeof import('./game-contract.cjs')=require('./game-contract.cjs');
const {bind,checkBindings}:typeof import('./game-native-business-bindings.cjs')=require('./game-native-business-bindings.cjs'),environment:Environment=require('./game-native-environment.cjs'),receipts:typeof import('./game-receipts.cjs')=require('./game-receipts.cjs');
const {operation}:{operation:(...args:unknown[])=>unknown}=require('./game-shop-operation.cjs'),profile:business.Profile&{id:string;payloadSha256:string;shadowKeys:unknown}=require('./game-shop-profile.json');
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const button='#buy-send-home > .buy-button > .buy-button-inner',anchor=button+' > a.link-internal';
async function prepare(client:nativeShop.Client,raw:unknown,goal:unknown,attemptId:unknown,{quote,attestOnly=false,scope}:nativeShop.Options={}):Promise<nativeShop.Attested|nativeShop.Prepared>{
  const request=shop.validate(raw);
  if(request.operation!=='buy-one'||!quote||typeof attestOnly!=='boolean'||!attestOnly&&!/^[a-f0-9-]{36}$/.test((attemptId||'') as string))throw Object.assign(Error('Native purchase contract unavailable'),{code:'MAPPING_UNAVAILABLE'});
  let mapped:Mapped|undefined,held:Held|undefined,releaseCalled=false;const groups:string[]=[];
  const release=async()=>{releaseCalled=true;const results=await Promise.allSettled([...groups.splice(0).map(objectGroup=>client.send('Runtime.releaseObjectGroup',{objectGroup})),
    ...(mapped?[...mapped.objectIds.map(objectId=>client.send('Runtime.releaseObject',{objectId})),...mapped.objectGroups.map(objectGroup=>client.send('Runtime.releaseObjectGroup',{objectGroup}))]:[]),...(held?[held.release()]:[])]);
    if(results.some(r=>r.status==='rejected'))throw Object.assign(Error('Native shop binding cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})};
  try{
    mapped=await shop.prepare(client,request,goal,{quote});
    held=await control.attest(client,{kind:'menu',selected:{type:'web-click',selector:anchor}},{allowShopPropagationStops:true});
    if(held.payloadSha256!==profile.payloadSha256||JSON.stringify(held.shadowKeys)!==JSON.stringify(profile.shadowKeys))throw Error('Original purchase payload differs');
    const saveWatch=await (require('./game-native-save.cjs') as Save).bind(client,scope,held.objectGroup);
    const env=await environment.bind(client,held,require('./game-native-intro-profile.json'),undefined,saveWatch!==null);
    const business=await bind(client,held,profile,groups);
    const money=await contracts.member(client,business.bundleId,'this.macros.find(r=>r.name==="money").fn',held.objectGroup);
    const time=await contracts.captured(client,money,'Time','object',{maxResponseBytes:16*1024*1024});
    const dateGetter=await contracts.member(client,time,`(${dateGetterOf.toString()})(this)`,held.objectGroup);
    const compiled=`function(phase,inputs){const checkBindings=${checkBindings.toString()},dateGetterOf=${dateGetterOf.toString()};
      const reason=(${sourceCheck.toString()})(inputs[0],inputs[1],inputs[2]);if(reason!==undefined)return reason;
      const branchReason=(${branch.toString()})(phase,${saveWatch!==null});if(branchReason!==undefined)return branchReason;
      const nativeEnvInputs=[inputs[3]];return (function(){${env.guard}})();}`;
    const guard=await client.send('Runtime.evaluate',{expression:'('+compiled+')',objectGroup:held.objectGroup,returnByValue:false}) as RemoteView;
    if(guard.exceptionDetails||!guard.result?.objectId||await contracts.functionSource(client,guard.result.objectId)!==compiled)throw Error('Native purchase guard unavailable');
    const inputs=[{objectId:business.bundleId},{objectId:time},{objectId:dateGetter},...env.arguments];
    const check=await client.send('Runtime.callFunctionOn',{objectId:guard.result.objectId,functionDeclaration:'function(...inputs){return this("before",inputs)}',arguments:inputs,returnByValue:true}) as RemoteView;
    if(check.exceptionDetails||check.result?.type!=='undefined')throw Error('Native shop preflight rejected: '+(check.result?.value||'exception'));
    const raw=await client.send('Runtime.callFunctionOn',{objectId:time,functionDeclaration:`function(q){return (${readCurrent.toString()})(q,this.date.timeStamp)}`,arguments:[{value:quote}],returnByValue:true}) as RemoteView;
    if(raw.exceptionDetails||!raw.result?.value)throw Error('Native purchase original snapshot unavailable');const before=raw.result.value;
    if(attestOnly){await release();return {status:'attested',actions:false,profile:profile.id,before,widgets:business.widgets,functions:business.functions,bindingCleanup:'completed'}}
    const binding={provider:'dol-shop-native',contract:'shop-buy-one-'+(saveWatch?'save-':'')+sha(JSON.stringify(profile)+operation.toString()+compiled+readCurrent.toString()+(saveWatch?.digest||'')).slice(0,12),
      contextNonce:await receipts.context(client),requestDigest:sha(JSON.stringify({attemptId,request,quote,before,payload:held.payloadSha256}))};
    const o=held.objects,args=[{objectId:o.node},{objectId:o.click},{objectId:o.context},{objectId:guard.result.objectId},...inputs,...mapped.arguments];
    const saveIndex=saveWatch?args.push({objectId:saveWatch.objectId})-1:null;
    const source=`if(node!==observedInputs[0].parentElement||(${control.clickReader.toString()})(observedInputs[0],true)!==observedInputs[1]||
      observedInputs[2]?.payload?.[0]?.contents!==${JSON.stringify(held.payload)})return {ok:false,guardRejected:true};
      ${saveWatch?`if(observedInputs[${saveIndex}].check()!==undefined)return {ok:false,guardRejected:true};`:''}
      const mappedGuard=(function(observedInputs){${mapped.source}})(observedInputs.slice(8));if(mappedGuard?.guardRejected)return mappedGuard;
      try{if(observedInputs[3]('before',observedInputs.slice(4,8))!==undefined)return {ok:false,guardRejected:true};}catch{return {ok:false,guardRejected:true};}`;
    const config={namespace:receipts.namespace,binding,attemptId,quote,before};
    let operationSource=`return (${operation.toString()})(observedInputs[0],${JSON.stringify(config)},function(){return (${readCurrent.toString()})(${JSON.stringify(quote)},observedInputs[5].date.timeStamp)},function(phase){return observedInputs[3](phase,observedInputs.slice(4,8))},markOperationDispatch,invokeBoundClick${saveWatch?`,observedInputs[${saveIndex}]`:''});`;
    if(saveWatch)operationSource=(require('./game-native-save.cjs') as Save).execution(operationSource,saveIndex!);
    if(Buffer.byteLength(operationSource)>32768)throw Error('Native purchase operation bound');
    return {clickReceiverObjectId:o.node,action:{type:'web-click',selector:button},arguments:args,objectGroups:[held.objectGroup,...groups,...mapped.objectGroups],objectIds:mapped.objectIds,
      source,executionBinding:binding,interpretation:{...mapped.interpretation,provider:'dol-shop-native',contract:binding.contract,execution:'native-operation'},
      operation:(require('./action.cjs') as typeof import('./action.cjs')).reviewedOperation('native-shop-buy-one',operationSource)};
  }catch(error){if(releaseCalled&&(error as {code?:unknown}).code==='NATIVE_BINDING_CLEANUP_FAILED')throw error;
    try{await release()}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native purchase preparation and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}
    throw Object.assign(Error('Reviewed native purchase unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'});
  }
}
const nativeShop={prepare,branch,readCurrent,sourceCheck,dateGetterOf};
export = nativeShop;
