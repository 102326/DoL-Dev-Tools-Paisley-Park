const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {prepare,branch,readCurrent,dateGetterOf,sourceCheck}=require('../scripts/lib/game-shop-native.cjs');
test('purchase reads actual clocks and variants; missing money statistics are a zero baseline',()=>{
  const quote={variant:{slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',modder:null},unitCost:500};
  const v={timeStamp:11490,money:500,wardrobe:{head:[]},worn:{head:{variable:'hairpin',colour:'white',accessory_colour:'white'}},buyMultiple:1,wardrobes:{shopReturn:'wardrobe'}};
  const window={SugarCube:{State:{variables:v,turns:47}}};
  const read=()=>vm.runInNewContext(`(${readCurrent.toString()})(quote,63797883090)`,{window,quote,TextEncoder});
  const before=read();assert.equal(before.clock,63797883090);assert.equal(before.time,11490);assert.equal(before.count,0);assert.equal(before.stats.spent,0);
  v.wardrobe.head.push({variable:'hairpin',colour:'black',accessory_colour:'black'});assert.equal(read().count,1);assert.equal(before.inventory.length,0);
  v.wardrobe.head[0].accessory_colour='white';assert.equal(read().count,0);
  v.wardrobe.head=Array.from({length:513},()=>({variable:'hairpin'}));assert.throws(read,/unavailable/);
});
test('purchase clock binding rejects a changed original owner or getter',()=>{
  const getter=vm.runInNewContext('(function(){return {get date() {\n\t\t\treturn currentDate;\n\t\t}}})()',{currentDate:{timeStamp:63797883090}});
  const time=Object.create(getter),dateGetter=dateGetterOf(time),addon={_timeProxyManager:{originTime:time}};
  const window={modSC2DataManager:{sc2EventTracer:{callback:[{addonPluginTable:[{modName:'DoLTimeWrapperAddon',hookPoint:{timeWrapperAddon:addon}}]}]}}};
  const check=()=>vm.runInNewContext(`(${sourceCheck.toString()})({},time,dateGetter)`,{window,time,dateGetter,dateGetterOf,checkBindings:()=>undefined});
  assert.equal(check(),undefined);addon._timeProxyManager.originTime={};assert.match(check(),/owner/);
  addon._timeProxyManager.originTime=time;Object.defineProperty(time,'date',{get:()=>({timeStamp:0})});assert.match(check(),/owner/);
});
test('native purchase refuses an outfit/reset change before dispatch',()=>{
  const worn={variable:'hairpin',colour:'white'},item={variable:'hairpin',accessory_colour_sidebar:1};
  const v={shopName:'clothing',clothingShopSlot:'head',combat:0,options:{autosaveDisabled:true},tryOn:{value:0,ownedStored:{head:{...worn}},tryingOn:{head:null},showUnderEquip:{},showEquip:{}},
    worn:{head:worn},shopDefaults:{disableReturn:false},clothes_choice:1};
  const t={realSlot:'head',realIndex:1,temp_choice:item},window={SugarCube:{State:{passage:'Clothing Shop',variables:v,temporary:t}},setup:{clothes:{head:[{},item]}}};
  const check=()=>vm.runInNewContext(`(${branch.toString()})('before')`,{window});
  assert.equal(check(),undefined);v.tryOn.ownedStored.head.colour='black';assert.match(check(),/reset/);
  v.tryOn.ownedStored.head={...worn};item.outfitPrimary={upper:'other'};assert.match(check(),/reset/);
  delete item.outfitPrimary;v.options.autosaveDisabled=false;assert.match(check(),/environment/);
});
test('a missing quote or invalid purchase attempt never accesses CDP',async()=>{
  const client={send(){throw Error('Must not access CDP')},evaluate(){throw Error('Must not access CDP')}};
  await assert.rejects(prepare(client,{type:'dol-shop',operation:'buy-one'},{},'invalid',{quote:{}}),e=>e.code==='MAPPING_UNAVAILABLE');
  await assert.rejects(prepare(client,{type:'dol-shop',operation:'buy-one'},{},null,{attestOnly:true}),e=>e.code==='MAPPING_UNAVAILABLE');
});
