const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const mapping=require('../integrations/soft-and-wet/gameplay.cjs'),action=require('../scripts/lib/action.cjs');
function fixture() {
  let clicks=0; const refs=new Map(),released=[];
  const v={wardrobe_location:'wardrobe',lastWardrobeSlot:'head',worn:{head:{variable:'naked',colour:0}},wardrobe:{head:[{variable:'hairpin',colour:'white'}]}};
  class Element {
    isConnected=true;textContent='头饰';
    getAttribute(){return 'Wardrobe'} getClientRects(){return [1]} matches(){return false} closest(){return null}
    querySelectorAll(s){return s==='.dgw-shell'?[this]:s==='.dgw-slots > button'?[this]:[]} querySelector(){return null}
    click(){clicks++;v.worn.head=v.wardrobe.head.shift()}
  }
  const node=new Element();
  const globals={window:{SugarCube:{State:{passage:'Wardrobe',variables:v}},DoLGameUI:{version:'2.2.1'}},HTMLElement:Element,
    document:{querySelectorAll:()=>[node]},getComputedStyle:()=>({display:'block',visibility:'visible',opacity:'1'})};
  const client={evaluate:s=>vm.runInNewContext(s,globals),async send(method,p){
    if(method==='Runtime.evaluate'){const value=vm.runInNewContext(p.expression,globals),id='object-'+refs.size;refs.set(id,value);return{result:{objectId:id}}}
    if(method==='Runtime.releaseObject'){released.push(p.objectId);return{}}
    const value=vm.runInNewContext(`(${p.functionDeclaration})`,globals).apply(node,(p.arguments||[]).map(a=>refs.get(a.objectId)));
    return{result:{value}};
  }};
  const ctx={options:{serial:'test-device',package:'com.example.game'},ensureWebview:async()=>client,adb:async(...args)=>{
    const key=args.join(' ');
    return Buffer.from(key==='get-state'?'device':key==='shell am get-current-user'?'0':key.includes('dumpsys package')?'Package [com.example.game]\n versionCode=1\n User 0: installed=true':key.includes('dumpsys activity')?'mResumedActivity: ActivityRecord{ u0 com.example.game/.Main }':'mCurrentFocus=Window{ u0 com.example.game/.Main }');
  }};
  const request={type:'sw-wardrobe',operation:'equip',slot:'head',variable:'hairpin',colour:'white'};
  return{v,globals,client,ctx,node,request,released,clicks:()=>clicks};
}
test('reviewed wardrobe mapping rejects duplicate, linked, unknown-version and wrong-slot targets without writes',async()=>{
  const f=fixture();assert.equal((await f.client.evaluate(`(${mapping.reader.toString()})(${JSON.stringify(f.request)})`)).status,'available');
  f.v.wardrobe.head.push({...f.v.wardrobe.head[0]});await assert.rejects(mapping.prepare(f.client,f.request));f.v.wardrobe.head.pop();
  f.v.wardrobe.head[0].outfitPrimary={};await assert.rejects(mapping.prepare(f.client,f.request));delete f.v.wardrobe.head[0].outfitPrimary;
  for (const target of [f.v.worn.head,f.v.wardrobe.head[0]]) for (const field of ['outfitPrimary','outfitSecondary']) {
    for (const value of [null,false,0]) { target[field]=value;await assert.rejects(mapping.prepare(f.client,f.request)); }
    delete target[field];
  }
  f.v.lastWardrobeSlot='upper';await assert.rejects(mapping.prepare(f.client,f.request));f.v.lastWardrobeSlot='head';
  f.globals.window.DoLGameUI.version='unknown';await assert.rejects(mapping.prepare(f.client,f.request));
  assert.throws(()=>mapping.validate({...f.request,slot:'upper'}));assert.throws(()=>mapping.validate({...f.request,source:'arbitrary JS'}));assert.equal(f.clicks(),0);
});
test('shared Action binds original item instances; a same-looking replacement cannot be clicked',async()=>{
  for(const drift of ['none','inventory','worn']){
    const f=fixture(),m=await mapping.prepare(f.client,f.request);
    f.ctx.webGuard={objectId:'bound-node',source:m.source,arguments:m.arguments};
    if(drift==='inventory')f.v.wardrobe.head[0]={...f.v.wardrobe.head[0]};
    if(drift==='worn')f.v.worn.head={...f.v.worn.head};
    if(drift==='none'){await action.execute(f.ctx,m.action);assert.equal(f.v.worn.head.variable,'hairpin');assert.equal(f.clicks(),1)}
    else {await assert.rejects(action.execute(f.ctx,m.action),e=>e.notDispatched===true);assert.equal(f.clicks(),0)}
    for(const objectId of m.objectIds)await f.client.send('Runtime.releaseObject',{objectId});assert.equal(f.released.length,2);
  }
});
