'use strict';
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const cp = process.argv[2];
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weather-process-'));
const children = new Set();
function start(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const p = spawn('java', ['-cp', cp, 'weather.WorkerKt', dir, 'run1'], { stdio: ['pipe', 'pipe', 'inherit'] });
  children.add(p);
  const closed = new Promise(resolve => p.once('close', (code, signal) => { children.delete(p); resolve({ code, signal }); }));
  p.closed = closed;
  let buf = '', pending = null, seq = 0, failed = null;
  function fail(error) {
    failed ||= error;
    if (pending) { const cb = pending; pending = null; clearTimeout(cb.timer); cb.reject(error); }
  }
  p.stdout.setEncoding('utf8');
  p.stdout.on('data', chunk => {
    buf += chunk;
    if (buf.length > 512) { fail(Error('output bound')); p.kill('SIGKILL'); return; }
    let n;
    while ((n = buf.indexOf('\n')) >= 0) {
      const frame = buf.slice(0, n); buf = buf.slice(n + 1);
      if (!pending || !frame.startsWith(`${pending.id} `) || frame.length > 256) { fail(Error('unexpected frame')); p.kill('SIGKILL'); return; }
      const cb = pending; pending = null; clearTimeout(cb.timer); cb.resolve(frame.slice(String(cb.id).length + 1));
    }
  });
  p.on('error', fail);
  p.stdin.on('error', fail);
  p.on('exit', () => fail(Error('worker exited')));
  async function request(command) {
    assert(!pending && !failed && seq < 16 && command.length < 200);
    const id = ++seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => fail(Error('response timeout')), 5000);
      pending = { id, resolve, reject, timer };
      try { p.stdin.write(`${id} ${command}\n`); } catch (error) { fail(error); }
    });
  }
  return { p, request };
}
async function waitFile(file) {
  const until = Date.now() + 7000;
  while (!fs.existsSync(file)) {
    if (Date.now() > until) throw Error(`gate timeout: ${path.basename(file)}`);
    await new Promise(r => setTimeout(r, 10));
  }
}
async function boundedClose(p) {
  let timer;
  try {
    return await Promise.race([p.closed, new Promise((_, reject) => {
      timer = setTimeout(() => reject(Error('worker close timeout')), 5000);
    })]);
  } finally { clearTimeout(timer); }
}
async function killed(w) {
  w.p.kill('SIGKILL');
  const exit = await boundedClose(w.p);
  assert.equal(exit.signal, 'SIGKILL');
}
async function prepare(dir, work) {
  const w = start(dir);
  const hello = (await w.request('HELLO')).split(' '); assert.equal(hello[0], 'OK');
  const original = await w.request(`START ${work}`); assert.equal(original, `OK ${hello[2]}`);
  const replacement = (await w.request('RECREATE')).split(' '); assert.notEqual(replacement[1], hello[2]);
  assert.equal(await w.request('ARM'), 'READY');
  return { w, processId: hello[1], original: hello[2], replacement: replacement[1] };
}
(async () => {
  const beforeDir = path.join(root, 'before');
  const before = await prepare(beforeDir, 'before');
  await killed(before.w);
  assert.equal(fs.existsSync(path.join(beforeDir, 'effects', 'run1.before')), false);
  let restart = start(beforeDir);
  let hello = (await restart.request('HELLO')).split(' '); assert.notEqual(hello[1], before.processId);
  assert.equal(await restart.request('LOOKUP before'), 'UNKNOWN');
  await killed(restart);

  const afterDir = path.join(root, 'after');
  const after = await prepare(afterDir, 'after');
  after.w.p.stdin.end(); // transport disconnect; armed work retains ownership
  fs.writeFileSync(path.join(afterDir, 'release'), 'go');
  await waitFile(path.join(afterDir, 'committed')); // worker confirms completion before kill
  const effect = fs.readFileSync(path.join(afterDir, 'effects', 'run1.after'), 'utf8').trim().split('\n');
  assert.deepEqual(effect, ['run1', after.processId, after.original, 'after']);
  await killed(after.w);
  restart = start(afterDir);
  hello = (await restart.request('HELLO')).split(' '); assert.notEqual(hello[1], after.processId);
  assert.equal(await restart.request('LOOKUP after'), `COMMITTED ${after.processId} ${after.original} after`);
  await killed(restart);
  const bad = start(path.join(root, 'bad'));
  bad.p.stdin.end('1 ' + 'A'.repeat(257) + '\n');
  assert.notEqual((await boundedClose(bad.p)).code, 0);
  console.log('PASS: real JVM SIGKILL before gate => UNKNOWN; disconnect then commit gate => independent effect; SIGKILL after commit => restart recovers original process/activity; oversized frame rejected');
})().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => {
  const remaining = [...children];
  for (const child of remaining) child.kill('SIGKILL');
  const results = await Promise.allSettled(remaining.map(boundedClose));
  if (results.some(result => result.status === 'rejected')) {
    console.error(`Worker termination unknown; retained temporary directory: ${root}`);
    process.exitCode = 1;
    for (const child of children) { child.stdin.destroy(); child.stdout.destroy(); child.unref(); }
  } else {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
