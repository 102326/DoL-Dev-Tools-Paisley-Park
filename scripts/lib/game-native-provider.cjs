'use strict';
// Native Gameplay owns the default predicate and ordinary visible controls.
// Domain providers can contribute actions without changing this Scene model.
const {createHash}=require('node:crypto');
const action=require('./action.cjs');
const keys=(v,allowed)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const bounded=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\u0000-\u001f]/.test(v);
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const nativeFields=['hunger','thirst','tiredness','stress','hygiene','physique','money','timeStamp'];
function validateGoal(g){
  if(g?.kind==='reach-passage')return keys(g,['description','kind','passage'])&&bounded(g.passage);
  if(g?.kind==='native-knowledge')return keys(g,['description','kind','collection','entry','passage'])&&g.collection==='plants_known'&&bounded(g.entry)&&
    (g.passage===undefined||bounded(g.passage));
  return keys(g,['description','kind','passage','conditions'])&&g.kind==='native-state'&&
    (g.passage===undefined||bounded(g.passage))&&Array.isArray(g.conditions)&&g.conditions.length>=1&&g.conditions.length<=8&&
    Array.from(g.conditions).every(c=>keys(c,['field','op','value'])&&Object.keys(c).length===3&&nativeFields.includes(c.field)&&
      ['eq','lte','gte'].includes(c.op)&&Number.isFinite(c.value)&&Math.abs(c.value)<=1e12);
}
function validateRequest(request){
  if(!keys(request,['name','description','mode','goal','budget','requiredCheckpoints'])||!/^[A-Za-z0-9._-]{1,64}$/.test(request.name||'')||!['gameplay','development'].includes(request.mode)||
    request.description!==undefined&&(typeof request.description!=='string'||!request.description.trim()||request.description.length>512||/[\u0000-\u001f]/.test(request.description)))throw Error('Invalid Goal request');
  if(!keys(request.goal,['kind','passage','conditions','collection','entry'])||!validateGoal(request.goal))throw Error('Invalid native Goal');
  const b=request.budget;
  if(!keys(b,['timeoutMs','maxActions','maxObservations','maxReplans','maxSpend'])||!Number.isInteger(b.timeoutMs)||b.timeoutMs<1000||b.timeoutMs>3600000||!Number.isInteger(b.maxActions)||b.maxActions<1||b.maxActions>64||!Number.isInteger(b.maxObservations)||b.maxObservations<1||b.maxObservations>192)throw Error('Invalid Goal budget');
  if(b.maxReplans!==undefined&&(!Number.isSafeInteger(b.maxReplans)||b.maxReplans<1||b.maxReplans>192)||b.maxSpend!==undefined&&(!Number.isSafeInteger(b.maxSpend)||b.maxSpend<0||b.maxSpend>100000000))throw Error('Invalid additional Goal budget');
  const checkpoints=request.requiredCheckpoints;
  if(checkpoints!==undefined&&(request.mode!=='development'||!Array.isArray(checkpoints)||checkpoints.length>8||!checkpoints.every(bounded)||new Set(checkpoints).size!==checkpoints.length))throw Error('Invalid required checkpoints');
  return JSON.parse(JSON.stringify(request));
}
function reader(goal){
  const state=window.SugarCube?.State,roots=document.querySelectorAll('#passages > .passage');
  if(roots.length!==1||roots[0].getAttribute('data-passage')!==state?.passage||typeof state?.passage!=='string'||state.passage.length>128)return {status:'unavailable',satisfied:null,source:'original game state/DOM agreement unavailable'};
  if(goal.kind==='reach-passage')return {status:'available',satisfied:state.passage===goal.passage,source:'original SugarCube Passage and current DOM',passage:state.passage};
  if(goal.kind==='native-knowledge'){
    const list=state.variables?.[goal.collection];
    if(!state.variables||!Object.prototype.hasOwnProperty.call(state.variables,goal.collection)||!Array.isArray(list)||list.length>512)return {status:'unavailable',satisfied:null,source:'original knowledge collection unavailable'};
    const known=Array.prototype.includes.call(list,goal.entry);
    return {status:'available',kind:'native-knowledge',satisfied:known&&(goal.passage===undefined||state.passage===goal.passage),
      source:'original SugarCube knowledge collection and current DOM',collection:goal.collection,entry:goal.entry,known,passage:state.passage};
  }
  const variables=state.variables,values=[];
  for(const condition of goal.conditions){
    if(!variables||!Object.prototype.hasOwnProperty.call(variables,condition.field)||!Number.isFinite(variables[condition.field]))
      return {status:'unavailable',satisfied:null,source:'original numeric state field unavailable'};
    values.push({field:condition.field,op:condition.op,expected:condition.value,actual:variables[condition.field]});
  }
  const matches=value=>value.op==='eq'?value.actual===value.expected:value.op==='lte'?value.actual<=value.expected:value.actual>=value.expected;
  return {status:'available',kind:'native-state',satisfied:(goal.passage===undefined||state.passage===goal.passage)&&values.every(matches),
    source:'original SugarCube numeric state fields and current DOM',passage:state.passage,conditionValues:values};
}
const probe=g=>async client=>({...await client.evaluate(`(${reader.toString()})(${JSON.stringify(g)})`),observedAt:new Date().toISOString()});
function candidates(facts,epoch){
  return facts.choices.filter(c=>c.safe===true&&c.requiresQuote!==true&&(c.centerActionable===true||c.scrollEligible===true)&&typeof c.selector==='string').map(c=>({ref:hash([epoch,c.index,c.selector,c.label,c.destination]),kind:c.destination?'navigation':'menu',cost:0,risk:'normal',label:c.label,destination:c.destination,selected:{type:'web-click',selector:c.selector},capability:{provider:'native-dol',name:'control'}}));
}
function validateAction(selected,intent){action.validate(selected);if(selected.type!=='web-click'||intent==='buy')throw Error('Unsupported native Gameplay action')}
function validateReceipt(r,e){
  const v=r.evidence;
  if(v?.kind==='native-radio')return require('./game-native-radio.cjs').validateReceipt(r,e);
  // Old fixture/guard results have no native producer binding. A dispatched
  // native producer must supply its original lifecycle/state witness.
  if(v===undefined)return e?.executionBinding?.provider!=='native-dol'||r.outcome!=='occurred';
  return e?.executionBinding?.provider==='native-dol'&&e.action?.kind==='navigation'&&
    /^native-passage-[a-f0-9]{12}$/.test(e.executionBinding.contract||'')&&r.outcome==='occurred'&&r.remoteClosed===true&&
    keys(v,['kind','from','intended','to','redirected','turnBefore','turnAfter','timeBefore','timeAfter','moneyBefore','moneyAfter','phases','addonSettled','history','time','tasks'])&&v.kind==='native-passage'&&
    bounded(v.from)&&bounded(v.to)&&bounded(v.intended)&&v.intended===e.action.destination&&v.redirected===(v.to!==v.intended)&&
    Number.isSafeInteger(v.turnBefore)&&v.turnBefore>=0&&validHistory(v.history,v.turnBefore,v.turnAfter)&&
    Number.isFinite(v.timeBefore)&&Number.isFinite(v.timeAfter)&&
    (!Object.hasOwn(v,'tasks')||keys(v.tasks,['kind','tasks','timersBefore','timersAfter','registriesEmpty'])&&Reflect.ownKeys(v.tasks).length===5&&
      v.tasks.kind==='native-render-cleanup'&&Number.isSafeInteger(v.tasks.tasks)&&v.tasks.tasks>=1&&v.tasks.tasks<=2&&
      Number.isSafeInteger(v.tasks.timersBefore)&&v.tasks.timersBefore>=0&&v.tasks.timersBefore<=512&&v.tasks.timersAfter===0&&v.tasks.registriesEmpty===true)&&
    (!Object.hasOwn(v,'time')||keys(v.time,['kind','seconds','callbacks','hookTablesEmpty','synchronous'])&&Reflect.ownKeys(v.time).length===5&&
      v.time.kind==='native-time'&&Number.isSafeInteger(v.time.seconds)&&v.time.seconds>=60&&v.time.seconds<3600&&v.time.seconds%60===0&&[4,8].includes(v.time.callbacks)&&v.time.hookTablesEmpty===true&&v.time.synchronous===true&&v.timeAfter-v.timeBefore===v.time.seconds)&&
    Number.isSafeInteger(v.moneyBefore)&&v.moneyBefore>=0&&
    Number.isSafeInteger(v.moneyAfter)&&v.moneyAfter>=0&&r.spent===Math.max(0,v.moneyBefore-v.moneyAfter)&&
    v.phases===5&&(v.addonSettled===0||v.addonSettled===5);
}
function validHistory(h,before,after){
  return keys(h,['historyBefore','historyAfter','expiredBefore','expiredAfter','maxStates','maxExpired','newMoment'])&&Object.keys(h).length===7&&h.newMoment===true&&
    ['historyBefore','historyAfter','expiredBefore','expiredAfter','maxStates','maxExpired'].every(k=>Number.isSafeInteger(h[k])&&h[k]>=0)&&
    h.maxStates>=2&&h.maxStates<=128&&h.maxExpired<=1024&&h.historyBefore>=1&&h.historyBefore<=h.maxStates&&h.expiredBefore<=h.maxExpired&&
    h.historyAfter===Math.min(h.historyBefore+1,h.maxStates)&&
    h.expiredAfter===Math.min(h.expiredBefore+Math.max(0,h.historyBefore+1-h.maxStates),h.maxExpired)&&
    before===h.historyBefore+h.expiredBefore&&after===h.historyAfter+h.expiredAfter;
}
function traceDistances(proof,g){
  if(g?.kind==='native-knowledge'){
    if(!validateGoal(g)||proof?.status!=='available'||proof.kind!=='native-knowledge'||
      proof.source!=='original SugarCube knowledge collection and current DOM'||typeof proof.satisfied!=='boolean'||typeof proof.known!=='boolean'||
      proof.collection!==g.collection||proof.entry!==g.entry||!bounded(proof.passage))throw Error('Reliable native-knowledge proof required');
    const distances=[proof.known?0:1,...(g.passage===undefined?[]:[proof.passage===g.passage?0:1])];
    if(proof.satisfied!==distances.every(d=>d===0))throw Error('Reliable native-knowledge proof required');
    return distances;
  }
  if(g?.kind!=='native-state')return undefined;
  if(!validateGoal(g)||proof?.status!=='available'||proof.kind!=='native-state'||
    proof.source!=='original SugarCube numeric state fields and current DOM'||typeof proof.satisfied!=='boolean'||
    typeof proof.passage!=='string'||!Array.isArray(proof.conditionValues)||proof.conditionValues.length!==g.conditions.length)
    throw Error('Reliable native-state proof required');
  const distances=Array.from(proof.conditionValues,(value,index)=>{
    const expected=g.conditions[index];
    if(!keys(value,['field','op','expected','actual'])||value.field!==expected.field||value.op!==expected.op||
      value.expected!==expected.value||!Number.isFinite(value.actual))throw Error('Reliable native-state proof required');
    return value.op==='eq'?Math.abs(value.actual-value.expected):value.op==='lte'?Math.max(value.actual-value.expected,0):Math.max(value.expected-value.actual,0);
  });
  if(g.passage!==undefined)distances.push(proof.passage===g.passage?0:1);
  if(proof.satisfied!==distances.every(distance=>distance===0))throw Error('Reliable native-state proof required');
  return distances;
}
const traceProgress=p=>p?.kind==='native-knowledge'?[p.satisfied,p.known,p.passage??null]:p?.kind==='native-state'?[p.satisfied,p.passage??null,...(p.conditionValues||[]).map(v=>[v.field,v.op,v.expected,v.actual])]:[p.satisfied];
module.exports={id:'native-dol',supportsGoal:g=>['reach-passage','native-state','native-knowledge'].includes(g?.kind),validateGoal,validateRequest,reader,probe,candidates,validateAction,
  satisfied:scene=>scene.goalProof.satisfied===true,validateReceipt,canPrepare:()=>true,
  attestNavigation:(client,descriptor)=>require('./game-native-navigation.cjs').attest(client,descriptor),
  prepare:(client,descriptor,goal,attemptId)=>descriptor.kind==='menu'?require('./game-native-radio.cjs').prepare(client,descriptor,goal,attemptId):require('./game-native-navigation.cjs').prepare(client,descriptor,goal,attemptId,require('./game-native-profile.cjs').review),
  observe:async()=>({}),publicProof:s=>s.scene?.goalProof??null,traceProgress,traceDistances};
