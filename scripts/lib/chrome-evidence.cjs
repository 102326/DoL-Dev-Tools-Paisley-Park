'use strict';
const collectors=require('./collectors.cjs');
const inspectors=require('./inspectors.cjs');
async function collect(ctx,kind,window) {
  const supported=['screenshot','dom','css','console','network','storage','environment','web-performance'];
  if(!supported.includes(kind)) return {collectorStatus:'unsupported',reason:'not-supported-on-chrome'};
  const client=await ctx.ensureWebview();
  if(kind==='screenshot') {
    const result=await client.send('Page.captureScreenshot',{format:'png'}), binary=Buffer.from(result.data,'base64');
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
  const browser=await client.send('Browser.getVersion');
  const runtime=await client.evaluate(`(${require('./environment.cjs').snapshot.toString()})()`);
  return {schemaVersion:1,source:'Chrome environment',browser:{product:browser.product,protocolVersion:browser.protocolVersion,jsVersion:browser.jsVersion},runtime,privateData:'not inspected'};
}
module.exports={collect};
