// Local access views do not validate remote CDP payloads or old effects.
interface EffectView {id?:unknown;status?:unknown;ack?:{dispatch?:unknown;reason?:unknown};action?:{kind?:unknown;destination?:unknown;selected?:{type?:unknown}};executionBinding?:{provider?:unknown;contract?:unknown;contextNonce?:unknown;requestDigest?:unknown}}
interface Candidate {before:{passage:unknown;turns:unknown;time:unknown;money:unknown};after:{turns:unknown;time:unknown;money:unknown};history:unknown}
interface Remote {exceptionDetails?:unknown;result?:{type?:unknown}}
'use strict';
import type cdp from './cdp.cjs';
const {createHash,randomUUID}:typeof import('node:crypto')=require('node:crypto'),receipts:typeof import('./game-receipts.cjs')=require('./game-receipts.cjs'),profile=require('./game-native-street-profile.json') as {id:string};
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
// One withdrawn development producer had the wrong NPC container assertion.
// Do not repair its page record or turn any started receipt into a terminal.
// Frozen legacy no-save contract: new scoped save permission cannot reinterpret it.
const {readClosed}:typeof import('./browser-abi/native-street-recovery.cjs')=require('./browser-abi/native-street-recovery.cjs');

async function recoverClosed(client:Pick<cdp.Client,'send'|'evaluate'>,rawEffect:unknown){
 const effect=rawEffect as EffectView|null|undefined;
 const binding=effect?.executionBinding;
 if(effect?.status!=='dispatching'||effect.ack?.dispatch!=='unknown'||effect.ack.reason!=='native-environment-changed'||
  binding?.provider!=='native-dol'||binding.contract!=='native-passage-8128aafb01db'||effect.action?.kind!=='navigation'||
  effect.action.destination!=='Domus Street'||effect.action.selected?.type!=='web-click')return null;
 receipts.validate(binding);
 const candidate=await client.evaluate(`(${readClosed.toString()})(${JSON.stringify(receipts.namespace)},${JSON.stringify(effect)})`) as Candidate|null;
 if(!candidate)return null;
 const payload='<<pass 1>>',requestDigest=sha(JSON.stringify({attemptId:effect.id,selected:effect.action.selected,destination:'Domus Street',before:candidate.before,payloadSha256:sha(payload),environment:profile.id}));
 if(requestDigest!==binding.requestDigest)return null;
 const objectGroup='dol-closed-street-'+randomUUID();let failure:unknown,failed=false;
 try{
  const held={objectGroup,before:candidate.before,destination:'Domus Street',payload,legacyContract:binding.contract};
  const environment=await (require('./game-native-profile.cjs') as typeof import('./game-native-profile.cjs')).reviewClosedStreet(client,held);
  const result=await client.send('Runtime.callFunctionOn',{objectId:environment.arguments[0].objectId,arguments:environment.arguments,returnByValue:true,
   functionDeclaration:`function(...nativeEnvInputs){const nativeEnvPhase='after';${environment.guard}}`}) as Remote;
  if(result.exceptionDetails||result.result?.type!=='undefined')return null;
  const fresh=await client.evaluate(`(${readClosed.toString()})(${JSON.stringify(receipts.namespace)},${JSON.stringify(effect)})`);
  if(JSON.stringify(fresh)!==JSON.stringify(candidate))return null;
  return {attemptId:effect.id,outcome:'occurred',remoteClosed:true,spent:0,source:'reviewed closed native first-street recovery; original phase diagnostics and retained adjacent history; no replay',
   evidence:{kind:'native-passage',from:'Orphanage',intended:'Domus Street',to:'Domus Street',redirected:false,turnBefore:candidate.before.turns,turnAfter:candidate.after.turns,
    timeBefore:candidate.before.time,timeAfter:candidate.after.time,moneyBefore:candidate.before.money,moneyAfter:candidate.after.money,phases:5,addonSettled:5,history:candidate.history}};
 }catch(error){failed=true;failure=error;throw error}
 finally{try{await client.send('Runtime.releaseObjectGroup',{objectGroup})}catch(error){throw Object.assign(new AggregateError([...(failed?[failure]:[]),error],'Closed street recovery cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}}
}
export = {readClosed,recoverClosed};
