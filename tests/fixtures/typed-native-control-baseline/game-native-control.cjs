'use strict';
const {createHash,randomUUID}=require('node:crypto');
const {functionSource,captured,member,sameObject}=require('./game-contract.cjs');
const {lexical,sources}=require('./game-native-navigation.cjs');
const sha=s=>createHash('sha256').update(s).digest('hex');
const absent=v=>v?.type==='undefined'&&!v.objectId||v?.type==='object'&&v.subtype==='null'&&v.value===null&&!v.objectId;

// Original linkifyDivs adds these event-only listeners to shop list anchors.
// They cannot stand in for another business handler or a navigation tail.
function clickReader(node,allowShopPropagationStops=false){
  const events=window.jQuery?._data?.(node,'events')?.click;
  if(!Array.isArray(events)||events.length<1)return null;
  if(events.length===1)return events[0].handler;
  const stop='function (e) {\n\t\t\te.stopPropagation();\n\t\t}';
  if(!allowShopPropagationStops||window.SugarCube?.State?.passage!=='Clothing Shop'||
     !node.closest('#clothes-list')||events.length>3||events[0].namespace!=='aria-clickable.macros'||
     events.slice(1).some(e=>e.namespace!==''||e.selector!=null||typeof e.handler!=='function'||Function.prototype.toString.call(e.handler)!==stop))return null;
  return events[0].handler;
}

// Original SugarCube link without an Engine.play tail. Do not mistake this
// provenance for completion of a shop, wardrobe, dialogue or other operation.
async function attest(client,descriptor,{allowShopPropagationStops=false}={}){
  const selector=descriptor?.selected?.selector;
  if(descriptor?.selected?.type!=='web-click'||descriptor.kind!=='menu'||descriptor.destination!=null||
     typeof selector!=='string'||!selector||selector.length>256||typeof allowShopPropagationStops!=='boolean')throw Error('Native partial control descriptor required');
  const objectGroup='dol-native-control-'+randomUUID();let released=false;
  const release=async()=>{if(!released){await client.send('Runtime.releaseObjectGroup',{objectGroup});released=true}};
  try{
    const get=async expression=>{const r=await client.send('Runtime.evaluate',{expression,objectGroup,returnByValue:false,silent:true});
      if(r.exceptionDetails||!r.result?.objectId)throw Error('Native partial object unavailable');return r.result.objectId};
    const verify=async(name,id)=>{if(sha(await functionSource(client,id))!==sources[name])throw Error('Native partial source changed');return id};
    const node=await get(`(()=>{const n=document.querySelectorAll(${JSON.stringify(selector)});return n.length===1?n[0]:null})()`);
    const click=await verify('click',await member(client,node,`(${clickReader.toString()})(this,${allowShopPropagationStops})`,objectGroup));
    // A same-Passage link is repeatable. Navigation's ariaClick one-shot
    // wrapper is absent; requiring it would reject the original control.
    const shadow=await verify('shadow',await captured(client,click,'fn'));
    if(!absent(await lexical(client,shadow,'startCallback'))||!absent(await lexical(client,shadow,'doneCallback')))
      throw Error('Unreviewed native partial start/navigation tail');
    const callbackBinding=await lexical(client,shadow,'callback');
    if(callbackBinding.type!=='function'||!callbackBinding.objectId)throw Error('Native partial callback unavailable');
    const callback=await verify('callback',callbackBinding.objectId),context=await captured(client,shadow,'shadowContext','object');
    const shadowStore=await captured(client,shadow,'shadowStore','object');
    const wikifier=await captured(client,callback,'Wikifier','function',{maxResponseBytes:8*1024*1024});
    const state=await captured(client,shadow,'State','object',{maxResponseBytes:8*1024*1024});
    if(!await sameObject(client,wikifier,await get('window.SugarCube.Wikifier'))||!await sameObject(client,state,await get('window.SugarCube.State')))
      throw Error('Native partial original alias differs');
    const jq=await get('window.jQuery');
    const result=await client.send('Runtime.callFunctionOn',{objectId:node,functionDeclaration:`function(ctx,store){
      const s=window.SugarCube?.State,roots=document.querySelectorAll('#passages > .passage');
      if(!this.isConnected||roots.length!==1||!roots[0].contains(this)||roots[0].getAttribute('data-passage')!==s?.passage||
         this.hasAttribute('data-passage')||ctx?.name!=='link'||ctx.payload?.length!==1||typeof ctx.payload[0].contents!=='string'||
         ctx.payload[0].contents.length>8192||!Number.isSafeInteger(s.turns)||!Number.isFinite(s.variables?.timeStamp)||!Number.isSafeInteger(s.variables?.money)||
         !store||typeof store!=='object'||Reflect.ownKeys(store).length>32)return null;
      const keys=Reflect.ownKeys(store);if(keys.some(k=>typeof k!=='string'||k.length>128||!Object.hasOwn(Object.getOwnPropertyDescriptor(store,k),'value')))return null;
      return {passage:s.passage,turns:s.turns,time:s.variables.timeStamp,money:s.variables.money,payload:ctx.payload[0].contents,shadowKeys:keys};
    }`,arguments:[{objectId:context},{objectId:shadowStore}],returnByValue:true});
    if(result.exceptionDetails||!result.result?.value)throw Error('Native partial context unavailable');
    const {payload,shadowKeys,...before}=result.result.value;
    return {status:'attested',actions:false,terminalReviewed:false,before,payload,payloadSha256:sha(payload),shadowKeys,
      objects:{node,click,shadow,callback,context,shadowStore,wikifier,state,jq},objectGroup,release};
  }catch(error){
    try{await release()}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native partial attestation and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}
    throw error;
  }
}
module.exports={attest,clickReader};
