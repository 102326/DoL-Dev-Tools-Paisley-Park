'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Runtime}=require('../scripts/lib/game-runtime.cjs');
const target={serial:'clone-fixture',package:'com.example.fixture',userId:'0'};
const provider={validateGoal:()=>true,scene:value=>value,satisfied:()=>false};
const budget=()=>({timeoutMs:60000,maxActions:1,maxObservations:8,maxReplans:2,maxSpend:0});
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-clone-boundary-'));
 const runtime=new Runtime(path.join(dir,'store.sqlite'),{provider});
 t.after(()=>{runtime.close();fs.rmSync(dir,{recursive:true,force:true})});
 return runtime;
}
const configuration=b=>({mode:'gameplay',goal:{description:'Synthetic bounded goal'},budget:b});
function projectedBudget(change){
 const value=budget();
 return Object.assign(Object.create({toJSON(){const projected={...value};change(projected);return projected}}),value);
}
test('SQLite Session rejects a budget enlarged by inherited toJSON',t=>{
 const r=fixture(t),input=projectedBudget(value=>{value.maxActions=2});
 assert.equal(input.maxActions,1);
 assert.throws(()=>r.start(target,configuration(input)));
});
test('SQLite Session rejects a root toJSON that substitutes a larger budget',t=>{
 const r=fixture(t),original=configuration(budget());
 const input=Object.assign(Object.create({toJSON(){return {...original,budget:{...original.budget,maxActions:2}}}}),original);
 assert.equal(input.budget.maxActions,1);
 assert.throws(()=>r.start(target,input));
});
test('SQLite Session rejects a budget getter that changes after its first validation',t=>{
 const r=fixture(t),original=budget(),changed={...original,maxActions:2};let reads=0;
 const input={mode:'gameplay',goal:{description:'Synthetic bounded goal'},get budget(){return ++reads===1?original:changed}};
 assert.throws(()=>r.start(target,input));
});
test('SQLite Session rejects missing or replaced budget fields in JSON projection',t=>{
 const r=fixture(t);
 for(const change of [v=>{delete v.maxActions},v=>{v.timeoutMs=120000},v=>{v.maxObservations=9},v=>{v.maxReplans=3},v=>{v.maxSpend=1}]){
  assert.throws(()=>r.start(target,configuration(projectedBudget(change))));
 }
 const inherited=Object.assign(Object.create({maxActions:1}),{timeoutMs:60000,maxObservations:8,maxReplans:2,maxSpend:0});
 assert.throws(()=>r.start(target,configuration(inherited)));
});
test('SQLite Session rejects a scope whose toJSON adds an authorized intent',t=>{
 const r=fixture(t),scope={workspace:os.tmpdir(),...target,signingHash:'a11ce',intents:['debug'],dataDomain:'app-user-data'};
 const input=Object.assign(Object.create({toJSON(){return {...scope,intents:['debug','experiment']}}}),scope);
 assert.deepEqual(input.intents,['debug']);
 assert.throws(()=>r.start(target,{...configuration(budget()),scope:input}));
});
test('SQLite Session rejects an inherited scope lost during JSON projection',t=>{
 const r=fixture(t),scope={workspace:os.tmpdir(),...target,signingHash:'a11ce',intents:['debug'],dataDomain:'app-user-data'};
 const input=Object.assign(Object.create({scope}),configuration(budget()));
 assert.equal(input.scope,scope);
 assert.throws(()=>r.start(target,input));
});
test('ordinary JSON and a value-preserving toJSON keep the original budget',t=>{
 const r=fixture(t);
 const normal=r.start(target,configuration(budget()));
 assert.deepEqual(normal.config.budget,budget());
 r.stop(normal.id);
 const preserved=r.start(target,configuration(projectedBudget(()=>{})));
 assert.deepEqual(preserved.config.budget,budget());
});
