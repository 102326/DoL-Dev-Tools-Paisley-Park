'use strict';
// Opt-in CE-R0 case, not an equivalence engine or an installed Mod patch.
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const commit='c36b23a6ab1899c7f780faa63945fe6e199a6355';
const expected='e245c915183c29b53340c629c7a3b178bedbaebac64ab9583c6548ac652a8b9a';
const sourceUrl=`https://github.com/chris81605/Degrees-of-Lewdity_Cheat_Extended/blob/${commit}/scripts/CE_hookTool.js`;
function replaceOnce(source,from,to){assert.equal(source.split(from).length,2,'Reviewed edit seam must occur once');return source.replace(from,to)}
function candidate(source){
 let result=replaceOnce(source,'const registry = {};','const registry = {};\n    const generations = new Map();');
 result=replaceOnce(result,'function register(varPath, options = {}){','function register(varPath, options = {}){\n        if (!generations.has(varPath)) generations.set(varPath, {});');
 result=replaceOnce(result,'function unregister(varPath){','function unregister(varPath){\n        generations.delete(varPath);');
 result=replaceOnce(result,'const config = registry[path];','const config = registry[path];\n            const generation = generations.get(path);');
 for(const [signature,delegate] of [
  ['get(obj, prop, receiver){','Reflect.get(obj, prop, receiver)'],
  ['set(obj, prop, value, receiver){','Reflect.set(obj, prop, value, receiver)'],
  ['deleteProperty(obj, prop){','Reflect.deleteProperty(obj, prop)']
 ])result=replaceOnce(result,signature,signature+`\n                        if (generations.get(path) !== generation) return ${delegate};`);
 return result;
}
function host(source){
 const raw={value:1,nested:{value:2,deep:{value:3}},list:[1],victim:4,skip:0};
 const trace=[],errors=[],handlers=[];
 const state={variables:{root:raw,other:{value:1},CE_VarHook_enable:true,CE_DeepProxyHook_enable:true}};
 const sandbox={State:state,setup:{},document:{},console:{log(){},warn(){},error(...args){errors.push(String(args[1]))}},$:()=>({on:(event,fn)=>handlers.push({event,fn})})};
 sandbox.window=sandbox;Object.defineProperty(sandbox,'V',{get:()=>state.variables});
 vm.runInNewContext(source,sandbox,{timeout:1000});
 assert.equal(handlers.length,1);assert.equal(handlers[0].event,':passagestart');
 return {raw,state,trace,errors,setup:sandbox.setup,hook:sandbox.DeepProxyHook,passage:()=>handlers[0].fn()};
}
function config(h,factor=2,label='rule'){
 return {maxDepth:1,ignoreKeys:['skip','length'],
  before:c=>h.trace.push([label,'before',c.fullPath,c.oldValue,c.newValue]),
  transform:c=>{h.trace.push([label,'transform',c.fullPath]);return c.newValue*factor},
  after:(old,value,c)=>h.trace.push([label,'after',c.fullPath,old,value])};
}
function install(h,options=config(h)){h.hook.register('root',options);h.hook.installAll();return h.state.variables.root}
const preserved=[
 ['active-write-order',source=>{
  const h=host(source),p=install(h);assert(Reflect.set(p,'value',3));
  assert.equal(h.raw.value,6);assert.deepEqual(h.trace.map(v=>v[1]),['before','transform','after']);return {value:h.raw.value,trace:h.trace};
 }],
 ['switch-lock-ignore-and-depth',source=>{
  const h=host(source),p=install(h);h.state.variables.CE_VarHook_enable=false;p.value=3;
  h.state.variables.CE_VarHook_enable=true;h.state.variables.CE_DeepProxyHook_enable=false;p.value=4;
  h.state.variables.CE_DeepProxyHook_enable=true;h.setup.CE_macroLock=true;p.value=5;h.setup.CE_macroLock=false;
  p.skip=6;p.nested.deep.value=7;assert.equal(h.trace.length,0);
  p.nested.value=4;assert.equal(h.raw.nested.value,8);return {value:h.raw.value,skip:h.raw.skip,deep:h.raw.nested.deep.value,trace:h.trace};
 }],
 ['array-and-alias-cache',source=>{
  const h=host(source),p=install(h);assert.equal(p.nested,p.nested);p.list.push(3);
  assert.deepEqual(h.raw.list,[1,6]);assert.equal(h.trace.filter(v=>v[1]==='after').length,1);return {list:h.raw.list,trace:h.trace};
 }],
 ['delete-veto-and-error-result',source=>{
  const h=host(source);let fail=false;const options=config(h);options.delete=c=>{h.trace.push(['delete',c.fullPath]);if(fail)throw Error('synthetic-delete');return false};
  const p=install(h,options);assert.equal(Reflect.deleteProperty(p,'victim'),true);assert.equal(h.raw.victim,4);
  fail=true;assert.equal(Reflect.deleteProperty(p,'victim'),false);assert.equal(h.raw.victim,4);return {victim:h.raw.victim,trace:h.trace,errors:h.errors};
 }],
 ['callback-errors-and-partial-state',source=>{
  const h=host(source),options=config(h);options.before=c=>{h.trace.push(['before',c.newValue]);if(c.newValue===3)throw Error('synthetic-before')};
  options.transform=c=>{h.trace.push(['transform',c.newValue]);if(c.newValue===4)throw Error('synthetic-transform');return c.newValue*2};
  options.after=()=>{h.trace.push(['after',h.raw.value]);throw Error('synthetic-after')};
  const p=install(h,options);assert.equal(Reflect.set(p,'value',3),true);assert.equal(h.raw.value,6);
  assert.equal(Reflect.set(p,'value',4),false);assert.equal(h.raw.value,6);return {value:h.raw.value,trace:h.trace,errors:h.errors};
 }],
 ['same-path-before-install-last-rule',source=>{
  const h=host(source);h.hook.register('root',config(h,2,'first'));h.hook.register('root',config(h,3,'last'));h.hook.installAll();
  h.state.variables.root.value=4;assert.equal(h.raw.value,12);assert(h.trace.every(v=>v[0]==='last'));return {value:h.raw.value,trace:h.trace};
 }],
 ['unrelated-registration-survives',source=>{
  const h=host(source);install(h);h.hook.register('other',config(h,3,'other'));h.hook.installAll();h.hook.unregister('root');
  h.state.variables.other.value=3;assert.equal(h.state.variables.other.value,9);assert(h.trace.every(v=>v[0]==='other'));
  return {value:h.state.variables.other.value,trace:h.trace};
 }],
 ['explicit-object-replacement-and-rebind',source=>{
  const h=host(source),old=install(h),fresh={value:5};h.state.variables={root:fresh,CE_VarHook_enable:true,CE_DeepProxyHook_enable:true};
  h.passage();h.state.variables.root.value=6;assert.equal(fresh.value,12);assert.equal(h.raw.value,1);assert.notEqual(old,h.state.variables.root);
  return {oldValue:h.raw.value,newValue:fresh.value,trace:h.trace};
 }]
];
function retiredAliases(source){
 const h=host(source),options=config(h);options.ignorePath=full=>{h.trace.push(['ignorePath',full]);return false};options.delete=()=>{h.trace.push(['delete']);return false};
 const root=install(h,options),nested=root.nested;const traceBefore=h.trace.length;
 h.hook.unregister('root');h.hook.unregister('root');root.value=7;nested.value=8;const removed=Reflect.deleteProperty(root,'victim');const afterRead=root.nested;
 return {value:h.raw.value,nested:h.raw.nested.value,removed,victimExists:Object.hasOwn(h.raw,'victim'),retiredEvents:h.trace.slice(traceBefore),readIsRaw:afterRead===h.raw.nested};
}
function replacedRegistration(source){
 const h=host(source),old=install(h,config(h,2,'captured'));
 h.hook.register('root',config(h,3,'replacement'));old.value=2;
 const beforeUnregister={value:h.raw.value,trace:h.trace.slice()};h.trace.length=0;
 h.hook.unregister('root');old.value=7;
 return {beforeUnregister,retiredValue:h.raw.value,retiredEvents:h.trace.slice()};
}
function singleGeneration(source){
 const h=host(source),options=label=>({...config(h,2,label),transform:c=>{h.trace.push([label,'transform',c.fullPath]);return 10}});
 const old=install(h,options('old'));h.hook.unregister('root');h.hook.register('root',options('new'));h.hook.installAll();h.state.variables.root.value=3;
 const newWrite={value:h.raw.value,trace:h.trace.slice()};h.trace.length=0;old.value=7;
 return {newWrite,oldAliasWrite:{value:h.raw.value,trace:h.trace.slice()}};
}
function main(){
 const [file,output]=process.argv.slice(2);assert(file&&output&&process.argv.length===4,'Provide reviewed CE_hookTool.js and a new output directory');
 const info=fs.statSync(file);assert(info.isFile()&&info.size<=131072,'Provide the bounded reviewed source file');
 const bytes=fs.readFileSync(file);assert.equal(sha(bytes),expected,'Unreviewed CE source; no output created');
 const full=bytes.toString('utf8'),start=full.indexOf('(function () {'),exportAt=full.indexOf('window.DeepProxyHook'),end=full.indexOf('\n})();',exportAt);
 assert(start>=0&&exportAt>start&&end>exportAt);const original=full.slice(start,end+'\n})();'.length),next=candidate(original);
 new vm.Script(original);new vm.Script(next);
 const out=path.resolve(output);fs.mkdirSync(out); // Existing targets, including empty directories, are refused.
 const report={status:'running',input:{commit,sourceUrl,sha256:expected},scope:'Only the actual first DeepProxyHook IIFE; synthetic State/event host, not SugarCube, DoL or Android',cases:[]};
 try{
  fs.writeFileSync(path.join(out,'old-deep-proxy.js'),original,{flag:'wx'});fs.writeFileSync(path.join(out,'candidate-deep-proxy.js'),next,{flag:'wx'});
  fs.writeFileSync(path.join(out,'NOTICE.md'),`Local research adaptation of Cheat Extended by chris81605, ${commit}.\nSource: ${sourceUrl}\nUpstream license: CC BY-NC-SA 4.0 (${sourceUrl.replace('scripts/CE_hookTool.js','LICENSE.txt')}).\nThe candidate adds registration retirement and passive forwarding guards. It is not CE R1 or an upstream release, and is not relicensed under Tools MIT.\n`,{flag:'wx'});
  for(const [name,run] of preserved){const before=run(original),after=run(next);assert.deepEqual(after,before,name);report.cases.push({name,classification:'Preserved',before,after})}
  const beforeAliases=retiredAliases(original),afterAliases=retiredAliases(next);
  assert.equal(beforeAliases.value,14,'Actual legacy defect must reproduce');assert(beforeAliases.retiredEvents.length>0);
  assert.deepEqual(afterAliases,{value:7,nested:8,removed:true,victimExists:false,retiredEvents:[],readIsRaw:true});
  report.cases.push({name:'unregister-retained-root-and-child',classification:'Intentional Change',before:beforeAliases,after:afterAliases});
  const beforeReplacement=replacedRegistration(original),afterReplacement=replacedRegistration(next);
  assert.deepEqual(afterReplacement.beforeUnregister,beforeReplacement.beforeUnregister);assert.equal(afterReplacement.beforeUnregister.value,4);
  assert.equal(beforeReplacement.retiredValue,14);assert.equal(afterReplacement.retiredValue,7);assert.deepEqual(afterReplacement.retiredEvents,[]);
  report.cases.push({name:'registration-replaced-before-unregister',classification:'Intentional Change',before:beforeReplacement,after:afterReplacement});
  const beforeGeneration=singleGeneration(original),afterGeneration=singleGeneration(next);
  assert.equal(beforeGeneration.newWrite.value,10);assert.equal(afterGeneration.newWrite.value,10);
  assert.equal(beforeGeneration.newWrite.trace.filter(v=>v[1]==='after').length,2);assert.equal(afterGeneration.newWrite.trace.filter(v=>v[1]==='after').length,1);
  assert(afterGeneration.newWrite.trace.every(v=>v[0]==='new'));assert.deepEqual(afterGeneration.oldAliasWrite,{value:7,trace:[]});
  report.cases.push({name:'reregister-with-one-active-generation',classification:'Intentional Change',before:beforeGeneration,after:afterGeneration});
  // Deliberate isolated control: same final value, but a lost required after callback.
  const missingAfter=replaceOnce(next,'config.after(oldValue, finalValue, ctx);','void 0;');
  const good=preserved[0][1](next),badHost=host(missingAfter),badProxy=install(badHost);badProxy.value=3;
  assert.equal(badHost.raw.value,good.value);assert.throws(()=>assert.deepEqual(badHost.trace,good.trace));
  report.cases.push({name:'lost-after-callback-control',classification:'Regression',controlOnly:true,rejected:true,finalValueEqual:true,expectedTrace:good.trace,actualTrace:badHost.trace});
  const registryOnly=next.replaceAll('generations.get(path) !== generation','!registry[path]'),badGeneration=singleGeneration(registryOnly);
  assert.equal(badGeneration.newWrite.value,afterGeneration.newWrite.value);assert.equal(badGeneration.newWrite.trace.filter(v=>v[1]==='after').length,2);assert.throws(()=>assert.deepEqual(badGeneration,afterGeneration));
  report.cases.push({name:'registry-only-retirement-control',classification:'Intentional Change',controlOnly:true,rejected:true,finalValueEqual:true,actual:badGeneration});
  report.cases.push({name:'game-state-clone-save-and-device',classification:'Unknown',executed:false,reason:'No SugarCube clone/save lifecycle, real game, Android or other Hook engines executed'});
  report.status='passed';report.sourceSlices={oldSha256:sha(original),candidateSha256:sha(next)};
 }catch(error){report.status='failed';report.failedAssertion=error.code||error.name;throw error}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'})}
 console.log(JSON.stringify({status:report.status,preserved:report.cases.filter(c=>c.classification==='Preserved').length,intentionalChanges:report.cases.filter(c=>c.classification==='Intentional Change'&&!c.controlOnly).length,negativeControls:report.cases.filter(c=>c.controlOnly).length,unknownScopes:report.cases.filter(c=>c.classification==='Unknown').length,output:out}));
}
main();
