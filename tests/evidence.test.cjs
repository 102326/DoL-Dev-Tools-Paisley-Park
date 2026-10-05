const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { evidence } = require('../scripts/lib/evidence.cjs');
const collectors = require('../scripts/lib/collectors.cjs');
const { snapshot, diff } = require('../scripts/lib/dom.cjs');
const { memory, frames } = require('../scripts/lib/performance.cjs');
const integration = require('../integrations/soft-and-wet/index.cjs');

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dol-evidence-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}
const options = out => ({ serial: 'offline-device', package: 'com.example.game', out, scope: '.hud', windowMs: 0 });
function stubs(overrides = {}) {
  return {
    device: async ctx => { ctx.deviceReady = true; return { model: 'test' }; },
    app: async ctx => { ctx.appPid = '123'; return { versionName: '1' }; },
    screenshot: async () => ({ binary: Buffer.from('png'), extension: 'png', metadata: { width: 1, height: 1 } }),
    gfx: async () => ({ sampledFrames: 0 }), mem: async () => ({ pssKb: 1 }),
    forward: async ctx => { ctx.endpoint = 'http://127.0.0.1:1'; ctx.forwardPort = '1'; return { forwarded: true }; },
    cdp: async ctx => { ctx.client = { close() {} }; ctx.channels = { Runtime: 'available', Network: 'available' }; ctx.capture = { snapshot: () => ({ console: [], network: [], omittedConsole: 0, omittedNetwork: 0 }) }; return { channels: ctx.channels }; },
    webview: async () => ({ product: 'offline' }), versions: async () => ({ gameVersion: '1' }),
    dom: async () => ({ schemaVersion: 1, nodes: [] }),
    ...overrides,
  };
}

test('Evidence is complete without optional Soft & Wet integration', async t => {
  const root = fixture(t);
  const manifest = await evidence(options(path.join(root, 'complete')), { collectors: stubs(), adb: async () => Buffer.alloc(0) });
  assert.equal(manifest.status, 'complete');
  assert.equal(manifest.steps.some(step => step.name.startsWith('integration-')), false);
});

test('native layout helper selection is required before output or collector side effects',async t=>{
 const root=fixture(t);let calls=0;
 for(const selection of [{profile:'layout'},{layout:true}]){
  const out=path.join(root,selection.profile||'selected');
  await assert.rejects(evidence({...options(out),...selection},{collectors:stubs({device:async()=>{calls++;return {}}})}),/helper/);
  assert.equal(fs.existsSync(out),false);
 }
 assert.equal(calls,0);
});

test('explicit timeline failures preserve their artifact and reject invalid options before output', async t => {
  const root=fixture(t),out=path.join(root,'timeline');
  await assert.rejects(evidence({...options(out),scope:undefined,timelineMs:20},{collectors:stubs()}));
  assert.equal(fs.existsSync(out),false);
  const manifest=await evidence({...options(out),timelineMs:20},{adb:async()=>Buffer.alloc(0),collectors:stubs({timeline:async()=>({schemaVersion:1,source:'timeline',records:[],collectorStatus:'failed',reason:'timeline-cleanup-conflict'})})});
  assert.equal(manifest.status,'partial');
  assert.equal(manifest.steps.find(s=>s.name==='timeline').status,'failed');
  assert.equal(fs.existsSync(path.join(out,'timeline.json')),true);
});

test('optional integration errors do not block Generic evidence', async t => {
  const root = fixture(t);
  const broken = { describe: () => { throw Error('secret input'); }, detect: async () => { throw Error('secret input'); }, collect: async () => ({}), redact: x => x };
  const manifest = await evidence(options(path.join(root, 'optional-error')), { collectors: stubs(), adb: async () => Buffer.alloc(0), integrations: [broken] });
  assert.equal(manifest.steps.find(step => step.name === 'integration-0').status, 'failed');
  assert.ok(fs.existsSync(path.join(root, 'optional-error', 'webview.json')));
  assert.equal(manifest.status, 'complete');
});

test('Soft & Wet probe reports only supported safe summaries', async () => {
  async function probe(ui) {
    const expressions = [];
    const ctx = { client: { evaluate: async expression => { expressions.push(expression); return vm.runInNewContext(expression, { window: { DoLGameUI: ui ? { ui } : undefined } }); } } };
    const status = await integration.detect(ctx);
    const summary = status === 'available' ? await integration.collect(ctx) : { status };
    return { summary, source: expressions.join('\n') };
  }
  assert.equal((await probe(null)).summary.status, 'unavailable');
  assert.equal((await probe({ apiVersion: 9, getCapabilities() { return {}; } })).summary.status, 'unsupported');
  assert.equal((await probe({ apiVersion: 1, getCapabilities() { return { enabled: true }; }, getDiagnostics() { return { schemaVersion: 2 }; } })).summary.status, 'unsupported');
  const basic = await probe({ apiVersion: 1, getCapabilities() { return { enabled: true, visualTier: 'Fancy' }; } });
  assert.equal(basic.summary.status, 'available');
  assert.equal(basic.summary.runtimeSnapshotAvailable, false);
  const privateId = 'private-selector-991', privateEvent = 'private-event-882';
  const detailed = await probe({ apiVersion: 1, getCapabilities() { return { enabled: true, visualTier: 'Balanced' }; }, getDiagnostics() { return {
    schemaVersion: 1,
    adapters: [{ selector: privateId, event: privateEvent, fingerprint: privateId, status: 'active', match: 'full', reason: 'matched', mappings: [{ role: 'title', selector: privateId, reason: privateEvent }] }],
    events: [{ message: privateEvent }], surfaces: [{ kind: 'modal', source: 'Runtime' }],
  }; } });
  const encoded = JSON.stringify(detailed.summary);
  assert.equal(detailed.summary.status, 'available');
  assert.equal(encoded.includes(privateId), false);
  assert.equal(encoded.includes(privateEvent), false);
});

test('WebView forwarding verifies the current PID socket and requests a dynamic port', async () => {
  async function invoke({ pid = '123', socket = 'webview_devtools_remote_123', forwarded = '54321', webviewSocket } = {}) {
    const calls = [];
    const adb = async (...args) => {
      calls.push(args);
      if (args[0] === 'shell' && args[1] === 'pidof') return Buffer.from(pid);
      if (args[0] === 'shell' && args[1] === 'cat') return Buffer.from(`@${socket}\n`);
      if (args[0] === 'forward') return Buffer.from(forwarded);
      throw Error(`unexpected adb call: ${args.join(' ')}`);
    };
    const ctx = { adb, appPid: '123', options: { package: 'com.example.game', webviewSocket } };
    try { await collectors.forward(ctx); return { ctx, calls }; } catch (error) { return { error, calls }; }
  }
  assert.equal((await invoke({ pid: '456' })).error.message, 'App process changed');
  assert.equal((await invoke({ socket: 'webview_devtools_remote_456' })).error.message, 'App WebView socket unavailable');
  assert.ok((await invoke({ socket: 'browser_webview_devtools_remote_123' })).ctx);
  const both = 'webview_devtools_remote_123\n@browser_webview_devtools_remote_123';
  assert.equal((await invoke({ socket: both })).error.message, 'App WebView socket unavailable');
  assert.ok((await invoke({ socket: both, webviewSocket: 'browser_webview_devtools_remote_123' })).ctx);
  const { ctx, calls } = await invoke();
  assert.equal(ctx.endpoint, 'http://127.0.0.1:54321');
  assert.ok(calls.some(args => args[0] === 'forward' && args[1] === 'tcp:0' && args[2] === 'localabstract:webview_devtools_remote_123'));
  assert.equal(calls.some(args => args[0] === 'forward' && args[1] === 'tcp:54321'), false);
});

test('required collector failure leaves partial evidence and refuses overwrite', async t => {
  const root = fixture(t), out = path.join(root, 'partial');
  const manifest = await evidence(options(out), { collectors: stubs({ webview: async () => { throw Object.assign(Error('private text'), { code: 'EFAIL' }); } }), adb: async () => Buffer.alloc(0) });
  assert.equal(manifest.status, 'partial');
  assert.ok(fs.existsSync(path.join(out, 'screenshot.png')));
  const saved = fs.readFileSync(path.join(out, 'screenshot.png'));
  assert.equal(manifest.steps.find(step => step.name === 'webview').errorContent, 'omitted');
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(path.join(out, 'manifest.json'), 'utf8')));
  await assert.rejects(evidence(options(out), { collectors: stubs(), adb: async () => Buffer.alloc(0) }), { code: 'EEXIST' });
  assert.deepEqual(fs.readFileSync(path.join(out, 'screenshot.png')), saved);
});

test('structured, console and network evidence omit credentials, input, console text and URL query', () => {
  const { redact } = require('../scripts/lib/privacy.cjs');
  const safe = redact({ token: 'secret-token', inputValue: 'player text', message: 'Bearer abc123', ok: true });
  assert.deepEqual(JSON.parse(JSON.stringify(safe)), { message: '[credential]', ok: true });
  const capture = collectors.events();
  capture.onEvent('Runtime.consoleAPICalled', { type: 'error', timestamp: 1, args: [{ value: 'private console body' }] });
  capture.onEvent('Network.requestWillBeSent', { requestId: 'r', request: { url: 'https://example.test/private?token=secret', method: 'GET' }, type: 'Fetch', timestamp: 2, wallTime: 3 });
  const result = capture.snapshot();
  assert.equal(result.console[0].content, 'omitted');
  assert.equal(JSON.stringify(result).includes('private console body'), false);
  assert.equal(JSON.stringify(result).includes('secret'), false);
  assert.equal(result.network[0].path, '[omitted]');
});

test('DOM snapshot stays scoped, avoids text/value getters, and diff reports changes and truncation', () => {
  const node = (tag, id = '', classes = [], data = [], children = []) => ({ tagName: tag, id, classList: classes, attributes: data.map(name => ({ name })), hasAttribute: () => false, children,
    get textContent() { throw Error('must not read text'); }, get value() { throw Error('must not read input'); } });
  const beforeRoot = node('SECTION', 'hud', ['panel'], ['data-state'], [node('BUTTON', 'start')]);
  const outside = node('MAIN', '', [], [], [node('INPUT', 'secret')]);
  const run = root => vm.runInNewContext(`(${snapshot.toString()})('.hud')`, { document: { querySelectorAll: () => [root] }, innerWidth: 800, innerHeight: 600 });
  const before = run(beforeRoot), after = run(node('SECTION', 'hud', ['panel'], ['data-state'], [node('BUTTON', 'continue'), node('P', 'note')]));
  assert.equal(before.nodes.length, 2);
  assert.equal(before.nodes.some(n => n.tag === 'input'), false);
  assert.equal(outside.children[0].id, 'secret');
  const changes = diff(before, after).changes;
  assert.ok(changes.some(change => change.address === '0/0' && change.fields.includes('id')));
  assert.ok(changes.some(change => change.address === '0/1' && change.kind === 'added'));
  const many = node('SECTION', 'hud', ['panel'], [], Array.from({ length: 520 }, (_, i) => node('SPAN', String(i))));
  const limited = run(many);
  assert.equal(limited.nodes.length, 500);
  assert.equal(limited.truncated, true);
});

test('performance parsers read memory totals and frame timing percentiles', () => {
  assert.deepEqual(memory('TOTAL PSS: 123 kB\nTOTAL RSS: 456 kB\n'), { pssKb: 123, rssKb: 456, leakDiagnosis: 'not-inferred' });
  const csv = 'Flags,IntendedVsync,FrameCompleted\n0,1000000,1100000\n0,2000000,2200000\n0,3000000,3600000\n';
  const result = frames(`Total frames rendered: 3\nJanky frames: 1\n${csv}`);
  assert.equal(result.sampledFrames, 3);
  assert.equal(result.medianMs, 0.2);
  assert.equal(result.p95Ms, 0.6);
  assert.throws(() => memory('unrecognized'), /Unrecognized/);
  assert.throws(()=>memory('TOTAL PSS: 999999999999999999999 kB'),/Unrecognized/);
});
