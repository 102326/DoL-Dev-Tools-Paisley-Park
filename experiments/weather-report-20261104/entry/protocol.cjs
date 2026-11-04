'use strict';
const { StringDecoder } = require('node:string_decoder');
const MAX_FRAME = 65536, MAX_IDS = 4096, CONCURRENCY = 2, QUEUE = 16;
const error = (code, stage = 'entry') => ({ code, stage });
const validId = id => typeof id === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(id);
const engineErrors = { SOURCE_REQUEST_INVALID: 'request', SOURCE_ROOT_UNAVAILABLE: 'source', SOURCE_REVISION_UNAVAILABLE: 'source', SOURCE_READ_FAILED: 'search', SOURCE_CANCELLED: 'search', SOURCE_TIMEOUT: 'search' };
const engineError = e => Object.hasOwn(engineErrors, e?.code) && e.stage === engineErrors[e.code] ? error(e.code, e.stage) : error('ENGINE_FAILURE', 'engine');
function serve(findSource, input = process.stdin, output = process.stdout) {
  const decoder = new StringDecoder('utf8');
  const ids = new Set(), jobs = new Map(), queue = [];
  let active = 0, closed = false, buffer = '', bytes = 0, discarding = false;
  const send = value => {
    if (closed || output.destroyed) return;
    let line = JSON.stringify(value) + '\n';
    if (Buffer.byteLength(line) - 1 > MAX_FRAME) line = JSON.stringify({ ...(value.requestId ? { requestId: value.requestId } : {}), error: error('RESPONSE_TOO_LARGE') }) + '\n';
    if (output.writableLength + Buffer.byteLength(line) > 1048576) { close(); input.destroy(); output.end(); return; }
    output.write(line);
  };
  function finish(job, result) {
    if (job.done || closed) return;
    job.done = true; jobs.delete(job.id); send({ requestId: job.id, ...result });
  }
  function pump() {
    while (!closed && active < CONCURRENCY && queue.length) {
      const job = queue.shift();
      if (job.done) continue;
      active++;
      Promise.resolve().then(() => findSource(job.request, job.controller.signal))
        .then(result => finish(job, { result }), e => finish(job, { error: engineError(e) }))
        .finally(() => { active--; pump(); });
    }
  }
  function frame(line) {
    let msg;
    try { msg = JSON.parse(line); } catch { send({ error: error('INVALID_JSON') }); return; }
    if (!msg || typeof msg !== 'object' || Array.isArray(msg)) { send({ error: error('INVALID_FRAME') }); return; }
    if (msg.type === 'cancel') {
      if (!validId(msg.requestId)) { send({ error: error('INVALID_ID') }); return; }
      const job = jobs.get(msg.requestId);
      if (!job) { send({ requestId: msg.requestId, error: error('NOT_ACTIVE') }); return; }
      job.controller.abort(); finish(job, { error: error('CANCELLED') }); pump(); return;
    }
    const id = msg.requestId;
    if (!validId(id)) { send({ error: error('INVALID_ID') }); return; }
    if (ids.has(id)) { send({ error: error('DUPLICATE_ID') }); return; }
    if (ids.size >= MAX_IDS) { send({ requestId: id, error: error('ID_LIMIT') }); return; }
    ids.add(id);
    if (msg.type !== 'find' || !msg.request || typeof msg.request !== 'object' || Array.isArray(msg.request)) { send({ requestId: id, error: error('INVALID_FRAME') }); return; }
    if (active >= CONCURRENCY && queue.filter(j => !j.done).length >= QUEUE) { send({ requestId: id, error: error('BUSY') }); return; }
    const job = { id, request: msg.request, controller: new AbortController(), done: false };
    jobs.set(id, job); queue.push(job); pump();
  }
  function close() {
    if (closed) return;
    closed = true; for (const job of jobs.values()) job.controller.abort(); jobs.clear(); queue.length = 0;
  }
  input.on('data', chunk => {
    for (const byte of chunk) {
      if (byte === 10) {
        if (discarding) send({ error: error('FRAME_TOO_LARGE') });
        else { buffer += decoder.end(); frame(buffer.replace(/\r$/, '')); }
        buffer = ''; bytes = 0; discarding = false; decoder.end();
      } else if (!discarding) {
        if (++bytes > MAX_FRAME) { discarding = true; buffer = ''; decoder.end(); }
        else buffer += decoder.write(Buffer.from([byte]));
      }
    }
  });
  input.on('end', close); input.on('error', close); output.on('error', close); output.on('close', close);
  return { close };
}
module.exports = { serve, MAX_FRAME, engineError };
