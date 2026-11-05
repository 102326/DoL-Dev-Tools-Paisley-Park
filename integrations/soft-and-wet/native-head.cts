import type cdp from '../../scripts/lib/cdp.cjs';
import type contractTypes from '../../scripts/lib/game-contract.cjs';
type Client=Pick<cdp.Client,'send'|'evaluate'>;
type Request=Parameters<typeof import('./gameplay.cjs').validate>[0] & {operation:string};
type Append=(objectId:unknown,check:(ref:string)=>string)=>void;
// A local view of CDP responses; the existing checks below remain the runtime boundary.
interface Remote {exceptionDetails?:unknown;result?:{objectId?:unknown;type?:unknown;value?:{ok?:unknown;proof?:object}|unknown};listeners?:{type?:unknown;scriptId?:unknown;lineNumber?:unknown;columnNumber?:unknown}[];internalProperties?:{name?:unknown;value?:{value?:{scriptId?:unknown;lineNumber?:unknown;columnNumber?:unknown}}}[]}
type Port={send(method:string,params?:unknown):Promise<Remote>};
interface Current {selector:unknown;index:unknown;before:unknown;status?:unknown}
interface UIProfile {head:Mode & {toggleSha256:string;onSelectSha256:string};strip:Mode;shared:Record<string,string>;invokerSha256:string}
interface Mode {callbackSha256:string;actionSha256:string;errorMessages:string[]}
interface Disabled {owner:'npc-pet'|'character-pet'|'floating-pet'|'base-pet';name:string;sha256:string}
interface WidgetProfile {name:string;sha256:string;handlerSha256?:string;wrapperChain?:contractTypes.Wrapper[];disabledDisplayMethods?:{methods:Disabled[]}}
interface MacroProfile {name:string;macroFunction:{sha256:string};handlerSha256?:string;nestedMacroFunction?:{sha256:string};capturedClosure?:{name:string;sha256:string}}
interface FunctionProfile {expr:string;sha256:string;requireUniqueParserName?:boolean;capturedClosure?:{name:string;sha256:string;fixedCallback?:{name:string;sha256:string}}}
interface Profile {id:string;terminalReviewed:boolean;widgets:WidgetProfile[];functionMacros:MacroProfile[];coreFunctions:FunctionProfile[];wikifierMembers:FunctionProfile[];uiBinding:UIProfile}
interface Effect {status:string;id:string;action?:{kind?:string;selected?:{type?:string;operation?:string;slot?:string}};executionBinding?:{provider?:string;contract?:string;requestDigest?:string}}
// Reviewed native operation, not a UI click or an arbitrary-JS Action.
const { createHash, randomUUID }:typeof import('node:crypto') = require('node:crypto');
const mapping:typeof import('./gameplay.cjs') = require('./gameplay.cjs');
const contracts:typeof import('../../scripts/lib/game-contract.cjs') = require('../../scripts/lib/game-contract.cjs');
const { functionSource, captured, member, sameObject } = contracts;
const receipts:typeof import('../../scripts/lib/game-receipts.cjs') = require('../../scripts/lib/game-receipts.cjs');
const hash = (value:string) => createHash('sha256').update(value).digest('hex');
const slots = ['over_upper','over_lower','upper','lower','under_upper','under_lower','over_head','head','face','neck','hands','handheld','legs','feet','genitals'];
const {stateReader}:typeof import('../../scripts/lib/browser/integration-native-head-state.cjs')=require('../../scripts/lib/browser/integration-native-head-state.cjs');
// Persisted source input, not a Node executor.
const {operation}:{operation:{toString():string}}=require('./browser-abi/native-head-operation.cjs');

async function prepareUi(client:Client, request:{operation:string}, current:Current, expected:UIProfile, group:string, inputs:{objectId:unknown}[], append:Append) {
  const port=client as Port;
  if (!expected || !expected.head || !expected.strip || !expected.shared) throw Error('Native UI profile unavailable');
  const checked = async (id:unknown, sha256:string) => {
    if (hash(await functionSource(client,id)) !== sha256) throw Error('Native UI function source mismatch');
    return id;
  };
  const held = (id:unknown) => { const index=inputs.length; inputs.push({objectId:id}); return index; };
  const nodeResult = await port.send('Runtime.evaluate',{expression:'document.querySelector('+JSON.stringify(current.selector)+')',returnByValue:false,objectGroup:group,silent:true});
  if (nodeResult.exceptionDetails || !nodeResult.result?.objectId) throw Error('Native UI control unavailable');
  const nodeId=nodeResult.result.objectId;
  const listeners=await port.send('DOMDebugger.getEventListeners',{objectId:nodeId});
  const clicks=listeners.listeners?.filter(listener=>listener.type==='click')||[];
  if(clicks.length!==1)throw Error('Native UI click listener ambiguous');
  const invokerId=await member(client,nodeId,'this[Object.getOwnPropertySymbols(this).filter(s=>String(s)==="Symbol(_vei)")[0]]?.onClick',group);
  const location=(await port.send('Runtime.getProperties',{objectId:invokerId,ownProperties:true,generatePreview:false})).internalProperties?.find(p=>p.name==='[[FunctionLocation]]')?.value?.value;
  // DOMDebugger omits handler RemoteObject on this WebView; source location
  // corroborates the unique listener, but is not object identity proof.
  if(!location || location.scriptId!==clicks[0].scriptId || location.lineNumber!==clicks[0].lineNumber || location.columnNumber!==clicks[0].columnNumber)throw Error('Native UI click listener location mismatch');
  await checked(invokerId,expected.invokerSha256);
  const vue=await port.send('Runtime.callFunctionOn',{objectId:nodeId,functionDeclaration:'function(listener){const symbols=Object.getOwnPropertySymbols(this).filter(s=>String(s)==="Symbol(_vei)");return symbols.length===1&&Object.keys(this[symbols[0]]).length===1&&this[symbols[0]].onClick===listener}',arguments:[{objectId:invokerId}],returnByValue:true});
  if(vue.exceptionDetails||vue.result?.value!==true)throw Error('Native UI Vue listener binding unavailable');
  const callbackId=await member(client,invokerId,'this.value',group), mode=request.operation==='equip'?expected.head:expected.strip;
  await checked(callbackId,mode.callbackSha256);
  let functionId, contextId, entryId, propsId, selectId;
  if(request.operation==='equip') {
    const toggleId=await captured(client,callbackId,'J');await checked(toggleId,expected.head.toggleSha256);
    propsId=await captured(client,toggleId,'n','object');
    selectId=await member(client,propsId,'this.onSelect',group);await checked(selectId,expected.head.onSelectSha256);
    functionId=await captured(client,selectId,'B');await checked(functionId,expected.head.actionSha256);
    contextId=await captured(client,selectId,'V','object');
    const selected=await captured(client,callbackId,'f','object');
    const key=await port.send('Runtime.callFunctionOn',{objectId:selected,functionDeclaration:'function(){return this.key}',returnByValue:true});
    if(key.exceptionDetails||key.result?.value!=='head:'+current.index)throw Error('Native UI selected key changed');
    entryId=await member(client,contextId,'this.entries?.find(e=>e.key==='+JSON.stringify('head:'+current.index)+')',group);
  } else {
    functionId=await captured(client,callbackId,'k');await checked(functionId,expected.strip.actionSha256);
    contextId=await captured(client,callbackId,'V','object');
  }
  if(!Array.isArray(mode.errorMessages)||!mode.errorMessages.length||mode.errorMessages.some(message=>typeof message!=='string'||!message||message.length>256))throw Error('Native UI error signal profile unavailable');
  const actionSource=await functionSource(client,functionId);
  if(mode.errorMessages.some(message=>!actionSource.includes(JSON.stringify(message))))throw Error('Native UI error signal source mismatch');
  const pId=await captured(client,functionId,'P'), yId=await captured(client,functionId,'Y');
  await checked(pId,expected.shared.pSha256);await checked(yId,expected.shared.ySha256);
  const bridgeId=await captured(client,functionId,'s','object'), activeId=await captured(client,yId,'_','object');
  if(!await sameObject(client,contextId,activeId))throw Error('Native UI current wardrobe context changed');
  const jId=await captured(client,yId,'j'), cId=await captured(client,jId,'C');
  await checked(jId,expected.shared.jSha256);await checked(cId,expected.shared.cSha256);
  if(request.operation==='equip' && !await sameObject(client,await captured(client,functionId,'j'),jId))throw Error('Native UI fallback binding changed');
  const tail:[string,unknown,string][]=[['qe',jId,expected.shared.qeSha256],['ne',jId,expected.shared.neSha256],['xr',cId,expected.shared.xrSha256]];
  for(const [name,owner,sha] of tail)await checked(await captured(client,owner,name),sha);
  const measured=await captured(client,jId,'n','object'), outfit=await captured(client,cId,'b','object');
  const measureId=await member(client,measured,'this.measure',group), syncId=await member(client,outfit,'this.sync',group);
  await checked(measureId,expected.shared.measureSha256);
  await checked(syncId,expected.shared.outfitSyncSha256);
  const actionId=await member(client,bridgeId,'this.action',group), availableId=await member(client,bridgeId,'this.available',group), messageId=await member(client,bridgeId,'this.message',group);
  await checked(actionId,expected.shared.bridgeActionSha256);await checked(availableId,expected.shared.bridgeAvailableSha256);await checked(messageId,expected.shared.bridgeMessageSha256);
  const actionOwn=await port.send('Runtime.callFunctionOn',{objectId:bridgeId,functionDeclaration:'function(action){const d=Object.getOwnPropertyDescriptor(this,"action");return !!d&&d.writable===true&&d.configurable===true&&d.value===action}',arguments:[{objectId:actionId}],returnByValue:true});
  if(actionOwn.exceptionDetails||actionOwn.result?.value!==true)throw Error('Native UI bridge action descriptor unavailable');
  const executeId=await captured(client,actionId,'s'), getterId=await captured(client,executeId,'n');
  await checked(executeId,expected.shared.bridgeExecuteSha256);await checked(getterId,expected.shared.wikifierGetterSha256);
  if(!await sameObject(client,measured,await captured(client,executeId,'r','object')))throw Error('Native UI bridge measure owner mismatch');
  if(!await sameObject(client,getterId,await captured(client,availableId,'n')))throw Error('Native UI Wikifier getter mismatch');
  const getterRoot=await captured(client,getterId,'t','object');
  const wikifier=await port.send('Runtime.callFunctionOn',{objectId:getterRoot,functionDeclaration:'function(){return this===window&&(this.SugarCube?.Wikifier??this.Wikifier)===window.SugarCube?.Wikifier}',returnByValue:true});
  if(wikifier.exceptionDetails||wikifier.result?.value!==true)throw Error('Native UI Wikifier binding unavailable');
  const wikifierBound=await port.send('Runtime.evaluate',{expression:'window.SugarCube.Wikifier',returnByValue:false,objectGroup:group,silent:true});
  if(wikifierBound.exceptionDetails||wikifierBound.result?.type!=='function'||!wikifierBound.result.objectId)throw Error('Native UI Wikifier unavailable');
  await checked(wikifierBound.result.objectId,expected.shared.wikifierSha256);
  const hostBound=await port.send('Runtime.evaluate',{expression:'window.DoLWardrobeUI',returnByValue:false,objectGroup:group,silent:true});
  if(hostBound.exceptionDetails||hostBound.result?.type!=='object'||!hostBound.result.objectId)throw Error('Native UI host unavailable');
  const hostId=hostBound.result.objectId, enabledId=await member(client,hostId,'this.getEnabled',group);
  await checked(enabledId,expected.shared.hostEnabledSha256);
  const enabled=await port.send('Runtime.callFunctionOn',{objectId:enabledId,functionDeclaration:'function(){return this()===true}',returnByValue:true});
  if(enabled.exceptionDetails||enabled.result?.value!==true)throw Error('Native UI host disabled');
  const context=await port.send('Runtime.callFunctionOn',{objectId:contextId,functionDeclaration:'function(index,equip){const roots=document.querySelectorAll("#passages > .passage"),list=document.querySelector("#wardrobeList"),item=this.entries?.filter(e=>e.key==="head:"+index);return roots.length===1&&roots[0].getAttribute("data-passage")==="Wardrobe"&&this.passage===roots[0]&&this.passage.isConnected&&this.original?.isConnected&&this.original.contains(list)&&this.state?.busy===false&&this.state?.slot==="head"&&this.refreshQueued===false&&(!equip||item?.length===1&&item[0].slot==="head"&&item[0].index===index&&item[0].raw===window.SugarCube.State.variables.wardrobe.head[index])}',arguments:[{value:current.index},{value:request.operation==='equip'}],returnByValue:true});
  if(context.exceptionDetails||context.result?.value!==true)throw Error('Native UI wardrobe context unavailable');
  const nodeIndex=held(nodeId), invokerIndex=held(invokerId), callbackIndex=held(callbackId), contextIndex=held(contextId), functionIndex=held(functionId);
  const entryIndex=entryId===undefined?null:held(entryId), actionIndex=held(actionId), availableIndex=held(availableId), messageIndex=held(messageId), wikifierIndex=held(wikifierBound.result.objectId), selectIndex=selectId===undefined?null:held(selectId), hostIndex=held(hostId), enabledIndex=held(enabledId), bridgeIndex=held(bridgeId);
  const measuredIndex=held(measured), measureIndex=held(measureId), outfitIndex=held(outfit), syncIndex=held(syncId);
  const ref=(index:number|null)=>'observedInputs['+index+']';
  append(nodeId,()=>`const vueSymbols=Object.getOwnPropertySymbols(node).filter(s=>String(s)==="Symbol(_vei)");if(node!==${ref(nodeIndex)}||vueSymbols.length!==1||Object.keys(node[vueSymbols[0]]).length!==1||node[vueSymbols[0]].onClick!==${ref(invokerIndex)}||${ref(invokerIndex)}.value!==${ref(callbackIndex)})return {ok:false,guardRejected:true};`);
  append(contextId,refContext=>`const currentRoot=document.querySelectorAll("#passages > .passage"),currentList=document.querySelectorAll("#wardrobeList");if(currentRoot.length!==1||currentRoot[0].getAttribute("data-passage")!=="Wardrobe"||currentList.length!==1||${refContext}!==${ref(contextIndex)}||${refContext}.passage!==currentRoot[0]||!${refContext}.passage.isConnected||!${refContext}.original?.isConnected||!${refContext}.original.contains(currentList[0])||${refContext}.state?.busy!==false||${refContext}.state.slot!=="head"||${refContext}.refreshQueued!==false)return {ok:false,guardRejected:true};`);
  if(entryIndex!==null)append(entryId,refEntry=>`const uiEntries=${ref(contextIndex)}.entries?.filter(e=>e.key===${JSON.stringify('head:'+current.index)});if(uiEntries?.length!==1||uiEntries[0]!==${refEntry}||${refEntry}!==${ref(entryIndex)}||${refEntry}.slot!=="head"||${refEntry}.index!==${current.index}||${refEntry}.raw!==window.SugarCube.State.variables.wardrobe.head[${current.index}])return {ok:false,guardRejected:true};`);
  if(propsId)append(propsId,refProps=>`if(${refProps}.onSelect!==${ref(selectIndex)})return {ok:false,guardRejected:true};`);
  append(bridgeId,refBridge=>`const bridgeDescriptor=Object.getOwnPropertyDescriptor(${refBridge},"action");if(${refBridge}!==${ref(bridgeIndex)}||!bridgeDescriptor||bridgeDescriptor.writable!==true||bridgeDescriptor.configurable!==true||bridgeDescriptor.value!==${ref(actionIndex)}||${refBridge}.available!==${ref(availableIndex)}||${refBridge}.message!==${ref(messageIndex)}||window.SugarCube.Wikifier!==${ref(wikifierIndex)})return {ok:false,guardRejected:true};`);
  append(hostId,refHost=>`try{if(window.DoLWardrobeUI!==${refHost}||${refHost}.getEnabled!==${ref(enabledIndex)}||${ref(enabledIndex)}()!==true)return {ok:false,guardRejected:true};}catch{return {ok:false,guardRejected:true};}`);
  append(measured,refOwner=>`if(${refOwner}!==${ref(measuredIndex)}||${refOwner}.measure!==${ref(measureIndex)})return {ok:false,guardRejected:true};`);
  append(outfit,refOwner=>`if(${refOwner}!==${ref(outfitIndex)}||${refOwner}.sync!==${ref(syncIndex)})return {ok:false,guardRejected:true};`);
  return {nodeIndex,functionIndex,contextIndex,entryIndex,hostIndex,enabledIndex,measuredIndex,measureIndex,outfitIndex,syncIndex,bridgeIndex,actionIndex,messageIndex};
}
async function prepareDisabledDisplays(client:Client, proven:contractTypes.RetainedWidget, entry:WidgetProfile, inputs:{objectId:unknown}[], append:Append) {
  const port=client as Port;
  const sidebar = await captured(client, proven.wrapperFunctionIds[1], 'NPCSidebar');
  const npc = await member(client, sidebar, 'this.pet'), character = await captured(client, proven.wrapperFunctionIds[3], 't', 'object');
  const pets = [await member(client,npc,'this.pets[0]'), await member(client,npc,'this.pets[1]')];
  const bindMember = (owner:unknown, field:string, id:unknown) => {
    const index=inputs.length;inputs.push({objectId:id});
    append(owner, ref => `if((${field.replaceAll('this',ref)})!==observedInputs[${index}])return {ok:false,guardRejected:true};`);
  };
  bindMember(sidebar,'this.pet',npc);
  bindMember(npc,'this.pets[0]',pets[0]);bindMember(npc,'this.pets[1]',pets[1]);
  const floating = await member(client,character,'(()=>{let p=this;for(let i=0;i<4&&p;i++,p=Object.getPrototypeOf(p)){if(Object.hasOwn(p,"unmount"))return p}})()');
  const base = await member(client,floating,'Object.getPrototypeOf(this)');
  bindMember(floating,'Object.getPrototypeOf(this)',base);
  const owners={'npc-pet':[npc],'character-pet':[character],'floating-pet':[character],'base-pet':pets};
  // super.unmount() resolves from the reviewed method's actual HomeObject.
  for (const method of entry.disabledDisplayMethods!.methods) {
    const selected = method.owner==='base-pet' ? [...owners[method.owner],...(method.name==='unmount'?[base]:[character])] : owners[method.owner];
    if (!selected) throw Error('Native display method owner unavailable');
    for (const owner of selected) {
      const id = await member(client,owner,'this['+JSON.stringify(method.name)+']'), source = await functionSource(client,id);
      if (hash(source)!==method.sha256) throw Error('Native disabled display source mismatch');
      bindMember(owner,'this['+JSON.stringify(method.name)+']',id);
      if(source.includes('rg.variables')) {
        const root=await captured(client,id,'rg','object');
        const agrees=await port.send('Runtime.callFunctionOn',{objectId:root,functionDeclaration:'function(){return this.variables===window.SugarCube.State.variables}',returnByValue:true});
        if(agrees.exceptionDetails||agrees.result?.value!==true)throw Error('Native display original state binding mismatch');
        append(root,ref=>`if(${ref}.variables!==window.SugarCube.State.variables)return {ok:false,guardRejected:true};`);
      }
    }
  }
  for (const pet of [...pets,character]) {
    const valid = await port.send('Runtime.callFunctionOn',{objectId:pet,functionDeclaration:'function(){return this.cleanupDrag===undefined && this.canvas===undefined}',returnByValue:true});
    if(valid.exceptionDetails || valid.result?.value!==true)throw Error('Native inactive display branch unavailable');
    append(pet,ref=>`if(${ref}.cleanupDrag!==undefined||${ref}.canvas!==undefined)return {ok:false,guardRejected:true};`);
  }
  append(npc,ref=>`if(!Array.isArray(${ref}.pets)||${ref}.pets.length!==2)return {ok:false,guardRejected:true};`);
}
async function prepare(client:Client, requestValue:unknown, attemptId:unknown, {attestOnly = false, recoveryBindings = false} = {}) {
  const request=requestValue as Request;
  const port=client as Port;
  mapping.validate(request);
  if(typeof attestOnly!=='boolean'||typeof recoveryBindings!=='boolean'||recoveryBindings&&!attestOnly)throw Error('Invalid native attestation mode');
  if (!/^[a-f0-9-]{36}$/.test((attemptId || '') as string)) throw Error('Native attempt identity required');
  const profile:Profile = require('./native-head-profile.json');
  const current = await client.evaluate(`(${stateReader.toString()})(${JSON.stringify(request)},${mapping.reader.toString()},${JSON.stringify(slots)})`) as Current|null;
  if (current?.status !== 'available' || !attestOnly && profile.terminalReviewed !== true) throw Object.assign(Error('Native head profile unavailable'), { code: 'MAPPING_UNAVAILABLE' });
  const result = await mapping.prepare(client, request), groups:string[] = [], inputs:{objectId:unknown}[] = [...result.arguments];
  let guard = result.source;
  const append:Append = (objectId, check) => { const index = inputs.length; inputs.push({ objectId }); guard += '\n' + check('observedInputs[' + index + ']'); };
  const group = 'dol-native-head-' + randomUUID(); groups.push(group);
  const release = async () => {
    const cleanup = await Promise.allSettled([...groups.splice(0).map(objectGroup => port.send('Runtime.releaseObjectGroup', { objectGroup })),...result.objectIds.splice(0).map(objectId => port.send('Runtime.releaseObject', { objectId }))]);
    const failures = cleanup.filter(r => r.status==='rejected').map(r=>r.reason);
    if(failures.length)throw Object.assign(new AggregateError(failures,'Native profile binding cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED',bindingCleanup:'failed'});
  };
  try {
    for (const entry of profile.widgets) {
      const proven = await contracts.attestWidget(client, entry.name, entry.sha256, { retain: true, handlerSha256: entry.handlerSha256, wrapperChain: entry.wrapperChain }); groups.push(proven.objectGroup);
      append(proven.objectId, ref => `if(window.SugarCube.Macro.get(${JSON.stringify(entry.name)}).handler!==${ref})return {ok:false,guardRejected:true};`);
      for (const bound of proven.wrapperBindings) {
        const index = inputs.length; inputs.push({objectId:bound.valueId});
        append(bound.objectId, ref => `if(${ref}.handler!==observedInputs[${index}])return {ok:false,guardRejected:true};`);
      }
      if(entry.disabledDisplayMethods)await prepareDisabledDisplays(client,proven,entry,inputs,append);
      append(proven.definitionId, ref => `if(${ref}.payload?.[0]?.contents!==${JSON.stringify(proven.source)})return {ok:false,guardRejected:true};`);
    }
    for (const entry of profile.functionMacros) {
      const proven = await contracts.attestFunctionMacro(client, entry.name, entry.macroFunction.sha256, { retain: true, handlerSha256: entry.handlerSha256 }); groups.push(proven.objectGroup);
      append(proven.objectId, ref => `if(window.SugarCube.Macro.get(${JSON.stringify(entry.name)}).handler!==${ref})return {ok:false,guardRejected:true};`);
      if (entry.nestedMacroFunction) {
        const id = await captured(client, proven.functionId, 'macroFunction');
        const source = await functionSource(client, id);
        if (hash(source) !== entry.nestedMacroFunction.sha256) throw Error('Native nested macro source mismatch');
        append(id, ref => `if(Function.prototype.toString.call(${ref})!==${JSON.stringify(source)})return {ok:false,guardRejected:true};`);
      }
      if (entry.capturedClosure) {
        const id = await captured(client, proven.functionId, entry.capturedClosure.name), source = await functionSource(client, id);
        if (hash(source) !== entry.capturedClosure.sha256) throw Error('Native macro captured helper source mismatch');
        append(id, ref => `if(Function.prototype.toString.call(${ref})!==${JSON.stringify(source)})return {ok:false,guardRejected:true};`);
      }
    }
    for (const entry of [...profile.coreFunctions,...profile.wikifierMembers]) {
      if(entry.requireUniqueParserName && await client.evaluate('window.SugarCube.Wikifier.Parser.Profile.get("all").parsers.filter(p=>p.name==="macro").length')!==1)throw Error('Native macro parser ambiguous');
      const bound = await port.send('Runtime.evaluate', { expression: entry.expr, returnByValue: false, objectGroup: group });
      if (bound.exceptionDetails || bound.result?.type !== 'function' || !bound.result.objectId) throw Error('Native function binding unavailable');
      const id = bound.result.objectId, source = await functionSource(client, id);
      if (hash(source) !== entry.sha256) throw Error('Native function source mismatch');
      append(id, ref => `if((${entry.expr})!==${ref}||Function.prototype.toString.call(${ref})!==${JSON.stringify(source)}${entry.requireUniqueParserName?'||window.SugarCube.Wikifier.Parser.Profile.get("all").parsers.filter(p=>p.name==="macro").length!==1':''})return {ok:false,guardRejected:true};`);
      if (entry.capturedClosure) {
        const helper = await captured(client, id, entry.capturedClosure.name), helperSource = await functionSource(client, helper);
        if (hash(helperSource) !== entry.capturedClosure.sha256) throw Error('Native captured helper source mismatch');
        append(helper, ref => `if(Function.prototype.toString.call(${ref})!==${JSON.stringify(helperSource)})return {ok:false,guardRejected:true};`);
        if (entry.capturedClosure.fixedCallback) {
          const callback = entry.capturedClosure.fixedCallback;
          const callbackId = await captured(client, helper, callback.name), callbackSource = await functionSource(client, callbackId);
          if (hash(callbackSource) !== callback.sha256) throw Error('Native deferred callback source mismatch');
          append(callbackId, ref => `if(Function.prototype.toString.call(${ref})!==${JSON.stringify(callbackSource)})return {ok:false,guardRejected:true};`);
        }
      }
    }
    const ui = await prepareUi(client, request, current, profile.uiBinding, group, inputs, append);
    if(recoveryBindings)return {guard,inputs,ui,current,release};
    if(attestOnly) {
      await release();
      return {status:'attested',actions:false,profile:profile.id,terminalReviewed:profile.terminalReviewed===true,widgets:profile.widgets.map(({name,sha256})=>({name,sha256})),functionMacros:profile.functionMacros.map(({name,macroFunction})=>({name,sha256:macroFunction.sha256})),bindingCleanup:'completed'};
    }
    const contextNonce = await receipts.context(client);
    const operationSha256 = hash(operation.toString());
    const binding = { provider: 'soft-and-wet-native-head', contract: 'head-'+request.operation+'-' + hash(JSON.stringify(profile)+operationSha256).slice(0,12), contextNonce, requestDigest: hash(JSON.stringify({ request, index: current.index, before: current.before, profile: profile.id })) };
    const bound = await port.send('Runtime.evaluate', { expression: 'window[' + JSON.stringify(receipts.namespace) + ']', returnByValue: false, objectGroup: group });
    if (!bound.result?.objectId || bound.exceptionDetails) throw Error('Native receipt namespace unavailable');
    append(bound.result.objectId, ref => `if(window[${JSON.stringify(receipts.namespace)}]!==${ref}||${ref}.nonce!==${JSON.stringify(contextNonce)}||Object.keys(${ref}.records).length>=64||Object.hasOwn(${ref}.records,${JSON.stringify(attemptId)}))return {ok:false,guardRejected:true};`);
    guard += `\nconst nativeCurrent=(${stateReader.toString()})(${JSON.stringify(request)},${mapping.reader.toString()},${JSON.stringify(slots)});if(nativeCurrent.status!=='available'||JSON.stringify(nativeCurrent.before)!==${JSON.stringify(JSON.stringify(current.before))})return {ok:false,guardRejected:true};`;
    const operationSource = 'return (' + operation.toString() + ')(' + JSON.stringify({ namespace: receipts.namespace, binding, attemptId, index: current.index, before: current.before, operation:request.operation, errorMessages: profile.uiBinding[request.operation==='equip'?'head':'strip'].errorMessages, operationSha256 }) + ',observedInputs[' + ui.functionIndex + '],observedInputs[' + ui.contextIndex + '],' + (ui.entryIndex===null?'undefined':'observedInputs['+ui.entryIndex+']') + ',observedInputs[' + ui.hostIndex + '],observedInputs[' + ui.enabledIndex + '],observedInputs[' + ui.measuredIndex + '],observedInputs[' + ui.measureIndex + '],observedInputs[' + ui.outfitIndex + '],observedInputs[' + ui.syncIndex + '],observedInputs[' + ui.bridgeIndex + '],observedInputs[' + ui.actionIndex + '],observedInputs[' + ui.messageIndex + '],markOperationDispatch);';
    if (Buffer.byteLength(operationSource, 'utf8') > 32768) throw Error('Native operation source exceeds reviewed limit');
    return { ...result, arguments: inputs, objectGroups: groups, source: guard, executionBinding: binding,
      interpretation: { ...result.interpretation, execution: 'native-operation', contract: binding.contract },
      operation: require('../../scripts/lib/action.cjs').reviewedOperation(request.operation==='equip'?'native-head-wear':'native-head-strip',operationSource) };
  } catch (error) {
    if((error as {code?:unknown}).code==='NATIVE_BINDING_CLEANUP_FAILED')throw error;
    try { await release(); } catch(cleanup) { throw Object.assign(new AggregateError([error,cleanup], 'Native profile preparation and cleanup failed'),{code:'NATIVE_BINDING_CLEANUP_FAILED',bindingCleanup:'failed'}); }
    throw Object.assign(Error('Reviewed native head contract unavailable', { cause: error }), { code: 'MAPPING_UNAVAILABLE' });
  }
}
const {closedRecoveryReader}:typeof import('../../scripts/lib/browser/integration-native-head-recovery.cjs')=require('../../scripts/lib/browser/integration-native-head-recovery.cjs');

async function recoverClosed(client:Client, effectValue:unknown, before:unknown) {
  const effect=effectValue as Effect;
  const port=client as Port;
  const profile:Profile = require('./native-head-profile.json'), selected = effect?.action?.selected, binding = effect?.executionBinding;
  if (!effect || !['dispatching','acknowledged'].includes(effect.status) || !/^[a-f0-9-]{36}$/.test(effect.id || '') ||
      effect.action?.kind !== 'equip' || selected?.type !== 'sw-wardrobe' || selected.operation !== 'equip' || selected.slot !== 'head' ||
      binding?.provider !== 'soft-and-wet-native-head' || binding.contract !== 'head-equip-b88c4356f472' ||
      !before || typeof before !== 'object' || !Array.isArray((before as {inventory?:unknown}).inventory) || Buffer.byteLength(JSON.stringify(before)) > 16384 ||
      hash(JSON.stringify({request:selected,index:4,before,profile:profile.id})) !== binding.requestDigest)
    throw Error('Legacy native head recovery binding unavailable');
  const request = {type:'sw-wardrobe',operation:'unequip',slot:'head'};
  const held = await prepare(client,request,effect.id,{attestOnly:true,recoveryBindings:true}) as {guard:string;inputs:{objectId:unknown}[];ui:{contextIndex:number;bridgeIndex:number;actionIndex:number;nodeIndex:number};release:()=>Promise<void>};
  try {
    const indices={namespace:receipts.namespace,context:held.ui.contextIndex,bridge:held.ui.bridgeIndex,action:held.ui.actionIndex,index:4,
      errorMessages:[...profile.uiBinding.head.errorMessages,...profile.uiBinding.strip.errorMessages]};
    const check = `function(...args){const before=args.pop(),observedInputs=args,node=this;${held.guard}\nreturn (${closedRecoveryReader.toString()}).call(node,${JSON.stringify({attemptId:effect.id,binding})},before,observedInputs,${JSON.stringify(indices)});}`;
    const result = await port.send('Runtime.callFunctionOn',{objectId:held.inputs[held.ui.nodeIndex].objectId,functionDeclaration:check,
      arguments:[...held.inputs,{value:before}],returnByValue:true});
    if(result.exceptionDetails || (result.result?.value as {ok?:unknown}|undefined)?.ok!==true)return null;
    return {receipt:{attemptId:effect.id,outcome:'occurred',remoteClosed:true,spent:0,source:'reviewed native closed-effect recovery v1: head-equip-b88c4356f472'},
      proof:{...(result.result!.value as {proof?:object}).proof,profile:profile.id,legacyContract:binding.contract,requestDigest:binding.requestDigest}};
  } finally { await held.release(); }
}
export = { prepare, stateReader, operation, recoverClosed, closedRecoveryReader };
