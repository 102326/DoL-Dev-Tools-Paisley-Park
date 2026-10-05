const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { perfetto, bugreport } = require('../scripts/lib/deep.cjs');
const { evidence } = require('../scripts/lib/evidence.cjs');

function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dol-deep-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function helperFile(dir) {
  const filename = path.join(dir, 'record_android_trace');
  fs.writeFileSync(filename, '# offline helper fixture\n');
  return filename;
}
function context(output, overrides = {}) {
  return { output, options: { sensitive: true, deepSeconds: 7, serial: 'device-1', package: 'com.example.game' }, adb: async () => Buffer.from('34'), ...overrides };
}

test('Perfetto refuses sensitive capture before ADB, reports missing helper, and rejects old Android', async t => {
  const root = temp(t), previous = process.env.DOL_PERFETTO_RECORDER;
  t.after(() => previous === undefined ? delete process.env.DOL_PERFETTO_RECORDER : process.env.DOL_PERFETTO_RECORDER = previous);
  let adbCalls = 0, runCalls = 0;
  const noTouch = context(root, { options: { sensitive: false, deepSeconds: 7, serial: 'device-1', package: 'com.example.game' }, adb: async () => { adbCalls++; return Buffer.from('34'); }, runHeavy: async () => { runCalls++; } });
  await assert.rejects(perfetto(noTouch), /explicit sensitive-data selection/);
  assert.equal(adbCalls, 0);

  process.env.DOL_PERFETTO_RECORDER = path.join(root, 'missing', 'record_android_trace');
  assert.equal((await perfetto(context(root, { adb: noTouch.adb }))).collectorStatus, 'unsupported');
  assert.equal(adbCalls, 0);

  delete process.env.DOL_PERFETTO_RECORDER;
  const missing = await perfetto(context(root, { adb: async () => { adbCalls++; } }));
  assert.equal(missing.collectorStatus, 'unsupported');
  assert.equal(missing.reason, 'official-recorder-not-configured');
  assert.equal(adbCalls, 0);

  process.env.DOL_PERFETTO_RECORDER = helperFile(root);
  adbCalls = 0;
  const oldAndroid = await perfetto(context(root, { adb: async (...args) => { adbCalls++; assert.deepEqual(args, ['shell','getprop','ro.build.version.sdk']); return Buffer.from('28'); }, runHeavy: async () => { runCalls++; } }));
  assert.equal(oldAndroid.collectorStatus, 'unsupported');
  assert.equal(oldAndroid.reason, 'android-10-required-no-sideload');
  assert.equal(adbCalls, 1);
  assert.equal(runCalls, 0);
});

test('Perfetto invokes only bounded categories with explicit serial and preserves timed-out trace as failed', async t => {
  const root = temp(t), previous = process.env.DOL_PERFETTO_RECORDER;
  t.after(() => previous === undefined ? delete process.env.DOL_PERFETTO_RECORDER : process.env.DOL_PERFETTO_RECORDER = previous);
  const helper = helperFile(root);
  process.env.DOL_PERFETTO_RECORDER = helper;
  const output = path.join(root, 'incident'); fs.mkdirSync(output);
  let args, config, adbCalls = [];
  const result = await perfetto(context(output, {
    adb: async (...value) => { adbCalls.push(value); return Buffer.from(value.at(-1) === 'ro.build.version.sdk' ? '34' : 'perfetto'); },
    runHeavy: async (exe, argv, options) => { args = [exe, ...argv]; config = options; fs.writeFileSync(path.join(output, 'trace.perfetto-trace'), 'trace-partial'); },
  }));
  assert.equal(result.collectorStatus, 'completed');
  assert.equal(args[0], 'python');
  assert.equal(args[1], helper);
  assert.deepEqual(args.slice(2), ['--serial','device-1','--user','--no-open','-t','7s','-b','32mb','-a','com.example.game','-o',path.join(output,'trace.perfetto-trace'),'sched','gfx','wm']);
  assert.equal(config.timeout, 37000);
  assert.equal(config.maxBuffer, 65536);
  assert.deepEqual(adbCalls, [['shell','getprop','ro.build.version.sdk'],['shell','which','perfetto']]);
  assert.equal(args.some(value => /sideload|root|guardrail/i.test(String(value))), false);

  const failedOutput = path.join(root, 'timeout'); fs.mkdirSync(failedOutput);
  const failed = await perfetto(context(failedOutput, { runHeavy: async () => { fs.writeFileSync(path.join(failedOutput, 'trace.perfetto-trace'), 'partial trace'); throw Object.assign(Error('timeout'), { killed: true }); } }));
  assert.equal(failed.collectorStatus, 'failed');
  assert.equal(failed.reason, 'recorder-failed-artifact-preserved');
  assert.equal(fs.readFileSync(path.join(failedOutput, 'trace.perfetto-trace'), 'utf8'), 'partial trace');
  await assert.rejects(perfetto(context(failedOutput, { runHeavy: async () => {} })), /Trace output exists/);
});

test('bugreport requires a ZIP header, retains failed artifacts and protects existing output', async t => {
  const root = temp(t), output = path.join(root, 'incident'); fs.mkdirSync(output);
  const adb = async () => {};
  adb.execute = async ([, filename]) => { fs.writeFileSync(filename, Buffer.from('PK\x03\x04valid zip header')); };
  const ctx = context(output, { adb });
  const result = await bugreport(ctx);
  assert.equal(result.collectorStatus, 'completed');
  assert.equal(result.metadata.archiveIntegrityVerified, false);
  await assert.rejects(bugreport(ctx), /Bugreport output exists/);
  const failedOutput = path.join(root, 'failed'); fs.mkdirSync(failedOutput);
  const failedAdb = async () => {};
  failedAdb.execute = async ([, filename]) => { fs.writeFileSync(filename, Buffer.from('not zip')); throw Error('bugreport timeout'); };
  const failed = await bugreport(context(failedOutput, { adb: failedAdb }));
  assert.equal(failed.collectorStatus, 'failed');
  assert.equal(failed.reason, 'bugreport-failed-artifact-preserved');
  assert.equal(fs.existsSync(path.join(failedOutput, 'bugreport.zip')), true);
  await assert.rejects(bugreport(context(failedOutput, { adb: failedAdb })), /Bugreport output exists/);
});

test('Evidence capture and perf profiles run only selected collectors without an optional integration', async t => {
  const root = temp(t);
  for (const [profile, expected, invoked] of [['capture',['device','app','screenshot'],['device','app','screenshot']], ['perf',['device','app','gfxinfo','meminfo'],['device','app','gfx','mem']]]) {
    const called = [];
    const methods = Object.fromEntries(['device','app','screenshot','gfx','mem','forward','cdp','consoleSummary','networkSummary','webview','versions','dom','record','logcat','perfetto','bugreport'].map(name => [name, async ctx => {
      called.push(name);
      if (name === 'device') ctx.deviceReady = true;
      if (name === 'app') ctx.appPid = '42';
      return name === 'screenshot' ? { binary: Buffer.from('image'), extension: 'png' } : { ok: true };
    }]));
    const report = await evidence({ serial: 'device-1', package: 'com.example.game', out: path.join(root, profile), windowMs: 0, profile }, { collectors: methods });
    assert.deepEqual(called, invoked);
    assert.deepEqual(report.steps.map(step => step.name), expected);
    assert.equal(report.integrations.length, 0);
  }
});
