const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {reader,validate,branchGuard,validateReceipt}=require('../scripts/lib/game-wardrobe.cjs');
const {readFileSync}=require('node:fs'),{resolve}=require('node:path'),{createRequire}=require('node:module');
const equip={type:'dol-wardrobe',operation:'equip',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'black',modder:null};
function fixture({duplicate=false}={}){
  const worn={variable:'hairpin',colour:'white',accessory_colour:'white'},item={variable:'hairpin',colour:'black',accessory_colour:'black'};
  const inventory=duplicate?[item,{...item}]:[item],wardrobe={head:inventory},v={wardrobe,worn:{head:worn},wardrobe_location:'wardrobe',lastWardrobeSlot:'head',
    wardrobeOption:'wear',wear_outfit:'none',delete_outfit:'none',clothingShop:{stolenClothes:0},money:500,timeStamp:10140};
  for(const slot of ['over_upper','over_lower','upper','lower','under_upper','under_lower','over_head','head','face','neck','hands','handheld','legs','feet','genitals'])v['wear_'+slot]='none';
  const links=Array.from({length:inventory.length+1},()=>({hasAttribute:()=>false}));
  const rows=links.map(link=>({tagName:'DIV',querySelectorAll:()=>[link]})),sort={tagName:'DIV'};
  const list={children:[sort,...rows],querySelectorAll:()=>rows},root={getAttribute:()=> 'Wardrobe',contains:n=>n===list,querySelector:()=>null};
  const document={querySelectorAll:selector=>selector==='#passages > .passage'?[root]:selector==='#wardrobeList'?[list]:
    [links[Number(selector.match(/nth-of-type\((\d+)\)/)?.[1])-2]].filter(Boolean)};
  const state={passage:'Wardrobe',turns:31,variables:v,temporary:{wear:'wear_head',selectedWardrobe:wardrobe}};
  const window={SugarCube:{State:state},V:v};
  const read=request=>vm.runInNewContext(`(${reader.toString()})(${JSON.stringify(request)})`,{window,document,TextEncoder});
  return {read,state,window,root,list,rows,links,item};
}
test('native head mapping uses the original variant and real row, independent of UI Runtime',()=>{
  const f=fixture(),mapped=f.read(equip);
  assert.equal(mapped.status,'available');assert.equal(mapped.index,0);
  assert.equal(mapped.selector,'#wardrobeList > div.wardrobeItem:nth-of-type(3) > a.link-internal');
  assert.equal(mapped.before.item.colour,'black');assert.equal(mapped.before.money,500);
  const strip=f.read({type:'dol-wardrobe',operation:'unequip',slot:'head'});
  assert.equal(strip.selector,'#wardrobeList > div.wardrobeItem:nth-of-type(2) > a.link-internal');
  assert.equal(f.state.variables.worn.head.colour,'white');assert.equal(f.state.variables.wardrobe.head.length,1);
});
test('ambiguity, linked clothing, active destructive mode, stale slot and wrong rows fail closed',()=>{
  assert.equal(fixture({duplicate:true}).read(equip).reason,'variant-ambiguous-or-missing');
  for(const change of [f=>f.item.cursed=1,f=>f.state.variables.wardrobeOption='delete',f=>f.state.variables.wear_head=0,
    f=>f.state.variables.lastWardrobeSlot='upper',f=>f.state.temporary.selectedWardrobe={},f=>f.rows.pop(),
    f=>f.window.DoLGameUI={version:'2.2.2'},f=>f.links[1].hasAttribute=()=>true]){
    const f=fixture();change(f);assert.equal(f.read(equip).status,'unsupported');
  }
});
test('native equipment request retains exact variant fields and excludes linked/custom APIs',()=>{
  assert.equal(validate(equip),equip);validate({...equip,variable:'beanie',accessoryColour:null});
  for(const r of [{...equip,type:'sw-wardrobe'},{...equip,slot:'upper'},{...equip,operation:'delete'},{...equip,colour:'custom'},
    {...equip,accessoryColour:'random'},{...equip,accessoryColour:undefined},{...equip,index:0},{...equip,variable:'naked'}])assert.throws(()=>validate(r));
});

test('native wardrobe ledger requires the reviewed original moment evidence and requested full variant',()=>{
  const e={action:{selected:equip},executionBinding:{provider:'dol-wardrobe-native',contract:'native-head-equip-'+'a'.repeat(12)}};
  const receipt={outcome:'occurred',remoteClosed:true,spent:0,evidence:{kind:'native-head',operation:'equip',slot:'head',turns:31,time:10140,money:500,
    beforeWorn:['hairpin','white',null,'white'],afterWorn:['hairpin','black',null,'black'],inventoryBefore:1,inventoryAfter:1,originalMomentUpdates:1,samePassage:true}};
  assert.equal(validateReceipt(receipt,e),true);
  for(const mutate of [r=>delete r.evidence,r=>r.spent=1,r=>r.evidence.originalMomentUpdates=0,r=>r.evidence.samePassage=false,
    r=>r.evidence.afterWorn[3]='white',r=>r.evidence.inventoryAfter=0,r=>r.evidence.extra=true]){
    const changed=JSON.parse(JSON.stringify(receipt));mutate(changed);assert.equal(validateReceipt(changed,e),false);
  }
  const naked={...receipt,evidence:{...receipt.evidence,beforeWorn:['naked',0,null,0],inventoryAfter:0}};
  assert.equal(validateReceipt(naked,e),true);
  assert.equal(validateReceipt({...receipt,evidence:undefined,outcome:'not-occurred'},e),true);
});
test('native refresh candidate accepts plain original head data and rejects latent clothing or custom clone branches without invoking them',()=>{
  function prepare(){
    const f=fixture(),v=f.state.variables;
    Object.assign(v,{options:{autosaveDisabled:true},ironmanmode:false,passage:'Wardrobe',exposed:0,alluretest:0,wardrobes:{wardrobe:{}},carried:{}});
    for(const slot of ['over_upper','over_lower','upper','lower','under_upper','under_lower','over_head','head','face','neck','hands','handheld','legs','feet','genitals'])v.carried[slot]={name:'naked'};
    Object.assign(v.worn.head,{name:'hairpin',type:[]});Object.assign(f.item,{name:'hairpin',type:[]});
    f.window.setup={wardrobeSkip:['naked'],clothingLayer:{all:['over_upper','over_lower','over_head','upper','lower','under_upper','under_lower','head','face','neck','hands','handheld','legs','feet']},clothes:{head:[{variable:'naked',name:'naked',type:['naked']},{variable:'hairpin',name:'hairpin',type:[]}]}};
    f.guard=()=>vm.runInNewContext(`(${branchGuard.toString()})('before',request)`,{window:f.window,document:{querySelector:()=>null},request:equip,Object,Array});return f;
  }
  assert.equal(prepare().guard(),undefined);
  const dataClass=prepare(),prototype={constructor:function ClothesItem(){throw Error('must not construct item')}};
  Object.setPrototypeOf(dataClass.window.setup.clothes.head[0],prototype);assert.equal(dataClass.guard(),undefined);
  for(const change of [f=>f.state.variables.carried.upper.name='shirt',f=>f.state.variables.worn.butt_plug={state:'removed'},
    f=>f.item.type=['strap-on'],f=>f.item.outfitPrimary={},f=>f.window.setup.clothes.head.push({variable:'hairpin'}),
    f=>f.item.clone=()=>{throw Error('must not invoke clone')},f=>Object.defineProperty(f.item,'clone',{get(){throw Error('must not invoke clone getter')}}),
    f=>Object.defineProperty(f.item,'extra',{get(){throw Error('must not invoke data getter')}}),f=>Object.setPrototypeOf(f.item,{clone(){throw Error('must not invoke custom prototype')}}),
    f=>f.state.variables.options.autosaveDisabled=false,f=>f.state.temporary.strip_restrict=1,f=>f.state.variables.passage='Bedroom',
    f=>f.state.variables.exposed=1,f=>f.state.variables.alluretest=1,f=>f.window.setup.clothingLayer.all.push('custom-slot')]){
    const f=prepare();change(f);assert.notEqual(f.guard(),undefined);
  }
});
test('wardrobe provenance binds the captured index, current state and payload without certifying a terminal',async()=>{
  const path=resolve(__dirname,'../scripts/lib/game-wardrobe.cjs'),nativeRequire=createRequire(path);
  for(const fault of [null,'payload','index','stale','cleanup']){
    const f=fixture(),first=f.read(equip);let released=0,reads=0;
    const held={status:'attested',actions:false,terminalReviewed:false,before:{passage:'Wardrobe',turns:31,time:10140,money:500},
      payloadSha256:fault==='payload'||fault==='cleanup'?'changed':'d542a29ae81a97ba006ce4189f68eff13d27250e77f3c749c11442bdeb6027fc',objects:{shadowStore:'shadow'},
      async release(){released++;if(fault==='cleanup')throw Error('cleanup failed')}};
    const module={exports:{}},require=name=>name==='./game-native-control.cjs'?{attest:async(_c,d)=>{
      assert.equal(d.selected.selector,first.selector);assert.equal(d.kind,'menu');return held}}:nativeRequire(name);
    vm.runInNewContext(`(function(require,module,exports){${readFileSync(path,'utf8')}\n})`,{})(require,module,module.exports);
    const client={async evaluate(){if(reads++&&fault==='stale')f.state.variables.money--;return f.read(equip)},async send(method,p){
      assert.equal(method,'Runtime.callFunctionOn');assert.equal(p.objectId,'shadow');
      assert.match(p.functionDeclaration,/a\[1\]===0/);return {result:{value:fault!=='index'}};
    }};
    if(fault===null){const result=await module.exports.attest(client,equip);assert.equal(result.actions,false);assert.equal(result.terminalReviewed,false);assert.equal(released,0);await result.release();assert.equal(released,1)}
    else {await assert.rejects(module.exports.attest(client,equip),e=>fault==='cleanup'?e.code==='NATIVE_BINDING_CLEANUP_FAILED':/differs|changed/.test(e.message));assert.equal(released,1)}
  }
});
