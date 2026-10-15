'use strict';
// Opt-in, content-free Chrome investigation. Not part of npm test or an Android binding.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {spawn}=require('node:child_process'),{setTimeout:delay}=require('node:timers/promises');
const {connect}=require('../scripts/lib/cdp.cjs'),{collect}=require('../scripts/lib/integration.cjs');
const chrome=process.env.DOL_TEST_CHROME;assert(chrome&&path.isAbsolute(chrome),'Select an already installed Chrome using DOL_TEST_CHROME');
const parent=path.resolve(__dirname,'../artifacts/5.1');fs.mkdirSync(parent,{recursive:true});const out=fs.mkdtempSync(path.join(parent,'integration-documents-'));
const report={status:'running',cases:[],observationsAreSequential:true};
let server,browser,client,closed=false,gate,origin,documentNumber=0;const contexts=new Map();
async function binding(){
 const frame=(await client.send('Page.getFrameTree')).frameTree.frame;
 const current=[...contexts.values()].filter(v=>v.auxData?.isDefault&&v.auxData.frameId===frame.id);assert.equal(current.length,1);
 return {frameId:frame.id,loaderId:frame.loaderId,uniqueContextId:current[0].uniqueId,url:frame.url,generation:await client.evaluate('window.fixtureGeneration')};
}
async function navigate(url,reload=false){
 const before=await client.evaluate('window.fixtureGeneration||null');
 if(reload)await client.send('Page.reload',{ignoreCache:true});else await client.send('Page.navigate',{url});
 const deadline=Date.now()+4000;let last;
 while(Date.now()<deadline){try{last=await binding();if(last.generation&&last.generation!==before&&last.url===url)return last}catch{}await delay(20)}
 throw Error('Owned fixture navigation readiness failed');
}
(async()=>{
 try{
  server=http.createServer(async(req,res)=>{
   res.setHeader('Cache-Control','no-store');
   if(req.url==='/gate'){try{await gate();res.end('ready')}catch{res.statusCode=500;res.end('failed')}return}
   if(req.url==='/a'||req.url==='/b'){documentNumber++;res.setHeader('Content-Type','text/html');res.end('<!doctype html><title>Owned Integration Fixture</title><p>Content-free</p><script>window.fixtureGeneration='+JSON.stringify('document-'+documentNumber)+'</script>');return}
   res.statusCode=404;res.end();
  });await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));origin='http://127.0.0.1:'+server.address().port;
  const profile=path.join(out,'owned-profile');fs.mkdirSync(profile);const log=fs.openSync(path.join(out,'chrome.log'),'wx');
  browser=spawn(chrome,['--headless=new','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'--no-first-run','--no-default-browser-check','--disable-background-networking','--disable-component-update','--disable-sync','about:blank'],{stdio:['ignore',log,log]});fs.closeSync(log);browser.on('exit',()=>{closed=true});let launchError;browser.on('error',e=>{launchError=e});
  const portFile=path.join(profile,'DevToolsActivePort'),deadline=Date.now()+10000;
  while(!fs.existsSync(portFile)){if(launchError)throw launchError;assert(!closed&&Date.now()<deadline,'Owned browser unavailable');await delay(50)}
  const endpoint='http://127.0.0.1:'+fs.readFileSync(portFile,'utf8').split('\n')[0];
  report.browser={pid:browser.pid,endpoint,version:await(await fetch(endpoint+'/json/version')).json(),sandboxDisabled:false};
  const target=await(await fetch(endpoint+'/json/new?'+encodeURIComponent(origin+'/a'),{method:'PUT'})).json();report.targetId=target.id;
  client=await connect(endpoint,3000,(method,params)=>{
   if(method==='Runtime.executionContextCreated')contexts.set(params.context.id,params.context);
   if(method==='Runtime.executionContextDestroyed')contexts.delete(params.executionContextId);
   if(method==='Runtime.executionContextsCleared')contexts.clear();
  },target.id);await client.send('Page.enable');await client.send('Runtime.enable');
  await navigate(origin+'/a');
  const moduleFile=path.join(out,'owned-integration.cjs');
  fs.writeFileSync(moduleFile,`let detected;module.exports={contractVersion:1,describe:()=>({name:'owned-document-fixture',version:'1'}),detect:async({client})=>{detected=await client.evaluate('window.fixtureGeneration');await fetch(${JSON.stringify(origin+'/gate')});return 'available'},collect:async({client})=>({status:'available',detectedGeneration:detected,collectedGeneration:await client.evaluate('window.fixtureGeneration')}),redact:value=>value};`,{flag:'wx'});
  for(const mode of ['stable','navigation','same-url-reload']){
   const before=await binding();let after=before;
   gate=async()=>{if(mode==='navigation')after=await navigate(origin+'/b');if(mode==='same-url-reload')after=await navigate(before.url,true)};
   const result=await collect({endpoint,options:{targetId:target.id}},moduleFile);
   assert.equal(result.status,'available');assert.equal(result.data.detectedGeneration,before.generation);assert.equal(result.data.collectedGeneration,after.generation);
   const changed=mode!=='stable';assert.equal(before.uniqueContextId!==after.uniqueContextId,changed);assert.equal(before.loaderId!==after.loaderId,changed);
   if(mode==='same-url-reload')assert.equal(before.url,after.url);
   report.cases.push({mode,before,after,result,detectAndCollectSameDocument:!changed});
  }
  report.status='passed';
 }catch(error){report.status='failed';report.error=error.code||error.message;process.exitCode=1}
 finally{
  client?.close();if(browser&&!closed){browser.kill('SIGTERM');const deadline=Date.now()+4000;while(!closed&&Date.now()<deadline)await delay(50);if(!closed){browser.kill('SIGKILL');await delay(200)}}
  if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve))}
  report.cleanup={ownedBrowserExited:closed,serverNotListening:!server?.listening};if(!closed||server?.listening){report.status='failed';process.exitCode=1}
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,status:report.status,cases:report.cases.map(v=>({mode:v.mode,sameDocument:v.detectAndCollectSameDocument})),cleanup:report.cleanup}));
 }
})();
