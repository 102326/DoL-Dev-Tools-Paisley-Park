import type cdp from './cdp.cjs';
import type semanticAPI from './game-semantic.cjs';
import type predicatesAPI from './game-goal-reader.cjs';
// External data is cast only to property-access views; checks retain runtime authority.
type View=Record<string,unknown>;
type Client=Pick<cdp.Client,'send'|'evaluate'>;
interface GoalView extends View {kind:unknown;colour?:unknown;variable?:unknown;accessoryColour?:unknown;modder?:unknown;baselineMoney?:unknown;baselineCount?:unknown;unitCost?:unknown;maxSpend?:unknown}
interface SelectionView extends View {type:unknown;operation:unknown}
interface Equipment {request:unknown;label:unknown}
interface ProofView extends View {status?:unknown;passage?:unknown;items?:unknown;equipmentActions?:Equipment[];source?:unknown}
interface ChoiceView extends View {safe?:unknown;tag?:unknown;destination?:unknown;requiresQuote?:unknown;selector?:unknown;label:unknown}
interface FactsView {passage?:unknown;choices?:ChoiceView[]}
interface ShopView extends View {status?:unknown;quantity?:unknown;variable?:unknown;colour?:unknown;accessoryColour?:unknown;modder?:unknown;pattern?:unknown;destination?:unknown;money?:unknown;count?:unknown;cost?:unknown;space?:unknown}
interface Candidate extends View {cost:unknown}
interface DescriptorView extends View {selected:SelectionView;kind:unknown;cost:unknown;quote?:predicatesAPI.Quote;capability?:View}
interface MappingView extends View {action?:View;interpretation?:View}
interface EffectView {action?:{selected?:SelectionView}}
interface SessionView {scene?:{goalProof?:ProofView};config:{goal:GoalView};goalSatisfied?:unknown}
interface OutcomeView extends View {descriptor?:{quote?:unknown}}
const {createHash}:typeof import('node:crypto')=require('node:crypto');
const predicates:typeof import('./game-goal-reader.cjs')=require('./game-goal-reader.cjs');
const {withinSpend}:typeof import('./game-spend.cjs')=require('./game-spend.cjs');
const semantic:typeof import('./game-semantic.cjs')=require('./game-semantic.cjs');
const shop:typeof import('./game-shop.cjs')=require('./game-shop.cjs');
const wardrobe:typeof import('../../integrations/soft-and-wet/gameplay.cjs')=require('../../integrations/soft-and-wet/gameplay.cjs');
const nativeWardrobe:typeof import('./game-wardrobe.cjs')=require('./game-wardrobe.cjs');

const id='clothing';
const hash=(value:unknown)=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const keys=(value:unknown,allowed:readonly string[]):value is View=>!!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).every(key=>allowed.includes(key));
const purchase=(raw:unknown)=>{const g=raw as GoalView|null|undefined;return ['purchase-one','purchase-and-equip'].includes(g?.kind as string)};
const supportsGoal=(raw:unknown)=>{const g=raw as GoalView|null|undefined;return ['equip','equip-matching','purchase-one','purchase-and-equip'].includes(g?.kind as string)};
const validateRequest=predicates.validate;

function validateGoal(raw:unknown){const g=raw as GoalView;
  if(!supportsGoal(g)||!keys(g,['description','kind','passage','slot','variable','colour','modder','accessoryColour','baselineMoney','baselineCount','unitCost','maxSpend']))return false;
  try{
    validateRequest({name:'predicate',mode:'gameplay',goal:Object.fromEntries(Object.entries(g).filter(([key])=>key!=='description')),budget:{timeoutMs:1000,maxActions:1,maxObservations:1,maxSpend:g.maxSpend===undefined?null:g.maxSpend}});
    return true;
  }catch{return false}
}

function probe(raw:unknown){const g=raw as GoalView;
  return async (client:Client):Promise<unknown>=>{
    const proof=await client.evaluate(`(${predicates.goalReader.toString()})(${JSON.stringify(g)})`) as ProofView;
    if(['equip-matching','purchase-and-equip'].includes(g.kind as string)&&proof?.status==='available'&&proof.passage==='Wardrobe'){
      proof.equipmentActions=(await client.evaluate(`(${JSON.stringify(proof.items)}).map(item=>{const {name,...fields}=item;const native=typeof window.DoLGameUI==='undefined',request={type:native?'dol-wardrobe':'sw-wardrobe',operation:'equip',slot:'head',...fields};const proof=native?(${nativeWardrobe.reader.toString()})(request):(${wardrobe.reader.toString()})(request);return proof.status==='available'?{request,label:name}:null}).filter(Boolean)`) as Equipment[])
        .filter(({request})=>{try{((request as SelectionView).type==='dol-wardrobe'?nativeWardrobe:wardrobe).validate(request);return true}catch{return false}});
    }
    return {...proof,observedAt:new Date().toISOString()};
  };
}

async function observe(client:Client,g:unknown){
  if(!purchase(g))return {};
  try{return {shop:await shop.inspect(client)}}
  catch(error){if((error as {code?:unknown}|null)?.code!=='MAPPING_UNAVAILABLE')throw error;return {shop:{status:'unsupported',source:'reviewed original DoL shop mapping',reason:'verified-selected-shop-context-unavailable'}}}
}

function candidates(rawFacts:unknown,epoch:unknown,rawProof:unknown,rawShop:unknown,rawg:unknown){const facts=rawFacts as FactsView,proof=rawProof as ProofView|null|undefined,shopState=rawShop as ShopView,g=rawg as GoalView;
  const equipment=(proof?.equipmentActions||[]).map(({request,label})=>({ref:hash([epoch,request]),kind:'equip',cost:0,risk:'normal',label,selected:request,capability:{provider:id,name:'wardrobe'}}));
  const commerce:Candidate[]=[],browse:Candidate[]=[];
  if(facts.passage==='Clothing Shop')for(const c of facts.choices||[]){
    if(c.safe&&c.tag==='a'&&c.destination===null&&!c.requiresQuote&&typeof c.selector==='string'){
      const selected={type:'dol-shop',operation:'browse',selector:c.selector};
      browse.push({ref:hash([epoch,selected]),kind:'menu',cost:0,risk:'normal',label:c.label,selected,capability:{provider:id,name:'shop'}});
    }
  }
  if(facts.passage==='Clothing Shop'&&facts.choices?.some(c=>c.safe&&c.destination===null&&/^(?:\([^)]*\)\s*)?(?:返回|返回到商店|Back|Back to shop)$/i.test(c.label as string))){
    const selected={type:'dol-shop',operation:'return-menu'};
    commerce.push({ref:hash([epoch,selected]),kind:'menu',cost:0,risk:'normal',label:'Return through original shop menu',selected,capability:{provider:id,name:'shop'}});
  }
  const quote=predicates.quoteFromShop(shopState,g||{});
  if(quote&&shopState.quantity===1){
    const selected={type:'dol-shop',operation:'buy-one'};
    commerce.push({ref:hash([epoch,selected,quote]),kind:'buy',cost:quote.unitCost,risk:'normal',label:'Buy one '+quote.variant.variable,selected,quote,capability:{provider:id,name:'shop'}});
  }
  if(g?.kind==='purchase-one'&&shopState?.status==='available'&&shopState.quantity===1&&shopState.variable===g.variable&&shopState.colour===g.colour&&shopState.accessoryColour===g.accessoryColour&&(shopState.modder??null)===(g.modder??null)&&shopState.pattern==null&&shopState.destination==='wardrobe'&&shopState.money===g.baselineMoney&&shopState.count===g.baselineCount&&shopState.cost===g.unitCost&&withinSpend(shopState.cost,g.maxSpend)&&(shopState.space as number)>=1){
    const selected={type:'dol-shop',operation:'buy-one'};
    const quote=predicates.quoteFromShop(shopState,{kind:'purchase-and-equip',slot:'head',colour:g.colour});
    if(quote)commerce.push({ref:hash([epoch,selected,quote]),kind:'buy',cost:shopState.cost,risk:'normal',label:'Buy one '+g.variable,selected,quote,capability:{provider:id,name:'shop'}});
  }
  return [...equipment,...commerce,...browse].slice(0,64);
}

function validateAction(raw:unknown,intent:unknown,g:unknown){const selected=raw as SelectionView;
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
  if(!semantic.intents.includes(intent as semanticAPI.Intent)||intent==='buy'&&selected.type!=='dol-shop')throw Error('Unreviewed purchase/intent');
  return mapping;
}

function validateDescriptor(raw:unknown,rawg:unknown){const c=raw as DescriptorView,g=rawg as GoalView;
  if(!keys(c,['ref','kind','cost','risk','selected','label','destination','quote','capability'])||!Number.isSafeInteger(c.cost)||(c.cost as number)<0||c.risk!=='normal'||typeof c.ref!=='string'||!semantic.intents.includes(c.kind as semanticAPI.Intent))throw Error('Invalid reviewed candidate');
  const name=['sw-wardrobe','dol-wardrobe'].includes(c.selected?.type as string)?'wardrobe':c.selected?.type==='dol-shop'?'shop':null;
  if(!name||!keys(c.capability,['provider','name'])||c.capability.provider!==id||c.capability.name!==name)throw Error('Invalid clothing capability');
  validateAction(c.selected,c.kind,g);
  if(['return-menu','browse'].includes(c.selected.operation as string)&&(c.cost!==0||c.quote!==undefined))throw Error('Invalid shop menu cost/quote');
  if(c.quote!==undefined&&(!purchase(g)||!predicates.validateQuote(c.quote,g)||c.selected.type!=='dol-shop'||c.cost!==(c.kind==='buy'?c.quote.unitCost:0)||
    g.kind==='purchase-one'&&(c.quote.variant.variable!==g.variable||c.quote.variant.accessoryColour!==g.accessoryColour||c.quote.variant.modder!==(g.modder??null)||c.quote.baselineMoney!==g.baselineMoney||c.quote.baselineCount!==g.baselineCount||c.quote.unitCost!==g.unitCost))||g.kind==='purchase-and-equip'&&c.kind==='buy'&&!c.quote||g.kind==='purchase-one'&&c.kind==='buy'&&c.cost!==g.unitCost)throw Error('Invalid reviewed candidate');
  return raw;
}

function legacyDescriptor(raw:unknown,intent:unknown,rawg:unknown,ref:unknown){const selected=raw as SelectionView,g=rawg as GoalView;
  assertTerminalSupport(selected);
  const descriptor={ref,kind:intent,cost:intent==='buy'?g.unitCost:0,risk:'normal',selected,
    capability:{provider:id,name:['sw-wardrobe','dol-wardrobe'].includes(selected?.type as string)?'wardrobe':'shop'}};
  return validateDescriptor(descriptor,g);
}

function assertTerminalSupport(raw:unknown){const selected=raw as SelectionView;
  if(selected?.type==='dol-shop'&&selected.operation==='quantity-one'||selected?.type==='sw-wardrobe'&&selected.operation==='select-slot')throw Object.assign(Error('This preparation control has no reviewed terminal Outcome. GER supports purchases with quantity already one and wardrobe actions with the slot already selected. Existing Unknown effects remain unresolved.'),{code:'MAPPING_UNAVAILABLE'});
}

function authorizeCostedControl(rawMapping:unknown,rawDescriptor:unknown,rawg:unknown){const mapping=rawMapping as MappingView,descriptor=rawDescriptor as DescriptorView,g=rawg as GoalView;
  try{validateDescriptor(descriptor,g)}catch{return false}
  const selected=descriptor?.selected;
  const current=mapping?.interpretation;
  if(selected?.type!=='dol-shop'||selected.operation!=='buy-one'||descriptor.kind!=='buy'||!purchase(g)||
    mapping.action?.type!=='web-click'||mapping.action.selector!=='#buy-send-home > .buy-button > .buy-button-inner'||
    current?.operation!=='buy-one'||!Number.isSafeInteger(current.cost)||current.cost!==descriptor.cost)return false;
  if(g.kind==='purchase-and-equip'||descriptor.quote){
    const q=descriptor.quote,v=q?.variant;
    return !!q&&predicates.validateQuote(q,g)&&descriptor.cost===q.unitCost&&(g.kind!=='purchase-one'||withinSpend(descriptor.cost,g.maxSpend))&&current.variable===v!.variable&&current.colour===v!.colour&&
      current.accessoryColour===v!.accessoryColour&&(current.modder??null)===v!.modder&&current.money===q.baselineMoney&&
      current.count===q.baselineCount&&current.wornCount===q.baselineWornCount;
  }
  return descriptor.quote===undefined&&descriptor.cost===g.unitCost&&withinSpend(descriptor.cost,g.maxSpend)&&current.variable===g.variable&&
    current.colour===g.colour&&current.accessoryColour===g.accessoryColour&&(current.modder??null)===(g.modder??null)&&
    current.money===g.baselineMoney&&current.count===g.baselineCount;
}

function prepare(client:Client,raw:unknown,rawg:unknown,attemptId:unknown,{scope}:{scope?:unknown}={}){const descriptor=raw as DescriptorView,g=rawg as GoalView;
  assertTerminalSupport(descriptor.selected);
  validateDescriptor(descriptor,g);
  const selected=descriptor.selected,mapping=validateAction(selected,descriptor.kind,g);
  if(mapping===wardrobe&&['equip','unequip'].includes(selected.operation as string))return (require('../../integrations/soft-and-wet/native-head.cjs') as typeof import('../../integrations/soft-and-wet/native-head.cjs')).prepare(client,selected,attemptId);
  if(mapping===nativeWardrobe)return (require('./game-wardrobe-native.cjs') as typeof import('./game-wardrobe-native.cjs')).prepare(client,selected,attemptId,{scope});
  if(mapping===shop&&['return-menu','browse'].includes(selected.operation as string))return (require('./game-shop-menu-native.cjs') as typeof import('./game-shop-menu-native.cjs')).prepare(client,selected,g,attemptId,{scope});
  const mappedGoal=descriptor.quote?{kind:'purchase-one',...descriptor.quote.variant,baselineMoney:descriptor.quote.baselineMoney,baselineCount:descriptor.quote.baselineCount,unitCost:descriptor.quote.unitCost,maxSpend:descriptor.quote.unitCost}:g;
  if(mapping===shop&&selected.operation==='buy-one'&&descriptor.quote)return (require('./game-shop-native.cjs') as typeof import('./game-shop-native.cjs')).prepare(client,selected,mappedGoal,attemptId,{quote:descriptor.quote,scope});
  // Legacy unquoted attempts keep their original history; new writes require terminal proof.
  if(mapping===shop&&selected.operation==='buy-one')throw Object.assign(Error('Native purchase terminal quote unavailable'),{code:'MAPPING_UNAVAILABLE'});
  // Legacy JS passes two extra arguments to the wardrobe mapping; it ignores them.
  // Keep the actual producer return union rather than promising a synthetic Mapping.
  type LegacyPrepare=(...args:Parameters<typeof shop.prepare>)=>ReturnType<typeof wardrobe.prepare>|ReturnType<typeof shop.prepare>;
  return (mapping as {prepare:LegacyPrepare}).prepare(client,selected,mappedGoal,{quote:descriptor.quote});
}

const satisfied=predicates.purchaseSatisfied,canPrepare=predicates.canPrepare;
const validateReceipt=(r:unknown,raw:unknown)=>{const e=raw as EffectView;return e.action?.selected?.type==='dol-wardrobe'?nativeWardrobe.validateReceipt(r,e):['return-menu','browse'].includes(e.action?.selected?.operation as string)?(require('./game-shop-menu-native.cjs') as typeof import('./game-shop-menu-native.cjs')).validateReceipt(r,e):predicates.validatePurchaseReceipt(r,e)};
function publicProof(raw:unknown):unknown{const s=raw as SessionView;
  const proof=s.scene?.goalProof??null;
  return s.config.goal.kind==='purchase-and-equip'&&proof?{...proof,satisfied:s.goalSatisfied,source:'fresh original condition and variant state plus verified Session purchase witness',conditionSource:proof.source}:proof;
}
function publicOutcome(raw:unknown):unknown{const effectResult=raw as OutcomeView|null|undefined;
  const quote=effectResult?.descriptor?.quote;
  return quote?{...effectResult,quote}:effectResult;
}
const traceProgress=(raw:unknown)=>{const proof=raw as ProofView;return [proof.satisfied,proof.worn??null,proof.count??null,proof.wornMatches??null,proof.owned??null]};

const clothing={id,supportsGoal,validateRequest,validateGoal,probe,observe,candidates,validateAction,validateDescriptor,legacyDescriptor,assertTerminalSupport,authorizeCostedControl,prepare,satisfied,validateReceipt,canPrepare,publicProof,publicOutcome,traceProgress};

export = clothing;
