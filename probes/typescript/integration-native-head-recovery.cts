// Local views describe accessed page properties; they do not validate external data.
interface Item {variable?:unknown;[key:string]:unknown}
interface Before {inventory:Item[];worn:Item;item:Item;turns:unknown;time:unknown;money:unknown}
interface Expected {attemptId:string;binding:{provider:unknown;contract:unknown;contextNonce:unknown;requestDigest:unknown;[key:string]:unknown}}
interface Indices {namespace:string;context:number;bridge:number;action:number;index:number;errorMessages:unknown[]}
interface Context {nonce:unknown;records?:Record<string,Record<string,unknown>>}
interface Wardrobe {passage:Element;original?:Element;snapshot?:{inventory?:{head?:unknown};worn?:{head?:unknown}};refreshQueued?:unknown;state?:{busy?:unknown;slot?:unknown;wornItem?:{key?:unknown;name?:unknown};wornName?:unknown;message?:unknown};entries:{key?:unknown;slot?:unknown;index?:unknown;raw?:unknown}[]}
interface RecoveryWindow {SugarCube?:{State?:{passage?:unknown;turns?:unknown;variables?:{worn?:{head?:Item};wardrobe?:{head?:Item[]};timeStamp?:unknown;money?:unknown}}};[key:string]:unknown}
function closedRecoveryReader(this:unknown, expected:Expected, before:Before, observedInputs:unknown[], indices:Indices) {
  const node=this as Element, nodes=document.querySelectorAll('#passages > .passage .dgw-strip');
  if(nodes.length!==1||nodes[0]!==node||!node.isConnected)return {ok:false};
  const w=window as unknown as RecoveryWindow;
  const ctx=w[indices.namespace] as Context|undefined,r=ctx?.records?.[expected.attemptId];
  if(!ctx||ctx.nonce!==expected.binding.contextNonce||!r||r.status!=='started'||r.attemptId!==expected.attemptId||
     ['provider','contract','contextNonce','requestDigest'].some(k=>r[k]!==expected.binding[k]))return {ok:false};
  const state=w.SugarCube?.State,v=state?.variables,worn=v?.worn?.head,inventory=v?.wardrobe?.head;
  const wardrobe=observedInputs[indices.context] as Wardrobe,bridge=observedInputs[indices.bridge] as object,action=observedInputs[indices.action];
  const list=document.querySelector('#wardrobeList'),root=wardrobe.passage,native=list?.closest('.dgw-native');
  const expectedInventory=before.inventory.filter((_,i)=>i!==indices.index);
  if(before.worn!.variable!=='naked')expectedInventory.push({...before.worn,lastTaken:'wardrobe'});
  const expectedWorn={...before.item,lastTaken:'wardrobe'},entries=wardrobe.entries,modelWorn=wardrobe.state?.wornItem;
  const descriptor=Object.getOwnPropertyDescriptor(bridge,'action');
  if(state?.passage!=='Wardrobe'||state.turns!==before.turns||v?.timeStamp!==before.time||v!.money!==before.money||
     JSON.stringify(worn)!==JSON.stringify(expectedWorn)||JSON.stringify(inventory)!==JSON.stringify(expectedInventory)||
     !root?.isConnected||root!==document.querySelector('#passages > .passage')||root.querySelector('.error')||
     document.querySelectorAll('#wardrobeList').length!==1||!list?.isConnected||!wardrobe.original?.contains(list)||
     !native||(native as HTMLElement).hidden!==true||getComputedStyle(native).display!=='none'||
     !descriptor||descriptor.value!==action||descriptor.writable!==true||descriptor.configurable!==true||
     wardrobe.refreshQueued!==false||wardrobe.state?.busy!==false||wardrobe.state?.slot!=='head'||
     wardrobe.snapshot?.inventory?.head!==inventory||wardrobe.snapshot?.worn?.head!==worn||
     !Array.isArray(entries)||!Array.isArray(inventory)||entries.length!==inventory.length||
     entries.some((item,i)=>item.key!=='head:'+i||item.slot!=='head'||item.index!==i||item.raw!==inventory[i])||
     modelWorn?.key!=='worn:head'||modelWorn.name!==wardrobe.state.wornName||
     indices.errorMessages.includes(wardrobe.state.message))return {ok:false};
  return {ok:true,proof:{receiptStatus:r.status,passage:state.passage,wornVariable:worn!.variable,inventoryLength:inventory.length,
    money:v!.money,timeStamp:v!.timeStamp,turns:state.turns,modelRefreshed:true,bridgeRestored:true,uiEnabled:true}};
}
export = {closedRecoveryReader};
