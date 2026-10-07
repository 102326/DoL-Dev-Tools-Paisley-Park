const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {createHash}=require('node:crypto');
const native = require('../integrations/soft-and-wet/native-head.cjs');
const receipts = require('../scripts/lib/game-receipts.cjs');
function fixture({ previous = 'naked', lostOld = false, domConflict = false, delta = 0, operation = 'equip', staleUi = false, fallback = false, noRefresh = false, replacedMethod = false, detachedError = false, originalThrow = false, secondCall = false, reenter = false, ownerReplacement = false } = {}) {
  const item = { variable: 'hairpin', name: 'hairpin', colour: 'black', type: ['normal'] };
  const worn = { variable: previous, name: previous, colour: 0, type: [previous === 'naked' ? 'naked' : 'normal'] };
  const naked={variable:'naked',name:'naked',colour:0,type:['naked']};
  const before = { turns: 10, time: 123, money: 1000, worn, item, inventory: [item],...(operation==='unequip'?{naked}:{}) };
  let calls = 0, id = 'wardrobeList';
  const frames = [], parent = {}, nativeList={hidden:true}, strip={isConnected:true};
  const list = { parentNode: parent, isConnected: true, closest:selector=>selector==='.dgw-native'?nativeList:null,
    get id() { return id; }, set id(value) { id = value; } };
  const root = { isConnected: true, getAttribute: () => 'Wardrobe', querySelector: () => null };
  const original = { isConnected: true, contains: node => node === list };
  const state = { passage: 'Wardrobe', turns: before.turns, variables: { money: before.money, timeStamp: before.time, worn: { head: worn }, wardrobe: { head: [item] } } };
  const binding = { provider: 'soft-and-wet-native-head', contract: 'head-wear-v1', contextNonce: '123e4567-e89b-42d3-a456-426614174000', requestDigest: 'a'.repeat(64) };
  const attemptId = '223e4567-e89b-42d3-a456-426614174000';
  const context = { nonce: binding.contextNonce, records: Object.create(null) };
  const wardrobe = { passage: root, original, state: { busy: false, slot: 'head', wornItem: previous === 'naked' ? null : { key: 'worn:head', name: previous }, wornName: previous },
    snapshot: { inventory: state.variables.wardrobe, worn: state.variables.worn }, entries: [{ key: 'head:0', slot: 'head', index: 0, raw: item }], refreshQueued: false };
  let enabled = true;
  const uiHost = { getEnabled: () => enabled }, getEnabled = uiHost.getEnabled;
  const measured = { measure() {} }, measure = measured.measure;
  const outfit = { sync() {} }, sync = outfit.sync;
  const document = { querySelector(selector) { return selector === '#wardrobeList' && id === 'wardrobeList' ? list : selector==='#passages > .passage'?root:null; },
    querySelectorAll(selector) { return selector === '#passages > .passage' ? [root] : selector==='#passages > .passage .dgw-strip'?[strip]:selector === '#wardrobeList' && id === 'wardrobeList' ? [list] : []; } };
  const window = { [receipts.namespace]: context, DoLWardrobeUI: uiHost, SugarCube: { State: state } };
  const bridge = { message() { return ''; }, action(mode,slot,selected) {
    calls++;assert.equal(mode,'wear');assert.equal(slot,'head');assert.equal(selected,operation==='equip'?0:'strip');
    state.variables.worn.head = operation === 'unequip' ? naked : { ...item, lastTaken: 'wardrobe' };
    state.variables.wardrobe.head = [...(operation === 'unequip' ? [item] : []),...(previous !== 'naked' && !lostOld ? [{ ...worn, lastTaken: 'wardrobe' }] : [])];
    state.variables.money += delta;
    if (domConflict) id = 'other-owner-id';
    if (ownerReplacement) bridge.action = function outsideOwner() {};
    if (reenter) { try { bridge.action('wear','head',selected); } catch {} }
    if (originalThrow) throw Error('original native error');
    return { querySelector: () => detachedError ? {} : null };
  } };
  const originalAction=bridge.action, originalMessage=bridge.message;
  const uiAction = (actual, actualEntry) => {
    assert.equal(actual, wardrobe);
    if (operation === 'equip') assert.equal(actualEntry, wardrobe.entries[0]);
    try {
      const output=bridge.action('wear','head',operation==='equip'?0:'strip');
      if (secondCall) { try { bridge.action('wear','head',operation==='equip'?0:'strip'); } catch {} }
      if(operation==='equip'&&output.querySelector('.error'))wardrobe.state.message='原版换装报告了错误，请在界面设置中切换原版衣柜检查。';
    } catch { wardrobe.state.message=operation==='equip'?'原版换装未完成，请在原版衣柜检查当前装备。':'脱下操作未完成，请在界面设置中切换原版衣柜检查'; }
    if (!noRefresh) {
      wardrobe.refreshQueued = true;
      frames.push(() => {
        wardrobe.refreshQueued = false;
        if (fallback) enabled = false;
        if (replacedMethod) outfit.sync = function replacedSync() {};
        if (!staleUi) {
          wardrobe.snapshot = { inventory: state.variables.wardrobe, worn: state.variables.worn };
          wardrobe.entries = state.variables.wardrobe.head.map((raw,i) => ({ key: 'head:' + i, slot: 'head', index: i, raw }));
          wardrobe.state.wornName = state.variables.worn.head.variable === 'naked' ? 'naked' : '发卡';
          wardrobe.state.wornItem = state.variables.worn.head.variable === 'naked' ? null : { key: 'worn:head', name: wardrobe.state.wornName };
        }
      });
    }
  };
  const args = { namespace: receipts.namespace, binding, attemptId, index: 0, before, operation, operationSha256:'b'.repeat(64),
    errorMessages: operation === 'equip' ? ['原版换装报告了错误，请在界面设置中切换原版衣柜检查。','原版换装未完成，请在原版衣柜检查当前装备。','衣柜内容已变化，请重新选择','换装接口尚不可用'] : ['脱下操作未完成，请在界面设置中切换原版衣柜检查'] };
  const run = () => vm.runInNewContext(`(${native.operation.toString()})(${JSON.stringify(args)},uiAction,wardrobe,${operation==='equip'?'wardrobe.entries[0]':'undefined'},uiHost,getEnabled,measured,measure,outfit,sync,bridge,originalAction,originalMessage)`,
    { window, document, uiAction, wardrobe, uiHost, getEnabled, measured, measure, outfit, sync, bridge, originalAction, originalMessage, requestAnimationFrame: callback => { frames.push(callback); } });
  const tick = () => { const frame = frames.splice(0); assert.ok(frame.length > 0); for (const callback of frame) callback(); };
  const recoveryCheck=({expected={attemptId,binding},before:checkedBefore=before}={})=>vm.runInNewContext(
    `(${native.closedRecoveryReader.toString()}).call(strip,expected,checkedBefore,[wardrobe,bridge,originalAction],indices)`,
    {window,document,getComputedStyle:()=>({display:'none'}),strip,expected,checkedBefore,wardrobe,bridge,originalAction,
      indices:{namespace:receipts.namespace,context:0,bridge:1,action:2,index:0,errorMessages:args.errorMessages}});
  return { run, tick, context, args, wardrobe, state, recoveryCheck,
    stats: () => ({ calls, id, pendingFrames: frames.length, restored: bridge.action===originalAction, externalOwner: ownerReplacement&&bridge.action!==originalAction }) };
}
test('original UI wear/strip settles only after Y refresh and whole original result', async () => {
  for (const previous of ['naked','beanie']) {
    for (const operation of ['equip',...(previous==='beanie'?['unequip']:[])]) {
      const f = fixture({ previous, operation }), pending = f.run();
      assert.equal(f.context.records[f.args.attemptId].status, 'started');
      assert.equal(JSON.stringify(f.context.records[f.args.attemptId].before),JSON.stringify(f.args.before));
      assert.equal(f.context.records[f.args.attemptId].operationSha256,'b'.repeat(64));
      f.tick(); assert.equal(f.context.records[f.args.attemptId].status, 'started');
      f.tick(); const result=await pending;
      assert.equal(result.ok, true); assert.equal(result.receipt.remoteClosed, true);
      assert.deepEqual(f.stats(), { calls: 1, id: 'wardrobeList', pendingFrames: 0, restored: true, externalOwner: false });
      assert.equal((await f.run()).ok, false); assert.equal(f.stats().calls, 1, 'terminal is never replayed');
    }
  }
});
test('legacy recovery rejects a wrong contract or before digest without touching CDP', async () => {
  const before={turns:105,time:1311340,money:847117280,worn:{variable:'naked'},item:{variable:'hairpin'},inventory:[{variable:'hairpin'}]};
  const selected={type:'sw-wardrobe',operation:'equip',slot:'head',variable:'hairpin',colour:'black',modder:null,accessoryColour:'black'};
  const profile=require('../integrations/soft-and-wet/native-head-profile.json');
  const digest=createHash('sha256').update(JSON.stringify({request:selected,index:4,before,profile:profile.id})).digest('hex');
  const effect={id:'6d476f04-26d2-417a-a4fe-26a5aa3e0ae4',status:'dispatching',action:{kind:'equip',selected},executionBinding:{provider:'soft-and-wet-native-head',contract:'head-equip-b88c4356f472',contextNonce:'123e4567-e89b-42d3-a456-426614174000',requestDigest:digest}};
  const client={send(){throw Error('CDP must not be reached')},evaluate(){throw Error('CDP must not be reached')}};
  await assert.rejects(native.recoverClosed(client,{...effect,executionBinding:{...effect.executionBinding,contract:'another-contract'}},before),/binding unavailable/);
  await assert.rejects(native.recoverClosed(client,effect,{...before,money:before.money+1}),/binding unavailable/);
});
test('page recovery checker rejects stale binding, queued refresh and wrong original delta', async () => {
  const f=fixture(),pending=f.run();f.tick();f.tick();assert.equal((await pending).ok,true);
  f.context.records[f.args.attemptId]={...f.context.records[f.args.attemptId],status:'started'};
  assert.equal(f.recoveryCheck().ok,true,'closed original result is recognized');
  f.context.nonce='wrong';assert.equal(f.recoveryCheck().ok,false);f.context.nonce=f.args.binding.contextNonce;
  assert.equal(f.recoveryCheck({expected:{attemptId:f.args.attemptId,binding:{...f.args.binding,requestDigest:'wrong'}}}).ok,false);
  f.wardrobe.refreshQueued=true;assert.equal(f.recoveryCheck().ok,false);f.wardrobe.refreshQueued=false;
  f.state.variables.wardrobe.head.push({variable:'unexpected'});assert.equal(f.recoveryCheck().ok,false);f.state.variables.wardrobe.head.pop();
  f.state.variables.worn.head={variable:'unexpected'};assert.equal(f.recoveryCheck().ok,false);
});
test('partial result, stale UI, fallback and ownership conflict stay started without replay', async () => {
  for (const options of [{ staleUi: true }, { fallback: true }, { replacedMethod: true }, { detachedError: true }, { originalThrow: true }, { secondCall: true }, { reenter: true }, { ownerReplacement: true }, { operation: 'unequip', previous: 'beanie', detachedError: true }, { previous: 'beanie', lostOld: true }, { delta: -1 }, { domConflict: true }]) {
    const f = fixture(options);
    const pending=f.run();while(f.stats().pendingFrames)f.tick();
    assert.equal((await pending).ok, false); assert.equal(f.context.records[f.args.attemptId].status, 'started');
    if (options.staleUi) assert.equal(f.context.records[f.args.attemptId].phase,'business-returned');
    if (options.fallback) assert.equal(f.context.records[f.args.attemptId].phase,'refresh-observed');
    assert.equal((await f.run()).ok, false); assert.equal(f.stats().calls, 1);
    if (options.domConflict) assert.equal(f.stats().id, 'other-owner-id', 'must not overwrite another owner');
    if (options.ownerReplacement) assert.equal(f.stats().externalOwner,true,'must not overwrite an external replacement');
  }
});
test('missing Y queue never settles or dispatches twice', async () => {
  const f=fixture({noRefresh:true});
  assert.equal((await f.run()).ok,false);assert.equal(f.context.records[f.args.attemptId].status,'started');
  assert.equal((await f.run()).ok,false);assert.equal(f.stats().calls,1);
});
test('page promise closes the receipt even when the host drops its acknowledgement', async () => {
  const f=fixture();
  f.run(); // Deliberately discard the returned Promise as a disconnected host would.
  assert.equal(f.context.records[f.args.attemptId].status,'started');
  f.tick();f.tick();
  await Promise.resolve();
  assert.equal(f.context.records[f.args.attemptId].status,'terminal');
  assert.equal(f.stats().restored,true);
  assert.equal((await f.run()).ok,false);
  assert.equal(f.stats().calls,1);
});

test('attestation mode never initializes receipts or executes; a binding cleanup failure retains its classification', async t => {
  const Module=require('node:module'),mapping=require('../integrations/soft-and-wet/gameplay.cjs'),load=Module._load;
  t.mock.method(Module,'_load',function(id,...args){return id==='./native-head-profile.json'?{id:'fixture',widgets:[],functionMacros:[],coreFunctions:[],wikifierMembers:[]}:load.call(this,id,...args)});
  t.mock.method(mapping,'prepare',async()=>({action:{type:'web-click',selector:'#choice'},objectIds:['original-item'],arguments:[],source:'',interpretation:{}}));
  const request={type:'sw-wardrobe',operation:'equip',slot:'head',variable:'hairpin',colour:'black'};
  for(const fail of [false,true]) {
    const calls=[],client={async evaluate(source){calls.push(source);return{status:'available'}},async send(method){calls.push(method);if(fail&&method==='Runtime.releaseObjectGroup')throw Error('release unavailable');return{}}};
    if(fail)await assert.rejects(native.prepare(client,request,'223e4567-e89b-42d3-a456-426614174000',{attestOnly:true}),e=>e.code==='NATIVE_BINDING_CLEANUP_FAILED'&&e.bindingCleanup==='failed');
    else await assert.rejects(native.prepare(client,request,'223e4567-e89b-42d3-a456-426614174000',{attestOnly:true}),e=>e.code==='MAPPING_UNAVAILABLE'&&e.cause?.message==='Native UI profile unavailable');
    assert.equal(calls.filter(c=>c==='Runtime.releaseObjectGroup').length,1);
    assert.equal(calls.filter(c=>c==='Runtime.releaseObject').length,1);
    assert.equal(calls.some(c=>c.includes(receipts.namespace)),false);
    await assert.rejects(native.prepare(client,request,'223e4567-e89b-42d3-a456-426614174000'),e=>e.code==='MAPPING_UNAVAILABLE');
  }
});

test('native preguard rejects defined falsey linked-item metadata before original undress can consume the old item', () => {
  const old = {variable:'beanie',name:'beanie',type:['normal']}, item = {variable:'hairpin',name:'hairpin',type:['normal']};
  const v = {options:{maplebirch:{npcsidebar:{pet:{enabled:false}},character:{pet:{enabled:false}}}},wardrobe_location:'wardrobe',wardrobe:{head:[item]},wardrobes:{wardrobe:{}},worn:{head:old},wear_outfit:'none',delete_outfit:'none',runWardrobeSanityChecker:false,clothingShop:{stolenClothes:0}};
  const state = {variables:v,temporary:{}};
  const globals = {window:{V:v,SugarCube:{State:state},setup:{wardrobeSkip:['naked']},DolOptimization:{wornStackingStattedSlots:new Set()}}};
  for (const target of [old,item]) for (const field of ['outfitPrimary','outfitSecondary']) {
    for (const value of [null,false,0]) {
      target[field]=value;
      const result=vm.runInNewContext(`(${native.stateReader.toString()})({operation:'equip'},()=>({status:'available',uiVersion:'2.2.2',index:0}),[])`,globals);
      assert.equal(result.reason,'native-simple-head-branch-unavailable');
    }
    delete target[field];
  }
  item.type.push('constricting');
  assert.equal(vm.runInNewContext(`(${native.stateReader.toString()})({operation:'equip'},()=>({status:'available',uiVersion:'2.2.2',index:0}),[])`,globals).reason,'native-simple-head-branch-unavailable');
  for(const display of [v.options.maplebirch.npcsidebar.pet,v.options.maplebirch.character.pet]) {
    display.enabled=true;
    assert.equal(vm.runInNewContext(`(${native.stateReader.toString()})({operation:'equip'},()=>({status:'available',uiVersion:'2.2.2',index:0}),[])`,globals).reason,'native-display-tail-profile-unavailable');
    display.enabled=false;
  }
});
