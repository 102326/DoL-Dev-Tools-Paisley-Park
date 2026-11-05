import type cdp from './cdp.cjs';
import type action from './action.cjs';
import type predicates from './game-goal-reader.cjs';
declare namespace shop {
 type Client=Pick<cdp.Client,'send'|'evaluate'>;
 type Request={type:'dol-shop';operation:'quantity-one'|'buy-one'|'return-menu';selector?:never}|{type:'dol-shop';operation:'browse';selector:string};
 interface Prepared {action:action.Action;objectIds:unknown[];objectGroups:string[];arguments:{objectId:unknown}[];interpretation:Record<string,unknown>&{operation:Request['operation'];costSourceSha256:string;moneyHandlerSha256:string|undefined;moneyFunctionSha256:string|undefined;debitBinding:string};source:string}
 type SourceFunction=(...args:unknown[])=>unknown;
}
type View=Record<string,unknown>;
interface RemoteView {exceptionDetails?:unknown;result?:{objectId?:unknown;type?:unknown;value?:unknown}}
const {reader}:{reader:shop.SourceFunction}=require('./browser-abi/shop-mapping.cjs');
const {createHash}:typeof import('node:crypto')=require('node:crypto');
const {attestFunctionMacro,sameObject}:typeof import('./game-contract.cjs')=require('./game-contract.cjs');
// Reviewed original getClothingCost implementation in the selected 0.5.12.13 target.
// This fingerprint identifies the price reader, not the entire game or its business handlers.
const costSourceSha256='5424a6f34332b8a79c55cd740b1d6c40696352141908119c4690f511ac885710';
const selector='#buy-send-home > .buy-button > .buy-button-inner';
function validate(raw:unknown):shop.Request {
  const request=raw as View;
  if(!request || Array.isArray(request) || Object.keys(request).some(k=>!['type','operation','selector'].includes(k)) || request.type!=='dol-shop' ||
     !['quantity-one','buy-one','return-menu','browse'].includes(request.operation as string)||
     (request.operation==='browse'?typeof request.selector!=='string'||!request.selector||request.selector.length>256:request.selector!==undefined))throw Error('Unsupported shop request');
  return request as shop.Request;
}
async function prepare(client:shop.Client,raw:unknown,goal?:unknown,{quote}:{quote?:predicates.Quote}={}):Promise<shop.Prepared> {
  const request=validate(raw);if(['return-menu','browse'].includes(request.operation as string))throw Error('Shop menu needs its reviewed native producer');const objectIds:unknown[]=[],objectGroups:string[]=[];
  try {
    const expressions=['window.getClothingCost','window.setup.clothes.head[window.SugarCube.State.variables.clothes_choice]',
      'window.SugarCube.State.temporary.temp_choice','window.SugarCube.State.variables.worn.head','window.SugarCube.State.variables.wardrobe.head',
      'window.SugarCube.Macro.get("money").handler'];
    for(const expression of expressions){
      const r=await client.send('Runtime.evaluate',{expression,returnByValue:false}) as RemoteView;
      if(r.exceptionDetails||!r.result?.objectId)throw Error('Original shop binding unavailable');objectIds.push(r.result.objectId);
    }
    const fn=await client.send('Runtime.callFunctionOn',{objectId:objectIds[0],functionDeclaration:'function(){return Function.prototype.toString.call(this)}',returnByValue:true}) as RemoteView;
    if(fn.exceptionDetails||typeof fn.result?.value!=='string'||createHash('sha256').update(fn.result.value).digest('hex')!==costSourceSha256)
      throw Error('Price reader source unsupported');
    // Vanilla DoL keeps money inside the registered function macro; no global
    // window.money exists there. Retain that actual closure instead of requiring
    // a UI/Mod-provided global. This binding still does not prove a purchase.
    const globalDebit=await client.send('Runtime.evaluate',{expression:'window.money',returnByValue:false}) as RemoteView;
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
    const debitSources:string[]=[],debitTexts:string[]=[];
    for(const objectId of inputIds.slice(5)){
      const f=await client.send('Runtime.callFunctionOn',{objectId,functionDeclaration:'function(){return Function.prototype.toString.call(this)}',returnByValue:true}) as RemoteView;
      if(f.exceptionDetails||typeof f.result?.value!=='string'||f.result.value.length>32768)throw Error('Bounded debit source identity unavailable');
      debitSources.push(createHash('sha256').update(f.result.value).digest('hex'));
      debitTexts.push(f.result.value);
    }
    const selectedGoal=request.operation==='buy-one'?goal:null;
    const snapshot=await client.send('Runtime.callFunctionOn',{objectId:objectIds[0],functionDeclaration:`function(goal){return (${reader.toString()})(goal,this)}`,
      arguments:[{value:selectedGoal}],returnByValue:true}) as RemoteView;
    const current=(snapshot.exceptionDetails?null:snapshot.result?.value) as View|null|undefined;
    if(current?.status!=='available')throw Error('Shop preconditions unavailable');
    if(quote){
      const {variant}=quote;
      if(current.variable!==variant.variable||current.colour!==variant.colour||current.accessoryColour!==variant.accessoryColour||(current.modder??null)!==variant.modder||current.money!==quote.baselineMoney||current.count!==quote.baselineCount||current.cost!==quote.unitCost||current.wornCount!==quote.baselineWornCount)throw Error('Original selected quote changed');
    }
    const action:action.Action=request.operation==='buy-one'?{type:'web-click',selector}:{type:'web-input',selector:'#buy-multiple-slider input[type="range"]',value:'1'};
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
    if((error as {code?:unknown}).code==='NATIVE_BINDING_CLEANUP_FAILED')throw error;
    throw Object.assign(Error('Reviewed native shop mapping unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'});
  }
}
async function inspect(client:shop.Client){
 const mapped=await prepare(client,{type:'dol-shop',operation:'quantity-one'});
 let failed=false;for(const objectGroup of mapped.objectGroups){try{await client.send('Runtime.releaseObjectGroup',{objectGroup})}catch{failed=true}}
 for(const objectId of mapped.objectIds){try{await client.send('Runtime.releaseObject',{objectId})}catch{failed=true}}
 if(failed)throw Error('Shop observation binding cleanup failed');
 const {operation,...facts}=mapped.interpretation;
 return {...facts,actions:false,bindingCleanup:'completed',privacy:'private selected item/currency/count only; no save body or full inventory'};
}
const shop={validate,reader,prepare,costSourceSha256,inspect};
export = shop;
