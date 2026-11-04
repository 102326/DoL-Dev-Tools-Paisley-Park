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
