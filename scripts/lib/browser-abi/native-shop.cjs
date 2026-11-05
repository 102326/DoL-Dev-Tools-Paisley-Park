'use strict';
// Original function text participates in native shop contracts. Keep LF unchanged.
function branch(phase,allowSave=false){
  const s=window.SugarCube?.State,v=s?.variables,t=s?.temporary;
  if(typeof window.DoLGameUI!=='undefined'||s?.passage!=='Clothing Shop'||v?.shopName!=='clothing'||v.clothingShopSlot!=='head'||
     v.combat!==0||!allowSave&&(v.options?.autosaveDisabled!==true||v.ironmanmode===true)||v.tryOn?.value!==0)return 'native-shop-environment-unavailable';
  if(phase==='before'){
    const item=window.setup.clothes.head[v.clothes_choice],stored=v.tryOn.ownedStored?.head;
    if(!item||!['hairpin','beanie'].includes(item.variable)||item.outfitPrimary!==undefined||item.outfitSecondary!==undefined||item.hoodposition!==undefined||
       !item.accessory_colour_sidebar||v.tryOn.tryingOn?.head!==null||v.tryOn.showUnderEquip?.head!=null||v.tryOn.showEquip?.head!=null||
       stored!==null&&JSON.stringify(stored)!==JSON.stringify(v.worn.head)||v.shopDefaults?.disableReturn!==false||
       t.realSlot!=='head'||t.realIndex!==v.clothes_choice||t.temp_choice?.variable!==item.variable)return 'native-shop-reset-or-selection-unavailable';
  }
}
function readCurrent(quote,clock){
  const s=window.SugarCube.State,v=s.variables,list=v.wardrobe.head,worn=v.worn.head,a=quote.variant;
  if(!Array.isArray(list)||list.length>512||!worn||!Number.isSafeInteger(v.money)||!Number.isSafeInteger(clock))throw Error('Native purchase state unavailable');
  const matches=i=>i?.variable===a.variable&&(i.colour??null)===a.colour&&(i.accessory_colour??null)===a.accessoryColour&&(i.modder??null)===a.modder&&i.pattern==null;
  const result={variant:a,turns:s.turns,time:v.timeStamp,clock,money:v.money,count:list.filter(matches).length,wornCount:matches(worn)?1:0,
    inventory:list,worn,stats:v.moneyStats?.clothes??{earned:0,earnedCount:0,spent:0,spentCount:0},quantity:v.buyMultiple,destination:v.wardrobes.shopReturn,cost:quote.unitCost};
  const json=JSON.stringify(result);if(new TextEncoder().encode(json).length>65536)throw Error('Native purchase state bound');return JSON.parse(json);
}
function dateGetterOf(time){
  for(let owner=time,i=0;owner&&i<4;owner=Object.getPrototypeOf(owner),i++){
    const d=Object.getOwnPropertyDescriptor(owner,'date');if(d)return d.get;
  }
}
function sourceCheck(bundle,time,dateGetter){
  const reason=checkBindings(bundle);if(reason!==undefined)return reason;
  const addon=window.modSC2DataManager?.sc2EventTracer?.callback?.[0]?.addonPluginTable?.find(r=>r.modName==='DoLTimeWrapperAddon')?.hookPoint?.timeWrapperAddon;
  if(addon?._timeProxyManager?.originTime!==time||dateGetterOf(time)!==dateGetter||
     Function.prototype.toString.call(dateGetter)!=='get date() {\n\t\t\treturn currentDate;\n\t\t}')return 'native-shop-clock-owner-changed';
}
module.exports={branch,readCurrent,dateGetterOf,sourceCheck};
