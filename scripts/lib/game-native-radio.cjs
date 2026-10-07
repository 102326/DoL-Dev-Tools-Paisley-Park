'use strict';
// Original combat intent selection only. Advancing a turn and its business
// outcome remain separate actions; never call State.setVar from the host.
const {createHash,randomUUID}=require('node:crypto'),c=require('./game-contract.cjs'),receipts=require('./game-receipts.cjs');
const {lexical,sources:links}=require('./game-native-navigation.cjs'),generic=require('./game-native-generic-landing.cjs');
const sha=s=>createHash('sha256').update(s).digest('hex');
const sources={shadow:links.shadow,callback:'5aa51adacaad49700ed8057940822485425706e5da0395e362412eae3f52e8bc',
  setVar:'a49466396363e391ff0fffa179a93a1f6c3c994bd2b9fe559d4f0cc997f1b107',eval:'930c34ee3b0b4a93dde917dc367b75d5ebe98ae5fd309c51cde8eb70164f90e2',
  parse:'333b835c7a6bb1152de81d2d7e241b59617048bfc55b4e8870a1ed759599a883'};
const fields=['leftaction','rightaction','feetaction','mouthaction'];
function inspect(node,field){
  const sc=window.SugarCube,s=sc?.State,roots=document.querySelectorAll('#passages > .passage'),jq=window.jQuery;
  if(typeof window.DoLGameUI!=='undefined'||!jq||s?.variables?.combat!==1||s.variables.options?.autosaveDisabled!==true||s.variables.ironmanmode===true||
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
function operation(node,config,epoch,check,read){
  const context=window[config.namespace],s=window.SugarCube.State;
  if(check('before')!==undefined||context?.nonce!==config.binding.contextNonce||context.version!==1||Object.getPrototypeOf(context.records)!==null||
    !Object.isExtensible(context.records)||Object.hasOwn(context.records,config.attemptId)||Object.keys(context.records).length>=64)return {ok:false,guardRejected:true};
  const before=read(node,config.field);
  if(JSON.stringify(before)!==JSON.stringify(epoch.before)||before.checked||before.value===config.value)return {ok:false,guardRejected:true};
  const root=document.querySelector('#passages > .passage'),active=s.active,history=s.history,index=s.activeIndex,entry=history[index],variables=s.variables,temporary=s.temporary;
  const tempKeys=Reflect.ownKeys(temporary),tempValues=tempKeys.map(k=>Object.getOwnPropertyDescriptor(temporary,k));
  if(tempKeys.length>512||tempValues.some(d=>!Object.hasOwn(d,'value')))return {ok:false,guardRejected:true};
  const started=Object.freeze({...config.binding,attemptId:config.attemptId,status:'started',phase:'radio-started'});context.records[config.attemptId]=started;
  try{node.click();const after=read(node,config.field);
    if(window[config.namespace]!==context||context.records[config.attemptId]!==started||window.SugarCube.State!==s||s.active!==active||s.history!==history||s.activeIndex!==index||history[index]!==entry||s.variables!==variables||
      document.querySelector('#passages > .passage')!==root||!root.isConnected||check('after')!==undefined||
      s.temporary!==temporary||Reflect.ownKeys(temporary).length!==tempKeys.length||tempKeys.some((k,i)=>{const d=Object.getOwnPropertyDescriptor(temporary,k),b=tempValues[i];return !d||!Object.hasOwn(d,'value')||!Object.is(d.value,b.value)||d.writable!==b.writable||d.enumerable!==b.enumerable||d.configurable!==b.configurable})||
      !after.checked||after.value!==config.value||after.other!==before.other||
      ['passage','turns','time','money'].some(k=>after[k]!==before[k]))return {ok:false};
    const evidence={kind:'native-radio',field:config.field,from:before.value,to:after.value,passage:after.passage,turns:after.turns,time:after.time,money:after.money,otherStateStable:true};
    const receipt=Object.freeze({...config.binding,attemptId:config.attemptId,status:'terminal',outcome:'occurred',remoteClosed:true,spent:0,evidence});context.records[config.attemptId]=receipt;return {ok:true,receipt};
  }catch{return {ok:false}}
}
async function prepare(client,descriptor,goal,attemptId){
  const selector=descriptor?.selected?.selector;
  if(descriptor?.kind!=='menu'||descriptor.selected.type!=='web-click'||typeof selector!=='string'||selector.length>256||!selector||descriptor.destination!=null||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(attemptId))throw Object.assign(Error('Native radio descriptor unavailable'),{code:'MAPPING_UNAVAILABLE'});
  const group='dol-native-radio-'+randomUUID();
  try{
    const get=async expression=>{const r=await client.send('Runtime.evaluate',{expression,objectGroup:group,returnByValue:false,silent:true});if(r.exceptionDetails||!r.result?.objectId)throw Error('Native radio object unavailable');return r.result.objectId};
    const node=await get(`(()=>{const n=document.querySelectorAll(${JSON.stringify(selector)});return n.length===1&&n[0].tagName==='LABEL'?n[0].querySelector('input.macro-radiobutton[type="radio"]'):null})()`);
    const shadow=await c.member(client,node,'(()=>{const e=jQuery._data(this,"events")?.change;return e?.length===1?e[0].handler:null})()',group),callback=await c.captured(client,shadow,'callback');
    for(const name of ['startCallback','doneCallback']){const v=await lexical(client,shadow,name);if(v.type!=='undefined'&&!(v.subtype==='null'&&v.value===null))throw Error('Unreviewed radio tail')}
    const name=await lexical(client,callback,'varName'),value=await lexical(client,callback,'checkValue');
    const field=name.type==='string'?name.value.slice(1):null;
    if(name.value!=='$'+field||!fields.includes(field)||value.type!=='string'||!/^[a-z][a-z0-9_ -]{0,63}$/.test(value.value))throw Error('Unreviewed combat intent');
    const state=await c.captured(client,shadow,'State','object',{maxResponseBytes:8*1024*1024}),callbackState=await c.captured(client,callback,'State','object',{maxResponseBytes:8*1024*1024});
    if(!await c.sameObject(client,state,callbackState)||!await c.sameObject(client,state,await get('window.SugarCube.State')))throw Error('Original radio State alias differs');
    const store=await c.captured(client,shadow,'shadowStore','object'),context=await c.captured(client,shadow,'shadowContext','object');
    const storeCheck=await client.send('Runtime.callFunctionOn',{objectId:store,functionDeclaration:'function(){return Reflect.ownKeys(this).every(k=>k==="_args")}',returnByValue:true});
    if(storeCheck.exceptionDetails||storeCheck.result?.value!==true)throw Error('Radio shadow conflicts with game state');
    const setVar=await c.member(client,state,'this.setVar',group),scripting=await c.captured(client,setVar,'Scripting','object',{maxResponseBytes:8*1024*1024}),evaluate=await c.member(client,scripting,'this.evalTwineScript',group),parse=await c.captured(client,evaluate,'parse','function');
    const ids=[node,shadow,callback,state,store,context,setVar,scripting,evaluate,parse],checks=[];
    for(const [key,index] of [['shadow',1],['callback',2],['setVar',6],['eval',8],['parse',9]]){const source=await c.functionSource(client,ids[index]);if(sha(source)!==sources[key])throw Error('Native radio source changed');checks.push(`if(Function.prototype.toString.call(nativeEnvInputs[0].refs[${index}])!==${JSON.stringify(source)})return 'radio-source-changed';`)}
    const beforeResult=await client.send('Runtime.callFunctionOn',{objectId:node,functionDeclaration:`function(){return (${inspect.toString()})(this,${JSON.stringify(field)})}`,returnByValue:true});
    if(beforeResult.exceptionDetails||!beforeResult.result?.value)throw Error('Original combat radio scene unavailable: '+(beforeResult.exceptionDetails?.exception?.description??beforeResult.exceptionDetails?.text??'missing result'));
    const before=beforeResult.result.value;
    if(before.checked||before.value===value.value)throw Error('Combat intent already selected');
    const env=await generic.review(client,{objectGroup:group,objects:{state},before,destination:before.passage});
    const epoch=await client.send('Runtime.callFunctionOn',{objectId:node,objectGroup:group,returnByValue:false,arguments:[...ids.map(objectId=>({objectId})),{value:before}],functionDeclaration:'function(...args){return {refs:args.slice(0,-1),before:args.at(-1)}}'});
    if(epoch.exceptionDetails||!epoch.result?.objectId)throw Error('Radio epoch unavailable');
    const guardSource=`function(phase,...inputs){const nativeEnvPhase=phase,nativeEnvInputs=inputs.slice(1);const r=inputs[0].refs,n=r[0];
      if(window.SugarCube.State!==r[3]||r[3].setVar!==r[6]||r[7].evalTwineScript!==r[8]||jQuery._data(n,'events')?.change?.[0]?.handler!==r[1]||
        Reflect.ownKeys(r[4]).some(k=>k!=='_args')||r[5].name!=='radiobutton'||r[5].args[0]!==${JSON.stringify(name.value)}||r[5].args[1]!==${JSON.stringify(value.value)})return 'radio-binding-changed';
      ${checks.join('\n').replaceAll('nativeEnvInputs[0].refs','r')}
      ${env.guard}}`;
    const guard=await get('('+guardSource+')');
    const args=[{objectId:epoch.result.objectId},...env.arguments],binding={provider:'native-dol',contract:'native-radio-'+sha(JSON.stringify(sources)+inspect.toString()+operation.toString()+guardSource).slice(0,12),contextNonce:await receipts.context(client),requestDigest:sha(JSON.stringify({attemptId,selected:descriptor.selected,field,value:value.value,before}))};
    const config={namespace:receipts.namespace,binding,attemptId,field,value:value.value};
    const argumentsList=[{objectId:node},{objectId:guard},...args];
    const check='function(phase){return observedInputs[1](phase,...observedInputs.slice(2))}';
    return {action:descriptor.selected,arguments:argumentsList,objectGroups:[group],executionBinding:binding,
      source:`if(node!==observedInputs[0].parentElement)return {ok:false,guardRejected:true};try{if((${check})('before')!==undefined||JSON.stringify((${inspect.toString()})(observedInputs[0],${JSON.stringify(field)}))!==JSON.stringify(observedInputs[2].before))return {ok:false,guardRejected:true};}catch{return {ok:false,guardRejected:true};}`,
      interpretation:{provider:'native-dol',execution:'native-operation',contract:binding.contract,field,value:value.value},
      operation:{name:'native-radio',source:`return (${operation.toString()})(observedInputs[0],${JSON.stringify(config)},observedInputs[2],${check},${inspect.toString()});`}};
  }catch(error){try{await client.send('Runtime.releaseObjectGroup',{objectGroup:group})}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native radio binding cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}throw Object.assign(Error('Reviewed native radio unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'})}
}
function validateReceipt(r,e){const v=r.evidence;return r.outcome==='occurred'&&r.remoteClosed===true&&r.spent===0&&e?.executionBinding?.provider==='native-dol'&&/^native-radio-[a-f0-9]{12}$/.test(e.executionBinding.contract||'')&&e.action?.kind==='menu'&&e.action.cost===0&&
  v&&Reflect.ownKeys(v).length===9&&Object.keys(v).every(k=>['kind','field','from','to','passage','turns','time','money','otherStateStable'].includes(k))&&v.kind==='native-radio'&&fields.includes(v.field)&&
  [v.from,v.to,v.passage].every(s=>typeof s==='string'&&s.length>0&&s.length<=128)&&v.from!==v.to&&Number.isSafeInteger(v.turns)&&v.turns>=0&&Number.isFinite(v.time)&&Number.isSafeInteger(v.money)&&v.money>=0&&v.otherStateStable===true}
module.exports={prepare,inspect,operation,validateReceipt};
