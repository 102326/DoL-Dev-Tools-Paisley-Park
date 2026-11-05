import type execution from './execution-context.cjs';
declare namespace chromeEvidence {
 interface Result {collectorStatus?:unknown;[key:string]:unknown}
 interface Screenshot extends Result {binary:Buffer;metadata:{width:number;height:number;source:string}}
 interface Window {captureStart?:string;captureEnd?:string}
}
'use strict';
const collectors:typeof import('./collectors.cjs')=require('./collectors.cjs');
const inspectors:typeof import('./inspectors.cjs')=require('./inspectors.cjs');
function collect(ctx:execution.Context,kind:'screenshot',window:chromeEvidence.Window):Promise<chromeEvidence.Screenshot>;
function collect(ctx:execution.Context,kind:string,window:chromeEvidence.Window):Promise<chromeEvidence.Result>;
async function collect(ctx:execution.Context,kind:string,window:chromeEvidence.Window):Promise<chromeEvidence.Result> {
  const supported=['screenshot','dom','css','console','network','storage','environment','web-performance'];
  if(!supported.includes(kind)) return {collectorStatus:'unsupported',reason:'not-supported-on-chrome'};
  const client=await ctx.ensureWebview();
  if(kind==='screenshot') {
    const result=await client.send('Page.captureScreenshot',{format:'png'}) as {data:string}, binary=Buffer.from(result.data,'base64');
    if(binary.length<24 || !binary.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Invalid screenshot');
    return {binary,metadata:{width:binary.readUInt32BE(16),height:binary.readUInt32BE(20),source:'bound Chrome page'}};
  }
  if(kind==='dom'||kind==='css')return collectors[kind](ctx);
  if(kind==='storage')return inspectors.collect(ctx,'storage');
  if(kind==='console'||kind==='network') {ctx.cdpWindow={...window,captureStart:ctx.cdpCaptureStart};return collectors[kind==='console'?'consoleSummary':'networkSummary'](ctx)}
  if(kind==='web-performance') {
    const value=await require('./performance-series.cjs').web(client);
    if(value.status!=='available'||value.cleanupWarning)value.collectorStatus='failed';
    return value;
  }
  const browser=await client.send('Browser.getVersion') as {product?:unknown;protocolVersion?:unknown;jsVersion?:unknown};
  const runtime=await client.evaluate(`(${require('./environment.cjs').snapshot.toString()})()`);
  return {schemaVersion:1,source:'Chrome environment',browser:{product:browser.product,protocolVersion:browser.protocolVersion,jsVersion:browser.jsVersion},runtime,privateData:'not inspected'};
}
const chromeEvidence={collect};
export = chromeEvidence;
