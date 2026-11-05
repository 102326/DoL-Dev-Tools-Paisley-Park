const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),{createHash}=require('node:crypto');
const hash=value=>createHash('sha256').update(value).digest('hex');
function load(name,old,stubs={}){
 const entry=path.resolve(__dirname,'../scripts/lib/'+name+'.cjs'),loaded=new Module(entry,module);loaded.filename=entry;loaded.paths=Module._nodeModulePaths(path.dirname(entry));
 loaded.require=id=>Object.hasOwn(stubs,id)?stubs[id]:Module.prototype.require.call(loaded,id);
 loaded._compile(fs.readFileSync(old?path.join(__dirname,'fixtures/typed-native-preparation-baseline',name+'.cjs'):entry,'utf8'),entry);return loaded.exports;
}
test('native shop browser sources keep independently pinned LF contract text and exports',()=>{
 const old=load('game-shop-native',true),current=load('game-shop-native',false),digests={branch:'980b3739f687622254cf65aa684866581b80b76054e5383916d230ee5bacb86e',readCurrent:'0a439332d7ce3d644a166144fee5f8ee94ebc7e0006e9e4d4646576925b936cb',dateGetterOf:'0c51c6b0a3fa4e017318bd25c06546ec8cb7ddafe251ee1fc317be90f9981653',sourceCheck:'ff3a0eaa8b0c1f6af7b2c67ebfec631ca79e89cea42d7affb14c123f8a253efb'};
 assert.deepEqual(Object.keys(current),Object.keys(old));
 for(const [name,digest]of Object.entries(digests)){assert.equal(current[name].toString(),old[name].toString());assert.equal(hash(current[name].toString()),digest)}
 assert.deepEqual(Object.keys(load('game-wardrobe-native',false)),Object.keys(load('game-wardrobe-native',true)));
});
const serialize=value=>JSON.parse(JSON.stringify(value));
const errorView=error=>({name:error.name,message:error.message,code:error.code,...(error.cause?{cause:errorView(error.cause)}:{}),...(error.errors?{errors:error.errors.map(errorView)}:{})});
async function capture(kind,old,mode){
 const frames=[],shop=kind==='shop',save=mode==='save',attestOnly=['attest','attest-cleanup-fail'].includes(mode);let compiled;
 const failure=()=>Object.assign(Error('synthetic cleanup'),{code:'SYNTHETIC_CLEANUP'});
 const held={objectGroup:'owned-control',objects:{state:'state',node:'node',click:'click',context:'context',shadowStore:'shadow'},payload:'synthetic payload',payloadSha256:'payload-digest',shadowKeys:['_args'],interpretation:{selector:'#synthetic',index:2,before:{money:100}},requestDigest:'a'.repeat(64),async release(){frames.push({release:'held'});if(mode==='attest-cleanup-fail')throw failure()}};
 const client={async evaluate(expression){frames.push({evaluate:expression});return undefined},async send(method,params){frames.push({method,params});
   if(method==='Runtime.releaseObjectGroup'||method==='Runtime.releaseObject'){if(mode==='source-cleanup-fail')throw failure();return {}}
   if(method==='Runtime.evaluate'){compiled=params.expression.slice(1,-1);return{result:{type:'function',objectId:'compiled-guard'}}}
   if(method==='Runtime.callFunctionOn'){
     if(params.functionDeclaration.startsWith('function(...inputs)'))return mode==='preflight-reject'?{result:{type:'string',value:'synthetic rejection'}}:{result:{type:'undefined'}};
     if(params.functionDeclaration.startsWith('function(q)'))return mode==='snapshot-missing'?{result:{}}:{result:{value:{money:100,clock:42,inventory:[]}}};
   }
   throw Error('Unexpected synthetic method');
 }};
 const stubs={
  './game-contract.cjs':{async functionSource(){return ['source-mismatch','source-cleanup-fail'].includes(mode)?'changed source':compiled},async member(...args){frames.push({member:args.slice(1)});return args[1]==='bundle'?'money':'date-getter'},async captured(...args){frames.push({captured:args.slice(1)});return 'time'}},
  './game-native-environment.cjs':{async bind(...args){frames.push({environmentSave:args[4]});return {guard:'return undefined;',arguments:[{objectId:'environment'}]}}},
  './game-receipts.cjs':{namespace:'synthetic-receipts',async context(){frames.push({context:true});return 'fixture-nonce'}},
  './game-native-save.cjs':{async bind(){frames.push({save});return save?{objectId:'save-watch',digest:'b'.repeat(64)}:null},execution(source,index){return 'synthetic save '+index+'\n'+source}},
  './game-native-business-bindings.cjs':{async bind(client,held,profile,groups){groups.push('owned-business');return{bundleId:'bundle',widgets:2,functions:1}},checkBindings:function checkBindings(){return undefined}},
  './action.cjs':require('../scripts/lib/action.cjs'),
 };
 const profile={id:'synthetic-profile',terminalReviewed:true,payloadSha256:'payload-digest',shadowKeys:['_args'],widgets:{},functionMacros:{},functions:{updateMoment:{expr:'synthetic',sha256:'a'.repeat(64)}}};
 const request=shop?{type:'dol-shop',operation:'buy-one'}:{type:'dol-wardrobe',operation:mode==='unequip'?'unequip':'equip',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black'};
 if(shop){
   stubs['./game-shop.cjs']={validate(){},async prepare(){frames.push({prepare:'shop'});if(mode==='mapping-fail')throw Error('synthetic mapping');return{objectIds:['mapped-id'],objectGroups:['owned-mapped'],arguments:[{objectId:'mapped-arg'}],interpretation:{status:'available'},source:'return undefined;'}}};
   stubs['./game-native-control.cjs']={async attest(){return held},clickReader:function clickReader(){return undefined}};
   stubs['./game-shop-operation.cjs']={operation:function syntheticOperation(){return {ok:true}}};stubs['./game-shop-profile.json']=profile;
 }else{
   stubs['./game-wardrobe.cjs']={validate(){},async attest(){frames.push({attest:'wardrobe'});if(mode==='mapping-fail')throw Error('synthetic mapping');return held},reader:function syntheticReader(){return {}},branchGuard:function syntheticBranch(){return undefined}};
   stubs['./game-wardrobe-operation.cjs']={operation:function syntheticOperation(){return {ok:true}}};stubs['./game-wardrobe-profile.json']=profile;
 }
 const api=load('game-'+kind+'-native',old,stubs),attempt='12345678-1234-1234-1234-123456789abc';let result,error;
 try{result=shop?await api.prepare(client,request,{},attempt,{quote:{variant:{slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',modder:null},unitCost:10,baselineMoney:100,baselineCount:0,baselineWornCount:0},attestOnly}):await api.prepare(client,request,attempt,{attestOnly})}catch(e){error=errorView(e)}
 return serialize({frames,result,error});
}
for(const kind of ['wardrobe','shop'])test('typed '+kind+' preparation preserves full guard/operation/digest, attestation and cleanup frames',async()=>{
 for(const mode of ['normal','unequip','save','attest','attest-cleanup-fail','source-mismatch','preflight-reject','source-cleanup-fail','snapshot-missing','mapping-fail']){
   const original=await capture(kind,true,mode),current=await capture(kind,false,mode);assert.deepEqual(current,original,kind+' '+mode);
   if(mode==='normal'||mode==='save')assert.equal(current.result.executionBinding.provider,'dol-'+kind+'-native');
   if(mode==='attest')assert.equal(current.result.bindingCleanup,'completed');
   if(['source-mismatch','preflight-reject','source-cleanup-fail','mapping-fail','attest-cleanup-fail'].includes(mode))assert.ok(current.error,mode+' must exercise refusal');
 }
});
