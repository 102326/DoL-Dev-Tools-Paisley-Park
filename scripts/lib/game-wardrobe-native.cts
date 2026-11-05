import type cdp from './cdp.cjs';
import type action from './action.cjs';
import type receiptsAPI from './game-receipts.cjs';
import type business from './game-native-business-bindings.cjs';
import type wardrobe from './game-wardrobe.cjs';
declare namespace nativeWardrobe {
 type Client=Pick<cdp.Client,'send'|'evaluate'>;
 type Request=wardrobe.Request;
 interface Options {attestOnly?:boolean;scope?:unknown}
 interface Interpretation {selector:string;index:unknown;before:unknown;[key:string]:unknown}
 interface Attested {status:'attested';actions:false;profile:string;terminalReviewed:boolean;widgets:number;functions:number;bindingCleanup:'completed'}
 interface Prepared {clickReceiverObjectId:unknown;action:{type:'web-click';selector:string};arguments:{objectId:unknown}[];objectGroups:string[];source:string;executionBinding:receiptsAPI.Binding;interpretation:Interpretation&{provider:'dol-wardrobe-native';execution:'native-operation';contract:string};operation:Readonly<action.Operation>}
}
// Bounded ports to existing JS producers, not validation of raw CDP facts.
type Held=wardrobe.Attested;
interface RemoteView {exceptionDetails?:unknown;result?:{type?:unknown;objectId?:unknown;value?:unknown}}
const {createHash}:typeof import('node:crypto')=require('node:crypto'),mapping:typeof import('./game-wardrobe.cjs')=require('./game-wardrobe.cjs'),contracts:typeof import('./game-contract.cjs')=require('./game-contract.cjs');
const {functionSource}=contracts,environment:typeof import('./game-native-environment.cjs')=require('./game-native-environment.cjs'),receipts:typeof import('./game-receipts.cjs')=require('./game-receipts.cjs');
const {operation}:typeof import('./game-wardrobe-operation.cjs')=require('./game-wardrobe-operation.cjs'),profile:business.Profile&{id:string;terminalReviewed:boolean}=require('./game-wardrobe-profile.json');
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const {bind:bindBusiness,checkBindings}:typeof import('./game-native-business-bindings.cjs')=require('./game-native-business-bindings.cjs');

// Business completion is separate from cosmetic canvas/tooltip/number rendering.
// The local profile binds the reviewed original business and receiving branches.
async function prepare(client:nativeWardrobe.Client,raw:unknown,attemptId:unknown,{attestOnly=false,scope}:nativeWardrobe.Options={}):Promise<nativeWardrobe.Attested|nativeWardrobe.Prepared>{
  const request=mapping.validate(raw);
  if(typeof attestOnly!=='boolean'||!attestOnly&&(profile.terminalReviewed!==true||!/^[a-f0-9-]{36}$/.test((attemptId||'') as string)))
    throw Object.assign(Error('Reviewed native wardrobe contract unavailable'),{code:'MAPPING_UNAVAILABLE'});
  let held:Held|undefined,releaseCalled=false;const groups:string[]=[];
  const release=async()=>{releaseCalled=true;const results=await Promise.allSettled([...groups.splice(0).map(objectGroup=>client.send('Runtime.releaseObjectGroup',{objectGroup})),...(held?[held.release()]:[])]);
    const errors=results.filter(r=>r.status==='rejected').map(r=>r.reason);if(errors.length)throw Object.assign(new AggregateError(errors,'Native wardrobe binding cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})};
  try{
    held=await mapping.attest(client,request);
    const saveWatch=await (require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).bind(client,scope,held.objectGroup);
    if(await client.evaluate(`(${mapping.branchGuard.toString()})('before',${JSON.stringify(request)},${saveWatch!==null})`)!==undefined)throw Error('Native clothing branch unavailable');
    const env=await environment.bind(client,held,require('./game-native-intro-profile.json'),undefined,saveWatch!==null);
    const business=await bindBusiness(client,held,profile,groups);
    const compiled=`function(phase,inputs){
      const nativeEnvInputs=[inputs[1]],bindingReason=(${checkBindings.toString()})(inputs[0]);if(bindingReason!==undefined)return bindingReason;
      const reason=(${mapping.branchGuard.toString()})(phase,${JSON.stringify(request)},${saveWatch!==null});if(reason!==undefined)return reason;
      return (function(){${env.guard}})();
    }`;
    // Fixed local expressions, not user-supplied evaluator input. Keep the owned
    // guard off window; reuse Action's existing owned-function transport.
    const guard=await client.send('Runtime.evaluate',{expression:'('+compiled+')',objectGroup:held.objectGroup,returnByValue:false,silent:true}) as RemoteView;
    if(guard.exceptionDetails||guard.result?.type!=='function'||!guard.result.objectId||await functionSource(client,guard.result.objectId)!==compiled)throw Error('Native clothing guard compilation differs');
    const inputs=[{objectId:business.bundleId},...env.arguments],checked=await client.send('Runtime.callFunctionOn',{objectId:guard.result.objectId,functionDeclaration:'function(...inputs){return this("before",inputs)}',arguments:inputs,returnByValue:true}) as RemoteView;
    if(checked.exceptionDetails||checked.result?.type!=='undefined')throw Error('Native clothing preflight rejected: '+(checked.result?.value||'exception'));
    if(attestOnly){await release();return {status:'attested',actions:false,profile:profile.id,terminalReviewed:profile.terminalReviewed,widgets:business.widgets,functions:business.functions,bindingCleanup:'completed'}}
    const contextNonce=await receipts.context(client),binding={provider:'dol-wardrobe-native',contract:'native-head-'+request.operation+'-'+(saveWatch?'save-':'')+sha(JSON.stringify(profile)+operation.toString()+compiled+(saveWatch?.digest||'')).slice(0,12),contextNonce,requestDigest:held.requestDigest};
    const o=held.objects,argumentsList=[{objectId:o.node},{objectId:o.click},{objectId:o.context},{objectId:o.shadowStore},{objectId:guard.result.objectId},...inputs];
    const saveIndex=saveWatch?argumentsList.push({objectId:saveWatch.objectId})-1:null;
    // Native jQuery is already retained and checked by the environment bundle.
    const sourceGuard=`if(node!==observedInputs[0])return {ok:false,guardRejected:true};${saveWatch?`if(observedInputs[${saveIndex}].check()!==undefined)return {ok:false,guardRejected:true};`:''}const clicks=window.jQuery._data(node,'events')?.click,args=observedInputs[3]._args;
      if(clicks?.length!==1||clicks[0].handler!==observedInputs[1]||observedInputs[2]?.payload?.[0]?.contents!==${JSON.stringify(held.payload)}||
         !Array.isArray(args)||args.length!==2||args[1]!==${JSON.stringify(request.operation==='equip'?held.interpretation.index:'strip')})return {ok:false,guardRejected:true};
      try{if(observedInputs[4]('before',observedInputs.slice(5))!==undefined)return {ok:false,guardRejected:true};}catch{return {ok:false,guardRejected:true};}`;
    const config={namespace:receipts.namespace,binding,attemptId,request,before:held.interpretation.before};
    let operationSource=`return (${operation.toString()})(node,${JSON.stringify(config)},${mapping.reader.toString()},function(phase){return observedInputs[4](phase,observedInputs.slice(5))},markOperationDispatch,invokeBoundClick${saveWatch?`,observedInputs[${saveIndex}]`:''});`;
    if(saveWatch)operationSource=(require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).execution(operationSource,saveIndex!);
    if(Buffer.byteLength(operationSource)>32768)throw Error('Native wardrobe operation source exceeds limit');
    return {clickReceiverObjectId:o.node,action:{type:'web-click',selector:held.interpretation.selector},arguments:argumentsList,objectGroups:[held.objectGroup,...groups],source:sourceGuard,executionBinding:binding,
      interpretation:{...held.interpretation,provider:'dol-wardrobe-native',execution:'native-operation',contract:binding.contract},operation:(require('./action.cjs') as typeof import('./action.cjs')).reviewedOperation('native-head-'+request.operation,operationSource)};
  }catch(error){if(releaseCalled&&(error as {code?:unknown}).code==='NATIVE_BINDING_CLEANUP_FAILED')throw error;try{await release()}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native wardrobe preparation and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}
    if((error as {code?:unknown}).code==='NATIVE_BINDING_CLEANUP_FAILED')throw error;throw Object.assign(Error('Reviewed native wardrobe unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'});
  }
}
const nativeWardrobe={prepare,checkBindings};
export = nativeWardrobe;
