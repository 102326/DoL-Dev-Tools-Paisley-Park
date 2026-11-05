'use strict';
// Existing shop reader source participates in contract guards. Preserve LF.
function reader(goal,costFunction) {
  const s=window.SugarCube?.State,v=s?.variables,t=s?.temporary,roots=document.querySelectorAll('#passages > .passage');
  const no=reason=>({status:'unsupported',reason,source:'original DoL selected shop state'});
  if(s?.passage!=='Clothing Shop' || roots.length!==1 || roots[0].getAttribute('data-passage')!==s.passage || v?.clothingShopSlot!=='head' ||
     !Number.isSafeInteger(v.clothes_choice) || v.clothes_choice<1 || t?.realSlot!=='head' || t.realIndex!==v.clothes_choice || v.tryOn?.value!==0)
    return no('verified-simple-head-shop-unavailable');
  const item=window.setup?.clothes?.head?.[v.clothes_choice],temp=t.temp_choice;
  const simple=i=>!!i && typeof i==='object' && !Array.isArray(i) && typeof i.variable==='string' && !i.cursed && i.outfitPrimary===undefined && i.outfitSecondary===undefined && !i.colourCustom && !i.accessory_colourCustom && !i.pattern_options?.length;
  // The original clothesIndex can repair mismatches by writing into its input.
  // Exclude that branch before asking the price reader for a quote.
  const definitions=window.setup?.clothes?.head;
  if(!simple(item)||!simple(temp)||typeof temp.name!=='string'||!temp.name||temp.name.length>128||item.name!==temp.name||item.modder!==temp.modder||
     item.variable!==temp.variable||item.index!==temp.index||item.index!==v.clothes_choice||item.slot!=='head'||!Array.isArray(definitions)||definitions.length>512||
     definitions.filter(i=>i?.variable===temp.variable&&i.modder===temp.modder).length!==1||definitions.findIndex(i=>i?.variable===temp.variable&&i.modder===temp.modder)!==v.clothes_choice)
    return no('selected-descriptor-unavailable');
  // The original buy handler first calls clothingReset(head). A zero aggregate
  // try-on value alone does not exclude outfit restoration or another slot write.
  const trial=v.tryOn;
  if(['ownedStored','tryingOn','showUnderEquip','showEquip'].some(k=>!trial[k]||typeof trial[k]!=='object'||Array.isArray(trial[k]))||
     trial.tryingOn.head!==null||!simple(v.worn?.head)||
     trial.ownedStored.head!==null&&!simple(trial.ownedStored.head)||
     ['showUnderEquip','showEquip'].some(k=>Object.keys(trial[k]).includes('head')&&trial[k].head!==null))
    return no('reviewed-head-try-on-reset-unavailable');
  const list=v.wardrobe?.head;
  if(!goal){
    if(!Array.isArray(list)||list.length>512||list.includes(undefined)||list.some(i=>!i||typeof i.variable!=='string')||!v.worn?.head||!Number.isSafeInteger(v.money)||costFunction!==window.getClothingCost||typeof costFunction!=='function')return no('bounded-shop-state-or-price-reader-unavailable');
    const cost=costFunction(temp,'head');
    if(!Number.isSafeInteger(cost)||cost<0||cost!==t.clothingCost)return no('original-price-inconsistent');
    return {status:'available',source:'original DoL selected head shop state and reviewed price reader',index:v.clothes_choice,variable:item.variable,modder:item.modder??null,
      colour:v.colouraction??null,accessoryColour:v.accessorycolouraction??null,pattern:v.patternaction??null,quantity:v.buyMultiple,destination:v.wardrobes?.shopReturn??null,
      money:v.money,cost,space:t.spaceLeft,count:list.filter(i=>i?.variable===item.variable&&(i.colour??null)===(v.colouraction??null)&&
        (i.accessory_colour??null)===(v.accessorycolouraction??null)&&(i.modder??null)===(item.modder??null)&&i.pattern==null).length,
      wornCount:v.worn?.head?.variable===item.variable&&(v.worn.head.colour??null)===(v.colouraction??null)&&(v.worn.head.accessory_colour??null)===(v.accessorycolouraction??null)&&(v.worn.head.modder??null)===(item.modder??null)&&v.worn.head.pattern==null?1:0};
  }
  if(goal.kind!=='purchase-one' || item.variable!==goal.variable || (item.modder??null)!==(goal.modder??null) || v.colouraction!==goal.colour ||
     v.accessorycolouraction!==goal.accessoryColour || v.patternaction!=null || ['random','custom'].includes(goal.colour)||['random','custom'].includes(goal.accessoryColour)||
     !item.colour_options?.includes(goal.colour)||!item.accessory_colour_options?.includes(goal.accessoryColour)||v.buyMultiple!==1||v.wardrobes?.shopReturn!=='wardrobe')return no('variant-quantity-or-destination-mismatch');
  if(!Array.isArray(list)||list.length>512||list.includes(undefined)||list.some(i=>!i||typeof i.variable!=='string')||!v.worn?.head||!Number.isSafeInteger(v.money)||v.money!==goal.baselineMoney ||
     list.filter(i=>i?.variable===goal.variable&&(i.colour??null)===goal.colour&&(i.accessory_colour??null)===goal.accessoryColour&&(i.modder??null)===(goal.modder??null)&&i.pattern==null).length!==goal.baselineCount)
    return no('purchase-baseline-changed');
  if(costFunction!==window.getClothingCost || typeof costFunction!=='function')return no('reviewed-price-reader-unavailable');
  const cost=costFunction(temp,'head');
  if(!Number.isSafeInteger(cost)||cost<0||cost!==goal.unitCost||(goal.maxSpend!==null&&(!Number.isSafeInteger(goal.maxSpend)||cost>goal.maxSpend))||v.money<cost||t.clothingCost!==cost||!Number.isFinite(t.spaceLeft)||t.spaceLeft<1)
    return no('price-funds-or-capacity-mismatch');
  const controls=document.querySelectorAll('#buy-send-home > .buy-button > .buy-button-inner');
  if(controls.length!==1||controls[0].classList.contains('disabled')||controls[0].querySelectorAll('a.link-internal').length!==1)return no('native-buy-control-unavailable');
  return {status:'available',source:'original DoL selected descriptor, price reader, quantity, destination, currency and head inventory',
    index:v.clothes_choice,variable:item.variable,modder:item.modder??null,colour:v.colouraction,accessoryColour:v.accessorycolouraction,quantity:1,destination:'wardrobe',
    money:v.money,cost,space:t.spaceLeft,count:goal.baselineCount,
    wornCount:v.worn?.head?.variable===item.variable&&(v.worn.head.colour??null)===goal.colour&&(v.worn.head.accessory_colour??null)===goal.accessoryColour&&(v.worn.head.modder??null)===(goal.modder??null)&&v.worn.head.pattern==null?1:0};
}
module.exports={reader};
