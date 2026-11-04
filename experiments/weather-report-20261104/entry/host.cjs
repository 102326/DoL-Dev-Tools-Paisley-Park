'use strict';
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const path = require('node:path');
function start({ metrics = false } = {}) {
  const child = spawn(process.execPath, [path.join(__dirname, 'stdio.cjs')], { stdio: metrics ? ['pipe', 'pipe', 'pipe', 'ipc'] : ['pipe', 'pipe', 'pipe'] });
  const pending = new Map(); let next = 0, closed = false;
  child.stderr.resume();
  const lines = readline.createInterface({ input: child.stdout });
  function failAll() { closed = true; for (const { reject, timer } of pending.values()) { clearTimeout(timer); reject(new Error('ENTRY_CLOSED')); } pending.clear(); }
  const childClosed = new Promise(resolve => child.once('close', () => { failAll(); resolve(); }));
  child.on('error', failAll); child.on('exit', failAll); child.stdin.on('error', failAll);
  lines.on('line', line => {
    let message; try { message = JSON.parse(line); } catch { child.kill(); return; }
    if (!message.requestId) { child.kill(); return; }
    const item = pending.get(message.requestId); if (!item) return;
    pending.delete(message.requestId); clearTimeout(item.timer); item.resolve(message);
  });
  return {
    request(request, timeout = 5000) {
      if (closed) return Promise.reject(new Error('ENTRY_CLOSED'));
      if (next >= 4096) return Promise.reject(new Error('ID_LIMIT'));
      const id = String(++next);
      const frame = JSON.stringify({ type: 'find', requestId: id, request }) + '\n';
      if (Buffer.byteLength(frame) - 1 > 65536) return Promise.reject(new Error('FRAME_TOO_LARGE'));
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => { pending.delete(id); child.stdin.write(JSON.stringify({ type: 'cancel', requestId: id }) + '\n'); reject(new Error('ENTRY_TIMEOUT')); }, timeout);
        pending.set(id, { resolve, reject, timer });
        child.stdin.write(frame);
      });
    },
    async close() {
      child.stdin.end();
      let timer;
      try {
        return await Promise.race([childClosed.then(() => ({ closed: true })), new Promise(resolve => {
          timer = setTimeout(() => { child.kill('SIGKILL'); failAll(); child.stdout.destroy(); child.stderr.destroy(); resolve({ closed: false, reason: 'termination-unconfirmed' }); }, 2000);
        })]);
      } finally { clearTimeout(timer); }
    }, child,
  };
}
module.exports = { start };
