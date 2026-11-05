'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.env.PAISLEY_TOOL_ROOT||path.join(__dirname,'../../..'));
const pc=require(root+'/scripts/lib/pc-session.cjs'),{ChromeHost}=require(root+'/scripts/lib/chrome-host.cjs'),save=require(root+'/scripts/lib/game-native-save.cjs');
const [chrome,outArg,option]=process.argv.slice(2),out=path.resolve(outArg||'');let instance,client;
const report={schemaVersion:1,node:process.version,platform:process.platform,scope:'Real Chrome IndexedDB and frozen observer with self-authored storage owners; no game save/profile or real Ledger acceptance',checks:[],observerCleanup:'not-observed'};
async function runSyntheticSave(capture,failRestore){
 const checks=[],original=Object.getOwnPropertyDescriptor(IDBObjectStore.prototype,'add');
 const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('owned-neutral-save-fixture',1);request.onupgradeneeded=()=>{request.result.createObjectStore('saves',{keyPath:'slot'});request.result.createObjectStore('details',{keyPath:'slot'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Synthetic database unavailable'))});
 const read=(store,all=false)=>new Promise((resolve,reject)=>{const request=db.transaction([store],'readonly').objectStore(store)[all?'getAll':'get'](...(all?[]:[0]));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(Error('Synthetic readback unavailable'))});
 const onSave={handlers:new Set()},onLoad={handlers:new Set()},state={marshalForSave(){},deltaDecode(delta){return delta}};
 window.SugarCube={State:state,Save:{onSave,onLoad}};window.syntheticBusinessCalls=0;
 const idb={active:true,saveState(){},setItem(){},deleteItem(){},loadState(){},getItem(){return read('saves')},getSaveDetails(){return read('details',true)}};
 Object.defineProperty(idb,'dbName',{get(){return 'owned-neutral-save-fixture'}});window.idb=idb;window.StartConfig={version:'synthetic'};
 let active;
 try{
  for(const mode of ['abort','commit','empty']){
   const context={records:Object.create(null)},held=Object.freeze({status:'started'});context.records[mode]=held;window.__PaisleySyntheticSave=context;
   const watcher=active=capture('__PaisleySyntheticSave');if(watcher.check()!==undefined)throw Error('Synthetic owner check failed');watcher.install();
   if(mode!=='empty'){
    const archive={index:0,history:[{title:'SyntheticSaveRoom',variables:{money:100,timeStamp:42}}]},date=123;
    for(const hook of onSave.handlers)hook({date,state:archive},{type:'autosave'});
    const tx=db.transaction(['saves','details'],'readwrite');tx.objectStore('saves').add({slot:0,data:archive});tx.objectStore('details').add({slot:0,data:{date}});if(mode==='abort')tx.abort();if(failRestore&&mode==='abort'){Object.defineProperty(IDBObjectStore.prototype,'add',{...original,value:function foreignOwnedAdd(){}});window.__PaisleySaveFaultInjected=true;}
   }
   const result=await watcher.finish({attemptId:mode,status:'terminal',evidence:{kind:'synthetic-business'}},context,held);
   if(mode==='abort'){
    if(result.ok!==false||context.records[mode]!==held||(await read('saves'))!==undefined)throw Error('Aborted transaction changed its pending record');checks.push('actual aborted IndexedDB writes retain the exact synthetic pending record and roll back storage');
   }else{
    const count=mode==='commit'?1:0,witness=result.receipt?.evidence?.save;
    if(!result.ok||witness?.count!==count||witness.transactions!==count||witness.committed!==true||witness.readBack!==true||context.records[mode]!==result.receipt)throw Error('Synthetic observer witness mismatch');
    if(mode==='commit'){const row=await read('saves');if(row.data.history[0].variables.money!==100)throw Error('Independent actual database read mismatch');checks.push('real transaction completion and independent stored data readback produce the one-write witness')}
    else checks.push('no-write completion records zero observed transactions without inventing another save');
   }
   const current=Object.getOwnPropertyDescriptor(IDBObjectStore.prototype,'add');if(current.value!==original.value||['writable','enumerable','configurable'].some(k=>current[k]!==original[k])||onSave.handlers.size!==0||onLoad.handlers.size!==0)throw Error('Original observer owners not restored');active=null;
  }
  checks.push('every outcome restores the native add descriptor and original hook tables');if(window.syntheticBusinessCalls!==0)throw Error('Unexpected business invocation');checks.push('the synthetic business counter remains zero while only fixture-owned storage is written');return checks;
 }finally{try{if(active&&!active.restore())throw Error('Synthetic observer cleanup conflict')}finally{db.close()}}
}
async function main(){if(!chrome||!outArg||option!==undefined&&option!=='--fault-restore')throw Error('Usage: save-observer-verify.cjs ABS_CHROME NEW_OUTPUT [--fault-restore]');fs.mkdirSync(out,{mode:0o700});instance=await pc.start({file:path.join(__dirname,'save-fixture.html'),chrome,port:'18782',mode:'headless',out:path.join(out,'instance')});client=await new ChromeHost(instance.record.target).open();report.observerCleanup='unconfirmed';const checks=await client.evaluate('('+runSyntheticSave.toString()+')('+save.capture.toString()+','+(option==='--fault-restore')+')');assert.ok(Array.isArray(checks)&&checks.length===5);report.checks=checks;report.observerCleanup='confirmed';report.status='passed'}
main().catch(async error=>{if(option==='--fault-restore'&&client){try{report.faultInjectionObserved=await client.evaluate('window.__PaisleySaveFaultInjected===true')}catch{report.faultInjectionObserved=false}}report.status='failed';report.failure=typeof error?.code==='string'&&/^[A-Z_]{1,64}$/.test(error.code)?error.code:'SAVE_OBSERVER_FIXTURE_FAILED';if(fs.existsSync(out))fs.writeFileSync(path.join(out,'failure-local.log'),String(error?.stack||error),{flag:'wx',mode:0o600});process.exitCode=1}).finally(async()=>{client?.close();if(instance){try{await instance.stop();report.browserCleanup='confirmed'}catch{report.browserCleanup='unconfirmed';process.exitCode=1}}else report.browserCleanup='not-observed';report.cleanup=report.browserCleanup==='confirmed'&&report.observerCleanup==='confirmed'?'confirmed':report.browserCleanup==='not-observed'&&report.observerCleanup==='not-observed'?'not-observed':'unconfirmed';if(outArg&&fs.existsSync(out))fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report))});
