const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const {createRequire}=require('node:module'),root=path.join(__dirname,'../scripts/lib'),nativeRequire=createRequire(path.join(root,'game-native-radio.cjs'));
const current=process.env.F13_COORDINATOR_DIR||root;
const expected={shadow:'a'.repeat(64),callback:'5aa51adacaad49700ed8057940822485425706e5da0395e362412eae3f52e8bc',setVar:'a49466396363e391ff0fffa179a93a1f6c3c994bd2b9fe559d4f0cc997f1b107',eval:'930c34ee3b0b4a93dde917dc367b75d5ebe98ae5fd309c51cde8eb70164f90e2',parse:'333b835c7a6bb1152de81d2d7e241b59617048bfc55b4e8870a1ed759599a883'};
const hash={randomUUID:()=> '00000000-0000-4000-8000-000000000000',createHash:()=>{let source='';return{update(v){source+=v;return this},digest(){return expected[source]||crypto.createHash('sha256').update(source).digest('hex')}}}};
function load(file,stubs){const module={exports:{}},require=name=>Object.hasOwn(stubs,name)?stubs[name]:nativeRequire(name);vm.runInNewContext('(function(require,module,Buffer){'+fs.readFileSync(file,'utf8')+'\n})',{})(require,module,Buffer);return module.exports}
function scenario(file,mode){
 const frames=[],held={objectGroup:'group',objects:{state:'state',node:'node',click:'click',context:'context',shadowStore:'store'},before:{passage:'Clothing Shop'},payload:'payload',payloadSha256:'d1adb8ad89160511284b9278ae8c12275c084018b2f452d9d203def0d842ad76',release:async()=>{}};
 let guard='';
 const client={async evaluate(expression){frames.push({evaluate:expression});return {view:'item',passage:'Clothing Shop'}},async send(method,params){frames.push({method,params});
  if(method==='Runtime.evaluate'){if(params.expression.startsWith('(')&&mode==='shop')guard=params.expression.slice(1,-1);return {result:{objectId:mode==='radio'&&params.expression.startsWith('(()=>')?'node':'guard'}}}
  if(params.functionDeclaration?.includes('Reflect.ownKeys(this)'))return{result:{value:true}};
  if(params.functionDeclaration?.includes('return (function(node,field)'))return{result:{value:{passage:'Scene',checked:false,value:'rest'}}};
  if(params.functionDeclaration?.includes('return {refs:'))return{result:{objectId:'epoch'}};
  if(params.functionDeclaration?.includes('this("before",inputs)'))return{result:{type:'undefined'}};
  throw Error('unexpected RPC '+params.functionDeclaration);
 }};
 const contracts={member:async(_c,_id,expr)=>expr.includes('change')?'shadow':expr==='this.setVar'?'setVar':'eval',captured:async(_c,_id,name)=>({callback:'callback',State:'state',shadowStore:'store',shadowContext:'context',Scripting:'scripting',parse:'parse'})[name],sameObject:async()=>true,functionSource:async(_c,id)=>id==='guard'?guard:id};
 const navigation={sources:{shadow:expected.shadow},lexical:async(_c,_id,name)=>name==='varName'?{type:'string',value:'$leftaction'}:name==='checkValue'?{type:'string',value:'attack'}:{type:'undefined'}};
 const generic={review:async()=>({id:'environment',arguments:[{objectId:'env'},{objectId:'epoch'}],guard:'return undefined;',sceneEpochSha256:'b'.repeat(64)})};
 const action={reviewedOperation:(name,source)=>({name,source})},save={bind:async()=>null},receipts={namespace:'receipts',context:async()=> '12345678-1234-4123-8123-123456789abc'};
 const control={attest:async()=>({...held}),clickReader:function clickReader(){}};
 const business={bind:async()=>({bundleId:'bundle'}),checkBindings:function checkBindings(){}};
 const module=load(file,{'node:crypto':hash,'./game-contract.cjs':contracts,'./game-native-navigation.cjs':navigation,'./game-native-generic-landing.cjs':generic,'./game-native-save.cjs':save,'./game-receipts.cjs':receipts,'./game-native-control.cjs':control,'./game-native-business-bindings.cjs':business,'./action.cjs':action});
 const request=mode==='radio'?{kind:'menu',selected:{type:'web-click',selector:'label'}}:{type:'dol-shop',operation:'return-menu'};
 return {frames,result:module.prepare(client,request,{},'12345678-1234-4123-8123-123456789abc')};
}
for(const [file,mode] of [['game-native-radio','radio'],['game-shop-menu-native','shop']])test(`${mode} matches original frames, guard and binding`,async()=>{
 const before=scenario(path.join(__dirname,'fixtures/typed-native-coordinator-baseline',file+'.cjs'),mode),after=scenario(path.join(current,file+'.cjs'),mode);
 assert.deepEqual(JSON.parse(JSON.stringify(await after.result)),JSON.parse(JSON.stringify(await before.result)));
 assert.deepEqual(JSON.parse(JSON.stringify(after.frames)),JSON.parse(JSON.stringify(before.frames)));
});
