import type cdp from './cdp.cjs';
declare namespace invocation {
 type Client=Pick<cdp.Client,'send'>;
 interface Binding {receiverId:unknown;callableId:unknown}
}
const {member,functionSource}:{member(client:invocation.Client,receiverId:unknown,expression:string):Promise<unknown>;functionSource(client:invocation.Client,objectId:unknown):Promise<string>}=require('./game-contract.cjs');
async function bind(client:invocation.Client,receiverId:unknown):Promise<invocation.Binding>{
 let callableId:unknown;
 try{
  callableId=await member(client,receiverId,`(()=>{if(!(this instanceof HTMLElement))return null;for(let p=this,i=0;p&&i<16;p=Object.getPrototypeOf(p),i++){const d=Object.getOwnPropertyDescriptor(p,'click');if(d)return Object.hasOwn(d,'value')&&typeof d.value==='function'?d.value:null}return null})()`);
  if(await functionSource(client,callableId)!=='function click() { [native code] }')throw Error('Unreviewed native click callable');
  return {receiverId,callableId};
 }catch(error){if(callableId)try{await client.send('Runtime.releaseObject',{objectId:callableId})}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native invocation binding cleanup failed'),{code:'NATIVE_INVOCATION_CLEANUP_FAILED'})}throw error}
}
const invocation={bind};
export = invocation;
