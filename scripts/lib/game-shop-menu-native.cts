interface ReceiptView {outcome?:unknown;remoteClosed?:unknown;spent?:unknown;evidence?:{kind?:unknown;from?:unknown;to?:unknown;turns?:unknown;time?:unknown;money?:unknown;businessStable?:unknown}}
interface EffectView {action?:{selected?:{operation?:string};kind?:unknown;cost?:unknown};executionBinding?:{provider?:unknown;contract?:string}}
// Views below are access descriptions, not validation of CDP or request data.
interface RequestView {type?:unknown;operation?:unknown;selector:string}
interface Remote {exceptionDetails?:unknown;result?:{objectId?:unknown;value?:unknown;type?:unknown}}
interface Selection {index:unknown;store:string}
interface Before {passage:unknown;view:unknown;[key:string]:unknown}
'use strict';
import type cdp from './cdp.cjs';
import type controlType from './game-native-control.cjs';
import type businessType from './game-native-business-bindings.cjs';
const {createHash}:typeof import('node:crypto')=require('node:crypto'),control:typeof import('./game-native-control.cjs')=require('./game-native-control.cjs'),contracts:typeof import('./game-contract.cjs')=require('./game-contract.cjs'),receipts:typeof import('./game-receipts.cjs')=require('./game-receipts.cjs');
const business:typeof import('./game-native-business-bindings.cjs')=require('./game-native-business-bindings.cjs'),generic:typeof import('./game-native-generic-landing.cjs')=require('./game-native-generic-landing.cjs'),{preflight,operation}:typeof import('./game-shop-menu-operation.cjs')=require('./game-shop-menu-operation.cjs');
const base=require('./game-shop-profile.json') as businessType.Profile,extra=require('./game-shop-menu-profile.json') as {widgets:businessType.Profile['widgets'];functions:businessType.Profile['functions'];payloads:Record<string,string>},sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const profile={...base,...extra,widgets:{...base.widgets,...extra.widgets},functionMacros:base.functionMacros,functions:{...base.functions,...extra.functions}};
const button='#clothingShop-div .button-back-to-shop',anchor=button+' > a.link-internal';
const {branch,reader}:typeof import('./browser-abi/native-shop-menu.cjs')=require('./browser-abi/native-shop-menu.cjs');

async function prepare(client:Pick<cdp.Client,'send'|'evaluate'>,rawRequest:unknown,goal:unknown,attemptId:unknown,{scope}:{scope?:unknown}={}){
  const request=rawRequest as RequestView;
  const port=client as unknown as {send(method:string,params?:unknown):Promise<Remote>};
  const browse=request?.operation==='browse';
  if(request?.type!=='dol-shop'||!['return-menu','browse'].includes(request.operation as string)||Reflect.ownKeys(request).length!==(browse?3:2)||browse&&(typeof request.selector!=='string'||!request.selector||request.selector.length>256)||!receiptsUUID(attemptId))throw Object.assign(Error('Shop menu request unavailable'),{code:'MAPPING_UNAVAILABLE'});
  let held:(controlType.Held & {destination?:unknown;before:{passage:unknown}})|undefined;const groups:string[]=[];
  try{
    held=await control.attest(client,{kind:'menu',selected:{type:'web-click',selector:browse?request.selector:anchor}},{allowShopPropagationStops:true}) as controlType.Held & {destination?:unknown;before:{passage:unknown}};
    const itemSelection=browse&&held.payloadSha256==='12ea620a4461c8be6c7ad72e554c598edbd57fed6505667f4555067db6cebc93';
    const kind=browse?(itemSelection?'catalogue':held.payload==='<<replace "#clothingShop-div">><<HeadShop>><</replace>>'?'main':null):Object.entries(extra.payloads).find(([,hash])=>hash===held!.payloadSha256)?.[0];if(!kind)throw Error('Original shop menu payload differs');
    let selection:Selection|null=null,actionSelector=browse?request.selector:button;
    if(itemSelection){
      const selected=await port.send('Runtime.callFunctionOn',{objectId:held.objects.shadowStore,returnByValue:true,functionDeclaration:`function(){
        const item=this._item,data=this._itemData,defs=window.setup.clothes.head;
        if(this._csslot!=='head'||this._shopLocation!=='clothing'||this._outfits!==false||!item||!data||!Array.isArray(defs)||defs.length>512||
          !Number.isSafeInteger(item.index)||item.index<1||defs[item.index]!==data||item.variable!==data.variable||item.modder!==data.modder||item.name!==data.name||item.slot!=='head'||
          !['hairpin','beanie'].includes(item.variable)||item.cursed||item.outfitPrimary!==undefined||item.outfitSecondary!==undefined||!data.shop?.includes('clothing')||
          item.index!==data.index||item.reveal!==data.reveal)return null;
        return {index:item.index,variable:item.variable,store:JSON.stringify(this)};
      }`});
      selection=(selected.exceptionDetails?null:selected.result?.value) as Selection|null;if(!selection||selection.store.length>65536)throw Error('Reviewed original head item selection unavailable');
      const suffix=' > '+request.selector.split(' > ').slice(-3).join(' > ');
      actionSelector=request.selector.slice(0,-suffix.length);
      const wrapper=await port.send('Runtime.callFunctionOn',{objectId:held.objects.node,returnByValue:true,functionDeclaration:`function(){const ns=document.querySelectorAll(${JSON.stringify(actionSelector)});return ns.length===1&&ns[0]===this.closest('#clothes-list .clothing-item')}`});
      if(wrapper.exceptionDetails||wrapper.result?.value!==true)throw Error('Original item wrapper unavailable');
    }
    const saveWatch=await (require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).bind(client,scope,held.objectGroup);
    held.destination='Clothing Shop';const env=await generic.review(client,held as typeof held & {destination:unknown},saveWatch!==null),bound=await business.bind(client,held,profile,groups);
    const guardSource=`function(nativeEnvPhase,nativeEnvInputs){const checkBindings=${business.checkBindings.toString()};const reason=checkBindings(nativeEnvInputs[2]);if(reason!==undefined)return reason;
      ${selection?`if(nativeEnvPhase==='before'&&(JSON.stringify(nativeEnvInputs[3])!==${JSON.stringify(selection.store)}||window.setup.clothes.head[${selection.index}]!==nativeEnvInputs[3]._itemData))return 'shop-item-shadow-changed';`:''}
      const branchReason=(${branch.toString()})(${saveWatch!==null});if(branchReason!==undefined)return branchReason;${env.guard}}`;
    const g=await port.send('Runtime.evaluate',{expression:'('+guardSource+')',objectGroup:held.objectGroup,returnByValue:false});
    if(g.exceptionDetails||!g.result?.objectId||await contracts.functionSource(client,g.result.objectId)!==guardSource)throw Error('Original shop menu guard unavailable');
    const inputs=[...env.arguments,{objectId:bound.bundleId},...(selection?[{objectId:held.objects.shadowStore}]:[])];
    const checked=await port.send('Runtime.callFunctionOn',{objectId:g.result.objectId,functionDeclaration:'function(...inputs){return this("before",inputs)}',arguments:inputs,returnByValue:true});
    if(checked.exceptionDetails||checked.result?.type!=='undefined')throw Error('Original shop menu guard rejected: '+checked.result?.value);
    const before=await client.evaluate(`(${reader.toString()})()`) as Before;if(before.view!==kind)throw Error('Original shop menu view differs from payload');
    const binding={provider:'dol-shop-native',contract:'shop-menu-'+(saveWatch?'save-':'')+sha(JSON.stringify(profile)+operation.toString()+preflight.toString()+guardSource+reader.toString()+(saveWatch?.digest||'')).slice(0,12),
      contextNonce:await receipts.context(client),requestDigest:sha(JSON.stringify({attemptId,request,before,payload:held.payloadSha256,sourceEpoch:env.sceneEpochSha256}))};
    const config={namespace:receipts.namespace,binding,attemptId,before,...(browse?{browse:true,expectedView:selection?'item':'catalogue',expectedSlot:'head',expectedChoice:selection?.index??null}:{})},o=held.objects;
    const args=[{objectId:o.node},{objectId:o.click},{objectId:o.context},{objectId:g.result.objectId},...inputs];
    const saveIndex=saveWatch?args.push({objectId:saveWatch.objectId})-1:null;
    const read=`function(){return (${reader.toString()})()}`,check=`function(phase){return observedInputs[3](phase,observedInputs.slice(4))}`;
    const source=`if(node!==observedInputs[0]${selection?'.closest("#clothes-list .clothing-item")':browse?'':'.parentElement'}||(${control.clickReader.toString()})(observedInputs[0],true)!==observedInputs[1]||observedInputs[2]?.payload?.[0]?.contents!==${JSON.stringify(held.payload)})return {ok:false,guardRejected:true};
      ${saveWatch?`if(observedInputs[${saveIndex}].check()!==undefined)return {ok:false,guardRejected:true};`:''}
      try{if((${preflight.toString()})(observedInputs[0],${JSON.stringify(config)},${read},${check})!==null)return {ok:false,guardRejected:true};}catch{return {ok:false,guardRejected:true};}`;
    let op=`return (${operation.toString()})(observedInputs[0],${JSON.stringify(config)},${read},${check},${preflight.toString()},markOperationDispatch,invokeBoundClick${saveWatch?`,observedInputs[${saveIndex}]`:''});`;
    if(saveWatch)op=(require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).execution(op,saveIndex!);
    if(Buffer.byteLength(op)>32768||Buffer.byteLength(source)>32768)throw Error('Original shop menu operation bound');
    return {clickReceiverObjectId:o.node,action:{type:'web-click',selector:actionSelector},arguments:args,objectGroups:[held.objectGroup,...groups],source,executionBinding:binding,
      interpretation:{provider:'dol-shop-native',operation:request.operation,from:before.view,execution:'native-operation',contract:binding.contract},operation:(require('./action.cjs') as typeof import('./action.cjs')).reviewedOperation('native-shop-menu',op)};
  }catch(error){const released=await Promise.allSettled([...groups.map(objectGroup=>client.send('Runtime.releaseObjectGroup',{objectGroup})),...(held?[held.release()]:[])]);
    const failures=released.filter(r=>r.status==='rejected').map(r=>r.reason);if(failures.length)throw Object.assign(new AggregateError([error,...failures],'Native shop menu binding cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'});
    throw Object.assign(Error('Reviewed native shop menu unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'});
  }
}
const receiptsUUID=(s:unknown)=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s);
function validateReceipt(raw:unknown,effect:unknown){
  const verified=(require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).receipt(raw,effect);if(!verified)return false;const {r,e}=verified as {r:ReceiptView;e:EffectView};
  if(r.outcome!=='occurred'||!r.remoteClosed)return r.evidence===undefined;
  const p=r.evidence,browse=e.action?.selected?.operation==='browse';return e.action?.kind==='menu'&&['return-menu','browse'].includes(e.action.selected?.operation as string)&&e.action.cost===0&&
    e.executionBinding?.provider==='dol-shop-native'&&/^shop-menu-[a-f0-9]{12}$/.test(e.executionBinding.contract||'')&&r.spent===0&&
    !!p&&Reflect.ownKeys(p).length===7&&Object.keys(p).every(k=>['kind','from','to','turns','time','money','businessStable'].includes(k))&&p.kind==='shop-menu'&&
    (browse?p.from==='main'&&p.to==='catalogue'||p.from==='catalogue'&&p.to==='item':['item','catalogue'].includes(p.from as string)&&p.to===(p.from==='item'?'catalogue':'main'))&&Number.isSafeInteger(p.turns)&&(p.turns as number)>=0&&Number.isFinite(p.time)&&Number.isSafeInteger(p.money)&&(p.money as number)>=0&&p.businessStable===true;
}
export = {prepare,branch,reader,validateReceipt};
