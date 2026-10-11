'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {randomUUID}=require('node:crypto');
const {Runtime}=require('../scripts/lib/game-runtime.cjs'),caps=require('../scripts/lib/game-capabilities.cjs'),receipts=require('../scripts/lib/game-receipts.cjs');
test('unrelated receipt owners do not starve the native page batch, and committed cleanup preserves pending records',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pp-mixed-retirement-')),r=new Runtime(path.join(dir,'store.sqlite'),{provider:caps.provider});
 t.after(()=>{r.close();fs.rmSync(dir,{recursive:true,force:true})});
 const target={serial:'fixture',package:'com.example.fixture',userId:'0'},goal={description:'Reach target',kind:'reach-passage',passage:'Target'},budget={timeoutMs:60000,maxActions:8,maxObservations:16,maxReplans:16,maxSpend:null};
 const s=r.start(target,{mode:'gameplay',goal,budget}),contextNonce=randomUUID();
 const binding={provider:'native-dol',contract:'native-radio-123456abcdef',contextNonce,requestDigest:'b'.repeat(64)};
 // Synthetic historical rows model namespace ownership only; they are not
 // evidence of a real remote operation or a Gameplay integration test.
 for(let i=0;i<66;i++)r.saveEffect({id:randomUUID(),targetKey:s.targetKey,sessionId:s.id,status:'settled',executionBinding:{...binding,provider:'other-page-namespace'},result:{outcome:'occurred',remoteClosed:true,spent:0}});
 const id=randomUUID(),pending=randomUUID(),result={outcome:'occurred',remoteClosed:true,spent:0,source:'synthetic terminal test'};
 r.saveEffect({id,targetKey:s.targetKey,sessionId:s.id,status:'settled',executionBinding:binding,result});
 r.saveEffect({id:pending,targetKey:s.targetKey,sessionId:s.id,status:'acknowledged',executionBinding:binding});
 assert.deepEqual(r.receiptRetirements(s.id).map(e=>e.id),[id]);
 const records=Object.create(null);records[id]={...binding,attemptId:id,status:'terminal',...result};records[pending]={...binding,attemptId:pending,status:'started'};
 const globals={window:{[receipts.namespace]:{version:1,nonce:contextNonce,records}}},client={evaluate:async expression=>vm.runInNewContext(expression,globals)};
 const deleted=await receipts.cleanup(client,r.receiptRetirements(s.id));assert.deepEqual(Array.from(deleted.retired),[id]);
 assert.equal(r.effect(id).pageReceiptRetired,undefined);assert.equal(records[pending].status,'started');
 const retry=await receipts.cleanup(client,r.receiptRetirements(s.id));r.confirmReceiptRetirements(s.id,Array.from(retry.retired));
 assert.equal(r.receiptRetirements(s.id).length,0);assert.equal(r.effect(id).status,'settled');assert.equal(r.effect(pending).status,'acknowledged');assert.equal(r.effects(s.targetKey)[0].id,pending);
 assert.throws(()=>r.confirmReceiptRetirements(s.id,[pending]),/requires recovery/);
});
