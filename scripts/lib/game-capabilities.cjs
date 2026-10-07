'use strict';
// Two reviewed local providers, one Runtime. No plugin discovery or second engine.
const {createHash}=require('node:crypto');
const native=require('./game-native-provider.cjs'),semantic=require('./game-semantic.cjs');
const keys=(v,allowed)=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
const hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const clothing=()=>require('./game-clothing-provider.cjs');
function predicate(g,required=true){if(native.supportsGoal(g))return native;const domain=clothing();if(domain.supportsGoal(g))return domain;if(required)throw Error('Unsupported Goal kind');return null}
function identity(selected){
  if(selected?.type==='web-click')return {provider:native.id,name:'control'};
  if(['sw-wardrobe','dol-wardrobe'].includes(selected?.type))return {provider:'clothing',name:'wardrobe'};
  if(selected?.type==='dol-shop')return {provider:'clothing',name:'shop'};
  throw Error('Unsupported Gameplay capability');
}
function capability(descriptor){
  const expected=identity(descriptor.selected);
  // Old v2 descriptors are inferred only from their persisted action, never from
  // the current Goal. New descriptors must match their actual implementation.
  if(descriptor.capability!==undefined&&(!keys(descriptor.capability,['provider','name'])||descriptor.capability.provider!==expected.provider||descriptor.capability.name!==expected.name))throw Error('Gameplay capability identity mismatch');
  return expected.provider===native.id?native:clothing();
}
function validateDescriptor(c,g){
  if(!keys(c,['ref','kind','cost','risk','selected','label','destination','quote','capability'])||typeof c.ref!=='string'||!semantic.intents.includes(c.kind)||!Number.isSafeInteger(c.cost)||c.cost<0||c.risk!=='normal')throw Error('Invalid reviewed candidate');
  const owner=capability(c);owner.validateAction(c.selected,c.kind,g);
  if(owner===native){if(c.quote!==undefined||c.cost!==0)throw Error('Native control needs a reviewed cost provider')}
  else owner.validateDescriptor({...c,capability:c.capability??identity(c.selected)},g);
  return owner;
}
function receiptOwner(e){
  const owner=capability(e.action),bound=e.executionBinding?.provider;
  const expected=bound==='dol-shop-native'?{provider:'clothing',name:'shop'}:['soft-and-wet-native-head','dol-wardrobe-native'].includes(bound)?{provider:'clothing',name:'wardrobe'}:bound==='native-dol'?{provider:native.id,name:'control'}:null;
  if(e.executionBinding&&!expected)throw Error('Unreviewed effect binding provider');
  if(expected){const actual=identity(e.action.selected);if(actual.provider!==expected.provider||actual.name!==expected.name)throw Error('Effect binding/capability mismatch')}
  if(bound==='dol-wardrobe-native'&&e.action.selected.type!=='dol-wardrobe'||bound==='soft-and-wet-native-head'&&e.action.selected.type!=='sw-wardrobe')throw Error('Effect binding/wardrobe implementation mismatch');
  return owner;
}
const provider={
  validateGoal(g){try{return predicate(g).validateGoal(g)===true}catch{return false}},
  scene(v,g){
    if(!keys(v,['source','revision','location','choices','facts','goalProof'])||v.source!=='original DoL semantic provider'||!Number.isSafeInteger(v.revision)||v.revision<0||!Array.isArray(v.choices)||v.choices.length>64||!v.facts?.domAgrees||v.goalProof?.status!=='available'||typeof v.goalProof.satisfied!=='boolean')throw Error('Reliable original scene/predicate required');
    const refs=new Set();for(const c of v.choices){validateDescriptor(c,g);if(refs.has(c.ref))throw Error('Duplicate candidate reference');refs.add(c.ref)}
    return JSON.parse(JSON.stringify({...v,choices:v.choices.map(c=>({...c,capability:c.capability??identity(c.selected)}))}));
  },
  satisfied:(scene,g,context)=>predicate(g).satisfied(scene,g,context),
  validateReceipt:(r,e)=>receiptOwner(e).validateReceipt(r,e),
  // A predicate may constrain every action in the mixed session (e.g. preserve
  // a purchase witness across navigation), independently of action ownership.
  canPrepare:(a,g,context)=>predicate(g).canPrepare(a,g,context),
  trace(v,g){const owner=predicate(g),distances=owner.traceDistances?.(v.goalProof,g);return {key:hash([v.location,v.facts.passage,v.facts.surface,v.facts.narrative??'',v.facts.choices.map(c=>[c.label,c.destination])]),progress:hash(owner.traceProgress(v.goalProof)),description:v.facts.passage||'unknown',
    ...(distances===undefined?{}:{distances})}},
};
function publicDescriptor({selected,...descriptor}){return descriptor}
function publicOutcome(outcome){
  const owner=capability(outcome.descriptor),projected=owner.publicOutcome?owner.publicOutcome(outcome):outcome;
  return {...projected,descriptor:publicDescriptor(projected.descriptor)};
}
module.exports={provider,identity,capability,validateDescriptor,publicDescriptor,publicOutcome,
  validate:request=>predicate(request?.goal).validateRequest(request),
  probe:g=>predicate(g).probe(g),observe:(client,g)=>predicate(g).observe(client,g),publicProof:s=>predicate(s.config.goal,false)?.publicProof(s)??s.scene?.goalProof??null,
  candidates(facts,epoch,proof,shop,g){const domain=g&&predicate(g),owned=domain&&domain!==native?domain.candidates(facts,epoch,proof,shop,g):[];
    const selectors=new Set(owned.filter(c=>c.selected.operation==='browse').map(c=>c.selected.selector));
    return [...owned,...native.candidates(facts,epoch).filter(c=>!selectors.has(c.selected.selector))].slice(0,64)},
  choicesFrom(observed,epoch,g){return this.candidates(observed.gameplay,epoch,observed.goalProof,observed.capabilities?.shop,g)},
  legacyDescriptor(selected,intent,g,ref){const owner=capability({selected});return owner===native?{ref,kind:intent,cost:0,risk:'normal',selected,capability:identity(selected)}:owner.legacyDescriptor(selected,intent,g,ref)},
  authorizeCostedControl:(mapping,descriptor,g)=>capability(descriptor).authorizeCostedControl?.(mapping,descriptor,g)===true,
};
