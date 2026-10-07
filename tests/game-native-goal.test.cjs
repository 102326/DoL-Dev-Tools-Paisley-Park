const test=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const native=require('../scripts/lib/game-native-provider.cjs');

const goal={kind:'native-state',passage:'Kitchen',conditions:[
  {field:'hunger',op:'lte',value:20},
  {field:'tiredness',op:'gte',value:5},
  {field:'money',op:'eq',value:100},
]};
const request=g=>({name:'native-check',mode:'gameplay',goal:g,budget:{timeoutMs:1000,maxActions:1,maxObservations:1,maxSpend:0}});
function read(g,variables,{passage='Kitchen',domPassage=passage}={}){
  const root={getAttribute:key=>key==='data-passage'?domPassage:null};
  return vm.runInNewContext(`(${native.reader.toString()})(${JSON.stringify(g)})`,{
    window:{SugarCube:{State:{passage,variables}}},document:{querySelectorAll:selector=>selector==='#passages > .passage'?[root]:[]},
  });
}

test('native-state validates fixed numeric conditions and clones public requests',()=>{
  assert.equal(native.supportsGoal(goal),true);
  assert.equal(native.supportsGoal({kind:'reach-passage',passage:'Kitchen'}),true);
  assert.equal(native.validateGoal(goal),true);
  const cloned=native.validateRequest(request(goal));
  assert.deepEqual(cloned,request(goal));assert.notEqual(cloned,request(goal));
  cloned.goal.conditions[0].value=999;assert.equal(goal.conditions[0].value,20);
  assert.equal(native.validateGoal({...goal,conditions:[{field:'hunger',op:'gte',value:5},{field:'hunger',op:'lte',value:20}]}),true);
  const hygiene={kind:'native-state',passage:'Bedroom',conditions:[{field:'hygiene',op:'eq',value:0}]};
  assert.equal(native.validateGoal(hygiene),true);
  assert.equal(read(hygiene,{hygiene:0},{passage:'Bedroom'}).satisfied,true);
  assert.equal(read(hygiene,{hygiene:1},{passage:'Bedroom'}).satisfied,false);
  assert.equal(read(hygiene,{},{passage:'Bedroom'}).status,'unavailable');
  const training={kind:'native-state',passage:'Bedroom',conditions:[{field:'physique',op:'gte',value:5300}]};
  assert.equal(native.validateGoal(training),true);
  assert.equal(read(training,{physique:5320},{passage:'Bedroom'}).satisfied,true);
  assert.equal(read(training,{physique:5200},{passage:'Bedroom'}).satisfied,false);
  assert.equal(read(training,{physique:'5320'},{passage:'Bedroom'}).status,'unavailable');
  for(const bad of [
    {...goal,conditions:[]},{...goal,conditions:Array(1)},{...goal,conditions:[goal.conditions[0],,goal.conditions[1]]},{...goal,conditions:Array(9).fill(goal.conditions[0])},
    {...goal,conditions:[{field:'health',op:'eq',value:0}]},
    {...goal,conditions:[{field:'hunger',op:'lt',value:1}]},
    {...goal,conditions:[{field:'hunger',op:'eq',value:Infinity}]},
    {...goal,conditions:[{field:'hunger',op:'eq',value:1e12+1}]},
    {...goal,conditions:[{field:'hunger',op:'eq',value:0,path:'constructor'}]},
  ])assert.equal(native.validateGoal(bad),false);
  assert.throws(()=>native.validateRequest(request({...goal,description:'internal only'})),/Invalid native Goal/);
  assert.throws(()=>native.validateRequest(request({...goal,conditions:[{field:'health',op:'eq',value:0}]})),/Invalid native Goal/);
});

test('native and domain requests preserve bounded original goal descriptions without extending authority',()=>{
  const domain=require('../scripts/lib/game-goal-reader.cjs');
  for(const validate of [native.validateRequest,domain.validate]){
    const r=request({kind:'reach-passage',passage:'Bedroom'});
    r.description='在原生游戏里完成普通活动后返回卧室；保留原目标和零消费预算。';
    assert.deepEqual(validate(r),r);
    for(const description of ['', ' ', '\n', 1, null, 'x'.repeat(513)])assert.throws(()=>validate({...r,description}),/Invalid Goal request/);
    assert.throws(()=>validate({...r,description:r.description,permissions:['overwrite-save']}),/Invalid Goal request/);
  }
});

test('native knowledge goals require original membership and return state, without exposing the collection or coercing missing data',()=>{
  const g={kind:'native-knowledge',collection:'plants_known',entry:'daisy',passage:'Bedroom'};
  assert.deepEqual(native.validateRequest(request(g)),request(g));
  for(const variables of [{},{plants_known:'daisy'},{plants_known:null},{plants_known:Array(513)}])assert.equal(read(g,variables).status,'unavailable');
  const inherited=Object.create({plants_known:['daisy']});assert.equal(read(g,inherited).status,'unavailable');
  const before=read(g,{plants_known:['rose']},{passage:'Bedroom'});
  assert.equal(before.known,false);assert.equal(before.satisfied,false);assert.deepEqual(native.traceDistances(before,g),[1,0]);
  const learned=read(g,{plants_known:['rose','daisy']});
  assert.equal(learned.known,true);assert.equal(learned.satisfied,false);assert.deepEqual(native.traceDistances(learned,g),[0,1]);
  assert.equal(JSON.stringify(learned).includes('rose'),false);
  const done=read(g,{plants_known:['daisy']},{passage:'Bedroom'});
  assert.equal(done.satisfied,true);assert.deepEqual(native.traceDistances(done,g),[0,0]);
  assert.notDeepEqual(native.traceProgress(before),native.traceProgress(learned));
  assert.equal(read(g,{plants_known:['DAISY']},{passage:'Bedroom'}).known,false);
  assert.throws(()=>native.traceDistances({...learned,satisfied:true},g),/Reliable native-knowledge proof required/);
  for(const bad of [{...g,collection:'saves'},{...g,entry:''},{...g,entry:5},{...g,op:'write'},{...g,collection:'__proto__'}])assert.equal(native.validateGoal(bad),false);
});

test('browser reader uses original exact numbers and a unique matching passage DOM',()=>{
  const variables={hunger:20,tiredness:5,money:100};
  const met=read(goal,variables);
  assert.equal(met.status,'available');assert.equal(met.satisfied,true);
  assert.deepEqual(Array.from(met.conditionValues,v=>[v.field,v.op,v.expected,v.actual]),[
    ['hunger','lte',20,20],['tiredness','gte',5,5],['money','eq',100,100]]);
  assert.equal(read(goal,{...variables,hunger:21}).satisfied,false);
  assert.equal(read(goal,{...variables,tiredness:4}).satisfied,false);
  assert.equal(read(goal,{...variables,money:99.999}).satisfied,false);
  assert.equal(read(goal,variables,{passage:'Bedroom'}).satisfied,false);
  assert.equal(read(goal,variables,{passage:'Bedroom',domPassage:'Kitchen'}).status,'unavailable');
  assert.equal(read({kind:'reach-passage',passage:'Kitchen'},variables).satisfied,true);
  assert.equal(read({kind:'reach-passage',passage:'Bedroom'},variables).satisfied,false);
});

test('missing, null and string values are unavailable, never coerced to zero',()=>{
  const zero={kind:'native-state',conditions:[{field:'hunger',op:'eq',value:0}]};
  for(const variables of [{},{hunger:null},{hunger:'0'},{hunger:NaN},{hunger:Infinity}]){
    const proof=read(zero,variables);
    assert.equal(proof.status,'unavailable');assert.equal(proof.satisfied,null);
    assert.throws(()=>native.traceDistances(proof,zero),/Reliable native-state proof required/);
  }
  assert.equal(read(zero,{hunger:0}).satisfied,true);
});

test('distance directions measure target gap and passage mismatch separately from raw state change',()=>{
  const proof=read(goal,{hunger:24,tiredness:3,money:97},{passage:'Bedroom'});
  assert.deepEqual(native.traceDistances(proof,goal),[4,2,3,1]);
  const met=read(goal,{hunger:19,tiredness:7,money:100});
  assert.deepEqual(native.traceDistances(met,goal),[0,0,0,0]);
  const ranged={kind:'native-state',conditions:[{field:'hunger',op:'gte',value:10},{field:'hunger',op:'lte',value:20}]};
  assert.deepEqual(native.traceDistances(read(ranged,{hunger:4}),ranged),[6,0]);
  assert.deepEqual(native.traceDistances(read(ranged,{hunger:25}),ranged),[0,5]);
  assert.throws(()=>native.traceDistances({...proof,satisfied:true},goal),/Reliable native-state proof required/);
  assert.notDeepEqual(native.traceProgress(proof),native.traceProgress(met));
  assert.deepEqual(native.traceProgress({status:'available',satisfied:true}),[true]);
});
