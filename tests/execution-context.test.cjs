const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../scripts/lib/execution-context.cjs');

function fixture() {
  let pid = '123', nextPort = 55555;
  const mappings = new Map([['60000', 'localabstract:unrelated']]);
  const removed = [], clients = [];
  const adb = async (...args) => {
    const command = args.join(' ');
    if (command === 'shell pidof com.example.game') return Buffer.from(pid);
    if (command === 'shell cat /proc/net/unix') return Buffer.from(`@webview_devtools_remote_${pid}`);
    if (args[0] === 'forward' && args[1] === 'tcp:0') {
      const port = String(nextPort++);
      mappings.set(port, args[2]);
      return Buffer.from(port);
    }
    if (command === 'forward --list') return Buffer.from([...mappings].map(([port, remote]) => `offline-device tcp:${port} ${remote}`).join('\n'));
    if (args[0] === 'forward' && args[1] === '--remove') {
      const port = args[2].slice(4);
      removed.push(port); mappings.delete(port);
      return Buffer.alloc(0);
    }
    throw Error(`Unexpected ADB command: ${command}`);
  };
  const connect = async () => {
    const client = { closed: false, close() { this.closed = true; }, isOpen() { return !this.closed; } };
    clients.push(client);
    return client;
  };
  const ctx = create({ serial: 'offline-device', package: 'com.example.game' }, { adb, connect });
  return { ctx, mappings, removed, clients, setPid(value) { pid = value; } };
}

test('PID change closes the old client and removes only its forward; finish removes the new one once', async () => {
  const f = fixture();
  await f.ctx.ensureWebview();
  assert.equal(f.ctx.forwardPort, '55555');
  f.setPid('456');
  await f.ctx.ensureWebview();
  assert.equal(f.clients[0].closed, true);
  assert.equal(f.clients[1].closed, false);
  assert.deepEqual(f.removed, ['55555']);
  assert.equal(f.mappings.has('60000'), true);
  assert.equal(f.ctx.forwardPort, '55556');
  assert.deepEqual(await f.ctx.finish(), [{ status: 'completed', resource: 'own CDP transport' }]);
  assert.deepEqual(await f.ctx.finish(), []);
  assert.deepEqual(f.removed, ['55555', '55556']);
  assert.equal(f.clients[1].closed, true);
  assert.deepEqual([...f.mappings.keys()], ['60000']);
});

test('changed forward ownership is reported and the external mapping is left alone', async () => {
  const f = fixture();
  await f.ctx.ensureWebview();
  f.mappings.set('55555', 'localabstract:another_process');
  assert.deepEqual(await f.ctx.finish(), [{ status: 'failed', resource: 'own CDP transport' }]);
  assert.deepEqual(await f.ctx.finish(), []);
  assert.deepEqual(f.removed, []);
  assert.equal(f.mappings.get('55555'), 'localabstract:another_process');
  assert.equal(f.mappings.get('60000'), 'localabstract:unrelated');
});
