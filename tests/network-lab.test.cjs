const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const lab=require('../scripts/lib/network-lab.cjs');
test('network experiment validates first and restores declared baseline on original session even after partial apply',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dol-network-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const neutral={offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1,blockedURLs:[]},plan={schemaVersion:1,baseline:neutral,scenario:{...neutral,offline:true,blockedURLs:['*private.example*']},milliseconds:20},loaded={plan,sha256:'a'.repeat(64)};
 assert.throws(()=>lab.validate({...plan,baseline:{...neutral,latency:10}}));let calls=[],closed=0,count=0;
 const client={send:async(method,params)=>{calls.push({method,params});if(method==='Network.emulateNetworkConditions'&&params.offline){const initial=JSON.parse(fs.readFileSync(path.join(root,'run','manifest.json')));assert.equal(initial.captureEnd,undefined);assert.equal(initial.cleanup.every(c=>c.status==='unknown'),true)}if(++count===3)throw Error('private failure')},close:()=>closed++,isOpen:()=>true};
 const options={out:path.join(root,'run'),endpoint:'http://127.0.0.1:1',testEnvironment:true,exclusiveNetwork:true};
 assert.throws(()=>lab.validate({...plan,scenario:{...neutral,downloadThroughput:0}}));
 const report=await lab.run(options,loaded,{connect:async()=>client,pause:async()=>{throw Error('must not wait after failed apply')}});
 assert.equal(report.status,'failed');assert.equal(report.cleanup.length,2);assert.equal(report.cleanup.every(c=>c.status==='acknowledged'),true);assert.equal(closed,1);assert.deepEqual(calls.at(-1).params,{urls:[]});assert.deepEqual(calls.at(-2).params,{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});assert.equal(JSON.stringify(report).includes('private.example'),false);
 const lost=await lab.run({...options,out:path.join(root,'lost')},loaded,{connect:async()=>({send:async()=>{},isOpen:()=>false,close:()=>{}}),pause:async()=>{}});assert.equal(lost.status,'failed');
 const unknown=await lab.run({...options,out:path.join(root,'unknown')},loaded,{connect:async()=>({send:async()=>{if(++count>7)throw Error()},isOpen:()=>true,close:()=>{}}),pause:async()=>{}});assert.ok(unknown.cleanup.some(c=>c.status==='unknown'));
 const staticPlan=await lab.run({out:path.join(root,'plan'),plan:true},loaded);assert.equal(staticPlan.status,'planned');
 await assert.rejects(lab.run({...options,out:path.join(root,'missing-authority'),exclusiveNetwork:false},loaded));assert.equal(fs.existsSync(path.join(root,'missing-authority')),false);
});
