'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {install} = require('../examples/patch-provenance/observe.cjs');
const {createHash, webcrypto} = require('node:crypto');
const identity = {documentId: 'owned-document', sourceSha256: 'a'.repeat(64)};
const data = value => ({passageDataItems: {map: new Map([['Owned', {content: value}]])}});
const drain = () => new Promise(resolve => setImmediate(resolve));
async function digestsDone(observer) {
  for (let i = 0; i < 100; i++) {
    if (!JSON.stringify(observer.read()).includes('digest-pending')) return;
    await drain();
  }
  throw Error('Fixture digests did not settle');
}
test('exact Promise/this/arguments, synchronous publication, bounded hashes and descriptor restoration', async () => {
  const sc = data('alpha'), promise = Promise.resolve('original-result');
  const prototype = {do_patch(ri, value) {
    assert.equal(this, replacer); assert.equal(ri.mod.name, 'owned-mod'); assert.equal(value, sc);
    sc.passageDataItems.map.get('Owned').content = 'beta'; return promise;
  }};
  const replacer = Object.create(prototype), published = [];
  const utils = {replaceFollowSC2DataInfo(value) { assert.equal(this, utils); published.push(value); return 7; }};
  const before = Object.getOwnPropertyDescriptor(utils, 'replaceFollowSC2DataInfo');
  const observer = install({replacer, utils, resources: ['Owned'], identity});
  assert.equal(replacer.do_patch({mod: {name: 'owned-mod'}}, sc), promise);
  await promise; assert.equal(utils.replaceFollowSC2DataInfo(sc), 7);
  await digestsDone(observer);
  const report = observer.read(); assert.deepEqual(report.events.map(e => e.phase), ['resolved', 'returned']);
  assert.equal(report.events[0].before[0].sha256, createHash('sha256').update('alpha').digest('hex'));
  assert.equal(report.events[0].after[0].sha256, createHash('sha256').update('beta').digest('hex'));
  assert.equal(published.length, 1);
  assert.deepEqual(observer.stop(), {patch: 'restored', publication: 'restored'});
  assert.equal(Object.hasOwn(replacer, 'do_patch'), false);
  assert.deepEqual(Object.getOwnPropertyDescriptor(utils, 'replaceFollowSC2DataInfo'), before);
  assert.deepEqual(observer.stop(), {patch: 'restored', publication: 'restored'});
});
test('original rejection and synchronous throw survive; first failure survives capacity limit', async () => {
  const error = Error('original-error'), replacer = {do_patch() { return Promise.reject(error); }};
  const utils = {replaceFollowSC2DataInfo() { throw error; }};
  const observer = install({replacer, utils, resources: ['Owned'], identity});
  for (let i = 0; i < 20; i++) await assert.rejects(replacer.do_patch({mod: {name: 'm'}}, data('x')), e => e === error);
  assert.throws(() => utils.replaceFollowSC2DataInfo(data('x')), e => e === error);
  const report = observer.read(); assert.equal(report.events.length, 16); assert.equal(report.dropped, 5);
  assert.deepEqual(report.firstFailure, {kind: 'rejected', sequence: 1}); observer.stop();
});
test('stop freezes unresolved calls and digests, late results cannot publish success; foreign wrapper retained', async () => {
  let resolveAction, resolveDigest;
  const promise = new Promise(resolve => { resolveAction = resolve; });
  const replacer = {do_patch: () => promise}, utils = {replaceFollowSC2DataInfo() {}};
  const crypto = {subtle: {digest: () => new Promise(resolve => { resolveDigest = resolve; })}};
  const observer = install({replacer, utils, resources: ['Owned'], identity, crypto});
  assert.equal(replacer.do_patch({}, data('x')), promise);
  const foreign = () => {}; utils.replaceFollowSC2DataInfo = foreign;
  assert.deepEqual(observer.stop(), {patch: 'restored', publication: 'ownership-conflict'});
  const stopped = observer.read(); resolveAction(); resolveDigest(new ArrayBuffer(32)); await drain();
  assert.deepEqual(observer.read(), stopped); assert.equal(utils.replaceFollowSC2DataInfo, foreign);
  assert.equal(stopped.events[0].phase, 'stopped-unsettled');
});
test('oversized/missing resources and observer failure do not change business outcome', async () => {
  const replacer = {do_patch: () => Promise.resolve(42)}, utils = {replaceFollowSC2DataInfo() {}};
  const crypto = {subtle: {digest: () => Promise.reject(Error('owned-digest-failure'))}};
  const observer = install({replacer, utils, resources: ['Owned', 'Absent'], identity, crypto});
  assert.equal(await replacer.do_patch({}, data('x'.repeat(32769))), 42);
  assert.equal(observer.read().events[0].before[0].status, 'content-limit');
  assert.equal(observer.read().events[0].before[1].status, 'absent');
  assert.equal(await replacer.do_patch({}, data('small')), 42); await drain();
  assert.ok(observer.read().observerErrors > 0); observer.stop();
});
test('install is explicit, validates input, rolls back partial installation', () => {
  const replacer = {do_patch() {}}, original = replacer.do_patch;
  const utils = Object.freeze({replaceFollowSC2DataInfo() {}});
  assert.throws(() => install({replacer, utils, resources: ['Owned'], identity, crypto: webcrypto}));
  assert.equal(replacer.do_patch, original);
  assert.throws(() => install({replacer, utils, resources: [], identity}));
});
test('first failure beyond capacity is retained; late rejection after stop cannot change report', async () => {
  let rejectLate, fail = false;
  const replacer = {do_patch: () => fail ? Promise.reject(Error('owned-failure')) : Promise.resolve()};
  const utils = {replaceFollowSC2DataInfo() {}}, observer = install({replacer, utils, resources: ['Owned'], identity});
  for (let i = 0; i < 16; i++) await replacer.do_patch({}, data('x'));
  fail = true; await assert.rejects(replacer.do_patch({}, data('x')));
  assert.deepEqual(observer.read().firstFailure, {kind: 'rejected', sequence: 17}); observer.stop();
  replacer.do_patch = () => new Promise((resolve, reject) => { rejectLate = reject; });
  const second = install({replacer, utils, resources: ['Owned'], identity});
  const result = replacer.do_patch({}, data('x')); second.stop(); const stopped = second.read();
  rejectLate(Error('late')); await assert.rejects(result); await drain(); assert.deepEqual(second.read(), stopped);
});
test('deadline restores owned methods even if the caller never reaches its finally block', t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const replacer = {do_patch: () => new Promise(() => {})}, original = replacer.do_patch;
  const utils = {replaceFollowSC2DataInfo() {}};
  const observer = install({replacer, utils, resources: ['Owned'], identity});
  replacer.do_patch({}, data('x')); t.mock.timers.tick(30000);
  assert.equal(replacer.do_patch, original); assert.equal(observer.read().stopReason, 'deadline');
  assert.equal(observer.read().events[0].phase, 'stopped-unsettled');
});
