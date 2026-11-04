const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const journey=require('../scripts/lib/journey.cjs');
const documentClient=require('./fixtures/document-client.cjs');
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

test('Journey diagnostics are additive and do not change legacy timeout categories or Unknown',async t=>{
  const root=fixture(t);
  for(const [code,stage,reason,mark] of [
    ['CDP_DISCOVERY_TIMEOUT','cdp.discovery','step-failed',false],
    ['ETIMEDOUT','cdp.discovery','deadline-or-command-timeout',false],
    ['CDP_CONNECT_TIMEOUT','cdp.connect','step-failed',false],
    ['ETIMEDOUT','cdp.command','deadline-or-command-timeout',true],
  ]){
    const f=adbFixture();let attempts=0;
    const report=await journey.run(options(path.join(root,stage+'-'+code)),load([{type:'home'},{type:'home'}]),{adb:f.adb,executeAction:async ctx=>{
      attempts++;if(mark)ctx.markSideEffect();throw Object.assign(Error('PRIVATE_RAW'),{code,cdpStage:stage,cdpMethod:'Runtime.evaluate'});
    }});
    assert.equal(attempts,1);assert.equal(report.steps.length,1);assert.equal(report.steps[0].reason,reason);
    assert.equal(report.steps[0].diagnostic.stage,stage);
    if(mark)assert.match(report.steps[0].outcome,/unknown/);else assert.equal(report.steps[0].outcome,undefined);
    assert(!JSON.stringify(report).includes('PRIVATE'));
  }
});
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
    adb:f.adb,connect:async(_e,_t,onEvent)=>documentClient({close(){},send:async()=>({}),evaluate:async()=>{throw Error('private exception')}},onEvent),executeAction:async()=>{actions++},
  });
  assert.equal(report.status,'partial');assert.equal(actions,0);assert.equal(report.steps.length,1);
  assert.equal(report.steps[0].artifacts[0].filename,'step-0-screenshot.png');
  assert.ok(fs.existsSync(path.join(root,'capture/step-0-screenshot.png')));
  assert.ok(f.calls.some(a=>a.join(' ')==='forward --remove tcp:55555'));
  assert.equal(JSON.stringify(report).includes('private exception'),false);
});

test('Journey preserves incomplete requested timeline and stops subsequent actions',async t=>{
 const root=fixture(t),f=adbFixture();let actions=0;
 const report=await journey.run(options(path.join(root,'timeline-failure')),load([{type:'checkpoint',scope:'#x',capture:['timeline'],timelineMs:20},{type:'home'}]),{adb:f.adb,connect:async(_e,_t,onEvent)=>documentClient({close(){},send:async()=>({}),evaluate:async()=>({capabilities:{cleanupConflicts:1}})},onEvent),executeAction:async()=>actions++});
 assert.equal(report.status,'partial');assert.equal(report.steps[0].status,'failed');assert.equal(actions,0);assert.ok(fs.existsSync(path.join(root,'timeline-failure/step-0-timeline.json')));
});

test('Journey detached checkpoint forwards its bounded CDP response option and continues after cleanup',async t=>{
 const root=fixture(t),f=adbFixture(),calls=[];let actions=0;
 const report=await journey.run(options(path.join(root,'detached')),load([{type:'checkpoint',capture:['leak-probe']},{type:'home'}]),{
  adb:f.adb,connect:async(_e,_t,onEvent)=>documentClient({close(){},send:async(method,params,settings)=>{
   calls.push({method,settings});
   if(method==='Performance.getMetrics')return{metrics:[{name:'JSHeapUsedSize',value:10}]};
   if(method==='Memory.getDOMCounters')return{nodes:20,documents:1,jsEventListeners:2};
   if(method==='DOM.getDetachedDomNodes')return{detachedNodes:[]};return{};
  }},onEvent),executeAction:async()=>actions++
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

function chromeFixture(t) {
  const root=fixture(t),profilePath=path.join(root,'profile');fs.mkdirSync(profilePath);const profile=fs.realpathSync(profilePath);
  const profileId=require('node:crypto').createHash('sha256').update(profile).digest('hex');
  const target={host:'chrome',profileId,browserId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',processId:123,endpoint:'http://127.0.0.1:9222',targetId:'page',origin:'http://127.0.0.1:8000',profilePath:profile,document:{frameId:'frame',loaderId:'loader',url:'http://127.0.0.1:8000/index.html#scene',uniqueContextId:'context'}};
  const file=path.join(root,'host.json');fs.writeFileSync(file,JSON.stringify({format:'paisley-owned-chrome',version:1,profilePath:profile,executable:'/chrome',resourceDigest:'a'.repeat(64),target}));
  return {root,file,target,options:out=>({host:'chrome','host-file':file,out,testEnvironment:true})};
}
function fakeChrome({evaluate=async()=>({ok:true}),send=async()=>({}),open=async()=>{}}={}) {
  let closes=0;const capture={snapshot:()=>({console:[],network:[],omittedConsole:0,omittedNetwork:0})};
  const host={capture,async open(){await open();return host},async assertBound(){},evaluate,send,close(){closes++}};
  return {host,get closes(){return closes}};
}
test('Chrome Journey executes shared web actions, waits and checkpoints without Android',async t=>{
 const f=chromeFixture(t),calls=[];
 const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(1,16);png.writeUInt32BE(1,20);
 const mock=fakeChrome({evaluate:async source=>{calls.push(source);if(source.includes('waitProbe'))return {satisfied:true};if(source.includes('querySelectorAll')&&source.includes('node.click()'))return {ok:true};return {}},send:async method=>method==='Page.captureScreenshot'?{data:png.toString('base64')}: {}});
 const r=await journey.run(f.options(path.join(f.root,'run')),load([{type:'wait',selector:'#a',condition:'exists',timeoutMs:100},{type:'web-click',selector:'#a'},{type:'checkpoint',scope:'body',capture:['screenshot','dom','css','console','network']}]),{chromeHostFactory:()=>mock.host,adb:async()=>{throw Error('Android called')}});
 assert.equal(r.status,'complete');assert.equal(r.host,'chrome');assert.equal(r.steps.length,3);assert.equal(r.steps[2].artifacts.length,5);assert.equal(mock.closes,1);assert.equal(r.cleanup[0].status,'completed');assert.ok(calls.some(s=>s.includes('node.click()')));
});
test('Chrome Journey rejects native action before output and preserves unsupported checkpoint before stopping',async t=>{
 const f=chromeFixture(t),native=path.join(f.root,'native');
 await assert.rejects(journey.run(f.options(native),load([{type:'home'}])),/Unsupported Chrome action/);assert.equal(fs.existsSync(native),false);
 let evaluations=0;const mock=fakeChrome({evaluate:async()=>{evaluations++;return {ok:true}}});
 const out=path.join(f.root,'unsupported');const r=await journey.run(f.options(out),load([{type:'checkpoint',capture:['performance']},{type:'web-click',selector:'#a'}]),{chromeHostFactory:()=>mock.host});
 assert.equal(r.status,'partial');assert.equal(r.steps.length,1);assert.equal(evaluations,0);
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,'step-0-performance.json'))).data.collectorStatus,'unsupported');
});
test('Chrome deadline closes transport and preserves uncertain action without dispatching another',async t=>{
 const f=chromeFixture(t);let attempts=0;
 const mock=fakeChrome({evaluate:async()=>{attempts++;await new Promise(r=>setTimeout(r,50));return {ok:true}}});
 const loaded=load([{type:'web-click',selector:'#a'},{type:'web-click',selector:'#a'}]);loaded.plan.timeoutMs=20;
 const r=await journey.run(f.options(path.join(f.root,'deadline')),loaded,{chromeHostFactory:()=>mock.host});
 assert.equal(attempts,1);assert.equal(r.steps.length,1);assert.match(r.steps[0].outcome,/unknown/);assert.ok(mock.closes>=1);
});
test('Chrome supported storage, environment and performance use the bound host',async t=>{
 const f=chromeFixture(t),methods=[];
 const mock=fakeChrome({evaluate:async source=>source.includes('indexedDB')?{source:'storage',local:{status:'available'},session:{status:'available'},indexedDB:{status:'available'}}:{mods:{status:'unavailable'}},send:async method=>{methods.push(method);if(method==='Browser.getVersion')return {product:'Chrome/1',protocolVersion:'1',jsVersion:'1'};if(method==='Performance.getMetrics')return {metrics:[{name:'JSHeapUsedSize',value:1},{name:'Nodes',value:2},{name:'JSEventListeners',value:3}]};if(method==='Memory.getDOMCounters')return {nodes:2,jsEventListeners:3};return {}}});
 const r=await journey.run(f.options(path.join(f.root,'evidence')),load([{type:'checkpoint',capture:['storage','environment','web-performance']}]),{chromeHostFactory:()=>mock.host});
 assert.equal(r.status,'complete');assert.equal(r.steps[0].artifacts.length,3);assert.ok(methods.includes('Performance.disable'));
});
test('Chrome host open exceeding deadline is closed and cannot dispatch',async t=>{
 const f=chromeFixture(t);let calls=0;const mock=fakeChrome({open:()=>new Promise(r=>setTimeout(r,35)),evaluate:async()=>{calls++;return {ok:true}}});
 const loaded=load([{type:'web-click',selector:'#a'}]);loaded.plan.timeoutMs=10;
 const r=await journey.run(f.options(path.join(f.root,'open-timeout')),loaded,{chromeHostFactory:()=>mock.host});
 assert.equal(calls,0);assert.equal(r.steps.length,1);assert.equal(r.steps[0].outcome,undefined);assert.ok(mock.closes>=1);
});
test('Chrome records uncertainty before an action can dispatch',async t=>{
 const f=chromeFixture(t),out=path.join(f.root,'intent');const mock=fakeChrome({evaluate:async()=>{
  const pending=JSON.parse(fs.readFileSync(path.join(out,'manifest.json')));assert.match(pending.steps[0].outcome,/unknown/);return {ok:true};
 }});
 const r=await journey.run(f.options(out),load([{type:'web-click',selector:'#a'}]),{chromeHostFactory:()=>mock.host});
 assert.equal(r.status,'complete');assert.equal(r.steps[0].outcome,undefined);
});
test('CLI Chrome plan accepts the owned host and rejects mixed Android options',async t=>{
 const f=chromeFixture(t),plan=path.join(f.root,'action.json');fs.writeFileSync(plan,JSON.stringify({type:'web-click',selector:'#a'}));
 const run=require('node:child_process').spawnSync,cli=path.resolve(__dirname,'../scripts/dol-dev.cjs');
 const args=[cli,'action','--file',plan,'--host','chrome','--host-file',f.file,'--out',path.join(f.root,'plan'),'--plan'];
 const result=run(process.execPath,args,{encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.equal(JSON.parse(fs.readFileSync(path.join(f.root,'plan/manifest.json'))).status,'planned');
 const mixed=run(process.execPath,[...args,'--serial','device'],{encoding:'utf8'});assert.notEqual(mixed.status,0);
});
