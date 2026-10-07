'use strict';
const {createHash}=require('node:crypto'),mapping=require('./game-wardrobe.cjs'),contracts=require('./game-contract.cjs');
const {functionSource}=contracts,environment=require('./game-native-environment.cjs'),receipts=require('./game-receipts.cjs');
const {operation}=require('./game-wardrobe-operation.cjs'),profile=require('./game-wardrobe-profile.json');
const sha=s=>createHash('sha256').update(s).digest('hex');
const {bind:bindBusiness,checkBindings}=require('./game-native-business-bindings.cjs');

// Business completion is separate from cosmetic canvas/tooltip/number rendering.
// The local profile binds the reviewed original business and receiving branches.
async function prepare(client,request,attemptId,{attestOnly=false}={}){
  mapping.validate(request);
  if(typeof attestOnly!=='boolean'||!attestOnly&&(profile.terminalReviewed!==true||!/^[a-f0-9-]{36}$/.test(attemptId||'')))
    throw Object.assign(Error('Reviewed native wardrobe contract unavailable'),{code:'MAPPING_UNAVAILABLE'});
  let held,releaseCalled=false;const groups=[];
  const release=async()=>{releaseCalled=true;const results=await Promise.allSettled([...groups.splice(0).map(objectGroup=>client.send('Runtime.releaseObjectGroup',{objectGroup})),...(held?[held.release()]:[])]);
    const errors=results.filter(r=>r.status==='rejected').map(r=>r.reason);if(errors.length)throw Object.assign(new AggregateError(errors,'Native wardrobe binding cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})};
  try{
    held=await mapping.attest(client,request);
    if(await client.evaluate(`(${mapping.branchGuard.toString()})('before',${JSON.stringify(request)})`)!==undefined)throw Error('Native clothing branch unavailable');
    const env=await environment.bind(client,held,require('./game-native-intro-profile.json'));
    const business=await bindBusiness(client,held,profile,groups);
    const compiled=`function(phase,inputs){
      const nativeEnvInputs=[inputs[1]],bindingReason=(${checkBindings.toString()})(inputs[0]);if(bindingReason!==undefined)return bindingReason;
      const reason=(${mapping.branchGuard.toString()})(phase,${JSON.stringify(request)});if(reason!==undefined)return reason;
      return (function(){${env.guard}})();
    }`;
    // Fixed local expressions, not user-supplied evaluator input. Keep the owned
    // guard off window; reuse Action's existing owned-function transport.
    const guard=await client.send('Runtime.evaluate',{expression:'('+compiled+')',objectGroup:held.objectGroup,returnByValue:false,silent:true});
    if(guard.exceptionDetails||guard.result?.type!=='function'||!guard.result.objectId||await functionSource(client,guard.result.objectId)!==compiled)throw Error('Native clothing guard compilation differs');
    const inputs=[{objectId:business.bundleId},...env.arguments],checked=await client.send('Runtime.callFunctionOn',{objectId:guard.result.objectId,functionDeclaration:'function(...inputs){return this("before",inputs)}',arguments:inputs,returnByValue:true});
    if(checked.exceptionDetails||checked.result?.type!=='undefined')throw Error('Native clothing preflight rejected: '+(checked.result?.value||'exception'));
    if(attestOnly){await release();return {status:'attested',actions:false,profile:profile.id,terminalReviewed:profile.terminalReviewed,widgets:business.widgets,functions:business.functions,bindingCleanup:'completed'}}
    const contextNonce=await receipts.context(client),binding={provider:'dol-wardrobe-native',contract:'native-head-'+request.operation+'-'+sha(JSON.stringify(profile)+operation.toString()+compiled).slice(0,12),contextNonce,requestDigest:held.requestDigest};
    const o=held.objects,argumentsList=[{objectId:o.node},{objectId:o.click},{objectId:o.context},{objectId:o.shadowStore},{objectId:guard.result.objectId},...inputs];
    // Native jQuery is already retained and checked by the environment bundle.
    const sourceGuard=`if(node!==observedInputs[0])return {ok:false,guardRejected:true};const clicks=window.jQuery._data(node,'events')?.click,args=observedInputs[3]._args;
      if(clicks?.length!==1||clicks[0].handler!==observedInputs[1]||observedInputs[2]?.payload?.[0]?.contents!==${JSON.stringify(held.payload)}||
         !Array.isArray(args)||args.length!==2||args[1]!==${JSON.stringify(request.operation==='equip'?held.interpretation.index:'strip')})return {ok:false,guardRejected:true};
      try{if(observedInputs[4]('before',observedInputs.slice(5))!==undefined)return {ok:false,guardRejected:true};}catch{return {ok:false,guardRejected:true};}`;
    const config={namespace:receipts.namespace,binding,attemptId,request,before:held.interpretation.before};
    const operationSource=`return (${operation.toString()})(node,${JSON.stringify(config)},${mapping.reader.toString()},function(phase){return observedInputs[4](phase,observedInputs.slice(5))});`;
    if(Buffer.byteLength(operationSource)>32768)throw Error('Native wardrobe operation source exceeds limit');
    return {action:{type:'web-click',selector:held.interpretation.selector},arguments:argumentsList,objectGroups:[held.objectGroup,...groups],source:sourceGuard,executionBinding:binding,
      interpretation:{...held.interpretation,provider:'dol-wardrobe-native',execution:'native-operation',contract:binding.contract},operation:{name:'native-head-'+request.operation,source:operationSource}};
  }catch(error){if(releaseCalled&&error.code==='NATIVE_BINDING_CLEANUP_FAILED')throw error;try{await release()}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native wardrobe preparation and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}
    if(error.code==='NATIVE_BINDING_CLEANUP_FAILED')throw error;throw Object.assign(Error('Reviewed native wardrobe unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'});
  }
}
module.exports={prepare,checkBindings};
