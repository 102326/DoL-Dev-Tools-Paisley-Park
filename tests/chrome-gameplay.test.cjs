'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createHash}=require('node:crypto');
const scope=require('../scripts/lib/game-scope.cjs'),{Runtime}=require('../scripts/lib/game-runtime.cjs'),{provider}=require('../experiments/gold-runtime/fixture.cjs');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'chrome-gameplay-'));const runtimes=[];t.after(()=>{for(const runtime of runtimes)runtime.close();fs.rmSync(dir,{recursive:true,force:true})});const profile=fs.realpathSync(dir);return {dir,runtimes,target:{host:'chrome',profileId:createHash('sha256').update(profile).digest('hex'),profilePath:profile,browserId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',processId:123,endpoint:'http://127.0.0.1:9222',origin:'http://127.0.0.1:8000',targetId:'page',document:{frameId:'frame',loaderId:'loader',url:'http://127.0.0.1:8000/index.html',uniqueContextId:'context'}}}}
const config={mode:'gameplay',goal:{description:'Synthetic bounded receiver',location:'Home'},budget:{timeoutMs:60000,maxActions:4,maxObservations:8,maxReplans:8,maxSpend:40}};
test('Chrome scope binds exact Profile/origin, rejects Android or mixed authority, and cannot authorize data-reset',t=>{
 const f=fixture(t),s={host:'chrome',workspace:f.dir,profileId:f.target.profileId,origin:f.target.origin,intents:['experiment'],dataDomain:'chrome-origin-storage'};
 assert.equal(scope.validate(s),true);scope.assertSessionTarget(s,f.target);
 for(const value of [{...s,serial:'placeholder'},{...s,intents:['data-reset']},{...s,dataDomain:'app-user-data'}])assert.equal(scope.validate(value),false);
 assert.throws(()=>scope.assertSessionTarget({...s,origin:'http://127.0.0.1:8001'},f.target));
 assert.throws(()=>scope.assertSessionTarget(s,{serial:'test',package:'org.example.app',userId:'0'}));
});
test('shared Runtime persists Chrome target, rejects missing document and Android proof, preserves Profile pending across tabs',async t=>{
 const f=fixture(t),r=new Runtime(path.join(f.dir,'sessions.sqlite'),{provider});f.runtimes.push(r);
 const noDoc={...f.target};delete noDoc.document;assert.throws(()=>r.start(noDoc,config),/owned Chrome/);
 assert.throws(()=>r.start(f.target,config,{nativeIdentityProof:{}}),/Android resource proof/);
 let s=r.start(f.target,config);assert.equal(s.nativeIdentity,undefined);assert.equal(s.resourceGeneration,undefined);
 s=r.observe(s.id,{source:'isolated fixture receiver',revision:0,location:'Shop',choices:[{ref:'buy',kind:'buy',cost:40,risk:'normal',destination:'Shop'}]});
 const d=s.decision;r.propose(s.id,{...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:'buy',reason:'Approved synthetic receiver',plan:[],beliefs:[]});
 const effect=r.prepare(s.id);await r.dispatch(effect.id,async()=>{throw Error('Unknown transport')});r.stop(s.id);
 const next=r.start({...f.target,targetId:'other-tab',browserId:'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',document:{...f.target.document,uniqueContextId:'other-context'}},config);
 const pending=r.status(next.id).openEffects;assert.equal(pending.length,1);assert.equal(pending[0].sessionId,s.id);assert.equal(r.status(next.id).targetKey,s.targetKey);
});
test('internal GER target transport is branded; external JSON cannot bypass owned record validation',t=>{
 const f=fixture(t),host=require('../scripts/lib/host-options.cjs');
 const internal=host.fromTarget(f.target);assert.equal(host.chrome(internal,{gameplay:true}).target.targetId,'page');
 assert.throws(()=>host.chrome(JSON.parse(JSON.stringify(internal)),{gameplay:true}),{code:'PC_INPUT_INVALID'});
 assert.throws(()=>host.chrome({...internal,serial:'placeholder'},{gameplay:true}),{code:'PC_INPUT_INVALID'});
});
test('receipt retirement selects the current Chrome context before its capacity limit',t=>{
 const f=fixture(t),r=new Runtime(path.join(f.dir,'retirement.sqlite'),{provider:{...provider,pageReceiptProviders:['project-experiment']}});f.runtimes.push(r);
 const old=r.start(f.target,config);r.stop(old.id);
 const current=r.start({...f.target,targetId:'second-tab',document:{...f.target.document,uniqueContextId:'second-context'}},config);
 const {randomUUID}=require('node:crypto');
 function settled(owner){const id=randomUUID();r.saveEffect({id,targetKey:owner.targetKey,sessionId:owner.id,status:'settled',result:{outcome:'occurred',spent:10},executionBinding:{provider:'project-experiment',contract:'project-recipe-v1',contextNonce:randomUUID(),requestDigest:'a'.repeat(64)}});return id}
 for(let i=0;i<65;i++)settled(old);const expected=settled(current);
 assert.deepEqual(r.receiptRetirements(current.id).map(e=>e.id),[expected]);
 assert.equal(r.receiptRetirements(old.id).length,64);
});
