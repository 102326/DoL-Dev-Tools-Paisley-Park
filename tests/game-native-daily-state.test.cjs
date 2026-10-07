const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {checkDaily}=require('../scripts/lib/game-native-daily-state.cjs');
function fixture(){
  const v={location:'home',stress:0,stressmax:10000,debug:0,pblevel:1,pbstrip:0,pblevelballs:1,makeup:{owned:{hairdye:[]}},
    dancing:0,npc:[],per_npc:{},NPCList:Array.from({length:6},()=>({})),worn:{neck:{name:'naked'}}};
  const window={SugarCube:{State:{variables:v}},Time:{days:0,hour:7},C:{npc:{Robin:{init:0}}}};
  return {v,window,check:vm.runInNewContext(`(${checkDaily.toString()})`,{window})};
}
test('daily contract allows random and temporary changes but requires the actual return and cleanup conditions',()=>{
  const {v,check}=fixture();assert.equal(check('before','bathroom'),undefined);assert.equal(check('before','brush'),undefined);
  Object.assign(v,{rng:93,orphan_reb:-2,event:{name:'ordinary-event'}});
  assert.equal(check('after','brush'),'native-daily-return-unavailable');v.bathroomExit='Bathroom';
  assert.equal(check('after','brush'),undefined);assert.equal(check('before','continued'),undefined);assert.equal(check('after','continued'),undefined);
  v.npc.push('Robin');assert.equal(check('before','continued'),'native-daily-cleanup-unreviewed');
  assert.equal(check('unknown','brush'),'native-daily-phase-unavailable');assert.equal(check('before','other'),'native-daily-activity-unavailable');
});
test('daily contract refuses unreviewed side effects without changing original state',()=>{
  for(const [key,value] of [['stress',10000],['combat',1],['rngOverride',0],['eventPoolOverride','forced'],['passageOverride','elsewhere']]){
    const {v,check}=fixture();v[key]=value;const before=JSON.stringify(v);
    assert.equal(check('before','brush'),'native-daily-branch-unreviewed',key);assert.equal(JSON.stringify(v),before);
  }
  const {v,check}=fixture();v.pregnancyTest=1;assert.equal(check('before','bathroom'),'native-bathroom-branch-unreviewed');
  const time=fixture();time.window.Time.hour=8;assert.equal(time.check('before','brush'),'native-daily-branch-unreviewed');
});
