const {createHash}=require('node:crypto');
const predicates=require('./game-goal-reader.cjs');
const semantic=require('./game-semantic.cjs');
const shop=require('./game-shop.cjs');
const wardrobe=require('../../integrations/soft-and-wet/gameplay.cjs');
const nativeWardrobe=require('./game-wardrobe.cjs');

const id='clothing';
const hash=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const keys=(value,allowed)=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key));
const purchase=g=>['purchase-one','purchase-and-equip'].includes(g?.kind);
const supportsGoal=g=>['equip','equip-matching','purchase-one','purchase-and-equip'].includes(g?.kind);
const validateRequest=predicates.validate;

function validateGoal(g){
  if(!supportsGoal(g)||!keys(g,['description','kind','passage','slot','variable','colour','modder','accessoryColour','baselineMoney','baselineCount','unitCost','maxSpend']))return false;
  try{
    validateRequest({name:'predicate',mode:'gameplay',goal:Object.fromEntries(Object.entries(g).filter(([key])=>key!=='description')),budget:{timeoutMs:1000,maxActions:1,maxObservations:1,maxSpend:purchase(g)?Math.max(1,g.maxSpend||1):1}});
    return true;
  }catch{return false}
}

function probe(g){
  return async client=>{
    const proof=await client.evaluate(`(${predicates.goalReader.toString()})(${JSON.stringify(g)})`);
    if(['equip-matching','purchase-and-equip'].includes(g.kind)&&proof?.status==='available'&&proof.passage==='Wardrobe'){
      proof.equipmentActions=(await client.evaluate(`(${JSON.stringify(proof.items)}).map(item=>{const {name,...fields}=item;const native=typeof window.DoLGameUI==='undefined',request={type:native?'dol-wardrobe':'sw-wardrobe',operation:'equip',slot:'head',...fields};const proof=native?(${nativeWardrobe.reader.toString()})(request):(${wardrobe.reader.toString()})(request);return proof.status==='available'?{request,label:name}:null}).filter(Boolean)`))
        .filter(({request})=>{try{(request.type==='dol-wardrobe'?nativeWardrobe:wardrobe).validate(request);return true}catch{return false}});
    }
    return {...proof,observedAt:new Date().toISOString()};
  };
}

async function observe(client,g){
  if(!purchase(g))return {};
  try{return {shop:await shop.inspect(client)}}
  catch(error){if(error.code!=='MAPPING_UNAVAILABLE')throw error;return {shop:{status:'unsupported',source:'reviewed original DoL shop mapping',reason:'verified-selected-shop-context-unavailable'}}}
}

function candidates(facts,epoch,proof,shopState,g){
  const equipment=(proof?.equipmentActions||[]).map(({request,label})=>({ref:hash([epoch,request]),kind:'equip',cost:0,risk:'normal',label,selected:request,capability:{provider:id,name:'wardrobe'}}));
  const commerce=[],browse=[];
  if(facts.passage==='Clothing Shop')for(const c of facts.choices||[]){
    if(c.safe&&c.tag==='a'&&c.destination===null&&!c.requiresQuote&&typeof c.selector==='string'){
      const selected={type:'dol-shop',operation:'browse',selector:c.selector};
      browse.push({ref:hash([epoch,selected]),kind:'menu',cost:0,risk:'normal',label:c.label,selected,capability:{provider:id,name:'shop'}});
    }
  }
  if(facts.passage==='Clothing Shop'&&facts.choices?.some(c=>c.safe&&c.destination===null&&/^(?:\([^)]*\)\s*)?(?:返回|返回到商店|Back|Back to shop)$/i.test(c.label))){
    const selected={type:'dol-shop',operation:'return-menu'};
    commerce.push({ref:hash([epoch,selected]),kind:'menu',cost:0,risk:'normal',label:'Return through original shop menu',selected,capability:{provider:id,name:'shop'}});
  }
  const quote=predicates.quoteFromShop(shopState,g||{});
  if(quote){
    const buy=shopState.quantity===1,selected={type:'dol-shop',operation:buy?'buy-one':'quantity-one'};
    commerce.push({ref:hash([epoch,selected,quote]),kind:buy?'buy':'menu',cost:buy?quote.unitCost:0,risk:'normal',label:buy?'Buy one '+quote.variant.variable:'Set original quantity to one',selected,quote,capability:{provider:id,name:'shop'}});
  }
  if(g?.kind==='purchase-one'&&shopState?.status==='available'&&shopState.variable===g.variable&&shopState.colour===g.colour&&shopState.accessoryColour===g.accessoryColour&&(shopState.modder??null)===(g.modder??null)&&shopState.pattern==null&&shopState.destination==='wardrobe'&&shopState.money===g.baselineMoney&&shopState.count===g.baselineCount&&shopState.cost===g.unitCost&&shopState.cost<=g.maxSpend&&shopState.space>=1){
    const buy=shopState.quantity===1,selected={type:'dol-shop',operation:buy?'buy-one':'quantity-one'};
    commerce.push({ref:hash([epoch,selected,shopState]),kind:buy?'buy':'menu',cost:buy?shopState.cost:0,risk:'normal',label:buy?'Buy one '+g.variable:'Set original quantity to one',selected,capability:{provider:id,name:'shop'}});
  }
  return [...equipment,...commerce,...browse].slice(0,64);
}

function validateAction(selected,intent,g){
  let mapping;
  if(selected?.type==='sw-wardrobe'){
    mapping=wardrobe;mapping.validate(selected);
    if(intent!==(selected.operation==='select-slot'?'menu':selected.operation))throw Error('Wardrobe intent mismatch');
  }else if(selected?.type==='dol-wardrobe'){
    mapping=nativeWardrobe;mapping.validate(selected);
    if(intent!==selected.operation)throw Error('Wardrobe intent mismatch');
  }else if(selected?.type==='dol-shop'){
    mapping=shop;mapping.validate(selected);
    if(intent!==(selected.operation==='buy-one'?'buy':'menu')||selected.operation==='buy-one'&&!purchase(g))throw Error('Shop intent/Goal mismatch');
  }else throw Error('Unsupported clothing action');
  if(!semantic.intents.includes(intent)||intent==='buy'&&selected.type!=='dol-shop')throw Error('Unreviewed purchase/intent');
  return mapping;
}

function validateDescriptor(c,g){
  if(!keys(c,['ref','kind','cost','risk','selected','label','destination','quote','capability'])||!Number.isSafeInteger(c.cost)||c.cost<0||c.risk!=='normal'||typeof c.ref!=='string'||!semantic.intents.includes(c.kind))throw Error('Invalid reviewed candidate');
  const name=['sw-wardrobe','dol-wardrobe'].includes(c.selected?.type)?'wardrobe':c.selected?.type==='dol-shop'?'shop':null;
  if(!name||!keys(c.capability,['provider','name'])||c.capability.provider!==id||c.capability.name!==name)throw Error('Invalid clothing capability');
  validateAction(c.selected,c.kind,g);
  if(['return-menu','browse'].includes(c.selected.operation)&&(c.cost!==0||c.quote!==undefined))throw Error('Invalid shop menu cost/quote');
  if(c.quote!==undefined&&(g.kind!=='purchase-and-equip'||!predicates.validateQuote(c.quote,g)||c.selected.type!=='dol-shop'||c.cost!==(c.kind==='buy'?c.quote.unitCost:0))||g.kind==='purchase-and-equip'&&c.kind==='buy'&&!c.quote||g.kind==='purchase-one'&&c.kind==='buy'&&c.cost!==g.unitCost)throw Error('Invalid reviewed candidate');
  return c;
}

function legacyDescriptor(selected,intent,g,ref){
  const descriptor={ref,kind:intent,cost:intent==='buy'?g.unitCost:0,risk:'normal',selected,
    capability:{provider:id,name:['sw-wardrobe','dol-wardrobe'].includes(selected?.type)?'wardrobe':'shop'}};
  return validateDescriptor(descriptor,g);
}

function authorizeCostedControl(mapping,descriptor,g){
  const selected=descriptor?.selected;
  const current=mapping?.interpretation;
  if(selected?.type!=='dol-shop'||selected.operation!=='buy-one'||descriptor.kind!=='buy'||!purchase(g)||
    mapping.action?.type!=='web-click'||mapping.action.selector!=='#buy-send-home > .buy-button > .buy-button-inner'||
    current?.operation!=='buy-one'||!Number.isSafeInteger(current.cost)||current.cost!==descriptor.cost)return false;
  if(g.kind==='purchase-and-equip'){
    const q=descriptor.quote,v=q?.variant;
    return !!q&&predicates.validateQuote(q,g)&&descriptor.cost===q.unitCost&&current.variable===v.variable&&current.colour===v.colour&&
      current.accessoryColour===v.accessoryColour&&(current.modder??null)===v.modder&&current.money===q.baselineMoney&&
      current.count===q.baselineCount&&current.wornCount===q.baselineWornCount;
  }
  return descriptor.quote===undefined&&descriptor.cost===g.unitCost&&descriptor.cost<=g.maxSpend&&current.variable===g.variable&&
    current.colour===g.colour&&current.accessoryColour===g.accessoryColour&&(current.modder??null)===(g.modder??null)&&
    current.money===g.baselineMoney&&current.count===g.baselineCount;
}

function prepare(client,descriptor,g,attemptId){
  validateDescriptor(descriptor,g);
  const selected=descriptor.selected,mapping=validateAction(selected,descriptor.kind,g);
  if(mapping===wardrobe&&['equip','unequip'].includes(selected.operation))return require('../../integrations/soft-and-wet/native-head.cjs').prepare(client,selected,attemptId);
  if(mapping===nativeWardrobe)return require('./game-wardrobe-native.cjs').prepare(client,selected,attemptId);
  if(mapping===shop&&['return-menu','browse'].includes(selected.operation))return require('./game-shop-menu-native.cjs').prepare(client,selected,g,attemptId);
  const mappedGoal=descriptor.quote?{kind:'purchase-one',...descriptor.quote.variant,baselineMoney:descriptor.quote.baselineMoney,baselineCount:descriptor.quote.baselineCount,unitCost:descriptor.quote.unitCost,maxSpend:descriptor.quote.unitCost}:g;
  if(mapping===shop&&selected.operation==='buy-one'&&descriptor.quote)return require('./game-shop-native.cjs').prepare(client,selected,mappedGoal,attemptId,{quote:descriptor.quote});
  return mapping.prepare(client,selected,mappedGoal,{quote:descriptor.quote});
}

const satisfied=predicates.purchaseSatisfied,canPrepare=predicates.canPrepare;
const validateReceipt=(r,e)=>e.action?.selected?.type==='dol-wardrobe'?nativeWardrobe.validateReceipt(r,e):['return-menu','browse'].includes(e.action?.selected?.operation)?require('./game-shop-menu-native.cjs').validateReceipt(r,e):predicates.validatePurchaseReceipt(r,e);
function publicProof(s){
  const proof=s.scene?.goalProof??null;
  return s.config.goal.kind==='purchase-and-equip'&&proof?{...proof,satisfied:s.goalSatisfied,source:'fresh original condition and variant state plus verified Session purchase witness',conditionSource:proof.source}:proof;
}
function publicOutcome(effectResult){
  const quote=effectResult?.descriptor?.quote;
  return quote?{...effectResult,quote}:effectResult;
}
const traceProgress=proof=>[proof.satisfied,proof.worn??null,proof.count??null,proof.wornMatches??null,proof.owned??null];

module.exports={id,supportsGoal,validateRequest,validateGoal,probe,observe,candidates,validateAction,validateDescriptor,legacyDescriptor,authorizeCostedControl,prepare,satisfied,validateReceipt,canPrepare,publicProof,publicOutcome,traceProgress};
