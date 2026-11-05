declare namespace receipts {
 interface Binding {provider:string;contract:string;contextNonce:string;requestDigest:string}
 interface Client {evaluate(expression:string):Promise<unknown>}
 interface Retirement {available:boolean;retired:string[];remaining:number|null;capacity:64;[key:string]:unknown}
}
interface EffectView {id?:unknown;status?:unknown;executionBinding?:unknown;result?:{outcome?:unknown;[key:string]:unknown}}
interface BindingView {provider?:unknown;contract?:unknown;contextNonce?:unknown;requestDigest?:unknown}
interface RetirementView {available?:unknown;capacity?:unknown;retired?:unknown;remaining?:unknown}
const {initialize,read,retire}:typeof import('./browser/receipts.cjs')=require('./browser/receipts.cjs');
// Private reviewed gameplay receipts. Page instrumentation is not a security sandbox.
const { randomUUID }:typeof import('node:crypto') = require('node:crypto');
const namespace = '__paisleyParkGameplayReceiptsV1';
const uuid = (v:unknown):v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const text = (v:unknown):v is string => typeof v === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(v);
function validate(raw:unknown):receipts.Binding {
  const binding=raw as BindingView|null|undefined;
  if(!binding||Object.keys(binding).length!==4)throw Error('Invalid gameplay receipt binding');
  const provider=binding.provider;if(!text(provider))throw Error('Invalid gameplay receipt binding');
  const contract=binding.contract;if(!text(contract))throw Error('Invalid gameplay receipt binding');
  const contextNonce=binding.contextNonce;if(!uuid(contextNonce))throw Error('Invalid gameplay receipt binding');
  const requestDigest=binding.requestDigest;if(typeof requestDigest!=='string'||!/^[a-f0-9]{64}$/.test(requestDigest))throw Error('Invalid gameplay receipt binding');
  // Serialize only the four primitive values actually checked, never a later
  // getter/toJSON projection that can erase the page's original binding.
  return {provider,contract,contextNonce,requestDigest};
}


async function context(client:receipts.Client):Promise<string> {
  const nonce = await client.evaluate(`(${initialize.toString()})(${JSON.stringify(namespace)},${JSON.stringify(randomUUID())})`);
  if (!uuid(nonce)) throw Error('Gameplay receipt context unavailable');
  return nonce;
}

async function recover(client:receipts.Client, effects:unknown):Promise<unknown[]> {
  if (!Array.isArray(effects) || effects.length > 64) throw Error('Invalid receipt recovery batch');
  const selected = (effects as unknown[]).filter(raw=>{const e=raw as EffectView;return e.executionBinding && e.status !== 'prepared' && e.status !== 'settled'}).map(raw => {
    const e=raw as EffectView;
    if (!uuid(e.id)) throw Error('Invalid receipt attempt');
    return { id: e.id, executionBinding: validate(e.executionBinding) };
  });
  if (!selected.length) return [];
  const result = await client.evaluate(`(${read.toString()})(${JSON.stringify(namespace)},${JSON.stringify(selected)})`);
  if (!Array.isArray(result) || result.length > selected.length) throw Error('Gameplay receipts unavailable');
  return result;
}

async function cleanup(client:receipts.Client,effects:unknown):Promise<receipts.Retirement>{
  if(!Array.isArray(effects)||effects.length>64)throw Error('Invalid receipt retirement batch');
  const selected=(effects as unknown[]).map(raw=>{const e=raw as EffectView;if(!uuid(e.id)||e.status!=='settled'||e.result?.outcome!=='occurred')throw Error('Receipt still requires recovery');return {id:e.id,status:e.status,executionBinding:validate(e.executionBinding),result:e.result}});
  const result=await client.evaluate(`(${retire.toString()})(${JSON.stringify(namespace)},${JSON.stringify(selected)})`) as RetirementView|null|undefined;
  if(!result||typeof result.available!=='boolean'||result.capacity!==64||!Array.isArray(result.retired)||new Set(result.retired).size!==result.retired.length||(result.retired as unknown[]).some(id=>!selected.some(e=>e.id===id))||result.remaining!==null&&(!Number.isSafeInteger(result.remaining)||(result.remaining as number)<0))throw Error('Invalid receipt retirement response');
  return result as receipts.Retirement;
}
const receipts = { namespace, validate, context, recover, cleanup };
export = receipts;
