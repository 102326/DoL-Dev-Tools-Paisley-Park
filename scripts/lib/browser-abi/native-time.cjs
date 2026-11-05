// Frozen source used by native execution and legacy binding contracts.
function createMonitor(minutes=1,allowHourCrossing=false) {
  if(!Number.isSafeInteger(minutes)||minutes<1||minutes>59||typeof allowHourCrossing!=='boolean')throw Error('Invalid native minute duration');
  const b=this,size=Object.getOwnPropertyDescriptor(Map.prototype,'size').get;
  const wrappers=[];let failed=false,index=0,installed=false,fail=()=>{};
  let sequence;
  function reject(){failed=true;fail('native-time-witness-unavailable');throw Error('Native time witness unavailable')}
  function check(){
    if(failed)return 'native-time-witness-unavailable';
    if(b.managers.some((r,i)=>r.owner.callableHook!==r.hooks||Object.getPrototypeOf(r.hooks)!==Map.prototype||
      Reflect.ownKeys(r.hooks).length!==0||size.call(r.hooks)!==0||
      r.owner.runCallback!==r.original&&r.owner.runCallback!==wrappers[i])||
      b.hook.oldTimeFunctionRef!==b.old||b.old.passTime!==b.oldPass||b.old.minutePassed!==b.oldMinute||
      allowHourCrossing&&b.old.hourPassed!==b.oldHour||
      allowHourCrossing&&b.hourBindings.some(r=>b.hourStats[r.name]!==r.value)||
      b.proxy.originTime!==b.target||b.lexicalTime!==b.target||b.lexicalTime.pass!==b.pass||window.SugarCube.Macro.get('pass').handler!==b.handler||
      b.hook.runCallbackSafe!==b.safe||b.hook.invokeOldTimeFunctionRef!==b.invoke||
      b.sources.some(r=>Function.prototype.toString.call(r.value)!==r.source))return 'native-time-binding-changed';
  }
  function preflight(){
    const reason=check();if(reason!==undefined)return reason;
    const clock=b.clock();
    if(!Number.isInteger(clock.minute)||clock.minute<0||clock.minute>59||!Number.isInteger(clock.second)||clock.second<0||clock.second>59||
      clock.minute+minutes>=60&&(!allowHourCrossing||!Number.isInteger(clock.hour)||clock.hour<0||clock.hour>=23))
      return 'native-minute-branch-unreviewed';
    for(const r of b.managers){
      if(!Object.isExtensible(r.owner))return 'native-time-observer-unavailable';
      const own=Object.getOwnPropertyDescriptor(r.owner,'runCallback');let d=own,p=r.owner;
      while(!d&&(p=Object.getPrototypeOf(p)))d=Object.getOwnPropertyDescriptor(p,'runCallback');
      if(!d||!Object.hasOwn(d,'value')||d.value!==r.original||
        own&&(own.writable!==true||own.configurable!==true)||!own&&d.writable!==true)return 'native-time-observer-unavailable';
    }
  }
  function install(ownedInstall,onFailure){
    if(installed||preflight()!==undefined)reject();installed=true;fail=onFailure;
    const minute=b.clock().minute,toHour=60-minute,cross=minute+minutes>=60;
    sequence=[[0,'passTime','before',minutes],...(cross?
      [[0,'minutePassed','before',toHour],[0,'minutePassed','after'],[0,'hourPassed','before',1],[0,'hourPassed','after'],
        [0,'minutePassed','before',minutes-toHour],[0,'minutePassed','after']]:
      [[0,'minutePassed','before',minutes],[0,'minutePassed','after']]),[0,'passTime','after']];
    b.managers.forEach((r,i)=>ownedInstall(r.owner,'runCallback',original=>{
      if(original!==r.original)reject();
      return wrappers[i]=function(key,pos,type,args){
        if(this!==r.owner||check()!==undefined)reject();
        const tracked=type==='call'&&(i===0&&['passTime','minutePassed','hourPassed','dayPassed','weekPassed','yearPassed'].includes(key)||i===1&&key==='pass');
        if(tracked){
          const next=sequence[index];
          if(!next||next[0]!==i||next[1]!==key||next[2]!==pos||type!=='call'||
            !Array.isArray(args)||args.length!==1||!Object.hasOwn(args,0))reject();
          if(pos==='before'? !Array.isArray(args[0])||args[0].length!==1||!Object.hasOwn(args[0],0)||args[0][0]!==next[3]:args[0]!==undefined)reject();
          index++;
        }
        let value;try{value=Reflect.apply(original,this,[key,pos,type,args])}catch(error){reject()}
        if(value!==undefined||check()!==undefined)reject();return value;
      };
    }));
  }
  function finish(){
    if(!installed||index!==sequence.length||check()!==undefined||b.managers.some(r=>r.owner.runCallback!==r.original))reject();
    return {kind:'native-time',seconds:minutes*60,callbacks:sequence.length,hookTablesEmpty:true,synchronous:true};
  }
  return Object.freeze({preflight,install,finish,check,metadata:()=>b.sources.map(({name,source})=>({name,source}))});
}

module.exports={createMonitor};
