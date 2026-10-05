'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { collect, summarize } = require('../scripts/lib/logcat.cjs');

test('collect bounds records by device epoch and requests only the verified PID tail', async () => {
  const calls = [];
  const ctx = {
    appPid: '42', options: { logcatSeconds: 30 },
    async adb(...args) {
      calls.push(args);
      if (args[0] === 'shell') return Buffer.from('1700000100\n');
      return Buffer.from([
        '--------- beginning of main',
        '1700000069.000 42 7 I chromium: old message',
        '         1700000070.000 42 7 W AndroidRuntime: private crash text',
        '--------- beginning of crash',
        '1700000100.000 42 7 E ExampleSecretTag: secret body',
        '1700000101.000 42 7 E chromium: too new',
      ].join('\n'));
    },
  };
  const result = await collect(ctx);
  assert.deepEqual(calls, [['shell', 'date', '+%s'], ['logcat', '-d', '-v', 'epoch', '--pid=42', '-t', '300']]);
  assert.deepEqual(result.window, { startEpochSeconds: 1700000070, endEpochSeconds: 1700000100, seconds: 30 });
  assert.deepEqual(result.records, [
    { timestamp: 1700000070, level: 'W', category: 'AndroidRuntime' },
    { timestamp: 1700000100, level: 'E', category: 'other' },
  ]);
  assert.equal(JSON.stringify(result).includes('private crash text'), false);
  assert.equal(JSON.stringify(result).includes('ExampleSecretTag'), false);
  assert.equal(JSON.stringify(result).includes('secret body'), false);
});

test('returns unsupported when app identity has not been verified', async () => {
  const result = await collect({ appPid: null, options: {}, adb: () => assert.fail('adb must not run') });
  assert.deepEqual(result, { collectorStatus: 'unsupported', reason: 'app-process-unavailable' });
});

test('summarize rejects lines outside the supported epoch format', () => {
  assert.throws(() => summarize('logcat output with unknown format'), { message: 'Unsupported logcat epoch format' });
});

test('summarize omits messages and arbitrary tag names', () => {
  const result = summarize('--------- beginning of crash\n1700000000.125 42 7 E SecretTag: user@example.invalid token=abc');
  assert.deepEqual(result.records, [{ timestamp: 1700000000.125, level: 'E', category: 'other' }]);
  assert.equal(JSON.stringify(result).includes('SecretTag'), false);
  assert.equal(JSON.stringify(result).includes('user@example.invalid'), false);
  assert.equal(JSON.stringify(result).includes('token=abc'), false);
});
