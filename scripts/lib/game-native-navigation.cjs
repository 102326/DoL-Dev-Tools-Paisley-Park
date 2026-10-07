'use strict';
// Native DoL link provenance. Destination and payload come from the actual
// control closure, never a wardrobe adapter or a planned Journey path.
const {createHash,randomUUID}=require('node:crypto');
const {functionSource,captured,member,sameObject}=require('./game-contract.cjs');
const receipts=require('./game-receipts.cjs');
const {operation,preflight}=require('./game-navigation-operation.cjs');
const historyContract=require('./game-native-history.cjs');
const digest=value=>createHash('sha256').update(value).digest('hex');
const sources={
  click:'1fe31b22406ad38960860a394c640f8ecc9c491836d1db89e05873a3280eb7ad',
  once:'8cf443079fa20802a53dace28633b5e289d6a2e89ea30a880bb5ac5255f2f129',
  shadow:'1f8b3777011d6353ce4e1c57f25d6e12101242cd7b2a51e0cefb8c2df2c2d952',
  callback:'5621b2cad59de78f2d4eb2d20c2f88c911762cca4bab5a972b220cba9842010f',
  done:'955a929297fdeb6d4f9b4f7ecb379bc25cd1d45b8f293f685c7e38c41cf60077',
  play:'c5367af6062819253bd9fbd427f4789b88a6e32fb170f0ba61a4d3cf34629abd',
};
const limit={maxResponseBytes:8*1024*1024};
async function lexical(client,fn,name){
  const props=objectId=>client.send('Runtime.getProperties',{objectId,ownProperties:true,generatePreview:false});
  const own=await props(fn),id=own.internalProperties?.find(p=>p.name==='[[Scopes]]')?.value?.objectId;
  if(!id)throw Error('Native link lexical scope unavailable');
  const scopes=await props(id);
  for(const s of scopes.result||[]){
    if(!/^(Closure|Block)\b/.test(s.value?.description||'')||!s.value?.objectId)continue;
    const values=await client.send('Runtime.getProperties',{objectId:s.value.objectId,ownProperties:true,generatePreview:false},limit);
    const found=(values.result||[]).filter(p=>p.name===name);
    if(!found.length)continue;
    if(found.length!==1||!found[0].value)throw Error('Native link lexical binding unavailable');
    return found[0].value;
  }
  throw Error('Native link destination binding missing');
}
async function attest(client,descriptor){
  const selector=descriptor?.selected?.selector;
  if(descriptor?.selected?.type!=='web-click'||descriptor.kind!=='navigation'||typeof selector!=='string'||selector.length>256||!selector||
     typeof descriptor.destination!=='string'||!descriptor.destination||descriptor.destination.length>128)throw Error('Native navigation descriptor required');
  const group='dol-native-navigation-'+randomUUID();let released=false;
  const release=async()=>{if(!released){await client.send('Runtime.releaseObjectGroup',{objectGroup:group});released=true}};
  try{
    const get=async expression=>{const r=await client.send('Runtime.evaluate',{expression,returnByValue:false,objectGroup:group,silent:true});if(r.exceptionDetails||!r.result?.objectId)throw Error('Native navigation object unavailable');return r.result.objectId};
    const verify=async(name,id)=>{if(digest(await functionSource(client,id))!==sources[name])throw Error('Native link source profile changed');return id};
    const node=await get(`(()=>{const n=document.querySelectorAll(${JSON.stringify(selector)});return n.length===1?n[0]:null})()`);
    const click=await verify('click',await member(client,node,'(()=>{const e=window.jQuery?._data?.(this,"events")?.click;return e?.length===1?e[0].handler:null})()',group));
    const once=await verify('once',await captured(client,click,'fn')),shadow=await verify('shadow',await captured(client,once,'fn'));
    const callbackBinding=await lexical(client,shadow,'callback');
    let callback;
    if(callbackBinding.type==='function'&&callbackBinding.objectId)callback=await verify('callback',callbackBinding.objectId);
    else if(callbackBinding.type==='object'&&callbackBinding.subtype==='null'&&callbackBinding.value===null&&!callbackBinding.objectId)callback=null;
    else throw Error('Native link callback binding unavailable');
    const done=await verify('done',await captured(client,shadow,'doneCallback')),context=await captured(client,shadow,'shadowContext','object');
    const held={click,once,shadow,callback,done};
    const passage=await lexical(client,done,'passage');
    if(passage.type!=='string'||typeof passage.value!=='string'||!passage.value||passage.value.length>128)throw Error('Native link destination binding unavailable');
    const destination=passage.value;
    if(destination!==descriptor.destination)throw Error('Native link destination differs from descriptor');
    if((await lexical(client,shadow,'startCallback')).type==='function')throw Error('Unreviewed native link start callback');
    const engine=await captured(client,done,'Engine','object',limit),canonical=await get('window.SugarCube.Engine');
    if(!await sameObject(client,engine,canonical))throw Error('Native link Engine alias differs');
    const play=await member(client,engine,'this.play',group);
    if(digest(await functionSource(client,play))!==sources.play)throw Error('Native Engine source profile changed');
    const state=await get('window.SugarCube.State'),history=await historyContract.bind(client,state,play,group);
    const taskNames=['prehistory','predisplay','prerender','postrender','postdisplay'],tasks=[];let populated=false;
    for(const name of taskNames){
      const objectId=await captured(client,play,name,'object');
      const check=await client.send('Runtime.callFunctionOn',{objectId,functionDeclaration:'function(){const p=Object.getPrototypeOf(this);return (p===null||p===Object.prototype)&&Reflect.ownKeys(this).length===0}',returnByValue:true});
      if(check.exceptionDetails)throw Error('Unreviewed native lifecycle task registry');
      if(check.result?.value!==true)populated=true;
      tasks.push({name,objectId});
    }
    const taskReview=populated?await require('./game-native-render-tasks.cjs').bind(client,tasks,group):null;
    // A null callback captures no Wikifier alias; retain the canonical object for the runtime guard.
    const wikifier=callback===null?await get('window.SugarCube.Wikifier'):await captured(client,callback,'Wikifier','function',limit);
    if(callback!==null&&!await sameObject(client,wikifier,await get('window.SugarCube.Wikifier')))throw Error('Native link Wikifier alias differs');
    const facts=await client.send('Runtime.callFunctionOn',{objectId:node,functionDeclaration:`function(ctx){
      const s=window.SugarCube?.State,roots=document.querySelectorAll('#passages > .passage');
      if(!this.isConnected||roots.length!==1||!roots[0].contains(this)||roots[0].getAttribute('data-passage')!==s?.passage||
         this.getAttribute('data-passage')!==${JSON.stringify(destination)}||ctx?.name!=='link'||ctx.payload?.length!==1||typeof ctx.payload[0].contents!=='string'||ctx.payload[0].contents.length>8192||
         !Number.isSafeInteger(s.turns)||!Number.isFinite(s.variables?.timeStamp)||!Number.isSafeInteger(s.variables?.money))return null;
      return {passage:s.passage,turns:s.turns,time:s.variables.timeStamp,money:s.variables.money,payload:ctx.payload[0].contents};
    }`,arguments:[{objectId:context}],returnByValue:true});
    if(facts.exceptionDetails||!facts.result?.value)throw Error('Native link original context unavailable');
    const {payload,...before}=facts.result.value;
    if(callback===null&&payload.trim()!=='')throw Error('Native link null callback has nonempty payload');
    return {status:'attested',actions:false,terminalReviewed:false,destination,before,payload,payloadSha256:digest(payload),sourceProfile:'dol-0.5.12.13-native-link',
      objects:{node,...held,context,engine,play,wikifier,state,tasks,history},taskReview,objectGroup:group,release};
  }catch(error){
    try{await release()}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native navigation attestation and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}
    throw error;
  }
}
// reviewEnvironment is reviewed local target code, never an Action/Proposal
// field. Its remote objects must use held.objectGroup; on success Semantic owns
// that group. The generic link mechanism does not certify an unknown Mod's effects.
async function prepare(client,descriptor,goal,attemptId,reviewEnvironment){
  if(typeof reviewEnvironment!=='function'||typeof attemptId!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(attemptId))
    throw Object.assign(Error('Reviewed native navigation environment required'),{code:'MAPPING_UNAVAILABLE'});
  let held;
  try{
    held=await attest(client,descriptor);
    const environment=await reviewEnvironment(client,held);
    if(environment?.terminalReviewed!==true||typeof environment.id!=='string'||!/^[a-zA-Z0-9._-]{1,64}$/.test(environment.id)||
       typeof environment.guard!=='string'||!environment.guard.trim()||Buffer.byteLength(environment.guard)>65536||
       environment.sceneEpochSha256!==undefined&&!/^[a-f0-9]{64}$/.test(environment.sceneEpochSha256)||
       !Array.isArray(environment.arguments)||environment.arguments.length>64||
       Array.from(environment.arguments).some(arg=>!arg||typeof arg!=='object'||Array.isArray(arg)||Reflect.ownKeys(arg).length!==1||
         !['value','objectId','unserializableValue'].some(key=>Object.hasOwn(arg,key))||
         Object.hasOwn(arg,'objectId')&&(typeof arg.objectId!=='string'||!arg.objectId)||
         Object.hasOwn(arg,'unserializableValue')&&typeof arg.unserializableValue!=='string')||
       environment.monitorIndex!==undefined&&(!Number.isSafeInteger(environment.monitorIndex)||environment.monitorIndex<0||environment.monitorIndex>=environment.arguments.length)||
       (environment.monitorIndex===undefined?environment.monitorDigest!==undefined:typeof environment.monitorDigest!=='string'||!/^[a-f0-9]{64}$/.test(environment.monitorDigest))||
       typeof environment.objects?.jq!=='string'||!environment.objects.jq||typeof environment.objects?.footer!=='string'||!environment.objects.footer||
       environment.objects.addon!==undefined&&(typeof environment.objects.addon!=='string'||!environment.objects.addon))
      throw Error('Native environment terminal contract unavailable');
    const o=held.objects,ids=[o.node,o.click,o.once,o.shadow,o.callback,o.done,o.context,o.engine,o.play,o.wikifier,...o.tasks.map(t=>t.objectId),environment.objects.jq,environment.objects.footer];
    const addonIndex=environment.objects.addon?ids.push(environment.objects.addon)-1:null;
    const historyIndex=ids.push(o.history)-1;
    const taskIndex=held.taskReview?ids.push(held.taskReview.objectId)-1:null;
    const baseLength=ids.length,argumentsList=[...ids.map(objectId=>objectId===null?{value:null}:{objectId}),...environment.arguments];
    const sourceChecks=[];
    for(const [name,index] of [['click',1],['once',2],['shadow',3],...(o.callback===null?[]:[['callback',4]]),['done',5],['play',8]]){
      const source=await functionSource(client,ids[index]);if(digest(source)!==sources[name])throw Error('Native source changed during preparation');
      sourceChecks.push(`if(Function.prototype.toString.call(observedInputs[${index}])!==${JSON.stringify(source)})return {ok:false,guardRejected:true};`);
    }
    if(o.callback===null)sourceChecks.push('if(observedInputs[4]!==null)return {ok:false,guardRejected:true};');
    // Keep the reviewed guard in the same owned CDP group. Passing its actual
    // function avoids copying a large environment inventory into the operation;
    // it does not raise Action's source limit or expose a page-global evaluator.
    const guardSource=`function(nativeEnvPhase,nativeEnvInputs){${environment.guard}}`;
    const guard=await client.send('Runtime.evaluate',{expression:`(${guardSource})`,objectGroup:held.objectGroup,returnByValue:false,silent:true});
    if(guard.exceptionDetails||guard.result?.type!=='function'||!guard.result.objectId||
       await functionSource(client,guard.result.objectId)!==guardSource)throw Error('Native environment guard compilation failed');
    const guardIndex=argumentsList.length;
    argumentsList.push({objectId:guard.result.objectId});
    const contextNonce=await receipts.context(client),operationSha256=digest(operation.toString()),preflightSha256=digest(preflight.toString()),historySha256=digest(historyContract.checkHistory.toString());
    const binding={provider:'native-dol',contract:'native-passage-'+digest(JSON.stringify({environment:environment.id,guard:environment.guard,guardTransport:'owned-function-v1',operationSha256,preflightSha256,historySha256,sources,historySources:historyContract.sources,...(held.taskReview?{taskDigest:held.taskReview.digest}:{}),...(o.callback===null?{callback:null}:{}),...(environment.monitorIndex===undefined?{}:{monitorIndex:environment.monitorIndex,monitorDigest:environment.monitorDigest})})).slice(0,12),
      contextNonce,requestDigest:digest(JSON.stringify({attemptId,selected:descriptor.selected,destination:held.destination,before:held.before,payloadSha256:held.payloadSha256,environment:environment.id,
        ...(environment.sceneEpochSha256===undefined?{}:{sceneEpochSha256:environment.sceneEpochSha256})}))};
    const config={namespace:receipts.namespace,binding,attemptId,before:held.before,reviewedFooter:true,controlDestination:held.destination,timeoutMs:10000};
    const addonArgument=addonIndex===null?'null':`observedInputs[${addonIndex}]`;
    const monitorArgument=environment.monitorIndex===undefined?'null':`observedInputs[${baseLength+environment.monitorIndex}]`;
    const taskArgument=taskIndex===null?'null':`observedInputs[${taskIndex}]`;
    const operationArguments=`node,${JSON.stringify(config)},observedInputs[7],observedInputs[15],observedInputs[16],${addonArgument},observedInputs.slice(10,15),observedInputs[${historyIndex}]`;
    const environmentCheck=`function(nativeEnvPhase){return observedInputs[${guardIndex}](nativeEnvPhase,observedInputs.slice(${baseLength},${guardIndex}));}`;
    const source=`
      if(node!==observedInputs[0]||window.SugarCube.Engine!==observedInputs[7]||observedInputs[7].play!==observedInputs[8]||window.SugarCube.Wikifier!==observedInputs[9]||window.jQuery!==observedInputs[15])return {ok:false,guardRejected:true};
      const nativeClicks=window.jQuery._data(node,'events')?.click,nativeContext=observedInputs[6];
      if(nativeClicks?.length!==1||nativeClicks[0].handler!==observedInputs[1]||nativeContext?.name!=='link'||nativeContext.payload?.length!==1||nativeContext.payload[0].contents!==${JSON.stringify(held.payload)})return {ok:false,guardRejected:true};
      ${sourceChecks.join('\n')}
      try{if((${environmentCheck})('before')!==undefined)return {ok:false,guardRejected:true};}
      catch{return {ok:false,guardRejected:true};}
      if((${preflight.toString()})(${operationArguments},${historyContract.checkHistory.toString()},${monitorArgument},${taskArgument})!==null)return {ok:false,guardRejected:true};
    `;
    const operationSource=`return (${operation.toString()})(${operationArguments},${preflight.toString()},${environmentCheck},${historyContract.checkHistory.toString()},${monitorArgument},${taskArgument});`;
    if(Buffer.byteLength(operationSource)>32768)throw Error('Native navigation operation source exceeds limit');
    return {action:descriptor.selected,arguments:argumentsList,objectGroups:[held.objectGroup],source,executionBinding:binding,
      interpretation:{provider:'native-dol',execution:'native-operation',contract:binding.contract,environment:environment.id,destination:held.destination},
      operation:{name:'native-passage',source:operationSource}};
  }catch(error){
    if(held)try{await held.release()}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native navigation preparation and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}
    if(error.code==='NATIVE_BINDING_CLEANUP_FAILED')throw error;
    throw Object.assign(Error('Reviewed native navigation unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'});
  }
}
// Shared link provenance also serves same-Passage controls. These helpers
// establish identity/source only; each operation still needs its own Outcome.
module.exports={attest,prepare,lexical,sources};
