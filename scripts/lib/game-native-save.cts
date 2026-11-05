import type cdp from './cdp.cjs';
declare namespace save {
 type Client=Pick<cdp.Client,'send'>;
 interface Watch {objectId:unknown;digest:string}
 type SourceFunction=(...args:unknown[])=>unknown;
 interface Projection {r:unknown;e:unknown}
}
type View=Record<string,unknown>;
interface ReceiptView {outcome?:unknown;remoteClosed?:unknown;evidence?:View}
interface EffectView {executionBinding?:{contract?:unknown}}
interface Metadata {version?:unknown;methods:View;hooks:Record<string,unknown>;marshal?:unknown;decoder?:unknown;dbNameGetter?:unknown}
interface RemoteView {exceptionDetails?:unknown;result?:{objectId?:unknown;value?:unknown}}
interface Profile {version:string;methods:Record<string,string>;hooks:Record<string,string[]>;setItem:string;marshal:string;decoder:string;dbNameGetter:string;makePromise:string;openDB:string}
const {flags,capture}:{flags:(a:unknown,b:unknown)=>boolean;capture:save.SourceFunction}=require('./browser-abi/native-save.cjs');
const {createHash}:typeof import('node:crypto')=require('node:crypto'),contracts:typeof import('./game-contract.cjs')=require('./game-contract.cjs'),profile:Profile=require('./game-native-save-profile.json');
const sha=(s:unknown)=>createHash('sha256').update(s as string).digest('hex');
const authorized=(s:unknown)=>(require('./game-scope.cjs') as typeof import('./game-scope.cjs')).validate(s)&&s.intents.includes('save');
// Save flags describe permitted gameplay, not the reviewed native owner inventory.
async function bind(client:save.Client,scope:unknown,objectGroup:string):Promise<save.Watch|null>{
  if(!authorized(scope))return null;
  const result=await client.send('Runtime.evaluate',{expression:`(${capture.toString()})(${JSON.stringify(require('./game-receipts.cjs').namespace)})`,objectGroup,returnByValue:false}) as RemoteView;
  if(result.exceptionDetails||!result.result?.objectId)throw Error('Scoped native save observer unavailable');const objectId=result.result.objectId;
  const meta=await client.send('Runtime.callFunctionOn',{objectId,functionDeclaration:'function(){return this.metadata()}',returnByValue:true}) as RemoteView;const v=meta.result?.value as Metadata|undefined;
  if(meta.exceptionDetails||!v||v.version!==profile.version||Object.entries(profile.methods).some(([k,h])=>sha(v.methods[k]||'')!==h)||sha(v.methods.setItem||'')!==profile.setItem||
    Object.entries(profile.hooks).some(([k,hs])=>!Array.isArray(v.hooks[k])||JSON.stringify(v.hooks[k].map(sha))!==JSON.stringify(hs))||sha(v.marshal||'')!==profile.marshal||sha(v.decoder||'')!==profile.decoder||v.dbNameGetter!==profile.dbNameGetter)throw Error('Scoped native save implementation not reviewed');
  const get=async (expression:string)=>{const r=await client.send('Runtime.evaluate',{expression,objectGroup,returnByValue:false}) as RemoteView;if(r.exceptionDetails||!r.result?.objectId)throw Error('Native save reference unavailable');return r.result.objectId};
  const save=await get('window.idb.saveState'),set=await contracts.captured(client,save,'setItem');
  if(!await contracts.sameObject(client,set,await get('window.idb.setItem'))||!await contracts.sameObject(client,await contracts.captured(client,save,'State','object',{maxResponseBytes:8*1024*1024}),await get('window.SugarCube.State')))throw Error('Native save captured owner changed');
  for(const key of ['makePromise','openDB'])if(sha(await contracts.functionSource(client,await contracts.captured(client,set,key)))!==profile[key as 'makePromise'|'openDB'])throw Error('Native save transaction implementation changed');
  return {objectId,digest:sha(JSON.stringify(profile)+capture.toString())};
}
function validateEvidence(raw:unknown):unknown{const v=raw as View;return v&&Reflect.ownKeys(v).length===6&&Object.keys(v).every(k=>['kind','slot','count','transactions','committed','readBack'].includes(k))&&v.kind==='native-idb-save'&&v.slot===0&&Number.isSafeInteger(v.count)&&(v.count as number)>=0&&(v.count as number)<=8&&v.transactions===v.count&&v.committed===true&&v.readBack===true;}
function execution(source:string,index:number){
  return `return (async()=>{const nativeSaveWatch=observedInputs[${index}];try{return await (async()=>{${source}})()}finally{if(!nativeSaveWatch.restore())throw Error('Native save observer cleanup conflict')}})();`;
}
// Validate the new save witness separately, then reuse the original business projection.
function receipt(rawReceipt:unknown,rawEffect:unknown):save.Projection|null{
  const r=rawReceipt as ReceiptView,e=rawEffect as EffectView;
  const contract=e?.executionBinding?.contract,hasSave=/-save-[a-f0-9]{12}$/.test((contract||'') as string);
  if(!hasSave)return Object.hasOwn(r.evidence||{},'save')?null:{r,e};
  if(r.outcome==='occurred'&&(!r.remoteClosed||!validateEvidence(r.evidence?.save)))return null;
  const evidence=r.evidence?Object.fromEntries(Object.entries(r.evidence).filter(([k])=>k!=='save')):undefined;
  return {r:{...r,...(evidence?{evidence}:{})},e:{...e,executionBinding:{...e.executionBinding,contract:(contract as string).replace(/-save-([a-f0-9]{12})$/,'-$1')}}};
}
const save={authorized,flags,capture,bind,validateEvidence,execution,receipt};
export = save;
