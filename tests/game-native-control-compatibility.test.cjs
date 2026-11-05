const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex'),copy=x=>JSON.parse(JSON.stringify(x));
function load(name,old,stubs={}){const entry=path.resolve(__dirname,'../scripts/lib/'+name+'.cjs'),m=new Module(entry,module);m.filename=entry;m.paths=Module._nodeModulePaths(path.dirname(entry));m.require=id=>Object.hasOwn(stubs,id)?stubs[id]:Module.prototype.require.call(m,id);m._compile(fs.readFileSync(old?path.join(__dirname,'fixtures/typed-native-control-baseline',name+'.cjs'):entry,'utf8'),entry);return m.exports}
const sources=require('../scripts/lib/game-native-navigation.cjs').sources,project=e=>({name:e.name,message:e.message,code:e.code,...(e.cause?{cause:project(e.cause)}:{}),...(e.errors?{errors:e.errors.map(project)}:{})});
test('native control reader keeps the original LF function text, digest and exports',()=>{const old=load('game-native-control',true),now=load('game-native-control',false);assert.deepEqual(Object.keys(now),Object.keys(old));assert.equal(now.clickReader.toString(),old.clickReader.toString());assert.equal(hash(now.clickReader.toString()),'b76bd7be310680c70a97166db9147891e36a23a0c8fae84bfd727abbd632e72b');assert.deepEqual(Object.keys(load('game-native-navigation',false)),Object.keys(load('game-native-navigation',true)))});
async function capture(kind,old,mode){
 const frames=[],isNavigation=kind==='navigation',preparing=isNavigation&&!mode.startsWith('attest-'),empty=mode==='null-callback';let compiled;
 const value=(type,objectId)=>({type,objectId});
 const bindings={shadow:{callback:mode==='missing-callback'?{type:'undefined'}:empty?{type:'object',subtype:'null',value:null}:value('function','callback'),startCallback:{type:'undefined'},doneCallback:isNavigation?value('function','done'):mode==='tail'?value('function','done'):{type:'undefined'}},done:{passage:{type:'string',value:'SyntheticDestination'}}};
 const stubs={
  'node:crypto':{...crypto,randomUUID:()=> '12345678-1234-4123-8123-123456789abc',createHash:()=>({update(x){this.value=x;return this},digest(){return sources[this.value]||hash(this.value)}})},
  './game-contract.cjs':{
   async functionSource(client,id){frames.push({functionSource:id});return id==='compiled'?compiled:mode==='source-changed'||mode==='cleanup-failure'?'changed source':id},
   async captured(client,id,name,type,limit){frames.push({captured:{id,name,type,limit}});if(name==='fn')return id==='click'?(isNavigation?'once':'shadow'):'shadow';return {shadowContext:'context',shadowStore:'store',Wikifier:'wikifier',State:'state',Engine:'engine',doneCallback:'done'}[name]||name},
   async member(client,id,expression,group){frames.push({member:{id,expression,group}});return id==='node'?'click':'play'},
   async sameObject(){return mode!=='alias-changed'},
  },
  './game-native-history.cjs':{async bind(){return 'history'},checkHistory:function syntheticHistory(){return {ok:true}},sources:{synthetic:'history-source'}},
  './game-receipts.cjs':{namespace:'synthetic-receipts',async context(){return 'fixture-nonce'}},
  './game-native-save.cjs':{async bind(){return mode==='save'?{objectId:'save-watch',digest:'a'.repeat(64)}:null},execution(source,index){return 'synthetic save '+index+'\n'+source}},
  './game-native-render-tasks.cjs':{async bind(){return {objectId:'tasks',digest:'b'.repeat(64)}}},
 };
 const client={async evaluate(expression){frames.push({expression});return undefined},async send(method,params,options){frames.push({method,params,options});
  if(method==='Runtime.evaluate'){if(params.expression.startsWith('(function(nativeEnvPhase')){compiled=params.expression.slice(1,-1);return mode==='compile-failure'?{exceptionDetails:{}}:{result:{type:'function',objectId:'compiled'}}}return{result:{objectId:params.expression.includes('querySelectorAll')?'node':params.expression.endsWith('.Engine')?'engine':params.expression.endsWith('.State')?'state':params.expression.endsWith('.Wikifier')?'wikifier':'jq'}}}
  if(method==='Runtime.getProperties'){
   if(params.objectId.endsWith('-scopes'))return {result:[{value:{description:'Closure (synthetic)',objectId:params.objectId.replace('-scopes','-values')}}]};
   if(params.objectId.endsWith('-values')){const rows=Object.entries(bindings[params.objectId.replace('-values','')]||{}).map(([name,value])=>({name,value}));if(mode==='duplicate-binding'&&params.objectId==='shadow-values')rows.push({name:'callback',value:value('function','callback')});return{result:rows}}
   return{internalProperties:[{name:'[[Scopes]]',value:{objectId:params.objectId+'-scopes'}}]};
  }
  if(method==='Runtime.callFunctionOn'){
   if(params.functionDeclaration.includes('ctx.payload'))return mode==='context-missing'?{result:{value:null}}:{result:{value:{passage:'SyntheticRoom',turns:1,time:42,money:100,payload:empty?'':'synthetic payload',shadowKeys:['_args']}}};
   return{result:{value:mode!=='populated-tasks'}};
  }
  if(method==='Runtime.releaseObjectGroup'){if(mode==='cleanup-failure')throw Error('synthetic cleanup');return{}}
  throw Error('Unexpected synthetic method');
 }};
 const nav=load('game-native-navigation',old,stubs),api=isNavigation?nav:load('game-native-control',old,{...stubs,'./game-native-navigation.cjs':nav});
 const descriptor={kind:isNavigation?'navigation':'menu',selected:{type:'web-click',selector:'#synthetic'},...(isNavigation?{destination:'SyntheticDestination'}:{})};
 const environment={terminalReviewed:true,id:'synthetic-environment',guard:'return undefined;',arguments:[],objects:{jq:'jq',footer:'footer'}};
 if(mode==='bad-arguments')environment.arguments=[{objectId:'id',value:0}];if(mode==='monitor')Object.assign(environment,{arguments:[{objectId:'monitor'}],monitorIndex:0,monitorDigest:'c'.repeat(64)});if(mode==='scene')environment.sceneEpochSha256='d'.repeat(64);
 let result,error;try{result=preparing?await api.prepare(client,descriptor,{},'12345678-1234-4123-8123-123456789abc',async()=>environment):await api.attest(client,descriptor);if(!preparing){await result.release();await result.release()}}catch(e){error=project(e)}return copy({frames,result,error});
}
test('native control attestation preserves full source/closure/owner and cleanup frames',async()=>{for(const mode of ['normal','tail','missing-callback','duplicate-binding','source-changed','alias-changed','context-missing','cleanup-failure']){const now=await capture('control',false,mode);assert.deepEqual(now,await capture('control',true,mode),mode);assert.equal(!!now.result,mode==='normal',mode)}});
test('native navigation preserves full preparation sources, contract identities and cleanup frames',async()=>{for(const mode of ['normal','attest-normal','null-callback','save','monitor','scene','populated-tasks','bad-arguments','missing-callback','duplicate-binding','source-changed','alias-changed','context-missing','compile-failure','cleanup-failure']){const now=await capture('navigation',false,mode);assert.deepEqual(now,await capture('navigation',true,mode),mode);assert.equal(!!now.result,['normal','attest-normal','null-callback','save','monitor','scene','populated-tasks'].includes(mode),mode)}});
