import type cdp from './cdp.cjs';
import type collectors from './collectors.cjs';
import type performance from './performance.cjs';
declare namespace series {
 type Reason='invalid-metadata'|'command-rejected'|'response-too-large'|'invalid-response'|'timeout'|'connection-closed'|'unknown';
 interface Detached {status:'unsupported'|'available';failureStage:string|null;failureReason:Reason|null;countsAreProtocolObservations:true;treeContent:string;explicitCollectGarbage:string;failureProtocolCode?:number;treesReported?:number;retainedNodeIdsObserved?:number;truncated?:boolean;countsMayBeLowerBound?:boolean;countBasis?:string}
 interface Web {status:'unsupported'|'available'|'partial';metrics:Partial<Record<string,number>>;detachedNodes:'not measured'|Detached;observers:string;leakDiagnosis:'not-inferred';documents?:number;nodes?:number;jsEventListeners?:number;capabilities?:{heap:boolean;domNodes:boolean;listeners:boolean};cleanupWarning?:true;cleanupFailures?:{stage:string;reason:Reason;protocolCode?:number}[];collectorStatus?:'failed'}
 interface Client extends Pick<cdp.Client,'send'> {close?():void}
 interface Options {samples:number;intervalMs:number;package:string;seriesWebview?:boolean}
 interface Context {options:Options;appPid?:string|null;adb:collectors.Adb;client?:Client}
 interface Sample {index:number;capturedAt:string;atMs:number;status:'partial'|'complete';durationMs?:number;memory?:(ReturnType<typeof performance.memory>&{status?:never})|{status:'unsupported'};frames?:(ReturnType<typeof performance.frames>&{status?:never})|{status:'unsupported'};thermal?:ReturnType<typeof system>['thermal'];battery?:ReturnType<typeof system>['battery'];webview?:Web}
 interface Report {schemaVersion:number;source:string;samples:Sample[];requestedSamples:number;intervalMs:number;deadlineMs:number;truncated:boolean;observationsAreSequential:true;frameCounters:string;leakDiagnosis:'not-inferred';webviewOwnership:string;reason?:string;collectorStatus?:'failed';captureEnd?:string}
}
interface ErrorView {code?:unknown;protocolCode?:unknown}
const {memory,frames}:typeof import('./performance.cjs')=require('./performance.cjs');
function system(thermal:string,battery:string){
  const read=(text:string,key:string)=>{const m=text.match(new RegExp(`^\\s*${key}:\\s*(-?\\d+)\\s*$`,'m'));return m?Number(m[1]):null};
  const state=thermal.match(/Thermal Status:\s*([0-6])\b/)?.[1];
  const level=read(battery,'level'),scale=read(battery,'scale'),temperature=read(battery,'temperature'),voltage=read(battery,'voltage'),status=read(battery,'status');
  return {thermal:{status:state===undefined?'unsupported':'available',severity:state===undefined?null:Number(state)},
    battery:{status:level===null?'unsupported':'available',level:level!==null&&level>=0&&level<=1000?level:null,scale:(scale as number)>0&&(scale as number)<=1000?scale:null,
      temperatureC:temperature!==null&&temperature>=-1000&&temperature<=2000?temperature/10:null,
      voltageMv:(voltage as number)>0&&(voltage as number)<20000?voltage:null,chargingStatus:[1,2,3,4,5].includes(status as number)?status:null}};
}
function failureReason(raw:unknown):series.Reason{
  const error=raw as ErrorView|null|undefined;
  if(error?.code==='INVALID_DETACHED_METADATA')return 'invalid-metadata';
  const reasons:Record<string,series.Reason>={CDP_COMMAND_REJECTED:'command-rejected',CDP_RESPONSE_TOO_LARGE:'response-too-large',CDP_INVALID_RESPONSE:'invalid-response',ETIMEDOUT:'timeout',CDP_CONNECTION_CLOSED:'connection-closed'};
  return typeof error?.code==='string'&&Object.hasOwn(reasons,error.code)?reasons[error.code]:'unknown';
}
function failureCode(raw:unknown):number|undefined{const error=raw as ErrorView|null|undefined;return Number.isFinite(error?.protocolCode)?error!.protocolCode as number:undefined}
function recordCleanupFailure(result:series.Web,stage:string,error:unknown){
  result.cleanupWarning=true;
  result.cleanupFailures ||= [];
  result.cleanupFailures.push({stage,reason:failureReason(error),...(failureCode(error)!==undefined?{protocolCode:failureCode(error)}:{})});
}
async function web(client:series.Client|undefined|null,options:{detached?:boolean}={}):Promise<series.Web>{
  if(Object.keys(options).some(k=>k!=='detached')||options.detached!==undefined&&typeof options.detached!=='boolean')throw Error('Invalid WebView probe options');
  const result:series.Web={status:'unsupported',metrics:{},detachedNodes:'not measured',observers:'not measured',leakDiagnosis:'not-inferred'};
  if(!client)return result;
  let enabled=false;
  try{
    enabled=true;await client.send('Performance.enable');
    const metrics=await client.send('Performance.getMetrics') as {metrics?:unknown};
    const names=['Timestamp','JSHeapUsedSize','JSHeapTotalSize','Nodes','Documents','JSEventListeners','LayoutCount','RecalcStyleCount','LayoutDuration','RecalcStyleDuration','ScriptDuration','TaskDuration'];
    for(const raw of Array.isArray(metrics.metrics)?metrics.metrics.slice(0,100) as unknown[]:[]){const item=raw as {name?:unknown;value?:unknown};if(names.includes(item.name as string)&&Number.isFinite(item.value)&&(item.value as number)>=0)result.metrics[item.name as string]=item.value as number;}
    try{const counters=await client.send('Memory.getDOMCounters') as Record<string,unknown>;for(const name of ['documents','nodes','jsEventListeners'] as const)if(Number.isSafeInteger(counters[name])&&(counters[name] as number)>=0)result[name]=counters[name] as number}catch{/* Conditional protocol support. */}
    const observed=(value:unknown)=>Number.isFinite(value)&&(value as number)>=0;
    result.capabilities={heap:observed(result.metrics.JSHeapUsedSize),domNodes:observed(result.nodes)||observed(result.metrics.Nodes),listeners:observed(result.jsEventListeners)||observed(result.metrics.JSEventListeners)};
    result.status=Object.values(result.capabilities).every(Boolean)?'available':Object.values(result.capabilities).some(Boolean)?'partial':'unsupported';
  }catch{/* Raw protocol content omitted. */}
  finally{if(enabled)try{await client.send('Performance.disable')}catch(error){recordCleanupFailure(result,'Performance.disable',error)}}
  if(options.detached){
    let enabled=false,stage='DOM.enable';result.detachedNodes={status:'unsupported',failureStage:null,failureReason:null,countsAreProtocolObservations:true,treeContent:'omitted',explicitCollectGarbage:'not called; internal protocol effects unspecified'};
    try{
      enabled=true;await client.send('DOM.enable');
      stage='DOM.getDetachedDomNodes';
      const data=await client.send('DOM.getDetachedDomNodes',{}, {maxResponseBytes:64*1024*1024}) as {detachedNodes?:unknown};
      stage='validate-detached-metadata';
      if(!Array.isArray(data.detachedNodes))throw Object.assign(Error(),{code:'INVALID_DETACHED_METADATA'});
      let retainedNodeIdsObserved=0,truncated=data.detachedNodes.length>200;
      for(const raw of data.detachedNodes.slice(0,200) as unknown[]){
        const item=raw as {retainedNodeIds?:unknown};
        if(!Array.isArray(item.retainedNodeIds)||item.retainedNodeIds.slice(0,1000).some((id:unknown)=>!Number.isSafeInteger(id)||(id as number)<0))throw Object.assign(Error(),{code:'INVALID_DETACHED_METADATA'});
        retainedNodeIdsObserved+=Math.min(1000,item.retainedNodeIds.length);truncated ||= item.retainedNodeIds.length>1000;
      }
      Object.assign(result.detachedNodes,{status:'available',treesReported:data.detachedNodes.length,retainedNodeIdsObserved,truncated,countsMayBeLowerBound:truncated,countBasis:'retainedNodeIds entries; not JS wrapper object count'});
    }catch(error){result.detachedNodes.failureStage=stage;result.detachedNodes.failureReason=failureReason(error);if(failureCode(error)!==undefined)result.detachedNodes.failureProtocolCode=failureCode(error)}
    finally{if(enabled)try{await client.send('DOM.disable')}catch(error){recordCleanupFailure(result,'DOM.disable',error)}}
  }
  return result;
}
function validate(raw:unknown){
  const options=raw as {samples?:unknown;intervalMs?:unknown};
  if(!Number.isInteger(options.samples)||(options.samples as number)<2||(options.samples as number)>20||!Number.isInteger(options.intervalMs)||(options.intervalMs as number)<0||(options.intervalMs as number)>5000||((options.samples as number)-1)*(options.intervalMs as number)>50000)throw Error('Invalid sampling window');
}
async function collect(ctx:series.Context):Promise<series.Report>{
  validate(ctx.options);
  const started=Date.now(),deadline=started+60000,controller=new AbortController();
  const timer=setTimeout(()=>{controller.abort();if(ctx.options.seriesWebview)try{ctx.client?.close!()}catch{/* Final cleanup remains core-owned. */}},60000),samples:series.Sample[]=[];
  const active=()=>{if(controller.signal.aborted||Date.now()>=deadline)throw Error('Sampling deadline')};
  const adb=async(...args:string[])=>{active();const value=ctx.adb.execute?await ctx.adb.execute(args,{timeout:Math.min(10000,Math.max(1,deadline-Date.now())),signal:controller.signal}):await ctx.adb(...args);active();return value.toString()};
  const result:series.Report={schemaVersion:1,source:'Performance series',samples,requestedSamples:ctx.options.samples,intervalMs:ctx.options.intervalMs,deadlineMs:60000,truncated:false,
    observationsAreSequential:true,frameCounters:'accumulated; samples can include the same frames',leakDiagnosis:'not-inferred',webviewOwnership:'CDP selected target only; native renderer subprocess attribution not inferred'};
  try{
    for(let i=0;i<ctx.options.samples;i++){
      active();const entry:series.Sample={index:i,capturedAt:new Date().toISOString(),atMs:Date.now()-started,status:'partial'};samples.push(entry);
      if((await adb('shell','pidof',ctx.options.package)).trim()!==ctx.appPid)throw Error('App process changed');
      try{entry.memory=memory(await adb('shell','dumpsys','meminfo',ctx.options.package))}catch{active();entry.memory={status:'unsupported'}}
      try{entry.frames=frames(await adb('shell','dumpsys','gfxinfo',ctx.options.package,'framestats'))}catch{active();entry.frames={status:'unsupported'}}
      let thermal='',battery='';
      try{thermal=await adb('shell','dumpsys','thermalservice')}catch{active()}
      try{battery=await adb('shell','dumpsys','battery')}catch{active()}
      Object.assign(entry,system(thermal,battery));
      if(ctx.options.seriesWebview){active();entry.webview=await web(ctx.client);active()}
      entry.durationMs=Date.now()-started-entry.atMs;
      entry.status=entry.memory!.status!=='unsupported'&&entry.frames!.status!=='unsupported'&&entry.thermal!.status==='available'&&entry.battery!.status==='available'&&(!ctx.options.seriesWebview||entry.webview!.status==='available'&&!entry.webview!.cleanupWarning)?'complete':'partial';
      if(i+1<ctx.options.samples&&ctx.options.intervalMs){active();await new Promise(resolve=>setTimeout(resolve,Math.min(ctx.options.intervalMs,Math.max(1,deadline-Date.now()))));active()}
    }
  }catch{result.truncated=true;result.reason='sampling-stopped; target changed, command failed or deadline reached'}
  finally{clearTimeout(timer);controller.abort()}
  if(result.truncated||samples.some(s=>s.status!=='complete')){result.collectorStatus='failed';result.reason=result.reason||'requested sampling capabilities incomplete'}
  result.captureEnd=new Date().toISOString();return result;
}
const series={system,web,validate,collect};
export = series;
