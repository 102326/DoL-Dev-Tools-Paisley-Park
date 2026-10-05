const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { collect } = require('../scripts/lib/integration.cjs');
const { evidence } = require('../scripts/lib/evidence.cjs');
const { support } = require('../scripts/lib/support.cjs');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dol-public-integration-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return { root, module(name, source) { const filename = path.join(root, `${name}.cjs`); fs.writeFileSync(filename, source); return filename; } };
}
const entry = overrides => `module.exports={contractVersion:1,describe:()=>({name:'example-mod',version:'1.2.3'}),detect:()=> 'available',collect:()=>({status:'available'}),redact:value=>value,${overrides}};`;
test('public modules report absence/unknown contract and validate hooks and post-redaction status', async t => {
  const f = fixture(t), ctx = {};
  const cases = [
    ['absent', "detect:()=> 'unavailable',collect:()=>{throw Error('must not collect')}", 'unavailable'],
    ['unsupported', "detect:()=> 'unsupported',collect:()=>{throw Error('must not collect')}", 'unsupported'],
    ['unknown', 'contractVersion:9', 'unsupported'],
    ['bad-hooks', 'redact:null', 'failed'],
    ['bad-result', "collect:()=>({status:'made-up'})", 'failed'],
    ['bad-redaction', "redact:()=>({status:'unavailable'})", 'failed'],
    ['mutating-redaction', "collect:()=>({status:'failed'}),redact:v=>{v.status='available';return v}", 'failed'],
  ];
  for (const [name, overrides, status] of cases) {
    const result = await collect(ctx, f.module(name, entry(overrides)));
    assert.equal(result.status, status, name);
    assert.equal(result.data.status, status, name);
  }
  assert.equal((await collect(ctx, path.join(f.root, 'missing.cjs'))).reason, 'integration-load-failed');
});
test('public module output is bounded and module redaction is followed by core filtering', async t => {
  const f = fixture(t);
  const good = await collect({}, f.module('good', entry("collect:()=>({status:'available',token:'private-token',inputValue:'private-input',custom:'private-custom',count:7}),redact:v=>({status:v.status,count:v.count,token:v.token})")));
  assert.deepEqual(good.data, { status: 'available', count: 7 });
  assert.match(good.moduleSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(good.description, { name: 'example-mod', version: '1.2.3' });
  const huge = await collect({}, f.module('huge', entry("collect:()=>({status:'available',samples:Array(500).fill('x'.repeat(200))})")));
  assert.equal(huge.reason, 'integration-output-invalid');
});
test('synchronous import/async hook hangs are bounded and background handles cannot keep host alive', t => {
  const f = fixture(t), runner = path.resolve(__dirname, '../scripts/lib/integration.cjs');
  const cases = [
    ['import-hang', 'while(true){}', 'failed'],
    ['async-hang', entry('collect:()=>new Promise(()=>{})'), 'failed'],
    ['timer-success', 'setInterval(()=>console.log("private-log-body"),10);'+entry(''), 'available'],
  ];
  for (const [name, source, status] of cases) {
    const filename = f.module(name, source);
    const script = `require(${JSON.stringify(runner)}).collect({},${JSON.stringify(filename)},1000).then(r=>console.log(JSON.stringify(r)))`;
    const result = spawnSync(process.execPath, ['-e',script], { encoding: 'utf8', timeout: 5000 });
    assert.equal(result.error, undefined, name);
    assert.equal(result.status, 0, name);
    assert.equal(result.stdout.includes('private-log-body'), false);
    assert.equal(result.stderr, '');
    const packet = JSON.parse(result.stdout);
    assert.equal(packet.status, status, name);
    if (name === 'import-hang') assert.equal(packet.reason, 'integration-timeout');
    // A Promise alone does not keep a Node worker alive; early exit is also a bounded failure.
    if (name === 'async-hang') assert.ok(['integration-timeout','integration-worker-exited'].includes(packet.reason));
  }
});
test('external integration artifacts stay JSON-only and optional failures preserve Generic completeness', async t => {
  const f = fixture(t);
  const methods = {
    device: async ctx => { ctx.deviceReady = true; return { androidVersion: '15' }; },
    app: async ctx => { ctx.appPid = '123'; return { versionName: '1' }; },
    screenshot: async () => ({ binary: Buffer.from('fixture-image'), extension: 'png' }),
    gfx: async () => ({ sampledFrames: 0 }), mem: async () => ({ pssKb: 1 }),
    forward: async ctx => { ctx.endpoint = 'http://127.0.0.1:1'; return { verified: true }; },
    cdp: async ctx => { ctx.client = { close() {} }; ctx.channels = { Runtime: 'available', Network: 'available' };
      ctx.capture = { snapshot: () => ({ console: [], network: [], omittedConsole: 0, omittedNetwork: 0 }) }; return { channels: ctx.channels }; },
    webview: async () => ({ product: 'test' }), versions: async () => ({ gameVersion: '1' }),
  };
  const dangerousKeys = f.module('data-keys', entry("collect:()=>({status:'available',file:'outside.zip',binary:'not-binary',extension:'tar',collectorStatus:'failed'})"));
  const unknown = f.module('unsupported', entry('contractVersion:9'));
  const out = path.join(f.root, 'evidence');
  const report = await evidence({ serial: 'offline-device', package: 'com.example.game', out, windowMs: 0 },
    { collectors: methods, integrations: [{ modulePath: dangerousKeys }, { modulePath: unknown }, { modulePath: path.join(f.root,'missing.cjs') }] });
  assert.equal(report.status, 'complete');
  assert.deepEqual(report.integrations.map(item => item.status), ['available','unsupported','failed']);
  assert.deepEqual(report.steps.filter(step => step.name.startsWith('integration-')).map(step => step.status), ['completed','unsupported','failed']);
  assert.ok(fs.existsSync(path.join(out,'webview.json')));
  assert.equal(fs.existsSync(path.join(out,'integration-0.tar')), false);
  const artifact = JSON.parse(fs.readFileSync(path.join(out,'integration-0.json'),'utf8'));
  assert.equal(artifact.data.file, 'outside.zip');
  assert.equal(artifact.data.status, 'available');
  assert.equal(artifact.incidentId, report.incidentId);
  assert.equal(report.steps.find(step => step.name==='integration-0').artifact.filename, 'integration-0.json');
  const projected = support(out, path.join(f.root, 'support'));
  assert.deepEqual(projected.compatibility, [{ name: 'example-mod', version: '1.2.3', status: 'available', adapters: [] }]);
  assert.equal(JSON.stringify(projected).includes('outside.zip'), false);
  report.integrations[0].version = { account: 'private-account' };
  fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(report));
  const invalidMetadata = support(out, path.join(f.root, 'support-invalid-meta'));
  assert.equal(invalidMetadata.status, 'partial');
  assert.equal(JSON.stringify(invalidMetadata).includes('private-account'), false);
});
