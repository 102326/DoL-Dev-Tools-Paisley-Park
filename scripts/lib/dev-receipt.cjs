'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs, isDeepStrictEqual } = require('node:util');
const { spawnSync } = require('node:child_process');
const { ChromeHost } = require('./chrome-host.cjs');
const { snapshot, digest, hashObject, failure, readBytes, readStage, append, state, targetIdentity } = require('./dev-receipt-store.cjs');
const { archiveIdentity, hostRecord, inspect } = require('./dev-receipt-load.cjs');
const now = () => new Date().toISOString();

const commands = {
  resume: ['receipt'],
  'prepare-handoff': ['receipt', 'recipe', 'host', 'probe', 'expect'],
  continue: ['receipt', 'step'],
  build: ['receipt', 'recipe'],
  status: ['receipt'],
  'verify-source': ['receipt', 'recipe'],
  'verify-current': ['receipt', 'recipe', 'host'],
  'deploy-begin': ['receipt', 'host', 'recipe'],
  'deploy-ack': ['receipt', 'host'],
  'check-load': ['receipt', 'host'],
  'check-behavior': ['receipt', 'host', 'evidence', 'probe', 'expect'],
};

function required(ok, code, field, hint) { if (!ok) throw failure(code, field, hint); }
function abs(file) { return typeof file === 'string' && path.isAbsolute(file); }
function dirAbsent(file) {
  try { fs.lstatSync(file); return false; } catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}

const optional = { 'prepare-handoff': ['script-path'], continue: ['evidence'], 'verify-current': ['script-path'], 'deploy-begin': ['artifact', 'script-path'], 'check-load': ['script-path'] };

function recipe(file) {
  const bytes = readBytes(file, 65536);
  let r;
  try { r = JSON.parse(bytes); } catch { /* Invalid configuration below. */ }
  const entries = r?.schemaVersion === 1 ? [r] : r?.artifacts;
  const transforms = ['utf8', 'utf8-strip-bom', 'utf8-inline-html'];
  const mapping = item => typeof item?.scriptPath === 'string' && item.scriptPath.startsWith('/') && !item.scriptPath.startsWith('//');
  required([1, 2].includes(r?.schemaVersion) && abs(r.root) && abs(r.driver) && Array.isArray(r.inputs)
    && Array.isArray(r.args) && r.args.length <= 32 && r.args.every(v => typeof v === 'string' && v.length <= 4096)
    && typeof r.python === 'string' && (abs(r.python) || ['python', 'python3'].includes(r.python))
    && Array.isArray(entries) && entries.length >= 1 && entries.length <= 8
    && entries.every(item => abs(item?.artifact) && typeof item.scriptMember === 'string' && item.scriptMember.length > 0 && item.scriptMember.length <= 256
      && transforms.includes(item.transformation) && (r.schemaVersion === 1 ? item.scriptPath === undefined || mapping(item)
        : typeof item.role === 'string' && /^[a-z][a-z0-9-]{0,31}$/.test(item.role) && mapping(item)))
    && new Set(entries.map(item => item.artifact)).size === entries.length
    && (r.schemaVersion === 1 || (new Set(entries.map(item => item.role)).size === entries.length &&
      new Set(entries.map(item => item.scriptPath)).size === entries.length)),
    'BUILD_RECIPE_INVALID', 'recipe', 'Provide reviewed local inputs, driver, ZIP members and explicit same-origin script mappings.');
  return { r, entries, recipeSha256: digest(bytes) };
}

function compareSource(built, file) {
  const unknown = reason => ({ source: 'unknown', sourceReason: reason });
  if (!built?.sourceProof) return unknown('original-recipe-unrecorded');
  try {
    const { r, recipeSha256 } = recipe(file);
    if (recipeSha256 !== built.sourceProof.recipeSha256) return unknown('original-recipe-required');
    const current = snapshot(r.root, r.inputs);
    const driver = digest(readBytes(r.driver, 1024 * 1024));
    return { source: current.sha256 === built.inputs.sha256 && driver === built.sourceProof.driverSha256 ? 'matched' : 'needs-rebuild',
      sourceFingerprint: hashObject([current.sha256, driver]) };
  } catch { return unknown('source-inputs-unavailable'); }
}

function build(dir, recipeFile) {
  const { r, entries, recipeSha256 } = recipe(recipeFile);
  required(entries.every(item => dirAbsent(item.artifact)), 'ARTIFACT_EXISTS', 'artifact', 'Use new artifact paths to prevent stale output attribution.');
  const before = snapshot(r.root, r.inputs);
  const driverHash = digest(readBytes(r.driver, 1024 * 1024));
  fs.mkdirSync(dir, { mode: 0o700 });
  append(dir, 'build-intent', { status: 'building', at: now(), inputs: before, driverSha256: driverHash, recipeSha256, node: process.version });
  try {
    const run = spawnSync(process.execPath, [r.driver, ...r.args], { cwd: r.root, timeout: 120000, maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    required(run.status === 0, 'BUILDER_FAILED', 'driver', 'Run the reviewed build driver in its project and fix the build before opening a new receipt.');
    const after = snapshot(r.root, r.inputs);
    required(before.sha256 === after.sha256 && before.head === after.head && driverHash === digest(readBytes(r.driver, 1024 * 1024))
      && recipeSha256 === digest(readBytes(recipeFile, 65536)),
      'BUILD_INPUT_CHANGED', 'inputs', 'Stabilize the build inputs and use a new artifact and receipt.');
    // A driver reports its resolved in-repository inputs, for example from an esbuild metafile.
    // Extra declared inputs can include package/lock files in addition to the graph.
    const manifest = JSON.parse(run.stdout.toString('utf8'));
    const approved = new Set(r.inputs);
    required(Array.isArray(manifest?.inputs) && manifest.inputs.length > 0 && manifest.inputs.length <= 512 && manifest.inputs.every(v => approved.has(v)),
      'BUILD_GRAPH_UNDECLARED', 'inputs', 'Compare the actual build graph to the declared inputs.');
    const sealed = entries.map(item => ({ ...(item.role ? { role: item.role } : {}), ...(item.scriptPath ? { scriptPath: item.scriptPath } : {}),
      ...archiveIdentity(item.artifact, item.scriptMember, r.python, item.transformation) }));
    const artifact = r.schemaVersion === 1 ? sealed[0] : { sha256: hashObject(sealed.map(item => [item.role, item.sha256])), artifacts: sealed };
    append(dir, 'build', { status: 'built', at: now(), inputs: before, graph: [...new Set(manifest.inputs)].sort(),
      sourceProof: { recipeSha256, driverSha256: driverHash }, artifact });
    return state(dir);
  } catch (error) {
    const code = error.field ? error.code : 'BUILD_EVIDENCE_FAILED';
    append(dir, 'build-failure', { status: 'failed', at: now(), code, ...(error.field ? { field: error.field, hint: error.hint } : {}) });
    if (error.field) throw error;
    throw failure(code, 'build', 'Verify the driver JSON and sealed ZIP in a new receipt.');
  }
}

async function assertCurrent(target) {
  const host = new ChromeHost(target);
  try { await host.open(); await host.assertBound(); }
  catch { throw failure('CURRENT_DOCUMENT_UNVERIFIED', 'host', 'Observe and explicitly bind the original live target.'); }
  finally { host.close(); }
}

function mappings(artifact, supplied) {
  if (artifact.artifacts) {
    required(!supplied, 'SCRIPT_MAPPING_CHANGED', 'scriptPath', 'Use the complete set of script mappings sealed with this build.');
    return artifact.artifacts;
  }
  required(!artifact.scriptPath || !supplied || artifact.scriptPath === supplied,
    'SCRIPT_MAPPING_CHANGED', 'scriptPath', 'Use the script mapping sealed with this build.');
  const scriptPath = artifact.scriptPath || supplied;
  required(scriptPath, 'SCRIPT_MAPPING_REQUIRED', 'scriptPath', 'Provide the original reviewed same-origin mapping.');
  return [{ ...artifact, scriptPath }];
}

async function inspectBuild(host, selected) {
  if (selected.length === 1 && !selected[0].role) return inspect(host, selected[0].scriptPath, selected[0].representative.comparableTextSha256);
  const observations = [];
  for (const { role, scriptPath, representative } of selected) {
    observations.push({ role, ...await inspect(host, scriptPath, representative.comparableTextSha256) });
  }
  const status = observations.some(item => item.status === 'unknown') ? 'unknown' :
    observations.some(item => item.status === 'mismatch') ? 'mismatch' : 'matched';
  return { status, observations, ...(status === 'unknown' ? { reason: 'one-or-more-scripts-unverified' } : {}) };
}

function verifyArtifacts(built, args) {
  const sealed = built.artifact.artifacts ?? [built.artifact];
  const files = recipe(args.recipe).entries.map(item => item.artifact);
  required(!args.artifact || files.length === 1 && files[0] === args.artifact, 'DEPLOY_ARTIFACT_CHANGED',
    'artifact', 'The recipe selects the original artifact path. Remove the conflicting override.');
  required(files.length === sealed.length && files.every((file, i) => abs(file) && digest(readBytes(file, 64 * 1024 * 1024)) === sealed[i].sha256),
    'DEPLOY_ARTIFACT_CHANGED', 'artifact', 'Select the complete original sealed ZIP set.');
}

async function advance(command, args) {
  const dir = args.receipt;
  if (['resume', 'continue', 'prepare-handoff'].includes(command))
    return require('./dev-handoff.cjs').handoff(command, args, { mappings, compareSource, inspectBuild, advance });
  if (command === 'build') return build(dir, args.recipe);
  if (command === 'status') return state(dir);
  const built = readStage(dir, 'build');
  if (command === 'verify-source') {
    const history = state(dir);
    const comparison = compareSource(built, args.recipe);
    return { ...history, ...comparison, next: verificationNext(comparison.source, history.next) };
  }
  required(built?.status === 'built' && !readStage(dir, 'build-failure'), 'BUILD_NOT_VERIFIED', 'build', 'Inspect the original build result before continuing.');
  const intent = readStage(dir, 'deployment-intent');
  const ack = readStage(dir, 'deployment-ack');
  const load = readStage(dir, 'load');
  const host = hostRecord(args.host);
  const identity = { targetSha256: host.targetSha256, documentSha256: host.documentSha256 };
  const mapping = args['script-path'] || intent?.scriptPath || load?.scriptPath;
  const selection = () => mappings(built.artifact, mapping);
  if (command === 'verify-current') {
    // Current inspection can report old build bytes on the original document alongside source drift.
    const originalTargetChanged = intent && intent.targetSha256 !== host.targetSha256;
    const verifiedDocument = ack || load;
    const documentChanged = verifiedDocument && verifiedDocument.documentSha256 !== host.documentSha256;
    const stillPreDispatchDocument = intent && intent.documentSha256 === host.documentSha256;
    const recordedPath = intent?.scriptPath || load?.scriptPath;
    const mappingChanged = recordedPath && args['script-path'] && recordedPath !== args['script-path'];
    const current = originalTargetChanged || documentChanged || stillPreDispatchDocument || mappingChanged
      ? { status: 'unknown', reason: mappingChanged ? 'original-script-mapping-required' :
        stillPreDispatchDocument ? 'new-document-required' : 'original-binding-required' }
      : await inspectBuild(host, selection());
    const comparison = compareSource(built, args.recipe);
    const history = state(dir);
    const fallback = current.status === 'unknown' ? 'observe-original-target' :
      current.status === 'mismatch' ? 'inspect-loaded-artifact' : load ? history.next : 'record-loaded-artifact';
    return { ...history, ...comparison, currentLoad: current.status, ...(current.reason ? { loadReason: current.reason } : {}),
      ...(current.observations ? { currentArtifacts: current.observations.map(({ role, status }) => ({ role, status })) } : {}),
      next: intent && !load && current.status !== 'matched' ? fallback : verificationNext(comparison.source, fallback) };
  }
  if (intent) required(host.targetSha256 === intent.targetSha256, 'DEPLOY_TARGET_CHANGED', 'host', 'Return to the original owned target.');
  if (ack) required(host.documentSha256 === ack.documentSha256, 'DEPLOY_DOCUMENT_CHANGED', 'host', 'Use the originally acknowledged document. Inspect any replacement separately.');
  if (command === 'deploy-begin') {
    required(!intent && !load, 'DEPLOY_ALREADY_RECORDED', 'receipt', 'Use status and observe before considering a new deployment.');
    const requireCurrentSource = () => {
      const { source } = compareSource(built, args.recipe);
      required(source === 'matched', source === 'needs-rebuild' ? 'BUILD_SOURCE_DRIFT' : 'BUILD_SOURCE_UNKNOWN',
        'recipe', source === 'needs-rebuild' ? 'Build the current inputs in a new receipt. Keep the original deployment records.'
          : 'Use the original reviewed recipe and available inputs, or build in a new receipt if the original recipe was not recorded.');
    };
    requireCurrentSource();
    verifyArtifacts(built, args);
    const current = await inspectBuild(host, selection());
    // Live observation yields to other processes. Recheck sources before publishing a decision.
    requireCurrentSource();
    if (current.status === 'matched') {
      append(dir, 'load', { ...identity, ...current, at: now(), ...(mapping ? { scriptPath: mapping } : {}), mode: 'already-loaded' });
      return state(dir);
    }
    required(current.status === 'mismatch', 'PREDEPLOY_OBSERVATION_UNKNOWN', 'host', 'Resolve the live target or script mapping before issuing an intent.');
    append(dir, 'deployment-intent', { ...identity, status: 'dispatching-unknown', at: now(), artifactSha256: built.artifact.sha256, ...(mapping ? { scriptPath: mapping } : {}) });
    return state(dir);
  }
  if (command === 'deploy-ack') {
    required(intent && !load && !ack, 'DEPLOYMENT_INTENT_REQUIRED', 'receipt', 'Use the original pending deployment receipt.');
    required(host.documentSha256 !== intent.documentSha256, 'NEW_DOCUMENT_REQUIRED', 'host', 'Bind the newly deployed document on the original target.');
    await assertCurrent(host.target);
    append(dir, 'deployment-ack', { ...identity, status: 'acknowledged', at: now() });
    return state(dir);
  }
  if (command === 'check-load') {
    required(!load, 'LOAD_ALREADY_RECORDED', 'receipt', 'Reuse the recorded document and continue with behavior verification.');
    if (intent) {
      required(mapping === intent.scriptPath, 'SCRIPT_MAPPING_CHANGED', 'scriptPath', 'Use the mapping selected at deployment.');
      required(host.documentSha256 !== intent.documentSha256, 'NEW_DOCUMENT_REQUIRED', 'host', 'Observe the original target and bind its new document.');
    }
    const actual = await inspectBuild(host, selection());
    required(actual.status === 'matched', actual.status === 'mismatch' ? 'LOADED_ARTIFACT_MISMATCH' : 'LOADED_ARTIFACT_UNKNOWN',
      'scriptPath', actual.status === 'mismatch' ? 'Check the loaded script against the sealed package without replaying a pending deployment.' : `Observe the original target and review the mapping (${actual.reason}).`);
    append(dir, 'load', { ...identity, ...actual, at: now(), ...(mapping ? { scriptPath: mapping } : {}), mode: ack ? 'after-ack' : intent ? 'pending-observation' : 'already-loaded' });
    return state(dir);
  }
  required(load?.status === 'matched' && host.documentSha256 === load.documentSha256, 'LOAD_NOT_VERIFIED', 'host', 'Verify the loaded artifact on this exact document first.');
  required(!readStage(dir, 'behavior'), 'BEHAVIOR_ALREADY_RECORDED', 'receipt', 'Read the recorded result.');
  const manifestBytes = readBytes(path.join(args.evidence, 'manifest.json'), 65536);
  const manifest = JSON.parse(manifestBytes.toString('utf8'));
  required(['observed', 'dispatch-acknowledged'].includes(manifest.status) && !manifest.failure && manifest.identity?.document
    && targetIdentity({ ...host.target, ...manifest.identity }).documentSha256 === host.documentSha256
    && Date.parse(manifest.capturedAt) >= Date.parse(load.at), 'BEHAVIOR_EVIDENCE_STALE', 'evidence', 'Capture a new successful pc-observe or pc-action on the verified document.');
  const probe = readBytes(args.probe, 32768);
  const observation = readBytes(path.join(args.evidence, 'state-after.json'), 65536);
  const observationHash = digest(observation);
  required(digest(probe) === manifest.probeSha256 && manifest.artifacts?.some(v => v.file === 'state-after.json' && v.sha256 === observationHash),
    'BEHAVIOR_EVIDENCE_MISMATCH', 'evidence', 'Use the exact reviewed probe and its captured evidence.');
  const actual = await inspectBuild(host, selection());
  required(actual.status === 'matched', 'LOADED_ARTIFACT_CHANGED', 'host', 'Reconfirm the loaded artifact before accepting behavior evidence.');
  const expectedBytes = readBytes(args.expect, 65536);
  const matched = isDeepStrictEqual(JSON.parse(observation.toString('utf8')), JSON.parse(expectedBytes.toString('utf8')));
  const evidenceName = path.relative(dir, args.evidence);
  append(dir, 'behavior', { ...identity,
    ...(/^evidence-[0-9a-f-]{36}$/.test(evidenceName) ? { localEvidence: evidenceName } : {}), status: matched ? 'passed' : 'failed', at: now(), evidenceSha256: digest(manifestBytes),
    observationSha256: observationHash, expectationSha256: digest(expectedBytes), probeSha256: digest(probe) });
  required(matched, 'BEHAVIOR_MISMATCH', 'expect', 'Inspect the preserved evidence and expected behavior.');
  return state(dir);
}

function verificationNext(source, next) {
  return source === 'needs-rebuild' ? 'build-current-source-in-new-receipt' : source === 'unknown' ? 'inspect-source-comparison' : next;
}

async function main(argvInput) {
  const [command, ...argv] = argvInput;
  if (!command || command === '--help') {
    console.log('Wonder of U research CLI for authorized builds and isolated local Chrome targets');
    for (const [name, fields] of Object.entries(commands)) {
      const option = field => `--${field} ${field === 'step' ? 'STEP_FROM_RESUME' : field === 'script-path' ? 'OWNED_URL_PATH' : 'ABS_PATH'}`;
      console.log(`  ${name} ${[...fields.map(option), ...(optional[name] ?? []).map(field => `[${option(field)}]`)].join(' ')}`);
    }
    console.log('Start in the receipt directory: resume --receipt . (read-only). Continue only with the step suggested by resume.');
    console.log('Verify operations exit 2 for drift, mismatch, or incomplete comparisons. Status is historical. See docs/DEV_RECEIPT.md.');
    return;
  }
  required(Object.hasOwn(commands, command), 'RECEIPT_USAGE', 'command', 'Use --help for the research CLI.');
  const fields = commands[command];
  let values;
  try { ({ values } = parseArgs({ args: argv, options: Object.fromEntries([...fields, ...(optional[command] ?? [])].map(k => [k, { type: 'string' }])) })); }
  catch { throw failure('RECEIPT_USAGE', 'options', 'Supply the exact fields listed in --help.'); }
  if (values.receipt === '.') values.receipt = path.resolve('.');
  for (const key of [...fields, ...Object.keys(values)]) required(['step', 'script-path'].includes(key) ? typeof values[key] === 'string' : abs(values[key]),
    'RECEIPT_USAGE', key, 'Use absolute paths except for the explicit same-origin script mapping.');
  const result = await advance(command, values);
  console.log(JSON.stringify(result, null, 2));
  if (['verify-source', 'verify-current'].includes(command) && (result.source !== 'matched' || result.currentLoad && result.currentLoad !== 'matched')) process.exitCode = 2;
}

function run(argv) { return main(argv).catch(error => {
  const details = error.field ? { code: error.code, field: error.field, hint: error.hint } :
    { code: 'RECEIPT_OPERATION_FAILED', hint: 'Inspect the selected local inputs and receipt status. Do not replay an uncertain deployment.' };
  console.error(JSON.stringify(details));
  process.exitCode = 1;
}); }
module.exports = { run };
