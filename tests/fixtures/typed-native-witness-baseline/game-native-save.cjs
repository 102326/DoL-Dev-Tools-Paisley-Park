'use strict';
const {createHash}=require('node:crypto'),contracts=require('./game-contract.cjs'),profile=require('./game-native-save-profile.json');
const sha=s=>createHash('sha256').update(s).digest('hex');
const authorized=s=>require('./game-scope.cjs').validate(s)&&s.intents.includes('save');
// Save flags describe permitted gameplay, not the reviewed native owner inventory.
function flags(a,b){
  const valid=v=>typeof v?.autosaveDisabled==='boolean'&&typeof v.ironmanmode==='boolean'&&
    (typeof v.engineAutosave==='boolean'||Array.isArray(v.engineAutosave)&&v.engineAutosave.length<=32&&v.engineAutosave.every(t=>typeof t==='string'&&t.length<=128));
  const normalize=v=>({...v,autosaveDisabled:false,ironmanmode:false,engineAutosave:false});
  return valid(a)&&valid(b)&&JSON.stringify(normalize(a))===JSON.stringify(normalize(b));
}
// Browser-only, finite observer. Immutable Save/idb methods remain untouched.
function capture(namespace){
  const sc=window.SugarCube,idb=window.idb,state=sc?.State,onSave=sc?.Save?.onSave,onLoad=sc?.Save?.onLoad;
  if(!idb||idb.active!==true||!state||!(onSave?.handlers instanceof Set)||!(onLoad?.handlers instanceof Set))throw Error('Native save backend unavailable');
  const methods=Object.fromEntries(['saveState','getItem','getSaveDetails','deleteItem','loadState','setItem'].map(k=>{
    const d=Object.getOwnPropertyDescriptor(idb,k);if(typeof d?.value!=='function')throw Error('Native save owner unavailable');return[k,d.value];
  }));
  const marshal=Object.getOwnPropertyDescriptor(state,'marshalForSave')?.value,decoder=Object.getOwnPropertyDescriptor(state,'deltaDecode')?.value;
  const dbGetter=Object.getOwnPropertyDescriptor(idb,'dbName')?.get,proto=window.IDBObjectStore?.prototype,add=proto&&Object.getOwnPropertyDescriptor(proto,'add');
  if(typeof marshal!=='function'||typeof decoder!=='function'||typeof dbGetter!=='function'||!add||typeof add.value!=='function'||add.writable!==true||add.configurable!==true||
    Function.prototype.toString.call(add.value)!=='function add() { [native code] }')throw Error('Native save observation unavailable');
  const dbName=idb.dbName,saveHandlers=onSave.handlers,loadHandlers=onLoad.handlers,saveHooks=Array.from(saveHandlers),loadHooks=Array.from(loadHandlers);
  if(typeof dbName!=='string'||!dbName||dbName.length>128||saveHooks.length>16||loadHooks.length>16)throw Error('Native save inventory bound');
  let installed=false,clean=true,failed=false,wake=()=>{},timer,resolveExpiry;
  const expiry=new Promise(resolve=>{resolveExpiry=resolve});
  const expire=()=>{failed=true;restore();wake();resolveExpiry({ok:false,reason:'native-save-outcome-unavailable'})};
  const saves=[],transactions=new Map();
  const projection=data=>{const history=Array.isArray(data?.history)?data.history:Array.isArray(data?.delta)?Reflect.apply(decoder,state,[data.delta]):null,f=history?.[data?.index];
    if(!Number.isSafeInteger(f?.variables?.money)||!Number.isFinite(f?.variables?.timeStamp)||typeof f.title!=='string')throw Error('Native save projection unavailable');
    return {money:f.variables.money,time:f.variables.timeStamp,passage:f.title};};
  const hook=(save,kind)=>{try{
    if(saves.length>=8||kind?.type!=='autosave'||!Number.isSafeInteger(save?.date))throw Error('Unreviewed native save');
    saves.push({date:save.date,projection:projection(save.state)});wake();
  }catch{failed=true;wake()}};
  const observed=function(...args){
    try{const tx=this.transaction;if(tx?.db?.name===dbName&&tx.mode==='readwrite'){
      if(!['saves','details'].includes(this.name)||Array.from(tx.objectStoreNames).sort().join(',')!=='details,saves'||transactions.size>=8&&!transactions.has(tx))throw Error('Unreviewed native save transaction');
      let row=transactions.get(tx);if(!row){row={status:'pending',saves:0,details:0,date:null,projection:null,listeners:[]};transactions.set(tx,row);
        const listen=(event,callback)=>{row.listeners.push([event,callback]);tx.addEventListener(event,callback,{once:true})};
        listen('complete',()=>{row.status='complete';wake()});
        for(const event of ['abort','error'])listen(event,()=>{row.status='failed';failed=true;wake()});
      }
      const value=args[0];if(args.length!==1||value?.slot!==0)throw Error('Unreviewed native save slot');
      if(this.name==='saves'){row.saves++;row.projection=projection(value.data)}else{row.details++;row.date=value.data?.date}
    }}catch{failed=true;wake()}
    return Reflect.apply(add.value,this,args);
  };
  const sameHooks=(owner,expected,extra)=>{const now=Array.from(owner.handlers);return now.length===expected.length+(extra?1:0)&&expected.every((f,i)=>now[i]===f)&&(!extra||now.at(-1)===hook);};
  function check(){
    if(window.SugarCube!==sc||window.idb!==idb||idb.active!==true||idb.dbName!==dbName||sc.State!==state||
      Object.entries(methods).some(([k,f])=>Object.getOwnPropertyDescriptor(idb,k)?.value!==f)||
      Object.getOwnPropertyDescriptor(state,'marshalForSave')?.value!==marshal||Object.getOwnPropertyDescriptor(state,'deltaDecode')?.value!==decoder||
      Object.getOwnPropertyDescriptor(idb,'dbName')?.get!==dbGetter||onSave.handlers!==saveHandlers||onLoad.handlers!==loadHandlers||!sameHooks(onSave,saveHooks,installed)||!sameHooks(onLoad,loadHooks,false)||
      Object.getOwnPropertyDescriptor(proto,'add')?.value!==(installed?observed:add.value))return 'native-save-binding-changed';
  }
  function restore(){
    clearTimeout(timer);
    if(!installed)return clean;
    const current=Object.getOwnPropertyDescriptor(proto,'add');
    if(current?.value!==observed||current.writable!==add.writable||current.configurable!==add.configurable||current.enumerable!==add.enumerable)clean=false;
    else try{Object.defineProperty(proto,'add',add)}catch{clean=false}
    if(!Set.prototype.has.call(saveHandlers,hook)||!Set.prototype.delete.call(saveHandlers,hook))clean=false;
    for(const [tx,row] of transactions)for(const [event,callback] of row.listeners)try{tx.removeEventListener(event,callback)}catch{clean=false}
    installed=false;return clean;
  }
  return Object.freeze({
    metadata(){return {version:window.StartConfig?.version,methods:Object.fromEntries(Object.entries(methods).map(([k,f])=>[k,Function.prototype.toString.call(f)])),
      hooks:{onSave:saveHooks.map(f=>Function.prototype.toString.call(f)),onLoad:loadHooks.map(f=>Function.prototype.toString.call(f))},marshal:Function.prototype.toString.call(marshal),decoder:Function.prototype.toString.call(decoder),dbNameGetter:Function.prototype.toString.call(dbGetter)};},
    check,restore,
    install(){if(check()!==undefined||installed)throw Error('Native save binding changed');Object.defineProperty(proto,'add',{...add,value:observed});
      try{Set.prototype.add.call(saveHandlers,hook);installed=true;timer=setTimeout(expire,120000)}catch(error){Object.defineProperty(proto,'add',add);Set.prototype.delete.call(saveHandlers,hook);installed=false;throw error}},
    async finish(receipt,context,held){
      clearTimeout(timer);timer=setTimeout(expire,10000);
      const work=(async()=>{
      try{
        if(!installed||check()!==undefined||failed)throw Error('Native save observation failed');
        if(saves.length){const settled=await new Promise(resolve=>{let done=false;
          wake=()=>{if(!done&&(failed||transactions.size===saves.length&&Array.from(transactions.values()).every(r=>r.status!=='pending'))){done=true;resolve(!failed)}};wake();
        });wake=()=>{};if(!settled)throw Error('Native save transaction did not close');}
        if(transactions.size!==saves.length||check()!==undefined||failed)throw Error('Native save transaction mismatch');
        const rows=Array.from(transactions.values());
        if(rows.some((r,i)=>r.status!=='complete'||r.saves!==1||r.details!==1||r.date!==saves[i].date||JSON.stringify(r.projection)!==JSON.stringify(saves[i].projection)))throw Error('Native save transaction proof mismatch');
        if(saves.length){const [item,details]=await Promise.all([Reflect.apply(methods.getItem,idb,[0]),Reflect.apply(methods.getSaveDetails,idb,[])]),last=saves.at(-1);
          if(JSON.stringify(projection(item?.data))!==JSON.stringify(last.projection)||!Array.isArray(details)||details.find(r=>r.slot===0)?.data?.date!==last.date)throw Error('Native autosave readback mismatch');}
        if(failed||!installed||check()!==undefined||context.records[receipt.attemptId]!==held||window[namespace]!==context||!restore())throw Error('Native save observer ownership changed');
        const save=Object.freeze({kind:'native-idb-save',slot:0,count:saves.length,transactions:rows.length,committed:true,readBack:true});
        const terminal=Object.freeze({...receipt,evidence:Object.freeze({...receipt.evidence,save})});context.records[receipt.attemptId]=terminal;return {ok:true,receipt:terminal};
      }catch{return {ok:false,reason:'native-save-outcome-unavailable'}}finally{restore()}
      })();return Promise.race([work,expiry]);
    },
  });
}
async function bind(client,scope,objectGroup){
  if(!authorized(scope))return null;
  const result=await client.send('Runtime.evaluate',{expression:`(${capture.toString()})(${JSON.stringify(require('./game-receipts.cjs').namespace)})`,objectGroup,returnByValue:false});
  if(result.exceptionDetails||!result.result?.objectId)throw Error('Scoped native save observer unavailable');const objectId=result.result.objectId;
  const meta=await client.send('Runtime.callFunctionOn',{objectId,functionDeclaration:'function(){return this.metadata()}',returnByValue:true});const v=meta.result?.value;
  if(meta.exceptionDetails||!v||v.version!==profile.version||Object.entries(profile.methods).some(([k,h])=>sha(v.methods[k]||'')!==h)||sha(v.methods.setItem||'')!==profile.setItem||
    Object.entries(profile.hooks).some(([k,hs])=>!Array.isArray(v.hooks[k])||JSON.stringify(v.hooks[k].map(sha))!==JSON.stringify(hs))||sha(v.marshal||'')!==profile.marshal||sha(v.decoder||'')!==profile.decoder||v.dbNameGetter!==profile.dbNameGetter)throw Error('Scoped native save implementation not reviewed');
  const get=async expression=>{const r=await client.send('Runtime.evaluate',{expression,objectGroup,returnByValue:false});if(r.exceptionDetails||!r.result?.objectId)throw Error('Native save reference unavailable');return r.result.objectId};
  const save=await get('window.idb.saveState'),set=await contracts.captured(client,save,'setItem');
  if(!await contracts.sameObject(client,set,await get('window.idb.setItem'))||!await contracts.sameObject(client,await contracts.captured(client,save,'State','object',{maxResponseBytes:8*1024*1024}),await get('window.SugarCube.State')))throw Error('Native save captured owner changed');
  for(const key of ['makePromise','openDB'])if(sha(await contracts.functionSource(client,await contracts.captured(client,set,key)))!==profile[key])throw Error('Native save transaction implementation changed');
  return {objectId,digest:sha(JSON.stringify(profile)+capture.toString())};
}
function validateEvidence(v){return v&&Reflect.ownKeys(v).length===6&&Object.keys(v).every(k=>['kind','slot','count','transactions','committed','readBack'].includes(k))&&v.kind==='native-idb-save'&&v.slot===0&&Number.isSafeInteger(v.count)&&v.count>=0&&v.count<=8&&v.transactions===v.count&&v.committed===true&&v.readBack===true;}
function execution(source,index){
  return `return (async()=>{const nativeSaveWatch=observedInputs[${index}];try{return await (async()=>{${source}})()}finally{if(!nativeSaveWatch.restore())throw Error('Native save observer cleanup conflict')}})();`;
}
// Validate the new save witness separately, then reuse the original business projection.
function receipt(r,e){
  const contract=e?.executionBinding?.contract,hasSave=/-save-[a-f0-9]{12}$/.test(contract||'');
  if(!hasSave)return Object.hasOwn(r.evidence||{},'save')?null:{r,e};
  if(r.outcome==='occurred'&&(!r.remoteClosed||!validateEvidence(r.evidence?.save)))return null;
  const evidence=r.evidence?Object.fromEntries(Object.entries(r.evidence).filter(([k])=>k!=='save')):undefined;
  return {r:{...r,...(evidence?{evidence}:{})},e:{...e,executionBinding:{...e.executionBinding,contract:contract.replace(/-save-([a-f0-9]{12})$/,'-$1')}}};
}
module.exports={authorized,flags,capture,bind,validateEvidence,execution,receipt};
