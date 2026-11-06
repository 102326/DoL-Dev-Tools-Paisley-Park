'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),{EventEmitter}=require('node:events');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const cdp=require('../scripts/lib/cdp.cjs'),hosts=require('../scripts/lib/chrome-host.cjs'),children=require('node:child_process');
const launcherFile=require.resolve('../scripts/lib/chrome-launch.cjs');
function fixture(t,list){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-ready-')),saved={targets:cdp.targets,Host:hosts.ChromeHost,spawn:children.spawn,now:Date.now};let now=0,calls=0,stops=0;
 Date.now=()=>now;
 cdp.targets=async(...args)=>{calls++;return list({calls,args,advance:ms=>{now+=ms}})};
 hosts.ChromeHost=class {constructor(target){this.binding={frameId:'frame',loaderId:'loader',url:target.origin+'/index.html',uniqueContextId:'context'}}async open(){return this}async verifyBrowser(){return 'Chrome/Fixture'}close(){}};
 children.spawn=(_exe,args)=>{const profile=args.find(arg=>arg.startsWith('--user-data-dir=')).slice('--user-data-dir='.length);fs.writeFileSync(path.join(profile,'DevToolsActivePort'),'9222\n/devtools/browser/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');const child=new EventEmitter();child.pid=process.pid;child.kill=()=>{stops++;queueMicrotask(()=>child.emit('close',0));return true};return child};
 delete require.cache[launcherFile];const {launch}=require(launcherFile);
 t.after(()=>{cdp.targets=saved.targets;hosts.ChromeHost=saved.Host;children.spawn=saved.spawn;Date.now=saved.now;delete require.cache[launcherFile];fs.rmSync(root,{recursive:true,force:true})});
 return {launch,options:{out:path.join(root,'owned'),executable:process.execPath,url:'http://127.0.0.1:8000/index.html',mode:'headless',resourceDigest:'a'.repeat(64)},calls:()=>calls,stops:()=>stops};
}
const timeout=()=>Object.assign(Error('Synthetic discovery timeout'),{code:'CDP_DISCOVERY_TIMEOUT',cdpStage:'cdp.discovery'});
test('owned startup tolerates a transient read-only discovery timeout within the original readiness deadline',async t=>{
 const f=fixture(t,({calls,advance})=>{if(calls===1){advance(3000);throw timeout()}return [{type:'page',id:'selected',url:'http://127.0.0.1:8000/index.html'}]});
 const started=await f.launch(f.options);try{assert.equal(f.calls(),2);assert.equal(started.record.target.targetId,'selected')}finally{await started.stop()}
 assert.equal(f.stops(),1);
});
test('repeated discovery timeout terminates at the original startup deadline without a host record',async t=>{
 const f=fixture(t,({advance})=>{advance(3001);throw timeout()});await assert.rejects(f.launch(f.options),{code:'CDP_DISCOVERY_TIMEOUT'});assert.equal(f.calls(),5);assert.equal(f.stops(),1);assert.equal(fs.existsSync(path.join(f.options.out,'host.json')),false);
});
test('invalid discovery inventory is not retried as a timeout',async t=>{
 const f=fixture(t,()=>{throw Object.assign(Error('Invalid inventory'),{code:'CDP_INVALID_RESPONSE'})});await assert.rejects(f.launch(f.options),{code:'CDP_INVALID_RESPONSE'});assert.equal(f.calls(),1);assert.equal(f.stops(),1);
});
test('owned launch preserves discovery and browser-stop failures together',async t=>{
 const primary=Object.assign(Error('PRIVATE_DISCOVERY'),{code:'CDP_INVALID_RESPONSE'}),cleanup=Error('PRIVATE_STOP');
 const f=fixture(t,()=>{throw primary}),spawn=children.spawn;let kills=0;
 children.spawn=(...args)=>{const child=spawn(...args);child.kill=()=>{kills++;throw cleanup};return child};
 delete require.cache[launcherFile];const {launch}=require(launcherFile);
 await assert.rejects(launch(f.options),error=>{
  assert.ok(error instanceof AggregateError);assert.equal(error.code,'PC_CLEANUP_UNCONFIRMED');
  assert.deepEqual(error.errors,[primary,cleanup]);assert.equal(error.cause,primary);return true;
 });assert.equal(kills,1);
});
test('a throwing host close cannot suppress the original launch failure or skip owned browser stop',async t=>{
 const primary=Error('PRIVATE_METADATA'),cleanup=Error('PRIVATE_HOST_CLOSE');
 const f=fixture(t,()=>[{type:'page',id:'selected',url:'http://127.0.0.1:8000/index.html'}]);let closes=0;
 hosts.ChromeHost.prototype.verifyBrowser=async()=>{throw primary};
 hosts.ChromeHost.prototype.close=()=>{closes++;throw cleanup};
 await assert.rejects(f.launch(f.options),error=>{
  assert.equal(error.code,'PC_CLEANUP_UNCONFIRMED');assert.deepEqual(error.errors,[primary,cleanup]);assert.equal(error.cause,primary);return true;
 });assert.equal(closes,1);assert.equal(f.stops(),1);
});
test('log descriptor close uncertainty is never retried and does not skip another owned descriptor',async t=>{
 const f=fixture(t,()=>[]),open=fs.openSync,close=fs.closeSync,owned=[],attempts=new Map(),cleanup=Error('PRIVATE_DESCRIPTOR_CLOSE');
 fs.openSync=function(file,...args){const fd=open.call(this,file,...args);if(/chrome-(stdout|stderr)\.log$/.test(String(file)))owned.push(fd);return fd};
 fs.closeSync=function(fd){if(!owned.includes(fd))return close(fd);attempts.set(fd,(attempts.get(fd)||0)+1);close(fd);if(fd===owned[0]&&attempts.get(fd)===1)throw cleanup};
 try{await assert.rejects(f.launch(f.options),error=>{
  assert.equal(error.code,'PC_CLEANUP_UNCONFIRMED');assert.equal(error.cause,cleanup);return true;
 });assert.deepEqual(owned.map(fd=>attempts.get(fd)),[1,1]);assert.equal(f.stops(),1);assert.equal(JSON.parse(fs.readFileSync(path.join(f.options.out,'launch.json'))).processId,process.pid);
 }finally{fs.openSync=open;fs.closeSync=close;for(const fd of owned)if(!attempts.has(fd))close(fd)}
});
test('host close failure before returning a ready handle still stops the owned browser',async t=>{
 const f=fixture(t,()=>[{type:'page',id:'selected',url:'http://127.0.0.1:8000/index.html'}]),cleanup=Error('PRIVATE_HOST_CLOSE');let closes=0;
 hosts.ChromeHost.prototype.close=()=>{closes++;throw cleanup};
 await assert.rejects(f.launch(f.options),error=>{assert.equal(error.code,'PC_CLEANUP_UNCONFIRMED');assert.deepEqual(error.errors,[cleanup]);assert.equal(error.cause,cleanup);return true});
 assert.equal(closes,1);assert.equal(f.stops(),1);
});
