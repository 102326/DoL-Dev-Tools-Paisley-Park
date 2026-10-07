'use strict';
// Navigation completion proves the original engine/history/lifecycle transfer,
// not completion of every activity or deferred business effect in its Scene.
const {createHash}=require('node:crypto'),contracts=require('./game-contract.cjs'),environment=require('./game-native-environment.cjs');
const profile=require('./game-native-intro-profile.json'),sha=s=>createHash('sha256').update(s).digest('hex');
// Combat is an observed gameplay state, not an environment owner. Navigation
// may enter or leave it; domain activity contracts keep their stricter flags.
function navigationFlags(a,b){
  if(typeof a?.combat!=='boolean'||typeof b?.combat!=='boolean')return false;
  return JSON.stringify({...a,combat:false})===JSON.stringify({...b,combat:false});
}
function check(epoch,phase){
  const sc=window.SugarCube,s=sc?.State,p=sc?.Story?.get(epoch.destination),d=Object.getOwnPropertyDescriptor(window,'V');
  if(typeof window.DoLGameUI!=='undefined'||s!==epoch.state||!d||d.get!==epoch.getter||d.set!==undefined||window.V!==s.variables||
     sc.Macro.get('effects')?.handler!==epoch.handler||Function.prototype.toString.call(epoch.effects)!==epoch.effectsSource||
     p!==epoch.passage||p.text!==epoch.text||JSON.stringify(p.tags)!==epoch.tags)return 'native-navigation-source-epoch-changed';
  const roots=document.querySelectorAll('#passages > .passage');
  if(roots.length!==1||roots[0].getAttribute('data-passage')!==s.passage||roots[0].querySelector('.error')||!sc.Engine.isIdle())return 'native-navigation-scene-unavailable';
  if(phase==='before'&&s.passage!==epoch.before)return 'native-navigation-start-changed';
}
async function review(client,held){
  const env=await environment.bind(client,held,profile,navigationFlags),group=held.objectGroup;
  const h=await client.send('Runtime.evaluate',{expression:'window.SugarCube.Macro.get("effects").handler',objectGroup:group,returnByValue:false});
  if(h.exceptionDetails||!h.result?.objectId||sha(await contracts.functionSource(client,h.result.objectId))!==profile.handlerSha256.effects)throw Error('Original native effects handler unavailable');
  const effects=await contracts.captured(client,h.result.objectId,'effects');
  const r=await client.send('Runtime.callFunctionOn',{objectId:effects,functionDeclaration:'function(){const text=Function.prototype.toString.call(this);if(text.length>65536)throw Error("Native effects bound");return text}',returnByValue:true});
  if(r.exceptionDetails||typeof r.result?.value!=='string'||sha(r.result.value)!==profile.effectsSha256)throw Error('Original native effects source unavailable');
  const getter=await contracts.member(client,held.objects.state,'Object.getOwnPropertyDescriptor(window,"V")?.get',group);
  if(await contracts.functionSource(client,getter)!=='()=>_active.variables')throw Error('Original native V getter unavailable');
  const epoch=await client.send('Runtime.callFunctionOn',{objectId:held.objects.state,objectGroup:group,returnByValue:false,
    arguments:[{value:held.destination},{value:held.before.passage},{objectId:h.result.objectId},{objectId:effects},{objectId:getter}],functionDeclaration:`function(destination,before,handler,effects,getter){
      const passage=window.SugarCube.Story.get(destination);
      if(!passage||typeof passage.text!=='string'||passage.text.length>65536)throw Error('Receiving source bound');
      return Object.freeze({state:this,destination,before,passage,text:passage.text,tags:JSON.stringify(passage.tags),handler,effects,getter,effectsSource:Function.prototype.toString.call(effects)});
    }`});
  if(epoch.exceptionDetails||!epoch.result?.objectId)throw Error('Native navigation epoch unavailable');
  const metadata=await client.send('Runtime.callFunctionOn',{objectId:epoch.result.objectId,functionDeclaration:'function(){return {destination:this.destination,text:this.text,tags:this.tags}}',returnByValue:true});
  if(metadata.exceptionDetails||!metadata.result?.value)throw Error('Native navigation epoch metadata unavailable');
  const value=metadata.result.value;
  env.id='dol-native-navigation-'+sha(JSON.stringify(profile)).slice(0,12);
  env.arguments.push({objectId:epoch.result.objectId});
  // The fresh source stamp makes a Decision stale when its actual receiver
  // changes. It is not a registered per-Passage compatibility handler.
  env.guard=`const epochReason=(${check.toString()})(nativeEnvInputs[1],nativeEnvPhase);if(epochReason!==undefined)return epochReason;${env.guard}`;
  env.sceneEpochSha256=sha(JSON.stringify({destination:value.destination,text:value.text,tags:value.tags}));
  return env;
}
module.exports={review,check,navigationFlags};
