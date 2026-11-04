'use strict';
const { findSource } = require('../source-finder/dist/engine.js');
const { MAX_FRAME, engineError } = require('./protocol.cjs');
function send(value) { let text = JSON.stringify(value); if (Buffer.byteLength(text) > MAX_FRAME) text = JSON.stringify({ error: { code: 'RESPONSE_TOO_LARGE', stage: 'entry' } }); console.log(text); }
let chunks = [], bytes = 0, over = false;
process.stdin.on('data', chunk => { bytes += chunk.length; if (bytes > MAX_FRAME) { over = true; chunks = []; } else if (!over) chunks.push(chunk); });
process.stdin.on('end', async () => {
  let request;
  try { if (over) throw 0; request = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { send({ error: { code: over ? 'FRAME_TOO_LARGE' : 'INVALID_JSON', stage: 'entry' } }); return; }
  try { const result = await findSource(request); if (process.send) process.send({ rssBytes: process.memoryUsage().rss }); send({ result }); }
  catch (e) { send({ error: engineError(e) }); }
});
