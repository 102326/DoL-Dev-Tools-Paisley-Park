'use strict';
// Frozen browser guard text: included by existing native operation contracts.
function checkBindings(b){
  const sc=window.SugarCube,v=sc.State.variables,d=Object.getOwnPropertyDescriptor(window,'V');
  if(sc.State!==b.state||sc.State.active!==b.active||b.active.variables!==v||!d||d.get!==b.getter||d.set!==undefined||d.enumerable!==false||d.configurable!==true||window.V!==v)return 'native-variables-owner-changed';
  if(b.macros.some(r=>sc.Macro.get(r.name)?.handler!==r.handler||r.body!==null&&r.definition?.payload?.[0]?.contents!==r.body||r.functionSource!==null&&Function.prototype.toString.call(r.fn)!==r.functionSource))return 'native-clothing-macro-changed';
  // Expressions come from the reviewed local profile, never an Action/request.
  if(b.globals.some(r=>eval(r.expr)!==r.value||Function.prototype.toString.call(r.value)!==r.source)||b.captures.some(r=>Function.prototype.toString.call(r.value)!==r.source))return 'native-clothing-functions-changed';
}
module.exports={checkBindings};
