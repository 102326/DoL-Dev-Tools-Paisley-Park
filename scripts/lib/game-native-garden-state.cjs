'use strict';

// Acceptance of this first-day receiving envelope, not a Gameplay policy.
function checkGarden(phase,activity) {
  const s=window.SugarCube.State,v=s.variables,t=window.Time;
  if(!['before','after'].includes(phase))return 'native-garden-phase-unavailable';
  if(t.days!==0||!Number.isInteger(t.hour)||t.hour<7||t.hour>11||v.location!=='home'||window.C?.npc?.Robin?.init!==0||
     !Number.isFinite(v.stress)||!Number.isFinite(v.stressmax)||v.stress>=v.stressmax||v.exposed!==0||
     v.possessed||v.passout||v.combat||v.replayScene||v.passageOverride||v.nextPassageCheck||v.debug!==0||
     v.rngOverride!==undefined||v.eventPoolOverride!==undefined||v.mason_pond!==undefined&&v.mason_pond!==0||
     v.alex_greenhouse!==undefined&&v.alex_greenhouse!==0||v.loft_wren!==undefined&&v.loft_wren!==0||
     v.robinpaid!==undefined&&v.robinpaid!==0||!Number.isFinite(v.orphan_hope)||v.orphan_hope<=-10||
     v.phase!==0||v.phase2!==0||v.robin?.autoWater||
     !Array.isArray(v.plants_known)||v.plants_known.length>512)
    return 'native-garden-branch-unreviewed';
  if(!['garden','flowers','seeds','till'].includes(activity))return 'native-garden-activity-unavailable';
  if(activity==='garden'){
    if(s.passage==='Garden Flowers'&&(v.dancing!==0||v.worn?.neck?.name==='familiar collar'||
       !Array.isArray(v.npc)||v.npc.length!==0||!v.per_npc||Object.keys(v.per_npc).length||
       !Array.isArray(v.NPCList)||v.NPCList.length!==6||v.endeventerror!==undefined))return 'native-garden-cleanup-unreviewed';
    return;
  }
  if(!v.tendingvars||Object.keys(v.tendingvars).length||v.fertiliser?.current!==0||v.fertiliser.used!==0||
     !Number.isFinite(v.tending)||v.tending<0||v.leftarm==='bound'&&v.rightarm==='bound')return 'native-garden-plots-unreviewed';
  const plots=v.plots?.garden;
  if(activity==='flowers'&&phase==='before'&&v.garden_flowers_intro===1&&plots===undefined)return;
  if(v.garden_flowers_intro!==undefined&&v.garden_flowers_intro!==0||!Array.isArray(plots)||plots.length!==3||
     plots.some(p=>!p||p.plant!=='none'||p.stage!==0||p.days!==0||p.water!==0||![0,1].includes(p.till)||
       p.bed!=='earth'||p.quality!==1||p.size!=='small'))return 'native-garden-plots-unreviewed';
  if(plots.some(p=>p.till===1)){
    const daisy=window.SugarCube.Scripting.evalJavaScript('setup').foodstuff.daisy;
    if(v.plants_known.length!==1||v.plants_known[0]!=='daisy'||daisy?.tending?.planting_bed!=='earth'||
       !Array.isArray(daisy.tending.seasons)||!daisy.tending.seasons.includes(t.season))return 'native-garden-seeds-menu-unreviewed';
  }
  if(activity==='till'&&(v.statFreeze||!Number.isFinite(v.tending)||v.tending<0||v.tending>=200||
     !Number.isFinite(v.physique)||!Number.isFinite(v.physiquesize)||v.physique<0||v.physique+60>v.physiquesize||
     !Number.isFinite(v.tiredness)||v.tiredness<0||v.tiredness>=1000||
     v.worn?.upper?.type?.includes('heavy')||v.worn?.lower?.type?.includes('heavy')||v.worn?.feet?.type?.includes('heels')))
    return 'native-garden-till-branch-unreviewed';
  if(activity==='seeds'&&(typeof v.worn?.head?.name!=='string'||v.worn.head.name==='naked'||v.forest_shop_intro===1||
     !Array.isArray(v.specialClothes)||v.specialClothes.length>256||
     v.specialClothes.some(c=>!c||typeof c.name!=='string'||!Number.isSafeInteger(c.unlocked)||c.unlocked<0||c.unlocked>3)||
     (phase==='before'?v.plants_known.includes('daisy'):!v.plants_known.includes('daisy'))))return 'native-garden-seed-branch-unreviewed';
}
// Native seed discovery also refreshes original special-item unlocks. Inspect
// the finite requirement family without calling any requirement or game helper.
function collectSeedRequirements(){
  const setup=window.SugarCube.Scripting.evalJavaScript('setup');
  if(!Array.isArray(setup.specialClothes)||setup.specialClothes.length>256||!setup.specialClothesSets||
     Object.keys(setup.specialClothesSets).length>64)throw Error('Native seed requirements bound');
  const entry=(name,value,sets)=>{
    if(typeof name!=='string'||name.length>128||value!==undefined&&typeof value!=='function'||
       sets!==undefined&&(!Array.isArray(sets)||sets.length>16||sets.some(s=>typeof s!=='string'||s.length>128)))throw Error('Native seed requirement unavailable');
    const source=typeof value==='function'?Function.prototype.toString.call(value):null;
    if(source!==null&&source.length>1024)throw Error('Native seed requirement source bound');
    return Object.freeze({name,...(sets===undefined?{}:{sets:JSON.stringify(sets)}),value,source});
  };
  return Object.freeze({items:Object.freeze(setup.specialClothes.map(v=>entry(v.name,v.requirements,v.sets))),
    sets:Object.freeze(Object.entries(setup.specialClothesSets).map(([name,v])=>entry(name,v.requirements)))});
}
function sameSeedRequirements(a,b){
  return ['items','sets'].every(k=>a[k].length===b[k].length&&a[k].every((v,i)=>{
    const current=b[k][i];return v.name===current.name&&v.sets===current.sets&&v.value===current.value&&v.source===current.source;
  }));
}
module.exports={checkGarden,collectSeedRequirements,sameSeedRequirements};
