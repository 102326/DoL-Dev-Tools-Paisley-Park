const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm');
const {Runtime}=require('../scripts/lib/game-runtime.cjs'),goal=require('../scripts/lib/game-goal.cjs');
const predicates=require('../scripts/lib/game-goal-reader.cjs');
const condition={kind:'purchase-and-equip',slot:'head',colour:'black',passage:'Bedroom'};
const variant={slot:'head',variable:'beanie',colour:'black',accessoryColour:'white',modder:null};
const quote={variant,baselineMoney:1000,baselineCount:0,baselineWornCount:0,unitCost:500};
const config={mode:'gameplay',goal:{description:'Buy and wear a new black head item',...condition},budget:{timeoutMs:60000,maxActions:8,maxObservations:20,maxReplans:20,maxSpend:500}};
const binding={provider:'dol-shop-native',contract:'shop-buy-one-'+'a'.repeat(12),contextNonce:'123e4567-e89b-42d3-a456-426614174000',requestDigest:'a'.repeat(64)};
const buy={ref:'buy-new',kind:'buy',cost:500,risk:'normal',selected:{type:'dol-shop',operation:'buy-one'},quote};
const equip={ref:'equip-new',kind:'equip',cost:0,risk:'normal',selected:{type:'sw-wardrobe',operation:'equip',...variant}};
function scene({worn=false,passage='Clothing Shop',context=binding.contextNonce,choices=[buy]}={}){
  return {source:'original DoL semantic provider',revision:1,location:'home',facts:{domAgrees:true,passage,surface:'game',choices:[],narrative:'Fixture'},choices,
    goalProof:{status:'available',satisfied:false,conditionsSatisfied:worn&&passage==='Bedroom',wornMatches:worn,passage,itemsTruncated:false,owned:[],ownedTruncated:false,turns:2,receiptContext:context,
      worn:worn?{variable:'beanie',colour:'black',accessoryColour:'white',modder:null}:{variable:'naked',colour:0,accessoryColour:0,modder:null}}};
}
function receipt(e,spent=450){return {attemptId:e.id,outcome:'occurred',remoteClosed:true,spent,source:'reviewed isolated purchase receiver fixture',
  evidence:{kind:'purchase',variant,beforeMoney:1000,afterMoney:1000-spent,beforeCount:0,afterCount:1,beforeWornCount:0,afterWornCount:0,turns:1,contextNonce:binding.contextNonce}}}
function proposal(s,ref){return {...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,s.decision[k]])),actionRef:ref,reason:'Current original quote meets the immutable Goal',plan:['Purchase once','Return and wear the purchased variant'],beliefs:[]}}
function fixture(t,provider=goal.provider){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-purchase-')),store=path.join(dir,'sessions.sqlite');
  const r=new Runtime(store,{provider}),runtimes=[r];t.after(()=>{for(const handle of runtimes.reverse())handle.close();assert.ok(dir.startsWith(os.tmpdir()+path.sep));fs.rmSync(dir,{recursive:true,force:true})});
  const s=r.start({serial:'fixture',package:'com.example.game',userId:'0'},config);
  return {r,s,store,runtimes};
}

test('a fresh receipt reader preserves bounded purchase evidence without repairing missing or started records',async()=>{
  const receipts=require('../scripts/lib/game-receipts.cjs'),id='123e4567-e89b-42d3-a456-426614174001';
  const records=Object.create(null),window={[receipts.namespace]:{version:1,nonce:binding.contextNonce,records}};
  const effect={id,status:'dispatching',executionBinding:binding},witness=receipt({id});
  const client={evaluate:async source=>JSON.parse(JSON.stringify(vm.runInNewContext(source,{window,TextEncoder})))};
  records[id]={...binding,...witness,status:'terminal'};let read=await receipts.recover(client,[effect]);
  assert.deepEqual(read[0].evidence,witness.evidence);assert.equal(predicates.validatePurchaseReceipt(read[0],{...effect,action:buy}),true);
  for(const evidence of [[],null,{oversized:'x'.repeat(4097)}]){records[id]={...binding,...witness,status:'terminal',evidence};assert.deepEqual(await receipts.recover(client,[effect]),[])}
  records[id]={...binding,...witness,status:'started'};assert.deepEqual(await receipts.recover(client,[effect]),[]);assert.equal(records[id].status,'started');
  delete records[id];assert.deepEqual(await receipts.recover(client,[effect]),[]);assert.equal(Object.keys(records).length,0);
});
async function dispatch(r,s){
  s=r.observe(s.id,scene());r.propose(s.id,proposal(s,buy.ref));const e=r.prepare(s.id);
  r.bindExecution(e.id,binding);await r.dispatch(e.id,async()=>({dispatch:'acknowledged'}));return r.effect(e.id);
}

test('condition Goal takes a parent budget and quotes preserve the user condition and zero original ownership',()=>{
  assert.equal(goal.validate({name:'new-black',mode:'gameplay',goal:condition,budget:config.budget}).goal.colour,'black');
  for(const changed of [{...condition,variable:'beanie'},{...condition,baselineMoney:1000}])assert.throws(()=>goal.validate({name:'new',mode:'gameplay',goal:changed,budget:config.budget}));
  assert.throws(()=>goal.validate({name:'new',mode:'gameplay',goal:condition,budget:{timeoutMs:60000,maxActions:8,maxObservations:20}}),/spend budget/);
  const shop={status:'available',variable:'beanie',colour:'black',accessoryColour:'white',modder:null,money:1000,cost:500,count:0,wornCount:0,quantity:1,space:1,destination:'wardrobe',pattern:null};
  assert.deepEqual(predicates.quoteFromShop(shop,condition),quote);
  for(const changed of [{colour:'white'},{count:1},{wornCount:1},{quantity:0},{space:0},{accessoryColour:'random'},{variable:'unknown'}])assert.equal(predicates.quoteFromShop({...shop,...changed},condition),null);
  assert.equal(goal.candidates({choices:[]},1,{},shop,condition)[0].quote.baselineMoney,1000);
});

test('same observe settles a verified purchase before checking fresh worn conditions; raw state alone cannot complete',async t=>{
  const {r,s}=fixture(t),e=await dispatch(r,s);
  const pending=r.observe(s.id,scene({worn:true,passage:'Bedroom',choices:[]}));assert.equal(pending.goalSatisfied,false);assert.equal(pending.machine.value,'reconciling');
  for(const mutate of [p=>delete p.evidence,p=>p.evidence.variant.colour='white',p=>p.evidence.beforeCount=1,p=>p.evidence.contextNonce='other',p=>p.evidence.afterMoney=600,p=>p.spent=501]){
    const invalid=JSON.parse(JSON.stringify(receipt(e)));mutate(invalid);assert.throws(()=>r.observe(s.id,scene({worn:true,passage:'Bedroom',choices:[]}),[invalid]),/Unverified/);assert.equal(r.effect(e.id).status,'acknowledged');assert.equal(r.status(s.id).spent,0);
  }
  const done=r.observe(s.id,scene({worn:true,passage:'Bedroom',choices:[]}),[receipt(e)]);
  assert.equal(done.machine.value,'completed');assert.equal(done.spent,450);assert.equal(done.reserved,0);assert.equal(goal.view({...done,openEffects:[]}).proof.satisfied,true);
  assert.deepEqual(done.config.goal,config.goal);assert.equal(r.effect(e.id).result.evidence.afterCount,1);
});

test('a new host retains the purchase witness, filters another buy and requires the same context and fresh exact worn variant',async t=>{
  const {r,s,store,runtimes}=fixture(t),e=await dispatch(r,s);let current=r.observe(s.id,scene({choices:[buy,equip]}),[receipt(e)]);
  assert.deepEqual(current.decision.scene.choices.map(a=>a.ref),['equip-new']);assert.equal(current.decision.outcomes[0].evidence.variant.variable,'beanie');
  const fresh=new Runtime(store,{provider:goal.provider});runtimes.push(fresh);fresh.resume(s.id);
  current=fresh.observe(s.id,scene({choices:[buy,equip]}));assert.equal(current.spent,450);assert.equal(current.actions,1);assert.deepEqual(current.decision.scene.choices.map(a=>a.ref),['equip-new']);
  const stored=fresh.effect(e.id);assert.equal(predicates.canPrepare(buy,condition,fresh.outcomeContext(current)),false);
  const originalEquip={...equip,selected:{...equip.selected,type:'dol-wardrobe'}};
  assert.equal(predicates.canPrepare(originalEquip,condition,{effects:[]}),false);
  assert.equal(predicates.canPrepare(originalEquip,condition,fresh.outcomeContext(current)),true);
  assert.equal(predicates.canPrepare({...originalEquip,selected:{...originalEquip.selected,colour:'white'}},condition,fresh.outcomeContext(current)),false);
  assert.equal(predicates.purchaseSatisfied(scene({worn:true,passage:'Bedroom',context:'new-page'}),condition,fresh.outcomeContext(current)),false);
  const wrong=scene({worn:true,passage:'Bedroom'});wrong.goalProof.worn.accessoryColour='black';assert.equal(predicates.purchaseSatisfied(wrong,condition,fresh.outcomeContext(current)),false);
  const duplicate=scene({worn:true,passage:'Bedroom'});duplicate.goalProof.owned=[{variant:['beanie','black',null,'white'],count:1}];assert.equal(predicates.purchaseSatisfied(duplicate,condition,fresh.outcomeContext(current)),false);
  assert.throws(()=>fresh.observe(s.id,scene(),[{...receipt(e),spent:400,evidence:{...receipt(e).evidence,afterMoney:600}}]),/Conflicting settled/);
  assert.deepEqual(fresh.effect(e.id).result,stored.result);assert.equal(fresh.status(s.id).spent,450);
  const done=fresh.observe(s.id,scene({worn:true,passage:'Bedroom',choices:[]}));assert.equal(done.machine.value,'completed');
});

test('atomic action constraints and synchronous predicate validation reject without changing the ledger',t=>{
  let allow=true;
  const provider={...goal.provider,canPrepare:(a,g,c)=>allow&&goal.provider.canPrepare(a,g,c)},f=fixture(t,provider);
  const s=f.r.observe(f.s.id,scene());f.r.propose(s.id,proposal(s,buy.ref));allow=false;
  assert.throws(()=>f.r.prepare(s.id),/conflicts/);assert.equal(f.r.status(s.id).actions,0);assert.equal(f.r.status(s.id).reserved,0);
  allow=true;provider.canPrepare=()=>Promise.resolve(true);assert.throws(()=>f.r.prepare(s.id),/Synchronous/);assert.equal(f.r.status(s.id).actions,0);
  provider.canPrepare=goal.provider.canPrepare;provider.satisfied=()=>Promise.resolve(true);const before=f.r.status(s.id);
  assert.throws(()=>f.r.observe(s.id,scene()),/Synchronous/);assert.equal(f.r.status(s.id).revision,before.revision);assert.equal(f.r.status(s.id).machine.value,'ready');
});

test('authoritative not-occurred permits a new quote while missing evidence and insufficient parent budget cannot dispatch',async t=>{
  const {r,s}=fixture(t),e=await dispatch(r,s);
  const current=r.observe(s.id,scene(),[{attemptId:e.id,outcome:'not-occurred',remoteClosed:true,spent:0,source:'reviewed fixture receiver ended before business work'}]);
  assert.deepEqual(current.decision.scene.choices.map(a=>a.ref),['buy-new']);assert.equal(current.actions,1);assert.equal(current.spent,0);
  assert.throws(()=>r.propose(s.id,{...proposal(current,buy.ref),quote:{...quote,unitCost:1}}),/No current decision/);
  r.propose(s.id,proposal(current,buy.ref));const second=r.prepare(s.id);r.bindExecution(second.id,binding);await r.dispatch(second.id,async()=>({dispatch:'acknowledged'}));
  const unknown=r.observe(s.id,scene({worn:true,passage:'Bedroom',choices:[]}),[{attemptId:second.id,outcome:'unknown',remoteClosed:false,spent:0,source:'unverified result'}]);assert.equal(unknown.goalSatisfied,false);assert.equal(unknown.openEffects.length,1);
  const low=fixture(t),loaded=low.r.load(low.s.id);loaded.config.budget.maxSpend=499;low.r.save(loaded);
  const ready=low.r.observe(low.s.id,scene());assert.throws(()=>low.r.propose(ready.id,proposal(ready,buy.ref)),/outside budget/);assert.equal(low.r.status(ready.id).actions,0);
});

test('original ownership counts non-candidate variants and refuses to treat truncated or malformed inventory as zero',()=>{
  const worn={variable:'beanie',colour:'black',accessory_colour:'white',modder:null},inventory=[];
  const state={passage:'Bedroom',turns:2,variables:{worn:{head:worn},wardrobe:{head:inventory}}};
  const read=()=>vm.runInNewContext(`(${goal.goalReader.toString()})(goal)`,{goal:condition,window:{SugarCube:{State:state},__paisleyParkGameplayReceiptsV1:{nonce:binding.contextNonce}},document:{querySelectorAll:()=>[{getAttribute:()=>state.passage}]}});
  const e={id:'fixture',status:'settled',action:buy,executionBinding:binding,result:receipt({id:'fixture'})},context={effects:[e],spent:450,reserved:0,budget:config.budget};
  assert.equal(predicates.purchaseSatisfied({goalProof:read()},condition,context),true);
  for(const metadata of [{cursed:true},{outfitPrimary:null}]){
    inventory.push({...worn,...metadata});const p=read();assert.equal(p.items.length,0);assert.equal(p.owned[0].count,1);assert.equal(predicates.purchaseSatisfied({goalProof:p},condition,context),false);inventory.length=0;
  }
  for(let i=0;i<65;i++)inventory.push({variable:'other_'+i,colour:'black',modder:null,accessory_colour:'white',cursed:true});
  const p=read();assert.equal(p.itemsTruncated,false);assert.equal(p.ownedTruncated,true);assert.equal(predicates.purchaseSatisfied({goalProof:p},condition,context),false);
  inventory.length=1;delete inventory[0];assert.equal(read().status,'unavailable');
});
