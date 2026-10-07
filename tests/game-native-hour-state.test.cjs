const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {checkHour}=require('../scripts/lib/game-native-hour-state.cjs');
function fixture(){
  const v={debug:0,player:{penisExist:false,vaginaExist:true},cow:0,parasite:{nipples:{}},earSlime:{growth:0,defyCooldown:0},
    pillory:{tenant:{exists:0}},pregnancies:[],pendingPregnancies:{vagina:null,anus:null},cumLoads:{vagina:[],anus:[]},
    sexStats:{vagina:{pregnancy:{fetus:[]}},anus:{pregnancy:{fetus:[]}}},milk_volume:0,trackedArousal:[0]};
  const window={SugarCube:{State:{variables:v}},Time:{days:0,hour:7},C:{npc:{Sydney:{init:0}}}};
  return {v,window,check:vm.runInNewContext('('+checkHour.toString()+')',{window})};
}
test('reviewed morning hour branch accepts fresh initial state and rejects noon, midnight, active branches and missing originals',()=>{
  const f=fixture();assert.equal(f.check('before'),undefined);f.window.Time.hour=8;assert.equal(f.check('after'),undefined);
  f.window.Time.hour=9;assert.equal(f.check('before'),undefined);assert.equal(f.check('after'),undefined);
  f.window.Time.hour=12;assert.equal(f.check('after'),'native-hour-branch-unreviewed');
  for(const change of [f=>f.v.statFreeze=true,f=>f.v.innocencestate=1,f=>f.v.player.penisExist=true,
    f=>f.v.cumLoads.vagina.push({}),f=>f.v.pendingPregnancies.anus={},f=>delete f.v.pregnancies,
    f=>f.window.C.npc.Sydney.init=1,f=>f.v.trackedArousal.push(NaN),f=>f.v.rngOverride=0]){
    const f=fixture();change(f);assert.equal(f.check('before'),'native-hour-branch-unreviewed');
  }
});
