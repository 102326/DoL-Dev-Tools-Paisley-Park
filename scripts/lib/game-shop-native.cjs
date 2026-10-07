'use strict';
const {createHash}=require('node:crypto'),shop=require('./game-shop.cjs'),control=require('./game-native-control.cjs'),contracts=require('./game-contract.cjs');
const {bind,checkBindings}=require('./game-native-business-bindings.cjs'),environment=require('./game-native-environment.cjs'),receipts=require('./game-receipts.cjs');
const {operation}=require('./game-shop-operation.cjs'),profile=require('./game-shop-profile.json');
const sha=s=>createHash('sha256').update(s).digest('hex');
const button='#buy-send-home > .buy-button > .buy-button-inner',anchor=button+' > a.link-internal';
function branch(phase){
  const s=window.SugarCube?.State,v=s?.variables,t=s?.temporary;
  if(typeof window.DoLGameUI!=='undefined'||s?.passage!=='Clothing Shop'||v?.shopName!=='clothing'||v.clothingShopSlot!=='head'||
     v.combat!==0||v.options?.autosaveDisabled!==true||v.ironmanmode===true||v.tryOn?.value!==0)return 'native-shop-environment-unavailable';
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
async function prepare(client,request,goal,attemptId,{quote,attestOnly=false}={}){
  shop.validate(request);
  if(request.operation!=='buy-one'||!quote||typeof attestOnly!=='boolean'||!attestOnly&&!/^[a-f0-9-]{36}$/.test(attemptId||''))throw Object.assign(Error('Native purchase contract unavailable'),{code:'MAPPING_UNAVAILABLE'});
  let mapped,held,releaseCalled=false;const groups=[];
  const release=async()=>{releaseCalled=true;const results=await Promise.allSettled([...groups.splice(0).map(objectGroup=>client.send('Runtime.releaseObjectGroup',{objectGroup})),
    ...(mapped?[...mapped.objectIds.map(objectId=>client.send('Runtime.releaseObject',{objectId})),...mapped.objectGroups.map(objectGroup=>client.send('Runtime.releaseObjectGroup',{objectGroup}))]:[]),...(held?[held.release()]:[])]);
    if(results.some(r=>r.status==='rejected'))throw Object.assign(Error('Native shop binding cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})};
  try{
    mapped=await shop.prepare(client,request,goal,{quote});
    held=await control.attest(client,{kind:'menu',selected:{type:'web-click',selector:anchor}},{allowShopPropagationStops:true});
    if(held.payloadSha256!==profile.payloadSha256||JSON.stringify(held.shadowKeys)!==JSON.stringify(profile.shadowKeys))throw Error('Original purchase payload differs');
    const env=await environment.bind(client,held,require('./game-native-intro-profile.json'));
    const business=await bind(client,held,profile,groups);
    const money=await contracts.member(client,business.bundleId,'this.macros.find(r=>r.name==="money").fn',held.objectGroup);
    const time=await contracts.captured(client,money,'Time','object',{maxResponseBytes:16*1024*1024});
    const dateGetter=await contracts.member(client,time,`(${dateGetterOf.toString()})(this)`,held.objectGroup);
    const compiled=`function(phase,inputs){const checkBindings=${checkBindings.toString()},dateGetterOf=${dateGetterOf.toString()};
      const reason=(${sourceCheck.toString()})(inputs[0],inputs[1],inputs[2]);if(reason!==undefined)return reason;
      const branchReason=(${branch.toString()})(phase);if(branchReason!==undefined)return branchReason;
      const nativeEnvInputs=[inputs[3]];return (function(){${env.guard}})();}`;
    const guard=await client.send('Runtime.evaluate',{expression:'('+compiled+')',objectGroup:held.objectGroup,returnByValue:false});
    if(guard.exceptionDetails||!guard.result?.objectId||await contracts.functionSource(client,guard.result.objectId)!==compiled)throw Error('Native purchase guard unavailable');
    const inputs=[{objectId:business.bundleId},{objectId:time},{objectId:dateGetter},...env.arguments];
    const check=await client.send('Runtime.callFunctionOn',{objectId:guard.result.objectId,functionDeclaration:'function(...inputs){return this("before",inputs)}',arguments:inputs,returnByValue:true});
    if(check.exceptionDetails||check.result?.type!=='undefined')throw Error('Native shop preflight rejected: '+(check.result?.value||'exception'));
    const raw=await client.send('Runtime.callFunctionOn',{objectId:time,functionDeclaration:`function(q){return (${readCurrent.toString()})(q,this.date.timeStamp)}`,arguments:[{value:quote}],returnByValue:true});
    if(raw.exceptionDetails||!raw.result?.value)throw Error('Native purchase original snapshot unavailable');const before=raw.result.value;
    if(attestOnly){await release();return {status:'attested',actions:false,profile:profile.id,before,widgets:business.widgets,functions:business.functions,bindingCleanup:'completed'}}
    const binding={provider:'dol-shop-native',contract:'shop-buy-one-'+sha(JSON.stringify(profile)+operation.toString()+compiled+readCurrent.toString()).slice(0,12),
      contextNonce:await receipts.context(client),requestDigest:sha(JSON.stringify({attemptId,request,quote,before,payload:held.payloadSha256}))};
    const o=held.objects,args=[{objectId:o.node},{objectId:o.click},{objectId:o.context},{objectId:guard.result.objectId},...inputs,...mapped.arguments];
    const source=`if(node!==observedInputs[0].parentElement||(${control.clickReader.toString()})(observedInputs[0],true)!==observedInputs[1]||
      observedInputs[2]?.payload?.[0]?.contents!==${JSON.stringify(held.payload)})return {ok:false,guardRejected:true};
      const mappedGuard=(function(observedInputs){${mapped.source}})(observedInputs.slice(8));if(mappedGuard?.guardRejected)return mappedGuard;
      try{if(observedInputs[3]('before',observedInputs.slice(4,8))!==undefined)return {ok:false,guardRejected:true};}catch{return {ok:false,guardRejected:true};}`;
    const config={namespace:receipts.namespace,binding,attemptId,quote,before};
    const operationSource=`return (${operation.toString()})(observedInputs[0],${JSON.stringify(config)},function(){return (${readCurrent.toString()})(${JSON.stringify(quote)},observedInputs[5].date.timeStamp)},function(phase){return observedInputs[3](phase,observedInputs.slice(4,8))});`;
    if(Buffer.byteLength(operationSource)>32768)throw Error('Native purchase operation bound');
    return {action:{type:'web-click',selector:button},arguments:args,objectGroups:[held.objectGroup,...groups,...mapped.objectGroups],objectIds:mapped.objectIds,
      source,executionBinding:binding,interpretation:{...mapped.interpretation,provider:'dol-shop-native',contract:binding.contract,execution:'native-operation'},
      operation:{name:'native-shop-buy-one',source:operationSource}};
  }catch(error){if(releaseCalled&&error.code==='NATIVE_BINDING_CLEANUP_FAILED')throw error;
    try{await release()}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native purchase preparation and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}
    throw Object.assign(Error('Reviewed native purchase unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'});
  }
}
module.exports={prepare,branch,readCurrent,sourceCheck,dateGetterOf};
