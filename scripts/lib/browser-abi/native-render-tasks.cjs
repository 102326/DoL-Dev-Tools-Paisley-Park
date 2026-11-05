'use strict';
// Frozen browser protocol input. Function text participates in the existing
// render digest; do not reformat without a reviewed contract/recovery change.
function check(phase){
  const plain=t=>t&&typeof t==='object'&&(Object.getPrototypeOf(t)===null||Object.getPrototypeOf(t)===Object.prototype);
  if(this.tasks.length!==5||this.tasks.some(t=>!plain(t))||
     window.clearTimeout!==this.clearTimeout||window.clearInterval!==this.clearInterval||
     Function.prototype.toString.call(Set.prototype.clear)!=='function clear() { [native code] }'||
     Function.prototype.toString.call(Set.prototype.forEach)!=='function forEach() { [native code] }')return 'native-render-task-owner-changed';
  if(this.tasks.some((t,i)=>JSON.stringify(Reflect.ownKeys(t))!==JSON.stringify(phase==='before'&&i===0?this.rows.map(r=>r.key):[])))return 'native-render-task-registry-changed';
  for(const r of this.rows){
    const d=Object.getOwnPropertyDescriptor(this.tasks[0],r.key);
    if(phase==='before'&&(!d||d.value!==r.fn||d.writable!==true||d.configurable!==true||d.enumerable!==true)||
       Function.prototype.toString.call(r.fn)!==r.source||Object.getPrototypeOf(r.timers)!==Set.prototype||
       Reflect.ownKeys(r.timers).length!==0||JSON.stringify([...r.timers])!==JSON.stringify(phase==='before'?r.ids:[]))return 'native-render-task-source-or-timers-changed';
  }
}
function finish(){
  if(this.check('after')!==undefined)throw Error('Original render cleanup incomplete');
  return {kind:'native-render-cleanup',tasks:this.rows.length,timersBefore:this.rows.reduce((n,r)=>n+r.ids.length,0),timersAfter:0,registriesEmpty:true};
}
module.exports={check,finish};
