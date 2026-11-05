declare namespace goalProbe {
 interface Goal {kind:unknown;passage?:unknown;slot?:unknown;variable?:unknown;colour?:unknown;modder?:unknown;accessoryColour?:unknown;baselineMoney?:unknown;baselineCount?:unknown;unitCost?:unknown;maxSpend?:unknown}
}
interface ItemView extends Record<string,unknown> {variable?:unknown;colour?:unknown;modder?:unknown;accessory_colour?:unknown;pattern?:unknown}
interface VariablesView {money?:unknown;worn?:Record<string,ItemView|null|undefined>;wardrobe?:{head?:unknown}}
interface StateView {passage?:unknown;variables?:VariablesView;turns?:unknown}
interface GameWindow {SugarCube?:{State?:StateView};__paisleyParkGameplayReceiptsV1?:{nonce?:unknown}}
function goalReader(goal:goalProbe.Goal) {
  const state = (window as unknown as GameWindow).SugarCube?.State, roots = document.querySelectorAll('#passages > .passage');
  const domAgrees = roots.length === 1 && roots[0].getAttribute('data-passage') === state?.passage;
  if (!domAgrees || typeof state?.passage !== 'string' || state.passage.length > 128) return { status: 'unavailable', satisfied: null, source: 'original game state/DOM agreement unavailable' };
  let satisfied;
  if (goal.kind === 'reach-passage') satisfied = state.passage === goal.passage;
  else if(['equip-matching','purchase-and-equip'].includes(goal.kind as string)) {
    const v=state.variables!,item=v?.worn?.head,list=v?.wardrobe?.head;
    const simple=(i:ItemView|null|undefined)=>!!i&&i.variable!=='naked'&&!i.cursed&&i.outfitPrimary===undefined&&i.outfitSecondary===undefined&&!i.colourCustom&&!i.accessory_colourCustom&&!i.pattern;
    if(!item||!Array.isArray(list)||list.length>512)return {status:'unavailable',satisfied:null,source:'bounded original head wardrobe/worn state unavailable'};
    const identity=(i:ItemView)=>JSON.stringify([i.variable,i.colour??null,i.modder??null,i.accessory_colour??null]);
    const matching=(list as (ItemView|null|undefined)[]).filter(i=>simple(i)&&i!.colour===goal.colour) as ItemView[];
    const counts=new Map<string,number>();for(const i of matching)counts.set(identity(i),(counts.get(identity(i))||0)+1);
    const items=matching.filter(i=>counts.get(identity(i))===1).slice(0,64).map(i=>({variable:i.variable,colour:i.colour,modder:i.modder??null,accessoryColour:i.accessory_colour??null,name:typeof i.name==='string'?i.name.slice(0,128):i.variable}));
    const wornMatches=simple(item)&&item.colour===goal.colour;
    const conditionsSatisfied=wornMatches&&(goal.passage===undefined||state.passage===goal.passage);
    const owned=new Map<string,number>();
    if(goal.kind==='purchase-and-equip'){
      if(list.includes(undefined)||(list as (ItemView|null|undefined)[]).some(i=>!i||typeof i.variable!=='string'))return {status:'unavailable',satisfied:null,source:'original variant inventory count unavailable'};
      // Ownership uses the complete original variant count, independent of
      // whether an item is currently a safe equipment candidate.
      for(const i of list as ItemView[])if(i.colour===goal.colour&&i!.pattern==null)owned.set(identity(i),(owned.get(identity(i))||0)+1);
    }
    return {status:'available',satisfied:goal.kind==='equip-matching'&&conditionsSatisfied,source:'original requested colour/simple item condition, worn slot and Passage',
      wornMatches,passage:state.passage,worn:{variable:item.variable,colour:item.colour??null,modder:item.modder??null,accessoryColour:item.accessory_colour??null},items,itemsTruncated:matching.length>64,
      ...(goal.kind==='purchase-and-equip'?{conditionsSatisfied,turns:state.turns,receiptContext:(window as unknown as GameWindow).__paisleyParkGameplayReceiptsV1?.nonce??null,
        owned:[...owned.entries()].slice(0,64).map(([variant,count])=>({variant:JSON.parse(variant) as unknown,count})),ownedTruncated:owned.size>64}:{} )};
  }
  else if(goal.kind==='purchase-one') {
    const v=state.variables!,list=v?.wardrobe?.head;
    if(!Array.isArray(list)||list.length>512||!Number.isSafeInteger(v.money))return {status:'unavailable',satisfied:null,source:'bounded original purchase state unavailable'};
    const count=(list as (ItemView|null|undefined)[]).filter(i=>i?.variable===goal.variable&&(i!.colour??null)===goal.colour&&(i!.accessory_colour??null)===goal.accessoryColour&&(i!.modder??null)===(goal.modder??null)&&i!.pattern==null).length;
    const spent=(goal.baselineMoney as number)-(v.money as number);
    return {status:'available',satisfied:(spent>0||goal.unitCost===0&&spent===0) && (goal.maxSpend===null||Number.isSafeInteger(goal.maxSpend)&&spent<=(goal.maxSpend as number)) && count===(goal.baselineCount as number)+1,priceMatches:spent===goal.unitCost,
      source:'original SugarCube currency and exact variant head inventory count',money:v.money,count,spent,quotedCost:goal.unitCost,passage:state.passage};
  } else {
    const worn = state.variables?.worn;
    if (!worn || !Object.prototype.hasOwnProperty.call(worn, goal.slot as string) || !worn[goal.slot as string]) return { status: 'unavailable', satisfied: null, source: 'original worn slot unavailable' };
    const item = worn[goal.slot as string]!;
    satisfied = item.variable === goal.variable && (item.colour ?? null) === goal.colour && (item.modder ?? null) === (goal.modder ?? null) &&
      (goal.accessoryColour===undefined||(item.accessory_colour??null)===goal.accessoryColour);
  }
  return { status: 'available', satisfied, source: goal.kind === 'equip' ? 'original SugarCube worn slot fields' : 'original SugarCube Passage and current DOM', passage: state.passage };
}
const goalProbe={goalReader};
export = goalProbe;
