'use strict';
// Original history witness function text participates in existing contracts. Preserve LF.
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
module.exports={capture,checkHistory};
