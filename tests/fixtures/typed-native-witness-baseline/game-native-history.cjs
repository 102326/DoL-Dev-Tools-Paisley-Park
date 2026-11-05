'use strict';
const {captured,member,sameObject,functionSource}=require('./game-contract.cjs');
// Reviewed SugarCube getters expose retained history, not a monotonic turn ID.
const sources={history:'function(){return _history}',expired:'function(){return _expired}',activeIndex:'function(){return _activeIndex}',
  turns:'function(){return _expired.length+historyLength()}',
  size:'function historySize(){return _history.length}',length:'function historyLength(){return _activeIndex+1}',
  top:'function historyTop(){return _history.length>0?_history[_history.length-1]:null}',
  create:'function(title){if(historyLength()<historySize()&&_history.splice(historyLength(),historySize()-historyLength()),_history.push(momentCreate(title,_active.variables)),_prng){historyTop().pull=_prng.pull}for(;historySize()>Config.history.maxStates;)for(0===Config.history.maxExpired?_history.shift():_expired.push(_history.shift().title);_expired.length>Config.history.maxExpired;)_expired.shift();return _activeIndex=historySize()-1,momentActivate(_activeIndex),historyLength()}'};
function capture(state,history,expired,expected){
  if(state!==window.SugarCube?.State||state.history!==history||state.expired!==expired)throw Error('Native history alias unavailable');
  const refs={};
  for(const [key,source] of Object.entries(expected)){
    const d=Object.getOwnPropertyDescriptor(state,key),fn=key==='create'?d?.value:d?.get;
    if(!d||d.configurable!==false||typeof fn!=='function'||Function.prototype.toString.call(fn)!==source||
      (key==='create'?d.writable!==false:!!d.set))throw Error('Native history source unavailable');
    refs[key]=fn;
  }
  const {maxStates,maxExpired}=window.SugarCube.Config.history;
  // ponytail: bounded current-tail navigation; branches and a one-slot history
  // lack a retained identity witness and are not admitted.
  if(!Number.isSafeInteger(maxStates)||maxStates<2||maxStates>128||!Number.isSafeInteger(maxExpired)||maxExpired<0||maxExpired>1024||
    !Array.isArray(history)||!Array.isArray(expired)||history.length<1||history.length>maxStates||expired.length>maxExpired||
    state.activeIndex!==history.length-1||state.turns!==history.length+expired.length)throw Error('Native history bounds unavailable');
  const titles=Array.from(history,m=>Object.getOwnPropertyDescriptor(m,'title')?.value);
  if(history.some(m=>!m||typeof m!=='object')||titles.some(t=>typeof t!=='string'||!t||t.length>128)||
    Array.from(expired).some(t=>typeof t!=='string'||!t||t.length>128))throw Error('Native history shape unavailable');
  return Object.freeze({state,history,expired,refs:Object.freeze(refs),maxStates,maxExpired,
    moments:Object.freeze(Array.from(history)),titles:Object.freeze(titles),expiredTitles:Object.freeze(Array.from(expired))});
}
function checkHistory(b,phase,moment){
  try{
    const s=window.SugarCube?.State,c=window.SugarCube?.Config?.history;
    if(!b||s!==b.state||s.history!==b.history||s.expired!==b.expired||c?.maxStates!==b.maxStates||c?.maxExpired!==b.maxExpired)return {ok:false};
    for(const [key,fn] of Object.entries(b.refs)){
      const d=Object.getOwnPropertyDescriptor(s,key);
      if((key==='create'?d?.value:d?.get)!==fn||d.configurable!==false||(key==='create'?d.writable!==false:!!d.set))return {ok:false};
    }
    const h=b.history,e=b.expired,H=b.moments.length,E=b.expiredTitles.length;
    const dropped=phase==='after'?Math.max(0,H+1-b.maxStates):0;
    const expectedH=phase==='after'?Math.min(H+1,b.maxStates):H;
    const expectedExpired=phase==='after'?(b.maxExpired===0?[]:[...b.expiredTitles,...b.titles.slice(0,dropped)].slice(-b.maxExpired)):b.expiredTitles;
    if(!['before','after'].includes(phase)||h.length!==expectedH||e.length!==expectedExpired.length||s.activeIndex!==h.length-1||s.turns!==h.length+e.length||
      Array.from(e).some((t,i)=>t!==expectedExpired[i]))return {ok:false};
    const old=phase==='after'?b.moments.slice(dropped):b.moments;
    if(old.some((m,i)=>h[i]!==m||Object.getOwnPropertyDescriptor(m,'title')?.value!==b.titles[i+dropped]))return {ok:false};
    const last=h[h.length-1];
    if(phase==='after'&&(b.moments.includes(last)||moment!==undefined&&last!==moment||Object.getOwnPropertyDescriptor(last,'title')?.value!==s.passage))return {ok:false};
    return {ok:true,moment:last,evidence:{historyBefore:H,historyAfter:h.length,expiredBefore:E,expiredAfter:e.length,maxStates:b.maxStates,maxExpired:b.maxExpired,newMoment:phase==='after'}};
  }catch{return {ok:false}}
}
async function bind(client,state,play,group){
  if(!await sameObject(client,state,await captured(client,play,'State','object',{maxResponseBytes:8*1024*1024})))throw Error('Native Engine State alias differs');
  const create=await member(client,state,'this.create',group);
  for(const [key,helper] of [['size','historySize'],['length','historyLength'],['top','historyTop']]){
    const getter=await member(client,state,`Object.getOwnPropertyDescriptor(this,${JSON.stringify(key)}).get`,group);
    if(!await sameObject(client,getter,await captured(client,create,helper)))throw Error('Native history helper alias differs');
  }
  const original={momentCreate:'function momentCreate(title,variables){return{title:null==title?"":String(title),variables:null==variables?{}:clone(variables)}}',
    momentActivate:'function momentActivate(moment){if(null==moment)throw new Error("moment activation attempted with null or undefined");switch(typeof moment){case"object":_active=clone(moment);break;case"number":if(historyIsEmpty())throw new Error("moment activation attempted with index on empty history");if(moment<0||moment>=historySize())throw new RangeError(`moment activation attempted with out-of-bounds index; need [0, ${historySize()-1}], got ${moment}`);_active=clone(_history[moment]);break;default:throw new TypeError(`moment activation attempted with a "${typeof moment}"; must be an object or valid history stack index`)}return null!==_prng&&(_prng=new PRNG(_prng.seed,_active.pull)),jQuery.event.trigger(":historyupdate"),_active}'};
  for(const [name,source] of Object.entries(original))if(await functionSource(client,await captured(client,create,name))!==source)throw Error('Native moment source changed');
  const history=await captured(client,create,'_history','object'),expired=await captured(client,create,'_expired','object');
  const r=await client.send('Runtime.callFunctionOn',{objectId:state,functionDeclaration:`function(h,e){return (${capture.toString()})(this,h,e,${JSON.stringify(sources)})}`,
    arguments:[{objectId:history},{objectId:expired}],returnByValue:false,objectGroup:group});
  if(r.exceptionDetails||!r.result?.objectId)throw Error('Native history capture unavailable');
  return r.result.objectId;
}
module.exports={capture,checkHistory,bind,sources};
