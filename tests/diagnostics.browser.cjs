// Opt-in, content-free Chrome fixture. Android host calls are substitutes, never device acceptance.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {spawn}=require('node:child_process'),{setTimeout:pause}=require('node:timers/promises');
const {connect}=require('../scripts/lib/cdp.cjs'),action=require('../scripts/lib/action.cjs'),{describe}=require('../scripts/lib/diagnostics.cjs');
const chrome=process.env.DOL_TEST_CHROME;assert(chrome&&path.isAbsolute(chrome),'Select an installed Chrome using DOL_TEST_CHROME');
const parent=path.resolve(__dirname,'../artifacts/maintenance-20261029');fs.mkdirSync(parent,{recursive:true});
const out=fs.mkdtempSync(path.join(parent,'chrome-')),report={scope:'Owned Chrome DOM/CDP; Android host substituted; no game or real device',cases:[]};
let browser,exited=false,server,client,ctx;
const html='<!doctype html><title>Owned Diagnostics Fixture</title><button id="owned">Fixture action</button><span class="duplicate"></span><span class="duplicate"></span><input id="password" type="password"><input id="value"><script>window.fixture={count:0,inputs:0,generation:crypto.randomUUID()};document.getElementById("owned").onclick=()=>fixture.count++;document.getElementById("value").oninput=()=>fixture.inputs++</script>';
async function ready(previous){const end=Date.now()+4000;while(Date.now()<end){try{const value=await client.evaluate('window.fixture');if(value&&value.generation!==previous)return value}catch{}await pause(25)}throw Error('Owned document not ready')}
(async()=>{
 try{
  server=http.createServer((req,res)=>{res.setHeader('Cache-Control','no-store');res.setHeader('Content-Type','text/html');res.end(html)});
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
  const origin='http://127.0.0.1:'+server.address().port,profile=path.join(out,'profile');fs.mkdirSync(profile);
  const log=fs.openSync(path.join(out,'chrome.log'),'wx');
  browser=spawn(chrome,['--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','about:blank'],{stdio:['ignore',log,log]});fs.closeSync(log);
  let launchError;browser.on('error',e=>{launchError=e});browser.on('exit',()=>{exited=true});
  const portFile=path.join(profile,'DevToolsActivePort'),deadline=Date.now()+10000;
  while(!fs.existsSync(portFile)){if(launchError)throw launchError;assert(!exited&&Date.now()<deadline,'Owned Chrome unavailable');await pause(50)}
  const port=fs.readFileSync(portFile,'utf8').split('\n')[0],endpoint='http://127.0.0.1:'+port;
  report.browser=(await(await fetch(endpoint+'/json/version')).json()).Browser;
  const target=await(await fetch(endpoint+'/json/new?'+encodeURIComponent(origin+'/fixture'),{method:'PUT'})).json();
  client=await connect(endpoint,1500,()=>{},target.id);await ready();
  let forwarded=false;
  const adb=async(...args)=>{const k=args.join(' ');return Buffer.from(
   k==='get-state'?'device':k==='shell am get-current-user'?'0':k==='shell pidof com.example.fixture'?'1':
   k.startsWith('shell dumpsys package')?'Package [com.example.fixture]\n versionCode=1\n User 0: installed=true':
   k==='shell cat /proc/net/unix'?'@webview_devtools_remote_1':
   k==='forward tcp:0 localabstract:webview_devtools_remote_1'?(forwarded=true,port):
   k==='forward --list'?(forwarded?'owned-fixture tcp:'+port+' localabstract:webview_devtools_remote_1':''):
   k.startsWith('forward --remove')?(forwarded=false,''):
   k.includes('activity')?'mResumedActivity: Record{ u0 com.example.fixture/.Main }':'mCurrentFocus=Window{ u0 com.example.fixture/.Main }')};
  const options={serial:'owned-fixture',package:'com.example.fixture',targetId:target.id};
  let marks=0;const ordinary={options,adb,ensureWebview:async()=>client,markSideEffect:()=>marks++};
  for(const [selector,type,reason] of [['#absent','web-click','missing'],['.duplicate','web-click','ambiguous'],['#password','web-input','unsupported-type']]){
   await assert.rejects(action.execute(ordinary,{type,selector,...(type==='web-input'?{value:'synthetic'}:{})}),e=>e.code==='WEB_ACTION_REJECTED'&&e.actionReason===reason&&e.notDispatched!==true);
   report.cases.push({case:reason,status:'passed',source:'page-reported',zeroEffectAuthority:false});
  }
  assert.equal(marks,3);assert.equal((await client.evaluate('window.fixture')).count,0);
  await action.execute(ordinary,{type:'web-click',selector:'#owned'});assert.equal((await client.evaluate('window.fixture')).count,1);
  await action.execute(ordinary,{type:'web-input',selector:'#value',value:'synthetic'});
  assert.equal(await client.evaluate('document.getElementById("value").value'),'synthetic');assert.equal((await client.evaluate('window.fixture')).inputs,1);
  report.cases.push({case:'actual-click-and-input',status:'passed',clicks:1,inputEvents:1});
  await assert.rejects(connect(endpoint,100,()=>{},'missing-owned-target'),e=>e.code==='CDP_TARGET_MISSING');
  assert.equal((await client.evaluate('window.fixture')).count,1);report.cases.push({case:'missing-target-no-fallback',status:'passed'});
  ctx=require('../scripts/lib/execution-context.cjs').create(options,{adb,connect:(_endpoint,t,onEvent,id)=>connect(endpoint,t,onEvent,id)});
  let bound=await ctx.ensureWebview();assert.equal(await bound.evaluate('fixture.count'),1);
  const beforeFragment=(await client.send('Page.getFrameTree')).frameTree.frame;
  await client.evaluate('location.hash="owned-change"');
  const afterFragment=(await client.send('Page.getFrameTree')).frameTree.frame;
  let fragmentRejected=false;
  try{await bound.evaluate('fixture.count')}catch(e){assert.equal(e.code,'ANDROID_DOCUMENT_CHANGED');fragmentRejected=true}
  assert.equal(fragmentRejected,true,'Old holder must reject a fragment change');
  report.cases.push({case:'C1-fragment-change',status:'passed',host:'substituted',
    sameProtocolUrl:beforeFragment.url===afterFragment.url,urlFragment:afterFragment.urlFragment??null,
    hrefHasFragment:(await client.evaluate('location.href')).endsWith('#owned-change'),fragmentRejected,
    limitationObserved:!fragmentRejected});
  if(fragmentRejected){await ctx.closeTransport();bound=await ctx.ensureWebview()}
  await client.evaluate('history.pushState(null,"","?owned-change=1#owned-change")');
  const queryDeadline=Date.now()+2000;
  while(!(await client.send('Page.getFrameTree')).frameTree.frame.url.includes('?owned-change=1')){assert(Date.now()<queryDeadline);await pause(20)}
  await assert.rejects(bound.evaluate('fixture.count++'),e=>e.code==='ANDROID_DOCUMENT_CHANGED');assert.equal((await client.evaluate('window.fixture')).count,1);
  report.cases.push({case:'C1-query-URL-change',status:'passed',host:'substituted'});
  await ctx.closeTransport();bound=await ctx.ensureWebview();const old=await client.evaluate('fixture.generation');
  await client.send('Page.reload');await ready(old);
  await assert.rejects(bound.evaluate('fixture.count++'),e=>e.code==='ANDROID_DOCUMENT_CHANGED');assert.equal((await client.evaluate('window.fixture')).count,0);
  report.cases.push({case:'C1-same-URL-natural-reload',status:'passed',host:'substituted'});
  const cleanup=await ctx.finish();ctx=null;assert(!cleanup.some(c=>c.status==='failed'));assert.equal(forwarded,false);
  // Emulate missing optional fields/events around a real Chrome transport. This
  // checks native history data, not compatibility with an actual old WebView.
  let historyReads=0;
  const legacyConnect=async(_endpoint,t,onEvent,id)=>{
    const transport=await connect(endpoint,t,(method,params)=>{if(method!=='Page.navigatedWithinDocument')onEvent(method,params)},id),send=transport.send;
    transport.send=async(method,...args)=>{
      const result=await send(method,...args);
      if(method==='Page.getFrameTree')delete result.frameTree.frame.urlFragment;
      if(method==='Page.getNavigationHistory')historyReads++;
      return result;
    };return transport;
  };
  ctx=require('../scripts/lib/execution-context.cjs').create(options,{adb,connect:legacyConnect});
  const legacy=await ctx.ensureWebview(),beforeHistory=historyReads;
  assert.equal(await legacy.evaluate('fixture.count'),0);
  const readsPerEvaluation=historyReads-beforeHistory;assert.equal(readsPerEvaluation,2);
  await client.evaluate('location.hash="legacy-change"');
  await assert.rejects(legacy.evaluate('fixture.count++'),e=>e.code==='ANDROID_DOCUMENT_CHANGED');assert.equal((await client.evaluate('window.fixture')).count,0);
  report.cases.push({case:'C1-missing-field-and-event-native-history',status:'passed',host:'substituted',protocolMetadata:'optional field and event removed locally',historyReadsPerEvaluation:readsPerEvaluation});
  await ctx.closeTransport();const rebound=await ctx.ensureWebview();assert.equal(await rebound.evaluate('fixture.count'),0);
  await assert.rejects(legacy.evaluate('fixture.count++'),e=>e.code==='ANDROID_BINDING_CLOSED');
  report.cases.push({case:'C1-explicit-rebind-does-not-revive-old-holder',status:'passed'});
  assert(!(await ctx.finish()).some(c=>c.status==='failed'));ctx=null;assert.equal(forwarded,false);
  await assert.rejects(client.send('Runtime.evaluate',{expression:'new Promise(()=>{})',awaitPromise:true,returnByValue:true}),e=>describe(e)?.method==='Runtime.evaluate'&&e.code==='ETIMEDOUT'&&e.notDispatched!==true);
  report.cases.push({case:'actual-CDP-timeout-without-replay',status:'passed'});report.status='passed';
 }catch(e){report.status='failed';report.error=e.code||e.message;console.error(e);process.exitCode=1}
 finally{
  if(ctx)report.contextCleanup=await ctx.finish();client?.close();
  if(browser&&!exited){browser.kill('SIGTERM');const end=Date.now()+4000;while(!exited&&Date.now()<end)await pause(50);if(!exited){browser.kill('SIGKILL');await pause(200)}}
  if(server?.listening){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
  report.cleanup={ownedBrowserExited:exited,serverClosed:!server?.listening};
  if(browser&&!exited||server?.listening){report.status='failed';process.exitCode=1}
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,...report}));
 }
})();
