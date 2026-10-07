'use strict';
const {createHash,randomUUID}=require('node:crypto'),receipts=require('./game-receipts.cjs'),profile=require('./game-native-street-profile.json');
const sha=s=>createHash('sha256').update(s).digest('hex');
// One withdrawn development producer had the wrong NPC container assertion.
// Do not repair its page record or turn any started receipt into a terminal.
function readClosed(name,effect){
 const binding=effect.executionBinding,context=window[name],r=context?.records?.[effect.id],s=window.SugarCube?.State,c=window.SugarCube?.Config?.history;
 const d=r?.diagnostics,h=s?.history,x=s?.expired,root=document.querySelectorAll('#passages > .passage');
 if(context?.nonce!==binding.contextNonce||!r||r.status!=='started'||r.attemptId!==effect.id||!Object.isFrozen(r)||!Object.isFrozen(d)||
  ['provider','contract','contextNonce','requestDigest'].some(k=>r[k]!==binding[k])||d.reason!=='native-environment-changed'||
  d.phases!==5||d.footerCalls!==1||d.addonPending!==0||d.addonFulfilled!==5||d.addonRejected!==0||d.observersRestored!==true||d.historyCreated!==true||
  !Array.isArray(h)||!Array.isArray(x)||!Number.isSafeInteger(c?.maxStates)||c.maxStates<2||c.maxStates>128||
  !Number.isSafeInteger(c.maxExpired)||c.maxExpired<1||c.maxExpired>1024||x.length>=c.maxExpired||h.length<2||h.length>c.maxStates||
  s.activeIndex!==h.length-1||s.turns!==h.length+x.length||s.passage!=='Domus Street'||root.length!==1||
  root[0].getAttribute('data-passage')!==s.passage||root[0].querySelector('.error')||!window.SugarCube.Engine.isIdle())return null;
 const previous=h.at(-2),current=h.at(-1),v=s.variables,p=previous?.variables,a=current?.variables;
 // SugarCube creates the moment before rendering. Its saved tutorial/NPCList
 // are the incoming state; source-reviewed rendering updates active variables.
 if(previous?.title!=='Orphanage'||current?.title!==s.passage||p?.tutorial!==0||a?.tutorial!==0||v.tutorial!==1||
  !Number.isFinite(p.timeStamp)||a.timeStamp!==p.timeStamp+60||v.timeStamp!==a.timeStamp||!Number.isSafeInteger(p.money)||p.money<0||a.money!==p.money||v.money!==p.money||
  !Array.isArray(p.NPCList)||p.NPCList.length!==6||!Array.isArray(a.NPCList)||a.NPCList.length!==6||
  JSON.stringify(a.NPCList)!==JSON.stringify(p.NPCList)||a.npc?.length!==0||!Array.isArray(v.NPCList)||v.NPCList.length!==6||v.npc?.length!==0||
  v.options?.autosaveDisabled!==true||v.ironmanmode!==false)return null;
 const before={passage:'Orphanage',turns:s.turns-1,time:p.timeStamp,money:p.money},H=Math.min(before.turns,c.maxStates),E=before.turns-H;
 if(E<0||h.length!==Math.min(H+1,c.maxStates)||x.length!==E+Math.max(0,H+1-c.maxStates))return null;
 return {before,after:{turns:s.turns,time:v.timeStamp,money:v.money},history:{historyBefore:H,historyAfter:h.length,expiredBefore:E,expiredAfter:x.length,maxStates:c.maxStates,maxExpired:c.maxExpired,newMoment:true}};
}
async function recoverClosed(client,effect){
 const binding=effect?.executionBinding;
 if(effect?.status!=='dispatching'||effect.ack?.dispatch!=='unknown'||effect.ack.reason!=='native-environment-changed'||
  binding?.provider!=='native-dol'||binding.contract!=='native-passage-8128aafb01db'||effect.action?.kind!=='navigation'||
  effect.action.destination!=='Domus Street'||effect.action.selected?.type!=='web-click')return null;
 receipts.validate(binding);
 const candidate=await client.evaluate(`(${readClosed.toString()})(${JSON.stringify(receipts.namespace)},${JSON.stringify(effect)})`);
 if(!candidate)return null;
 const payload='<<pass 1>>',requestDigest=sha(JSON.stringify({attemptId:effect.id,selected:effect.action.selected,destination:'Domus Street',before:candidate.before,payloadSha256:sha(payload),environment:profile.id}));
 if(requestDigest!==binding.requestDigest)return null;
 const objectGroup='dol-closed-street-'+randomUUID();let failure;
 try{
  const held={objectGroup,before:candidate.before,destination:'Domus Street',payload,legacyContract:binding.contract};
  const environment=await require('./game-native-profile.cjs').reviewClosedStreet(client,held);
  const result=await client.send('Runtime.callFunctionOn',{objectId:environment.arguments[0].objectId,arguments:environment.arguments,returnByValue:true,
   functionDeclaration:`function(...nativeEnvInputs){const nativeEnvPhase='after';${environment.guard}}`});
  if(result.exceptionDetails||result.result?.type!=='undefined')return null;
  const fresh=await client.evaluate(`(${readClosed.toString()})(${JSON.stringify(receipts.namespace)},${JSON.stringify(effect)})`);
  if(JSON.stringify(fresh)!==JSON.stringify(candidate))return null;
  return {attemptId:effect.id,outcome:'occurred',remoteClosed:true,spent:0,source:'reviewed closed native first-street recovery; original phase diagnostics and retained adjacent history; no replay',
   evidence:{kind:'native-passage',from:'Orphanage',intended:'Domus Street',to:'Domus Street',redirected:false,turnBefore:candidate.before.turns,turnAfter:candidate.after.turns,
    timeBefore:candidate.before.time,timeAfter:candidate.after.time,moneyBefore:candidate.before.money,moneyAfter:candidate.after.money,phases:5,addonSettled:5,history:candidate.history}};
 }catch(error){failure=error;throw error}
 finally{try{await client.send('Runtime.releaseObjectGroup',{objectGroup})}catch(error){throw Object.assign(new AggregateError([...(failure?[failure]:[]),error],'Closed street recovery cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}}
}
module.exports={readClosed,recoverClosed};
