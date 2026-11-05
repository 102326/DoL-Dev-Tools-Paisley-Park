'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
function load(name,old){
 const file=path.resolve(__dirname,'../scripts/lib',name+'.cjs');
 if(!old)return require(file);
 const m=new Module(file,module);m.filename=file;m.paths=Module._nodeModulePaths(path.dirname(file));
 m._compile(fs.readFileSync(path.join(__dirname,'fixtures/typed-domain-provider-baseline',name+'.cjs'),'utf8'),file);return m.exports;
}
const current=load('game-clothing-provider',false),legacy=load('game-clothing-provider',true);
const project=load('game-project-provider',false),oldProject=load('game-project-provider',true);
const result=fn=>{try{return {value:fn()}}catch(e){return {error:{name:e.name,message:e.message,code:e.code}}}};
const goal={kind:'purchase-one',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',baselineMoney:1000,baselineCount:0,unitCost:500,maxSpend:500};
const shop={status:'available',variable:'hairpin',colour:'black',accessoryColour:'black',money:1000,count:0,wornCount:0,cost:500,quantity:1,destination:'wardrobe',space:2};
test('domain providers preserve exports and old input, candidate and receipt behavior',()=>{
 assert.deepEqual(Object.keys(current),Object.keys(legacy));assert.deepEqual(Object.keys(project),Object.keys(oldProject));
 for(const input of [null,undefined,{},[],goal,{...goal,unitCost:-1},{kind:'equip-matching',slot:'head',colour:'black'}]){
  for(const method of ['supportsGoal','validateGoal'])assert.deepEqual(result(()=>current[method](input)),result(()=>legacy[method](input)));
  for(const method of ['supportsGoal','validateGoal','validateRequest'])assert.deepEqual(result(()=>project[method](input)),result(()=>oldProject[method](input)));
 }
 for(const state of [shop,{...shop,quantity:2},{...shop,cost:501},null])assert.deepEqual(result(()=>current.candidates({},1,null,state,goal)),result(()=>legacy.candidates({},1,null,state,goal)));
 for(const receipt of [{outcome:'unknown'},{outcome:'occurred',remoteClosed:true,spent:0},{}]){
  const effect={action:{selected:{type:'project-experiment',operation:'x'}},executionBinding:{provider:'project-experiment',contract:'project-recipe-v1'}};
  assert.deepEqual(result(()=>project.validateReceipt(receipt,effect)),result(()=>oldProject.validateReceipt(receipt,effect)));
 }
});
