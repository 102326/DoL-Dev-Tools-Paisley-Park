const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const current=require('../scripts/lib/environment.cjs'),old=require('./fixtures/typed-environment-baseline/environment.cjs');
function observe(module,kind){
 const names=kind==='many'?Array.from({length:301},(_,i)=>'Synthetic'+i):kind==='duplicates'?['Synthetic','Synthetic',null,'bad/name']:['GameVersion','Synthetic'];
 const utils={version:kind==='invalid-version'?'private / metadata':()=> '2.0.0',getModListNameNoAlias:()=>{if(kind==='list-error')throw Error('synthetic');return kind==='invalid-list'?{}:names},getMod:name=>({version:name==='GameVersion'?'1.2.3':'2.3.4'})};
 const window={modUtils:kind==='no-loader'?undefined:utils,StartConfig:kind==='fallback'?undefined:{version:'1.0.0'},get V(){throw Error('private state must not be read')}};
 return JSON.parse(JSON.stringify(vm.runInNewContext(`(${module.snapshot.toString()})()`,{window,innerWidth:800,innerHeight:600,devicePixelRatio:1})));
}
test('environment DOM-only emission preserves fixed public metadata observations',()=>{
 assert.deepEqual(Object.keys(current),Object.keys(old));
 for(const kind of ['normal','many','duplicates','invalid-version','list-error','invalid-list','no-loader','fallback']){
  const actual=observe(current,kind),expected=observe(old,kind);assert.deepEqual(actual,expected,kind);
  const data={schemaVersion:1,source:'Chrome environment',browser:{product:'Chrome/1.0',protocolVersion:'1.3',jsVersion:'1.0'},runtime:actual};
  assert.deepEqual(current.contract(data),old.contract(data),kind);assert.deepEqual(current.diff(data,data),old.diff(data,data),kind);
 }
});
test('environment contract retains lazy runtime getter reads after earlier validation',()=>{
 const runtime=observe(current,'normal');
 const run=(module,invalid)=>{let reads=0;const data={schemaVersion:1,source:'Chrome environment',browser:invalid?null:{product:'Chrome/1.0',protocolVersion:'1.3',jsVersion:'1.0'},get runtime(){reads++;return runtime}};let result,error;try{result=module.contract(data)}catch(e){error=e.message}return{reads,result,error}};
 for(const invalid of [false,true])assert.deepEqual(run(current,invalid),run(old,invalid));
 assert.equal(run(current,true).reads,0);
});
