'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm');
const integration = require('../integrations/examples/patch-observation.cjs');
const client = record => ({evaluate: expression => JSON.parse(JSON.stringify(vm.runInNewContext(expression,
  {window: record ? {WhiteSnakePatchProbe: {read: () => record}} : {}, performance: {timeOrigin: 123}})))});
const record = () => ({schemaVersion: 1, document: {timeOrigin: 123, nonce: 'owned'}, status: 'stopped',
  observation: {schemaVersion: 1, identity: {documentId: 'owned'}, events: [], dropped: 3, firstFailure: null}});
test('explicit integration reads a bounded current-document record without treating truncation as success', async () => {
  const input = record(), ctx = {client: client(input)};
  assert.equal(await integration.detect(ctx), 'available');
  const result = await integration.collect(ctx); assert.equal(result.status, 'available');
  assert.equal(result.record.observation.dropped, 3); assert.equal(result.record.status, 'stopped');
  assert.deepEqual(input, record()); assert.equal(await integration.detect({}), 'unavailable');
});
test('missing probe, other document, nonce mismatch and capacity violation are refused', async () => {
  assert.equal((await integration.collect({client: client(null)})).status, 'unavailable');
  for (const mutate of [r => { r.document.timeOrigin = 456; }, r => { r.observation.identity.documentId = 'other'; },
    r => { r.observation.events = Array(17).fill({}); }]) {
    const input = record(); mutate(input); assert.equal((await integration.collect({client: client(input)})).status, 'unsupported');
  }
});
test('public projection omits raw extras and Mod names while preserving capacity and unknown markers', () => {
  const r = record(); r.privateExtra = 'private-extra';
  r.observation.events = [{sequence: 1, kind: 'do_patch', phase: 'stopped-unsettled', mod: 'private-mod-label',
    before: [{resource: 'Owned', status: 'digest-pending', sha256: null, content: 'private-passage'}], after: null, error: 'private-error'}];
  const output = integration.redact({status: 'available', record: r}), json = JSON.stringify(output);
  for (const raw of ['private-extra','private-mod-label','private-passage','private-error']) assert.equal(json.includes(raw), false);
  assert.equal(output.record.observation.dropped, 3); assert.equal(output.record.observation.events[0].phase, 'stopped-unsettled');
  assert.match(output.record.observation.events[0].modNameHash, /^[a-f0-9]{64}$/);
  assert.equal(r.observation.events[0].mod, 'private-mod-label');
});
