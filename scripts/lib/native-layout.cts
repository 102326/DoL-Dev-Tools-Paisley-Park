import type {ExecFileOptions} from 'node:child_process';
declare namespace layout {
 interface Node {index:number;class:string|null;resourceIdHash:string|null;textPresent:boolean|null;contentDescriptionPresent:boolean|null;bounds:number[]|null;interactions:string[];state:string[];offScreen:boolean|null}
 interface Projection {schemaVersion:number;source:string;nodes:Node[];totalReported:number;truncated:boolean;relationships:string;content:string;appAssociation:string}
 interface Failure {schemaVersion:number;source:string;collectorStatus:'failed'|'unsupported';reason:string;rawContent:string;signal?:string|null;exitCode?:number|null}
 interface Context {options:{allowHelper?:boolean;serial?:unknown}}
 type Run=(file:string,args:string[],options:ExecFileOptions&{encoding:'utf8'})=>Promise<{stdout:string}>;
}
interface ErrorView {code?:unknown;killed?:unknown;signal?:unknown}
import {promisify} from 'node:util';
import {execFile} from 'node:child_process';
const {createHash}:typeof import('node:crypto')=require('node:crypto');
const execute=promisify(execFile),hash=(s:string)=>createHash('sha256').update(s).digest('hex');
function project(input:unknown):layout.Projection{
 if(!Array.isArray(input)||input.length>20000)throw Error('Invalid native layout');
 const nodes=(input.slice(0,200) as unknown[]).map((raw,index):layout.Node=>{
  const n=raw as Record<string,unknown>;
  if(!n||typeof n!=='object'||Array.isArray(n))throw Error('Invalid native node');
  const bool=(key:string)=>typeof n[key]==='boolean'?n[key]:null;
  const list=(key:string,allowed:string[])=>Array.isArray(n[key])?(n[key] as unknown[]).filter((x):x is string=>typeof x==='string'&&allowed.includes(x)).slice(0,10):[];
  const b=typeof n.bounds==='string'?n.bounds.match(/^\[(-?\d{1,5}),(-?\d{1,5})\]\[(-?\d{1,5}),(-?\d{1,5})\]$/):null;
  let bounds=b?b.slice(1).map(Number):null;if(bounds&&(bounds.some(x=>Math.abs(x)>16384)||bounds[2]<bounds[0]||bounds[3]<bounds[1]))bounds=null;
  return {index,class:typeof n.class==='string'&&/^[A-Za-z_$][\w.$]{0,127}$/.test(n.class)?n.class:null,
    resourceIdHash:typeof n.resourceId==='string'&&n.resourceId.length<=256?hash(n.resourceId):null,
    textPresent:typeof n.text==='string'?n.text.length>0:null,contentDescriptionPresent:typeof n.contentDesc==='string'?n.contentDesc.length>0:null,bounds,
    interactions:list('interactions',['checkable','clickable','focusable','scrollable','long-clickable','password']),state:list('state',['checked','focused','selected']),offScreen:bool('off-screen')};
 });
 return {schemaVersion:1,source:'Native layout',nodes,totalReported:input.length,truncated:input.length>200,relationships:'flat; not reconstructed',content:'text/contentDesc omitted; resource id hashed',appAssociation:'current native windows on explicit device; may include system UI'};
}
async function collect(ctx:layout.Context,run:layout.Run=execute):Promise<layout.Projection|layout.Failure>{
 if(ctx.options.allowHelper!==true)throw Error('Android layout helper side effects must be explicitly selected');
 const args=['--no-metrics',...(process.env.DOL_ANDROID_SDK?[`--sdk=${process.env.DOL_ANDROID_SDK}`]:[]),'layout',`--device=${ctx.options.serial}`,'--flat','--full','--no-idle'];
 const failure=(reason:string,extra:Pick<layout.Failure,'signal'|'exitCode'>={}):layout.Failure=>({schemaVersion:1,source:'Native layout',collectorStatus:'failed',reason,rawContent:'omitted',...extra});
 let result;
 try{result=await run(process.env.DOL_ANDROID_CLI||'android',args,{encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024,windowsHide:true})}
 catch(raw){
  const e=raw as ErrorView|null|undefined;
  if(e?.code==='ENOENT')return {...failure('android-cli-unavailable'),collectorStatus:'unsupported'};
  if(e?.code==='ERR_CHILD_PROCESS_STDIO_MAXBUFFER')return failure('native-layout-output-limit');
  if(e?.killed===true)return failure('native-layout-process-terminated',{signal:typeof e.signal==='string'&&/^SIG[A-Z]+$/.test(e.signal)?e.signal:null});
  if(e?.code==='EACCES'||e?.code==='EPERM')return failure('native-layout-process-permission-denied');
  return failure('native-layout-execution-failed',{exitCode:Number.isInteger(e?.code)?e!.code as number:null});
 }
 let input;
 try{input=JSON.parse(result.stdout)}catch{return failure('native-layout-invalid-json')}
 try{return project(input)}catch{return failure('native-layout-invalid-data')}
}
const layout={collect,project};
export = layout;
