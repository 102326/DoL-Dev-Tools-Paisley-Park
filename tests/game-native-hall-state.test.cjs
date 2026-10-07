const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {checkHall}=require('../scripts/lib/game-native-hall-state.cjs');
function fixture(){
  const variables={stress:0,stressmax:10000,exposed:0,worn:{upper:{name:'sundress'}},hoursGoneFromHome:0,robinmissing:0,renttime:7,
    debug:0,daily:{},home_event_timer:3,orphan_hope:0,orphan_reb:0,location:'home',carried:{handheld:{name:'naked',variable:'naked'}}};
  variables.worn.handheld={name:'naked',variable:'naked'};
  const window={SugarCube:{State:{variables},Scripting:{evalJavaScript:()=>({clothes:{handheld:[{variable:'naked'}]}})}},Time:{days:0,hour:7,month:9},C:{npc:{Robin:{init:0}}}};
  return {variables,window,check:vm.runInNewContext(`(${checkHall.toString()})`,{window})};
}
test('native normal event accepts dynamic RNG and actual event changes, never freezes pre-event state',()=>{
  const {check,variables:v}=fixture();assert.equal(check('before'),undefined);assert.equal(v.rng,undefined);assert.equal(v.daily.homeEvent,undefined);
  v.daily.homeEvent=1;
  for(const [rng,hope,reb] of [[1,0,0],[14,-2,0],[93,0,-2],[250,0,0]]){
    Object.assign(v,{rng,orphan_hope:hope,orphan_reb:reb});assert.equal(check('after'),undefined);
  }
  assert.equal(check('before'),'native-hall-event-unreviewed');v.rng=Promise.resolve(1);assert.equal(check('after'),'native-hall-event-result-unavailable');
  assert.equal(check('unknown'),'native-hall-phase-unavailable');
});
test('native receiving contract refuses unrelated branches without changing the scene or RNG',()=>{
  const handheld=fixture();handheld.variables.carried.handheld.name='item';
  assert.equal(handheld.check('before'),'native-hall-handheld-unreviewed');
  for(const [field,value] of [['renttime',0],['exposed',1],['baileyReunionScene','dungeon'],['hoursGoneFromHome',168],['stress',10000],['auriga_artefact',null],['debug',1]]){
    const {check,variables:v}=fixture();v[field]=value;assert.equal(check('before'),'native-hall-branch-unreviewed',field);assert.equal(v.rng,undefined);
  }
  for(const [field,value] of [['orphan_hope',10],['orphan_reb',-10],['home_event_timer',0],['loft_kylar',1]]){
    const {check,variables:v}=fixture();v[field]=value;assert.equal(check('before'),'native-hall-event-unreviewed',field);
  }
});
test('ordinary event continuation checks original cleanup preconditions, with no RNG forcing or time requirement',()=>{
  const {check,variables:v}=fixture();
  Object.assign(v,{dancing:0,npc:[],per_npc:{},NPCList:Array.from({length:6},()=>({})),rng:1});
  v.worn.neck={name:'naked'};v.daily.homeEvent=1;v.orphan_reb=-2;
  assert.equal(check('before',true),undefined);assert.equal(check('after',true),undefined);
  v.npc.push('Robin');assert.equal(check('before',true),'native-hall-cleanup-unreviewed');v.npc=[];
  v.per_npc.cached={};assert.equal(check('after',true),'native-hall-cleanup-unreviewed');
});
