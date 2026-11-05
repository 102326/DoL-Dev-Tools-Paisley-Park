// Frozen source is included in persistent native contract digests.
function inspect(node,field,allowSave=false){
  const sc=window.SugarCube,s=sc?.State,roots=document.querySelectorAll('#passages > .passage'),jq=window.jQuery;
  if(typeof window.DoLGameUI!=='undefined'||!jq||s?.variables?.combat!==1||!allowSave&&(s.variables.options?.autosaveDisabled!==true||s.variables.ironmanmode===true)||
    roots.length!==1||roots[0].getAttribute('data-passage')!==s.passage||roots[0].querySelector('.error')||!sc.Engine.isIdle()||
    !node?.isConnected||!roots[0].contains(node)||!node.matches('input.macro-radiobutton[type="radio"]')||node.disabled||
    node.parentElement?.tagName!=='LABEL'||node.parentElement.querySelectorAll('input').length!==1||node.parentElement.querySelector('select,textarea')||node.closest('form')||
    node.onclick!=null||node.onchange!=null||!Object.hasOwn(s.variables,field)||typeof s.variables[field]!=='string')throw Error('Native combat radio unavailable');
  // Unknown matching handlers could have effects beyond original selection.
  for(let p=node;p;p=p.parentNode){for(const type of ['click','change']){
    const events=jq._data(p,'events')?.[type]||[];
    if(events.length>32||p.onclick!=null||p.onchange!=null)throw Error('Native radio event bound');
    for(const h of events){if(h.selector!=null){let n=node,match=false;for(;n&&n!==p;n=n.parentNode)if(n.matches?.(h.selector)){match=true;break}if(!match)continue}
      if(p!==node||type!=='change'||events.length!==1||h.namespace!=='macros'||h.selector!=null)throw Error('Unreviewed radio event');
    }
  }}
  for(const type of ['click','change'])if((jq._data(window,'events')?.[type]||[]).length||window['on'+type]!=null)throw Error('Unreviewed window radio event');
  const other=JSON.stringify(Object.fromEntries(Object.entries(s.variables).filter(([key])=>key!==field)));
  if(other.length>2*1024*1024)throw Error('Native radio state bound');
  return {passage:s.passage,turns:s.turns,time:s.variables.timeStamp,money:s.variables.money,other,value:s.variables[field],checked:node.checked};
}
function operation(node,config,epoch,check,read,markDispatch=()=>{},invokeClick=n=>n.click(),saveWatch=null){
  const context=window[config.namespace],s=window.SugarCube.State;
  if(check('before')!==undefined||context?.nonce!==config.binding.contextNonce||context.version!==1||Object.getPrototypeOf(context.records)!==null||
    !Object.isExtensible(context.records)||Object.hasOwn(context.records,config.attemptId)||Object.keys(context.records).length>=64)return {ok:false,guardRejected:true};
  const before=read(node,config.field);
  if(JSON.stringify(before)!==JSON.stringify(epoch.before)||before.checked||before.value===config.value)return {ok:false,guardRejected:true};
  const root=document.querySelector('#passages > .passage'),active=s.active,history=s.history,index=s.activeIndex,entry=history[index],variables=s.variables,temporary=s.temporary;
  const tempKeys=Reflect.ownKeys(temporary),tempValues=tempKeys.map(k=>Object.getOwnPropertyDescriptor(temporary,k));
  if(tempKeys.length>512||tempValues.some(d=>!Object.hasOwn(d,'value')))return {ok:false,guardRejected:true};
  if(saveWatch!==null)try{saveWatch.install()}catch{return {ok:false,guardRejected:true,reason:'native-save-observer-unavailable'}}
  markDispatch();
  const started=Object.freeze({...config.binding,attemptId:config.attemptId,status:'started',phase:'radio-started'});context.records[config.attemptId]=started;
  try{invokeClick(node);const after=read(node,config.field);
    if(window[config.namespace]!==context||context.records[config.attemptId]!==started||window.SugarCube.State!==s||s.active!==active||s.history!==history||s.activeIndex!==index||history[index]!==entry||s.variables!==variables||
      document.querySelector('#passages > .passage')!==root||!root.isConnected||check('after')!==undefined||
      s.temporary!==temporary||Reflect.ownKeys(temporary).length!==tempKeys.length||tempKeys.some((k,i)=>{const d=Object.getOwnPropertyDescriptor(temporary,k),b=tempValues[i];return !d||!Object.hasOwn(d,'value')||!Object.is(d.value,b.value)||d.writable!==b.writable||d.enumerable!==b.enumerable||d.configurable!==b.configurable})||
      !after.checked||after.value!==config.value||after.other!==before.other||
      ['passage','turns','time','money'].some(k=>after[k]!==before[k]))return {ok:false};
    const evidence={kind:'native-radio',field:config.field,from:before.value,to:after.value,passage:after.passage,turns:after.turns,time:after.time,money:after.money,otherStateStable:true};
    const receipt=Object.freeze({...config.binding,attemptId:config.attemptId,status:'terminal',outcome:'occurred',remoteClosed:true,spent:0,evidence});if(saveWatch!==null)return saveWatch.finish(receipt,context,started);
    context.records[config.attemptId]=receipt;return {ok:true,receipt};
  }catch{return {ok:false}}
}
module.exports={inspect,operation};
