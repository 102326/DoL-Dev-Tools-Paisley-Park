// Reviewed original-state predicates shared by Runtime and direct probes.
const keys=(v,allowed)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const bounded=v=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\u0000-\u001f]/.test(v);
function validate(request) {
  if (!keys(request, ['name', 'description', 'mode', 'goal', 'budget','requiredCheckpoints']) || !/^[A-Za-z0-9._-]{1,64}$/.test(request.name || '') || !['gameplay', 'development'].includes(request.mode) ||
    request.description!==undefined&&(typeof request.description!=='string'||!request.description.trim()||request.description.length>512||/[\u0000-\u001f]/.test(request.description))) throw Error('Invalid Goal request');
  if(request.requiredCheckpoints!==undefined&&(request.mode!=='development'||!Array.isArray(request.requiredCheckpoints)||request.requiredCheckpoints.length>8||!request.requiredCheckpoints.every(bounded)||new Set(request.requiredCheckpoints).size!==request.requiredCheckpoints.length))throw Error('Invalid required checkpoints');
  const g = request.goal;
  if (g?.kind === 'reach-passage') {
    if (!keys(g, ['kind', 'passage']) || !bounded(g.passage)) throw Error('Invalid passage Goal');
  } else if(['equip-matching','purchase-and-equip'].includes(g?.kind)) {
    if(!keys(g,['kind','slot','colour','passage'])||g.slot!=='head'||!bounded(g.colour)||['random','custom'].includes(g.colour)||g.passage!==undefined&&!bounded(g.passage))throw Error('Invalid conditional equipment Goal');
  } else if (['equip','purchase-one'].includes(g?.kind)) {
    if (!keys(g, ['kind', 'slot', 'variable', 'colour', 'modder','accessoryColour',...(g.kind==='purchase-one'?['baselineMoney','baselineCount','unitCost','maxSpend']:[])]) || !/^[a-z][a-z_]{0,31}$/.test(g.slot || '') || ['constructor', 'prototype', '__proto__'].includes(g.slot) ||
      !bounded(g.variable) || !(bounded(g.colour) || g.colour === null || g.colour === 0) || !(g.modder === undefined || g.modder === null || bounded(g.modder)) ||
      !(g.accessoryColour===undefined||g.accessoryColour===null||g.accessoryColour===0||bounded(g.accessoryColour))) throw Error('Invalid equipment Goal');
    if(g.kind==='purchase-one' && (g.slot!=='head'||!bounded(g.colour)||!bounded(g.accessoryColour)||['random','custom'].includes(g.colour)||['random','custom'].includes(g.accessoryColour)||
       !Number.isSafeInteger(g.baselineMoney)||g.baselineMoney<0||!Number.isSafeInteger(g.baselineCount)||g.baselineCount<0||g.baselineCount>511||
       !Number.isSafeInteger(g.unitCost)||g.unitCost<1||!Number.isSafeInteger(g.maxSpend)||g.maxSpend<g.unitCost||g.maxSpend>g.baselineMoney))throw Error('Invalid one-item purchase Goal');
  } else throw Error('Unsupported Goal kind');
  const b = request.budget;
  if (!keys(b, ['timeoutMs', 'maxActions', 'maxObservations','maxReplans','maxSpend']) || !Number.isInteger(b.timeoutMs) || b.timeoutMs < 1000 || b.timeoutMs > 3600000 ||
    !Number.isInteger(b.maxActions) || b.maxActions < 1 || b.maxActions > 64 || !Number.isInteger(b.maxObservations) || b.maxObservations < 1 || b.maxObservations > 192) throw Error('Invalid Goal budget');
  if(b.maxReplans!==undefined&&(!Number.isSafeInteger(b.maxReplans)||b.maxReplans<1||b.maxReplans>192)||b.maxSpend!==undefined&&(!Number.isSafeInteger(b.maxSpend)||b.maxSpend<0||b.maxSpend>100000000))throw Error('Invalid additional Goal budget');
  if(g.kind==='purchase-and-equip'&&(!Number.isSafeInteger(b.maxSpend)||b.maxSpend<1))throw Error('Conditional purchase requires an explicit parent spend budget');
  return JSON.parse(JSON.stringify(request));
}
const nonnegative=v=>Number.isSafeInteger(v)&&v>=0;
const variantKeys=['slot','variable','colour','accessoryColour','modder'];
const sameVariant=(a,b)=>variantKeys.every(k=>a?.[k]===b?.[k]);
function validateQuote(q,g){
  return keys(q,['variant','baselineMoney','baselineCount','baselineWornCount','unitCost'])&&keys(q.variant,variantKeys)&&q.variant.slot==='head'&&
    ['hairpin','beanie'].includes(q.variant.variable)&&bounded(q.variant.colour)&&q.variant.colour===g.colour&&bounded(q.variant.accessoryColour)&&!['random','custom'].includes(q.variant.accessoryColour)&&
    (q.variant.modder===null||bounded(q.variant.modder))&&nonnegative(q.baselineMoney)&&q.baselineCount===0&&q.baselineWornCount===0&&nonnegative(q.unitCost)&&q.unitCost>0&&q.unitCost<=q.baselineMoney;
}
function quoteFromShop(shop,g){
  if(g.kind!=='purchase-and-equip'||shop?.status!=='available'||shop.pattern!=null||shop.destination!=='wardrobe'||!Number.isFinite(shop.space)||shop.space<1||!Number.isSafeInteger(shop.quantity)||shop.quantity<1||shop.quantity>512)return null;
  const q={variant:{slot:'head',variable:shop.variable,colour:shop.colour,accessoryColour:shop.accessoryColour,modder:shop.modder??null},baselineMoney:shop.money,baselineCount:shop.count,baselineWornCount:shop.wornCount,unitCost:shop.cost};
  return validateQuote(q,g)?q:null;
}
function validatePurchaseReceipt(r,e){
  const q=e.action?.quote;
  if(!q||e.action.kind!=='buy')return r.evidence===undefined;
  if(r.outcome!=='occurred'||!r.remoteClosed)return r.evidence===undefined;
  const p=r.evidence;
  return validateQuote(q,{colour:q.variant?.colour})&&keys(p,['kind','variant','beforeMoney','afterMoney','beforeCount','afterCount','beforeWornCount','afterWornCount','turns','contextNonce'])&&p.kind==='purchase'&&keys(p.variant,variantKeys)&&sameVariant(p.variant,q.variant)&&
    e.executionBinding?.provider==='dol-shop-native'&&/^shop-buy-one-[a-f0-9]{12}$/.test(e.executionBinding.contract)&&p.contextNonce===e.executionBinding.contextNonce&&
    p.beforeMoney===q.baselineMoney&&nonnegative(p.afterMoney)&&p.beforeMoney-p.afterMoney===r.spent&&r.spent>0&&r.spent<=q.unitCost&&
    p.beforeCount===0&&p.beforeWornCount===0&&p.afterCount===1&&p.afterWornCount===0&&nonnegative(p.turns);
}
const purchases=context=>context.effects.filter(e=>e.status==='settled'&&e.action.kind==='buy'&&e.action.quote&&e.result?.outcome==='occurred');
function canPrepare(action,g,context){
  if(g.kind!=='purchase-and-equip')return true;
  const bought=purchases(context);
  if(bought.length&&action.kind==='load-save')return false;
  if(action.kind==='buy'||action.quote)return !bought.length&&!!action.quote&&validateQuote(action.quote,g)&&(action.kind!=='buy'||action.cost===action.quote.unitCost);
  if(['sw-wardrobe','dol-wardrobe'].includes(action.selected?.type)&&action.selected.operation==='equip')return bought.length===1&&validatePurchaseReceipt(bought[0].result,bought[0])&&sameVariant({slot:action.selected.slot,variable:action.selected.variable,colour:action.selected.colour,accessoryColour:action.selected.accessoryColour??null,modder:action.selected.modder??null},bought[0].action.quote.variant);
  return true;
}
function purchaseSatisfied(scene,g,context){
  if(g.kind!=='purchase-and-equip')return scene.goalProof.satisfied===true;
  const bought=purchases(context),p=scene.goalProof;
  if(bought.length!==1||!validatePurchaseReceipt(bought[0].result,bought[0])||!p.conditionsSatisfied||!p.wornMatches||p.ownedTruncated!==false||!Array.isArray(p.owned))return false;
  const e=bought[0],variant=e.action.quote.variant;
  const inventory=p.owned.find(i=>JSON.stringify(i.variant)===JSON.stringify([variant.variable,variant.colour,variant.modder,variant.accessoryColour]));
  return validateQuote(e.action.quote,g)&&p.receiptContext===e.executionBinding.contextNonce&&nonnegative(p.turns)&&p.turns>=e.result.evidence.turns&&
    sameVariant({slot:'head',...p.worn},variant)&&(inventory?.count??0)===0&&context.spent<=context.budget.maxSpend&&context.reserved===0;
}
// Facts come from the game; this journal never owns inventory or a shadow worn state.
function goalReader(goal) {
  const state = window.SugarCube?.State, roots = document.querySelectorAll('#passages > .passage');
  const domAgrees = roots.length === 1 && roots[0].getAttribute('data-passage') === state?.passage;
  if (!domAgrees || typeof state?.passage !== 'string' || state.passage.length > 128) return { status: 'unavailable', satisfied: null, source: 'original game state/DOM agreement unavailable' };
  let satisfied;
  if (goal.kind === 'reach-passage') satisfied = state.passage === goal.passage;
  else if(['equip-matching','purchase-and-equip'].includes(goal.kind)) {
    const v=state.variables,item=v?.worn?.head,list=v?.wardrobe?.head;
    const simple=i=>!!i&&i.variable!=='naked'&&!i.cursed&&i.outfitPrimary===undefined&&i.outfitSecondary===undefined&&!i.colourCustom&&!i.accessory_colourCustom&&!i.pattern;
    if(!item||!Array.isArray(list)||list.length>512)return {status:'unavailable',satisfied:null,source:'bounded original head wardrobe/worn state unavailable'};
    const identity=i=>JSON.stringify([i.variable,i.colour??null,i.modder??null,i.accessory_colour??null]);
    const matching=list.filter(i=>simple(i)&&i.colour===goal.colour);
    const counts=new Map();for(const i of matching)counts.set(identity(i),(counts.get(identity(i))||0)+1);
    const items=matching.filter(i=>counts.get(identity(i))===1).slice(0,64).map(i=>({variable:i.variable,colour:i.colour,modder:i.modder??null,accessoryColour:i.accessory_colour??null,name:typeof i.name==='string'?i.name.slice(0,128):i.variable}));
    const wornMatches=simple(item)&&item.colour===goal.colour;
    const conditionsSatisfied=wornMatches&&(goal.passage===undefined||state.passage===goal.passage);
    const owned=new Map();
    if(goal.kind==='purchase-and-equip'){
      if(list.includes(undefined)||list.some(i=>!i||typeof i.variable!=='string'))return {status:'unavailable',satisfied:null,source:'original variant inventory count unavailable'};
      // Ownership uses the complete original variant count, independent of
      // whether an item is currently a safe equipment candidate.
      for(const i of list)if(i.colour===goal.colour&&i.pattern==null)owned.set(identity(i),(owned.get(identity(i))||0)+1);
    }
    return {status:'available',satisfied:goal.kind==='equip-matching'&&conditionsSatisfied,source:'original requested colour/simple item condition, worn slot and Passage',
      wornMatches,passage:state.passage,worn:{variable:item.variable,colour:item.colour??null,modder:item.modder??null,accessoryColour:item.accessory_colour??null},items,itemsTruncated:matching.length>64,
      ...(goal.kind==='purchase-and-equip'?{conditionsSatisfied,turns:state.turns,receiptContext:window.__paisleyParkGameplayReceiptsV1?.nonce??null,
        owned:[...owned.entries()].slice(0,64).map(([variant,count])=>({variant:JSON.parse(variant),count})),ownedTruncated:owned.size>64}:{} )};
  }
  else if(goal.kind==='purchase-one') {
    const v=state.variables,list=v?.wardrobe?.head;
    if(!Array.isArray(list)||list.length>512||!Number.isSafeInteger(v.money))return {status:'unavailable',satisfied:null,source:'bounded original purchase state unavailable'};
    const count=list.filter(i=>i?.variable===goal.variable&&(i.colour??null)===goal.colour&&(i.accessory_colour??null)===goal.accessoryColour&&(i.modder??null)===(goal.modder??null)&&i.pattern==null).length;
    const spent=goal.baselineMoney-v.money;
    return {status:'available',satisfied:spent>0 && spent<=goal.maxSpend && count===goal.baselineCount+1,priceMatches:spent===goal.unitCost,
      source:'original SugarCube currency and exact variant head inventory count',money:v.money,count,spent,quotedCost:goal.unitCost,passage:state.passage};
  } else {
    const worn = state.variables?.worn;
    if (!worn || !Object.prototype.hasOwnProperty.call(worn, goal.slot) || !worn[goal.slot]) return { status: 'unavailable', satisfied: null, source: 'original worn slot unavailable' };
    const item = worn[goal.slot];
    satisfied = item.variable === goal.variable && (item.colour ?? null) === goal.colour && (item.modder ?? null) === (goal.modder ?? null) &&
      (goal.accessoryColour===undefined||(item.accessory_colour??null)===goal.accessoryColour);
  }
  return { status: 'available', satisfied, source: goal.kind === 'equip' ? 'original SugarCube worn slot fields' : 'original SugarCube Passage and current DOM', passage: state.passage };
}

module.exports={validate,goalReader,validateQuote,quoteFromShop,validatePurchaseReceipt,canPrepare,purchaseSatisfied};
