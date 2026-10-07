'use strict';
// One original partial menu refresh. It certifies neither a purchase nor a
// complete activity, and never edits game state to manufacture the expected view.
function preflight(node,config,readCurrent,checkSources){
  const context=window[config.namespace],s=window.SugarCube?.State,roots=document.querySelectorAll('#passages > .passage');
  if(context?.version!==1||context.nonce!==config.binding.contextNonce||!context.records||Object.getPrototypeOf(context.records)!==null||
     !Object.isExtensible(context.records)||Object.hasOwn(context.records,config.attemptId)||Object.keys(context.records).length>=64||
     roots.length!==1||!roots[0].contains(node)||!node.isConnected||typeof node.click!=='function'||s?.passage!=='Clothing Shop'||
     checkSources('before')!==undefined||JSON.stringify(readCurrent())!==JSON.stringify(config.before))return 'shop-menu-preflight-unavailable';
  return null;
}
function operation(node,config,readCurrent,checkSources,check=preflight){
  if(check(node,config,readCurrent,checkSources)!==null)return {ok:false,guardRejected:true};
  const sc=window.SugarCube,s=sc.State,context=window[config.namespace],root=document.querySelector('#passages > .passage'),container=document.querySelector('#clothingShop-div');
  const active=s.active,history=s.history,entry=history[s.activeIndex],index=s.activeIndex,before=config.before;
  const started=Object.freeze({...config.binding,attemptId:config.attemptId,status:'started',phase:'menu-started'});
  context.records[config.attemptId]=started;
  try{node.click()}catch{return {ok:false}}
  const after=readCurrent(),expected=config.expectedView??(before.view==='item'?'catalogue':'main');
  if(window.SugarCube!==sc||sc.State!==s||s.active!==active||s.history!==history||s.activeIndex!==index||history[index]!==entry||
     window[config.namespace]!==context||context.records[config.attemptId]!==started||
     document.querySelectorAll('#passages > .passage').length!==1||document.querySelector('#passages > .passage')!==root||
     document.querySelectorAll('#clothingShop-div').length!==1||document.querySelector('#clothingShop-div')!==container||!container?.isConnected||
     node.isConnected||root.querySelector('.error')||!sc.Engine.isIdle()||after.view!==expected||after.choice!==(config.expectedChoice??null)||config.browse&&after.slot!==config.expectedSlot||
     after.passage!==before.passage||after.turns!==before.turns||after.time!==before.time||after.money!==before.money||
     JSON.stringify(after.inventory)!==JSON.stringify(before.inventory)||JSON.stringify(after.worn)!==JSON.stringify(before.worn)||checkSources('after')!==undefined)return {ok:false};
  const evidence={kind:'shop-menu',from:before.view,to:after.view,turns:after.turns,time:after.time,money:after.money,businessStable:true};
  const receipt=Object.freeze({...config.binding,attemptId:config.attemptId,status:'terminal',outcome:'occurred',remoteClosed:true,spent:0,evidence});
  context.records[config.attemptId]=receipt;return {ok:true,receipt};
}
module.exports={preflight,operation};
