'use strict';
// Used by the reviewed local clothing producer after synchronous source/object
// guards. No page-global command, arbitrary JS field or replay path.
function operation(node,config,readCurrent,checkSources){
  const {namespace,binding,attemptId,request,before}=config;
  const context=window[namespace],sc=window.SugarCube,root=document.querySelector('#passages > .passage'),list=document.querySelector('#wardrobeList');
  const current=readCurrent(request);
  const active=sc?.State?.activeIndex,history=sc?.State?.history,momentEntry=history?.[active];
  if(!context||context.nonce!==binding.contextNonce||!context.records||Object.hasOwn(context.records,attemptId)||Object.keys(context.records).length>=64||
     current?.status!=='available'||JSON.stringify(current.before)!==JSON.stringify(before)||checkSources('before')!==undefined||!root||!list||!root.contains(node)||!root.contains(list)||
     !Number.isSafeInteger(active)||active<0||!Array.isArray(history)||!momentEntry||momentEntry.title!=='Wardrobe')
    return {ok:false,guardRejected:true};
  const moment=Object.getOwnPropertyDescriptor(window,'updateMoment');
  if(!moment||typeof moment.value!=='function'||moment.writable!==true||moment.configurable!==true)return {ok:false,guardRejected:true};
  const started=Object.freeze({...binding,attemptId,status:'started',phase:'business-started',before});
  context.records[attemptId]=started;
  let calls=0,threw=false,restored=false,installed=false;
  const observed=function(...args){
    calls++;
    if(calls!==1||args.length!==0)throw Error('Unexpected original moment update');
    const result=Reflect.apply(moment.value,this,args);
    if(result!==undefined)throw Error('Original moment update returned an unexpected result');
    return result;
  };
  try{Object.defineProperty(window,'updateMoment',{...moment,value:observed});installed=true;node.click()}
  catch{threw=true}
  finally{
    if(installed){const now=Object.getOwnPropertyDescriptor(window,'updateMoment');
      if(now?.value===observed&&now.writable===moment.writable&&now.configurable===moment.configurable&&now.enumerable===moment.enumerable){
        try{Object.defineProperty(window,'updateMoment',moment);restored=true}catch{threw=true}
      }
    }
  }
  if(threw||!restored||calls!==1)return {ok:false};
  context.records[attemptId]=Object.freeze({...started,phase:'business-returned'});
  const variant=i=>JSON.stringify([i?.variable,i?.colour??null,i?.modder??null,i?.accessory_colour??null]);
  const equip=request.operation==='equip',afterRequest=equip?{type:'dol-wardrobe',operation:'unequip',slot:'head'}:
    {type:'dol-wardrobe',operation:'equip',slot:'head',variable:before.worn.variable,colour:before.worn.colour,accessoryColour:before.worn.accessory_colour??null,modder:before.worn.modder??null};
  const after=readCurrent(afterRequest);
  const expected=before.inventory.filter((_,i)=>!equip||i!==current.index);
  if(before.worn.variable!=='naked')expected.push({...before.worn,lastTaken:'wardrobe'});
  const worn=sc.State.variables.worn.head,inventory=sc.State.variables.wardrobe.head;
  const last=Object.getOwnPropertyDescriptor(window,'updateMoment');
  const saved=momentEntry.variables;
  if(window.SugarCube!==sc||sc.State.passage!=='Wardrobe'||document.querySelectorAll('#passages > .passage').length!==1||document.querySelector('#passages > .passage')!==root||
     !root.isConnected||document.querySelectorAll('#wardrobeList').length!==1||document.querySelector('#wardrobeList')!==list||!root.contains(list)||root.querySelector('.error')||
     !last||last.value!==moment.value||last.writable!==moment.writable||last.configurable!==moment.configurable||last.enumerable!==moment.enumerable||
     sc.State.turns!==before.turns||sc.State.variables.timeStamp!==before.time||sc.State.variables.money!==before.money||
     window[namespace]!==context||sc.State.activeIndex!==active||sc.State.history!==history||history[active]!==momentEntry||momentEntry.title!=='Wardrobe'||
     saved?.timeStamp!==before.time||saved?.money!==before.money||JSON.stringify(saved?.worn?.head)!==JSON.stringify(worn)||JSON.stringify(saved?.wardrobe?.head)!==JSON.stringify(inventory)||
     after?.status!=='available'||JSON.stringify(inventory)!==JSON.stringify(expected)||
     (equip?variant(worn)!==variant(before.item):worn.variable!=='naked')||checkSources('after')!==undefined)return {ok:false};
  const evidence={kind:'native-head',operation:request.operation,slot:'head',turns:before.turns,time:before.time,money:before.money,
    beforeWorn:JSON.parse(variant(before.worn)),afterWorn:JSON.parse(variant(worn)),inventoryBefore:before.inventory.length,inventoryAfter:inventory.length,
    originalMomentUpdates:calls,samePassage:true};
  const receipt=Object.freeze({...binding,attemptId,status:'terminal',outcome:'occurred',remoteClosed:true,spent:0,evidence});
  context.records[attemptId]=receipt;return {ok:true,receipt};
}
module.exports={operation};
