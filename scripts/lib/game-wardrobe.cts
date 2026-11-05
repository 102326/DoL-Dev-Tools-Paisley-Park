import type cdp from './cdp.cjs';
import type nativeControl from './game-native-control.cjs';
declare namespace wardrobe {
 type Client=Pick<cdp.Client,'send'|'evaluate'>;
 type Request={type:'dol-wardrobe';slot:'head'}&({operation:'unequip'}|{operation:'equip';variable:'hairpin'|'beanie';colour:string;accessoryColour:string|null|0;modder?:string|null});
 interface Interpretation {status:'available';selector:string;index:unknown;before:Record<string,unknown>;[key:string]:unknown}
 type Held=nativeControl.Held;
 interface Attested extends Held {interpretation:Interpretation;requestDigest:string}
 type SourceFunction=(...args:unknown[])=>unknown;
}
type View=Record<string,unknown>;
interface ReceiptView {outcome?:unknown;remoteClosed?:unknown;spent?:unknown;evidence?:View}
interface EffectView {action?:{selected?:View};executionBinding?:{provider?:unknown;contract?:unknown}}
interface RemoteView {exceptionDetails?:unknown;result?:{value?:unknown}}
const {reader,branchGuard}:{reader:wardrobe.SourceFunction;branchGuard:wardrobe.SourceFunction}=require('./browser-abi/wardrobe-mapping.cjs');
// Clothing-domain mapping of original DoL controls. No UI Runtime required.
const {createHash}:typeof import('node:crypto')=require('node:crypto');
const control:typeof import('./game-native-control.cjs')=require('./game-native-control.cjs');
const payloadSha256='d542a29ae81a97ba006ce4189f68eff13d27250e77f3c749c11442bdeb6027fc';
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\u0000-\u001f]/.test(v);
function validate(raw:unknown):wardrobe.Request{
  const r=raw as View;
  const fields=r?.operation==='equip'?['type','operation','slot','variable','colour','accessoryColour','modder']:['type','operation','slot'];
  if(!r||Array.isArray(r)||Object.keys(r).some(k=>!fields.includes(k))||r.type!=='dol-wardrobe'||r.slot!=='head'||
     !['equip','unequip'].includes(r.operation as string)||r.operation==='equip'&&(!text(r.variable)||!['hairpin','beanie'].includes(r.variable as string)||
       !text(r.colour)||['custom','random'].includes(r.colour as string)||!(r.accessoryColour===null||r.accessoryColour===0||text(r.accessoryColour))||['custom','random'].includes(r.accessoryColour as string)||
       !(r.modder===undefined||r.modder===null||text(r.modder))))throw Error('Unsupported original wardrobe request');
  return r as wardrobe.Request;
}
async function attest(client:wardrobe.Client,raw:unknown):Promise<wardrobe.Attested>{
  const request=validate(raw);
  const current=await client.evaluate(`(${reader.toString()})(${JSON.stringify(request)})`) as wardrobe.Interpretation|null;
  if(current?.status!=='available')throw Object.assign(Error('Original wardrobe control unavailable'),{code:'MAPPING_UNAVAILABLE'});
  const held=await control.attest(client,{kind:'menu',selected:{type:'web-click',selector:current.selector}});
  try{
    const shadow=await client.send('Runtime.callFunctionOn',{objectId:held.objects.shadowStore,returnByValue:true,functionDeclaration:`function(){
      const d=Object.getOwnPropertyDescriptor(this,'_args'),a=d?.value;
      return Reflect.ownKeys(this).length===1&&d&&Object.hasOwn(d,'value')&&Array.isArray(a)&&a.length===2&&
        typeof a[0]==='string'&&a[0].length<=160&&a[1]===${JSON.stringify(request.operation==='equip'?current.index:'strip')};
    }`}) as RemoteView;
    if(held.payloadSha256!==payloadSha256||shadow.exceptionDetails||shadow.result?.value!==true||held.before.passage!=='Wardrobe'||
       ['turns','time','money'].some(k=>held.before[k]!==current.before[k]))throw Error('Original wardrobe payload/identity differs');
    const fresh=await client.evaluate(`(${reader.toString()})(${JSON.stringify(request)})`);
    if(JSON.stringify(fresh)!==JSON.stringify(current))throw Error('Original wardrobe state changed during attestation');
    return {...held,interpretation:current,requestDigest:createHash('sha256').update(JSON.stringify({request,before:current.before,payloadSha256})).digest('hex')};
  }catch(error){
    try{await held.release()}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Wardrobe provenance and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}
    throw error;
  }
}
function validateReceipt(rawReceipt:unknown,rawEffect:unknown):boolean{
  let r=rawReceipt as ReceiptView,e=rawEffect as EffectView;
  const verified=(require('./game-native-save.cjs') as {receipt:(r:unknown,e:unknown)=>{r:ReceiptView;e:EffectView}|null}).receipt(r,e);if(!verified)return false;({r,e}=verified);
  const request=e.action?.selected,binding=e.executionBinding,p=r.evidence;
  if(request?.type!=='dol-wardrobe'||binding?.provider!=='dol-wardrobe-native'||
     !new RegExp('^native-head-'+request.operation+'-[a-f0-9]{12}$').test(binding.contract as string))return false;
  if(r.outcome!=='occurred'||!r.remoteClosed)return p===undefined;
  const number=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>=0;
  const variant=(v:unknown):v is unknown[]=>Array.isArray(v)&&v.length===4&&text(v[0])&&
    v.slice(1).every(x=>x===null||x===0||text(x));
  if(!p||Array.isArray(p)||Object.keys(p).length!==12||Object.keys(p).some(k=>!['kind','operation','slot','turns','time','money','beforeWorn','afterWorn','inventoryBefore','inventoryAfter','originalMomentUpdates','samePassage'].includes(k))||
     p.kind!=='native-head'||p.operation!==request.operation||p.slot!=='head'||r.spent!==0||
     !number(p.turns)||!Number.isFinite(p.time as number)||!number(p.money)||!number(p.inventoryBefore)||!number(p.inventoryAfter)||
     p.inventoryBefore>512||p.inventoryAfter>512||!variant(p.beforeWorn)||!variant(p.afterWorn)||p.originalMomentUpdates!==1||p.samePassage!==true)return false;
  return request.operation==='equip'?JSON.stringify(p.afterWorn)===JSON.stringify([request.variable,request.colour,request.modder??null,request.accessoryColour])&&
    p.inventoryAfter===p.inventoryBefore-(p.beforeWorn[0]==='naked'?1:0):
    request.operation==='unequip'&&p.beforeWorn[0]!=='naked'&&p.afterWorn[0]==='naked'&&p.inventoryAfter===p.inventoryBefore+1;
}
// The domain provider uses game-wardrobe-native for reviewed terminal execution.
// This mapping alone does not authorize a terminal receipt.
const wardrobe={validate,reader,branchGuard,attest,validateReceipt};
export = wardrobe;
