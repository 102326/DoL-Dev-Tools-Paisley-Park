'use strict';
const {createHash}=require('node:crypto'),control=require('./game-native-control.cjs'),contracts=require('./game-contract.cjs'),receipts=require('./game-receipts.cjs');
const business=require('./game-native-business-bindings.cjs'),generic=require('./game-native-generic-landing.cjs'),{preflight,operation}=require('./game-shop-menu-operation.cjs');
const base=require('./game-shop-profile.json'),extra=require('./game-shop-menu-profile.json'),sha=s=>createHash('sha256').update(s).digest('hex');
const profile={...base,...extra,widgets:{...base.widgets,...extra.widgets},functionMacros:base.functionMacros,functions:{...base.functions,...extra.functions}};
const button='#clothingShop-div .button-back-to-shop',anchor=button+' > a.link-internal';
function branch(){
  const v=window.SugarCube?.State?.variables;
  if(typeof window.DoLGameUI!=='undefined'||window.SugarCube.State.passage!=='Clothing Shop'||v.shopName!=='clothing'||
     v.combat!==0||v.options?.autosaveDisabled!==true||v.ironmanmode===true||v.tryOn?.value!==0||v.shopDefaults?.alwaysBackToShopButton!==false||
     v.tryOn.autoReset!==false||!Object.values(v.tryOn.tryingOn).every(i=>i===null)||
     !Number.isFinite(v.stress)||!Number.isFinite(v.stressmax)||v.stress>=v.stressmax||!['dawn','day'].includes(Time.dayState)||Time.hour===21)return 'native-shop-menu-branch-unavailable';
}
function reader(){
  const s=window.SugarCube.State,v=s.variables,root=document.querySelector('#clothingShop-div');
  if(!root||!v.wardrobe||!v.worn)throw Error('Original shop menu unavailable');
  const exits=root.querySelectorAll('a.link-internal[data-passage="Shopping Centre Top"]'),back=root.querySelectorAll('.button-back-to-shop > a.link-internal');
  const view=exits.length===1&&back.length===0?'main':back.length===1?(v.clothes_choice?'item':'catalogue'):null;
  if(!view||!Number.isSafeInteger(s.turns)||!Number.isFinite(v.timeStamp)||!Number.isSafeInteger(v.money)||v.money<0)throw Error('Original shop menu view unavailable');
  const value={passage:s.passage,turns:s.turns,time:v.timeStamp,money:v.money,choice:v.clothes_choice??null,slot:v.clothingShopSlot??null,colour:v.colouraction??null,accessoryColour:v.accessorycolouraction??null,view,inventory:v.wardrobe,worn:v.worn};
  const json=JSON.stringify(value);if(new TextEncoder().encode(json).length>65536)throw Error('Shop menu state bound');return JSON.parse(json);
}
async function prepare(client,request,goal,attemptId){
  const browse=request?.operation==='browse';
  if(request?.type!=='dol-shop'||!['return-menu','browse'].includes(request.operation)||Reflect.ownKeys(request).length!==(browse?3:2)||browse&&(typeof request.selector!=='string'||!request.selector||request.selector.length>256)||!receiptsUUID(attemptId))throw Object.assign(Error('Shop menu request unavailable'),{code:'MAPPING_UNAVAILABLE'});
  let held;const groups=[];
  try{
    held=await control.attest(client,{kind:'menu',selected:{type:'web-click',selector:browse?request.selector:anchor}},{allowShopPropagationStops:true});
    const itemSelection=browse&&held.payloadSha256==='12ea620a4461c8be6c7ad72e554c598edbd57fed6505667f4555067db6cebc93';
    const kind=browse?(itemSelection?'catalogue':held.payload==='<<replace "#clothingShop-div">><<HeadShop>><</replace>>'?'main':null):Object.entries(extra.payloads).find(([,hash])=>hash===held.payloadSha256)?.[0];if(!kind)throw Error('Original shop menu payload differs');
    let selection=null,actionSelector=browse?request.selector:button;
    if(itemSelection){
      const selected=await client.send('Runtime.callFunctionOn',{objectId:held.objects.shadowStore,returnByValue:true,functionDeclaration:`function(){
        const item=this._item,data=this._itemData,defs=window.setup.clothes.head;
        if(this._csslot!=='head'||this._shopLocation!=='clothing'||this._outfits!==false||!item||!data||!Array.isArray(defs)||defs.length>512||
          !Number.isSafeInteger(item.index)||item.index<1||defs[item.index]!==data||item.variable!==data.variable||item.modder!==data.modder||item.name!==data.name||item.slot!=='head'||
          !['hairpin','beanie'].includes(item.variable)||item.cursed||item.outfitPrimary!==undefined||item.outfitSecondary!==undefined||!data.shop?.includes('clothing')||
          item.index!==data.index||item.reveal!==data.reveal)return null;
        return {index:item.index,variable:item.variable,store:JSON.stringify(this)};
      }`});
      selection=selected.exceptionDetails?null:selected.result?.value;if(!selection||selection.store.length>65536)throw Error('Reviewed original head item selection unavailable');
      const suffix=' > '+request.selector.split(' > ').slice(-3).join(' > ');
      actionSelector=request.selector.slice(0,-suffix.length);
      const wrapper=await client.send('Runtime.callFunctionOn',{objectId:held.objects.node,returnByValue:true,functionDeclaration:`function(){const ns=document.querySelectorAll(${JSON.stringify(actionSelector)});return ns.length===1&&ns[0]===this.closest('#clothes-list .clothing-item')}`});
      if(wrapper.exceptionDetails||wrapper.result?.value!==true)throw Error('Original item wrapper unavailable');
    }
    held.destination='Clothing Shop';const env=await generic.review(client,held),bound=await business.bind(client,held,profile,groups);
    const guardSource=`function(nativeEnvPhase,nativeEnvInputs){const checkBindings=${business.checkBindings.toString()};const reason=checkBindings(nativeEnvInputs[2]);if(reason!==undefined)return reason;
      ${selection?`if(nativeEnvPhase==='before'&&(JSON.stringify(nativeEnvInputs[3])!==${JSON.stringify(selection.store)}||window.setup.clothes.head[${selection.index}]!==nativeEnvInputs[3]._itemData))return 'shop-item-shadow-changed';`:''}
      const branchReason=(${branch.toString()})();if(branchReason!==undefined)return branchReason;${env.guard}}`;
    const g=await client.send('Runtime.evaluate',{expression:'('+guardSource+')',objectGroup:held.objectGroup,returnByValue:false});
    if(g.exceptionDetails||!g.result?.objectId||await contracts.functionSource(client,g.result.objectId)!==guardSource)throw Error('Original shop menu guard unavailable');
    const inputs=[...env.arguments,{objectId:bound.bundleId},...(selection?[{objectId:held.objects.shadowStore}]:[])];
    const checked=await client.send('Runtime.callFunctionOn',{objectId:g.result.objectId,functionDeclaration:'function(...inputs){return this("before",inputs)}',arguments:inputs,returnByValue:true});
    if(checked.exceptionDetails||checked.result?.type!=='undefined')throw Error('Original shop menu guard rejected: '+checked.result?.value);
    const before=await client.evaluate(`(${reader.toString()})()`);if(before.view!==kind)throw Error('Original shop menu view differs from payload');
    const binding={provider:'dol-shop-native',contract:'shop-menu-'+sha(JSON.stringify(profile)+operation.toString()+preflight.toString()+guardSource+reader.toString()).slice(0,12),
      contextNonce:await receipts.context(client),requestDigest:sha(JSON.stringify({attemptId,request,before,payload:held.payloadSha256,sourceEpoch:env.sceneEpochSha256}))};
    const config={namespace:receipts.namespace,binding,attemptId,before,...(browse?{browse:true,expectedView:selection?'item':'catalogue',expectedSlot:'head',expectedChoice:selection?.index??null}:{})},o=held.objects;
    const args=[{objectId:o.node},{objectId:o.click},{objectId:o.context},{objectId:g.result.objectId},...inputs];
    const read=`function(){return (${reader.toString()})()}`,check=`function(phase){return observedInputs[3](phase,observedInputs.slice(4))}`;
    const source=`if(node!==observedInputs[0]${selection?'.closest("#clothes-list .clothing-item")':browse?'':'.parentElement'}||(${control.clickReader.toString()})(observedInputs[0],true)!==observedInputs[1]||observedInputs[2]?.payload?.[0]?.contents!==${JSON.stringify(held.payload)})return {ok:false,guardRejected:true};
      try{if((${preflight.toString()})(observedInputs[0],${JSON.stringify(config)},${read},${check})!==null)return {ok:false,guardRejected:true};}catch{return {ok:false,guardRejected:true};}`;
    const op=`return (${operation.toString()})(observedInputs[0],${JSON.stringify(config)},${read},${check},${preflight.toString()});`;
    if(Buffer.byteLength(op)>32768||Buffer.byteLength(source)>32768)throw Error('Original shop menu operation bound');
    return {action:{type:'web-click',selector:actionSelector},arguments:args,objectGroups:[held.objectGroup,...groups],source,executionBinding:binding,
      interpretation:{provider:'dol-shop-native',operation:request.operation,from:before.view,execution:'native-operation',contract:binding.contract},operation:{name:'native-shop-menu',source:op}};
  }catch(error){const released=await Promise.allSettled([...groups.map(objectGroup=>client.send('Runtime.releaseObjectGroup',{objectGroup})),...(held?[held.release()]:[])]);
    const failures=released.filter(r=>r.status==='rejected').map(r=>r.reason);if(failures.length)throw Object.assign(new AggregateError([error,...failures],'Native shop menu binding cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'});
    throw Object.assign(Error('Reviewed native shop menu unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'});
  }
}
const receiptsUUID=s=>typeof s==='string'&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(s);
function validateReceipt(r,e){
  if(r.outcome!=='occurred'||!r.remoteClosed)return r.evidence===undefined;
  const p=r.evidence,browse=e.action?.selected?.operation==='browse';return e.action?.kind==='menu'&&['return-menu','browse'].includes(e.action.selected?.operation)&&e.action.cost===0&&
    e.executionBinding?.provider==='dol-shop-native'&&/^shop-menu-[a-f0-9]{12}$/.test(e.executionBinding.contract||'')&&r.spent===0&&
    !!p&&Reflect.ownKeys(p).length===7&&Object.keys(p).every(k=>['kind','from','to','turns','time','money','businessStable'].includes(k))&&p.kind==='shop-menu'&&
    (browse?p.from==='main'&&p.to==='catalogue'||p.from==='catalogue'&&p.to==='item':['item','catalogue'].includes(p.from)&&p.to===(p.from==='item'?'catalogue':'main'))&&Number.isSafeInteger(p.turns)&&p.turns>=0&&Number.isFinite(p.time)&&Number.isSafeInteger(p.money)&&p.money>=0&&p.businessStable===true;
}
module.exports={prepare,branch,reader,validateReceipt};
