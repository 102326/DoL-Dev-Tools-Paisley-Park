'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { append, readStage, readBytes, digest, failure, state } = require('./dev-receipt-store.cjs');
const { hostRecord } = require('./dev-receipt-load.cjs');
const pc = require('./pc-session.cjs');

const limits = { recipe: 65536, host: 16384, probe: 32768, expect: 65536 };
const names = { recipe: 'recipe.json', host: 'host.json', probe: 'probe.js', expect: 'expect.json' };
function decision(next, reason, field, hint, step) {
  return { next, reason, field, hint, ...(step ? { argv: ['dev-receipt', 'continue', '--receipt', '.', '--step', step] } : {}) };
}
function localInput(file, field, hash) {
  let bytes;
  try { bytes = readBytes(file, limits[field]); }
  catch { throw failure('HANDOFF_INPUT_UNAVAILABLE', field, 'Restore the reviewed local input and retry.'); }
  if (hash && digest(bytes) !== hash) throw failure('HANDOFF_INPUT_CHANGED', field, 'Restore the exact sealed bytes and inspect the original receipt.');
  return bytes;
}
const mismatch = () => failure('HANDOFF_RECIPE_MISMATCH', 'recipe', 'Select the exact recipe used for this build. Changed recipes need a new build and receipt.');
function directory(dir) {
  try { if (fs.lstatSync(dir).isDirectory()) return; } catch { /* sanitized below */ }
  throw failure('HANDOFF_DIRECTORY_MISSING', 'receipt', 'Select the existing regular receipt directory with build-intent.json.');
}
function verifyOwner(dir, host) {
  const intent = readStage(dir, 'deployment-intent');
  const doc = readStage(dir, 'load') || readStage(dir, 'deployment-ack');
  if ([intent, doc].some(stage => stage && stage.targetSha256 !== host.targetSha256))
    throw failure('HANDOFF_TARGET_MISMATCH', 'host', 'Use the originally selected Chrome profile, browser, target and origin.');
  if (doc && doc.documentSha256 !== host.documentSha256)
    throw failure('HANDOFF_DOCUMENT_MISMATCH', 'host', 'Use the original proven document. A replacement needs separate evidence.');
}

function verifyBehaviorContract(dir, hashes) {
  const behavior = readStage(dir, 'behavior');
  if (behavior && (behavior.probeSha256 !== hashes.probe || behavior.expectationSha256 !== hashes.expect))
    throw failure('HANDOFF_BEHAVIOR_CONTRACT_CHANGED', 'behavior', 'Use the original probe and expectation for this recorded behavior. Preserve a different contract separately.');
}

function prepare(dir, args, built, api) {
  if (readStage(dir, 'handoff')) throw failure('RECEIPT_EXISTS', 'handoff', 'Use resume on this sealed handoff.');
  const bytes = Object.fromEntries(Object.keys(limits).map(field => [field, localInput(args[field], field)]));
  if (digest(bytes.recipe) !== built.sourceProof?.recipeSha256) throw mismatch();
  if (!bytes.probe.toString('utf8').trim()) throw failure('HANDOFF_PROBE_INVALID', 'probe', 'Select the reviewed nonempty observation expression.');
  try { JSON.parse(bytes.expect); } catch { throw failure('HANDOFF_EXPECT_INVALID', 'expect', 'Use a JSON value for the expected observation.'); }
  const mapping = readStage(dir, 'deployment-intent')?.scriptPath || readStage(dir, 'load')?.scriptPath;
  if (mapping && args['script-path'] && args['script-path'] !== mapping)
    throw failure('SCRIPT_MAPPING_CHANGED', 'script-path', 'Use the deployment mapping already recorded.');
  const scriptPath = args['script-path'] || mapping;
  api.mappings(built.artifact, scriptPath);
  // Publish the pointer only after all four bounded, owner-only copies are complete.
  verifyOwner(dir, hostRecord(args.host));
  const hashes = Object.fromEntries(Object.entries(bytes).map(([field, data]) => [field, digest(data)]));
  verifyBehaviorContract(dir, hashes);
  const slot = 'handoff-' + randomUUID();
  const base = path.join(dir, slot);
  fs.mkdirSync(base, { mode: 0o700 });
  for (const [field, data] of Object.entries(bytes)) {
    fs.writeFileSync(path.join(base, names[field]), data, { flag: 'wx', mode: 0o600 });
  }
  verifyOwner(dir, hostRecord(path.join(base, names.host)));
  append(dir, 'handoff', { start: { cwd: 'this receipt directory', executable: 'node',
    argv: [path.resolve(__dirname, '../dol-dev.cjs'), 'dev-receipt', 'resume', '--receipt', '.'] }, slot, hashes, ...(scriptPath ? { scriptPath } : {}) });
  return { prepared: true, next: 'resume' };
}

function inputs(dir, handoff, built) {
  if (!/^handoff-[0-9a-f-]{36}$/.test(handoff.slot)) throw failure('HANDOFF_INVALID', 'handoff', 'Inspect the original private handoff manifest.');
  const base = path.join(dir, handoff.slot);
  directory(base);
  const files = {};
  for (const field of Object.keys(names)) {
    files[field] = path.join(base, names[field]);
    if (!/^[a-f0-9]{64}$/.test(handoff.hashes?.[field])) throw failure('HANDOFF_INVALID', field, 'Inspect the original handoff manifest.');
    localInput(files[field], field, handoff.hashes[field]);
  }
  if (handoff.hashes.recipe !== built.sourceProof?.recipeSha256) throw mismatch();
  verifyBehaviorContract(dir, handoff.hashes);
  if (handoff.scriptPath) files['script-path'] = handoff.scriptPath;
  // Follow only exclusively published bindings. A failed or racing bind cannot replace a prior record.
  let generation = 0;
  let binding;
  while ((binding = readStage(base, 'binding-' + (generation + 1)))) {
    if (!/^host-[0-9a-f-]{36}\.json$/.test(binding.name) || !/^[a-f0-9]{64}$/.test(binding.sha256))
      throw failure('HANDOFF_INVALID', 'host', 'Inspect the original binding record.');
    files.host = path.join(base, binding.name);
    localInput(files.host, 'host', binding.sha256);
    generation++;
  }
  const original = hostRecord(path.join(base, names.host));
  const host = hostRecord(files.host);
  if (host.targetSha256 !== original.targetSha256 || host.target.document.url !== original.target.document.url)
    throw failure('HANDOFF_TARGET_MISMATCH', 'host', 'Inspect the original owned target and exact URL.');
  verifyOwner(dir, host);
  return { files, host, base, generation };
}

async function assess(dir, ctx, built, api) {
  const { host, files } = ctx;
  const history = state(dir);
  const current = await api.inspectBuild(host, api.mappings(built.artifact, files['script-path']));
  const comparison = api.compareSource(built, files.recipe);
  const intent = readStage(dir, 'deployment-intent');
  const locked = readStage(dir, 'load') || readStage(dir, 'deployment-ack');
  const causes = new Set(current.observations?.filter(item => item.status === 'unknown').map(item => item.reason));
  const loadReason = causes.size === 1 ? [...causes][0] : current.reason;
  const stale = current.reason === 'document-changed' || current.observations?.some(item => item.reason === 'document-changed');
  const beforeDispatch = intent?.documentSha256 === host.documentSha256;
  let advice;
  const unresolved = intent && !readStage(dir, 'load');
  if (comparison.source === 'needs-rebuild' && !unresolved) advice = decision('build-current-source-in-new-receipt', 'build-inputs-changed', 'inputs', 'Build the reviewed current inputs with new output paths and a new receipt.');
  else if (stale && locked) advice = decision('inspect-replacement-document', 'proven-document-ended', 'host', 'Keep the historical result and start separate verification for the replacement document.');
  else if (stale) advice = decision('rebind-original-target', 'document-changed', 'host', 'Explicitly bind the same browser, tab and exact URL.', 'rebind');
  else if (current.status === 'unknown') advice = decision('inspect-original-target', loadReason, 'host',
    loadReason === 'cdp-unavailable' ? 'Check the owned browser and whether this process may reach its loopback CDP endpoint. The cause is unconfirmed.'
      : 'Inspect the original target and the sealed script mapping. Resume after observation is available.');
  else if (beforeDispatch) advice = decision('inspect-pending-deployment', 'original-dispatch-document', 'host', 'Inspect the project deployment and original tab. Wait for independent load evidence before continuing.');
  else if (intent && current.status === 'mismatch' && unresolved) advice = decision('inspect-pending-deployment', 'pending-package-mismatch', 'host', 'Inspect the loaded package and original deployment. Preserve its uncertain outcome.');
  else if (comparison.source === 'needs-rebuild') advice = decision('build-current-source-in-new-receipt', 'build-inputs-changed', 'inputs', 'Build the reviewed current inputs with new output paths and a new receipt.');
  else if (comparison.source !== 'matched') advice = decision('inspect-source-comparison', comparison.sourceReason, 'recipe', 'Restore the declared checkout inputs and driver, then resume.');
  else if (current.status === 'mismatch') advice = decision('inspect-loaded-artifact', 'loaded-script-mismatch', 'artifact', 'Inspect the sealed ZIP and project deployment. A fresh dispatch requires a separate explicit decision.');
  else if (history.load !== 'matched') advice = decision('record-loaded-artifact', 'matching-live-script', 'load', 'Record independent load evidence on this document.', 'check-load');
  else if (history.behavior === 'failed') advice = decision('inspect-behavior-failure', 'recorded-behavior-failure', 'behavior', 'Inspect the preserved observation and expected value.');
  else if (history.behavior === 'passed') advice = decision('complete', 'original-document-and-source-match', 'behavior', 'Historical behavior passed on this document. The current check compared source and loaded script.');
  else advice = decision('verify-behavior', 'behavior-evidence-required', 'behavior', 'After any authorized project interaction, collect the reviewed observation or supply fresh Evidence with --evidence.', 'check-behavior');
  return { history, current: { ...comparison, load: stale || beforeDispatch ? 'unknown' : current.status,
    ...(current.observations ? { artifacts: current.observations.map(({ role, status, reason }) => ({ role, status, ...(reason ? { reason } : {}) })) } : {}) }, ...advice };
}

async function handoff(command, args, api) {
  const dir = args.receipt;
  directory(dir);
  if (!readStage(dir, 'build-intent')) throw failure('HANDOFF_BUILD_INTENT_MISSING', 'receipt', 'Select the original receipt containing build-intent.json.');
  const history = state(dir);
  const built = readStage(dir, 'build');
  const failed = readStage(dir, 'build-failure');
  if (!built || failed) {
    const reason = failed?.code || 'build-incomplete';
    const hint = failed?.hint || 'Inspect the build driver and its output, then use a fresh receipt and fresh ZIP paths.';
    if (command !== 'resume') throw failure('BUILD_NOT_VERIFIED', failed?.field || 'build', hint);
    return { history, ...decision(history.next, reason, failed?.field || 'build', hint) };
  }
  if (command === 'prepare-handoff') return prepare(dir, args, built, api);
  const manifest = readStage(dir, 'handoff');
  if (!manifest) {
    const hint = 'The originating developer can seal the original recipe, host, probe and expectation with prepare-handoff.';
    if (command !== 'resume') throw failure('HANDOFF_NOT_PREPARED', 'handoff', hint);
    return { history, ...decision('prepare-handoff', 'original-inputs-not-sealed', 'handoff', hint) };
  }
  const ctx = inputs(dir, manifest, built);
  const view = await assess(dir, ctx, built, api);
  if (command === 'resume') return view;
  if (!args.step || args.step !== view.argv?.at(-1)) throw failure('HANDOFF_STEP_BLOCKED', 'step', view.hint);
  const local = { ...ctx.files, receipt: dir };
  if (args.evidence && args.step !== 'check-behavior') throw failure('RECEIPT_USAGE', 'evidence', 'Evidence applies to the behavior step.');
  if (args.step === 'rebind') {
    const name = 'host-' + randomUUID() + '.json';
    const out = path.join(ctx.base, name);
    try { await pc.bind(local.host, ctx.host.target.targetId, ctx.host.target.document.url, out); }
    catch { throw failure('HANDOFF_REBIND_UNCONFIRMED', 'host', 'Inspect the original browser, tab and exact URL. Preserve any pending deployment.'); }
    verifyOwner(dir, hostRecord(out));
    append(ctx.base, 'binding-' + (ctx.generation + 1), { name, sha256: digest(localInput(out, 'host')) });
    return { completed: 'rebind', next: 'resume' };
  }
  if (args.step === 'check-behavior') {
    local.evidence = args.evidence || path.join(dir, 'evidence-' + randomUUID());
    if (!args.evidence) {
      try { await pc.capture({ 'host-file': local.host, probe: local.probe, out: local.evidence }); }
      catch { throw failure('HANDOFF_CAPTURE_FAILED', 'evidence', 'Inspect the preserved capture in the receipt and reconfirm the original document.'); }
    }
  }
  return api.advance(args.step, local);
}

module.exports = { handoff };
