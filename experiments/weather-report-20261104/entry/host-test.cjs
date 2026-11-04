'use strict';
const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const { EventEmitter } = require('node:events');
const childProcess = require('node:child_process');
const realSpawn = childProcess.spawn;
const { start: realStart } = require('./host.cjs');
async function bounded(promise) {
  let timer;
  try { return await Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('close hung')), 3000); })]); }
  finally { clearTimeout(timer); }
}
(async () => {
  const original = process.execPath;
  let host;
  try { process.execPath = '/missing-weather-report-test-node'; host = realStart(); }
  finally { process.execPath = original; }
  await assert.rejects(host.request({}), { message: 'ENTRY_CLOSED' });
  assert.deepEqual(await bounded(host.close()), {closed:true});
  await assert.rejects(host.request({}), { message: 'ENTRY_CLOSED' });

  // Reproduce an error/close without exit or exitCode, including close before host.close().
  let fake;
  childProcess.spawn = () => {
    fake = new EventEmitter(); Object.assign(fake, { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), exitCode: null, signalCode: null, kill() { return false; } });
    process.nextTick(() => { fake.emit('error', new Error('spawn failed')); fake.emit('close', -2, null); });
    return fake;
  };
  delete require.cache[require.resolve('./host.cjs')];
  try { host = require('./host.cjs').start(); } finally { childProcess.spawn = realSpawn; }
  await new Promise(resolve => fake.once('close', resolve));
  assert.deepEqual(await bounded(host.close()), {closed:true});
  let killed = false;
  fake = new EventEmitter(); Object.assign(fake, { stdin: new PassThrough(), stdout: new PassThrough(), stderr: new PassThrough(), exitCode: null, signalCode: null, kill() { killed = true; return false; } });
  childProcess.spawn = () => fake; delete require.cache[require.resolve('./host.cjs')];
  try { host = require('./host.cjs').start(); } finally { childProcess.spawn = realSpawn; }
  assert.deepEqual(await bounded(host.close()), {closed:false,reason:'termination-unconfirmed'}); assert.equal(killed, true);
  console.log('host spawn failure and missing-close cleanup passed');
})().catch(error => { console.error(error); process.exitCode = 1; });
