// Frozen source is included in persistent native contract digests.
function branch(allowSave=false){
  const v=window.SugarCube?.State?.variables;
  if(typeof window.DoLGameUI!=='undefined'||window.SugarCube.State.passage!=='Clothing Shop'||v.shopName!=='clothing'||
     v.combat!==0||!allowSave&&(v.options?.autosaveDisabled!==true||v.ironmanmode===true)||v.tryOn?.value!==0||v.shopDefaults?.alwaysBackToShopButton!==false||
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
module.exports={branch,reader};
