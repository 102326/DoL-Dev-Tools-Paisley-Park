'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {ChromeHost}=require('../scripts/lib/chrome-host.cjs');
test('same-context URL change after preflight prevents expression side effects',async()=>{
 let clicks=0;const location={href:'http://127.0.0.1:18767/index.html'};
 const host=Object.create(ChromeHost.prototype);host.binding={url:location.href,uniqueContextId:'fixture-context'};
 host.assertBound=async()=>{location.href+='?changed'};
 host.client={async send(method,params){assert.equal(params.uniqueContextId,'fixture-context');try{return {result:{value:vm.runInNewContext(params.expression,{location,click:()=>{clicks++}})}}}catch{return {exceptionDetails:{}}}}};
 await assert.rejects(host.evaluate('click()'));assert.equal(clicks,0);
 location.href=host.binding.url;host.assertBound=async()=>{};
 await host.evaluate('click()');assert.equal(clicks,1);
});
test('owned launcher reports failed startup when executable is not Chrome and retains local records',async t=>{
 const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-launch-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const out=path.join(root,'owned');
 await assert.rejects(require('../scripts/lib/chrome-launch.cjs').launch({executable:process.execPath,out,mode:'headless',url:'http://127.0.0.1:18767/index.html',resourceDigest:'a'.repeat(64)}),{code:'PC_LAUNCH_FAILED'});
 assert.equal(fs.existsSync(path.join(out,'host.json')),false);
 assert.equal(JSON.parse(fs.readFileSync(path.join(out,'launch.json'))).scope,'Owned launch; preserve on unconfirmed termination');
});
test('a deadline crossed during identity reads prevents subsequent evaluation',async()=>{
 let expired=false,evaluations=0;const host=Object.create(ChromeHost.prototype);
 host.binding={frameId:'frame',loaderId:'loader',url:'http://127.0.0.1:18767/index.html',uniqueContextId:'context'};
 host.contexts=new Map([[1,{uniqueId:'context'}]]);host.verifyBrowser=async()=>{};
 host.assertActive=()=>{if(expired)throw Object.assign(Error('deadline'),{code:'ETIMEDOUT'})};
 host.client={isOpen:()=>true,async send(method){if(method==='Page.getFrameTree'){expired=true;return {frameTree:{frame:{id:'frame',loaderId:'loader',url:host.binding.url,urlFragment:''}}}}evaluations++;return {result:{value:true}}}};
 await assert.rejects(host.evaluate('true'),{code:'ETIMEDOUT'});assert.equal(evaluations,0);
});
test('pc-start cleans up when owned Chrome closes before the CLI registers its listener',async()=>{
 const session=require('../scripts/lib/pc-session.cjs'),{EventEmitter}=require('node:events');
 const original=session.start,log=console.log;let stops=0,timer;
 const browser=new EventEmitter();browser.exitCode=0;browser.signalCode=null;
 session.start=async()=>{browser.emit('close');return {browser,isClosed:()=>true,url:'http://127.0.0.1:18767/index.html',hostFile:'owned-host.json',record:{target:{processId:123},mode:'headless'},stop:async()=>{stops++}}};console.log=()=>{};
 try{
  await Promise.race([require('../scripts/dol-dev.cjs').main(['pc-start']),new Promise((_,reject)=>{timer=setTimeout(()=>{browser.emit('close');reject(Error('Missed Chrome close event'))},250)})]);
  assert.equal(stops,1);
 }finally{clearTimeout(timer);session.start=original;console.log=log}
});
