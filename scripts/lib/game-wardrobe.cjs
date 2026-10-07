'use strict';
// Clothing-domain mapping of original DoL controls. No UI Runtime required.
const {createHash}=require('node:crypto');
const control=require('./game-native-control.cjs');
const payloadSha256='d542a29ae81a97ba006ce4189f68eff13d27250e77f3c749c11442bdeb6027fc';
const text=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\u0000-\u001f]/.test(v);
function validate(r){
  const fields=r?.operation==='equip'?['type','operation','slot','variable','colour','accessoryColour','modder']:['type','operation','slot'];
  if(!r||Array.isArray(r)||Object.keys(r).some(k=>!fields.includes(k))||r.type!=='dol-wardrobe'||r.slot!=='head'||
     !['equip','unequip'].includes(r.operation)||r.operation==='equip'&&(!text(r.variable)||!['hairpin','beanie'].includes(r.variable)||
       !text(r.colour)||['custom','random'].includes(r.colour)||!(r.accessoryColour===null||r.accessoryColour===0||text(r.accessoryColour))||['custom','random'].includes(r.accessoryColour)||
       !(r.modder===undefined||r.modder===null||text(r.modder))))throw Error('Unsupported original wardrobe request');
  return r;
}
function reader(request){
  const sc=window.SugarCube,s=sc?.State,v=s?.variables,t=s?.temporary,roots=document.querySelectorAll('#passages > .passage');
  const no=reason=>({status:'unsupported',reason,source:'original DoL wardrobe control and item state'});
  if(typeof window.DoLGameUI!=='undefined'||s?.passage!=='Wardrobe'||roots.length!==1||roots[0].getAttribute('data-passage')!=='Wardrobe'||
     !v||window.V!==v||!t||v.wardrobe_location!=='wardrobe'||v.lastWardrobeSlot!=='head'||t.wear!=='wear_head'||t.selectedWardrobe!==v.wardrobe||
     v.wardrobeOption!=='wear'||v.wear_outfit!=='none'||v.delete_outfit!=='none'||v.runWardrobeSanityChecker===true||
     ![undefined,false,0].includes(v.randomWear)||t.wearAction!==undefined||v.clothingShop?.stolenClothes!==0||
     v.adultShop!==undefined&&v.adultShop.stolenClothes!==0)return no('original-head-context-unavailable');
  const slots=['over_upper','over_lower','upper','lower','under_upper','under_lower','over_head','head','face','neck','hands','handheld','legs','feet','genitals'];
  if(slots.some(slot=>v['wear_'+slot]!=='none')||!Number.isSafeInteger(s.turns)||!Number.isSafeInteger(v.money)||!Number.isFinite(v.timeStamp))return no('other-wardrobe-operation-active');
  const simple=i=>!!i&&!i.cursed&&i.outfitPrimary===undefined&&i.outfitSecondary===undefined&&!i.colourCustom&&!i.accessory_colourCustom&&!i.pattern;
  const list=v.wardrobe?.head,worn=v.worn?.head;
  if(!Array.isArray(list)||list.length>512||!simple(worn)||list.some(i=>!simple(i)))return no('bounded-simple-head-state-unavailable');
  let index=null;
  if(request.operation==='equip'){
    const found=list.map((item,i)=>({item,i})).filter(({item})=>item.variable===request.variable&&(item.colour??null)===request.colour&&
      (item.accessory_colour??null)===request.accessoryColour&&(item.modder??null)===(request.modder??null));
    if(found.length!==1)return no('variant-ambiguous-or-missing');index=found[0].i;
  }else if(worn.variable==='naked')return no('head-already-empty');
  const lists=document.querySelectorAll('#wardrobeList'),nativeList=lists[0];
  if(lists.length!==1||!roots[0].contains(nativeList)||roots[0].querySelector('.error'))return no('original-list-unavailable');
  const rows=Array.from(nativeList.querySelectorAll(':scope > div.wardrobeItem'));
  const offset=worn.variable==='naked'?0:1;
  if(rows.length!==list.length+offset)return no('original-row-count-differs');
  const row=rows[request.operation==='equip'?index+offset:0],links=row?.querySelectorAll(':scope > a.link-internal');
  if(links?.length!==1||links[0].hasAttribute('data-passage'))return no('original-control-unavailable');
  const divs=Array.from(nativeList.children).filter(n=>n.tagName==='DIV'),position=divs.indexOf(row)+1;
  if(position<1)return no('original-row-unavailable');
  const selector='#wardrobeList > div.wardrobeItem:nth-of-type('+position+') > a.link-internal';
  if(document.querySelectorAll(selector).length!==1||document.querySelectorAll(selector)[0]!==links[0])return no('original-control-ambiguous');
  const before={turns:s.turns,time:v.timeStamp,money:v.money,worn,inventory:list,...(index===null?{}:{item:list[index]})};
  const raw=JSON.stringify(before);if(new TextEncoder().encode(raw).length>16384)return no('bounded-head-state-unavailable');
  return {status:'available',source:'original DoL wardrobe control and item state',operation:request.operation,slot:'head',selector,index,before:JSON.parse(raw)};
}
// Reviewed branch guard for original simple-head work. Source attestation is
// separate: this does not invoke selectWardrobe, clone, widgets or controls.
function branchGuard(phase,request){
  const s=window.SugarCube?.State,v=s?.variables,t=s?.temporary,setup=window.setup;
  if(!['before','after'].includes(phase)||!v||!t||!setup||typeof window.DoLGameUI!=='undefined'||s.passage!=='Wardrobe'||
     v.options?.autosaveDisabled!==true||v.ironmanmode!==false||v.passage!=='Wardrobe'||v.exposed!==0||v.alluretest!==0||v.wardrobe_location!=='wardrobe'||!v.wardrobes?.wardrobe||
     t.selectedWardrobe!==v.wardrobe||t.wear!=='wear_head'||v.lastWardrobeSlot!=='head'||v.wear_outfit!=='none'||v.delete_outfit!=='none'||
     v.runWardrobeSanityChecker===true||v.randomWear||t.wearAction!==undefined||![undefined,0,false].includes(t.strip_restrict)||
     document.querySelector('#oldWardrobeListDisplay'))return 'native-head-refresh-context';
  const slots=['over_upper','over_lower','upper','lower','under_upper','under_lower','over_head','head','face','neck','hands','handheld','legs','feet','genitals'];
  const originalLayers=['over_upper','over_lower','over_head','upper','lower','under_upper','under_lower','head','face','neck','hands','handheld','legs','feet'];
  if(JSON.stringify(setup.clothingLayer?.all)!==JSON.stringify(originalLayers))return 'native-clothing-layer-list-changed';
  if(slots.some(slot=>v['wear_'+slot]!=='none'||v.carried?.[slot]?.name!=='naked')||v.worn?.butt_plug?.state==='removed')return 'other-native-clothing-branch';
  // Native clone supports custom clone()/DOM nodes. Original setup definitions
  // use a data-only ClothesItem prototype: clone creates its prototype without
  // invoking the constructor. Require that shape; reject executable helpers.
  let count=0;const plain=(i,depth=0)=>{
    if(++count>4096||depth>8)return false;
    if(i===null||i===undefined||['string','boolean'].includes(typeof i))return true;
    if(typeof i==='number')return Number.isFinite(i);
    if(typeof i!=='object')return false;
    const proto=Object.getPrototypeOf(i),ctor=proto&&Object.getOwnPropertyDescriptor(proto,'constructor');
    const dataClass=proto&&Object.getPrototypeOf(proto)===Object.prototype&&Reflect.ownKeys(proto).length===1&&ctor&&Object.hasOwn(ctor,'value')&&typeof ctor.value==='function';
    if(![Object.prototype,Array.prototype,null].includes(proto)&&!dataClass)return false;
    const customClone=Object.getOwnPropertyDescriptor(i,'clone')??Object.getOwnPropertyDescriptor(Object.getPrototypeOf(i)||{},'clone')??Object.getOwnPropertyDescriptor(Object.prototype,'clone');
    if(customClone&&(!Object.hasOwn(customClone,'value')||typeof customClone.value==='function'))return false;
    return Reflect.ownKeys(i).every(k=>{const d=Object.getOwnPropertyDescriptor(i,k);return typeof k==='string'&&Object.hasOwn(d,'value')&&plain(d.value,depth+1)});
  };
  const head=v.wardrobe?.head,worn=v.worn?.head,definitions=setup.clothes?.head;
  if(!Array.isArray(head)||head.length>512||!plain(head)||!plain(worn)||!Array.isArray(definitions)||!plain(definitions[0])||
     definitions[0]?.variable!=='naked'||!Array.isArray(setup.wardrobeSkip)||!setup.wardrobeSkip.includes('naked')||
     head.deleteAt!==Array.prototype.deleteAt)return 'native-head-data-or-clone-branch';
  const simple=i=>!!i&&!i.cursed&&i.outfitPrimary===undefined&&i.outfitSecondary===undefined&&!i.colourCustom&&!i.accessory_colourCustom&&!i.pattern&&
    Array.isArray(i.type)&&!i.type.some(type=>['strap-on','constricting'].includes(type));
  if(!simple(worn)||head.some(i=>!simple(i))||worn.variable!=='naked'&&setup.wardrobeSkip.includes(worn.name))return 'native-head-linked-clothing';
  const item=request.operation==='equip'&&phase==='before'?head.find(i=>i.variable===request.variable&&(i.colour??null)===request.colour&&
    (i.accessory_colour??null)===request.accessoryColour&&(i.modder??null)===(request.modder??null)):worn;
  if(!item||!['hairpin','beanie',...(phase==='after'&&request.operation==='unequip'?['naked']:[])].includes(item.variable))return 'native-head-domain-unreviewed';
  const matches=definitions.filter(i=>i.variable===item.variable&&i.modder===item.modder);
  if(matches.length!==1||!plain(matches[0]))return 'native-head-definition-unavailable';
}
async function attest(client,request){
  validate(request);
  const current=await client.evaluate(`(${reader.toString()})(${JSON.stringify(request)})`);
  if(current?.status!=='available')throw Object.assign(Error('Original wardrobe control unavailable'),{code:'MAPPING_UNAVAILABLE'});
  const held=await control.attest(client,{kind:'menu',selected:{type:'web-click',selector:current.selector}});
  try{
    const shadow=await client.send('Runtime.callFunctionOn',{objectId:held.objects.shadowStore,returnByValue:true,functionDeclaration:`function(){
      const d=Object.getOwnPropertyDescriptor(this,'_args'),a=d?.value;
      return Reflect.ownKeys(this).length===1&&d&&Object.hasOwn(d,'value')&&Array.isArray(a)&&a.length===2&&
        typeof a[0]==='string'&&a[0].length<=160&&a[1]===${JSON.stringify(request.operation==='equip'?current.index:'strip')};
    }`});
    if(held.payloadSha256!==payloadSha256||shadow.exceptionDetails||shadow.result?.value!==true||held.before.passage!=='Wardrobe'||
       ['turns','time','money'].some(k=>held.before[k]!==current.before[k]))throw Error('Original wardrobe payload/identity differs');
    const fresh=await client.evaluate(`(${reader.toString()})(${JSON.stringify(request)})`);
    if(JSON.stringify(fresh)!==JSON.stringify(current))throw Error('Original wardrobe state changed during attestation');
    return {...held,interpretation:current,requestDigest:createHash('sha256').update(JSON.stringify({request,before:current.before,payloadSha256})).digest('hex')};
  }catch(error){
    try{await held.release()}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Wardrobe provenance and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}
    throw error;
  }
}
function validateReceipt(r,e){
  const request=e.action?.selected,binding=e.executionBinding,p=r.evidence;
  if(request?.type!=='dol-wardrobe'||binding?.provider!=='dol-wardrobe-native'||
     !new RegExp('^native-head-'+request.operation+'-[a-f0-9]{12}$').test(binding.contract))return false;
  if(r.outcome!=='occurred'||!r.remoteClosed)return p===undefined;
  const number=v=>Number.isSafeInteger(v)&&v>=0;
  const variant=v=>Array.isArray(v)&&v.length===4&&text(v[0])&&
    v.slice(1).every(x=>x===null||x===0||text(x));
  if(!p||Array.isArray(p)||Object.keys(p).length!==12||Object.keys(p).some(k=>!['kind','operation','slot','turns','time','money','beforeWorn','afterWorn','inventoryBefore','inventoryAfter','originalMomentUpdates','samePassage'].includes(k))||
     p.kind!=='native-head'||p.operation!==request.operation||p.slot!=='head'||r.spent!==0||
     !number(p.turns)||!Number.isFinite(p.time)||!number(p.money)||!number(p.inventoryBefore)||!number(p.inventoryAfter)||
     p.inventoryBefore>512||p.inventoryAfter>512||!variant(p.beforeWorn)||!variant(p.afterWorn)||p.originalMomentUpdates!==1||p.samePassage!==true)return false;
  return request.operation==='equip'?JSON.stringify(p.afterWorn)===JSON.stringify([request.variable,request.colour,request.modder??null,request.accessoryColour])&&
    p.inventoryAfter===p.inventoryBefore-(p.beforeWorn[0]==='naked'?1:0):
    request.operation==='unequip'&&p.beforeWorn[0]!=='naked'&&p.afterWorn[0]==='naked'&&p.inventoryAfter===p.inventoryBefore+1;
}
// The domain provider uses game-wardrobe-native for reviewed terminal execution.
// This mapping alone does not authorize a terminal receipt.
module.exports={validate,reader,branchGuard,attest,validateReceipt};
