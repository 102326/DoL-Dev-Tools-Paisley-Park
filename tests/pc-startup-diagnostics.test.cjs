'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const cdp=require('../scripts/lib/cdp.cjs'),httpAPI=require('../scripts/lib/pc-http.cjs'),launcher=require('../scripts/lib/chrome-launch.cjs'),diagnostics=require('../scripts/lib/diagnostics.cjs');
const hostFile=require.resolve('../scripts/lib/chrome-host.cjs');
const origin='http://127.0.0.1:18784',url=origin+'/index.html';
function hostFixture(t,kind,bound=false){
 const saved={targets:cdp.targets,connect:cdp.connect,cache:require.cache[hostFile],now:Date.now};let now=0,closed=0;const commands=[],connected=[];
 Date.now=()=>now;
 cdp.targets=async()=>[{type:'page',id:'selected',url,webSocketDebuggerUrl:'ws://127.0.0.1:9222/devtools/page/selected'},{type:'page',id:'peer',url,webSocketDebuggerUrl:'ws://127.0.0.1:9222/devtools/page/peer'}];
 cdp.connect=async(_endpoint,_timeout,onEvent,id)=>{connected.push(id);return {close(){closed++},async send(method){commands.push(method);if(method==='Runtime.enable')onEvent('Runtime.executionContextCreated',{context:{id:1,uniqueId:'fixture-context',origin:kind==='context'? '://':origin,auxData:{isDefault:true,frameId:'selected'}}});
 if(method==='Page.getFrameTree'){now+=5001;return {frameTree:{frame:{id:'selected',loaderId:kind==='loader'?'':'fixture-loader',url:kind==='empty'?'':kind==='url'?origin+'/other.html':url,urlFragment:''}}}}
 return {}}}};
 delete require.cache[hostFile];const {ChromeHost}=require(hostFile);
 const binding={frameId:'selected',loaderId:'fixture-loader',url,uniqueContextId:'fixture-context'};
 const host=new ChromeHost({host:'chrome',profileId:'a'.repeat(64),browserId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',processId:process.pid,endpoint:'http://127.0.0.1:9222',targetId:'selected',origin,...(bound?{document:binding}:{})});host.verifyBrowser=async()=>{};
 t.after(()=>{cdp.targets=saved.targets;cdp.connect=saved.connect;Date.now=saved.now;if(saved.cache)require.cache[hostFile]=saved.cache;else delete require.cache[hostFile]});
 return {host,commands,connected,closed:()=>closed,binding};
}
test('initial readiness refusal identifies observed state while preserving deadline, error and original target',async t=>{
 for(const [kind,reason] of [['empty','initial-empty-document'],['url','initial-url-mismatch'],['context','initial-context-unavailable'],['loader','initial-loader-unavailable']])await t.test(kind,async t=>{
  const f=hostFixture(t,kind);await assert.rejects(f.host.open(),error=>{assert.equal(error.code,'PC_DOCUMENT_CHANGED');assert.equal(error.pcDocumentReason,reason);const d=diagnostics.describe(error);assert.equal(d.reason,reason);assert.match(d.hint,/initial document/i);return true});
  assert.equal(f.host.binding,null);assert.equal(f.host.client,null);assert.equal(f.closed(),1);assert.deepEqual(f.connected,['selected']);assert.equal(f.commands.includes('Runtime.evaluate'),false);assert.equal(f.commands.filter(m=>m==='Page.getFrameTree').length,1);
 });
});
test('existing binding failure keeps its historical semantics and never masquerades as initial readiness',async t=>{
 const f=hostFixture(t,'url',true);await assert.rejects(f.host.open(),error=>{assert.equal(error.code,'PC_DOCUMENT_CHANGED');assert.equal(error.pcDocumentReason,undefined);assert.equal(diagnostics.describe(error).reason,undefined);return true});assert.deepEqual(f.host.binding,f.binding);assert.equal(f.closed(),1);assert.deepEqual(f.connected,['selected']);
});
function startFixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-startup-diagnostic-')),file=path.join(root,'neutral.html');fs.writeFileSync(file,'<!doctype html><p>Neutral fixture</p>');
 const saved={serve:httpAPI.serve,launch:launcher.launch,write:fs.writeFileSync};let closes=0;
 const progress={connections:2,requests:1,mainGetRequests:1,mainResponsesFinished:0,mainResponsesClosedEarly:1,truncated:false};
 httpAPI.serve=async()=>({url,close:async()=>{closes++},startupProgress:()=>({...progress})});
 const primary=Object.assign(Error('PRIVATE_RAW_PATH_OR_MESSAGE'),{code:'PC_DOCUMENT_CHANGED',pcDocumentReason:'initial-empty-document',privateData:'PRIVATE_DATA'});launcher.launch=async()=>{throw primary};
 t.after(()=>{httpAPI.serve=saved.serve;launcher.launch=saved.launch;fs.writeFileSync=saved.write;fs.rmSync(root,{recursive:true,force:true})});
 return {options:{file,chrome:process.execPath,mode:'headless',port:'18784',out:path.join(root,'instance')},primary,progress,closes:()=>closes,saved};
}
test('owned failed startup retains only finite diagnostics and server progress before closing HTTP',async t=>{
 const f=startFixture(t);await assert.rejects(require('../scripts/lib/pc-session.cjs').start(f.options),error=>error===f.primary);
 const bytes=fs.readFileSync(path.join(f.options.out,'startup-failure.json'),'utf8'),data=JSON.parse(bytes);
 assert.equal(data.readyRecordReturned,false);assert.equal(data.diagnostic.code,'PC_DOCUMENT_CHANGED');assert.equal(data.diagnostic.reason,'initial-empty-document');assert.deepEqual(data.http,f.progress);assert.equal(data.httpDoesNotProveDocumentCommit,true);assert.equal(f.closes(),1);assert.equal(bytes.includes('PRIVATE'),false);assert.equal(bytes.includes(f.options.out),false);
});
test('failed startup journal cannot replace the original error or skip HTTP cleanup',async t=>{
 const f=startFixture(t);let writes=0;
 fs.writeFileSync=function(file,...args){if(String(file).endsWith('startup-failure.json')){writes++;throw Object.assign(Error('PRIVATE_WRITE'),{code:'ENOSPC'})}return f.saved.write.call(this,file,...args)};
 await assert.rejects(require('../scripts/lib/pc-session.cjs').start(f.options),error=>error===f.primary);assert.equal(writes,1);assert.equal(f.closes(),1);
});
test('public startup reason accepts only its finite allowlist and omits untrusted metadata',()=>{
 const d=diagnostics.describe({code:'PC_DOCUMENT_CHANGED',pcDocumentReason:'PRIVATE_REASON',url:'PRIVATE_URL'});assert.equal(d.reason,undefined);assert.equal(JSON.stringify(d).includes('PRIVATE'),false);
});

test('exclusive startup journal creation preserves an observed peer file',async t=>{
 const f=startFixture(t),serve=httpAPI.serve;
 httpAPI.serve=async(...args)=>{const result=await serve(...args);fs.writeFileSync(path.join(f.options.out,'startup-failure.json'),'peer-owned');return result};
 await assert.rejects(require('../scripts/lib/pc-session.cjs').start(f.options),error=>error===f.primary);
 assert.equal(fs.readFileSync(path.join(f.options.out,'startup-failure.json'),'utf8'),'peer-owned');assert.equal(f.closes(),1);
});
