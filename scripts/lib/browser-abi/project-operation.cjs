'use strict';
async function operation(node,config,read,execute,outcome,markDispatch){
 const {namespace,binding,attemptId,before,inputs,recipeSha256,operation:operationId}=config,context=window[namespace];
 const current=await read(inputs);
 if(!context||window[namespace]!==context||context.nonce!==binding.contextNonce||!context.records||Object.hasOwn(context.records,attemptId)||Object.keys(context.records).length>=64||
  node!==document.querySelector('#passages > .passage')||!node.isConnected||JSON.stringify(current)!==JSON.stringify(before))return {ok:false,guardRejected:true};
 markDispatch();const started=Object.freeze({...binding,attemptId,status:'started',phase:'project-script-started',before});context.records[attemptId]=started;
  // The return value is only execution acknowledgement, never business proof.
  await execute(inputs);
  if(window[namespace]!==context||context.records[attemptId]!==started)return {ok:false};
  const completed=Object.freeze({...binding,attemptId,status:'started',phase:'project-script-completed',executionCompleted:true,before});context.records[attemptId]=completed;
  const after=await read(inputs),result=await outcome(before,after,inputs);
  if(!after||typeof after!=='object'||Array.isArray(after)||!result||result.occurred!==true||!Number.isSafeInteger(result.spent)||result.spent<0||JSON.stringify(after).length>2048)return {ok:false};
  if(window[namespace]!==context||context.records[attemptId]!==completed)return {ok:false};
  if(config.sceneTransition==='passage'){
   const roots=document.querySelectorAll('#passages > .passage');
   if(roots.length!==1||!roots[0].isConnected||roots[0].getAttribute('data-passage')!==window.SugarCube?.State?.passage)return {ok:false};
  }else if(!node.isConnected||node!==document.querySelector('#passages > .passage'))return {ok:false};
  const evidence={kind:'project-experiment',recipeSha256,operation:operationId,before,after,executionCompleted:true};
  if(new TextEncoder().encode(JSON.stringify(evidence)).length>4096)return {ok:false};
  const receipt=Object.freeze({...binding,attemptId,status:'terminal',outcome:'occurred',remoteClosed:true,spent:result.spent,evidence});
  context.records[attemptId]=receipt;return {ok:true,receipt};
}
module.exports={operation};
