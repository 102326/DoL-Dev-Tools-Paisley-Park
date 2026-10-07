const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {readFileSync}=require('node:fs'),{resolve}=require('node:path'),{createRequire}=require('node:module');
const path=resolve(__dirname,'../scripts/lib/game-native-control.cjs'),localRequire=createRequire(path);
const descriptor={kind:'menu',selected:{type:'web-click',selector:'#native'}};
function fixture({tail,changedSource=false,changedAlias=false,changedDOM=false,cleanupFails=false,callbackMissing=false}={}){
  const sources={click:'click',once:'once',shadow:'shadow',callback:'callback'},released=[],calls=[];
  const context={name:'link',payload:[{contents:'<<updatewardrobe>>'}]},store={_wear:'wear_head'},state={passage:'Wardrobe',turns:30,variables:{timeStamp:10140,money:500}};
  const node={isConnected:true,hasAttribute:()=>false},root={contains:n=>n===node,getAttribute:()=>changedDOM?'Bedroom':'Wardrobe'};
  const objects={node,context,shadowStore:store,state},window={SugarCube:{State:state}};
  const contract={functionSource:async(_c,id)=>changedSource?'changed':id,
    captured:async(_c,id,name)=>name==='fn'?'shadow':name==='Wikifier'?'wikifier':name==='State'?'state':name==='shadowContext'?'context':'shadowStore',
    member:async()=> 'click',sameObject:async()=>!changedAlias};
  const navigation={sources,lexical:async(_c,_id,name)=>name==='callback'?callbackMissing?{type:'undefined'}:{type:'function',objectId:'callback'}:
    name==='doneCallback'&&tail?{type:'function',objectId:'tail'}:{type:'undefined'}};
  const module={exports:{}};
  const require=name=>name==='node:crypto'?{randomUUID:()=> 'owned',createHash:()=>({update(s){this.s=s;return this},digest(){return this.s}})}:
    name==='./game-contract.cjs'?contract:name==='./game-native-navigation.cjs'?navigation:localRequire(name);
  vm.runInNewContext(`(function(require,module,exports){${readFileSync(path,'utf8')}\n})`,{})(require,module,module.exports);
  const client={async send(method,p){calls.push({method,p});
    if(method==='Runtime.evaluate')return {result:{objectId:p.expression.includes('querySelectorAll')?'node':p.expression.endsWith('.Wikifier')?'wikifier':p.expression.endsWith('.State')?'state':'jq'}};
    if(method==='Runtime.callFunctionOn'){
      const value=vm.runInNewContext(`(${p.functionDeclaration})`,{window,document:{querySelectorAll:()=>[root]}}).call(objects[p.objectId],...(p.arguments||[]).map(a=>objects[a.objectId]));
      return {result:{value}};
    }
    if(method==='Runtime.releaseObjectGroup'){released.push(p.objectGroup);if(cleanupFails)throw Error('cleanup failed');return {}}
    throw Error('Unexpected CDP call');
  }};
  return {attest:module.exports.attest,client,released,calls};
}
test('partial link provenance never executes its handler or certifies business completion',async()=>{
  const f=fixture(),held=await f.attest(f.client,descriptor);
  assert.equal(held.actions,false);assert.equal(held.terminalReviewed,false);
  assert.equal(held.before.passage,'Wardrobe');assert.equal(held.payload,'<<updatewardrobe>>');
  assert.deepEqual(Array.from(held.shadowKeys),['_wear']);assert.equal(f.released.length,0);
  await held.release();await held.release();assert.deepEqual(f.released,['dol-native-control-owned']);
  assert.ok(f.calls.every(c=>!c.p.functionDeclaration?.includes('node.click()')));
});
test('partial provenance refuses navigation tails, changed sources/aliases/DOM and missing callbacks',async()=>{
  for(const options of [{tail:true},{changedSource:true},{changedAlias:true},{changedDOM:true},{callbackMissing:true}]){
    const f=fixture(options);await assert.rejects(f.attest(f.client,descriptor));assert.equal(f.released.length,1);
  }
  const f=fixture({tail:true,cleanupFails:true});
  await assert.rejects(f.attest(f.client,descriptor),e=>e.code==='NATIVE_BINDING_CLEANUP_FAILED'&&e.errors.length===2);
});
test('wrong descriptors are rejected before any transport',async()=>{
  const f=fixture();for(const d of [{...descriptor,kind:'navigation'},{...descriptor,destination:'Bedroom'},{...descriptor,selected:{type:'web-input',selector:'#native'}}])
    await assert.rejects(f.attest(f.client,d),/descriptor required/);
  assert.equal(f.calls.length,0);
});

test('shop propagation stops never authorize an extra business handler',()=>{
  const {clickReader}=require('../scripts/lib/game-native-control.cjs');
  const business=()=>{},stop=vm.runInNewContext('(function (e) {\n\t\t\te.stopPropagation();\n\t\t})');
  let events=[{handler:business,namespace:'aria-clickable.macros'},{handler:stop,namespace:''},{handler:stop,namespace:''}];
  const node={closest:s=>s==='#clothes-list'},window={SugarCube:{State:{passage:'Clothing Shop'}},jQuery:{_data:()=>({click:events})}};
  const read=vm.runInNewContext('('+clickReader.toString()+')',{window});
  assert.equal(read(node),null);assert.equal(read(node,true),business);
  events[2]={handler:()=>{},namespace:''};assert.equal(read(node,true),null);
  events.pop();events[1].namespace='foreign';assert.equal(read(node,true),null);
  events[1].namespace='';events[1].selector='a';assert.equal(read(node,true),null);
  delete events[1].selector;window.SugarCube.State.passage='Wardrobe';assert.equal(read(node,true),null);
});
