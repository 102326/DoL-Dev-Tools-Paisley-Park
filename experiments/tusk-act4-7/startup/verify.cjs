'use strict';
// Private neutral diagnostic driver. No request bodies/headers/profile data are recorded.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const root=path.resolve(process.env.PAISLEY_TOOL_ROOT||path.join(__dirname,'../../..')),[chrome,outArg,mode='observe',port='18784']=process.argv.slice(2),out=path.resolve(outArg||'');
if(!chrome||!outArg||(!['observe','hold-document','hold-script'].includes(mode)||!/^\d{4,5}$/.test(port)||Number(port)<1024||Number(port)>65535))throw Error('Usage: probe.cjs CHROME NEW_OUTPUT MODE PORT');
fs.mkdirSync(out,{mode:0o700});const started=performance.now(),events=[],counts={},pending=new Set();let instance,host,held=false,released=false,originalTarget,binding;
const record=(kind,data={})=>{counts[kind]=(counts[kind]||0)+1;if(events.length<512)events.push({ms:Math.round(performance.now()-started),kind,...data})};
const origin='http://127.0.0.1:'+port,wanted=origin+'/index.html',urlKind=url=>url===''?'empty':url===wanted?'requested':url?.startsWith(origin+'/')?'fixture-other':'other';
const create=http.createServer;
http.createServer=function(...args){
 const listener=args.pop();if(typeof listener!=='function')throw Error('Expected owned HTTP listener');
 const server=create.call(this,...args,(req,res)=>{
  const kind=req.url==='/index.html'?'document':req.url==='/fixture.js'?'script':req.url==='/favicon.ico'?'favicon':'other';
  record('http-request',{resource:kind});res.once('finish',()=>record('http-finish',{resource:kind,status:res.statusCode}));res.once('close',()=>record('http-response-close',{resource:kind,finished:res.writableFinished}));
  if((mode==='hold-document'&&kind==='document'||mode==='hold-script'&&kind==='script')&&!released){held=true;record('gate-held',{resource:kind});const release=()=>{pending.delete(release);if(!res.destroyed)listener(req,res)};pending.add(release);return}
  return listener(req,res);
 });
 server.on('connection',()=>record('http-connection'));server.once('listening',()=>record('http-listening'));
 // In particular do NOT register clientError/error/data handlers or change timeouts.
 return server;
};
const cdp=require(path.join(root,'scripts/lib/cdp.cjs')),connect=cdp.connect,targets=cdp.targets;
cdp.targets=async(...args)=>{const list=await targets(...args);record('discovery',{requestedPages:list.filter(p=>p.type==='page'&&p.url===wanted).length});return list};
cdp.connect=async(endpoint,timeout,onEvent,id)=>{
 originalTarget??=id;record('cdp-connect',{sameTarget:id===originalTarget,timeoutMs:timeout});
 const client=await connect(endpoint,timeout,(method,params)=>{
  if(method==='Runtime.executionContextCreated')record('context',{default:params.context?.auxData?.isDefault===true,origin:params.context?.origin===origin?'requested':params.context?.origin==='://'?'opaque-empty':'other'});
  if(method==='Page.frameNavigated')record('navigated',{url:urlKind(params.frame?.url),sameTarget:params.frame?.id===id});
  if(method==='Page.frameStartedLoading'||method==='Page.frameStoppedLoading'||method==='Runtime.executionContextsCleared')record(method);
  if(method==='Network.loadingFailed')record('network-failed',{canceled:params.canceled===true,error:typeof params.errorText==='string'&&/^net::ERR_[A-Z_]+$/.test(params.errorText)?params.errorText:'other'});
  onEvent?.(method,params);
 },id),send=client.send;
 client.send=async function(method,params,settings){const value=await send.call(this,method,params,settings);if(method==='Page.getFrameTree')record('frame',{url:urlKind(value.frameTree?.frame?.url),hasLoader:!!value.frameTree?.frame?.loaderId,sameTarget:value.frameTree?.frame?.id===id});return value};return client;
};
const pc=require(path.join(root,'scripts/lib/pc-session.cjs')),{ChromeHost}=require(path.join(root,'scripts/lib/chrome-host.cjs'));
const report={schemaVersion:1,node:process.version,platform:process.platform,mode,scope:'owned neutral Chrome startup; no business dispatch',checks:[],businessDispatches:0};
const release=()=>{if(released)return;released=true;if(held)record('gate-release');for(const run of [...pending])run()};
(async()=>{
 const html=path.join(out,'fixture.html'),js=path.join(out,'fixture.js'),resources=path.join(out,'resources.json');
 fs.writeFileSync(html,'<!doctype html><meta charset="utf-8"><title>Neutral startup</title><script src="/fixture.js"></script><p>Neutral fixture</p>');
 fs.writeFileSync(js,'window.neutralStartupReady=true;');fs.writeFileSync(resources,JSON.stringify({schemaVersion:1,resources:[{urlPath:'/fixture.js',file:js}]}));
 try{instance=await pc.start({chrome,file:html,resources,mode:'headless',port,out:path.join(out,'instance')});binding=instance.record.target.document;record('bound',{url:urlKind(binding.url)});report.start='bound';}
 catch(error){report.start='refused';report.refusalCode=error.code||'unknown';record('start-refused',{code:report.refusalCode});if(mode==='hold-document'){assert.equal(held,true);assert.equal(report.refusalCode,'PC_DOCUMENT_CHANGED');assert.equal(fs.existsSync(path.join(out,'instance/chrome/host.json')),false);
   const journalFile=path.join(out,'instance/startup-failure.json');if(!fs.existsSync(journalFile))throw Object.assign(Error('Expected bounded startup failure journal'),{code:'STARTUP_JOURNAL_MISSING'});
   const journal=JSON.parse(fs.readFileSync(journalFile,'utf8'));assert.equal(journal.readyRecordReturned,false);assert.equal(journal.diagnostic.code,'PC_DOCUMENT_CHANGED');assert.equal(journal.diagnostic.reason,'initial-empty-document');assert.equal(journal.http.mainGetRequests,1);assert.equal(journal.http.mainResponsesFinished,0);assert.equal(journal.httpDoesNotProveDocumentCommit,true);
   report.checks.push('withheld document refuses the original uncommitted target without a binding');report.checks.push('startup journal distinguishes an incomplete main response without claiming a document commit');return}throw error}
 if(mode==='hold-document')throw Error('Withheld document unexpectedly bound');
 host=await new ChromeHost(instance.record.target).open();
 if(mode==='hold-script'){assert.equal(held,true);assert.equal(await host.evaluate('Boolean(window.neutralStartupReady)'),false);report.checks.push('withheld script is distinguishable from an uncommitted initial document');release()}
 const until=performance.now()+3000;
 while(!await host.evaluate('Boolean(window.neutralStartupReady)')){if(performance.now()>=until)throw Error('Fixture script unavailable');await new Promise(r=>setTimeout(r,20))}
 await host.assertBound();assert.equal(JSON.stringify(host.binding),JSON.stringify(binding));report.checks.push('the same immutable document observes the neutral script without retargeting');
})().then(()=>{report.status='passed'},error=>{report.status='failed';report.error=error.code||'STARTUP_DIAGNOSTIC_FAILED';fs.writeFileSync(path.join(out,'failure-local.log'),String(error.stack||error),{mode:0o600});process.exitCode=1}).finally(async()=>{
 release();host?.close();try{await instance?.stop()}catch{report.stop='unconfirmed';process.exitCode=1}
 const launchFile=path.join(out,'instance/chrome/launch.json');report.browserCleanup='not-observed';
 if(fs.existsSync(launchFile)){const launch=JSON.parse(fs.readFileSync(launchFile,'utf8'));try{process.kill(launch.processId,0);report.browserCleanup='unconfirmed'}catch(e){report.browserCleanup=e.code==='ESRCH'?'confirmed':'unconfirmed'}}
 report.serverCleanup=await new Promise(resolve=>{const socket=require('node:net').createConnection({host:'127.0.0.1',port:Number(port)});socket.setTimeout(1000);socket.once('connect',()=>{socket.destroy();resolve('unconfirmed')});socket.once('timeout',()=>{socket.destroy();resolve('unconfirmed')});socket.once('error',e=>resolve(e.code==='ECONNREFUSED'?'confirmed':'unconfirmed'))});
 report.cleanup=report.browserCleanup==='confirmed'&&report.serverCleanup==='confirmed'?'confirmed':'unconfirmed';if(report.cleanup!=='confirmed')process.exitCode=1;
 report.counts=counts;report.events=events;report.dropped=Math.max(0,Object.values(counts).reduce((a,b)=>a+b,0)-events.length);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify({...report,events:undefined}));
});
