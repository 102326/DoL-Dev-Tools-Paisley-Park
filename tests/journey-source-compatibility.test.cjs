'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),vm=require('node:vm');
const entry=path.resolve(__dirname,'../scripts/lib/journey.cjs'),baseline=new Module(entry,module);
baseline.filename=entry;baseline.paths=Module._nodeModulePaths(path.dirname(entry));baseline._compile(fs.readFileSync(path.join(__dirname,'fixtures/typed-journey-baseline/journey.cjs'),'utf8'),entry);
const original=baseline.exports,current=require('../scripts/lib/journey.cjs'),plain=value=>JSON.parse(JSON.stringify(value));
test('DOM-only Journey wait probe retains the fixed original observations and exports',()=>{
 const node={isConnected:true,hidden:false,getBoundingClientRect:()=>({width:10,height:10})};
 for(const condition of ['exists','visible','hidden','absent'])for(const state of ['missing','ambiguous','visible','hidden','detached']){
  const item={...node,hidden:state==='hidden',isConnected:state!=='detached'},roots=state==='missing'?[]:state==='ambiguous'?[item,item]:[item];
  const context={document:{querySelectorAll:()=>roots},getComputedStyle:()=>({display:'block',visibility:'visible'})};
  const run=probe=>vm.runInNewContext(`(${probe.toString()})('main',${JSON.stringify(condition)})`,context);
  assert.deepEqual(plain(run(current.waitProbe)),plain(run(original.waitProbe)),condition+'/'+state);
 }
 assert.deepEqual(Reflect.ownKeys(current),Reflect.ownKeys(original));
 for(const plan of [{schemaVersion:1,steps:[{type:'wait',milliseconds:1}]},{schemaVersion:1,scope:'body',steps:[{type:'web-click',selector:'#fixture'},{type:'wait',selector:'#marker',condition:'exists',timeoutMs:100},{type:'checkpoint',capture:['dom','css','storage']}]}])assert.deepEqual(current.validate(plan),original.validate(plan));
});
