'use strict';
const {text} = require('../../scripts/lib/privacy.cjs');
const {createHash} = require('node:crypto');
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : null;
const count = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
const choose = (value, values) => values.includes(value) ? value : 'unknown';
function redact(result) {
  if (result.status !== 'available') return {status: result.status, ...(result.reason ? {reason: text(result.reason, 64)} : {})};
  const r = result.record, o = r.observation;
  const snapshots = list => Array.isArray(list) ? list.slice(0, 2).map(s => ({resource: text(s.resource, 160),
    status: choose(s.status, ['absent','content-limit','digest-pending','captured','digest-failed','stopped-unsettled']), sha256: hash(s.sha256)})) : null;
  const cleanup = value => value ? Object.fromEntries(['patch','publication'].map(k =>
    [k, choose(value[k], ['restored','ownership-conflict','restore-failed'])])) : null;
  return {status: result.status, source: 'reviewed optional startup observation', record: {
    schemaVersion: 1, document: {nonce: text(r.document.nonce, 160), timeOrigin: r.document.timeOrigin},
    status: choose(r.status, ['registered','collecting','stopped','unsupported-api','source-mismatch','installation-failed']),
    ownAfterPatchHookReached: r.ownAfterPatchHookReached === true,
    reviewed: r.reviewed ? {patchSha256: hash(r.reviewed.patchSha256), publicationSha256: hash(r.reviewed.publicationSha256)} : null,
    actual: r.actual ? {patchSha256: hash(r.actual.patchSha256), publicationSha256: hash(r.actual.publicationSha256)} : null,
    observation: o === null ? null : {schemaVersion: 1, identity: {documentId: text(o.identity.documentId, 160), sourceSha256: hash(o.identity.sourceSha256)},
      active: o.active === true, dropped: count(o.dropped), filtered: count(o.filtered),
      selection: {modNameHashes: Array.isArray(o.selection?.mods) ? o.selection.mods.slice(0, 2).map(name =>
        typeof name === 'string' ? createHash('sha256').update(name.slice(0, 160)).digest('hex') : null) : null,
        publication: choose(o.selection?.publication, ['all'])},
      observerErrors: count(o.observerErrors), cleanup: cleanup(o.cleanup),
      stopReason: choose(o.stopReason, ['explicit','deadline']),
      firstFailure: o.firstFailure ? {kind: choose(o.firstFailure.kind, ['threw','rejected']), sequence: count(o.firstFailure.sequence)} : null,
      events: o.events.slice(0, 16).map(e => ({sequence: count(e.sequence), kind: choose(e.kind, ['do_patch','publication']),
        modNameHash: typeof e.mod === 'string' ? createHash('sha256').update(e.mod.slice(0, 160)).digest('hex') : null,
        phase: choose(e.phase, ['started','resolved','rejected','threw','returned-unsettled','returned','stopped-unsettled']),
        before: snapshots(e.before), after: snapshots(e.after)})),
    },
  }};
}
function probe() {
  const bridge = window.WhiteSnakePatchProbe;
  if (typeof bridge?.read !== 'function') return {status: 'unavailable'};
  const record = bridge.read();
  if (record?.schemaVersion !== 1 || !Number.isFinite(record.document?.timeOrigin) ||
      typeof record.document?.nonce !== 'string' || !record.document.nonce ||
      record.document.timeOrigin !== performance.timeOrigin) return {status: 'unsupported', reason: 'capture-document-mismatch'};
  const observation = record.observation;
  if (observation !== null && (observation?.schemaVersion !== 1 ||
      observation.identity?.documentId !== record.document.nonce ||
      !Array.isArray(observation.events) || observation.events.length > 16)) return {status: 'unsupported', reason: 'capture-contract-mismatch'};
  // A current-document record is not cross-evaluate binding or a business success claim.
  return {status: 'available', source: 'reviewed optional startup observation', record};
}
module.exports = {
  contractVersion: 1,
  describe: () => ({name: 'patch-observation', version: '0.1.0', supportedApiVersion: 1}),
  detect: ctx => ctx.client ? ctx.client.evaluate("typeof window.WhiteSnakePatchProbe?.read === 'function' ? 'available' : 'unavailable'") : 'unavailable',
  collect: ctx => ctx.client.evaluate(`(${probe.toString()})()`),
  redact,
};
