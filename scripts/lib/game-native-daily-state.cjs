'use strict';

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
module.exports={checkDaily};
