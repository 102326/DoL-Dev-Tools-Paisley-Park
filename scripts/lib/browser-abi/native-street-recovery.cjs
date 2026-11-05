// Frozen source used by native execution and legacy binding contracts.
function readClosed(name,effect){
 const binding=effect.executionBinding,context=window[name],r=context?.records?.[effect.id],s=window.SugarCube?.State,c=window.SugarCube?.Config?.history;
 const d=r?.diagnostics,h=s?.history,x=s?.expired,root=document.querySelectorAll('#passages > .passage');
 if(context?.nonce!==binding.contextNonce||!r||r.status!=='started'||r.attemptId!==effect.id||!Object.isFrozen(r)||!Object.isFrozen(d)||
  ['provider','contract','contextNonce','requestDigest'].some(k=>r[k]!==binding[k])||d.reason!=='native-environment-changed'||
  d.phases!==5||d.footerCalls!==1||d.addonPending!==0||d.addonFulfilled!==5||d.addonRejected!==0||d.observersRestored!==true||d.historyCreated!==true||
  !Array.isArray(h)||!Array.isArray(x)||!Number.isSafeInteger(c?.maxStates)||c.maxStates<2||c.maxStates>128||
  !Number.isSafeInteger(c.maxExpired)||c.maxExpired<1||c.maxExpired>1024||x.length>=c.maxExpired||h.length<2||h.length>c.maxStates||
  s.activeIndex!==h.length-1||s.turns!==h.length+x.length||s.passage!=='Domus Street'||root.length!==1||
  root[0].getAttribute('data-passage')!==s.passage||root[0].querySelector('.error')||!window.SugarCube.Engine.isIdle())return null;
 const previous=h.at(-2),current=h.at(-1),v=s.variables,p=previous?.variables,a=current?.variables;
 // SugarCube creates the moment before rendering. Its saved tutorial/NPCList
 // are the incoming state; source-reviewed rendering updates active variables.
 if(previous?.title!=='Orphanage'||current?.title!==s.passage||p?.tutorial!==0||a?.tutorial!==0||v.tutorial!==1||
  !Number.isFinite(p.timeStamp)||a.timeStamp!==p.timeStamp+60||v.timeStamp!==a.timeStamp||!Number.isSafeInteger(p.money)||p.money<0||a.money!==p.money||v.money!==p.money||
  !Array.isArray(p.NPCList)||p.NPCList.length!==6||!Array.isArray(a.NPCList)||a.NPCList.length!==6||
  JSON.stringify(a.NPCList)!==JSON.stringify(p.NPCList)||a.npc?.length!==0||!Array.isArray(v.NPCList)||v.NPCList.length!==6||v.npc?.length!==0||
  v.options?.autosaveDisabled!==true||v.ironmanmode!==false)return null;
 const before={passage:'Orphanage',turns:s.turns-1,time:p.timeStamp,money:p.money},H=Math.min(before.turns,c.maxStates),E=before.turns-H;
 if(E<0||h.length!==Math.min(H+1,c.maxStates)||x.length!==E+Math.max(0,H+1-c.maxStates))return null;
 return {before,after:{turns:s.turns,time:v.timeStamp,money:v.money},history:{historyBefore:H,historyAfter:h.length,expiredBefore:E,expiredAfter:x.length,maxStates:c.maxStates,maxExpired:c.maxExpired,newMoment:true}};
}
module.exports={readClosed};
