const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {checkGarden,collectSeedRequirements,sameSeedRequirements}=require('../scripts/lib/game-native-garden-state.cjs');
function fixture(){
  const v={location:'home',stress:0,stressmax:10000,exposed:0,debug:0,orphan_hope:0,phase:0,phase2:0,
    plants_known:[],tendingvars:{},fertiliser:{current:0,used:0},tending:0,garden_flowers_intro:1,plots:{},robin:{}};
  const window={SugarCube:{State:{variables:v}},Time:{days:0,hour:7},C:{npc:{Robin:{init:0}}}};
  const check=vm.runInNewContext('('+checkGarden.toString()+')',{window});return{v,window,check};
}
test('native first-day garden accepts normal random state and exact initial flower plots without forcing events',()=>{
  const f=fixture();f.v.rng=81;
  assert.equal(f.check('before','garden'),undefined);assert.equal(f.check('before','flowers'),undefined);
  assert.equal(f.check('after','flowers'),'native-garden-plots-unreviewed');
  delete f.v.garden_flowers_intro;
  f.v.plots.garden=Array.from({length:3},()=>({plant:'none',stage:0,days:0,water:0,till:0,bed:'earth',quality:1,size:'small'}));
  assert.equal(f.check('after','flowers'),undefined);
  f.v.plants_known.push('daisy');assert.equal(f.check('after','flowers'),undefined);
  f.v.plots.garden[0].stage=1;assert.equal(f.check('before','flowers'),'native-garden-plots-unreviewed');
});
test('garden eligibility rejects unreviewed receiving branches, event overrides and malformed plot state',()=>{
  for(const change of [v=>v.exposed=1,v=>v.mason_pond=3,v=>v.orphan_hope=-10,v=>v.robin.autoWater=true,
    v=>v.phase=1,v=>v.rngOverride=81,v=>v.plants_known=null]){
    const f=fixture();change(f.v);assert.equal(f.check('before','garden'),'native-garden-branch-unreviewed');
  }
  const f=fixture();assert.equal(f.check('other','garden'),'native-garden-phase-unavailable');
  assert.equal(f.check('before','unknown'),'native-garden-activity-unavailable');
  f.v.tendingvars.harvest=true;assert.equal(f.check('before','flowers'),'native-garden-plots-unreviewed');
  delete f.v.tendingvars.harvest;f.window.C.npc.Robin.init=1;
  assert.equal(f.check('after','garden'),'native-garden-branch-unreviewed');
});
test('native till branch permits reviewed morning soil progress while rejecting planted beds, unknown menus and exhaustion',()=>{
  const f=fixture();delete f.v.garden_flowers_intro;
  f.v.plots.garden=Array.from({length:3},()=>({plant:'none',stage:0,days:0,water:0,till:0,bed:'earth',quality:1,size:'small'}));
  Object.assign(f.v,{physique:5000,physiquesize:10000,tiredness:40,worn:{upper:{type:[]},lower:{type:[]},feet:{type:[]}},plants_known:['daisy']});
  f.window.Time.season='autumn';f.window.SugarCube.Scripting={evalJavaScript:()=>({foodstuff:{daisy:{tending:{planting_bed:'earth',seasons:['autumn']}}}})};
  assert.equal(f.check('before','till'),undefined);f.window.Time.hour=8;f.v.plots.garden[0].till=1;
  assert.equal(f.check('after','till'),undefined);assert.equal(f.check('before','flowers'),undefined);
  f.v.plants_known.push('unknown');assert.equal(f.check('after','till'),'native-garden-seeds-menu-unreviewed');f.v.plants_known.pop();
  f.v.tiredness=1000;assert.equal(f.check('before','till'),'native-garden-till-branch-unreviewed');f.v.tiredness=40;
  f.v.plots.garden[0].stage=1;assert.equal(f.check('after','till'),'native-garden-plots-unreviewed');
});
test('seed refresh binds finite native requirement identities and source without invoking them',()=>{
  let calls=0;const requirement=()=>{calls++;return false};
  const setup={specialClothes:[{name:'daisy',sets:['flowers'],requirements:requirement}],specialClothesSets:{flowers:{}}};
  const collect=vm.runInNewContext('('+collectSeedRequirements.toString()+')',{window:{SugarCube:{Scripting:{evalJavaScript:()=>setup}}}});
  const before=collect();assert.equal(calls,0);assert.equal(sameSeedRequirements(before,collect()),true);
  setup.specialClothes[0].requirements=vm.runInNewContext('('+requirement.toString()+')');
  assert.equal(sameSeedRequirements(before,collect()),false);assert.equal(calls,0);
  setup.specialClothes[0].requirements=requirement;setup.specialClothes[0].sets.push('new-group');
  assert.equal(sameSeedRequirements(before,collect()),false);
  setup.specialClothes[0].requirements={};assert.throws(collect,/requirement unavailable/);
  setup.specialClothes=Array(257);assert.throws(collect,/bound/);
});
test('seed discovery keeps original knowledge direction, reviewed plots and automatic head-wear boundary',()=>{
  const f=fixture();delete f.v.garden_flowers_intro;
  f.v.plots.garden=Array.from({length:3},()=>({plant:'none',stage:0,days:0,water:0,till:0,bed:'earth',quality:1,size:'small'}));
  f.v.worn={head:{name:'hairpin'}};f.v.specialClothes=[{name:'daisy',unlocked:0}];
  assert.equal(f.check('before','seeds'),undefined);
  assert.equal(f.check('after','seeds'),'native-garden-seed-branch-unreviewed');
  f.v.plants_known.push('daisy');f.v.specialClothes[0].unlocked=3;
  assert.equal(f.check('after','seeds'),undefined);
  assert.equal(f.check('before','seeds'),'native-garden-seed-branch-unreviewed');
  f.v.worn.head.name='naked';assert.equal(f.check('after','seeds'),'native-garden-seed-branch-unreviewed');
});
