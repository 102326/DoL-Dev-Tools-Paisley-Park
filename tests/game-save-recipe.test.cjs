'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),{createHash,webcrypto}=require('node:crypto');
const recipe=require('../docs/recipes/dol-save-state.cjs'),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
function realm(){
 const state={passage:'Bedroom',turns:2,variables:{money:500,timeStamp:60,options:{autosaveDisabled:false},ironmanmode:false}},records=new Map(),details=new Map();let release=null,calls=0,ackOnly=false,entered=[];
 const idb={active:true,
  async saveState(slot,_title,metadata){calls++;for(const r of entered.splice(0))r();if(ackOnly)return true;await new Promise(resolve=>{release=resolve});records.set(slot,{slot,data:{index:0,history:[{title:state.passage,variables:{money:state.variables.money,timeStamp:state.variables.timeStamp}}]}});details.set(slot,{slot,data:{metadata}});return true},
  async getItem(slot){return records.get(slot)},async getSaveDetails(){return [...details.values()]},async deleteItem(slot){records.delete(slot);details.delete(slot)},
  async loadState(slot){const row=records.get(slot),saved=row.data.history[row.data.index];state.variables.money=saved.variables.money;state.variables.timeStamp=saved.variables.timeStamp;state.passage=saved.title;state.turns++},
 };
 const window={StartConfig:{version:'0.5.12.13'},idb,SugarCube:{State:state,Save:{onSave:{handlers:[]},onLoad:{handlers:[]}}}},context={window,crypto:webcrypto,TextEncoder};
 const inputs={gameVersion:'0.5.12.13',slot:1,trial:'save-test',operation:'save',apiDigest:hash({sources:Object.fromEntries(['saveState','getItem','getSaveDetails','deleteItem','loadState'].map(k=>[k,idb[k].toString()])),hooks:{onSave:[],onLoad:[]}})};
 const functions=o=>Object.fromEntries(['read','quote','execute','outcome'].map(k=>[k,vm.runInNewContext('('+o[k].toString()+')',context)]));
 return {state,idb,context,inputs,functions,records,get calls(){return calls},entered(){return new Promise(r=>entered.push(r))},release(){release()},ackOnly(){ackOnly=true}};
}
test('native save Recipe awaits the write, proves native state/metadata, then supports overwrite/delete/load without disabling autosave',async()=>{
 const f=realm(),save=f.functions(recipe.operations[0]),before=await save.read(f.inputs);assert.equal(before.exists,false);assert.equal(save.quote(before,f.inputs),0);assert.equal(save.quote(before,{...f.inputs,operation:'load'}),null);
 const started=f.entered(),writing=save.execute(f.inputs);await started;assert.equal(f.calls,1);assert.equal((await save.read(f.inputs)).exists,false);f.release();await writing;
 const after=await save.read(f.inputs);assert.equal(save.outcome(before,after,f.inputs).occurred,true);assert.equal(after.autoSaveDisabled,false);assert.equal(after.slotMoney,500);
 const second={...f.inputs,trial:'save-overwrite'},startedAgain=f.entered(),overwriting=save.execute(second);await startedAgain;f.release();await overwriting;
 assert.equal(save.outcome(after,await save.read(second),second).occurred,true);
 f.state.variables.money=1;f.state.variables.timeStamp=100;f.state.passage='Orphanage';
 const load=f.functions(recipe.operations[2]),loadInputs={...second,operation:'load'},loadBefore=await load.read(loadInputs);await load.execute(loadInputs);
 assert.equal(load.outcome(loadBefore,await load.read(loadInputs),loadInputs).occurred,true);assert.equal(f.state.variables.money,500);
 const remove=f.functions(recipe.operations[1]),removeInputs={...second,operation:'delete'},deleteBefore=await remove.read(removeInputs);await remove.execute(removeInputs);
 assert.equal(remove.outcome(deleteBefore,await remove.read(removeInputs),removeInputs).occurred,true);assert.equal(remove.quote(await remove.read(removeInputs),removeInputs),null);
});
test('native acknowledgement without stored data never produces successful save Outcome',async()=>{
 const f=realm(),save=f.functions(recipe.operations[0]),before=await save.read(f.inputs);f.ackOnly();await save.execute(f.inputs);
 assert.equal(save.outcome(before,await save.read(f.inputs),f.inputs).occurred,false);
});
test('changed native binding at the async digest boundary refuses invocation; mismatched version/shape cannot claim support',async()=>{
 const f=realm(),save=f.functions(recipe.operations[0]);await assert.rejects(save.read({...f.inputs,gameVersion:'other'}),/Invalid native/);
 f.context.crypto={subtle:{async digest(...args){const result=await webcrypto.subtle.digest(...args);f.idb.saveState=async function replaced(){throw Error('Must not execute')};return result}}};
 await assert.rejects(save.execute(f.inputs),/binding changed/);assert.equal(f.calls,0);
});
test('project discovery omits explicitly unavailable null quotes without marking a valid Recipe failed',async()=>{
 const f=realm(),scope={workspace:require('node:path').resolve(__dirname,'..'),serial:'test',package:'com.example.game',userId:'0',signingHash:'a11ce',intents:['save','delete-save','load-save'],dataDomain:'app-user-data'};
 const goal={kind:'project-experiment',recipe:require('node:path').resolve(__dirname,'../docs/recipes/dol-save-state.cjs'),scope,predicate:{kind:'native-state',conditions:[{field:'money',op:'gte',value:0}]},inputs:f.inputs};
 const result=await require('../scripts/lib/game-project-provider.cjs').observe({evaluate:source=>vm.runInNewContext(source,f.context)},goal);
 assert.equal(result.project.status,'available');assert.deepEqual(result.project.operations.map(o=>o.operation),['save-slot']);
});
