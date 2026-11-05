interface ReceiptView {outcome?:unknown;remoteClosed?:unknown;spent?:unknown;evidence?:{kind?:unknown;field?:unknown;from?:unknown;to?:unknown;passage?:unknown;turns?:unknown;time?:unknown;money?:unknown;otherStateStable?:unknown}}
interface EffectView {executionBinding?:{provider?:unknown;contract?:string};action?:{kind?:unknown;cost?:unknown}}
// Property views describe access to external values; runtime checks remain authoritative.
interface DescriptorView {kind?:unknown;destination?:unknown;selected?:{type?:unknown;selector?:unknown;[key:string]:unknown}}
interface Remote {exceptionDetails?:{exception?:{description?:unknown};text?:unknown};result?:{objectId?:unknown;value?:unknown}}
interface Before {checked?:unknown;value?:unknown;passage?:unknown;[key:string]:unknown}
'use strict';
// Original combat intent selection only. Advancing a turn and its business
// outcome remain separate actions; never call State.setVar from the host.
import type cdp from './cdp.cjs';
const {createHash,randomUUID}:typeof import('node:crypto')=require('node:crypto'),c:typeof import('./game-contract.cjs')=require('./game-contract.cjs'),receipts:typeof import('./game-receipts.cjs')=require('./game-receipts.cjs');
const {lexical,sources:links}:typeof import('./game-native-navigation.cjs')=require('./game-native-navigation.cjs'),generic:typeof import('./game-native-generic-landing.cjs')=require('./game-native-generic-landing.cjs');
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');
const sources={shadow:links.shadow,callback:'5aa51adacaad49700ed8057940822485425706e5da0395e362412eae3f52e8bc',
  setVar:'a49466396363e391ff0fffa179a93a1f6c3c994bd2b9fe559d4f0cc997f1b107',eval:'930c34ee3b0b4a93dde917dc367b75d5ebe98ae5fd309c51cde8eb70164f90e2',
  parse:'333b835c7a6bb1152de81d2d7e241b59617048bfc55b4e8870a1ed759599a883'};
const fields=['leftaction','rightaction','feetaction','mouthaction'];
const {inspect,operation}:typeof import('./browser-abi/native-radio.cjs')=require('./browser-abi/native-radio.cjs');

async function prepare(client:Pick<cdp.Client,'send'|'evaluate'>,rawDescriptor:unknown,goal:unknown,attemptId:unknown,{scope}:{scope?:unknown}={}){
  const descriptor=rawDescriptor as DescriptorView;
  const port=client as unknown as {send(method:string,params?:unknown):Promise<Remote>};
  const selector=descriptor?.selected?.selector;
  if(descriptor?.kind!=='menu'||descriptor.selected!.type!=='web-click'||typeof selector!=='string'||selector.length>256||!selector||descriptor.destination!=null||
    !/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(attemptId as string))throw Object.assign(Error('Native radio descriptor unavailable'),{code:'MAPPING_UNAVAILABLE'});
  const group='dol-native-radio-'+randomUUID();
  try{
    const get=async (expression:string)=>{const r=await port.send('Runtime.evaluate',{expression,objectGroup:group,returnByValue:false,silent:true});if(r.exceptionDetails||!r.result?.objectId)throw Error('Native radio object unavailable');return r.result.objectId};
    const node=await get(`(()=>{const n=document.querySelectorAll(${JSON.stringify(selector)});return n.length===1&&n[0].tagName==='LABEL'?n[0].querySelector('input.macro-radiobutton[type="radio"]'):null})()`);
    const shadow=await c.member(client,node,'(()=>{const e=jQuery._data(this,"events")?.change;return e?.length===1?e[0].handler:null})()',group),callback=await c.captured(client,shadow,'callback');
    for(const name of ['startCallback','doneCallback']){const v=await lexical(client,shadow,name);if(v.type!=='undefined'&&!(v.subtype==='null'&&v.value===null))throw Error('Unreviewed radio tail')}
    const name=await lexical(client,callback,'varName'),value=await lexical(client,callback,'checkValue');
    const field=name.type==='string'?(name.value as string).slice(1):null;
    if(name.value!=='$'+field||!fields.includes(field as string)||value.type!=='string'||!/^[a-z][a-z0-9_ -]{0,63}$/.test(value.value as string))throw Error('Unreviewed combat intent');
    const state=await c.captured(client,shadow,'State','object',{maxResponseBytes:8*1024*1024}),callbackState=await c.captured(client,callback,'State','object',{maxResponseBytes:8*1024*1024});
    if(!await c.sameObject(client,state,callbackState)||!await c.sameObject(client,state,await get('window.SugarCube.State')))throw Error('Original radio State alias differs');
    const store=await c.captured(client,shadow,'shadowStore','object'),context=await c.captured(client,shadow,'shadowContext','object');
    const storeCheck=await port.send('Runtime.callFunctionOn',{objectId:store,functionDeclaration:'function(){return Reflect.ownKeys(this).every(k=>k==="_args")}',returnByValue:true});
    if(storeCheck.exceptionDetails||storeCheck.result?.value!==true)throw Error('Radio shadow conflicts with game state');
    const setVar=await c.member(client,state,'this.setVar',group),scripting=await c.captured(client,setVar,'Scripting','object',{maxResponseBytes:8*1024*1024}),evaluate=await c.member(client,scripting,'this.evalTwineScript',group),parse=await c.captured(client,evaluate,'parse','function');
    const ids=[node,shadow,callback,state,store,context,setVar,scripting,evaluate,parse],checks:string[]=[];
    for(const [key,index] of [['shadow',1],['callback',2],['setVar',6],['eval',8],['parse',9]] as [keyof typeof sources,number][]){const source=await c.functionSource(client,ids[index]);if(sha(source)!==sources[key])throw Error('Native radio source changed');checks.push(`if(Function.prototype.toString.call(nativeEnvInputs[0].refs[${index}])!==${JSON.stringify(source)})return 'radio-source-changed';`)}
    const saveWatch=await (require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).bind(client,scope,group),readSource=`function(node,field){return (${inspect.toString()})(node,field,${saveWatch!==null})}`;
    const beforeResult=await port.send('Runtime.callFunctionOn',{objectId:node,functionDeclaration:`function(){return (${readSource})(this,${JSON.stringify(field)})}`,returnByValue:true});
    if(beforeResult.exceptionDetails||!beforeResult.result?.value)throw Error('Original combat radio scene unavailable: '+(beforeResult.exceptionDetails?.exception?.description??beforeResult.exceptionDetails?.text??'missing result'));
    const before=beforeResult.result.value as Before & {passage:unknown};
    if(before.checked||before.value===value.value)throw Error('Combat intent already selected');
    const env=await generic.review(client,{objectGroup:group,objects:{state},before,destination:before.passage},saveWatch!==null);
    const epoch=await port.send('Runtime.callFunctionOn',{objectId:node,objectGroup:group,returnByValue:false,arguments:[...ids.map(objectId=>({objectId})),{value:before}],functionDeclaration:'function(...args){return {refs:args.slice(0,-1),before:args.at(-1)}}'});
    if(epoch.exceptionDetails||!epoch.result?.objectId)throw Error('Radio epoch unavailable');
    const guardSource=`function(phase,...inputs){const nativeEnvPhase=phase,nativeEnvInputs=inputs.slice(1);const r=inputs[0].refs,n=r[0];
      if(window.SugarCube.State!==r[3]||r[3].setVar!==r[6]||r[7].evalTwineScript!==r[8]||jQuery._data(n,'events')?.change?.[0]?.handler!==r[1]||
        Reflect.ownKeys(r[4]).some(k=>k!=='_args')||r[5].name!=='radiobutton'||r[5].args[0]!==${JSON.stringify(name.value)}||r[5].args[1]!==${JSON.stringify(value.value)})return 'radio-binding-changed';
      ${checks.join('\n').replaceAll('nativeEnvInputs[0].refs','r')}
      ${env.guard}}`;
    const guard=await get('('+guardSource+')');
    const args=[{objectId:epoch.result.objectId},...env.arguments],binding={provider:'native-dol',contract:'native-radio-'+(saveWatch?'save-':'')+sha(JSON.stringify(sources)+readSource+operation.toString()+guardSource+(saveWatch?.digest||'')).slice(0,12),contextNonce:await receipts.context(client),requestDigest:sha(JSON.stringify({attemptId,selected:descriptor.selected,field,value:value.value,before}))};
    const config={namespace:receipts.namespace,binding,attemptId,field,value:value.value};
    const argumentsList=[{objectId:node},{objectId:guard},...args];
    const saveIndex=saveWatch?argumentsList.push({objectId:saveWatch.objectId})-1:null;
    const check='function(phase){return observedInputs[1](phase,...observedInputs.slice(2))}';
    return {action:descriptor.selected,arguments:argumentsList,objectGroups:[group],executionBinding:binding,
      source:`if(node!==observedInputs[0].parentElement)return {ok:false,guardRejected:true};${saveWatch?`if(observedInputs[${saveIndex}].check()!==undefined)return {ok:false,guardRejected:true};`:''}try{if((${check})('before')!==undefined||JSON.stringify((${readSource})(observedInputs[0],${JSON.stringify(field)}))!==JSON.stringify(observedInputs[2].before))return {ok:false,guardRejected:true};}catch{return {ok:false,guardRejected:true};}`,
      clickReceiverObjectId:node,interpretation:{provider:'native-dol',execution:'native-operation',contract:binding.contract,field,value:value.value},
      operation:(require('./action.cjs') as typeof import('./action.cjs')).reviewedOperation('native-radio',saveWatch?(require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).execution(`return (${operation.toString()})(observedInputs[0],${JSON.stringify(config)},observedInputs[2],${check},${readSource},markOperationDispatch,invokeBoundClick,observedInputs[${saveIndex}]);`,saveIndex!):`return (${operation.toString()})(observedInputs[0],${JSON.stringify(config)},observedInputs[2],${check},${readSource},markOperationDispatch,invokeBoundClick);`)};
  }catch(error){try{await port.send('Runtime.releaseObjectGroup',{objectGroup:group})}catch(cleanup){throw Object.assign(new AggregateError([error,cleanup],'Native radio binding cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED'})}throw Object.assign(Error('Reviewed native radio unavailable',{cause:error}),{code:'MAPPING_UNAVAILABLE'})}
}
function validateReceipt(raw:unknown,effect:unknown){const verified=(require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).receipt(raw,effect);if(!verified)return false;const {r,e}=verified as {r:ReceiptView;e:EffectView};const v=r.evidence;return r.outcome==='occurred'&&r.remoteClosed===true&&r.spent===0&&e?.executionBinding?.provider==='native-dol'&&/^native-radio-[a-f0-9]{12}$/.test(e.executionBinding.contract||'')&&e.action?.kind==='menu'&&e.action.cost===0&&
  v&&Reflect.ownKeys(v).length===9&&Object.keys(v).every(k=>['kind','field','from','to','passage','turns','time','money','otherStateStable'].includes(k))&&v.kind==='native-radio'&&fields.includes(v.field as string)&&
  [v.from,v.to,v.passage].every(s=>typeof s==='string'&&s.length>0&&s.length<=128)&&v.from!==v.to&&Number.isSafeInteger(v.turns)&&(v.turns as number)>=0&&Number.isFinite(v.time)&&Number.isSafeInteger(v.money)&&(v.money as number)>=0&&v.otherStateStable===true}
export = {prepare,inspect,operation,validateReceipt};
