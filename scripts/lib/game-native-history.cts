import type cdp from './cdp.cjs';
declare namespace history {
 type Client=Pick<cdp.Client,'send'>;
 type SourceFunction=(...args:unknown[])=>unknown;
}
interface RemoteView {exceptionDetails?:unknown;result?:{objectId?:unknown}}
const {capture,checkHistory}:{capture:history.SourceFunction;checkHistory:history.SourceFunction}=require('./browser-abi/native-history.cjs');
const {captured,member,sameObject,functionSource}:typeof import('./game-contract.cjs')=require('./game-contract.cjs');
// Reviewed SugarCube getters expose retained history, not a monotonic turn ID.
const sources={history:'function(){return _history}',expired:'function(){return _expired}',activeIndex:'function(){return _activeIndex}',
  turns:'function(){return _expired.length+historyLength()}',
  size:'function historySize(){return _history.length}',length:'function historyLength(){return _activeIndex+1}',
  top:'function historyTop(){return _history.length>0?_history[_history.length-1]:null}',
  create:'function(title){if(historyLength()<historySize()&&_history.splice(historyLength(),historySize()-historyLength()),_history.push(momentCreate(title,_active.variables)),_prng){historyTop().pull=_prng.pull}for(;historySize()>Config.history.maxStates;)for(0===Config.history.maxExpired?_history.shift():_expired.push(_history.shift().title);_expired.length>Config.history.maxExpired;)_expired.shift();return _activeIndex=historySize()-1,momentActivate(_activeIndex),historyLength()}'};
async function bind(client:history.Client,state:unknown,play:unknown,group?:string):Promise<unknown>{
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
    arguments:[{objectId:history},{objectId:expired}],returnByValue:false,objectGroup:group}) as RemoteView;
  if(r.exceptionDetails||!r.result?.objectId)throw Error('Native history capture unavailable');
  return r.result.objectId;
}
const history={capture,checkHistory,bind,sources};
export = history;
