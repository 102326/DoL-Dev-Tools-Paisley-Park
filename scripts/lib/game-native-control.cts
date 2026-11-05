import type cdp from './cdp.cjs';
declare namespace control {
 type Client=Pick<cdp.Client,'send'>;
 interface Options {allowShopPropagationStops?:boolean}
 interface Held {status:'attested';actions:false;terminalReviewed:false;before:Record<string,unknown>;payload:unknown;payloadSha256:string;shadowKeys:unknown;objects:{node:unknown;click:unknown;shadow:unknown;callback:unknown;context:unknown;shadowStore:unknown;wikifier:unknown;state:unknown;jq:unknown};objectGroup:string;release:()=>Promise<void>}
 type SourceFunction=(...args:unknown[])=>unknown;
}
interface DescriptorView {selected?:{type?:unknown;selector?:unknown};kind?:unknown;destination?:unknown}
interface RemoteView {exceptionDetails?:unknown;result?:{objectId?:unknown;value?:unknown}}
const {clickReader}:{clickReader:control.SourceFunction}=require('./browser-abi/native-control.cjs');
const {createHash,randomUUID}:typeof import('node:crypto')=require('node:crypto');
const {functionSource,captured,member,sameObject}:typeof import('./game-contract.cjs')=require('./game-contract.cjs');
const {lexical,sources}:typeof import('./game-native-navigation.cjs')=require('./game-native-navigation.cjs');
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const absent=(v:import("./game-native-navigation.cjs").Remote)=>v?.type==='undefined'&&!v.objectId||v?.type==='object'&&v.subtype==='null'&&v.value===null&&!v.objectId;

// Original linkifyDivs adds these event-only listeners to shop list anchors.
// They cannot stand in for another business handler or a navigation tail.
// Original SugarCube link without an Engine.play tail. Do not mistake this
// provenance for completion of a shop, wardrobe, dialogue or other operation.
async function attest(client:control.Client,raw:unknown,{allowShopPropagationStops=false}:control.Options={}):Promise<control.Held>{
  const descriptor=raw as DescriptorView;
  const selector=descriptor?.selected?.selector;
  if(descriptor?.selected?.type!=='web-click'||descriptor.kind!=='menu'||descriptor.destination!=null||
     typeof selector!=='string'||!selector||selector.length>256||typeof allowShopPropagationStops!=='boolean')throw Error('Native partial control descriptor required');
  const objectGroup='dol-native-control-'+randomUUID();let released=false;
  const release=async()=>{if(!released){await client.send('Runtime.releaseObjectGroup',{objectGroup});released=true}};
  try{
    const get=async (expression:string)=>{const r=await client.send('Runtime.evaluate',{expression,objectGroup,returnByValue:false,silent:true}) as RemoteView;
      if(r.exceptionDetails||!r.result?.objectId)throw Error('Native partial object unavailable');return r.result.objectId};
    const verify=async(name:keyof typeof sources,id:unknown)=>{if(sha(await functionSource(client,id))!==sources[name])throw Error('Native partial source changed');return id};
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
    }`,arguments:[{objectId:context},{objectId:shadowStore}],returnByValue:true}) as RemoteView;
    if(result.exceptionDetails||!result.result?.value)throw Error('Native partial context unavailable');
    const {payload,shadowKeys,...before}=result.result.value as Record<string,unknown>;
    return {status:'attested',actions:false,terminalReviewed:false,before,payload,payloadSha256:sha(payload as string),shadowKeys,
      objects:{node,click,shadow,callback,context,shadowStore,wikifier,state,jq},objectGroup,release};
  }catch(error){
    try{await release()}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native partial attestation and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}
    throw error;
  }
}
const control={attest,clickReader};
export = control;
