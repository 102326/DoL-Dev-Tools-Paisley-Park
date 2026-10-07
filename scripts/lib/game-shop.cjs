const {createHash}=require('node:crypto');
const {attestFunctionMacro,sameObject}=require('./game-contract.cjs');
// Reviewed original getClothingCost implementation in the selected 0.5.12.13 target.
// This fingerprint identifies the price reader, not the entire game or its business handlers.
const costSourceSha256='5424a6f34332b8a79c55cd740b1d6c40696352141908119c4690f511ac885710';
const selector='#buy-send-home > .buy-button > .buy-button-inner';
function validate(request) {
  if(!request || Array.isArray(request) || Object.keys(request).some(k=>!['type','operation','selector'].includes(k)) || request.type!=='dol-shop' ||
     !['quantity-one','buy-one','return-menu','browse'].includes(request.operation)||
     (request.operation==='browse'?typeof request.selector!=='string'||!request.selector||request.selector.length>256:request.selector!==undefined))throw Error('Unsupported shop request');
  return request;
}
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
    if(!Number.isSafeInteger(cost)||cost<=0||cost!==t.clothingCost)return no('original-price-inconsistent');
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
  if(!Number.isSafeInteger(cost)||cost<=0||cost!==goal.unitCost||cost>goal.maxSpend||v.money<cost||t.clothingCost!==cost||!Number.isFinite(t.spaceLeft)||t.spaceLeft<1)
    return no('price-funds-or-capacity-mismatch');
  const controls=document.querySelectorAll('#buy-send-home > .buy-button > .buy-button-inner');
  if(controls.length!==1||controls[0].classList.contains('disabled')||controls[0].querySelectorAll('a.link-internal').length!==1)return no('native-buy-control-unavailable');
  return {status:'available',source:'original DoL selected descriptor, price reader, quantity, destination, currency and head inventory',
    index:v.clothes_choice,variable:item.variable,modder:item.modder??null,colour:v.colouraction,accessoryColour:v.accessorycolouraction,quantity:1,destination:'wardrobe',
    money:v.money,cost,space:t.spaceLeft,count:goal.baselineCount,
    wornCount:v.worn?.head?.variable===item.variable&&(v.worn.head.colour??null)===goal.colour&&(v.worn.head.accessory_colour??null)===goal.accessoryColour&&(v.worn.head.modder??null)===(goal.modder??null)&&v.worn.head.pattern==null?1:0};
}
async function prepare(client,request,goal,{quote}={}) {
  validate(request);if(['return-menu','browse'].includes(request.operation))throw Error('Shop menu needs its reviewed native producer');const objectIds=[],objectGroups=[];
  try {
    const expressions=['window.getClothingCost','window.setup.clothes.head[window.SugarCube.State.variables.clothes_choice]',
      'window.SugarCube.State.temporary.temp_choice','window.SugarCube.State.variables.worn.head','window.SugarCube.State.variables.wardrobe.head',
      'window.SugarCube.Macro.get("money").handler'];
    for(const expression of expressions){
      const r=await client.send('Runtime.evaluate',{expression,returnByValue:false});
      if(r.exceptionDetails||!r.result?.objectId)throw Error('Original shop binding unavailable');objectIds.push(r.result.objectId);
    }
    const fn=await client.send('Runtime.callFunctionOn',{objectId:objectIds[0],functionDeclaration:'function(){return Function.prototype.toString.call(this)}',returnByValue:true});
    if(fn.exceptionDetails||typeof fn.result?.value!=='string'||createHash('sha256').update(fn.result.value).digest('hex')!==costSourceSha256)
      throw Error('Price reader source unsupported');
    // Vanilla DoL keeps money inside the registered function macro; no global
    // window.money exists there. Retain that actual closure instead of requiring
    // a UI/Mod-provided global. This binding still does not prove a purchase.
    const globalDebit=await client.send('Runtime.evaluate',{expression:'window.money',returnByValue:false});
    if(globalDebit.result?.objectId)objectIds.push(globalDebit.result.objectId);
    if(globalDebit.exceptionDetails)throw Error('Original debit unavailable');
    let debitId,nativeDebit=false;
    if(globalDebit.result?.type==='function'&&globalDebit.result.objectId){debitId=globalDebit.result.objectId}
    else if(globalDebit.result?.type==='undefined'&&await client.evaluate('typeof window.DoLGameUI === "undefined"')===true){
      const debit=await attestFunctionMacro(client,'money','9f3af72846a7105de0cef60158fa6b094c67e635330364e34544d3329aa30f37',
        {retain:true,handlerSha256:'c8b8d2b8f09b95d696de7b9500b98626b4ce45de0b598a5b8804ddde080a3164'});
      objectGroups.push(debit.objectGroup);
      if(!await sameObject(client,debit.objectId,objectIds[5]))throw Error('Native money handler changed');
      debitId=debit.functionId;nativeDebit=true;
    }else throw Error('Reviewed original debit unavailable');
    const inputIds=[...objectIds.slice(0,6),debitId];
    const debitSources=[],debitTexts=[];
    for(const objectId of inputIds.slice(5)){
      const f=await client.send('Runtime.callFunctionOn',{objectId,functionDeclaration:'function(){return Function.prototype.toString.call(this)}',returnByValue:true});
      if(f.exceptionDetails||typeof f.result?.value!=='string'||f.result.value.length>32768)throw Error('Bounded debit source identity unavailable');
      debitSources.push(createHash('sha256').update(f.result.value).digest('hex'));
      debitTexts.push(f.result.value);
    }
    const selectedGoal=request.operation==='buy-one'?goal:null;
    const snapshot=await client.send('Runtime.callFunctionOn',{objectId:objectIds[0],functionDeclaration:`function(goal){return (${reader.toString()})(goal,this)}`,
      arguments:[{value:selectedGoal}],returnByValue:true});
    const current=snapshot.exceptionDetails?null:snapshot.result?.value;
    if(current?.status!=='available')throw Error('Shop preconditions unavailable');
    if(quote){
      const {variant}=quote;
      if(current.variable!==variant.variable||current.colour!==variant.colour||current.accessoryColour!==variant.accessoryColour||(current.modder??null)!==variant.modder||current.money!==quote.baselineMoney||current.count!==quote.baselineCount||current.cost!==quote.unitCost||current.wornCount!==quote.baselineWornCount)throw Error('Original selected quote changed');
    }
    const action=request.operation==='buy-one'?{type:'web-click',selector}:{type:'web-input',selector:'#buy-multiple-slider input[type="range"]',value:'1'};
    return {action,objectIds,objectGroups,arguments:inputIds.map(objectId=>({objectId})),interpretation:{...current,operation:request.operation,costSourceSha256,moneyHandlerSha256:debitSources[0],moneyFunctionSha256:debitSources[1],debitBinding:nativeDebit?'registered native macroFunction':'global money function'},
      source:`
        const v=window.SugarCube.State.variables,t=window.SugarCube.State.temporary;
        if(window.getClothingCost!==observedInputs[0]||window.setup.clothes.head[v.clothes_choice]!==observedInputs[1]||t.temp_choice!==observedInputs[2]||
           v.worn.head!==observedInputs[3]||v.wardrobe.head!==observedInputs[4]||window.SugarCube.Macro.get('money').handler!==observedInputs[5]||
           ${nativeDebit?`typeof window.DoLGameUI!=='undefined'||typeof window.money!=='undefined'||Function.prototype.toString.call(observedInputs[6])!==${JSON.stringify(debitTexts[1])}`:'window.money!==observedInputs[6]'})return {ok:false,guardRejected:true};
        const mapped=(${reader.toString()})(${JSON.stringify(selectedGoal)},observedInputs[0]);
        if(JSON.stringify(mapped)!==${JSON.stringify(JSON.stringify(current))})return {ok:false,guardRejected:true};
      `};
  }catch(error){
    const released=await Promise.allSettled([...objectGroups.map(objectGroup=>client.send('Runtime.releaseObjectGroup',{objectGroup})),...objectIds.map(objectId=>client.send('Runtime.releaseObject',{objectId}))]);
    const failures=released.filter(r=>r.status==='rejected').map(r=>r.reason);
    if(failures.length)throw Object.assign(new AggregateError([error,...failures],'Shop binding and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'});
    if(error.code==='NATIVE_BINDING_CLEANUP_FAILED')throw error;
    throw Object.assign(Error('Reviewed native shop mapping unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'});
  }
}
module.exports={validate,reader,prepare,costSourceSha256};
module.exports.inspect=async client=>{
 const mapped=await prepare(client,{type:'dol-shop',operation:'quantity-one'});
 let failed=false;for(const objectGroup of mapped.objectGroups){try{await client.send('Runtime.releaseObjectGroup',{objectGroup})}catch{failed=true}}
 for(const objectId of mapped.objectIds){try{await client.send('Runtime.releaseObject',{objectId})}catch{failed=true}}
 if(failed)throw Error('Shop observation binding cleanup failed');
 const {operation,...facts}=mapped.interpretation;
 return {...facts,actions:false,bindingCleanup:'completed',privacy:'private selected item/currency/count only; no save body or full inventory'};
};
