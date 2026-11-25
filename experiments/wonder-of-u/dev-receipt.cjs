'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { parseArgs, isDeepStrictEqual } = require('node:util');
const { spawnSync } = require('node:child_process');
const { ChromeHost } = require('../../scripts/lib/chrome-host.cjs');
const { snapshot, digest, failure, readJson, readBytes, readStage, append, state, targetIdentity } = require('./receipt.cjs');
const { archiveIdentity, hostRecord, inspect } = require('./loaded-script.cjs');
const now = () => new Date().toISOString();

const commands = {
  build: ['receipt', 'recipe'],
  status: ['receipt'],
  'deploy-begin': ['receipt', 'host', 'artifact', 'script-path'],
  'deploy-ack': ['receipt', 'host'],
  'check-load': ['receipt', 'host', 'script-path'],
  'check-behavior': ['receipt', 'host', 'evidence', 'probe', 'expect'],
};

function required(ok, code, field, hint) { if (!ok) throw failure(code, field, hint); }
function abs(file) { return typeof file === 'string' && path.isAbsolute(file); }
function dirAbsent(file) {
  try { fs.lstatSync(file); return false; } catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}

function build(dir, recipeFile) {
  const recipeBytes = readBytes(recipeFile, 65536);
  const r = JSON.parse(recipeBytes);
  required(r?.schemaVersion === 1 && ['root', 'driver', 'artifact'].every(k => abs(r[k])) && Array.isArray(r.inputs)
    && Array.isArray(r.args) && r.args.length <= 32 && r.args.every(v => typeof v === 'string' && v.length <= 4096)
    && typeof r.scriptMember === 'string' && r.scriptMember.length <= 256 && typeof r.python === 'string'
    && (abs(r.python) || ['python', 'python3'].includes(r.python)) && ['utf8', 'utf8-strip-bom', 'utf8-inline-html'].includes(r.transformation),
    'BUILD_RECIPE_INVALID', 'recipe', 'Provide a reviewed local Node driver, bounded arguments, explicit inputs and a new ZIP path.');
  required(dirAbsent(r.artifact), 'ARTIFACT_EXISTS', 'artifact', 'Use a new artifact path to prevent stale output attribution.');
  const before = snapshot(r.root, r.inputs);
  const driverHash = digest(readBytes(r.driver, 1024 * 1024));
  fs.mkdirSync(dir, { mode: 0o700 });
  append(dir, 'build-intent', { status: 'building', at: now(), inputs: before, driverSha256: driverHash, recipeSha256: digest(recipeBytes), node: process.version });
  try {
    const run = spawnSync(process.execPath, [r.driver, ...r.args], { cwd: r.root, timeout: 120000, maxBuffer: 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true });
    required(run.status === 0, 'BUILDER_FAILED', 'driver', 'Run the reviewed build driver in its project and fix the build before opening a new receipt.');
    const after = snapshot(r.root, r.inputs);
    required(before.sha256 === after.sha256 && before.head === after.head && driverHash === digest(readBytes(r.driver, 1024 * 1024)),
      'BUILD_INPUT_CHANGED', 'inputs', 'Stabilize the build inputs and use a new artifact and receipt.');
    // A driver reports its resolved in-repository inputs, for example from an esbuild metafile.
    // Extra declared inputs can include package/lock files in addition to the graph.
    const manifest = JSON.parse(run.stdout.toString('utf8'));
    const approved = new Set(r.inputs);
    required(Array.isArray(manifest?.inputs) && manifest.inputs.length > 0 && manifest.inputs.length <= 512 && manifest.inputs.every(v => approved.has(v)),
      'BUILD_GRAPH_UNDECLARED', 'inputs', 'Compare the actual build graph to the declared inputs.');
    const artifact = archiveIdentity(r.artifact, r.scriptMember, r.python, r.transformation);
    append(dir, 'build', { status: 'built', at: now(), inputs: before, graph: [...new Set(manifest.inputs)].sort(), artifact });
    return state(dir);
  } catch (error) {
    const code = error.field ? error.code : 'BUILD_EVIDENCE_FAILED';
    append(dir, 'build-failure', { status: 'failed', at: now(), code });
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

async function advance(command, args) {
  const dir = args.receipt;
  if (command === 'build') return build(dir, args.recipe);
  if (command === 'status') return state(dir);
  const built = readStage(dir, 'build');
  required(built?.status === 'built' && !readStage(dir, 'build-failure'), 'BUILD_NOT_VERIFIED', 'build', 'Inspect the original build result before continuing.');
  const intent = readStage(dir, 'deployment-intent');
  const ack = readStage(dir, 'deployment-ack');
  const load = readStage(dir, 'load');
  const host = hostRecord(args.host);
  const identity = { targetSha256: host.targetSha256, documentSha256: host.documentSha256 };
  const scriptHash = built.artifact.representative.comparableTextSha256;
  if (intent) required(host.targetSha256 === intent.targetSha256, 'DEPLOY_TARGET_CHANGED', 'host', 'Return to the original owned target.');
  if (ack) required(host.documentSha256 === ack.documentSha256, 'DEPLOY_DOCUMENT_CHANGED', 'host', 'Use the originally acknowledged document. Inspect any replacement separately.');
  if (command === 'deploy-begin') {
    required(!intent && !load, 'DEPLOY_ALREADY_RECORDED', 'receipt', 'Use status and observe before considering a new deployment.');
    required(digest(readBytes(args.artifact, 64 * 1024 * 1024)) === built.artifact.sha256,
      'DEPLOY_ARTIFACT_CHANGED', 'artifact', 'Select the original sealed ZIP.');
    const current = await inspect(host, args['script-path'], scriptHash);
    if (current.status === 'matched') {
      append(dir, 'load', { ...identity, ...current, at: now(), scriptPath: args['script-path'], mode: 'already-loaded' });
      return state(dir);
    }
    required(current.status === 'mismatch', 'PREDEPLOY_OBSERVATION_UNKNOWN', 'host', 'Resolve the live target or script mapping before issuing an intent.');
    append(dir, 'deployment-intent', { ...identity, status: 'dispatching-unknown', at: now(), artifactSha256: built.artifact.sha256, scriptPath: args['script-path'] });
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
      required(args['script-path'] === intent.scriptPath, 'SCRIPT_MAPPING_CHANGED', 'scriptPath', 'Use the mapping selected at deployment.');
      required(host.documentSha256 !== intent.documentSha256, 'NEW_DOCUMENT_REQUIRED', 'host', 'Observe the original target and bind its new document.');
    }
    const actual = await inspect(host, args['script-path'], scriptHash);
    required(actual.status === 'matched', actual.status === 'mismatch' ? 'LOADED_ARTIFACT_MISMATCH' : 'LOADED_ARTIFACT_UNKNOWN',
      'scriptPath', actual.status === 'mismatch' ? 'Check the loaded script against the sealed package without replaying a pending deployment.' : `Observe the original target and review the mapping (${actual.reason}).`);
    append(dir, 'load', { ...identity, ...actual, at: now(), scriptPath: args['script-path'], mode: ack ? 'after-ack' : intent ? 'pending-observation' : 'already-loaded' });
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
  const actual = await inspect(host, load.scriptPath, scriptHash);
  required(actual.status === 'matched', 'LOADED_ARTIFACT_CHANGED', 'host', 'Reconfirm the loaded artifact before accepting behavior evidence.');
  const expectedBytes = readBytes(args.expect, 65536);
  const matched = isDeepStrictEqual(JSON.parse(observation.toString('utf8')), JSON.parse(expectedBytes.toString('utf8')));
  append(dir, 'behavior', { ...identity, status: matched ? 'passed' : 'failed', at: now(), evidenceSha256: digest(manifestBytes),
    observationSha256: observationHash, expectationSha256: digest(expectedBytes), probeSha256: digest(probe) });
  required(matched, 'BEHAVIOR_MISMATCH', 'expect', 'Inspect the preserved evidence and expected behavior.');
  return state(dir);
}

async function main() {
  const [command, ...argv] = process.argv.slice(2);
  if (!command || command === '--help') {
    console.log('Wonder of U research CLI (owned neutral targets only)');
    for (const [name, fields] of Object.entries(commands)) console.log(`  ${name} ${fields.map(field => `--${field} ${field === 'script-path' ? 'OWNED_URL_PATH' : 'ABS_PATH'}`).join(' ')}`);
    return;
  }
  required(Object.hasOwn(commands, command), 'RECEIPT_USAGE', 'command', 'Use --help for the research CLI.');
  const fields = commands[command];
  let values;
  try { ({ values } = parseArgs({ args: argv, options: Object.fromEntries(fields.map(k => [k, { type: 'string' }])) })); }
  catch { throw failure('RECEIPT_USAGE', 'options', 'Supply the exact fields listed in --help.'); }
  for (const key of fields) required(key === 'script-path' ? typeof values[key] === 'string' : abs(values[key]),
    'RECEIPT_USAGE', key, 'Use absolute paths except for the explicit same-origin script mapping.');
  console.log(JSON.stringify(await advance(command, values), null, 2));
}

main().catch(error => {
  const details = error.field ? { code: error.code, field: error.field, hint: error.hint } :
    { code: 'RECEIPT_OPERATION_FAILED', hint: 'Inspect the selected local inputs and receipt status. Do not replay an uncertain deployment.' };
  console.error(JSON.stringify(details));
  process.exitCode = 1;
});
