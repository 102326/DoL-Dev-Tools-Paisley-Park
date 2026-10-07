'use strict';
// SugarCube's original timed/repeat cleanup, executed by Engine.play itself.
// This binds the retained timer sets; it never cancels a timer on the host's behalf.
const {createHash}=require('node:crypto'),contracts=require('./game-contract.cjs');
const sources={
  '#timed-timers-cleanup':'461d4217080ead7ec93c7970dd5d4b8b19dd9b09feb258cac525ef0c03734d7a',
  '#repeat-timers-cleanup':'831c4e82ec0584f1f4a721364426d8843f1ee66f62cd1b6006567754dd97b2fa',
};
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
async function bind(client,tasks,group){
  const refs=tasks.map(t=>({objectId:t.objectId}));
  const raw=await client.send('Runtime.callFunctionOn',{objectId:tasks[0].objectId,arguments:refs,returnByValue:true,functionDeclaration:`function(...tables){
    if(tables.length!==5||tables.some(t=>!t||(Object.getPrototypeOf(t)!==null&&Object.getPrototypeOf(t)!==Object.prototype))||tables.slice(1).some(t=>Reflect.ownKeys(t).length))throw Error('Task registries bound');
    const keys=Reflect.ownKeys(this);if(keys.length<1||keys.length>2||keys.some(k=>typeof k!=='string'||!${JSON.stringify(Object.keys(sources))}.includes(k)))throw Error('Task cleanup names unavailable');
    return keys.map(key=>{const d=Object.getOwnPropertyDescriptor(this,key);if(!d||typeof d.value!=='function'||!d.configurable||!d.writable||!d.enumerable)throw Error('Task cleanup descriptor unavailable');return{key,source:Function.prototype.toString.call(d.value)}});
  }`});
  if(raw.exceptionDetails||!Array.isArray(raw.result?.value))throw Error('Unreviewed native lifecycle task registry');
  const rows=raw.result.value,sha=s=>createHash('sha256').update(s).digest('hex');
  for(const row of rows){
    if(sha(row.source)!==sources[row.key])throw Error('Native render cleanup source differs');
    const fn=await contracts.member(client,tasks[0].objectId,`this[${JSON.stringify(row.key)}]`,group);
    const table=await contracts.captured(client,fn,'prehistory','object',{maxResponseBytes:8*1024*1024});
    if(!await contracts.sameObject(client,table,tasks[0].objectId))throw Error('Native render cleanup registry alias differs');
    const timers=await contracts.captured(client,fn,'timers','object',{maxResponseBytes:8*1024*1024});
    refs.push({objectId:fn},{objectId:timers});
  }
  const bundle=await client.send('Runtime.callFunctionOn',{objectId:tasks[0].objectId,objectGroup:group,arguments:refs,returnByValue:false,functionDeclaration:`function(...refs){
    const tasks=refs.slice(0,5);let i=5;
    const rows=${JSON.stringify(rows)}.map(row=>{const fn=refs[i++],timers=refs[i++];
      if(Object.getPrototypeOf(timers)!==Set.prototype||Reflect.ownKeys(timers).length!==0||timers.size>256||[...timers].some(id=>!Number.isSafeInteger(id)||id<1))throw Error('Native render timers bound');
      return Object.freeze({...row,fn,timers,ids:Object.freeze([...timers])});});
    const clearTimeout=window.clearTimeout,clearInterval=window.clearInterval;
    if(Function.prototype.toString.call(clearTimeout)!=='function clearTimeout() { [native code] }'||Function.prototype.toString.call(clearInterval)!=='function clearInterval() { [native code] }')throw Error('Original timer cancellation unavailable');
    return Object.freeze({tasks:Object.freeze(tasks),rows:Object.freeze(rows),clearTimeout,clearInterval,check:${check.toString()},finish:${finish.toString()}});
  }`});
  if(bundle.exceptionDetails||!bundle.result?.objectId)throw Error('Native render cleanup bundle unavailable');
  const checked=await client.send('Runtime.callFunctionOn',{objectId:bundle.result.objectId,functionDeclaration:'function(){return this.check("before")}',returnByValue:true});
  if(checked.exceptionDetails||checked.result?.type!=='undefined')throw Error('Native render cleanup preflight rejected');
  return {objectId:bundle.result.objectId,digest:sha(JSON.stringify(sources)+check.toString()+finish.toString())};
}
module.exports={bind,check,finish,sources};
