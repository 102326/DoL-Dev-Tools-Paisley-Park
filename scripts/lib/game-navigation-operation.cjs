// Shared synchronous guard. Action must reject here, before its internal
// operation starts, so a full receipt page never becomes an unresolvable effect.
const {checkHistory}=require('./game-native-history.cjs');
function preflight(node, config, engine, jq, footer, addon, tasks, history, historyCheck=checkHistory, monitor=null,taskReview=null) {
  const {namespace,binding,attemptId,before,reviewedFooter,controlDestination,timeoutMs}=config||{};
  const sugar=window.SugarCube,state=sugar?.State,story=sugar?.Story,variables=state?.variables;
  const context=window[namespace],rootNodes=document.querySelectorAll('#passages > .passage');
  const validText=value=>typeof value==='string'&&value.length>0&&value.length<=128;
  const validNumber=value=>Number.isFinite(value);
  const tasksEmpty=()=>Array.isArray(tasks)&&tasks.length===5&&Array.from(tasks).every(task=>{
    if(!task||typeof task!=='object')return false;
    const proto=Object.getPrototypeOf(task);return (proto===null||proto===Object.prototype)&&Reflect.ownKeys(task).length===0;
  });
  if(!validText(namespace)||!validText(attemptId)||!binding||!validText(binding.provider)||!validText(binding.contract)||
    !validText(binding.contextNonce)||typeof binding.requestDigest!=='string'||!/^[a-f0-9]{64}$/.test(binding.requestDigest)||
    !before||!validText(before.passage)||!Number.isSafeInteger(before.turns)||before.turns<0||!validNumber(before.time)||
    !Number.isSafeInteger(before.money)||before.money<0||reviewedFooter!==true||!validText(controlDestination)||
    !Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>10000||context?.nonce!==binding.contextNonce||
    context.version!==1||!context.records||Object.getPrototypeOf(context.records)!==null||!Object.isExtensible(context.records)||Object.hasOwn(context.records,attemptId)||Object.keys(context.records).length>=64||
    !node?.isConnected||typeof node.click!=='function'||node.getAttribute?.('data-passage')!==controlDestination||
    rootNodes.length!==1||!rootNodes[0].contains(node)||rootNodes[0].getAttribute('data-passage')!==before.passage||state?.passage!==before.passage||
    state.turns!==before.turns||variables?.timeStamp!==before.time||variables?.money!==before.money||
    engine!==sugar.Engine||!story||typeof story.get!=='function'||jq!==window.jQuery||typeof jq?.event?.trigger!=='function'||
    footer!==story.get('PassageFooter')||typeof footer?.processText!=='function'||addon!==null&&typeof addon!=='object')
    return 'navigation-preflight-unavailable';
  try{if(taskReview===null?!tasksEmpty():!Array.isArray(taskReview.tasks)||taskReview.tasks.length!==5||taskReview.tasks.some((t,i)=>t!==tasks[i])||taskReview.check('before')!==undefined)return 'native-lifecycle-tasks-unavailable'}
  catch{return 'native-lifecycle-tasks-unavailable'}
  try{if(history?.moments.length+history.expiredTitles.length!==before.turns||historyCheck(history,'before').ok!==true)return 'native-history-unavailable'}
  catch{return 'native-history-unavailable'}
  try{if(typeof engine.isIdle!=='function'||engine.isIdle()!==true)return 'native-engine-not-idle'}
  catch{return 'native-engine-not-idle'}
  const nativeThen=Promise.prototype.then;
  if(Function.prototype.toString.call(nativeThen)!=='function then() { [native code] }')
    return 'native-promise-unavailable';
  const observers=[[jq.event,'trigger'],[footer,'processText'],...(addon===null?[]:
    ['whenSC2PassageInit','whenSC2PassageStart','whenSC2PassageRender','whenSC2PassageDisplay','whenSC2PassageEnd'].map(key=>[addon,key]))];
  try{for(const [owner,key] of observers){
    if(!owner||!Object.isExtensible(owner))return 'navigation-observer-unavailable';
    const own=Object.getOwnPropertyDescriptor(owner,key);let descriptor=own,proto=owner;
    while(!descriptor&&(proto=Object.getPrototypeOf(proto)))descriptor=Object.getOwnPropertyDescriptor(proto,key);
    if(!descriptor||!Object.hasOwn(descriptor,'value')||typeof descriptor.value!=='function'||
      own&&(own.writable!==true||own.configurable!==true)||!own&&descriptor.writable!==true)return 'navigation-observer-unavailable';
  }}catch{return 'navigation-observer-unavailable'}
  if(monitor!==null)try{if(monitor.preflight()!==undefined)return 'native-time-unavailable'}
  catch{return 'native-time-unavailable'}
  return null;
}

// Browser-only reviewed operation; serialized callers supply the same guard.
async function operation(node, config, engine, jq, footer, addon = null, tasks, history, check = preflight, environmentCheck = () => undefined, historyCheck=checkHistory, monitor=null,taskReview=null) {
  const rejected=check(node,config,engine,jq,footer,addon,tasks,history,historyCheck,monitor,taskReview);
  if(rejected)return {ok:false,guardRejected:true,reason:rejected};
  try{if(environmentCheck('before')!==undefined)return {ok:false,guardRejected:true,reason:'native-environment-changed'}}
  catch{return {ok:false,guardRejected:true,reason:'native-environment-unavailable'}}
  const phases=['passageinit','passagestart','passagerender','passagedisplay','passageend'];
  const names=phases.map(name=>':'+name);
  const addonNames=['whenSC2PassageInit','whenSC2PassageStart','whenSC2PassageRender','whenSC2PassageDisplay','whenSC2PassageEnd'];
  const {namespace,binding,attemptId,before,controlDestination,timeoutMs}=config;
  const sugar=window.SugarCube,state=sugar.State,story=sugar.Story,context=window[namespace];
  const validText=value=>typeof value==='string'&&value.length>0&&value.length<=128;
  const validNumber=value=>Number.isFinite(value);
  const tasksEmpty=()=>Array.isArray(tasks)&&tasks.length===5&&Array.from(tasks).every(task=>{
    if(!task||typeof task!=='object')return false;
    const proto=Object.getPrototypeOf(task);return (proto===null||proto===Object.prototype)&&Reflect.ownKeys(task).length===0;
  });
  const nativeThen=Promise.prototype.then;

  let failed=false,reason='navigation-chain-unavailable',clicked=false,observedPassage=null,observedContent=null,activePhase=-1;
  let phaseIndex=0,footerCalls=0,resolveWait=()=>{},createdMoment,historyWitness,started,restored=false;
  const addonCalls=[0,0,0,0,0],observations=[];
  function persist(){
    if(!started||window[namespace]!==context||context.records[attemptId]!==started)return;
    const diagnostics=Object.freeze({reason:failed?reason:null,phases:phaseIndex,footerCalls,
      addonPending:observations.filter(o=>o.status==='pending').length,addonFulfilled:observations.filter(o=>o.status==='fulfilled').length,
      addonRejected:observations.filter(o=>o.status==='rejected').length,observersRestored:restored,historyCreated:!!createdMoment});
    started=Object.freeze({...binding,attemptId,status:'started',diagnostics});context.records[attemptId]=started;
  }
  const fail=why=>{if(!failed)reason=why;failed=true;persist()};
  const installs=[];
  function install(owner,key,wrap){
    if(!owner||!Object.isExtensible(owner))throw Error('owner-unavailable');
    const own=Object.getOwnPropertyDescriptor(owner,key);
    let inherited=own,proto=owner;
    while(!inherited&&(proto=Object.getPrototypeOf(proto)))inherited=Object.getOwnPropertyDescriptor(proto,key);
    if(!inherited||!Object.hasOwn(inherited,'value')||typeof inherited.value!=='function'||
      own&&(own.writable!==true||own.configurable!==true)||!own&&inherited.writable!==true)throw Error('descriptor-unavailable');
    const original=inherited.value;
    const wrapper=wrap(original);
    const installed=own?{...own,value:wrapper}:{value:wrapper,writable:true,configurable:true,enumerable:inherited.enumerable};
    Object.defineProperty(owner,key,installed);
    installs.push({owner,key,own,installed,wrapper,original});
  }
  function restore(){
    let clean=true;
    for(const item of installs.reverse()){
      const current=Object.getOwnPropertyDescriptor(item.owner,item.key);
      if(!current||current.value!==item.wrapper||current.writable!==item.installed.writable||
        current.configurable!==item.installed.configurable||current.enumerable!==item.installed.enumerable){clean=false;continue}
      try{if(item.own)Object.defineProperty(item.owner,item.key,item.own);else if(!delete item.owner[item.key])clean=false}
      catch{clean=false}
    }
    if(!clean)fail('observer-ownership-conflict');
    return clean;
  }
  const saveIntent=()=>{
    const now=window.SugarCube?.State,t=now?.temporary,v=now?.variables;
    return !!t?.autosavehere&&!t?.preventUpdate&&!v?.options?.autosaveDisabled;
  };
  function engineSaveGuard(passage,index){
    // Original Engine.play runs prehistory after :passageinit returns and
    // before State.create/:passagestart. Its cleanup is still pending at init.
    if(taskReview===null?!tasksEmpty():taskReview.check(index===0?'before':'after')!==undefined){fail('native-lifecycle-tasks-changed');throw Error('Unreviewed native lifecycle tasks')}
    const fresh=window.SugarCube,autosave=fresh?.Config?.saves?.autosave,tags=passage?.tags;
    if(fresh?.State?.variables?.ironmanmode===true||
      !(autosave===false||Array.isArray(autosave)&&Array.isArray(tags)&&!autosave.some(tag=>tags.includes(tag)))){
      fail('unreviewed-save-intent');throw Error('Unreviewed native save intent');
    }
  }
  try{
    install(jq.event,'trigger',original=>function(event,...args){
      const index=names.indexOf(event?.type);
      if(index<0)return Reflect.apply(original,this,[event,...args]);
      if(this!==jq.event||activePhase!==-1||index!==phaseIndex)fail('passage-phase-order');
      const passage=event.passage,title=passage?.title;
      if(!validText(title)||story.get(title)!==passage||observedPassage&&observedPassage!==passage)fail('passage-identity');
      if(!observedPassage)observedPassage=passage;
      if(index>0){
        if(!event.content||typeof event.content.getAttribute!=='function'||observedContent&&observedContent!==event.content)fail('passage-content');
        if(!observedContent)observedContent=event.content;
      }
      const witness=historyCheck(history,index===0?'before':'after',index>1?createdMoment:undefined);
      if(witness?.ok!==true){fail('native-history-changed');throw Error('Native history witness changed')}
      if(index===1){createdMoment=witness.moment;historyWitness=witness.evidence}
      engineSaveGuard(passage,index);
      if(index===0&&window.SugarCube?.State?.temporary?.autosavehere){fail('unreviewed-save-intent');throw Error('Unreviewed native save intent')}
      phaseIndex++;
      persist();
      const prior=activePhase;activePhase=index;
      try{const result=Reflect.apply(original,this,[event,...args]);engineSaveGuard(passage,index);return result}
      catch(error){fail('passage-phase-threw');throw error}
      finally{activePhase=prior}
    });
    install(footer,'processText',original=>function(...args){
      footerCalls++;
      if(this!==footer||footerCalls!==1||saveIntent()){fail('footer-save-intent');throw Error('Unreviewed native footer save intent')}
      try{
        const result=Reflect.apply(original,this,args);
        if(saveIntent()){fail('footer-save-intent');throw Error('Native footer processing changed save intent')}
        return result;
      }catch(error){fail('footer-threw');throw error}
    });
    if(addon!==null)for(let index=0;index<5;index++){
      const name=addonNames[index];
      install(addon,name,original=>function(...args){
        addonCalls[index]++;
        if(this!==addon||activePhase!==index||addonCalls[index]!==1)fail('addon-phase-order');
        let returned;
        try{returned=Reflect.apply(original,this,args)}catch(error){fail('addon-phase-threw');throw error}
        if(!returned||Object.getPrototypeOf(returned)!==Promise.prototype||Promise.prototype.then!==nativeThen){fail('addon-promise-unavailable');return returned}
        const observed={status:'pending'};observations.push(observed);
        persist();
        try{Reflect.apply(nativeThen,returned,[()=>{observed.status='fulfilled';persist();resolveWait()},()=>{observed.status='rejected';fail('addon-phase-rejected');resolveWait()}])}
        catch{fail('addon-promise-observer-unavailable')}
        return returned;
      });
    }
    if(monitor!==null){monitor.install(install,fail);if(failed)throw Error('native-time-install-failed')}
  }catch{
    const clean=restore();
    return {ok:false,...(clean?{guardRejected:true}:{}),reason:clean?'navigation-observer-unavailable':'observer-ownership-conflict'};
  }
  started=Object.freeze({...binding,attemptId,status:'started'});
  context.records[attemptId]=started;
  persist();
  try{clicked=true;node.click()}catch{fail('original-navigation-threw')}
  finally{restored=restore();persist()}
  if(!clicked||!restored||failed||phaseIndex!==5||footerCalls!==1||addon!==null&&addonCalls.some(count=>count!==1)){
    fail('navigation-phase-incomplete');return {ok:false,reason};
  }

  if(observations.length){
    const settled=await new Promise(resolve=>{
      let finished=false;
      const timer=setTimeout(()=>{if(!finished){finished=true;resolve(false)}},timeoutMs);
      resolveWait=()=>{if(!finished&&observations.every(item=>item.status!=='pending')){finished=true;clearTimeout(timer);resolve(true)}};
      resolveWait();
    });
    resolveWait=()=>{};
    if(!settled||failed||observations.some(item=>item.status!=='fulfilled')){fail(!settled?'addon-phase-timeout':'addon-phase-rejected');return {ok:false,reason}}
  }
  let timeWitness,taskWitness;
  if(taskReview!==null)try{taskWitness=taskReview.finish()}catch{fail('native-lifecycle-tasks-changed');return {ok:false,reason}}
  if(monitor!==null){
    try{
      timeWitness=monitor.finish();
      if(!timeWitness||typeof timeWitness!=='object'||Reflect.ownKeys(timeWitness).length!==5||Object.keys(timeWitness).sort().join(',')!=='callbacks,hookTablesEmpty,kind,seconds,synchronous'||
        timeWitness.kind!=='native-time'||!Number.isSafeInteger(timeWitness.seconds)||timeWitness.seconds<60||timeWitness.seconds>=3600||timeWitness.seconds%60!==0||![4,8].includes(timeWitness.callbacks)||timeWitness.hookTablesEmpty!==true||timeWitness.synchronous!==true)
        throw Error('Native time witness unavailable');
    }catch{fail('native-time-unavailable');return {ok:false,reason}}
  }
  // Profile eligibility must survive the actual business tail. It is a
  // reviewed local guard, not a claim that all page activity has stopped.
  try{if(environmentCheck('after')!==undefined){fail('native-environment-changed');return {ok:false,reason}}}
  catch{fail('native-environment-unavailable');return {ok:false,reason}}
  const after=window.SugarCube?.State,v=after?.variables,roots=document.querySelectorAll('#passages > .passage');
  const title=observedPassage?.title;
  let idle=true;
  try{if(typeof engine.isIdle==='function')idle=engine.isIdle()===true}catch{idle=false}
  if(historyCheck(history,'after',createdMoment)?.ok!==true){fail('native-history-changed');return {ok:false,reason}}
  if(failed||!idle||(taskReview===null?!tasksEmpty():taskReview.check('after')!==undefined)||window.SugarCube?.Engine!==engine||window.jQuery!==jq||Promise.prototype.then!==nativeThen||
    window[namespace]!==context||context.records[attemptId]!==started||
    roots.length!==1||roots[0]!==observedContent||!roots[0]?.isConnected||roots[0].getAttribute('data-passage')!==title||
    after?.passage!==title||story.get(title)!==observedPassage||
    !Number.isSafeInteger(v?.money)||v.money<0||!validNumber(v?.timeStamp)||monitor!==null&&v.timeStamp-before.time!==timeWitness.seconds||
    installs.some(item=>{const current=Object.getOwnPropertyDescriptor(item.owner,item.key);return item.owner[item.key]!==item.original||
      (item.own?current?.value!==item.own.value:!!current)}))
    {fail('navigation-final-state-unavailable');return {ok:false,reason}}
  // The reviewed original redirect may lead to another Scene. Closing this
  // operation never asserts that the intended destination or Goal was reached.
  const evidence={kind:'native-passage',from:before.passage,intended:controlDestination,to:title,redirected:title!==controlDestination,turnBefore:before.turns,turnAfter:after.turns,
    timeBefore:before.time,timeAfter:v.timeStamp,moneyBefore:before.money,moneyAfter:v.money,phases:5,addonSettled:observations.length,history:historyWitness,
    ...(monitor===null?{}:{time:timeWitness}),...(taskReview===null?{}:{tasks:taskWitness})};
  const receipt=Object.freeze({...binding,attemptId,status:'terminal',outcome:'occurred',remoteClosed:true,
    spent:Math.max(0,before.money-v.money),evidence});
  context.records[attemptId]=receipt;
  return {ok:true,receipt};
}
module.exports={operation,preflight};
