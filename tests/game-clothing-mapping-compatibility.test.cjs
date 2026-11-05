const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),{createHash}=require('node:crypto');
const hash=value=>createHash('sha256').update(value).digest('hex'),copy=value=>JSON.parse(JSON.stringify(value));
function load(name,old,stubs={},price){const entry=path.resolve(__dirname,'../scripts/lib/'+name+'.cjs'),m=new Module(entry,module);m.filename=entry;m.paths=Module._nodeModulePaths(path.dirname(entry));m.require=id=>Object.hasOwn(stubs,id)?stubs[id]:Module.prototype.require.call(m,id);let source=fs.readFileSync(old?path.join(__dirname,'fixtures/typed-clothing-mapping-baseline',name+'.cjs'):entry,'utf8');if(price)source=source.replace('5424a6f34332b8a79c55cd740b1d6c40696352141908119c4690f511ac885710',hash(price));m._compile(source,entry);return m.exports}
const project=e=>({name:e.name,message:e.message,code:e.code,...(e.cause?{cause:project(e.cause)}:{}),...(e.errors?{errors:e.errors.map(project)}:{})});
const wardrobe=load('game-wardrobe',false),oldWardrobe=load('game-wardrobe',true),shop=load('game-shop',false),oldShop=load('game-shop',true);
test('clothing mapping browser sources retain fixed original LF text, digests and export shape',()=>{
 for(const [current,old,digests]of [[wardrobe,oldWardrobe,{reader:'bf6b489cda6644c576b1390f60d2b1ad488f82ce3b5ade9f700e0d8afb50d593',branchGuard:'5187f81544daedff79a1c85a97448fd09c1efe6e6423dad9fa8fde6c2a13cc03'}],[shop,oldShop,{reader:'b0d4e4f04387e6de17a8c907f6868e673ead9d571fcf1f5aeb4d2ae35e9bd23a'}]]){assert.deepEqual(Object.keys(current),Object.keys(old));for(const [key,digest]of Object.entries(digests)){assert.equal(current[key].toString(),old[key].toString());assert.equal(hash(current[key].toString()),digest)}}
});
const request={type:'dol-wardrobe',operation:'equip',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'white'};
test('mapping validators preserve accepted request identity and rejected inputs without adding execution authority',()=>{
 for(const [current,old,inputs]of [[wardrobe,oldWardrobe,[null,[],{},request,{...request,colour:'random'},{...request,extra:true},{type:'dol-wardrobe',operation:'unequip',slot:'head'}]],[shop,oldShop,[null,[],{}, {type:'dol-shop',operation:'buy-one'},{type:'dol-shop',operation:'browse',selector:'#synthetic'}, {type:'dol-shop',operation:'browse'},{type:'dol-shop',operation:'buy-one',selector:'#synthetic'}]]])for(const input of inputs){const check=api=>{try{assert.equal(api.validate(input),input);return 'same original input'}catch(e){return project(e)}};assert.deepEqual(check(current),check(old))}
});
test('wardrobe receipt predicate preserves occurred and unsettled/save witness decisions',()=>{
 const effect={action:{selected:request},executionBinding:{provider:'dol-wardrobe-native',contract:'native-head-equip-'+'a'.repeat(12)}};
 const receipt={outcome:'occurred',remoteClosed:true,spent:0,evidence:{kind:'native-head',operation:'equip',slot:'head',turns:1,time:42,money:100,beforeWorn:['naked',0,null,0],afterWorn:['hairpin','black',null,'white'],inventoryBefore:1,inventoryAfter:0,originalMomentUpdates:1,samePassage:true}};
 assert.equal(wardrobe.validateReceipt(receipt,effect),true);
 const changes=[()=>{},r=>r.evidence.afterWorn[1]='white',r=>r.evidence.inventoryAfter=1,r=>r.spent=1,r=>r.evidence.originalMomentUpdates=2,r=>r.evidence.extra=true,r=>r.evidence.inventoryBefore=-1,r=>r.outcome='unknown',r=>{r.outcome='unknown';delete r.evidence},(r,e)=>{e.executionBinding.contract='native-head-equip-save-'+'a'.repeat(12)},(r,e)=>{e.executionBinding.contract='native-head-equip-save-'+'a'.repeat(12);r.evidence.save={kind:'native-idb-save',slot:0,count:0,transactions:0,committed:true,readBack:true}}];
 for(const change of changes){const r=copy(receipt),e=copy(effect);change(r,e);assert.equal(wardrobe.validateReceipt(r,e),oldWardrobe.validateReceipt(r,e))}
});
async function attest(old,mode){
 const frames=[],snapshot={status:'available',selector:'#synthetic',index:2,before:{turns:1,time:42,money:100}};let reads=0;
 const held={status:'attested',actions:false,terminalReviewed:false,before:{passage:'Wardrobe',turns:1,time:42,money:100},objects:{shadowStore:'shadow'},objectGroup:'owned',payloadSha256:mode==='payload-mismatch'?'changed':'d542a29ae81a97ba006ce4189f68eff13d27250e77f3c749c11442bdeb6027fc',async release(){frames.push({release:true});if(mode==='cleanup-failure')throw Error('synthetic cleanup')}};
 const client={async evaluate(expression){frames.push({expression});return mode==='missing'?null:mode==='changed'&&reads++>0?{...snapshot,index:3}:snapshot},async send(method,params){frames.push({method,params});return{result:{value:mode!=='shadow-mismatch'&&mode!=='cleanup-failure'}}}};
 const api=load('game-wardrobe',old,{'./game-native-control.cjs':{async attest(client,descriptor){frames.push({descriptor});return held}}});let result,error;try{result=await api.attest(client,request)}catch(e){error=project(e)}return copy({frames,result,error});
}
test('wardrobe provenance keeps original read/shadow/fresh-state and cleanup frames',async()=>{for(const mode of ['normal','missing','changed','payload-mismatch','shadow-mismatch','cleanup-failure']){const current=await attest(false,mode);assert.deepEqual(current,await attest(true,mode),mode);assert.equal(!!current.result,mode==='normal')}});
async function prepare(old,mode){
 const frames=[],price='function syntheticPrice(){return 10}',snapshot={status:'available',variable:'hairpin',colour:'black',accessoryColour:'white',modder:null,money:100,count:0,cost:10,wornCount:0};let ids=0;
 const client={async evaluate(expression){frames.push({expression});return true},async send(method,params){frames.push({method,params});if(method==='Runtime.evaluate'){if(params.expression==='window.money')return mode==='global'?{result:{type:'function',objectId:'global-debit'}}:{result:{type:'undefined'}};return{result:{objectId:'object-'+(++ids)}}}
   if(method==='Runtime.callFunctionOn'){
     if(params.functionDeclaration==='function(){return Function.prototype.toString.call(this)}')return{result:{value:params.objectId==='object-1'?(mode==='bad-price'||mode==='cleanup-failure'?'changed source':price):'function syntheticDebit(){}'}};
     return{result:{value:mode==='missing-snapshot'?null:snapshot}};
   }
   if(['Runtime.releaseObject','Runtime.releaseObjectGroup'].includes(method)){if(mode==='cleanup-failure')throw Error('synthetic cleanup');return{}}throw Error('Unexpected method');
 }};
 const api=load('game-shop',old,{'./game-contract.cjs':{async attestFunctionMacro(...args){frames.push({attest:args.slice(1)});return{objectGroup:'native-money',objectId:'original-handler',functionId:'native-debit'}},async sameObject(){return mode!=='handler-changed'}}},price);
 let result,error;try{result=mode==='inspect'?await api.inspect(client):await api.prepare(client,{type:'dol-shop',operation:mode==='quantity'?'quantity-one':'buy-one'},{kind:'purchase-one'},{quote:mode==='quote-changed'?{variant:{variable:'hairpin',colour:'black',accessoryColour:'white',modder:null},baselineMoney:99,baselineCount:0,baselineWornCount:0,unitCost:10}:undefined})}catch(e){error=project(e)}return copy({frames,result,error});
}
test('shop mapping preserves global/native debit ownership, snapshot/quote refusal and cleanup frames',async()=>{for(const mode of ['normal','global','quantity','inspect','bad-price','missing-snapshot','quote-changed','handler-changed','cleanup-failure']){const current=await prepare(false,mode);assert.deepEqual(current,await prepare(true,mode),mode);assert.equal(!!current.result,['normal','global','quantity','inspect'].includes(mode),mode)}});
