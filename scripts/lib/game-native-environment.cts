import type cdp from './cdp.cjs';
declare namespace environment {
 type Client=Pick<cdp.Client,'send'>;
 type FlagsMatch=(a:unknown,b:unknown)=>unknown;
 type SourceFunction=(this:unknown,...args:unknown[])=>unknown;
 interface Row {name?:unknown;mode?:unknown;meta?:unknown;functionName?:unknown;source?:unknown;[key:string]:unknown}
 interface Binding {id:string;terminalReviewed:true;arguments:{objectId:unknown}[];objects:{jq:unknown;footer:unknown;addon?:unknown};guard:string}
}
interface ProfileView {id?:unknown;terminalReviewed?:unknown;flags?:unknown;functions:environment.Row[];texts:{name:unknown;sha256:unknown}[]}
interface Metadata {hasAddon?:unknown;flags?:unknown;functions:environment.Row[];texts:{name:unknown;value:unknown}[]}
interface RemoteView {exceptionDetails?:unknown;result?:{objectId?:unknown;value?:unknown}}
const {collect,ordered,tooltipMovesAllowed,sameFlags,check,capture,metadata,saveFlagsMatch}:{collect:environment.SourceFunction;ordered:environment.SourceFunction;tooltipMovesAllowed:(current:environment.Row[],before:environment.Row[])=>boolean;sameFlags:environment.FlagsMatch;check:environment.SourceFunction;capture:environment.SourceFunction;metadata:environment.SourceFunction;saveFlagsMatch:(a:unknown,b:unknown,base:environment.FlagsMatch,saveFlags:environment.FlagsMatch)=>unknown}=require('./browser-abi/native-environment.cjs');
function normalizedMetadata(rows:environment.Row[]) {
  const clean=(r:environment.Row)=>r.mode==='event'?{...r,name:undefined}:r;
  return [...rows.filter(r=>r.mode!=='event'),...rows.filter(r=>r.mode==='event'&&r.functionName!=='updateCaptionTooltip'),
    ...rows.filter(r=>r.mode==='event'&&r.functionName==='updateCaptionTooltip')].map(clean);
}
async function bind(client:environment.Client,held:{objectGroup:string},raw:unknown,flagsMatch:environment.FlagsMatch=sameFlags,allowSave=false):Promise<environment.Binding> {
  const profile=raw as ProfileView;
  const {createHash}:typeof import('node:crypto')=require('node:crypto');
  const sha=(value:unknown)=>createHash('sha256').update(value as string).digest('hex');
  if(!profile||profile.terminalReviewed!==true||typeof profile.id!=='string'||!Array.isArray(profile.functions)||!Array.isArray(profile.texts)||typeof flagsMatch!=='function')
    throw Error('Reviewed native environment profile required');
  const evaluated=await client.send('Runtime.evaluate',{expression:`(()=>{const collect=${collect.toString()};return (${capture.toString()})()})()`,returnByValue:false,objectGroup:held.objectGroup,silent:true}) as RemoteView;
  const bundle=evaluated.result?.objectId;
  if(evaluated.exceptionDetails||!bundle)throw Error('Native environment capture unavailable');
  const result=await client.send('Runtime.callFunctionOn',{objectId:bundle,functionDeclaration:metadata.toString(),returnByValue:true}) as RemoteView;
  const value=result.result?.value as Metadata|undefined;
  if(result.exceptionDetails||!value)throw Error('Native environment metadata unavailable');
  const functions=value.functions.map(({source,...row})=>({...row,sha256:source===null?null:sha(source)}));
  const texts=value.texts.map(({name,value})=>({name,sha256:sha(value)}));
  const compare=(a:unknown,b:unknown)=>allowSave?saveFlagsMatch(a,b,flagsMatch,(require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).flags):flagsMatch(a,b);
  if(compare(value.flags,profile.flags)!==true||!tooltipMovesAllowed(functions,profile.functions)||JSON.stringify(normalizedMetadata(functions))!==JSON.stringify(normalizedMetadata(profile.functions))||JSON.stringify(texts)!==JSON.stringify(profile.texts))
    throw Error('Native environment differs from reviewed profile');
  const member=async (key:string)=>{
    const r=await client.send('Runtime.callFunctionOn',{objectId:bundle,functionDeclaration:`function(){return this[${JSON.stringify(key)}]}`,returnByValue:false,objectGroup:held.objectGroup}) as RemoteView;
    if(r.exceptionDetails||!r.result?.objectId)throw Error('Native environment owner unavailable');return r.result.objectId;
  };
  return {id:profile.id,terminalReviewed:true,arguments:[{objectId:bundle}],
    objects:{jq:await member('jq'),footer:await member('footer'),...(value.hasAddon===true?{addon:await member('addon')}:{})},
    guard:`const collect=${collect.toString()},ordered=${ordered.toString()},tooltipMovesAllowed=${tooltipMovesAllowed.toString()},sameFlags=${sameFlags.toString()};return (${check.toString()})(collect(),nativeEnvInputs[0],${allowSave?`function(a,b){return (${saveFlagsMatch.toString()})(a,b,${flagsMatch.toString()},${(require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).flags.toString()})}`:flagsMatch.toString()});`};
}
const environment={collect,ordered,check,tooltipMovesAllowed,capture,metadata,normalizedMetadata,bind,sameFlags};
export = environment;
