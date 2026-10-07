const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const site = require('../scripts/lib/game-dol-provider.cjs');
const semantic = require('../scripts/lib/game-semantic.cjs');

function fixture(t, variant = '') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'dol-semantic-'));
  t.after(() => {
    assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir()) + path.sep));
    fs.rmSync(directory, { recursive: true, force: true });
  });
  const state = { passage: variant === 'unsupported' ? 'Hallways' : variant === 'already' ? 'Wardrobe' : 'Bedroom', turns: 12,
    variables: { timeStamp: 123456, location: variant === 'unsupported' ? 'school' : 'home' } };
  for (const name of ['money', 'wardrobe', 'worn']) Object.defineProperty(state.variables, name, variant.startsWith('scroll-') && name === 'money' ? { value: 500, writable: true } : { get() { throw Error('Private business state must not be read'); } });
  let forwarded = false, clicks = 0, released = 0, closed = false, hit = true, disabled = variant === 'scroll-disabled', scrolled = false, scrolls = 0;
  class Element {
    isConnected = true;
    tagName = 'A';
    getAttribute(name) { return name === 'href' ? null : name === 'aria-label' ? 'original decision'.repeat(variant === 'many' ? 20 : 1) : this === node ? 'Wardrobe' : variant === 'mismatch' ? 'Other' : state.passage; }
    querySelectorAll() { return variant === 'many' ? Array(70).fill(node) : variant === 'hidden' ? Array(520).fill(node) : [node]; }
    getClientRects() { return [this.getBoundingClientRect()]; }
    getBoundingClientRect() { return { left: 10, top: this === node && variant.startsWith('scroll-') && !scrolled ? 900 : 10, width: this === node && (variant === 'hidden' || variant === 'scroll-hidden') ? 0 : 80, height: 30 }; }
    matches() { return this === node && disabled; }
    closest(selector) { return this === node && selector.includes('#passages') ? root : null; }
    contains(n) { return n === this || this === root && n === node; }
    click() { clicks++; state.passage = 'Wardrobe'; state.turns++; root = new Element(); }
  }
  let root = new Element(); const node = new Element();
  const html = new Element();html.classList={contains:()=>false};html.children=[root];root.parentElement=html;root.children=[node];node.parentElement=root;
  const globals = { window: { SugarCube: { State: state } }, HTMLElement: Element, innerWidth: 400, innerHeight: 700,
    getComputedStyle: element => ({ display: 'block', visibility: 'visible', opacity: element === root && (variant === 'fade-in' || variant === 'scroll-ancestor-hidden' || variant === 'scroll-ancestor-fades' && scrolled) ? '0' : '1', pointerEvents: 'auto' }),
    document: {
      documentElement: html,
      querySelector: () => root,
      querySelectorAll: selector => selector === '#passages > .passage' ? [root] : selector === '.dgu-surface, [aria-modal="true"]' && variant === 'scroll-ambiguous-overlay' ? [new Element(),new Element()] : selector.startsWith('html > ') ? [node] : selector.includes('data-passage="Wardrobe"') ?
        (state.passage === 'Bedroom' ? variant === 'ambiguous' ? [node, node] : [node] : []) : [],
      elementFromPoint: () => hit && variant !== 'scroll-occluded' ? node : new Element(),
    } };
  const client = {
    isOpen: () => !closed, close() { closed = true; },
    evaluate: async expression => vm.runInNewContext(expression, globals),
    async send(method, params) {
      if (method === 'Runtime.evaluate') { client.bound = params.expression.includes('querySelectorAll') ? node : root; return { result: { objectId: 'bound-root' } }; }
      if (method === 'DOM.scrollIntoViewIfNeeded') { scrolls++;if(variant==='scroll-error')throw Error('Scroll failed');scrolled=true;if(variant==='scroll-scene')state.variables.location='town';return {}; }
      if (method === 'Runtime.releaseObject') { released++; return {}; }
      if (method !== 'Runtime.callFunctionOn') return {};
      if (params.functionDeclaration.includes('observedRoot')) {
        if (variant === 'overlay') hit = false;
        if (variant === 'disabled') disabled = true;
        if (variant === 'drift') state.variables.timeStamp++;
        if (variant === 'scroll-guard-scene') state.variables.location='town';
        if (variant === 'replace') root = new Element();
      }
      const value = vm.runInNewContext(`(${params.functionDeclaration})`, globals).call(client.bound);
      if (variant === 'disconnect' && clicks) throw Error('Lost acknowledgement');
      return { result: { value } };
    },
  };
  const adb = async (...args) => {
    const cmd = args.join(' ');
    if (cmd === 'get-state') return Buffer.from('device');
    if (cmd === 'shell am get-current-user') return Buffer.from('0');
    if (cmd.startsWith('shell dumpsys package')) return Buffer.from('Package [com.example.game]\n versionName=1.0 versionCode=1\n User 0: installed=true');
    if (cmd === 'shell pidof com.example.game') return Buffer.from('123');
    if (cmd === 'shell cat /proc/net/unix') return Buffer.from('@webview_devtools_remote_123');
    if (cmd.includes('dumpsys activity')) return Buffer.from('mResumedActivity: ActivityRecord{ u0 com.example.game/.Main }');
    if (cmd.includes('dumpsys window displays')) return Buffer.from('mCurrentFocus=Window{ u0 com.example.game/.Main }');
    if (cmd === 'forward tcp:0 localabstract:webview_devtools_remote_123') { forwarded = true; return Buffer.from('55555'); }
    if (cmd === 'forward --list') return Buffer.from(forwarded ? 'test-device tcp:55555 localabstract:webview_devtools_remote_123\n' : '');
    if (cmd === 'forward --remove tcp:55555') forwarded = false;
    return Buffer.alloc(0);
  };
  return { options: { serial: 'test-device', package: 'com.example.game', out: path.join(directory, 'result'), testEnvironment: true },
    overrides: { adb, connect: async () => client },
    state, globals, stats: () => ({ clicks, released, forwarded, closed, ...(variant.startsWith('scroll-') ? {scrolls} : {}) }) };
}

test('private Gameplay narrative is bounded and excludes forms/save lists and input values',async t=>{
  const f=fixture(t);f.options.gameplay=true;
  const hidden={parentElement:{closest:()=>({})},get textContent(){throw Error('Forbidden context read')}};
  const parent={closest:()=>null};
  const texts=[hidden,{parentElement:parent,textContent:'A normal unexpected event.'},{parentElement:parent,textContent:'x'.repeat(3000)}];
  f.globals.document.createTreeWalker=()=>({nextNode:()=>texts.shift()||null});
  const r=await site.observe(f.options,f.overrides);assert.equal(r.status,'observed');assert.equal(r.gameplay.narrative.length,2048);assert.equal(r.gameplay.narrativeTruncated,true);assert.match(r.gameplay.narrative,/normal unexpected event/);assert.equal(f.stats().clicks,0);
});

test('SugarCube whitespace does not consume narrative context while traversal remains finite',async t=>{
  const f=fixture(t);f.options.gameplay=true;
  const parent={closest:()=>null};let reads=0;
  let texts=[...Array.from({length:600},()=>({parentElement:parent,textContent:' \n\t '})),{parentElement:parent,textContent:'Continue through the orphanage.'}];
  f.globals.document.createTreeWalker=()=>({nextNode:()=>{reads++;return texts.shift()||null}});
  const first=await site.observe(f.options,f.overrides);
  assert.equal(first.gameplay.narrative,'Continue through the orphanage.');assert.equal(first.gameplay.narrativeTruncated,false);
  texts=Array.from({length:5000},()=>({parentElement:parent,textContent:' '}));reads=0;
  const bounded=await site.observe({...f.options,out:path.join(path.dirname(f.options.out),'bounded')},f.overrides);
  assert.equal(bounded.gameplay.narrative,'');assert.equal(bounded.gameplay.narrativeTruncated,true);assert.equal(reads,4097);assert.equal(f.stats().clicks,0);
});

test('read-only observation projects only allowed original scene metadata, independent of optional UI', async t => {
  const f = fixture(t);
  const connect = f.overrides.connect;
  const enabled = [];
  f.overrides.connect = async (...args) => {
    const client = await connect(...args), send = client.send;
    client.send = (method, ...rest) => {
      if (method.endsWith('.enable')) enabled.push(method);
      return send.call(client, method, ...rest);
    };
    return client;
  };
  const r = await site.observe(f.options, f.overrides);
  assert.deepEqual(enabled, [], 'observation must not enable CDP capture domains');
  assert.equal(r.status, 'observed'); assert.deepEqual(r.observation.availableActions, ['open-wardrobe']);
  assert.equal(r.actions, false); assert.equal(f.stats().clicks, 0); assert.equal(f.stats().forwarded, false);
  const saved = fs.readFileSync(path.join(f.options.out, 'semantic.json'), 'utf8');
  assert.equal(saved.includes('123456'), false); assert.equal(saved.includes('wardrobe"'), true);
  assert.throws(() => site.project({ passage: 'Bedroom', matches: true, blocked: false, links: 1, location: 'home' }));
  delete f.globals.window.SugarCube;
  const unknown = site.project(vm.runInNewContext(site.expression(), f.globals));
  assert.equal(unknown.passage, 'unknown'); assert.equal(unknown.originalStateReadable, false);
  assert.deepEqual(unknown.availableActions, []);
});

test('semantic goal uses the shared Action/Journey then checks original Wardrobe passage, releasing its binding', async t => {
  const f = fixture(t); const r = await site.openWardrobe(f.options, f.overrides);
  assert.equal(r.status, 'completed'); assert.equal(r.dispatch, 'acknowledged'); assert.equal(r.after.passage, 'Wardrobe');
  assert.deepEqual(f.stats(), { clicks: 1, released: 1, forwarded: false, closed: true });
  const manifest = JSON.parse(fs.readFileSync(path.join(f.options.out, 'manifest.json'), 'utf8'));
  assert.equal(manifest.status, 'complete'); assert.equal(manifest.incidentId, r.incidentId);
});

test('unsupported or ambiguous scenes do not click; bound root replacement, overlay and original-state drift stop dispatch', async t => {
  for (const variant of ['unsupported', 'ambiguous', 'mismatch', 'overlay', 'drift', 'replace', 'disabled']) {
    const f = fixture(t, variant); const r = await site.openWardrobe(f.options, f.overrides);
    assert.equal(r.status, ['unsupported', 'ambiguous', 'mismatch'].includes(variant) ? 'unsupported' : 'replan-required');
    assert.equal(r.dispatch, 'not-dispatched'); assert.equal(f.stats().clicks, 0); assert.equal(f.stats().forwarded, false);
    const manifest = JSON.parse(fs.readFileSync(path.join(f.options.out, 'manifest.json'), 'utf8'));
    if (r.reason === 'guard-rejected') assert.equal(manifest.steps[0].outcome, 'not dispatched; guard rejection acknowledged');
  }
});

test('lost acknowledgement preserves unknown without retry; static planning never connects and execution requires test scope', async t => {
  const f = fixture(t, 'disconnect'); const r = await site.openWardrobe(f.options, f.overrides);
  assert.equal(r.status, 'outcome-undetermined'); assert.equal(r.dispatch, 'unknown'); assert.equal(f.stats().clicks, 1);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.options.out, 'manifest.json'), 'utf8'));
  assert.match(manifest.steps[0].outcome, /unknown/);
  const p = fixture(t); let calls = 0;
  const planned = await site.openWardrobe({ ...p.options, plan: true }, { adb: async () => { calls++; throw Error('No device calls'); } });
  assert.equal(planned.status, 'planned'); assert.equal(calls, 0);
  const u = fixture(t);
  await assert.rejects(site.openWardrobe({ ...u.options, testEnvironment: false }, u.overrides), /test environment/);
  assert.equal(fs.existsSync(u.options.out), false);
});

test('already in original Wardrobe is a no-op and uncertain forward allocation never claims successful cleanup', async t => {
  const f = fixture(t, 'already'); const r = await site.openWardrobe(f.options, f.overrides);
  assert.equal(r.status, 'completed'); assert.equal(r.dispatch, 'not-required'); assert.equal(f.stats().clicks, 0);
  const failed = fixture(t); let removals = 0;
  const adb = failed.overrides.adb;
  const capture = await site.observe(failed.options, { ...failed.overrides, adb: async (...args) => {
    if (args[0] === 'forward' && args[1] === 'tcp:0') throw Error('Allocation acknowledgement lost');
    if (args[0] === 'forward' && args[1] === '--remove') removals++;
    return adb(...args);
  } });
  assert.equal(capture.status, 'failed'); assert.equal(removals, 0);
  assert.ok(capture.cleanup.some(c => c.status === 'failed' && c.reason.startsWith('ownership-unknown')));
});

test('experimental CLI validates its options and static semantic plan without touching a device', async t => {
  const f = fixture(t); const { main } = require('../scripts/dol-dev.cjs');
  await assert.rejects(main(['game-observe', '--endpoint', 'http://127.0.0.1:1', '--out', f.options.out]), /Unknown/);
  await assert.rejects(main(['game-open-wardrobe', '--test-environment', 'no']), /Invalid test/);
  await main(['game-open-wardrobe', '--serial', f.options.serial, '--package', f.options.package, '--out', f.options.out, '--plan']);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.options.out, 'semantic.json'), 'utf8')).status, 'planned');
});

test('explicit gameplay observation reads bounded private choices from a novel scene without treating it as failure', async t => {
  const f = fixture(t, 'unsupported');
  const r = await site.observe({ ...f.options, gameplay: true }, f.overrides);
  assert.equal(r.status, 'observed'); assert.equal(r.observation.passage, 'Hallways');
  assert.equal(r.gameplay.passage, 'Hallways'); assert.equal(r.gameplay.domAgrees, true);
  assert.equal(r.requiresPrivateReview, true); assert.equal(r.gameplay.choices[0].label, 'original decision');
  assert.equal(f.stats().clicks, 0);
  const many = fixture(t, 'many');
  const limited = await site.observe({ ...many.options, gameplay: true }, many.overrides);
  assert.equal(limited.gameplay.choices.length, 64); assert.equal(limited.gameplay.candidateControls, 70); assert.equal(limited.gameplay.scannedControls, 64);
  assert.equal(limited.gameplay.choicesTruncated, true); assert.equal(limited.gameplay.choices[0].labelTruncated, true);
  assert.equal(limited.gameplay.choices[0].label.length, 160);
  const hidden = fixture(t, 'hidden');
  const scanned = await site.observe({ ...hidden.options, gameplay: true }, hidden.overrides);
  assert.equal(scanned.gameplay.choices.length, 0); assert.equal(scanned.gameplay.scannedControls, 512);
  assert.equal(scanned.gameplay.choicesTruncated, true); // An empty truncated projection is not absence.
  const invalid = fixture(t); const { main } = require('../scripts/dol-dev.cjs');
  await assert.rejects(main(['game-observe', '--gameplay', 'no']), /Invalid gameplay/);
  assert.equal(fs.existsSync(invalid.options.out), false);
});

test('offscreen native control uses one guarded scroll preparation before the existing click',async t=>{
  const native=require('../scripts/lib/game-native-provider.cjs');
  const f=fixture(t,'scroll-ok');
  const observed=await site.observe({...f.options,out:path.join(path.dirname(f.options.out),'scene'),gameplay:true},f.overrides);
  const scene=observed.gameplay;
  assert.equal(scene.choices[0].centerActionable,false);assert.equal(scene.choices[0].scrollEligible,true);
  const [candidate]=native.candidates(scene,'epoch');assert.equal(candidate.selected.type,'web-click');
  const result=await site.act(f.options,candidate.selected,'navigation',{...f.overrides,expectedScene:scene});
  assert.equal(result.status,'observed');assert.equal(result.dispatch,'acknowledged');
  assert.deepEqual(result.viewportPreparation,{scroll:1,gameActions:0,status:'completed'});
  assert.equal(f.stats().scrolls,1);assert.equal(f.stats().clicks,1);
});

test('fade-in ancestor never yields a center-actionable native candidate',async t=>{
  const native=require('../scripts/lib/game-native-provider.cjs');
  const f=fixture(t,'fade-in');
  const observed=await site.observe({...f.options,gameplay:true},f.overrides);
  assert.equal(observed.gameplay.choices[0].centerActionable,false);
  assert.equal(native.candidates(observed.gameplay,'epoch').length,0);
  assert.equal(f.stats().clicks,0);
});

test('offscreen preparation rejects disabled, hidden, occluded, changed Scene and CDP errors before click',async t=>{
  const native=require('../scripts/lib/game-native-provider.cjs');
  for(const variant of ['scroll-disabled','scroll-hidden','scroll-ancestor-hidden','scroll-ambiguous-overlay','scroll-occluded','scroll-ancestor-fades','scroll-scene','scroll-error','scroll-guard-scene']){
    const f=fixture(t,variant);
    const observed=await site.observe({...f.options,out:path.join(path.dirname(f.options.out),'scene'),gameplay:true},f.overrides);
    const scene=observed.gameplay;
    const candidates=native.candidates(scene,'epoch');
    if(['scroll-disabled','scroll-hidden','scroll-ancestor-hidden','scroll-ambiguous-overlay'].includes(variant))assert.equal(candidates.length,0,variant);
    else assert.equal(candidates.length,1,variant);
    const selected={type:'web-click',selector:scene.choices[0]?.selector || 'html > a:nth-child(1) > a:nth-child(1)'};
    const result=await site.act(f.options,selected,'navigation',{...f.overrides,expectedScene:scene});
    assert.equal(result.dispatch,'not-dispatched',variant);assert.equal(f.stats().clicks,0,variant);
    assert.equal(f.stats().scrolls,['scroll-occluded','scroll-ancestor-fades','scroll-scene','scroll-error','scroll-guard-scene'].includes(variant)?1:0,variant);
    if(f.stats().scrolls&&variant!=='scroll-guard-scene')assert.equal(result.reason,'viewport-preparation-failed',variant);
  }
});

test('prepared capabilities resolve their current control in the site Provider without a raw Goal selector',async t=>{
  const f=fixture(t),selector='html > a:nth-child(1) > a:nth-child(1)',queries=[];
  const connect=f.overrides.connect;
  f.overrides.connect=async()=>{const client=await connect(),send=client.send;client.send=async(method,params)=>{
    if(method==='Runtime.evaluate')queries.push(params.expression);
    return send.call(client,method,params);
  };return client};
  let prepared=0,reserved=0,bound=0;
  const result=await site.act(f.options,null,'navigation',{...f.overrides,
    prepareAction:async()=>{prepared++;return{action:{type:'web-click',selector},executionBinding:{provider:'fixture'}}},
    bindExecution:()=>bound++,reserve:()=>reserved++});
  assert.equal(result.dispatch,'acknowledged');assert.equal(f.stats().clicks,1);
  assert.equal(prepared,1);assert.equal(reserved,1);assert.equal(bound,1);
  assert.equal(queries.length,1);assert.ok(queries[0].includes(selector));
  assert.ok(Object.isFrozen(semantic.intents));assert.ok(semantic.intents.includes('navigation'));
});

test('missing, failed or invalid capability resolution never falls back to clicking the site root',async t=>{
  const absent=fixture(t);
  await assert.rejects(site.act(absent.options,null,'navigation',absent.overrides));
  assert.equal(fs.existsSync(absent.options.out),false);assert.equal(absent.stats().clicks,0);
  for(const resolve of [async()=>null,async()=>({action:{type:'web-click',selector:''}}),async()=>({action:{type:'restart'}}),async()=>{throw Error('Provider unavailable')}]){
    const f=fixture(t);let reserved=0;
    const result=await site.act(f.options,null,'navigation',{...f.overrides,prepareAction:resolve,reserve:()=>reserved++});
    assert.equal(result.dispatch,'not-dispatched');assert.equal(f.stats().clicks,0);assert.equal(reserved,0);
    assert.equal(f.stats().forwarded,false);assert.equal(f.stats().closed,true);
  }
});
