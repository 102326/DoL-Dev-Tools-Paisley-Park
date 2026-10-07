'use strict';

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
module.exports={checkHall};
