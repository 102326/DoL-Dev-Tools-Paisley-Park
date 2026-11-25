'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { telemetry } = require('./observe.cjs');
const { stage } = require('./stage.cjs');
const { record } = require('./record.cjs');

test('records exact expectations, preserves unknowns and reserves the output before observing', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wonder-observation-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const cases = [
    ['matched', { status: 'matched', cleanup: 'completed', documentSha256: 'a'.repeat(64) }, true],
    ['matched', { status: 'unknown', reason: 'cleanup-unconfirmed', observedStatus: 'matched' }, false],
    ['staged-bytes-differ', { status: 'mismatch', reason: 'staged-bytes-differ' }, true],
    ['staged-bytes-differ', { status: 'unknown', reason: 'bound-cdp-unavailable' }, false],
  ];
  for (const [index, [expect, result, accepted]] of cases.entries()) {
    const file = path.join(dir, index + '.json');
    assert.equal((await record(file, expect, async () => result)).accepted, accepted);
    assert.deepEqual(JSON.parse(fs.readFileSync(file)).result, result);
  }
  const failed = path.join(dir, 'failure.json');
  await record(failed, 'matched', async () => { throw Error('private diagnostic'); });
  const original = fs.readFileSync(failed);
  assert.equal(JSON.parse(original).result.status, 'unknown');
  assert(!original.includes('private diagnostic'));
  let called = false;
  await assert.rejects(record(failed, 'matched', async () => { called = true; }), { code: 'EEXIST' });
  assert.equal(called, false);
  assert.deepEqual(fs.readFileSync(failed), original);
});

test('retains stale segment attribution and reports callback drops apart from missed deadlines', () => {
  const sha = 'a'.repeat(64);
  const input = { schemaVersion: 1, kind: 'wonder-neutral-shell', activityId: '01234567-abcd-1111-2222-000000000001',
    processInstanceId: '01234567-abcd-1111-2222-000000000002', origin: 'https://appassets.androidplatform.net',
    viewGeneration: 2, eventsDropped: 3, documentReadyCallback: true, sampling: false, rendererObservationSupported: true,
    artifactSha256: sha, memberSha256: { 'index.html': sha, 'release.js': sha },
    events: [{ kind: 'renderer-gone', viewGeneration: 1, timeNs: 10, details: { didCrash: false, private: 'discard' } }],
    lastSegment: { name: 'neutral-interaction', viewGeneration: 1, durationNs: 2000, deliveredCallbacks: 5, callbackDrops: 7,
      durationUnavailable: 1, durationOmitted: 0, deadlineComparableFrames: 3, deadlineMisses: 2, sampledDurationP95Ns: 100,
      finishReason: 'renderer-gone', artifactSha256: sha } };
  const read = () => telemetry(Buffer.from(JSON.stringify(input)));
  const result = read();
  assert.equal(result.lastSegment.current, false);
  assert.equal(result.lastSegment.callbackDrops, 7);
  assert.equal(result.lastSegment.deadlineMisses, 2);
  assert.equal(result.events[0].didCrash, false);
  assert.equal(result.events[0].private, undefined);
  input.lastSegment.deadlineMisses = 4;
  assert.throws(read, { code: 'SHELL_TELEMETRY_INVALID' });
});

test('requires a matching read-back before promoting the staged fixture', (t) => {
  const python = process.env.WONDER_PYTHON || 'python3';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wonder-stage-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const zip = path.join(dir, 'fixture.zip');
  execFileSync(python, ['-c', 'import sys, zipfile\nwith zipfile.ZipFile(sys.argv[1], "x") as z:\n z.writestr("index.html", "<html></html>"); z.writestr("release.js", "void 0;")', zip]);
  let bytes;
  const calls = [];
  const adb = (_, args, options) => {
    calls.push(args[2] === 'shell' && args[3] === '-T' ? 'stdin' : args[2]);
    assert.deepEqual(args.slice(0, 2), ['-s', 'isolated-fixture']);
    if (args[2] === 'shell' && args[3] === '-T') bytes = options.input;
    if (args[2] === 'exec-out') return bytes;
    return Buffer.alloc(0);
  };
  assert.equal(stage('isolated-fixture', zip, python, adb).activation, 'operator-required');
  assert.deepEqual(calls, ['stdin', 'exec-out', 'shell', 'exec-out']);
  calls.length = 0;
  assert.throws(() => stage('isolated-fixture', zip, python, (_, args) => {
    calls.push(args[2] === 'shell' && args[3] === '-T' ? 'stdin' : args[2]);
    return Buffer.from('wrong bytes');
  }), { code: 'SHELL_STAGE_UNCONFIRMED' });
  assert.deepEqual(calls, ['stdin', 'exec-out']);
});
