import type cdp from './cdp.cjs';
type View=Record<string,unknown>;
interface Selection extends View {type?:unknown}
interface Descriptor extends View {selected:Selection;capability?:View;ref?:unknown;kind?:unknown;cost?:unknown}
interface SceneView extends View {facts:{domAgrees?:unknown;passage?:unknown;surface?:unknown;narrative?:unknown;choices:{label?:unknown;destination?:unknown}[]};goalProof?:{status?:unknown;satisfied?:unknown};choices:Descriptor[]}
interface EffectView {action:Descriptor;executionBinding?:{provider?:unknown}}
interface GoalView extends View {scope?:unknown}
interface SessionView {config:{goal:GoalView};scene?:{goalProof?:unknown}}
type Client=Pick<cdp.Client,'send'|'evaluate'>;
'use strict';
// Reviewed local providers, one Runtime. No plugin discovery or second engine.
const {createHash}:typeof import('node:crypto')=require('node:crypto');
const native:typeof import('./game-native-provider.cjs')=require('./game-native-provider.cjs'),semantic:typeof import('./game-semantic.cjs')=require('./game-semantic.cjs');
const keys=(v:unknown,allowed:readonly string[]):v is View=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const clothing=():typeof import('./game-clothing-provider.cjs')=>require('./game-clothing-provider.cjs');
const project=():typeof import('./game-project-provider.cjs')=>require('./game-project-provider.cjs');
type Domain=ReturnType<typeof clothing>|ReturnType<typeof project>;
type Owner=(typeof native|ReturnType<typeof clothing>|ReturnType<typeof project>) & {assertTerminalSupport?:(selected:unknown)=>void};
function predicate(g:unknown):Owner;
function predicate(g:unknown,required:false):Owner|null;
function predicate(g:unknown,required=true){if(native.supportsGoal(g))return native;if(project().supportsGoal(g))return project();const domain=clothing();if(domain.supportsGoal(g))return domain;if(required)throw Error('Unsupported Goal kind');return null}
function identity(raw:unknown){const selected=raw as Selection;
  if(selected?.type==='project-experiment')return {provider:'project-experiment',name:'recipe'};
  if(selected?.type==='web-click')return {provider:native.id,name:'control'};
  if(['sw-wardrobe','dol-wardrobe'].includes(selected?.type as string))return {provider:'clothing',name:'wardrobe'};
  if(selected?.type==='dol-shop')return {provider:'clothing',name:'shop'};
  throw Error('Unsupported Gameplay capability');
}
function capability(raw:unknown):Owner{const descriptor=raw as Descriptor;
  const expected=identity(descriptor.selected);
  // Old v2 descriptors are inferred only from their persisted action, never from
  // the current Goal. New descriptors must match their actual implementation.
  if(descriptor.capability!==undefined&&(!keys(descriptor.capability,['provider','name'])||descriptor.capability.provider!==expected.provider||descriptor.capability.name!==expected.name))throw Error('Gameplay capability identity mismatch');
  return expected.provider===native.id?native:expected.provider==='project-experiment'?project():clothing();
}
function validateDescriptor(raw:unknown,g:unknown){const c=raw as Descriptor;
  if(!keys(c,['ref','kind','cost','risk','selected','label','destination','quote','capability'])||typeof c.ref!=='string'||!(semantic.intents as readonly unknown[]).includes(c.kind)||!Number.isSafeInteger(c.cost)||(c.cost as number)<0||c.risk!=='normal')throw Error('Invalid reviewed candidate');
  const owner=capability(c);owner.validateAction(c.selected,c.kind,g);
  if(owner===native){if(c.quote!==undefined||c.cost!==0)throw Error('Native control needs a reviewed cost provider')}
  else (owner as Domain).validateDescriptor({...c,capability:c.capability??identity(c.selected)},g);
  return owner;
}
function receiptOwner(raw:unknown){const e=raw as EffectView;
  const owner=capability(e.action),bound=e.executionBinding?.provider;
  const expected=bound==='project-experiment'?{provider:'project-experiment',name:'recipe'}:bound==='dol-shop-native'?{provider:'clothing',name:'shop'}:['soft-and-wet-native-head','dol-wardrobe-native'].includes(bound as string)?{provider:'clothing',name:'wardrobe'}:bound==='native-dol'?{provider:native.id,name:'control'}:null;
  if(e.executionBinding&&!expected)throw Error('Unreviewed effect binding provider');
  if(expected){const actual=identity(e.action.selected);if(actual.provider!==expected.provider||actual.name!==expected.name)throw Error('Effect binding/capability mismatch')}
  if(bound==='dol-wardrobe-native'&&e.action.selected.type!=='dol-wardrobe'||bound==='soft-and-wet-native-head'&&e.action.selected.type!=='sw-wardrobe')throw Error('Effect binding/wardrobe implementation mismatch');
  return owner;
}
const provider={
  pageReceiptProviders:['native-dol','dol-shop-native','dol-wardrobe-native','soft-and-wet-native-head','project-experiment'],
  validateGoal(g:unknown){try{return predicate(g).validateGoal(g)===true}catch{return false}},
  scene(raw:unknown,g:unknown){const v=raw as SceneView;
    if(!keys(v,['source','revision','location','choices','facts','goalProof'])||v.source!=='original DoL semantic provider'||!Number.isSafeInteger(v.revision)||(v.revision as number)<0||!Array.isArray(v.choices)||v.choices.length>64||!v.facts?.domAgrees||v.goalProof?.status!=='available'||typeof v.goalProof.satisfied!=='boolean')throw Error('Reliable original scene/predicate required');
    const refs=new Set();for(const c of v.choices){validateDescriptor(c,g);if(refs.has(c.ref))throw Error('Duplicate candidate reference');refs.add(c.ref)}
    return JSON.parse(JSON.stringify({...v,choices:v.choices.map(c=>({...c,capability:c.capability??identity(c.selected)}))})) as unknown;
  },
  satisfied:(scene:unknown,g:unknown,context:unknown)=>predicate(g).satisfied(scene as Parameters<ReturnType<typeof clothing>['satisfied']>[0],g as Parameters<ReturnType<typeof clothing>['satisfied']>[1],context as Parameters<ReturnType<typeof clothing>['satisfied']>[2]),
  validateReceipt:(r:unknown,e:unknown)=>receiptOwner(e).validateReceipt(r,e),
  // A predicate may constrain every action in the mixed session (e.g. preserve
  // a purchase witness across navigation), independently of action ownership.
  canPrepare:(a:unknown,g:unknown,context:unknown)=>predicate(g).canPrepare(a as Parameters<ReturnType<typeof clothing>['canPrepare']>[0],g as Parameters<ReturnType<typeof clothing>['canPrepare']>[1],context as Parameters<ReturnType<typeof clothing>['canPrepare']>[2]),
  trace(raw:unknown,g:unknown){const v=raw as SceneView;const owner=predicate(g),distances=(owner as Owner & {traceDistances?:(proof:unknown,goal:unknown)=>unknown}).traceDistances?.(v.goalProof,g);return {key:hash([v.location,v.facts.passage,v.facts.surface,v.facts.narrative??'',v.facts.choices.map(c=>[c.label,c.destination])]),progress:hash(owner.traceProgress(v.goalProof)),description:v.facts.passage||'unknown',
    ...(distances===undefined?{}:{distances})}},
};
function publicDescriptor(raw:unknown){const {selected,...descriptor}=raw as Descriptor;return descriptor}
function publicOutcome(raw:unknown){const outcome=raw as View & {descriptor:unknown};
  const owner=capability(outcome.descriptor) as Owner & {publicOutcome?:(value:unknown)=>unknown},projected=(owner.publicOutcome?owner.publicOutcome(outcome):outcome) as View & {descriptor:unknown};
  return {...projected,descriptor:publicDescriptor(projected.descriptor)};
}
const capabilities={provider,identity,capability,validateDescriptor,publicDescriptor,publicOutcome,
  validate:(request:unknown)=>{const {scope,...input}=(request??{}) as View & {goal?:GoalView};if(scope!==undefined&&!(require('./game-scope.cjs') as typeof import('./game-scope.cjs')).validate(scope))throw Error('Invalid Goal authorization scope');
    if(scope&&input.goal?.scope&&JSON.stringify(scope)!==JSON.stringify(input.goal.scope))throw Error('Conflicting Goal authorization scopes');
    return {...(predicate(input.goal).validateRequest(input) as View),...(scope===undefined?{}:{scope})}},
  probe:(g:unknown)=>predicate(g).probe(g),observe:(client:Client,g:unknown)=>predicate(g).observe(client,g),publicProof:(raw:unknown)=>{const s=raw as SessionView;return predicate(s.config.goal,false)?.publicProof(s)??s.scene?.goalProof??null},
  candidates(facts:unknown,epoch:unknown,proof:unknown,shop:unknown,g:unknown){const domain=(g&&predicate(g)) as Owner|undefined,owned=(domain&&domain!==native?(domain as Domain).candidates(facts,epoch,proof,shop,g):[]) as Descriptor[];
    const selectors=new Set(owned.filter(c=>c.selected.operation==='browse').map(c=>c.selected.selector));
    return [...owned,...native.candidates(facts as Parameters<typeof native.candidates>[0],epoch).filter(c=>!selectors.has(c.selected.selector))].slice(0,64)},
  choicesFrom(raw:unknown,epoch:unknown,goal:unknown){const observed=raw as {gameplay?:unknown;goalProof?:unknown;capabilities?:{project?:unknown;shop?:unknown}},g=goal as GoalView;return this.candidates(observed.gameplay,epoch,observed.goalProof,g?.kind==='project-experiment'?observed.capabilities?.project:observed.capabilities?.shop,g)},
  legacyDescriptor(selected:unknown,intent:unknown,g:unknown,ref:unknown){const owner=capability({selected});return owner===native?{ref,kind:intent,cost:0,risk:'normal',selected,capability:identity(selected)}:(owner as Domain).legacyDescriptor(selected,intent,g,ref)},
  authorizeCostedControl:(mapping:unknown,descriptor:unknown,g:unknown)=>(capability(descriptor) as Owner & {authorizeCostedControl?:ReturnType<typeof clothing>['authorizeCostedControl']}).authorizeCostedControl?.(mapping,descriptor,g)===true,
};

export = capabilities;
