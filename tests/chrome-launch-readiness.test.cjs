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
