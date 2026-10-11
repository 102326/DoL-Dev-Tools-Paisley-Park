'use strict';
// Reviewed DoL 0.5.12.13 IndexedDB Recipe; uses native transactions, not Save's boolean ack.
async function read(inputs){
 if(inputs.gameVersion!=='0.5.12.13'||window.StartConfig?.version!==inputs.gameVersion||!Number.isSafeInteger(inputs.slot)||inputs.slot<0||inputs.slot>8||
    typeof inputs.trial!=='string'||!/^[A-Za-z0-9._-]{1,64}$/.test(inputs.trial)||(!/^[a-f0-9]{64}$/.test(inputs.apiDigest||'')||!/^[a-f0-9]{64}$/.test(inputs.decoderDigest||'')||!/^[a-f0-9]{64}$/.test(inputs.marshalDigest||'')))throw Error('Invalid native save trial');
 const sc=window.SugarCube,idb=window.idb,state=sc?.State;
 if(idb?.active!==true||!Number.isSafeInteger(state?.variables?.money)||!Number.isFinite(state.variables.timeStamp)||typeof state.passage!=='string')throw Error('Native IndexedDB/state unavailable');
 const hash=async value=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(value))))).map(n=>n.toString(16).padStart(2,'0')).join('');
 const sources=Object.fromEntries(['saveState','getItem','getSaveDetails','deleteItem','loadState'].map(k=>{const d=Object.getOwnPropertyDescriptor(idb,k);if(typeof d?.value!=='function')throw Error('Native save method changed');return[k,Function.prototype.toString.call(d.value)]}));
 const hooks=Object.fromEntries(['onSave','onLoad'].map(k=>[k,Array.from(sc.Save[k].handlers).map(f=>Function.prototype.toString.call(f))]));
 if(await hash({sources,hooks})!==inputs.apiDigest)throw Error('Native save implementation changed');
 const marshaller=Object.getOwnPropertyDescriptor(state,'marshalForSave')?.value;if(typeof marshaller!=='function'||await hash(Function.prototype.toString.call(marshaller))!==inputs.marshalDigest||Object.getOwnPropertyDescriptor(state,'marshalForSave')?.value!==marshaller)throw Error('Native save marshaller changed');
 const projected=Reflect.apply(marshaller,state,[]),frame=projected?.history?.[projected.index];if(!Number.isSafeInteger(frame?.variables?.money)||!Number.isFinite(frame?.variables?.timeStamp)||typeof frame.title!=='string')throw Error('Native save projection unavailable');
 const [item,details]=await Promise.all([idb.getItem(inputs.slot),idb.getSaveDetails()]);
 if(!Array.isArray(details))throw Error('Native save metadata unavailable');
 const detail=details.find(d=>d.slot===inputs.slot),index=item?.data?.index;
 const decoder=Object.getOwnPropertyDescriptor(state,'deltaDecode')?.value;
 if(typeof decoder!=='function'||await hash(Function.prototype.toString.call(decoder))!==inputs.decoderDigest||Object.getOwnPropertyDescriptor(state,'deltaDecode')?.value!==decoder)throw Error('Native save decoder changed');
 const history=Array.isArray(item?.data?.history)?item.data.history:Array.isArray(item?.data?.delta)?Reflect.apply(decoder,state,[item.data.delta]):null;
 if(item!==undefined&&item!==null&&(!Array.isArray(history)||!Number.isSafeInteger(index)||!history[index]?.variables))throw Error('Native save data shape changed');
 const v=history?.[index]?.variables;
 return {backend:'idb',slot:inputs.slot,exists:!!item,record:!!item?await hash(item):null,metadata:detail?.data?.metadata?.paisleyTrial??null,
  slotMoney:v?.money??null,slotTime:v?.timeStamp??null,slotPassage:history?.[index]?.title??null,
  marshalMoney:frame.variables.money,marshalTime:frame.variables.timeStamp,marshalPassage:frame.title,
  money:state.variables.money,time:state.variables.timeStamp,passage:state.passage,turns:state.turns,
  apiDigest:inputs.apiDigest,autoSaveDisabled:state.variables.options?.autosaveDisabled===true,ironman:state.variables.ironmanmode===true};
}
async function execute(inputs){
 const owner=window.idb,sc=window.SugarCube,methods=['saveState','getItem','getSaveDetails','deleteItem','loadState'],refs={};
 const sources=Object.fromEntries(methods.map(k=>{const f=Object.getOwnPropertyDescriptor(owner,k)?.value;if(typeof f!=='function')throw Error('Native save method changed');refs[k]=f;return[k,Function.prototype.toString.call(f)]}));
 const callbackRefs=Object.fromEntries(['onSave','onLoad'].map(k=>[k,Array.from(sc.Save[k].handlers)]));
 const hooks=Object.fromEntries(Object.entries(callbackRefs).map(([k,v])=>[k,v.map(f=>Function.prototype.toString.call(f))]));
 const digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify({sources,hooks}))))).map(n=>n.toString(16).padStart(2,'0')).join('');
 if(owner!==window.idb||owner.active!==true||digest!==inputs.apiDigest||methods.some(k=>Object.getOwnPropertyDescriptor(owner,k)?.value!==refs[k])||
    Object.entries(callbackRefs).some(([k,v])=>{const current=Array.from(sc.Save[k].handlers);return v.length!==current.length||v.some((f,i)=>f!==current[i])}))throw Error('Native save binding changed before invocation');
 const method={save:'saveState',load:'loadState',delete:'deleteItem'}[inputs.operation];if(!method)throw Error('Invalid save operation');
 // The native Promise is awaited; the subsequent native read is independent business proof.
 await Reflect.apply(refs[method],owner,inputs.operation==='save'?[inputs.slot,'Paisley Park scoped test',{paisleyTrial:inputs.trial}]:[inputs.slot]);
}
// All serialized functions are self-contained; do not close over Node helpers.
module.exports={schemaVersion:1,operations:[
 {id:'save-slot',label:'Create or overwrite the scoped native test slot',intent:'save',read,quote:(_b,i)=>i.operation==='save'?0:null,execute,
 outcome:(b,a,i)=>({occurred:a.exists&&(a.record!==b.record||a.metadata!==b.metadata)&&a.metadata===i.trial&&a.slotMoney===b.marshalMoney&&a.slotTime===b.marshalTime&&a.slotPassage===b.marshalPassage&&
   a.money===b.money&&a.time===b.time&&a.passage===b.passage&&a.turns===b.turns,spent:0})},
 {id:'delete-slot',label:'Delete the scoped native test slot',intent:'delete-save',read,quote:(b,i)=>i.operation==='delete'&&b.exists?0:null,execute,
 outcome:(b,a)=>({occurred:b.exists&&!a.exists&&a.metadata===null&&a.money===b.money&&a.time===b.time&&a.passage===b.passage&&a.turns===b.turns,spent:0})},
 {id:'load-slot',label:'Load the scoped native test slot',intent:'load-save',sceneTransition:'passage',read,quote:(b,i)=>i.operation==='load'&&b.exists?0:null,execute,
 outcome:(b,a)=>({occurred:b.exists&&a.exists&&a.record===b.record&&a.money===b.slotMoney&&a.time===b.slotTime&&a.passage===b.slotPassage,spent:0})},
]};


