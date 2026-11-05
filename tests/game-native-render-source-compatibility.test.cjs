const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),{createHash}=require('node:crypto');
const entry=path.resolve(__dirname,'../scripts/lib/game-native-render-tasks.cjs'),baseline=new Module(entry,module);
baseline.filename=entry;baseline.paths=Module._nodeModulePaths(path.dirname(entry));baseline._compile(fs.readFileSync(path.join(__dirname,'fixtures/typed-render-baseline/game-native-render-tasks.cjs'),'utf8'),entry);
const original=baseline.exports,current=require('../scripts/lib/game-native-render-tasks.cjs'),contracts=require('../scripts/lib/game-contract.cjs');
const PINNED_LF_DIGEST='f796e657ba5fa87891932226fdbae629827405e15a3b77c51986dfcce55ed7ba';
const digest=api=>createHash('sha256').update(JSON.stringify(api.sources)+api.check.toString()+api.finish.toString()).digest('hex');
function sameSource(api){for(const key of ['check','finish'])assert.equal(api[key].toString(),original[key].toString());assert.equal(digest(api),digest(original))}
test('frozen browser functions retain exact source and existing render digest',()=>{
 sameSource(current);assert.equal(digest(current),PINNED_LF_DIGEST);assert.deepEqual(Object.keys(current),Object.keys(original));
 assert.throws(()=>sameSource({...current,check:current.check.bind(null)}));
 const crlf={exports:{}};require('node:vm').runInNewContext(fs.readFileSync(path.join(__dirname,'../scripts/lib/browser-abi/native-render-tasks.cjs'),'utf8').replace(/\r?\n/g,'\r\n'),{module:crlf});
 assert.notEqual(digest({...current,...crlf.exports}),PINNED_LF_DIGEST);
});
async function bind(api,mode){
 const source='function syntheticCleanup() {}',key='#timed-timers-cleanup',savedHash=api.sources[key],saved={member:contracts.member,captured:contracts.captured,sameObject:contracts.sameObject},frames=[];
 api.sources[key]=createHash('sha256').update(source).digest('hex');
 contracts.member=async()=> 'retained-function';contracts.captured=async(_c,_id,name)=>name==='prehistory'?'task0':'retained-timers';contracts.sameObject=async()=>true;
 const client={async send(method,params){frames.push({method,params});if(frames.length===1)return mode==='metadata-error'?{exceptionDetails:{}}:{result:{value:[{key,source}]}};if(frames.length===2)return mode==='bundle-error'?{result:{}}:{result:{objectId:'bundle'}};return {result:{type:mode==='preflight-error'?'string':'undefined'}}}};
 try{let binding,error;try{binding=await api.bind(client,Array.from({length:5},(_,i)=>({objectId:'task'+i})),'owned-group')}catch(e){error=e.message}return{frames,binding,error}}
 finally{api.sources[key]=savedHash;Object.assign(contracts,saved)}
}
test('typed render coordinator retains browser frames digest and rejected preflights',async()=>{
 for(const mode of ['success','metadata-error','bundle-error','preflight-error'])assert.deepEqual(await bind(current,mode),await bind(original,mode),mode);
});
