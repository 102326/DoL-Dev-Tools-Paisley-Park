const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const journey=require('../scripts/lib/journey.cjs');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'dol-journey-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root}
const options=out=>({serial:'offline-device',package:'com.example.game',out,testEnvironment:true});
function adbFixture(){
  const calls=[];let forwarded=false;
  const adb=async(...args)=>{
    calls.push(args);const text=args.join(' ');
    if(text==='get-state')return Buffer.from('device');
    if(text.includes('ro.product.model'))return Buffer.from('test');
    if(text.includes('ro.build.version.release'))return Buffer.from('16');
    if(text.includes('date +%s'))return Buffer.from('1790000000');
    if(text.startsWith('shell dumpsys package'))return Buffer.from('versionName=1.0 versionCode=1');
    if(text.startsWith('shell pidof'))return Buffer.from('123');
    if(text==='shell cat /proc/net/unix')return Buffer.from('@webview_devtools_remote_123');
    if(text==='forward tcp:0 localabstract:webview_devtools_remote_123'){forwarded=true;return Buffer.from('55555')}
    if(text==='forward --list')return Buffer.from(forwarded?'offline-device tcp:55555 localabstract:webview_devtools_remote_123\n':'');
    if(text==='forward --remove tcp:55555'){forwarded=false;return Buffer.alloc(0)}
    if(text==='exec-out screencap -p'){const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(1,16);png.writeUInt32BE(1,20);return png}
    return Buffer.alloc(0);
  };return {adb,calls};
}
const load=steps=>({plan:{schemaVersion:1,steps},sha256:'a'.repeat(64)});
test('Journey validates the full plan before output and plan mode makes no device calls',async t=>{
  const root=fixture(t),f=adbFixture();
  const loaded=load([{type:'web-input',selector:'#test',value:'private-text'},{type:'wait',milliseconds:1}]);
  const r=await journey.run({...options(path.join(root,'plan')),plan:true},loaded,{adb:f.adb});
  assert.equal(r.status,'planned');assert.equal(f.calls.length,0);assert.equal(JSON.stringify(r).includes('private-text'),false);
  await assert.rejects(journey.run({...options(path.join(root,'unauthorized')),testEnvironment:false},loaded,{adb:f.adb}),/test environment/);
  await assert.rejects(journey.run(options(path.join(root,'bad')),load([{type:'home'},{type:'arbitrary-js'}]),{adb:f.adb}),/Invalid action/);
  assert.equal(fs.existsSync(path.join(root,'bad')),false);
  assert.throws(()=>journey.validate({schemaVersion:1,steps:[{type:'checkpoint',capture:['timeline'],scope:'#x'}]}));
  assert.equal(journey.validate({schemaVersion:1,scope:'#x',steps:[{type:'checkpoint',capture:['timeline','storage','selector-health'],timelineMs:20}]}).steps.length,1);
});
test('Journey preserves successful checkpoint files and stops after a later failed collector',async t=>{
  const root=fixture(t),f=adbFixture();let actions=0;
  const report=await journey.run(options(path.join(root,'capture')),load([{type:'checkpoint',scope:'#x',capture:['screenshot','dom']},{type:'home'}]),{
    adb:f.adb,connect:async()=>({close(){},send:async()=>({}),evaluate:async()=>{throw Error('private exception')}}),executeAction:async()=>{actions++},
  });
  assert.equal(report.status,'partial');assert.equal(actions,0);assert.equal(report.steps.length,1);
  assert.equal(report.steps[0].artifacts[0].filename,'step-0-screenshot.png');
  assert.ok(fs.existsSync(path.join(root,'capture/step-0-screenshot.png')));
  assert.ok(f.calls.some(a=>a.join(' ')==='forward --remove tcp:55555'));
  assert.equal(JSON.stringify(report).includes('private exception'),false);
});

test('Journey preserves incomplete requested timeline and stops subsequent actions',async t=>{
 const root=fixture(t),f=adbFixture();let actions=0;
 const report=await journey.run(options(path.join(root,'timeline-failure')),load([{type:'checkpoint',scope:'#x',capture:['timeline'],timelineMs:20},{type:'home'}]),{adb:f.adb,connect:async()=>({close(){},send:async()=>({}),evaluate:async()=>({capabilities:{cleanupConflicts:1}})}),executeAction:async()=>actions++});
 assert.equal(report.status,'partial');assert.equal(report.steps[0].status,'failed');assert.equal(actions,0);assert.ok(fs.existsSync(path.join(root,'timeline-failure/step-0-timeline.json')));
});

test('Journey detached checkpoint forwards its bounded CDP response option and continues after cleanup',async t=>{
 const root=fixture(t),f=adbFixture(),calls=[];let actions=0;
 const report=await journey.run(options(path.join(root,'detached')),load([{type:'checkpoint',capture:['leak-probe']},{type:'home'}]),{
  adb:f.adb,connect:async()=>({close(){},send:async(method,params,settings)=>{
   calls.push({method,settings});
   if(method==='Performance.getMetrics')return{metrics:[{name:'JSHeapUsedSize',value:10}]};
   if(method==='Memory.getDOMCounters')return{nodes:20,documents:1,jsEventListeners:2};
   if(method==='DOM.getDetachedDomNodes')return{detachedNodes:[]};return{};
  }}),executeAction:async()=>actions++
 });
 assert.equal(report.status,'complete');assert.equal(actions,1);
 assert.equal(calls.find(c=>c.method==='DOM.getDetachedDomNodes').settings.maxResponseBytes,64*1024*1024);
 assert.ok(calls.find(c=>c.method==='DOM.disable'));
});
test('Journey deadline prevents subsequent side effects and marks the dispatched result unknown',async t=>{
  const root=fixture(t),f=adbFixture();let count=0;
  const loaded=load([{type:'home'},{type:'home'}]);loaded.plan.timeoutMs=30;
  const report=await journey.run(options(path.join(root,'deadline')),loaded,{adb:f.adb,executeAction:async ctx=>{
    count++;ctx.markSideEffect();await new Promise(resolve=>setTimeout(resolve,50));ctx.assertActive();
  }});
  assert.equal(count,1);assert.equal(report.steps.length,1);assert.equal(report.steps[0].outcome,'unknown; side effect may have occurred');
  assert.equal(report.status,'failed');
});
test('Journey records disconnect ambiguity and cleanup failures without leaking errors',async t=>{
  const root=fixture(t),f=adbFixture();
  const report=await journey.run(options(path.join(root,'disconnect')),load([{type:'home'}]),{adb:f.adb,executeAction:async ctx=>{
    ctx.markSideEffect();ctx.cleanup.push(async()=>{throw Error('private-restore-error')});throw Error('private-disconnect');
  }});
  assert.match(report.steps[0].outcome,/unknown/);assert.ok(report.cleanup.some(c=>c.status==='failed'));
  assert.equal(JSON.stringify(report).includes('private'),false);
});
test('Journey reports uncertain forwarding ownership and never guesses a removal',async t=>{
  const root=fixture(t),f=adbFixture(),original=f.adb;
  const adb=async(...args)=>{if(args[0]==='forward'&&args[1]==='tcp:0')throw Object.assign(Error('lost stdout'),{code:'ETIMEDOUT'});return original(...args)};
  const report=await journey.run(options(path.join(root,'forward-unknown')),load([{type:'wait',selector:'#x',condition:'exists',timeoutMs:1000}]),{adb});
  assert.ok(report.cleanup.some(c=>c.reason?.startsWith('ownership-unknown')));
  assert.equal(f.calls.some(a=>a[0]==='forward'&&a[1]==='--remove'),false);
});

test('Journey preserves a collector command budget and cancellation without dispatching later steps',async t=>{
 const root=fixture(t),f=adbFixture(),child=new AbortController(),settings=[];
 f.adb.execute=async(args,options)=>{settings.push(options);if(options.signal.aborted)throw Error('cancelled command');return f.adb(...args)};
 let actions=0;
 const result=await journey.run(options(path.join(root,'collector-budget')),load([{type:'home'},{type:'home'}]),{adb:f.adb,executeAction:async ctx=>{
  actions++;child.abort();await ctx.adb.execute(['get-state'],{timeout:123,signal:child.signal});
 }});
 assert.equal(actions,1);assert.equal(result.steps.length,1);assert.equal(result.status,'failed');
 assert.equal(settings.at(-1).timeout,123);assert.equal(settings.at(-1).signal.aborted,true);
});
