interface Held {objectGroup:string;objects:{state:unknown};before:{passage:unknown};destination:unknown}
interface Remote {exceptionDetails?:unknown;result?:{objectId?:unknown;value?:unknown}}
'use strict';
// Navigation completion proves the original engine/history/lifecycle transfer,
// not completion of every activity or deferred business effect in its Scene.
import type cdp from './cdp.cjs';
import type environmentType from './game-native-environment.cjs';
const {createHash}:typeof import('node:crypto')=require('node:crypto'),contracts:typeof import('./game-contract.cjs')=require('./game-contract.cjs'),environment:typeof import('./game-native-environment.cjs')=require('./game-native-environment.cjs');
const profile=require('./game-native-intro-profile.json') as {handlerSha256:{effects:string};effectsSha256:string},sha=(s:string)=>createHash('sha256').update(s).digest('hex');
// Combat is an observed gameplay state, not an environment owner. Navigation
// may enter or leave it; domain activity contracts keep their stricter flags.
const {navigationFlags,check}:typeof import('./browser-abi/native-generic-landing.cjs')=require('./browser-abi/native-generic-landing.cjs');

async function review(client:Pick<cdp.Client,'send'>,held:Held,allowSave=false){
  const env=await environment.bind(client,held,profile,navigationFlags,allowSave),group=held.objectGroup;
  const h=await client.send('Runtime.evaluate',{expression:'window.SugarCube.Macro.get("effects").handler',objectGroup:group,returnByValue:false}) as Remote;
  if(h.exceptionDetails||!h.result?.objectId||sha(await contracts.functionSource(client,h.result.objectId))!==profile.handlerSha256.effects)throw Error('Original native effects handler unavailable');
  const effects=await contracts.captured(client,h.result.objectId,'effects');
  const r=await client.send('Runtime.callFunctionOn',{objectId:effects,functionDeclaration:'function(){const text=Function.prototype.toString.call(this);if(text.length>65536)throw Error("Native effects bound");return text}',returnByValue:true}) as Remote;
  if(r.exceptionDetails||typeof r.result?.value!=='string'||sha(r.result.value)!==profile.effectsSha256)throw Error('Original native effects source unavailable');
  const getter=await contracts.member(client,held.objects.state,'Object.getOwnPropertyDescriptor(window,"V")?.get',group);
  if(await contracts.functionSource(client,getter)!=='()=>_active.variables')throw Error('Original native V getter unavailable');
  const epoch=await client.send('Runtime.callFunctionOn',{objectId:held.objects.state,objectGroup:group,returnByValue:false,
    arguments:[{value:held.destination},{value:held.before.passage},{objectId:h.result.objectId},{objectId:effects},{objectId:getter}],functionDeclaration:`function(destination,before,handler,effects,getter){
      const passage=window.SugarCube.Story.get(destination);
      if(!passage||typeof passage.text!=='string'||passage.text.length>65536)throw Error('Receiving source bound');
      return Object.freeze({state:this,destination,before,passage,text:passage.text,tags:JSON.stringify(passage.tags),handler,effects,getter,effectsSource:Function.prototype.toString.call(effects)});
    }`}) as Remote;
  if(epoch.exceptionDetails||!epoch.result?.objectId)throw Error('Native navigation epoch unavailable');
  const metadata=await client.send('Runtime.callFunctionOn',{objectId:epoch.result.objectId,functionDeclaration:'function(){return {destination:this.destination,text:this.text,tags:this.tags}}',returnByValue:true}) as Remote;
  if(metadata.exceptionDetails||!metadata.result?.value)throw Error('Native navigation epoch metadata unavailable');
  const value=metadata.result.value as {destination?:unknown;text?:unknown;tags?:unknown};
  env.id='dol-native-navigation-'+sha(JSON.stringify(profile)).slice(0,12);
  env.arguments.push({objectId:epoch.result.objectId});
  // The fresh source stamp makes a Decision stale when its actual receiver
  // changes. It is not a registered per-Passage compatibility handler.
  env.guard=`const epochReason=(${check.toString()})(nativeEnvInputs[1],nativeEnvPhase);if(epochReason!==undefined)return epochReason;${env.guard}`;
  (env as environmentType.Binding & {sceneEpochSha256?:string}).sceneEpochSha256=sha(JSON.stringify({destination:value.destination,text:value.text,tags:value.tags}));
  return env as environmentType.Binding & {sceneEpochSha256:string};
}
export = {review,check,navigationFlags};
