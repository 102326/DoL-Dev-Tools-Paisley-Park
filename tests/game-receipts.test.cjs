const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const receipts = require('../scripts/lib/game-receipts.cjs');
const attemptId = '123e4567-e89b-42d3-a456-426614174000';
function fixture() {
  const globals = { window: {} }, context = vm.createContext(globals);
  return { globals, client: { evaluate: async expression => vm.runInContext(expression, context) } };
}
test('context instrumentation is bounded and recovery never recreates missing or started receipts', async () => {
  const f = fixture();
  const nonce = await receipts.context(f.client);
  assert.equal(await receipts.context(f.client), nonce);
  const binding = { provider: 'soft-and-wet-native-head', contract: 'head-wear-v1', contextNonce: nonce, requestDigest: 'a'.repeat(64) };
  const effects = [{ id: attemptId, status: 'dispatching', executionBinding: binding }];
  assert.deepEqual(Array.from(await receipts.recover(f.client, effects)), []);
  f.globals.window[receipts.namespace].records[attemptId] = { ...binding, attemptId, status: 'started' };
  assert.deepEqual(Array.from(await receipts.recover(f.client, effects)), []);
  const restarted = fixture();
  assert.deepEqual(Array.from(await receipts.recover(restarted.client, effects)), []);
  assert.equal(Object.hasOwn(restarted.globals.window, receipts.namespace), false);
});
test('a matching durable terminal receipt survives a new host; identity, cost and status changes cannot settle it', async () => {
  const f = fixture(), nonce = await receipts.context(f.client);
  const binding = { provider: 'soft-and-wet-native-head', contract: 'head-wear-v1', contextNonce: nonce, requestDigest: 'a'.repeat(64) };
  const effects = [{ id: attemptId, status: 'acknowledged', executionBinding: binding }];
  const receipt = { ...binding, attemptId, status: 'terminal', outcome: 'occurred', remoteClosed: true, spent: 0 };
  const records = f.globals.window[receipts.namespace].records;
  records[attemptId] = receipt;
  assert.equal((await receipts.recover({ evaluate: f.client.evaluate }, effects))[0].attemptId, attemptId);
  for (const change of [{ requestDigest: 'b'.repeat(64) }, { contextNonce: attemptId }, { provider: 'other' }, { contract: 'other' }, { attemptId: 'other' }, { spent: -1 }, { remoteClosed: false }, { status: 'started' }]) {
    records[attemptId] = { ...receipt, ...change };
    assert.equal((await receipts.recover(f.client, effects)).length, 0);
  }
});
