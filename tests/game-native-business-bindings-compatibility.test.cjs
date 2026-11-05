const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),{createHash}=require('node:crypto');
const entry=path.resolve(__dirname,'../scripts/lib/game-native-business-bindings.cjs'),baseline=new Module(entry,module);
baseline.filename=entry;baseline.paths=Module._nodeModulePaths(path.dirname(entry));baseline._compile(fs.readFileSync(path.join(__dirname,'fixtures/typed-business-bindings-baseline/game-native-business-bindings.cjs'),'utf8'),entry);
const original=baseline.exports,current=require('../scripts/lib/game-native-business-bindings.cjs'),hash=value=>createHash('sha256').update(value).digest('hex');
test('native business guard keeps the exact original LF function source used by operation contracts',()=>{
 assert.equal(current.checkBindings.toString(),original.checkBindings.toString());assert.equal(hash(current.checkBindings.toString()),'fec422f5a06931db10d8aa7c2c14e5f8363ec23b268346429e1074077c0c5e41');assert.deepEqual(Object.keys(current),Object.keys(original));
});
async function captured(api,mode){
 const source='function syntheticMoment() {}',frames=[];
 const properties={moment:{internalProperties:[{name:'[[Scopes]]',value:{objectId:'moment-scopes'}}]},'moment-scopes':{result:[{value:{description:'Closure (fixture)',objectId:'moment-closure'}}]},'moment-closure':{result:[{name:'State',value:{type:'object',objectId:'state'}}]},getter:{internalProperties:[{name:'[[Scopes]]',value:{objectId:'getter-scopes'}}]},'getter-scopes':{result:[{value:{description:'Closure (fixture)',objectId:'getter-closure'}}]},'getter-closure':{result:[{name:'_active',value:{type:'object',objectId:'active'}}]}};
 const client={async send(method,params,options){frames.push({method,params,options});
  if(method==='Runtime.evaluate')return{result:{type:'function',objectId:'moment'}};
  if(method==='Runtime.getProperties')return properties[params.objectId];
  assert.equal(method,'Runtime.callFunctionOn');const fn=params.functionDeclaration;
  if(fn.includes('Function.prototype.toString.call'))return {result:{value:params.objectId==='moment'?(mode==='changed-source'?'function changed() {}':source):'()=>_active.variables'}};
  if(fn.includes('return this===other'))return{result:{value:params.objectId===params.arguments[0].objectId}};
  if(fn.includes('Object.getOwnPropertyDescriptor'))return{result:{objectId:'getter'}};
  if(fn.includes('return (this.active)'))return{result:{objectId:'active'}};
  if(fn.includes('return Object.freeze({state:this'))return mode==='missing-bundle'?{result:{}}:{result:{objectId:'bundle'}};
  throw Error('Unexpected synthetic CDP call');
 }};
 let result,error;try{result=await api.bind(client,{objectGroup:'owned-group',objects:{state:'state'}},{widgets:{},functionMacros:{},functions:{updateMoment:{expr:'fixture.updateMoment',sha256:hash(source)}}},[])}catch(e){error=e.message}return {frames,result,error};
}
test('typed business binding emits the original protocol frames and rejects changed sources or missing bundles',async()=>{
 for(const mode of ['normal','changed-source','missing-bundle'])assert.deepEqual(await captured(current,mode),await captured(original,mode),mode);
});
