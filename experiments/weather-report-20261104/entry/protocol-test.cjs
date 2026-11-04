'use strict';
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const path = require('node:path');
(async () => {
  const child = spawn(process.execPath, [path.join(__dirname, 'stub-server.cjs')]);
  try {
  const lines = readline.createInterface({ input: child.stdout }); const inbox = []; let notify;
  lines.on('line', line => { inbox.push(JSON.parse(line)); if (notify) { notify(); notify = null; } });
  const get = async () => { if (!inbox.length) await new Promise((resolve, reject) => { notify = resolve; setTimeout(() => reject(Error('response timeout')), 2000).unref(); }); return inbox.shift(); };
  const send = x => child.stdin.write(JSON.stringify(x) + '\n');
  send({ type: 'cancel', requestId: 'private/path' });
  assert.deepEqual(await get(), { error: { code: 'INVALID_ID', stage: 'entry' } });
  send({ type: 'find', requestId: 'a', request: { marker: 'old', delay: 100, ignoreAbort: true } });
  send({ type: 'cancel', requestId: 'a' });
  send({ type: 'find', requestId: 'a', request: { marker: 'new' } });
  send({ type: 'find', requestId: 'b', request: { marker: 'right' } });
  assert.equal((await get()).error.code, 'CANCELLED');
  assert.equal((await get()).error.code, 'DUPLICATE_ID');
  assert.deepEqual(await get(), { requestId: 'b', result: { marker: 'right' } });
  await new Promise(resolve => setTimeout(resolve, 150)); assert.equal(inbox.length, 0);
  send({ type: 'find', requestId: 'known', request: { fail: 'SOURCE_REQUEST_INVALID', stage: 'request' } });
  assert.deepEqual((await get()).error, { code: 'SOURCE_REQUEST_INVALID', stage: 'request' });
  send({ type: 'find', requestId: 'unknown', request: { fail: 'secret', stage: 'private' } });
  assert.deepEqual((await get()).error, { code: 'ENGINE_FAILURE', stage: 'engine' });
  send({ type: 'find', requestId: 'large', request: { large: true } });
  assert.equal((await get()).error.code, 'RESPONSE_TOO_LARGE');
  child.stdin.write('x'.repeat(65537) + '\n'); assert.equal((await get()).error.code, 'FRAME_TOO_LARGE');
  child.stdin.write('{bad}\n'); assert.equal((await get()).error.code, 'INVALID_JSON');
  for (let i = 0; i < 19; i++) send({ type: 'find', requestId: `load${i}`, request: { delay: 10000 } });
  assert.equal((await get()).error.code, 'BUSY');
  send({ type: 'cancel', requestId: 'load5' });
  assert.equal((await get()).error.code, 'CANCELLED');
  child.stdin.end();
  const code = await new Promise(resolve => child.on('exit', resolve)); assert.equal(code, 0);
  console.log('protocol lifecycle passed (explicit stub)');
  } finally { if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL'); }
})().catch(err => { console.error(err); process.exitCode = 1; });
