'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
// Frozen project-owned pre-TS module. Resolve its existing sibling imports at
// the toolkit path; it is only a test oracle, never a production execution path.
const entry=path.resolve(__dirname,'../scripts/lib/action.cjs'),baseline=new Module(entry,module);
baseline.filename=entry;baseline.paths=Module._nodeModulePaths(path.dirname(entry));baseline._compile(fs.readFileSync(path.join(__dirname,'fixtures/typed-action-baseline/action.cjs'),'utf8'),entry);
const original=baseline.exports,current=require('../scripts/lib/action.cjs');
async function emitted(api,kind){
 const frames=[],client={async evaluate(expression){frames.push({expression});return {ok:true}},async send(method,params){frames.push({method,params});return {result:{value:{ok:true,receipt:{synthetic:true}}}}}};
 const ctx={options:{host:'chrome'},assertForeground:async()=>{},ensureWebview:async()=>client,client};
 let action={type:'web-click',selector:'#fixture'};
 if(kind!=='plain')ctx.webGuard={objectId:'root',source:'if(node!==observedRoot)return {ok:false,guardRejected:true};',arguments:[{objectId:'owned'}]};
 if(kind==='input')action={type:'web-input',selector:'#fixture',value:'synthetic'};
 if(['unreviewed','reviewed','invocation'].includes(kind)){const source='markOperationDispatch();return {ok:true,receipt:{synthetic:true}};';ctx.webGuard.operation=kind==='unreviewed'?{name:'fixture-operation',source}:api.reviewedOperation('fixture-operation',source)}
 if(kind==='invocation')ctx.webGuard.invocation={receiverId:'receiver',callableId:'callable'};
 const result=await api.execute(ctx,action);return {frames,result};
}
test('typed Action emits identical reviewed/ordinary browser sources and arguments to its fixed pre-TS oracle',async()=>{
 for(const kind of ['plain','input','unreviewed','reviewed','invocation'])assert.deepEqual(await emitted(current,kind),await emitted(original,kind),kind);
 assert.deepEqual(Reflect.ownKeys(current),Reflect.ownKeys(original));
});
