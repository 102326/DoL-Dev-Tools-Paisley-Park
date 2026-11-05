'use strict';
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
module.exports={checkStreet};
