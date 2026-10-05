const {test}=require('node:test'),assert=require('node:assert/strict');
const {system,web,validate,collect}=require('../scripts/lib/performance-series.cjs');
test('performance probes allowlist numeric metadata and leave no Performance domain enabled',async()=>{
  const parsed=system('Thermal Status: 2\n secret: private','level: 75\n scale: 100\n temperature: 321\n voltage: 4200\n status: 2');
  assert.equal(parsed.thermal.severity,2);assert.equal(parsed.battery.temperatureC,32.1);assert.equal(JSON.stringify(parsed).includes('private'),false);
  const calls=[];
  const data=await web({send:async(method)=>{calls.push(method);if(method==='Performance.getMetrics')return{metrics:[{name:'JSHeapUsedSize',value:10},{name:'Nodes',value:NaN},{name:'SECRET_BODY',value:15}]};if(method==='Memory.getDOMCounters')return{nodes:20,documents:2,jsEventListeners:4,secret:'private'};return{}}});
  assert.equal(data.status,'available');assert.equal(data.metrics.JSHeapUsedSize,10);assert.equal(data.nodes,20);assert.equal(calls.at(-1),'Performance.disable');assert.equal(JSON.stringify(data).includes('private'),false);
  assert.throws(()=>validate({samples:20,intervalMs:5000}));
  const detachedCalls=[];const detached=await web({send:async method=>{detachedCalls.push(method);if(method==='Performance.getMetrics')return{metrics:[{name:'JSHeapUsedSize',value:10}]};if(method==='Memory.getDOMCounters')return{nodes:20};if(method==='DOM.getDetachedDomNodes')return{detachedNodes:[{retainedNodeIds:[1,2],get treeNode(){throw Error('private tree content')}}]};return{}}},{detached:true});
  assert.equal(detached.detachedNodes.retainedNodeIdsObserved,2);assert.equal(detached.detachedNodes.treesReported,1);assert.equal(detachedCalls.at(-1),'DOM.disable');assert.equal(JSON.stringify(detached).includes('private'),false);
  const failedEnable=[];const uncertain=await web({send:async method=>{failedEnable.push(method);if(method.endsWith('.enable'))throw Error('enable response lost');if(method==='DOM.disable')throw Error('connection lost');return{}}},{detached:true});assert.ok(failedEnable.includes('Performance.disable'));assert.ok(failedEnable.includes('DOM.disable'));assert.equal(uncertain.cleanupWarning,true);
  const clockOnly=await web({send:async method=>method==='Performance.getMetrics'?{metrics:[{name:'Timestamp',value:10}]}:{}});assert.equal(clockOnly.status,'unsupported');assert.equal(clockOnly.capabilities.heap,false);
});
test('native repeated samples stop on changed process and retain successful samples',async()=>{
  let pids=0;
  const ctx={options:{samples:3,intervalMs:0,package:'com.example.game'},appPid:'123',adb:async(...args)=>{
    const cmd=args.join(' ');if(cmd.includes('pidof'))return Buffer.from(++pids===3?'456':'123');
    if(cmd.includes('meminfo'))return Buffer.from('TOTAL PSS: 12\nTOTAL RSS: 20');if(cmd.includes('gfxinfo'))return Buffer.from('Total frames rendered: 5\nJanky frames: 1');
    if(cmd.includes('thermalservice'))return Buffer.from('Thermal Status: 0');if(cmd.includes('battery'))return Buffer.from('level: 50\nscale: 100');throw Error('unexpected');
  }};
  const data=await collect(ctx);assert.equal(data.samples[0].status,'complete');assert.equal(data.samples[1].status,'complete');assert.equal(data.samples[2].status,'partial');assert.equal(data.collectorStatus,'failed');assert.equal(data.truncated,true);
});
