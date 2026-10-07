const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {checkStreet}=require('../scripts/lib/game-native-street-state.cjs');
function fixture(phase){
 const v={location:phase==='before'?'home':'town',tutorial:phase==='before'?0:1,outside:1,bus:'domus',debug:0,exposed:0,
  arousal:0,arousalmax:10000,stress:0,stressmax:10000,wraith:{state:''},kylar:{timer:{street:0}},npc:[],per_npc:{},
  NPCList:Array.from({length:6},(_,index)=>({index,type:'human',pronoun:'m'}))};
 const window={SugarCube:{State:{passage:phase==='before'?'Orphanage':'Domus Street',variables:v}},Time:{days:0,hour:9,month:9},C:{npc:{Kylar:{init:0,state:''}}}};
 const check=()=>vm.runInNewContext(`(${checkStreet.toString()})(${JSON.stringify(phase)})`,{window});return {window,v,check};
}
test('first street envelope accepts the original teaching transition and rejects unreviewed branches',()=>{
 for(const phase of ['before','after']){
  assert.equal(fixture(phase).check(),undefined);
  for(const hour of [7,8,11]){const f=fixture(phase);f.window.Time.hour=hour;assert.equal(f.check(),undefined);}
  for(const mutate of [f=>f.v.tutorial=2,f=>f.v.exposed=1,f=>f.v.arousal=10000,f=>f.v.stress=10000,f=>f.v.wraith.state='haunt',
   f=>f.v.wraith.hunt=1,f=>f.window.C.npc.Kylar.state='active',f=>f.v.kylar.timer.street=10,f=>f.v.kylarwatched=1,
   f=>f.v.npc.push({}),f=>f.v.NPCList.pop(),f=>f.v.per_npc.other={},f=>f.v.debug=1,f=>f.v.rngOverride=10,f=>f.v.combat=1,f=>f.v.nextPassageCheck='Other',
   f=>f.window.Time.days=1,f=>f.window.Time.hour=6,f=>f.window.Time.hour=12,f=>f.window.Time.hour=18,f=>f.v.location='forest',f=>f.window.SugarCube.State.passage='Other']){
   const f=fixture(phase);mutate(f);assert.notEqual(f.check(),undefined);
  }
 }
 for(const mutate of [f=>f.v.NPCList[0].index=1,f=>f.v.NPCList[0].type='other',f=>f.v.NPCList[0].pronoun='other']){
  const f=fixture('after');mutate(f);assert.equal(f.check(),'native-first-street-person-unavailable');
 }
});
