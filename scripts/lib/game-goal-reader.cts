import type browserGoal from './browser/goal-reader.cjs';
declare namespace predicates {
 type Goal={kind:'reach-passage';passage:string}|{kind:'equip-matching'|'purchase-and-equip';slot:'head';colour:string;passage?:string}|{kind:'equip';slot:unknown;variable:string;colour:string|null|0;modder?:string|null;accessoryColour?:string|null|0}|{kind:'purchase-one';slot:'head';variable:string;colour:string;modder?:string|null;accessoryColour:string;baselineMoney:number;baselineCount:number;unitCost:number;maxSpend:number|null};
 interface Budget {timeoutMs:number;maxActions:number;maxObservations:number;maxReplans?:number;maxSpend?:number|null}
 interface Request {name:unknown;description?:string;mode:'gameplay'|'development';goal:Goal;budget:Budget;requiredCheckpoints?:string[]}
 interface Variant {slot:'head';variable:'hairpin'|'beanie';colour:string;accessoryColour:string;modder:string|null}
 interface Quote {variant:Variant;baselineMoney:number;baselineCount:0;baselineWornCount:0;unitCost:number}
 interface Context {effects:EffectView[];spent:unknown;budget:{maxSpend:unknown};reserved:unknown}
}
type View=Record<string,unknown>;
interface GoalView extends View {kind?:unknown}
interface QuoteView extends View {variant?:View}
interface ActionView extends View {quote?:QuoteView;selected?:View}
interface ReceiptView extends View {evidence?:View}
interface EffectView extends View {action:ActionView;result?:ReceiptView;executionBinding?:View}
interface SceneView {goalProof:View}
const {goalReader}:typeof import('./browser/goal-reader.cjs')=require('./browser/goal-reader.cjs');
// Reviewed original-state predicates shared by Runtime and direct probes.
const {validLimit,withinSpend}:typeof import('./game-spend.cjs')=require('./game-spend.cjs');
const keys=(v:unknown,allowed:readonly string[]):v is View=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const bounded=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\u0000-\u001f]/.test(v);
function checkRequest(raw:unknown):asserts raw is View {
  const request=raw as View;
  if (!keys(request, ['name', 'description', 'mode', 'goal', 'budget','requiredCheckpoints']) || !/^[A-Za-z0-9._-]{1,64}$/.test((request.name || '') as string) || !['gameplay', 'development'].includes(request.mode as string) ||
    request.description!==undefined&&(typeof request.description!=='string'||!request.description.trim()||request.description.length>512||/[\u0000-\u001f]/.test(request.description))) throw Error('Invalid Goal request');
  if(request.requiredCheckpoints!==undefined&&(request.mode!=='development'||!Array.isArray(request.requiredCheckpoints)||request.requiredCheckpoints.length>8||!request.requiredCheckpoints.every(bounded)||new Set(request.requiredCheckpoints).size!==request.requiredCheckpoints.length))throw Error('Invalid required checkpoints');
  const g = request.goal as GoalView;
  if (g?.kind === 'reach-passage') {
    if (!keys(g, ['kind', 'passage']) || !bounded(g.passage)) throw Error('Invalid passage Goal');
  } else if(['equip-matching','purchase-and-equip'].includes(g?.kind as string)) {
    if(!keys(g,['kind','slot','colour','passage'])||g.slot!=='head'||!bounded(g.colour)||['random','custom'].includes(g.colour)||g.passage!==undefined&&!bounded(g.passage))throw Error('Invalid conditional equipment Goal');
  } else if (['equip','purchase-one'].includes(g?.kind as string)) {
    if (!keys(g, ['kind', 'slot', 'variable', 'colour', 'modder','accessoryColour',...(g.kind==='purchase-one'?['baselineMoney','baselineCount','unitCost','maxSpend']:[])]) || !/^[a-z][a-z_]{0,31}$/.test((g.slot || '') as string) || ['constructor', 'prototype', '__proto__'].includes(g.slot as string) ||
      !bounded(g.variable) || !(bounded(g.colour) || g.colour === null || g.colour === 0) || !(g.modder === undefined || g.modder === null || bounded(g.modder)) ||
      !(g.accessoryColour===undefined||g.accessoryColour===null||g.accessoryColour===0||bounded(g.accessoryColour))) throw Error('Invalid equipment Goal');
    if(g.kind==='purchase-one' && (g.slot!=='head'||!bounded(g.colour)||!bounded(g.accessoryColour)||['random','custom'].includes(g.colour)||['random','custom'].includes(g.accessoryColour)||
       !Number.isSafeInteger((g.baselineMoney as number))||(g.baselineMoney as number)<0||!Number.isSafeInteger((g.baselineCount as number))||(g.baselineCount as number)<0||(g.baselineCount as number)>511||
       !Number.isSafeInteger((g.unitCost as number))||(g.unitCost as number)<0||(g.unitCost as number)>(g.baselineMoney as number)||g.maxSpend!==undefined&&(!validLimit(g.maxSpend)||!withinSpend((g.unitCost as number),g.maxSpend))))throw Error('Invalid one-item purchase Goal');
  } else throw Error('Unsupported Goal kind');
  const b = request.budget as View;
  if (!keys(b, ['timeoutMs', 'maxActions', 'maxObservations','maxReplans','maxSpend']) || !Number.isInteger((b.timeoutMs as number)) || (b.timeoutMs as number) < 1000 || (b.timeoutMs as number) > 3600000 ||
    !Number.isInteger((b.maxActions as number)) || (b.maxActions as number) < 1 || (b.maxActions as number) > 64 || !Number.isInteger((b.maxObservations as number)) || (b.maxObservations as number) < 1 || (b.maxObservations as number) > 192) throw Error('Invalid Goal budget');
  if((b.maxReplans as number)!==undefined&&(!Number.isSafeInteger((b.maxReplans as number))||(b.maxReplans as number)<1||(b.maxReplans as number)>192)||b.maxSpend!==undefined&&!validLimit(b.maxSpend))throw Error('Invalid additional Goal budget');
}
function validate(raw:unknown):predicates.Request {
  checkRequest(raw);
  const result:unknown=JSON.parse(JSON.stringify(raw));
  // Check the data actually returned: inherited fields or toJSON must not erase
  // requirements that were present only during the first validation.
  checkRequest(result);
  const g=result.goal as GoalView;
  if(g.kind==='purchase-one'&&g.maxSpend===undefined)(result.goal as View).maxSpend=null;
  return result as unknown as predicates.Request;
}

const nonnegative=(v:unknown):v is number=>Number.isSafeInteger(v)&&(v as number)>=0;
const variantKeys=['slot','variable','colour','accessoryColour','modder'];
const sameVariant=(a:unknown,b:unknown)=>variantKeys.every(k=>(a as View|null|undefined)?.[k]===(b as View|null|undefined)?.[k]);
function validateQuote(raw:unknown,g:{colour?:unknown}):raw is predicates.Quote{
  const q=raw as QuoteView;
  return keys(q,['variant','baselineMoney','baselineCount','baselineWornCount','unitCost'])&&keys(q.variant,variantKeys)&&q.variant.slot==='head'&&
    ['hairpin','beanie'].includes(q.variant.variable as string)&&bounded(q.variant.colour)&&q.variant.colour===g.colour&&bounded(q.variant.accessoryColour)&&!['random','custom'].includes(q.variant.accessoryColour)&&
    (q.variant.modder===null||bounded(q.variant.modder))&&nonnegative(q.baselineMoney)&&q.baselineCount===0&&q.baselineWornCount===0&&nonnegative(q.unitCost)&&q.unitCost<=q.baselineMoney;
}
function quoteFromShop(raw:unknown,g:browserGoal.Goal):predicates.Quote|null{
  const shop=raw as View|null|undefined;
  if(g.kind!=='purchase-and-equip'||shop?.status!=='available'||shop.pattern!=null||shop.destination!=='wardrobe'||!Number.isFinite((shop.space as number))||(shop.space as number)<1||!Number.isSafeInteger((shop.quantity as number))||(shop.quantity as number)<1||(shop.quantity as number)>512)return null;
  const q={variant:{slot:'head',variable:shop.variable,colour:shop.colour,accessoryColour:shop.accessoryColour,modder:shop.modder??null},baselineMoney:shop.money,baselineCount:shop.count,baselineWornCount:shop.wornCount,unitCost:shop.cost};
  return validateQuote(q,g)?q:null;
}
function validatePurchaseReceipt(r:unknown,e:unknown):boolean{
  const verified=(require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).receipt(r,e) as {r:ReceiptView;e:EffectView}|null;if(!verified)return false;const receipt=verified.r,effect=verified.e;
  const q=effect.action?.quote;
  if(!q||effect.action.kind!=='buy')return receipt.evidence===undefined;
  if(receipt.outcome!=='occurred'||!receipt.remoteClosed)return receipt.evidence===undefined;
  const p=receipt.evidence;
  return validateQuote(q,{colour:q.variant?.colour})&&keys(p,['kind','variant','beforeMoney','afterMoney','beforeCount','afterCount','beforeWornCount','afterWornCount','turns','contextNonce'])&&p.kind==='purchase'&&keys(p.variant,variantKeys)&&sameVariant(p.variant,q.variant)&&
    effect.executionBinding?.provider==='dol-shop-native'&&/^shop-buy-one-[a-f0-9]{12}$/.test(effect.executionBinding.contract as string)&&p.contextNonce===effect.executionBinding.contextNonce&&
    p.beforeMoney===q.baselineMoney&&nonnegative(p.afterMoney)&&p.beforeMoney-p.afterMoney===receipt.spent&&(receipt.spent>0||q.unitCost===0&&receipt.spent===0)&&receipt.spent<=q.unitCost&&
    p.beforeCount===0&&p.beforeWornCount===0&&p.afterCount===1&&p.afterWornCount===0&&nonnegative(p.turns);
}
type Purchased=EffectView & {action:ActionView & {quote:QuoteView};result:ReceiptView};
const purchases=(context:predicates.Context)=>context.effects.filter((e):e is Purchased=>!!(e.status==='settled'&&e.action.kind==='buy'&&e.action.quote&&e.result?.outcome==='occurred'));
function canPrepare(action:ActionView,g:browserGoal.Goal,context:predicates.Context):boolean{
  if(g.kind!=='purchase-and-equip')return true;
  const bought=purchases(context);
  if(bought.length&&action.kind==='load-save')return false;
  if(action.kind==='buy'||action.quote)return !bought.length&&!!action.quote&&validateQuote(action.quote,g)&&(action.kind!=='buy'||action.cost===action.quote.unitCost);
  if(['sw-wardrobe','dol-wardrobe'].includes(action.selected?.type as string)&&action.selected!.operation==='equip')return bought.length===1&&validatePurchaseReceipt(bought[0].result,bought[0])&&sameVariant({slot:action.selected!.slot,variable:action.selected!.variable,colour:action.selected!.colour,accessoryColour:action.selected!.accessoryColour??null,modder:action.selected!.modder??null},bought[0].action.quote.variant);
  return true;
}
function purchaseSatisfied(scene:SceneView,g:browserGoal.Goal,context:predicates.Context):boolean{
  if(g.kind!=='purchase-and-equip')return scene.goalProof.satisfied===true;
  const bought=purchases(context),p=scene.goalProof;
  if(bought.length!==1||!validatePurchaseReceipt(bought[0].result,bought[0])||!p.conditionsSatisfied||!p.wornMatches||p.ownedTruncated!==false||!Array.isArray(p.owned))return false;
  const e=bought[0],variant=e.action.quote.variant!;
  const inventory=(p.owned as View[]).find(i=>JSON.stringify(i.variant)===JSON.stringify([variant.variable,variant.colour,variant.modder,variant.accessoryColour]));
  return validateQuote(e.action.quote,g)&&p.receiptContext===e.executionBinding!.contextNonce&&nonnegative(p.turns)&&p.turns>=(e.result.evidence!.turns as number)&&
    sameVariant({slot:'head',...(p.worn as View)},variant)&&(inventory?.count??0)===0&&withinSpend(context.spent,context.budget.maxSpend)&&context.reserved===0;
}
// Facts come from the game; this journal never owns inventory or a shadow worn state.


const predicates={validate,goalReader,validateQuote,quoteFromShop,validatePurchaseReceipt,canPrepare,purchaseSatisfied};
export = predicates;
