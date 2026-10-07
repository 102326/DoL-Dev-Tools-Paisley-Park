const test=require('node:test');
const assert=require('node:assert/strict');
const {operation,preflight}=require('../scripts/lib/game-navigation-operation.cjs');
const {capture,checkHistory}=require('../scripts/lib/game-native-history.cjs');
const renderTasks=require('../scripts/lib/game-native-render-tasks.cjs');

const phaseNames=['passageinit','passagestart','passagerender','passagedisplay','passageend'];
const addonNames=['whenSC2PassageInit','whenSC2PassageStart','whenSC2PassageRender','whenSC2PassageDisplay','whenSC2PassageEnd'];
function fixture({addon=true,lateEnd,saveIntent=false,badPhase=false,foreignReplacement=false,lockedTrigger=false,changeAutosave=false,redirect=false,outsideRoot=false,beforeHistory,
  historyCount=3,expiredCount=0,maxStates=5,maxExpired=100,noHistory=false,extraHistory=false,corruptHistory=false}={}){
  const previousWindow=global.window,previousDocument=global.document,tasks=Array.from({length:5},()=>Object.create(null));
  const records=Object.create(null),namespace='__testNativeReceipts',nonce='12345678-1234-4123-8123-123456789abc';
  const before={passage:'TownLibrary',turns:historyCount+expiredCount,time:1,money:10};
  const state={passage:'TownLibrary',variables:{timeStamp:1,money:10,ironmanmode:false,options:{autosaveDisabled:false}},temporary:{}};
  const moments=Array.from({length:historyCount},(_,i)=>({title:i===historyCount-1?'TownLibrary':'Earlier'+i})),expired=Array(expiredCount).fill('Expired');
  Object.defineProperties(state,{history:{get:()=>moments},expired:{get:()=>expired},activeIndex:{get:()=>moments.length-1},turns:{get:()=>moments.length+expired.length},
    create:{value:function(title){moments.push({title});while(moments.length>maxStates){const removed=moments.shift();if(maxExpired>0)expired.push(removed.title)}while(expired.length>maxExpired)expired.shift()}}});
  const actual=redirect?'RandomDialogue':'TownPark',current={title:'TownLibrary',tags:[]},destination={title:actual,tags:[]};
  let root={isConnected:true,contains:()=>!outsideRoot,getAttribute:key=>key==='data-passage'?'TownLibrary':null},clicks=0,footerCalls=0,idle=true;
  const content={isConnected:true,getAttribute:key=>key==='data-passage'?actual:null};
  const footer={processText(){footerCalls++}};
  const story={get:name=>name==='TownLibrary'?current:name===actual?destination:name==='PassageFooter'?footer:null};
  const engine={isIdle:()=>idle};
  const addonObject=addon?Object.fromEntries(addonNames.map((name,index)=>[name,function(){return index===4&&lateEnd?lateEnd.promise:Promise.resolve()}])):null;
  const jq={event:{trigger(event){
    const index=phaseNames.findIndex(name=>event.type===':'+name);
    if(badPhase&&index===1){try{jq.event.trigger({type:':passageend',passage:destination,content})}catch{}}
    if(addonObject&&index>=0)addonObject[addonNames[index]]();
    if(changeAutosave&&index===3)window.SugarCube.Config.saves.autosave=true;
  }}};
  if(lockedTrigger)Object.defineProperty(jq.event,'trigger',{value:jq.event.trigger,writable:false,configurable:false});
  const node={isConnected:true,getAttribute:key=>key==='data-passage'?'TownPark':null,click(){
    clicks++;idle=false;
    jq.event.trigger({type:':passageinit',passage:destination});
    beforeHistory?.();
    root=content;state.passage=actual;if(!noHistory)state.create(actual);if(corruptHistory)moments[0]={title:moments[0].title};state.variables.money=9;state.variables.timeStamp=2;
    jq.event.trigger({type:':passagestart',passage:destination,content});
    if(saveIntent)state.temporary.autosavehere=true;
    try{footer.processText()}catch{}
    for(const name of phaseNames.slice(2))jq.event.trigger({type:':'+name,passage:destination,content});
    if(extraHistory)state.create(actual);
    if(foreignReplacement)jq.event.trigger=function foreignTrigger(){};
    idle=true;
  }};
  const config={namespace,binding:{provider:'native-dol',contract:'native-passage-'+ 'a'.repeat(12),contextNonce:nonce,requestDigest:'a'.repeat(64)},attemptId:'12345678-1234-4123-8123-123456789abd',before,reviewedFooter:true,controlDestination:'TownPark',timeoutMs:30};
  global.window={SugarCube:{State:state,Story:story,Engine:engine,Config:{saves:{autosave:false},history:{maxStates,maxExpired}}},jQuery:jq,[namespace]:{version:1,nonce,records}};
  global.document={querySelectorAll:selector=>selector==='#passages > .passage'?[root]:[]};
  const expected=Object.fromEntries(['history','expired','activeIndex','turns','create'].map(key=>[key,(Object.getOwnPropertyDescriptor(state,key).get||state[key]).toString()]));
  const history=capture(state,moments,expired,expected);
  return {node,config,engine,jq,footer,addon:addonObject,tasks,history,records,get clicks(){return clicks},get footerCalls(){return footerCalls},restore(){global.window=previousWindow;global.document=previousDocument}};
}

test('the shared navigation operation accepts only the bound original render cleanup and preserves its finite proof',async()=>{
  for(const fault of ['none','leftover','other-table']){
    let cleanup;const f=fixture({addon:false,beforeHistory:()=>cleanup()});try{
      const timers=new Set([1]),key='#timed-timers-cleanup',fn=task=>{delete f.tasks[0][task];if(fault!=='leftover')timers.clear()};f.tasks[0][key]=fn;
      const clearTimeout=()=>{},clearInterval=()=>{};window.clearTimeout=clearTimeout;window.clearInterval=clearInterval;
      const taskReview={tasks:fault==='other-table'?Array.from({length:5},()=>Object.create(null)):f.tasks,
        rows:[{key,fn,timers,ids:[1],source:fn.toString()}],clearTimeout,clearInterval,check:renderTasks.check,finish:renderTasks.finish};
      cleanup=()=>fn(key);
      const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history,preflight,()=>undefined,checkHistory,null,taskReview);
      if(fault==='none')assert.deepEqual(result.receipt.evidence.tasks,{kind:'native-render-cleanup',tasks:1,timersBefore:1,timersAfter:0,registriesEmpty:true});
      else{assert.equal(result.ok,false);assert.equal(f.clicks,fault==='other-table'?0:1);assert.equal(f.records[f.config.attemptId]?.status,fault==='other-table'?undefined:'started')}
    }finally{f.restore()}
  }
});

test('shared serialized Action preflight rejects exhausted receipts, stale state and uninstallable observers before the operation',async()=>{
  const vm=require('node:vm'),{execute}=require('../scripts/lib/action.cjs');
  for(const change of [f=>{for(let n=0;n<64;n++)f.records[n]={status:'terminal'}},f=>{f.records[f.config.attemptId]={status:'started'}},
    ()=>{window.SugarCube.State.variables.money++},f=>{f.tasks[0].late=()=>{}},f=>{Object.preventExtensions(f.footer)},
    f=>{Object.defineProperty(f.jq.event,'trigger',{writable:false})}]){
    const f=fixture({addon:false});let operations=0;
    try{
      change(f);Object.assign(f.node,{matches:()=>false,closest:()=>null,getClientRects:()=>[1]});
      const roots=document.querySelectorAll;document.querySelectorAll=s=>s==='#native'?[f.node]:roots(s);
      const globals={window,document,Object,Promise,HTMLElement:Object,getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'}),
        config:f.config,engine:f.engine,jq:f.jq,footer:f.footer,tasks:f.tasks,history:f.history,runOperation:()=>{operations++;throw Error('Must not start')}};
      const pkg='com.example.game',replies={'get-state':'device','shell am get-current-user':'0',
        [`shell dumpsys package ${pkg}`]:`Package [${pkg}]\n versionCode=1\n User 0: installed=true`,
        'shell dumpsys activity activities':`topResumedActivity: u0 ${pkg}/.Main`,
        'shell dumpsys window displays':`mCurrentFocus=Window{ u0 ${pkg}/.Main }`};
      const ctx={options:{serial:'fixture',package:pkg},adb:async(...args)=>Buffer.from(replies[args.join(' ')]||''),
        webGuard:{objectId:'node',source:`if((${preflight.toString()})(node,config,engine,jq,footer,null,tasks,history,${checkHistory.toString()})!==null)return {ok:false,guardRejected:true};`,
          operation:{name:'native-passage',source:'return runOperation();'}},
        ensureWebview:async()=>({evaluate(){throw Error('Unbound evaluation')},async send(method,p){
          assert.equal(method,'Runtime.callFunctionOn');return{result:{value:await vm.runInNewContext(`(${p.functionDeclaration})`,globals).call(f.node)}}}})};
      await assert.rejects(execute(ctx,{type:'web-click',selector:'#native'}),e=>e.notDispatched===true);
      assert.equal(operations,0);assert.equal(f.clicks,0);
    }finally{f.restore()}
  }
});

test('serialized navigation operation receives its shared preflight without a host closure',async()=>{
  const vm=require('node:vm'),f=fixture({addon:false});
  try{
    const run=vm.runInNewContext(`(node,config,engine,jq,footer,tasks,history)=>(${operation.toString()})(node,config,engine,jq,footer,null,tasks,history,${preflight.toString()},()=>undefined,${checkHistory.toString()})`,
      {window,document,Object,Promise,setTimeout,clearTimeout});
    const result=await run(f.node,f.config,f.engine,f.jq,f.footer,f.tasks,f.history);
    assert.equal(result.receipt.remoteClosed,true);assert.equal(f.clicks,1);
  }finally{f.restore()}
});

test('a profile change in the original delayed business tail cannot sign terminal',async()=>{
  let allowed=true,resolveEnd;const lateEnd={promise:new Promise(resolve=>{resolveEnd=()=>{allowed=false;resolve()}})},f=fixture({lateEnd});
  try{
    const pending=operation(f.node,f.config,f.engine,f.jq,f.footer,f.addon,f.tasks,f.history,preflight,()=>allowed?undefined:{ok:false});
    assert.equal(f.clicks,1);assert.equal(f.records[f.config.attemptId].status,'started');
    resolveEnd();const result=await pending;
    assert.equal(result.ok,false);assert.equal(result.guardRejected,undefined);assert.equal(result.reason,'native-environment-changed');
    assert.equal(f.records[f.config.attemptId].status,'started');assert.equal(f.clicks,1);
  }finally{f.restore()}
});

test('waits for the original delayed addon phase before signing an actual-cost navigation receipt',async()=>{
  let resolveEnd;const lateEnd={promise:new Promise(resolve=>{resolveEnd=resolve})},f=fixture({lateEnd});
  try{
    const pending=operation(f.node,f.config,f.engine,f.jq,f.footer,f.addon,f.tasks,f.history);
    assert.equal(f.records[f.config.attemptId].status,'started');
    assert.equal(f.clicks,1);
    resolveEnd();
    const result=await pending;
    assert.equal(result.ok,true);
    assert.equal(result.receipt.status,'terminal');assert.equal(result.receipt.spent,1);
    assert.deepEqual(result.receipt.evidence.phases,5);assert.equal(result.receipt.evidence.addonSettled,5);
    assert.equal(f.records[f.config.attemptId],result.receipt);
    const {provider}=require('../scripts/lib/game-capabilities.cjs'),effect={action:{kind:'navigation',destination:'TownPark',selected:{type:'web-click',selector:'#native'},capability:{provider:'native-dol',name:'control'}},executionBinding:f.config.binding};
    assert.equal(provider.validateReceipt(result.receipt,effect),true);
    assert.equal(provider.validateReceipt({...result.receipt,spent:0},effect),false);
    assert.equal(provider.validateReceipt({...result.receipt,evidence:undefined},effect),false);
    assert.equal(provider.validateReceipt({...result.receipt,evidence:{...result.receipt.evidence,phases:4}},effect),false);
    assert.equal(provider.validateReceipt(result.receipt,{...effect,executionBinding:{...f.config.binding,contract:'unreviewed'}}),false);
    assert.equal(provider.validateReceipt(result.receipt,{...effect,action:{...effect.action,destination:'DifferentControl'}}),false);
  }finally{f.restore()}
});

test('a swallowed out-of-order phase remains sticky and leaves started',async()=>{
  const f=fixture({badPhase:true});try{
    const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,f.addon,f.tasks,f.history);
    assert.equal(result.ok,false);assert.equal(f.records[f.config.attemptId].status,'started');assert.equal(f.clicks,1);
  }finally{f.restore()}
});

test('fresh Footer save intent blocks the original processText even when caller catches',async()=>{
  const f=fixture({saveIntent:true});try{
    const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,f.addon,f.tasks,f.history);
    assert.equal(result.ok,false);assert.equal(f.footerCalls,0);assert.equal(f.records[f.config.attemptId].status,'started');
  }finally{f.restore()}
});

test('foreign observer replacement is not overwritten during restoration',async()=>{
  const f=fixture({foreignReplacement:true});try{
    const original=f.jq.event.trigger;
    const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,f.addon,f.tasks,f.history);
    assert.equal(result.ok,false);assert.equal(f.jq.event.trigger.name,'foreignTrigger');assert.notEqual(f.jq.event.trigger,original);
    assert.equal(f.records[f.config.attemptId].status,'started');
  }finally{f.restore()}
});

test('rejected and timed-out original addon Promises retain pending started records',async()=>{
  for(const lateEnd of [{promise:Promise.reject(Error('private hook error'))},{promise:new Promise(()=>{})}]){
    const f=fixture({lateEnd});try{
      const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,f.addon,f.tasks,f.history);
      assert.equal(result.ok,false);assert.equal(f.records[f.config.attemptId].status,'started');
    }finally{f.restore()}
  }
});

test('uninstallable wrappers reject before click and before a started record',async()=>{
  const f=fixture({lockedTrigger:true});try{
    const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,f.addon,f.tasks,f.history);
    assert.equal(result.ok,false);assert.equal(result.guardRejected,true);assert.equal(f.clicks,0);
    assert.equal(f.records[f.config.attemptId],undefined);
  }finally{f.restore()}
});

test('native navigation needs no addon or domain runtime',async()=>{
  const f=fixture({addon:false});try{
    const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history);
    assert.equal(result.ok,true);assert.equal(result.receipt.evidence.addonSettled,0);
    assert.equal(result.receipt.evidence.from,'TownLibrary');assert.equal(result.receipt.evidence.to,'TownPark');
  }finally{f.restore()}
});

test('a display callback changing autosave is blocked before the Engine save branch',async()=>{
  const f=fixture({changeAutosave:true});try{
    const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,f.addon,f.tasks,f.history);
    assert.equal(result.ok,false);assert.equal(f.records[f.config.attemptId].status,'started');
  }finally{f.restore()}
});

test('a reviewed native redirect closes the operation while the original Goal stays unsatisfied',async()=>{
  const f=fixture({addon:false,redirect:true});try{
    const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history);
    assert.equal(result.ok,true);assert.equal(result.receipt.evidence.intended,'TownPark');
    assert.equal(result.receipt.evidence.to,'RandomDialogue');assert.equal(result.receipt.evidence.redirected,true);
    assert.equal(require('../scripts/lib/game-native-provider.cjs').reader({kind:'reach-passage',passage:'TownPark'}).satisfied,false);
  }finally{f.restore()}
});

test('an out-of-passage control or busy native Engine is rejected before click',async()=>{
  for(const busy of [false,true]){
    const f=fixture({outsideRoot:!busy});try{
      if(busy)f.engine.isIdle=()=>false;
      const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history);
      assert.equal(result.guardRejected,true);assert.equal(f.clicks,0);assert.equal(f.records[f.config.attemptId],undefined);
    }finally{f.restore()}
  }
});

test('fresh native task registries are required before click and changes cannot sign a terminal',async()=>{
  for(const kind of ['missing','sparse','populated','hidden','inherited']){
    const f=fixture({addon:false});try{
      let tasks=f.tasks;
      if(kind==='missing')tasks=undefined;
      if(kind==='sparse')tasks=Array(5);
      if(kind==='populated')tasks[4].later=()=>{};
      if(kind==='hidden')Object.defineProperty(tasks[4],'later',{value:()=>{},enumerable:false});
      if(kind==='inherited')tasks[4]=Object.create({later:()=>{}});
      const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,tasks,f.history);
      assert.equal(result.guardRejected,true);assert.equal(f.clicks,0);assert.equal(f.records[f.config.attemptId],undefined);
    }finally{f.restore()}
  }
  const f=fixture({addon:false});try{
    const trigger=f.jq.event.trigger;
    f.jq.event.trigger=function(event){if(event.type===':passagedisplay')f.tasks[4].later=()=>{};return trigger.call(this,event)};
    const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history);
    assert.equal(result.ok,false);assert.equal(f.clicks,1);assert.equal(f.records[f.config.attemptId].status,'started');
    assert.equal(typeof f.tasks[4].later,'function'); // The observer does not remove another owner's task.
  }finally{f.restore()}
});

test('footer processing cannot enable an unreviewed save branch before wikification',async()=>{
  const f=fixture({addon:false});try{
    const original=function(){window.SugarCube.State.temporary.autosavehere=true;return 'fixture footer'};
    f.footer.processText=original;
    const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history);
    assert.equal(result.ok,false);assert.equal(f.records[f.config.attemptId].status,'started');
    assert.equal(f.footer.processText,original);
  }finally{f.restore()}
});

test('retained-history saturation and disabled expired history still prove one new original moment',async()=>{
  for(const limits of [{historyCount:5,expiredCount:100,maxStates:5,maxExpired:100},{historyCount:5,maxStates:5,maxExpired:0}]){
    const f=fixture({addon:false,...limits});try{
      const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history);
      assert.equal(result.ok,true);assert.equal(result.receipt.evidence.turnAfter,result.receipt.evidence.turnBefore);
      assert.equal(result.receipt.evidence.history.newMoment,true);
      const effect={action:{kind:'navigation',destination:'TownPark'},executionBinding:f.config.binding};
      const validate=require('../scripts/lib/game-native-provider.cjs').validateReceipt;
      assert.equal(validate(result.receipt,effect),true);
      assert.equal(validate({...result.receipt,evidence:{...result.receipt.evidence,history:undefined}},effect),false);
      assert.equal(validate({...result.receipt,evidence:{...result.receipt.evidence,history:{...result.receipt.evidence.history,historyBefore:0}}},effect),false);
      assert.equal(validate({...result.receipt,evidence:{...result.receipt.evidence,history:{historyBefore:1,historyAfter:1,expiredBefore:0,expiredAfter:0,maxStates:1,maxExpired:0,newMoment:true},turnBefore:1,turnAfter:1}},effect),false);
    }finally{f.restore()}
  }
});

test('a reused, corrupted or additional history moment cannot sign terminal, even with matching Scene and counters',async()=>{
  for(const change of [{noHistory:true},{corruptHistory:true},{extraHistory:true}]){
    const f=fixture({addon:false,historyCount:5,expiredCount:100,...change});try{
      const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history);
      assert.equal(result.ok,false);assert.equal(result.reason,'native-history-changed');assert.equal(f.clicks,1);
      const record=f.records[f.config.attemptId];assert.equal(record.status,'started');
      assert.equal(record.diagnostics.reason,'native-history-changed');assert.equal(record.diagnostics.observersRestored,true);
    }finally{f.restore()}
  }
});

test('history mutation in an actual delayed business tail stays unknown with bounded persistent diagnostics',async()=>{
  let resolve;const f=fixture({historyCount:5,expiredCount:100,lateEnd:{promise:new Promise(r=>{resolve=r})}});
  try{
    const pending=operation(f.node,f.config,f.engine,f.jq,f.footer,f.addon,f.tasks,f.history);
    assert.equal(f.records[f.config.attemptId].diagnostics.historyCreated,true);
    window.SugarCube.State.create('TownPark');resolve();
    const result=await pending;assert.equal(result.ok,false);assert.equal(result.reason,'native-history-changed');
    assert.deepEqual(f.records[f.config.attemptId].diagnostics,{reason:'native-history-changed',phases:5,footerCalls:1,addonPending:0,addonFulfilled:5,addonRejected:0,observersRestored:true,historyCreated:true});
    assert.equal(f.records[f.config.attemptId].remoteClosed,undefined);
  }finally{f.restore()}
});

test('changed history bounds, old-tail identities and branch starts are rejected before dispatch',async()=>{
  for(const change of [()=>{window.SugarCube.Config.history.maxExpired=99},f=>{window.SugarCube.Config.history.maxStates=1;assert.throws(()=>capture(window.SugarCube.State,f.history.history,f.history.expired,{}),/bounds/)},f=>{f.history.history[0]={title:'Earlier0'}},f=>{
    const old=window.SugarCube.State;window.SugarCube.State=Object.create(old,{activeIndex:{value:0}});
    assert.throws(()=>capture(window.SugarCube.State,f.history.history,f.history.expired,{}),/bounds/);
  }]){
    const f=fixture({addon:false});try{
      change(f);const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history);
      assert.equal(result.guardRejected,true);assert.equal(result.reason,'native-history-unavailable');assert.equal(f.clicks,0);
      assert.equal(f.records[f.config.attemptId],undefined);
    }finally{f.restore()}
  }
});

test('receiving Scene is checked separately from its source after the business tail; moment variables are never inspected',async()=>{
  const f=fixture({addon:false,redirect:true});try{
    for(const m of f.history.moments)Object.defineProperty(m,'variables',{get(){throw Error('Private save content must not be read')}});
    const phases=[];
    const result=await operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history,preflight,phase=>{
      phases.push(phase);if(phase==='after'&&window.SugarCube.State.passage!=='TownPark')return 'receiving-scene-unreviewed';
    });
    assert.deepEqual(phases,['before','after']);assert.equal(result.ok,false);assert.equal(result.reason,'native-environment-changed');
    assert.equal(f.records[f.config.attemptId].status,'started');assert.equal(f.records[f.config.attemptId].diagnostics.historyCreated,true);
  }finally{f.restore()}
});

test('reviewed time monitor rejects before click, retains failed attempts, and signs only its exact duration',async()=>{
  const witness={kind:'native-time',seconds:60,callbacks:4,hookTablesEmpty:true,synchronous:true};
  const run=(f,monitor)=>operation(f.node,f.config,f.engine,f.jq,f.footer,null,f.tasks,f.history,preflight,()=>undefined,checkHistory,monitor);
  const blocked=fixture({addon:false});try{
    const result=await run(blocked,{preflight:()=>false});
    assert.equal(result.guardRejected,true);assert.equal(blocked.clicks,0);assert.equal(blocked.records[blocked.config.attemptId],undefined);
  }finally{blocked.restore()}
  const installFailed=fixture({addon:false});try{
    const original=installFailed.jq.event.trigger;
    const result=await run(installFailed,{preflight:()=>undefined,install(){throw Error('cannot install')}});
    assert.equal(result.guardRejected,true);assert.equal(installFailed.clicks,0);assert.equal(installFailed.records[installFailed.config.attemptId],undefined);
    assert.equal(installFailed.jq.event.trigger,original);
  }finally{installFailed.restore()}
  for(const outcome of ['finish-throws','bad-witness','bad-delta','sticky-fail','success']){
    const f=fixture({addon:false});try{
      const manager={runCallback(){}};let callbacks=0;
      const click=f.node.click;
      f.node.click=function(){for(let n=0;n<4;n++)manager.runCallback();click.call(this);if(outcome!=='bad-delta')window.SugarCube.State.variables.timeStamp=61};
      const monitor={preflight:()=>undefined,install(install,fail){install(manager,'runCallback',original=>function(){callbacks++;if(outcome==='sticky-fail')fail('native-time-changed');return original.call(this)})},
        finish(){if(outcome==='finish-throws')throw Error('time not proved');return outcome==='bad-witness'?{...witness,callbacks:6}:witness}};
      const result=await run(f,monitor);
      assert.equal(callbacks,4);assert.equal(manager.runCallback.name,'runCallback');assert.equal(f.clicks,1);
      if(outcome==='success'){
        assert.equal(result.ok,true);assert.deepEqual(result.receipt.evidence.time,witness);
        const validate=require('../scripts/lib/game-native-provider.cjs').validateReceipt;
        const effect={action:{kind:'navigation',destination:'TownPark'},executionBinding:f.config.binding};
        assert.equal(validate(result.receipt,effect),true);
        for(const time of [{...witness,callbacks:6},{...witness,extra:true},{...witness,seconds:59},{...witness,seconds:3600},undefined])
          assert.equal(validate({...result.receipt,evidence:{...result.receipt.evidence,time}},effect),false);
        assert.equal(validate({...result.receipt,evidence:{...result.receipt.evidence,timeAfter:62}},effect),false);
      }else{
        assert.equal(result.ok,false);assert.equal(f.records[f.config.attemptId].status,'started');
        assert.equal(f.records[f.config.attemptId].remoteClosed,undefined);
      }
    }finally{f.restore()}
  }
  for(const [seconds,count] of [[600,4],[1800,4],[3540,4],[2400,8]]){
    const f=fixture({addon:false});try{
      const click=f.node.click;
      f.node.click=function(){click.call(this);window.SugarCube.State.variables.timeStamp=1+seconds};
      const monitor={preflight:()=>undefined,install(){},finish:()=>({...witness,seconds,callbacks:count})};
      const result=await run(f,monitor);assert.equal(result.ok,true);
      const validate=require('../scripts/lib/game-native-provider.cjs').validateReceipt;
      assert.equal(validate(result.receipt,{action:{kind:'navigation',destination:'TownPark'},executionBinding:f.config.binding}),true);
      assert.equal(validate({...result.receipt,evidence:{...result.receipt.evidence,timeAfter:2+seconds}},
        {action:{kind:'navigation',destination:'TownPark'},executionBinding:f.config.binding}),false);
    }finally{f.restore()}
  }
});
