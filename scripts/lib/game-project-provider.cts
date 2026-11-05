import type scopeAPI from './game-scope.cjs';
import type semanticAPI from './game-semantic.cjs';
import type receiptsAPI from './game-receipts.cjs';
// These are property-access views of external values, not validation claims.
type View=Record<string,unknown>;
type Client=receiptsAPI.Client;
interface GoalView extends View {recipe:string;scope:scopeAPI.Value;predicate:unknown;inputs?:View}
interface RequestView extends View {goal:GoalView}
interface RecipeView extends View {operations:unknown[]}
interface OperationView extends View {id:unknown;label:unknown;intent:unknown;read:unknown;quote:unknown;execute:unknown;outcome:unknown;sceneTransition?:unknown}
type Sources=Record<'read'|'quote'|'execute'|'outcome',string>;
interface SelectionView extends View {type:unknown;operation:unknown;recipeSha256:unknown;sourceHash:unknown;before:unknown;cost:unknown;sceneTransition?:unknown}
interface DescriptorView extends View {selected:SelectionView;kind:unknown;cost:unknown;capability?:View}
interface ObservedOperation extends View {operation:unknown;label:unknown;intent:unknown;recipeSha256:unknown;sourceHash:unknown;before:unknown;cost:unknown;sceneTransition?:unknown}
interface ObservedView {operations?:ObservedOperation[]}
interface ReceiptView extends View {evidence?:View}
interface EffectView extends View {executionBinding?:View;action:{selected:SelectionView}}
interface SessionView {scene?:{goalProof?:unknown}}
'use strict';
// Reviewed project Recipes use the existing Session, Action and receipt contracts.
// Local modules have Node permissions; this is not an untrusted plugin sandbox.
const fs:typeof import('node:fs')=require('node:fs'),path:typeof import('node:path')=require('node:path'),vm:typeof import('node:vm')=require('node:vm'),{createHash}:typeof import('node:crypto')=require('node:crypto');
const native:typeof import('./game-native-provider.cjs')=require('./game-native-provider.cjs'),semantic:typeof import('./game-semantic.cjs')=require('./game-semantic.cjs'),receipts:typeof import('./game-receipts.cjs')=require('./game-receipts.cjs'),action:typeof import('./action.cjs')=require('./action.cjs');
const {validate:scope,assertTarget}:typeof import('./game-scope.cjs')=require('./game-scope.cjs');
const id='project-experiment',hash=(v:unknown)=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
const keys=(v:unknown,allowed:readonly string[]):v is View=>(v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k))) as boolean;
const bounded=(v:unknown):v is string=>typeof v==='string'&&v.length>0&&v.length<=128&&!/[\u0000-\u001f]/.test(v);
function validateGoal(raw:unknown):unknown{const g=raw as GoalView;return keys(g,['description','kind','recipe','scope','predicate','inputs'])&&g.kind===id&&path.isAbsolute(g.recipe||'')&&scope(g.scope)&&native.validateGoal(g.predicate)&&
 keys(g.inputs??{},Object.keys(g.inputs??{}))&&Buffer.byteLength(JSON.stringify(g.inputs??{}))<=4096}
function validateRequest(raw:unknown){const r=raw as RequestView;
 if(!validateGoal(r?.goal))throw Error('Invalid project experiment Goal/scope');
 native.validateRequest({...r,goal:r.goal.predicate});
 recipe(r.goal);return JSON.parse(JSON.stringify(r)) as unknown;
}
function recipe(raw:unknown,expected?:unknown){const g=raw as GoalView;
 if(!validateGoal(g))throw Error('Invalid project experiment Goal');
 const root=fs.realpathSync(g.scope.workspace),file=fs.realpathSync(g.recipe),relative=path.relative(root,file);
 if(!relative||relative.startsWith('..'+path.sep)||relative==='..'||path.isAbsolute(relative)||path.extname(file)!=='.cjs'||!fs.statSync(file).isFile()||fs.statSync(file).size>65536)throw Error('Recipe must be a bounded local CJS file inside the scoped workspace');
 const sha256=hash(fs.readFileSync(file,'utf8'));if(expected!==undefined&&sha256!==expected)throw Error('Recipe changed; observe fresh candidates before dispatch');
 delete require.cache[require.resolve(file)];const value:unknown=require(file);
 if(!keys(value,['schemaVersion','operations'])||(value as RecipeView).schemaVersion!==1||!Array.isArray((value as RecipeView).operations)||!(value as RecipeView).operations.length||(value as RecipeView).operations.length>16)throw Error('Invalid reviewed project Recipe');
 const seen=new Set(),operations=(value as RecipeView).operations.map(raw=>{const o=raw as OperationView;
  if(!keys(o,['id','label','intent','read','quote','execute','outcome','sceneTransition'])||!/^[a-z][a-z0-9-]{0,63}$/.test((o.id||'') as string)||seen.has(o.id)||!bounded(o.label)||!semantic.intents.includes(o.intent as semanticAPI.Intent)||o.sceneTransition!==undefined&&o.sceneTransition!=='passage')throw Error('Invalid project operation');
  seen.add(o.id);const sources={} as Sources;for(const k of ['read','quote','execute','outcome'] as const){
   if(typeof o[k]!=='function')throw Error('Recipe requires independent read, quote, execute and Outcome functions');
   const source=Function.prototype.toString.call(o[k]);if(Buffer.byteLength(source)>8192)throw Error('Oversized project operation');
   new vm.Script('('+source+')');sources[k]=source;
  }
  return {id:o.id,label:o.label,intent:o.intent,sources,sourceHash:hash(sources),...(o.sceneTransition?{sceneTransition:o.sceneTransition}:{})};
 });
 return {sha256,operations};
}
function validateAction(raw:unknown,intent:unknown,rawg:unknown){const a=raw as SelectionView,g=rawg as GoalView;
 if(!keys(a,['type','operation','recipeSha256','sourceHash','before','cost','sceneTransition'])||a.type!==id||!/^[a-f0-9]{64}$/.test((a.recipeSha256||'') as string)||!/^[a-f0-9]{64}$/.test((a.sourceHash||'') as string)||!Number.isSafeInteger(a.cost)||(a.cost as number)<0||!keys(a.before,Object.keys(a.before??{}))||Buffer.byteLength(JSON.stringify(a.before))>2048)throw Error('Invalid project experiment selection');
 const r=recipe(g,a.recipeSha256),o=r.operations.find(o=>o.id===a.operation);if(!g.scope.intents.includes(intent as never))throw Error('Project operation outside scope');if(!o||o.intent!==intent||o.sourceHash!==a.sourceHash||o.sceneTransition!==a.sceneTransition)throw Error('Project operation identity mismatch');return o;
}
async function observe(client:Client,rawg:unknown){const g=rawg as GoalView;
 try{
 const r=recipe(g),operations=[];
 for(const o of r.operations){
  if(!g.scope.intents.includes(o.intent as never))continue;
  const before=await client.evaluate(`(${o.sources.read})(${JSON.stringify(g.inputs??{})})`);
  if(!keys(before,Object.keys(before??{}))||Buffer.byteLength(JSON.stringify(before))>2048)throw Error('Project original-state snapshot unavailable');
  const cost=await client.evaluate(`(${o.sources.quote})(${JSON.stringify(before)},${JSON.stringify(g.inputs??{})})`);
  if(cost===null)continue;
  if(!Number.isSafeInteger(cost)||(cost as number)<0)throw Error('Project quote unavailable');
  operations.push({operation:o.id,label:o.label,intent:o.intent,recipeSha256:r.sha256,sourceHash:o.sourceHash,before,cost,...(o.sceneTransition?{sceneTransition:o.sceneTransition}:{})});
 }
 return {project:{status:'available',operations}};
 }catch(error){
  // Current Recipe availability cannot invalidate an old bound terminal receipt.
  return {project:{status:'failed',reason:(error as {code?:unknown}|null)?.code==='ENOENT'?'recipe-file-unavailable':'recipe-or-original-state-read-failed',operations:[]}};
 }
}
function candidates(_facts:unknown,epoch:unknown,_proof:unknown,rawObserved:unknown,rawg:unknown){const observed=rawObserved as ObservedView|null|undefined,g=rawg as GoalView;
 return (observed?.operations??[]).filter(o=>g.scope.intents.includes(o.intent as never)).map(o=>{const selected={type:id,operation:o.operation,recipeSha256:o.recipeSha256,sourceHash:o.sourceHash,before:o.before,cost:o.cost,...(o.sceneTransition?{sceneTransition:o.sceneTransition}:{})};
  return {ref:hash([epoch,selected]),kind:o.intent,cost:o.cost,risk:'normal',label:o.label,selected,capability:{provider:id,name:'recipe'}}});
}
function validateDescriptor(raw:unknown,g:unknown){const c=raw as DescriptorView;const o=validateAction(c.selected,c.kind,g);if(c.cost!==c.selected.cost||c.quote!==undefined||c.capability?.provider!==id||c.capability?.name!=='recipe')throw Error('Project candidate/cost mismatch');return o}
function legacyDescriptor(raw:unknown,intent:unknown,g:unknown,ref:unknown):unknown{const selected=raw as SelectionView;const descriptor={ref,kind:intent,cost:selected.cost,risk:'normal',selected,capability:{provider:id,name:'recipe'}};validateDescriptor(descriptor,g);return descriptor}
const {operation}:typeof import('./browser-abi/project-operation.cjs')=require('./browser-abi/project-operation.cjs');

async function prepare(client:Client,raw:unknown,rawg:unknown,attemptId:unknown){const descriptor=raw as DescriptorView,g=rawg as GoalView;
 const o=validateDescriptor(descriptor,g),current=await client.evaluate(`(${o.sources.read})(${JSON.stringify(g.inputs??{})})`);
 if(JSON.stringify(current)!==JSON.stringify(descriptor.selected.before))throw Error('Project preparation state changed');
 const currentCost=await client.evaluate(`(${o.sources.quote})(${JSON.stringify(current)},${JSON.stringify(g.inputs??{})})`);
 if(currentCost!==descriptor.cost)throw Error('Project quote changed');
 const nonce=await receipts.context(client),binding={provider:id,contract:o.sceneTransition?'project-recipe-v2':'project-recipe-v1',contextNonce:nonce,requestDigest:hash([descriptor,g.inputs??{},g.scope])};
 const config={namespace:receipts.namespace,binding,attemptId,before:current,inputs:g.inputs??{},recipeSha256:descriptor.selected.recipeSha256,operation:o.id,...(o.sceneTransition?{sceneTransition:o.sceneTransition}:{})};
 return {action:{type:'web-click',selector:'#passages > .passage'},executionBinding:binding,projectExperiment:true,
  interpretation:{operation:o.id,recipeSha256:config.recipeSha256},
  operation:action.reviewedOperation('project-experiment',`return (${operation.toString()})(node,${JSON.stringify(config)},${o.sources.read},${o.sources.execute},${o.sources.outcome},markOperationDispatch)`)};
}
function validateReceipt(rawr:unknown,rawe:unknown){const r=rawr as ReceiptView,e=rawe as EffectView;
 if(r.outcome!=='occurred'||!r.remoteClosed)return r.evidence===undefined;
 const p=r.evidence;return e.executionBinding?.provider===id&&e.executionBinding.contract===(e.action.selected.sceneTransition?'project-recipe-v2':'project-recipe-v1')&&keys(p,['kind','recipeSha256','operation','before','after','executionCompleted'])&&
 p.kind===id&&p.recipeSha256===e.action.selected.recipeSha256&&p.operation===e.action.selected.operation&&p.executionCompleted===true&&
 JSON.stringify(p.before)===JSON.stringify(e.action.selected.before)&&keys(p.after,Object.keys(p.after??{}))&&Number.isSafeInteger(r.spent)&&(r.spent as number)>=0;
}
const provider={id,supportsGoal:(g:unknown)=>(g as View|null|undefined)?.kind===id,validateGoal,validateRequest,validateAction,validateDescriptor,legacyDescriptor,observe,candidates,prepare,operation,validateReceipt,assertTarget,
 probe:(g:unknown)=>native.probe((g as GoalView).predicate),satisfied:(s:unknown,g:unknown,c:unknown)=>native.satisfied(s,(g as GoalView).predicate,c),publicProof:(s:unknown)=>(s as SessionView).scene?.goalProof??null,
 traceProgress:(p:unknown)=>native.traceProgress(p),traceDistances:(p:unknown,g:unknown)=>native.traceDistances(p,(g as GoalView).predicate),
 canPrepare:(raw:unknown,rawg:unknown,_c:unknown)=>{const a=raw as DescriptorView,g=rawg as GoalView;return g.scope.intents.includes(a.kind as never)&&(a.selected?.type!==id||validateDescriptor(a,g)&&true)},
 publicOutcome:(raw:unknown):unknown=>{const o=raw as ReceiptView;return {...o,...(o.evidence?{evidence:{...o.evidence,before:'private',after:'private'}}:{})}}};
export = provider;
