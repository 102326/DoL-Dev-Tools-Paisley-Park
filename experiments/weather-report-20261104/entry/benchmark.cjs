'use strict';
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
const sha256 = p => crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const { start } = require('./host.cjs');
const request = { schemaVersion: 1, root: path.join(__dirname, 'fixture'), clues: [{ kind: 'text', value: 'blue umbrella' }], limits: { maxResults: 10, maxFiles: 100, maxBytes: 100000, contextLines: 2 } };
function once(input = request, metrics = false) {
  return new Promise((resolve, reject) => {
    const started = performance.now(), child = spawn(process.execPath, [path.join(__dirname, 'once.cjs')], { stdio: metrics ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['pipe', 'pipe', 'pipe'] }); let output = '', err = '', rssBytes = null;
    if (metrics) child.on('message', message => { rssBytes = message.rssBytes; });
    child.stdout.on('data', x => output += x); child.stderr.on('data', x => err += x); child.on('error', reject);
    child.on('close', code => { if (code) return reject(new Error(`once exit ${code}: ${err}`)); try { resolve({ ms: performance.now() - started, value: JSON.parse(output), rssBytes }); } catch (e) { reject(e); } });
    child.stdin.end(JSON.stringify(input));
  });
}
(async () => {
  const n = 10, cold = []; let expected;
  for (let i = 0; i < n; i++) { const x = await once(); cold.push(x.ms); if (expected) assert.deepEqual(x.value, expected); else expected = x.value; }
  assert.ok(expected.result && !expected.error, 'once must return an engine result');
  assert.ok(expected.result.candidates.some(c => c.file === 'sample.twee'), 'fixture must be found');
  const started = performance.now(), host = start(); let first, warm = [];
  try {
    first = await host.request(request); const firstMs = performance.now() - started;
    assert.deepEqual({ result: first.result }, expected);
    for (let i = 0; i < n; i++) { const t = performance.now(); const response = await host.request(request); warm.push(performance.now() - t); assert.deepEqual({ result: response.result }, expected); }
    await assert.rejects(host.request(request, 1), { message: 'ENTRY_TIMEOUT' });
    assert.deepEqual({ result: (await host.request(request)).result }, expected);
    const invalid = { ...request, root: 'relative' };
    const onceInvalid = await once(invalid); const persistentInvalid = await host.request(invalid);
    assert.deepEqual(onceInvalid.value.error, { code: 'SOURCE_REQUEST_INVALID', stage: 'request' });
    assert.deepEqual(persistentInvalid.error, onceInvalid.value.error);
    const oneShotMemory = await once(request, true);
    const memoryHost = start({ metrics: true }); let reusedMemory = null;
    memoryHost.child.on('message', message => { reusedMemory = message.rssBytes; });
    try { for (let i = 0; i < n; i++) await memoryHost.request(request); } finally { await memoryHost.close(); }
    assert.ok(oneShotMemory.rssBytes && reusedMemory, 'memory probes must report RSS');
    const closeStart = performance.now(); assert.deepEqual(await host.close(),{closed:true});
    const summary = xs => ({ min: Math.min(...xs), median: [...xs].sort((a,b) => a-b)[Math.floor(xs.length/2)], max: Math.max(...xs) });
    console.log(JSON.stringify({ entrySha256: Object.fromEntries(['host.cjs','protocol.cjs','stdio.cjs','once.cjs'].map(f=>[f,sha256(path.join(__dirname,f))])), engineSha256: sha256(path.join(__dirname, '../source-finder/dist/engine.js')), fixtureSha256: sha256(path.join(__dirname, 'fixture/sample.twee')), node: process.version, platform: process.platform, arch: process.arch, input: 'fixture/sample.twee; text: blue umbrella', count: n, coldOnceMs: summary(cold), persistentFirstMs: firstMs, persistentReuseMs: summary(warm), oneShotAfterRequestRssBytes: oneShotMemory.rssBytes, persistentAfterTenRequestsRssBytes: reusedMemory, persistentCloseMs: performance.now() - closeStart, resultsEqual: true }, null, 2));
  } finally { await host.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
