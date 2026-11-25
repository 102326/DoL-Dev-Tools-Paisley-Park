'use strict';
const path = require('node:path');
const { android } = require('../../../scripts/lib/collectors.cjs');
const { create } = require('../../../scripts/lib/execution-context.cjs');
const { connect } = require('../../../scripts/lib/cdp.cjs');
const { archiveIdentity, scriptObserver } = require('../loaded-script.cjs');
const { hashObject, failure } = require('../receipt.cjs');
const app = 'org.paisleypark.wondershell';
const origin = 'https://appassets.androidplatform.net';
const sha = v => typeof v === 'string' && /^[a-f0-9]{64}$/.test(v);
const uuid = v => typeof v === 'string' && /^[a-f0-9-]{36}$/.test(v);
const count = v => Number.isSafeInteger(v) && v >= 0;
const reasons = ['operator-finished', 'renderer-gone', 'activity-stopped', 'activity-destroyed'];
const tags = new Set(['active-fixture-unreadable', 'fixture-rejected', 'fixture-already-active', 'fixture-activated',
  'page-finished', 'main-document-error', 'renderer-gone', 'renderer-unresponsive', 'renderer-responsive', 'view-mounted',
  'segment-started', 'segment-finished', 'renderer-termination-requested', 'activity-destroyed']);

function telemetry(bytes) {
  let v;
  try { v = JSON.parse(bytes.toString('utf8')); } catch { /* handled below */ }
  const invalid = () => failure('SHELL_TELEMETRY_INVALID', 'telemetry', 'Read a fresh snapshot from the selected isolated shell.');
  if (v?.kind !== 'wonder-neutral-shell' || v.schemaVersion !== 1 || v.origin !== origin || !uuid(v.activityId) || !uuid(v.processInstanceId)
    || !count(v.viewGeneration) || !count(v.eventsDropped) || typeof v.documentReadyCallback !== 'boolean' || typeof v.sampling !== 'boolean'
    || typeof v.rendererObservationSupported !== 'boolean' || !Array.isArray(v.events) || v.events.length > 64
    || !v.events.every(x => x && tags.has(x.kind) && count(x.viewGeneration) && x.viewGeneration <= v.viewGeneration && count(x.timeNs))) throw invalid();
  const active = v.artifactSha256;
  if (active === null && v.memberSha256 !== null || active !== null && (!sha(active) || !sha(v.memberSha256?.['release.js']) || !sha(v.memberSha256?.['index.html']))) throw invalid();
  let segment = null;
  if (v.lastSegment !== null) {
    const s = v.lastSegment;
    const fields = ['viewGeneration', 'durationNs', 'deliveredCallbacks', 'callbackDrops', 'durationUnavailable', 'durationOmitted', 'deadlineComparableFrames', 'deadlineMisses'];
    if (!s || s.name !== 'neutral-interaction' || !sha(s.artifactSha256) || !reasons.includes(s.finishReason) || !fields.every(k => count(s[k]))
      || s.viewGeneration > v.viewGeneration || s.deadlineMisses > s.deadlineComparableFrames || s.deadlineComparableFrames > s.deliveredCallbacks
      || s.durationUnavailable + s.durationOmitted > s.deliveredCallbacks || s.sampledDurationP95Ns !== null && !count(s.sampledDurationP95Ns)) throw invalid();
    segment = Object.fromEntries(['name', 'artifactSha256', 'finishReason', 'sampledDurationP95Ns', ...fields].map(k => [k, s[k]]));
    segment.current = s.artifactSha256 === active && s.viewGeneration === v.viewGeneration;
  }
  return { activityId: v.activityId, processInstanceId: v.processInstanceId, viewGeneration: v.viewGeneration, artifactSha256: active,
    memberSha256: v.memberSha256 && Object.fromEntries(['index.html', 'release.js', 'styles.css'].filter(k => sha(v.memberSha256[k])).map(k => [k, v.memberSha256[k]])),
    ready: v.documentReadyCallback, rendererObservationSupported: v.rendererObservationSupported, sampling: v.sampling, lastSegment: segment,
    eventsDropped: v.eventsDropped, events: v.events.map(({ kind, viewGeneration, timeNs, details }) => ({ kind, viewGeneration, timeNs,
      ...(kind === 'renderer-gone' && typeof details?.didCrash === 'boolean' ? { didCrash: details.didCrash } : {}) })) };
}

async function verify(serial, targetId, zip, python) {
  if (!/^[\w.:-]{1,128}$/.test(serial) || !/^[\w.:-]{1,128}$/.test(targetId) || !path.isAbsolute(zip)
    || !(path.isAbsolute(python) || ['python', 'python3'].includes(python))) throw failure('SHELL_INPUT_INVALID', 'arguments', 'Select the exact device, live page ID, ZIP and Python executable.');
  const expected = archiveIdentity(zip, 'release.js', python, 'utf8');
  const options = { serial, package: app, targetId };
  const adb = android(options);
  const read = async () => telemetry(await adb.execute(['exec-out', 'run-as', app, 'cat', 'files/wonder-telemetry.json'], { maxBuffer: 65536 }));
  const first = await read();
  const evidence = { schemaVersion: 1, status: 'unknown', artifact: { sha256: expected.sha256, memberSha256: expected.representative.byteSha256 }, telemetry: first };
  if (!first.ready || first.artifactSha256 === null) return { ...evidence, reason: 'document-not-ready' };
  if (first.artifactSha256 !== expected.sha256 || expected.members.some(m => first.memberSha256[m.name] !== m.sha256)
    || expected.members.length !== Object.keys(first.memberSha256).length) return { ...evidence, status: 'mismatch', reason: 'staged-bytes-differ' };
  const observer = scriptObserver(`${origin}/fixture/release.js`), contexts = new Map();
  const ctx = create(options, { adb, connect: (endpoint, ms, next, id) => connect(endpoint, ms, (method, data) => {
    if (method === 'Runtime.executionContextCreated') contexts.set(data.context.id, data.context);
    if (method === 'Runtime.executionContextDestroyed') contexts.delete(data.executionContextId);
    if (method === 'Runtime.executionContextsCleared') contexts.clear();
    observer.onEvent(method, data);
    next(method, data);
  }, id) }, { timeoutMs: 30000 });
  let result;
  try {
    const current = await ctx.ensureWebview();
    const tree = await current.send('Page.getFrameTree');
    const frame = tree.frameTree.frame;
    const url = `${origin}/fixture/index.html?generation=${first.viewGeneration}`;
    const realm = [...contexts.values()].filter(c => c.auxData?.isDefault === true && c.auxData.frameId === frame.id && c.origin === origin);
    if (frame.url !== url || realm.length !== 1 || typeof realm[0].uniqueId !== 'string') result = { status: 'unknown', reason: 'document-identity-unverified' };
    else {
      const comparable = await observer.compare((method, params) => current.send(method, params), realm[0].id, expected.representative.comparableTextSha256);
      await current.assertBound();
      const after = await read();
      await current.assertBound();
      const same = after.ready && ['activityId', 'processInstanceId', 'viewGeneration', 'artifactSha256'].every(key => after[key] === first[key]);
      result = same ? { ...comparable, documentSha256: hashObject([first.activityId, first.viewGeneration, targetId, frame.id, frame.loaderId, realm[0].uniqueId]) }
        : { status: 'unknown', reason: 'shell-generation-changed' };
    }
  } catch { result = { status: 'unknown', reason: 'bound-cdp-unavailable' }; }
  const cleanup = await ctx.finish();
  if (cleanup.some(item => item.status !== 'completed')) return { ...evidence, reason: 'cleanup-unconfirmed', observedStatus: result.status };
  return { ...evidence, ...result, cleanup: 'completed' };
}

if (require.main === module) {
  const [serial, targetId, zip, python = 'python3'] = process.argv.slice(2);
  if (serial === '--help' || !serial) console.log('node observe.cjs SELECTED_SERIAL EXACT_WEBVIEW_TARGET ABS_EXPECTED_ZIP [PYTHON]');
  else verify(serial, targetId ?? '', zip, python).then(result => {
    console.log(JSON.stringify(result, null, 2));
    if (result.status !== 'matched') process.exitCode = 2;
  }).catch(error => {
    console.error(JSON.stringify(error.field ? { code: error.code, field: error.field, hint: error.hint }
      : { code: 'SHELL_OBSERVATION_UNAVAILABLE', hint: 'Check the authorized device, debug shell and latest private telemetry.' }));
    process.exitCode = 1;
  });
}
module.exports = { telemetry, verify };
