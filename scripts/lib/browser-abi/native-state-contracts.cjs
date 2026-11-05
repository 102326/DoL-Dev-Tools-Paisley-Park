'use strict';
// Original finite receiving guards. Their text is part of native environment contracts; preserve LF.

// game-native-daily-state


// Finite first-day Provider evidence, independent of optional UI integrations.
// These gates describe this receiving contract, not the Runtime's world model.
function checkDaily(phase,activity) {
  const s=window.SugarCube.State,v=s.variables,t=window.Time;
  if(phase!=='before'&&phase!=='after')return 'native-daily-phase-unavailable';
  if(t.days!==0||t.hour!==7||v.location!=='home'||
     !Number.isFinite(v.stress)||!Number.isFinite(v.stressmax)||v.stress>=v.stressmax||
     v.leftarm==='bound'&&v.rightarm==='bound'||v.possessed||v.passout||v.combat||v.replayScene||
     v.passageOverride||v.nextPassageCheck||v.debug!==0||v.rngOverride!==undefined||v.eventPoolOverride!==undefined)
    return 'native-daily-branch-unreviewed';
  if(activity==='bathroom'||activity==='continued'){
    if(window.C?.npc?.Robin?.init!==0||v.pblevel!==1||v.pbstrip!==0||v.pblevelballs!==1||
       v.pregnancyTest!==undefined&&v.pregnancyTest!==0||v.makeup?.owned?.hairdye?.length!==0)
      return 'native-bathroom-branch-unreviewed';
    if(activity==='continued'&&(v.dancing!==0||v.worn?.neck?.name==='familiar collar'||
       !Array.isArray(v.npc)||v.npc.length!==0||!v.per_npc||Object.keys(v.per_npc).length!==0||
       !Array.isArray(v.NPCList)||v.NPCList.length!==6||v.endeventerror!==undefined))
      return 'native-daily-cleanup-unreviewed';
  }else if(activity!=='brush')return 'native-daily-activity-unavailable';
  // The normal first-day pool remains random. No event is forced, and its text
  // and NPC/temporary changes are not required to match the pre-action scene.
  if(activity==='brush'&&phase==='after'&&v.bathroomExit!=='Bathroom')return 'native-daily-return-unavailable';
}

// game-native-garden-state


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

// game-native-hall-state


// Provider acceptance for the reviewed native first-day event envelope.
// It limits this Outcome producer, never the Runtime's Gameplay policy.
function checkHall(phase, eventContinue=false) {
  const s=window.SugarCube.State,v=s.variables,t=window.Time,r=window.C?.npc?.Robin;
  const carried=v.carried?.handheld,worn=v.worn?.handheld;
  const clothes=window.SugarCube.Scripting.evalJavaScript('setup').clothes.handheld;
  // kitchenExit restores the empty handheld slot through the original widget.
  // Other inventory transitions need their own effect evidence.
  if(v.location!=='home'||carried?.name!=='naked'||carried.variable!=='naked'||carried.outfitSecondary!==undefined||
     worn?.name!=='naked'||worn.variable!=='naked'||
     clothes.findIndex(item=>item.variable===worn.variable&&item.modder===worn.modder)!==0)
    return 'native-hall-handheld-unreviewed';
  if(t.days!==0||!Number.isInteger(t.hour)||t.hour<7||t.hour>11||t.month>=10||r?.init!==0||
    !Number.isFinite(v.stress)||!Number.isFinite(v.stressmax)||v.stress>=v.stressmax||
    v.exposed!==0||v.worn?.upper?.name==='large towel'||v.baileyReunionScene==='dungeon'||
    !Number.isFinite(v.hoursGoneFromHome)||v.hoursGoneFromHome>=168||v.robinmissing!==0||
    v.loft_whitney===1||v.loft_whitney===2||!Number.isFinite(v.renttime)||v.renttime<=0||
    v.babyIntros?.Bailey?.length||v.christmas===1||v.halloween===1||v.valentines===1||
    v.auriga_artefact!==undefined||v.debug!==0||v.rngOverride!==undefined||
    v.avery_mansion||v.fromRobinRoom||v.robin_abandoned||v.robinReunionScene)
    return 'native-hall-branch-unreviewed';
  if(eventContinue){
    if(phase!=='before'&&phase!=='after')return 'native-hall-phase-unavailable';
    if(v.daily?.homeEvent!==1||!Number.isSafeInteger(v.rng)||v.dancing!==0||v.worn.neck?.name==='familiar collar'||
       !Array.isArray(v.npc)||v.npc.length!==0||!v.per_npc||Object.keys(v.per_npc).length!==0||
       !Array.isArray(v.NPCList)||v.NPCList.length!==6||v.endeventerror!==undefined)
      return 'native-hall-cleanup-unreviewed';
    return;
  }
  if(phase==='before') {
    if(v.daily?.homeEvent===1||!Number.isFinite(v.home_event_timer)||v.home_event_timer<=0||
      v.orphan_hope!==0||v.orphan_reb!==0||v.loft_wren>=2||v.loft_gh>=2||v.loft_whitney>=6||
      v.loft_kylar||v.chef_speech==='bailey'||v.loft_river||v.mason_pond>=5||v.alex_greenhouse>=3)
      return 'native-hall-event-unreviewed';
  } else if(phase==='after') {
    // All fourteen original normal events remain eligible. Do not pin RNG or
    // require the pre-event hope/rebellion/NPC values to remain unchanged.
    if(v.daily?.homeEvent!==1||!Number.isSafeInteger(v.rng)||
      !Number.isFinite(v.orphan_hope)||!Number.isFinite(v.orphan_reb))
      return 'native-hall-event-result-unavailable';
  } else return 'native-hall-phase-unavailable';
}

// game-native-hour-state

// First representative hourly branch. These limits belong to the local
// receiver contract, not the Runtime's goals or Gameplay autonomy policy.
function checkHour(phase){
  const v=window.SugarCube.State.variables,t=window.Time;
  if(!['before','after'].includes(phase)||t.days!==0||!Number.isInteger(t.hour)||t.hour<(phase==='before'?7:8)||t.hour>(phase==='before'?10:11)||
     v.statFreeze||v.combat||v.possessed||v.passout||v.innocencestate===1||v.debug!==0||v.rngOverride!==undefined||
     v.eventPoolOverride!==undefined||window.C?.npc?.Sydney?.init!==0||v.player?.penisExist!==false||
     v.player.vaginaExist!==true||!Number.isFinite(v.cow)||v.cow>=6||v.parasite?.nipples?.name||
     v.earSlime?.growth!==0||v.earSlime.defyCooldown!==0||v.kylarwatched||v.wolfpatrolsent||
     v.avery_mansion||v.robinPillory?.active||v.robinbed||v.pillory?.tenant?.exists!==0||
     v.per_npc?.pubfame_receptionist||v.per_npc?.pubfame_nurse||
     !Array.isArray(v.pregnancies)||v.pregnancies.length||
     v.pendingPregnancies?.vagina!==null||v.pendingPregnancies?.anus!==null||
     !Array.isArray(v.cumLoads?.vagina)||v.cumLoads.vagina.length||!Array.isArray(v.cumLoads.anus)||v.cumLoads.anus.length||
     !Array.isArray(v.sexStats?.vagina?.pregnancy?.fetus)||v.sexStats.vagina.pregnancy.fetus.length||
     !Array.isArray(v.sexStats?.anus?.pregnancy?.fetus)||v.sexStats.anus.pregnancy.fetus.length||
     v.milkFullPain||!Number.isFinite(v.milk_volume)||v.milk_volume<0||
     !Array.isArray(v.trackedArousal)||v.trackedArousal.length>512||v.trackedArousal.some(x=>!Number.isFinite(x)))
    return 'native-hour-branch-unreviewed';
}

// game-native-street-state

// Finite first-day receiving branch; ordinary Gameplay policy remains dynamic.
function checkStreet(phase){
 const s=window.SugarCube.State,v=s.variables,t=window.Time,k=window.C?.npc?.Kylar;
 // The original tutorial branch precedes ordinary hour-specific NPC offers;
 // first-day 07:00/08:00 therefore uses the same receiving business branch.
 if(!['before','after'].includes(phase)||t.days!==0||!Number.isInteger(t.hour)||t.hour<7||t.hour>11||t.month!==9||
  v.debug!==0||v.rngOverride!==undefined||v.possessed||v.passout||v.combat||v.replayScene||v.passageOverride||v.nextPassageCheck||
  v.exposed!==0||!Number.isFinite(v.arousal)||!Number.isFinite(v.arousalmax)||v.arousal>=v.arousalmax||
  !Number.isFinite(v.stress)||!Number.isFinite(v.stressmax)||v.stress>=v.stressmax||
  v.wraith?.state!==''||![undefined,0].includes(v.wraith.hunt)||k?.init!==0||k.state!==''||v.kylar?.timer?.street!==0||
  ![undefined,0].includes(v.kylarwatched)||!Array.isArray(v.npc)||v.npc.length!==0||
  !v.per_npc||Object.keys(v.per_npc).length!==0||!Array.isArray(v.NPCList)||v.NPCList.length!==6)
  return 'native-first-street-branch-unreviewed';
 if(phase==='before'?(s.passage!=='Orphanage'||v.location!=='home'||v.tutorial!==0):
  (s.passage!=='Domus Street'||v.location!=='town'||v.outside!==1||v.bus!=='domus'||v.tutorial!==1))
  return 'native-first-street-result-unavailable';
 // generateNPC populates the persistent NPCList slot; combat's active npc
 // array remains empty until the later original tutorial action.
 if(phase==='after'&&(v.NPCList[0]?.index!==0||v.NPCList[0]?.type!=='human'||!['m','f'].includes(v.NPCList[0]?.pronoun)))
  return 'native-first-street-person-unavailable';
}
module.exports={checkDaily,checkGarden,collectSeedRequirements,sameSeedRequirements,checkHall,checkHour,checkStreet};
