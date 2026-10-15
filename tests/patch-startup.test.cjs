'use strict';
const {test} = require('node:test'), assert = require('node:assert/strict');
const {createHash, webcrypto} = require('node:crypto'), {register} = require('../examples/patch-provenance/startup.cjs');
const sha = fn => createHash('sha256').update(fn.toString()).digest('hex');
function fixture() {
  let hooks;
  const replacer = {async do_patch(ri, sc) { sc.passageDataItems.map.get('Owned').content = 'beta'; }};
  const utils = {getMod: () => ({modRef: replacer}), replaceFollowSC2DataInfo() {},
    getAddonPluginManager: () => ({registerAddonPlugin(mod, addon, value) { assert.equal(mod, 'WhiteSnakePatchProbe'); hooks = value; }})};
  const host = {location: {origin: 'https://localhost'}, performance: {timeOrigin: 123}, crypto: webcrypto, modUtils: utils};
  const reviewed = {resources: ['Owned'], patchSha256: sha(replacer.do_patch), publicationSha256: sha(utils.replaceFollowSC2DataInfo)};
  return {host, replacer, utils, reviewed, hooks: () => hooks};
}
test('reviewed startup hooks observe and restore; callback completion remains separate from digest completion', async () => {
  const f = fixture(), original = f.replacer.do_patch, probe = register(f.host, f.reviewed);
  await f.hooks().afterEarlyLoad(); assert.equal(probe.read().status, 'collecting');
  const sc = {passageDataItems: {map: new Map([['Owned', {content: 'alpha'}]])}};
  await f.replacer.do_patch({mod: {name: 'owned'}}, sc); f.utils.replaceFollowSC2DataInfo(sc);
  await f.hooks().afterPatchModToGame();
  const report = probe.read(); assert.equal(report.status, 'stopped'); assert.equal(report.ownAfterPatchHookReached, true);
  assert.equal(f.replacer.do_patch, original); assert.equal(report.observation.events[0].before[0].status, 'captured');
  assert.equal(report.observation.events[0].after[0].sha256, createHash('sha256').update('beta').digest('hex'));
});
test('source mismatch and changed function during review are refused without replacing methods', async () => {
  const f = fixture(), original = f.replacer.do_patch; f.reviewed.patchSha256 = '0'.repeat(64);
  const probe = register(f.host, f.reviewed); await f.hooks().afterEarlyLoad();
  assert.equal(probe.read().status, 'source-mismatch'); assert.equal(f.replacer.do_patch, original);
  const changed = fixture(), second = register(changed.host, changed.reviewed), pending = changed.hooks().afterEarlyLoad();
  const foreign = async () => {}; changed.replacer.do_patch = foreign; await pending;
  assert.equal(second.read().status, 'source-mismatch'); assert.equal(changed.replacer.do_patch, foreign);
});
test('explicit stop before hooks prevents installation and duplicate registration is rejected', async () => {
  const f = fixture(), original = f.replacer.do_patch, probe = register(f.host, f.reviewed);
  assert.throws(() => register(f.host, f.reviewed), /already registered/);
  probe.stop(); await f.hooks().afterEarlyLoad(); assert.equal(f.replacer.do_patch, original);
  assert.throws(() => register({...f.host, WhiteSnakePatchProbe: undefined, location: {origin: 'null'}}, f.reviewed));
});
test('never-settled source hash cannot hold the loader hook forever', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const f = fixture(), original = f.replacer.do_patch;
  f.host.crypto = {randomUUID: () => 'owned', subtle: {digest: () => new Promise(() => {})}};
  const probe = register(f.host, f.reviewed), hook = f.hooks().afterEarlyLoad();
  t.mock.timers.tick(1000); await hook;
  assert.equal(probe.read().status, 'installation-failed'); assert.equal(f.replacer.do_patch, original);
  const second = fixture(); second.host.crypto = f.host.crypto;
  const stopped = register(second.host, second.reviewed), pending = second.hooks().afterEarlyLoad();
  stopped.stop(); const snapshot = stopped.read(); t.mock.timers.tick(1000); await pending;
  assert.deepEqual(stopped.read(), snapshot);
});
test('digest drain is bounded and leaves stopped-unsettled rather than a late hash success', async () => {
  const f = fixture(); let calls = 0;
  f.host.crypto = {randomUUID: () => 'owned', subtle: {digest: (...args) => ++calls <= 2 ? webcrypto.subtle.digest(...args) : new Promise(() => {})}};
  const original = f.replacer.do_patch, probe = register(f.host, f.reviewed);
  await f.hooks().afterEarlyLoad(); await f.replacer.do_patch({}, {passageDataItems: {map: new Map([['Owned', {content: 'alpha'}]])}});
  await f.hooks().afterPatchModToGame();
  assert.equal(f.replacer.do_patch, original); assert.equal(probe.read().status, 'stopped');
  assert.equal(probe.read().observation.events[0].before[0].status, 'stopped-unsettled');
});
test('missing final loader hook still expires and the public status reflects owned-method recovery', async t => {
  t.mock.timers.enable({apis: ['setTimeout']});
  const f = fixture(), original = f.replacer.do_patch, probe = register(f.host, f.reviewed);
  await f.hooks().afterEarlyLoad(); assert.notEqual(f.replacer.do_patch, original);
  t.mock.timers.tick(30000); assert.equal(f.replacer.do_patch, original);
  assert.equal(probe.read().status, 'stopped'); assert.equal(probe.read().observation.stopReason, 'deadline');
});
test('startup copies the reviewed Mod selection before registering lifecycle hooks', async () => {
  const f = fixture(); f.reviewed.mods = ['selected']; const probe = register(f.host, f.reviewed); f.reviewed.mods[0] = 'other';
  await f.hooks().afterEarlyLoad();
  const sc = {passageDataItems: {map: new Map([['Owned', {content: 'alpha'}]])}};
  await f.replacer.do_patch({mod: {name: 'other'}}, sc); await f.replacer.do_patch({mod: {name: 'selected'}}, sc);
  await f.hooks().afterPatchModToGame();
  assert.equal(probe.read().observation.filtered, 1); assert.equal(probe.read().observation.events.length, 1);
  assert.deepEqual(probe.read().observation.selection.mods, ['selected']);
});
