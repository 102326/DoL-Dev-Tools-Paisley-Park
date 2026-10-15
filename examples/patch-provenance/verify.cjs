'use strict';
// Opt-in source experiment. Executes reviewed upstream code, never game pages or saves.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {createHash}=require('node:crypto'),{createRequire}=require('node:module'),{execFileSync}=require('node:child_process');
const [tweeRoot,linkerRoot,compilerFile,dependencyRoot,out]=process.argv.slice(2).map(v=>path.resolve(v));
assert.equal(process.argv.length,7,'Usage: node verify.cjs TWEE_ROOT LINKER_ROOT TYPESCRIPT_JS DEPENDENCY_ROOT NEW_OUT');
assert.ok(!fs.existsSync(out),'Output must not exist');
const ts=require(compilerFile),dependencyRequire=createRequire(path.join(dependencyRoot,'package.json'));
const hash=value=>createHash('sha256').update(value).digest('hex');
const files=[path.join(tweeRoot,'src/TweeReplacer.ts'),path.join(linkerRoot,'src/TweeReplacerLinker.ts')];
const sources=files.map(file=>{
 execFileSync('git',['-C',path.dirname(file),'diff','--exit-code','HEAD','--',file],{windowsHide:true});
 return {file,sha256:hash(fs.readFileSync(file)),head:execFileSync('git',['-C',path.dirname(file),'rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim()};
});
assert.equal(sources[0].head,'5094160465b0c5ef034eb5acd3d4f8122bdf8e09');
assert.equal(sources[1].head,'bb045cb493b284cef33ddcdebb972ad846349a52');
const quiet={log(){},warn(){},error(){}};
function diagnosticSource(source){
 assert.ok(!source.includes('__pp')&&!source.includes('__paisleyRecorder'),'Diagnostic names must not shadow source');
 const ast=ts.createSourceFile('reviewed.ts',source,ts.ScriptTarget.Latest,true),loops=[];
 const visit=node=>{if(ts.isForOfStatement(node)&&node.initializer.getText(ast)==='const p'&&node.expression.getText(ast)==='params')loops.push(node);ts.forEachChild(node,visit)};visit(ast);
 assert.equal(loops.length,1,'Pinned rule loop required');const loop=loops[0];assert.ok(ts.isBlock(loop.statement));
 const markers=loop.statement.statements.filter(n=>n.getText(ast)==='++okCount;');assert.equal(markers.length,1);
 const edits=[
  [loop.getStart(ast),'let __ppRuleIndex=0;\n'],
  [loop.statement.getStart(ast)+1,'\nconst __ppToken=__paisleyRecorder.begin(ri,p,sc,__ppRuleIndex++);let __ppApplied=false,__ppThrew=false;try{\n'],
  [markers[0].getEnd(),'__ppApplied=true;'],
  [loop.statement.getEnd()-1,'\n}catch(__ppError){__ppThrew=true;throw __ppError}finally{__paisleyRecorder.end(__ppToken,p,sc,__ppApplied,__ppThrew)}\n'],
 ];
 for(const [offset,text] of edits.sort((a,b)=>b[0]-a[0]))source=source.slice(0,offset)+text+source.slice(offset);
 return source;
}
function load(file,recorder){
 const raw=fs.readFileSync(file,'utf8'),source=recorder?diagnosticSource(raw):raw;
 const compiled=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 const module={exports:{}};
 new Function('require','module','exports','console','__paisleyRecorder',compiled.outputText)(dependencyRequire,module,module.exports,quiet,recorder);
 return module.exports;
}
const {TweeReplacer}=load(files[0]),{TweeReplacerLinker}=load(files[1]);
const passageName='Owned Passage';
const data=content=>({passageDataItems:{map:new Map([[passageName,{name:passageName,content}]]),back2Array(){this.items=[...this.map.values()]}}});
const content=sc=>sc.passageDataItems.map.get(passageName).content;
const rule=(findString,replace,extra={})=>({passage:passageName,findString,replace,...extra});

async function run(test,observed){
 const selected=observed==='selected',cooperative=observed==='cooperative'||selected;observed=observed===true;
 const initial=test.initial,logs=[],events=[],callbackOrder=[];
 let published=initial,publishState='not-started',releasePublish,publishPromise,working,phase='not-started',dropped=0,firstFailure=null;
 const record=event=>{if(!firstFailure&&['threw','rejected','failed'].includes(event.phase))firstFailure={...event};if(events.length<64)events.push({sequence:events.length+1,...event});else dropped++};
 const logger={log:m=>logs.push(m),warn:m=>logs.push(m),error:m=>logs.push(m)};
 const old={cloneSC2DataInfo(){working=data(initial);return working}};
 const mods=new Map([['TweeReplacer',{name:'TweeReplacer'}],['TweeReplacerLinker',{name:'TweeReplacerLinker'}]]);
 let running='TweeReplacerLinker';
 const utils={getLogger:()=>logger,getAddonPluginManager:()=>({registerAddonPlugin(){}}),getNowRunningModName:()=>running,getMod:name=>mods.get(name),
  replaceFollowSC2DataInfo(next,previous){
   assert.equal(previous,old);publishState='started';
   if(observed)record({kind:'publication',phase:'started',inputSha256:hash(content(next))});
   if(test.publish==='throw'){publishState='failed';if(observed)record({kind:'publication',phase:'failed'});throw Error('owned-publish-failed')}
   if(test.publish==='deferred'){
    publishPromise=new Promise(resolve=>{releasePublish=()=>{published=content(next);publishState='completed';resolve()}});
    return publishPromise;
   }
   published=content(next);publishState='completed';if(observed)record({kind:'publication',phase:'completed',outputSha256:hash(published)});
  }};
 const snapshot=(p,sc)=>{
  const descriptor=Object.getOwnPropertyDescriptor(p,'passage');
  if(!descriptor||typeof descriptor.value!=='string')return {status:'unsupported'};
  const resource=descriptor.value,passage=Map.prototype.get.call(sc.passageDataItems.map,resource),value=passage?.content;
  return {resourceSha256:hash(resource),status:typeof value!=='string'?'absent':Buffer.byteLength(value)>131072?'content-limit':'captured',sha256:typeof value==='string'&&Buffer.byteLength(value)<=131072?hash(value):null};
 };
 const recorder={
  begin(ri,p,sc,index){try{const token={kind:'rule',mod:ri.mod.name,ruleIndex:index,sourceSha256:sources[0].sha256,before:snapshot(p,sc)};record({...token,phase:'started'});return token}catch{dropped++;return null}},
  end(token,p,sc,applied,threw){try{if(!token)return;const after=snapshot(p,sc);record({...token,phase:threw?'threw':applied?'applied':'not-applied',after,bytesChanged:token.before.status==='captured'&&after.status==='captured'?token.before.sha256!==after.sha256:null,matchCount:null})}catch{dropped++}},
 };
 const RuntimeReplacer=observed?load(files[0],recorder).TweeReplacer:TweeReplacer;
 const manager={getSC2DataInfoAfterPatch:()=>old};
 const linker=new TweeReplacerLinker(manager,utils);running='TweeReplacer';
 const replacer=new RuntimeReplacer(manager,utils);await replacer.afterEarlyLoad();
 const original=replacer.do_patch;
 const observer=cooperative?require('./observe.cjs').install({replacer,utils,resources:[passageName],mods:selected?['owned-mod-0']:null,identity:{documentId:'owned-fixture',sourceSha256:sources[0].sha256}}):null;
 const wrapper=function(ri,sc){
  const event={kind:'do_patch',mod:ri.mod.name,sourceSha256:sources[0].sha256,inputSha256:hash(content(sc)),phase:'started'};
  record(event);
  // The upstream method is async. Return its exact Promise, not an async wrapper's Promise.
  const result=Reflect.apply(original,this,arguments);
  result.then(()=>record({...event,phase:'resolved',outputSha256:hash(content(sc))}),()=>record({...event,phase:'rejected',outputSha256:hash(content(sc))}));
  return result;
 };
 if(observed)replacer.do_patch=wrapper;
 let error=null;
 try{
  for(const [index,entry] of test.entries.entries()){
   if(entry.callback){
    await linker.addUserMod('OwnedOtherClient','owned-callback',async sc=>{
     callbackOrder.push('owned-callback');if(observed)record({kind:'callback',phase:'started',inputSha256:hash(content(sc))});
     sc.passageDataItems.map.get(passageName).content+=' X';
    });continue;
   }
   const name='owned-mod-'+index;
   const mod={name,bootJson:{addonPlugin:[{modName:'TweeReplacer',addonName:'TweeReplacerAddon',params:entry}]}};
   const zip={zip:{file:()=>null}};
   await replacer.registerMod('TweeReplacerAddon',mod,zip);
   const cc=linker.userCallback.at(-1),call=cc.callback;
   cc.callback=function(...args){callbackOrder.push(name);return Reflect.apply(call,this,args)};
  }
  phase='started';await linker.afterPatchModToGame();phase='resolved';
 }catch(e){phase='rejected';error=e.message}
 finally{
  if(observed){assert.equal(replacer.do_patch,wrapper);replacer.do_patch=original;assert.equal(replacer.do_patch,original)}
 }
 const atReturn={phase,error,publishState,published,working:content(working),callbackOrder,logs};
 if(releasePublish){releasePublish();await publishPromise}
 let cooperativeReport=null;
 if(observer){
  for(let i=0;i<200&&JSON.stringify(observer.read()).includes('digest-pending');i++)await new Promise(resolve=>setImmediate(resolve));
  assert.ok(!JSON.stringify(observer.read()).includes('digest-pending'),'Fixture digest settlement');
  assert.deepEqual(observer.stop(),{patch:'restored',publication:'restored'});cooperativeReport=observer.read();
 }
 return {atReturn,afterDeferred:publishState==='completed'?published:null,events,dropped,firstFailure,ownMethodRestored:replacer.do_patch===original,...(cooperative?{cooperativeReport}:{})};
}

const cases=[
 {name:'independent-changes',initial:'alpha beta',entries:[[rule('alpha','ALPHA')],[rule('beta','BETA')]],expected:'ALPHA BETA'},
 {name:'earlier-removes-anchor',initial:'anchor',entries:[[rule('anchor','gone')],[rule('anchor','later')]],expected:'gone',missing:true},
 {name:'later-overwrites-output',initial:'alpha',entries:[[rule('alpha','first')],[rule('first','last')]],expected:'last'},
 {name:'regex-many-matches-one-ok-rule',initial:'a1 a2 a3',entries:[[{passage:passageName,findRegex:'a\\d',replace:'z',all:true}]],expected:'z z z',oneOk:true},
 {name:'match-without-byte-change',initial:'alpha',entries:[[rule('alpha','alpha')]],expected:'alpha',oneOk:true},
 {name:'two-rules-one-mod',initial:'alpha beta',entries:[[rule('alpha','ALPHA'),rule('beta','BETA')]],expected:'ALPHA BETA',twoRules:true},
 {name:'mixed-client-registration-order',initial:'alpha beta',entries:[[rule('alpha','ALPHA')],{callback:true},[rule('beta','BETA')]],expected:'ALPHA BETA X',order:['owned-mod-0','owned-callback','owned-mod-2']},
 {name:'callback-rejects-next-still-runs',initial:'alpha',entries:[[{passage:passageName,findRegex:'[',replace:'x'}],[rule('alpha','last')]],expected:'last',rejected:true},
 {name:'publication-throws',initial:'alpha',entries:[[rule('alpha','ALPHA')]],publish:'throw',expected:'alpha',phase:'rejected'},
 {name:'publication-unsettled-at-callback-return',initial:'alpha',entries:[[rule('alpha','ALPHA')]],publish:'deferred',expected:'alpha',deferred:true},
 {name:'bounded-records-retain-first-failure',initial:'alpha',entries:[[...Array.from({length:40},()=>rule('alpha','alpha')),{passage:passageName,findRegex:'[',replace:'x'}]],expected:'alpha',capacity:true},
 {name:'oversized-content-not-hashed',initial:'a'.repeat(131073),entries:[[rule('a','b')]],expected:'b'+'a'.repeat(131072),contentLimit:true},
];

(async()=>{
 fs.mkdirSync(out,{recursive:false});
 const report={status:'running',scope:'real pinned upstream classes; synthetic loader working copy and publisher; no real DoL or device',sources,compiler:{file:compilerFile,version:ts.version},dependencies:{lodash:dependencyRequire('lodash/package.json').version,json5:dependencyRequire('json5/package.json').version},diagnosticBuild:'AST-located local rule-loop instrumentation; changes source/function identity and timing; compared against original build only for declared fixture behavior',publicationBoundary:'The deferred publisher is an adversarial replacement, not evidence that native ModLoader publication is asynchronous. Native DOM publication requires a separate experiment.',cases:[]};
 try{
  for(const test of cases){
   const control=await run(test,false),observed=await run(test,true),cooperative=await run(test,'cooperative'),selected=await run(test,'selected');
   assert.deepEqual(selected.atReturn,control.atReturn,test.name+' selected observer perturbation');
   assert.equal(selected.afterDeferred,control.afterDeferred);assert.equal(selected.ownMethodRestored,true);
   assert.equal(selected.cooperativeReport.filtered,test.entries.filter(e=>!e.callback).length-1);
   assert.equal(selected.cooperativeReport.dropped,0);
   assert.ok(selected.cooperativeReport.events.filter(e=>e.kind==='do_patch').every(e=>e.mod==='owned-mod-0'));
   assert.deepEqual(cooperative.atReturn,control.atReturn,test.name+' cooperative observer perturbation');
   assert.equal(cooperative.afterDeferred,control.afterDeferred);
   assert.equal(cooperative.ownMethodRestored,true);
   assert.equal(cooperative.cooperativeReport.observerErrors,0);
   if(test.deferred)assert.equal(cooperative.cooperativeReport.events.at(-1).phase,'returned-unsettled');
   if(test.publish==='throw')assert.equal(cooperative.cooperativeReport.events.at(-1).phase,'threw');
   assert.deepEqual(observed.atReturn,control.atReturn,test.name+' observer perturbation');
   assert.equal(observed.afterDeferred,control.afterDeferred);
   assert.equal(observed.atReturn.published,test.expected,test.name);
   assert.equal(observed.atReturn.phase,test.phase||'resolved');
   assert.equal(observed.ownMethodRestored,true);
   if(test.capacity){assert.equal(observed.events.length,64);assert.ok(observed.dropped>0);assert.equal(observed.firstFailure.phase,'threw')}
   else assert.equal(observed.dropped,0);
   if(test.missing)assert.ok(observed.atReturn.logs.some(m=>m.includes('cannot find findString')));
   if(test.oneOk)assert.ok(observed.atReturn.logs.some(m=>m.includes('okCount:[1]')));
   const ruleEnds=observed.events.filter(e=>e.kind==='rule'&&e.phase!=='started');
   if(!test.capacity)assert.equal(ruleEnds.length,test.entries.filter(e=>!e.callback).reduce((n,e)=>n+e.length,0));
   if(test.contentLimit){assert.equal(ruleEnds[0].before.status,'content-limit');assert.equal(ruleEnds[0].after.status,'content-limit');assert.equal(ruleEnds[0].before.sha256,null);assert.equal(ruleEnds[0].bytesChanged,null)}
   if(test.twoRules){assert.deepEqual(ruleEnds.map(e=>e.ruleIndex),[0,1]);assert.equal(ruleEnds[0].after.sha256,ruleEnds[1].before.sha256)}
   if(test.name==='match-without-byte-change'){assert.equal(ruleEnds[0].phase,'applied');assert.equal(ruleEnds[0].bytesChanged,false)}
   if(test.missing)assert.equal(ruleEnds[1].phase,'not-applied');
   if(test.rejected)assert.equal(ruleEnds[0].phase,'threw');
   if(test.order)assert.deepEqual(observed.atReturn.callbackOrder,test.order);
   if(test.rejected)assert.ok(observed.events.some(e=>e.phase==='rejected'));
   if(test.deferred){assert.equal(observed.atReturn.publishState,'started');assert.equal(observed.atReturn.working,'ALPHA');assert.equal(observed.afterDeferred,'ALPHA')}
   report.cases.push({name:test.name,assertions:'passed',...observed,cooperative:cooperative.cooperativeReport,selected: selected.cooperativeReport});
  }
  report.status='passed';
 }catch(error){report.status='failed';report.error=error.message;process.exitCode=1}
 finally{fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,status:report.status,cases:report.cases.map(c=>c.name)}))}
})();
