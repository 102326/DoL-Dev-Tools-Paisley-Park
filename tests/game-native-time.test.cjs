const test=require('node:test'),assert=require('node:assert/strict');
const {createMonitor}=require('../scripts/lib/game-native-time.cjs');
function fixture(minutes=1,allowHourCrossing=false,minute=0){
  const prior=global.window,callback=function(){},safe=function(){},invoke=function(){},handler=function(){},oldPass=function(){},oldMinute=function(){},pass=function(){};
  const hook={callableHook:new Map(),runCallback:callback,runCallbackSafe:safe,invokeOldTimeFunctionRef:invoke,oldTimeFunctionRef:{passTime:oldPass,minutePassed:oldMinute}},
    target={pass},proxy={callableHook:new Map(),runCallback:callback,originTime:target};
  hook.oldTimeFunctionRef.hourPassed=function hourPassed(){};
  global.window={SugarCube:{Macro:{get:()=>({handler})}}};
  const clock={hour:7,minute,second:0},managers=[hook,proxy].map(owner=>({owner,hooks:owner.callableHook,original:callback}));
  const bundle={managers,hook,proxy,old:hook.oldTimeFunctionRef,oldPass,oldMinute,oldHour:hook.oldTimeFunctionRef.hourPassed,hourBindings:[],target,lexicalTime:target,pass,handler,safe,invoke,sources:[],clock:()=>clock};
  const monitor=createMonitor.call(bundle,minutes,allowHourCrossing),installs=[];let failures=0;
  function install(owner,key,wrap){const own=Object.getOwnPropertyDescriptor(owner,key),wrapper=wrap(owner[key]);Object.defineProperty(owner,key,{...own,value:wrapper});installs.push({owner,key,own})}
  function restore(){for(const {owner,key,own} of installs.reverse())Object.defineProperty(owner,key,own)}
  const calls=[[hook,'passTime','before',[[minutes]]],[hook,'minutePassed','before',[[minutes]]],
    [hook,'minutePassed','after',[undefined]],[hook,'passTime','after',[undefined]]];
  return{monitor,hook,proxy,clock,calls,start:()=>monitor.install(install,()=>failures++),restore,
    run:(call,type='call')=>call[0].runCallback(call[1],call[2],type,call[3]),get failures(){return failures},end(){global.window=prior}};
}
test('one-minute witness requires the actual ordered callbacks and restoration',()=>{
  const f=fixture();try{assert.equal(f.monitor.preflight(),undefined);f.start();
    f.run(f.calls[0]);
    f.run([f.proxy,'pass','before',[]],'get');f.run([f.proxy,'pass','after',[function pass(){}]],'get');
    for(const c of f.calls.slice(1))f.run(c);
    f.restore();assert.deepEqual(f.monitor.finish(),{kind:'native-time',seconds:60,callbacks:4,hookTablesEmpty:true,synchronous:true});
  }finally{f.end()}
});
test('reviewed same-day hour crossing witnesses both minute segments and exactly one hourly call',()=>{
  for(const minutes of [15,30]){
    const f=fixture(minutes,true,45);try{
      assert.equal(f.monitor.preflight(),undefined);f.start();
      const calls=[[f.hook,'passTime','before',[[minutes]]],[f.hook,'minutePassed','before',[[15]]],
        [f.hook,'minutePassed','after',[undefined]],[f.hook,'hourPassed','before',[[1]]],
        [f.hook,'hourPassed','after',[undefined]],[f.hook,'minutePassed','before',[[minutes-15]]],
        [f.hook,'minutePassed','after',[undefined]],[f.hook,'passTime','after',[undefined]]];
      for(const call of calls)f.run(call);f.restore();
      assert.deepEqual(f.monitor.finish(),{kind:'native-time',seconds:minutes*60,callbacks:8,hookTablesEmpty:true,synchronous:true});
    }finally{f.end()}
  }
  for(const mode of ['hour-amount','extra-day','changed-hour','missing-tail','midnight']){
    const f=fixture(30,true,45);try{
      if(mode==='midnight'){f.clock.hour=23;assert.equal(f.monitor.preflight(),'native-minute-branch-unreviewed');continue}
      f.start();f.run(f.calls[0]);f.run([f.hook,'minutePassed','before',[[15]]]);f.run([f.hook,'minutePassed','after',[undefined]]);
      if(mode==='hour-amount')assert.throws(()=>f.run([f.hook,'hourPassed','before',[[2]]]));
      if(mode==='extra-day')assert.throws(()=>f.run([f.hook,'dayPassed','before',[[1]]]));
      if(mode==='changed-hour'){f.hook.oldTimeFunctionRef.hourPassed=function changed(){};assert.throws(()=>f.run([f.hook,'hourPassed','before',[[1]]]))}
      f.restore();assert.throws(()=>f.monitor.finish());
    }finally{f.end()}
  }
});
test('reviewed multi-minute duration shares four callbacks, rejects mismatched amounts and hour crossing',()=>{
  for(const minutes of [10,30,59]){
    const f=fixture(minutes);try{
      f.clock.minute=59-minutes;assert.equal(f.monitor.preflight(),undefined);f.clock.minute=60-minutes;
      assert.equal(f.monitor.preflight(),'native-minute-branch-unreviewed');f.clock.minute=0;
      f.start();for(const call of f.calls)f.run(call);f.restore();
      assert.deepEqual(f.monitor.finish(),{kind:'native-time',seconds:minutes*60,callbacks:4,hookTablesEmpty:true,synchronous:true});
    }finally{f.end()}
  }
  const wrong=fixture(30);try{wrong.start();assert.throws(()=>wrong.run([wrong.hook,'passTime','before',[[1]]]));wrong.restore();assert.throws(()=>wrong.monitor.finish())}finally{wrong.end()}
  for(const minutes of [0,60,-1,1.5,NaN])assert.throws(()=>createMonitor.call({},minutes),/Invalid native minute duration/);
});
test('changed hook tables, reordered/duplicate callbacks and missing calls remain failed',()=>{
  for(const mode of ['hook','order','duplicate','missing','result','proxy-call']){
    const f=fixture();try{f.start();
      if(mode==='hook'){f.hook.callableHook.set('passTime',[]);assert.throws(()=>f.run(f.calls[0]));f.hook.callableHook.clear()}
      if(mode==='order')assert.throws(()=>f.run(f.calls[1]));
      if(mode==='duplicate'){f.run(f.calls[0]);assert.throws(()=>f.run(f.calls[0]))}
      if(mode==='result'){f.run(f.calls[0]);f.run(f.calls[1]);assert.throws(()=>f.run([f.hook,'minutePassed','after',[Promise.resolve()]]))}
      if(mode==='proxy-call'){f.run(f.calls[0]);assert.throws(()=>f.run([f.proxy,'pass','before',[[60]]]))}
      f.restore();assert.throws(()=>f.monitor.finish());assert.ok(f.failures>0);
    }finally{f.end()}
  }
});
test('preflight rejects unreviewed clocks and unmodifiable observers before installation',()=>{
  const f=fixture();try{for(const minute of [59,NaN,-1,0.5]){f.clock.minute=minute;assert.equal(f.monitor.preflight(),'native-minute-branch-unreviewed')}
    f.clock.minute=0;Object.defineProperty(f.hook,'runCallback',{writable:false});
    assert.equal(f.monitor.preflight(),'native-time-observer-unavailable');
  }finally{f.end()}
});
