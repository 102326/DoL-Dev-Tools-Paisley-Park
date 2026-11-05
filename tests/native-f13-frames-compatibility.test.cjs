const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createRequire}=require('node:module');
const base=path.join(__dirname,'../scripts/lib'),nativeRequire=createRequire(path.join(base,'game-native-time.cjs'));
const sourceDir=process.env.F13_NODE_DIR||base;
const digest='a'.repeat(64);
function load(file,overrides){
 const module={exports:{}};
 const require=name=>Object.hasOwn(overrides,name)?overrides[name]:nativeRequire(name);
 vm.runInNewContext('(function(require,module){'+fs.readFileSync(file,'utf8')+'\n})',{})(require,module);
 return module.exports;
}
const crypto={createHash:()=>({update(){return this},digest(){return digest}})};
function generic(file){
 const frames=[],client={async send(method,params){frames.push({method,params});if(method==='Runtime.evaluate')return{result:{objectId:'handler'}};
  if(params.functionDeclaration.startsWith('function(){const text='))return{result:{value:'effects-source'}};
  if(params.functionDeclaration.startsWith('function(destination'))return{result:{objectId:'epoch'}};
  return{result:{value:{destination:'Target',text:'text',tags:'[]'}}};}};
 const contracts={functionSource:async(_client,id)=>id==='getter'?'()=>_active.variables':'effects-source',captured:async()=> 'effects',member:async()=> 'getter'};
 const environment={bind:async()=>({id:'before',terminalReviewed:true,arguments:[{objectId:'environment'}],objects:{jq:'jq',footer:'footer'},guard:'return undefined;'})};
 const module=load(file,{'node:crypto':crypto,'./game-contract.cjs':contracts,'./game-native-environment.cjs':environment,'./game-native-intro-profile.json':{handlerSha256:{effects:digest},effectsSha256:digest}});
 return {frames,result:module.review(client,{objectGroup:'owned',objects:{state:'state'},before:{passage:'Start'},destination:'Target'})};
}
function time(file,minutes,allowHourCrossing){
 const frames=[],client={async send(method,params){frames.push({method,params});if(method==='Runtime.evaluate')return {result:{objectId:'eval-'+frames.length}};
  if(params.functionDeclaration==='function(){return this.metadata()}')return{result:{value:[{name:'one',source:'source'}]}};
  if(params.functionDeclaration==='function(){return this.preflight()??null}')return{result:{value:null}};
  return {result:{objectId:'call-'+frames.length}};}};
 const contracts={captured:async(_client,_id,name)=>'capture-'+name,member:async()=> 'member',sameObject:async()=>true};
 const module=load(file,{'node:crypto':crypto,'./game-contract.cjs':contracts,'./game-native-time-profile.json':{functions:[{name:'one',sha256:digest}],hourFunctions:[]}});
 return {frames,result:module.bind(client,{objectGroup:'owned'},{minutes,allowHourCrossing})};
}
for(const name of ['generic-landing','time'])test(`${name} coordinator matches legacy RPC frames and result`,async()=>{
 const original=path.join(__dirname,'fixtures/typed-native-f13-baseline',`game-native-${name}.cjs`),current=path.join(sourceDir,`game-native-${name}.cjs`);
 for(const options of name==='time'?[[1,false],[30,true]]:[[1,false]]){
  const before=name==='time'?time(original,...options):generic(original),after=name==='time'?time(current,...options):generic(current);
  assert.deepEqual(JSON.parse(JSON.stringify(await after.result)),JSON.parse(JSON.stringify(await before.result)));
  assert.deepEqual(JSON.parse(JSON.stringify(after.frames)),JSON.parse(JSON.stringify(before.frames)));
 }
});
