'use strict';
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
module.exports={checkHour};
