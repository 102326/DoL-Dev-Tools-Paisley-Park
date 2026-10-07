'use strict';
// Used only after the native shop producer has bound the original control,
// business sources and quote. Rendering timers are not a purchase witness.
function operation(node,config,readCurrent,checkSources){
  const {namespace,binding,attemptId,quote,before}=config,context=window[namespace],sc=window.SugarCube;
  const root=document.querySelector('#passages > .passage'),list=document.querySelector('#clothes-list');
  const state=sc?.State,active=state?.activeIndex,history=state?.history,entry=history?.[active];
  if(!context||context.nonce!==binding.contextNonce||!context.records||Object.hasOwn(context.records,attemptId)||Object.keys(context.records).length>=64||
     !root||!list||!root.contains(node)||!root.contains(list)||!node.isConnected||state.passage!=='Clothing Shop'||
     !Number.isSafeInteger(active)||active<0||!Array.isArray(history)||entry?.title!=='Clothing Shop'||
     checkSources('before')!==undefined||JSON.stringify(readCurrent())!==JSON.stringify(before))return {ok:false,guardRejected:true};
  const v=quote?.variant,validVariant=v&&v.slot==='head'&&['hairpin','beanie'].includes(v.variable)&&
    typeof v.colour==='string'&&!['random','custom'].includes(v.colour)&&typeof v.accessoryColour==='string'&&!['random','custom'].includes(v.accessoryColour);
  if(!validVariant||!Number.isSafeInteger(quote.unitCost)||quote.unitCost<=0||quote.unitCost>quote.baselineMoney||
     quote.baselineCount!==0||quote.baselineWornCount!==0||before.money!==quote.baselineMoney||before.count!==0||before.wornCount!==0||
     !Number.isSafeInteger(before.clock)||!Array.isArray(before.inventory)||before.inventory.length>511||!before.stats||
     ['spent','spentCount','earned','earnedCount'].some(k=>!Number.isSafeInteger(before.stats[k])||before.stats[k]<0)||
     before.quantity!==1||before.destination!=='wardrobe'||before.cost!==quote.unitCost||
     JSON.stringify(before.variant)!==JSON.stringify(v))return {ok:false,guardRejected:true};
  const moment=Object.getOwnPropertyDescriptor(window,'updateMoment');
  if(!moment||typeof moment.value!=='function'||moment.writable!==true||moment.configurable!==true)return {ok:false,guardRejected:true};
  const started=Object.freeze({...binding,attemptId,status:'started',phase:'business-started',before});
  context.records[attemptId]=started;
  let calls=0,threw=false,restored=false,installed=false;
  const observed=function(...args){
    if(++calls!==1||args.length!==0)throw Error('Unexpected original shop moment update');
    const result=Reflect.apply(moment.value,this,args);if(result!==undefined)throw Error('Unexpected shop moment result');return result;
  };
  try{Object.defineProperty(window,'updateMoment',{...moment,value:observed});installed=true;node.click()}
  catch{threw=true}
  finally{if(installed){const now=Object.getOwnPropertyDescriptor(window,'updateMoment');
    if(now?.value===observed&&now.writable===moment.writable&&now.configurable===moment.configurable&&now.enumerable===moment.enumerable){
      try{Object.defineProperty(window,'updateMoment',moment);restored=true}catch{threw=true}
    }
  }}
  if(threw||!restored||calls!==1)return {ok:false};
  const after=readCurrent(),last=Object.getOwnPropertyDescriptor(window,'updateMoment'),saved=entry.variables;
  const unchangedInventory=after?.inventory?.length===before.inventory.length+1&&
    before.inventory.every((item,i)=>JSON.stringify(item)===JSON.stringify(after.inventory[i]));
  const purchased=after?.inventory?.at(-1),matches=purchased&&purchased.variable===v.variable&&(purchased.colour??null)===v.colour&&
    (purchased.accessory_colour??null)===v.accessoryColour&&(purchased.modder??null)===v.modder&&purchased.pattern==null;
  if(!after?.stats||window.SugarCube!==sc||window[namespace]!==context||state.passage!=='Clothing Shop'||state.turns!==before.turns||
     state.activeIndex!==active||state.history!==history||history[active]!==entry||entry.title!=='Clothing Shop'||
     document.querySelectorAll('#passages > .passage').length!==1||document.querySelector('#passages > .passage')!==root||!root.isConnected||
     document.querySelectorAll('#clothes-list').length!==1||document.querySelector('#clothes-list')!==list||!root.contains(list)||root.querySelector('.error')||
     !last||last.value!==moment.value||last.writable!==moment.writable||last.configurable!==moment.configurable||last.enumerable!==moment.enumerable||
     after.turns!==before.turns||after.time!==before.time||after.money!==before.money-quote.unitCost||after.count!==1||after.wornCount!==0||
     JSON.stringify(after.worn)!==JSON.stringify(before.worn)||!unchangedInventory||!matches||
     after.stats.spent!==before.stats.spent+quote.unitCost||after.stats.spentCount!==before.stats.spentCount+1||
     after.clock!==before.clock||after.stats.earned!==before.stats.earned||after.stats.earnedCount!==before.stats.earnedCount||after.stats.spentTimeStamp!==before.clock||
     saved?.money!==after.money||saved?.timeStamp!==after.time||JSON.stringify(saved?.wardrobe?.head)!==JSON.stringify(after.inventory)||
     JSON.stringify(saved?.worn?.head)!==JSON.stringify(after.worn)||JSON.stringify(saved?.moneyStats?.clothes)!==JSON.stringify(after.stats)||
     checkSources('after')!==undefined)return {ok:false};
  const evidence={kind:'purchase',variant:v,beforeMoney:before.money,afterMoney:after.money,beforeCount:0,afterCount:1,beforeWornCount:0,afterWornCount:0,
    turns:before.turns,contextNonce:binding.contextNonce};
  const receipt=Object.freeze({...binding,attemptId,status:'terminal',outcome:'occurred',remoteClosed:true,spent:quote.unitCost,evidence});
  context.records[attemptId]=receipt;return {ok:true,receipt};
}
module.exports={operation};
