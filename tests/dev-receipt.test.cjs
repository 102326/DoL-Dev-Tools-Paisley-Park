'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const cli = path.resolve(__dirname, '../scripts/dol-dev.cjs');

test('the built CLI compares current source separately from historical receipt proof', t => {
  const python = process.env.WONDER_PYTHON || (process.platform === 'win32' ? 'python' : 'python3');
  if (spawnSync(python, ['--version'], { stdio: 'ignore' }).status !== 0) { t.skip('Python is required by the opt-in ZIP reader'); return; }
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'wonder-source-'));
  t.after(() => fs.rmSync(workspace, { recursive: true, force: true }));
  const root = path.join(workspace, 'source');
  fs.mkdirSync(root);
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  const file = path.join(root, 'entry.js');
  const readme = path.join(root, 'README.md');
  fs.writeFileSync(file, 'initial');
  fs.writeFileSync(readme, 'readme');
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture');
  const driver = path.join(workspace, 'driver.cjs');
  fs.writeFileSync(driver, `const {execFileSync}=require('node:child_process');
execFileSync(process.argv[2], ['-c','import sys, zipfile\\nwith zipfile.ZipFile(sys.argv[1], "x") as z:\\n z.writestr("release.js", "void 0;")',process.argv[3]]);
console.log(JSON.stringify({inputs:['entry.js']}));`);
  const recipe = path.join(workspace, 'recipe.json');
  const artifact = path.join(workspace, 'candidate.zip');
  const receipt = path.join(workspace, 'receipt');
  fs.writeFileSync(recipe, JSON.stringify({ schemaVersion: 1, root, driver, args: [python, artifact], artifact, inputs: ['entry.js'],
    python, scriptMember: 'release.js', transformation: 'utf8' }));
  const run = (op, ...args) => {
    const result = spawnSync(process.execPath, [cli, 'dev-receipt', op, '--receipt', receipt, ...args], { encoding: 'utf8' });
    return { code: result.status, data: result.stdout.trim() ? JSON.parse(result.stdout) : null, error: result.stderr };
  };
  fs.writeFileSync(file, 'first dirty');
  const build = run('build', '--recipe', recipe);
  assert.equal(build.code, 0, build.error);
  assert.equal(run('resume').data.reason, 'original-inputs-not-sealed');
  const different = path.join(workspace, 'different.json');
  fs.writeFileSync(different, fs.readFileSync(recipe, 'utf8') + '\n');
  const projectInputs = ['--host', recipe, '--probe', recipe, '--expect', recipe];
  const rejected = run('prepare-handoff', '--recipe', different, ...projectInputs);
  assert.equal(rejected.code, 1);
  assert.equal(JSON.parse(rejected.error).code, 'HANDOFF_RECIPE_MISMATCH');
  assert(!rejected.error.includes(workspace));
  assert(!fs.existsSync(path.join(receipt, 'handoff.json')));
  const profile = fs.realpathSync(workspace);
  const origin = 'http://127.0.0.1:8000';
  const binding = path.join(workspace, 'host.json');
  fs.writeFileSync(binding, JSON.stringify({ format: 'paisley-owned-chrome', version: 1, executable: process.execPath,
    resourceDigest: 'b'.repeat(64), profilePath: profile, target: { host: 'chrome', profilePath: profile,
      profileId: require('node:crypto').createHash('sha256').update(profile).digest('hex'),
      browserId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', processId: 2147483647, targetId: 'selected', origin,
      endpoint: 'http://127.0.0.1:9222', document: { frameId: 'f', loaderId: 'l', url: origin, uniqueContextId: 'c' } } }));
  const prepare = ['--recipe', recipe, '--host', binding, '--probe', file, '--expect', different, '--script-path', '/release.js'];
  assert.equal(run('prepare-handoff', ...prepare).data.prepared, true);
  assert.equal(JSON.parse(run('prepare-handoff', ...prepare).error).code, 'RECEIPT_EXISTS');
  const seal = JSON.parse(fs.readFileSync(path.join(receipt, 'handoff.json')));
  const fromDirectory = spawnSync(process.execPath, seal.start.argv, { cwd: receipt, encoding: 'utf8' });
  const original = JSON.parse(fromDirectory.stdout);
  assert.equal(original.current.source, 'matched');
  assert.equal(original.reason, 'cdp-unavailable');
  assert.equal(JSON.parse(run('continue', '--step', 'check-load').error).code, 'HANDOFF_STEP_BLOCKED');
  const history = fs.readFileSync(path.join(receipt, 'build.json'));
  fs.writeFileSync(readme, 'edited but not in the build graph');
  fs.writeFileSync(path.join(root, 'local-evidence.json'), '{"local":true}');
  assert.equal(run('verify-source', '--recipe', recipe).data.source, 'matched');
  fs.writeFileSync(file, 'second dirty');
  const drift = run('verify-source', '--recipe', recipe);
  assert.equal(drift.code, 2);
  assert.equal(drift.data.source, 'needs-rebuild');
  assert.equal(drift.data.artifactSha256, build.data.artifactSha256);
  assert.deepEqual(fs.readFileSync(path.join(receipt, 'build.json')), history);
  assert.equal(run('resume').data.next, 'build-current-source-in-new-receipt');
  const sealedProbe = path.join(receipt, seal.slot, 'probe.js');
  const otherBehavior = path.join(receipt, 'behavior.json');
  fs.writeFileSync(otherBehavior, JSON.stringify({ status: 'passed', probeSha256: seal.hashes.probe, expectationSha256: '0'.repeat(64) }));
  assert.equal(JSON.parse(run('resume').error).code, 'HANDOFF_BEHAVIOR_CONTRACT_CHANGED');
  fs.unlinkSync(otherBehavior);
  fs.appendFileSync(sealedProbe, 'changed');
  assert.equal(JSON.parse(run('continue', '--step', 'check-behavior').error).field, 'probe');
  assert(!fs.existsSync(path.join(receipt, 'load.json')));
  fs.unlinkSync(file);
  assert.equal(run('verify-source', '--recipe', recipe).data.source, 'unknown');
  assert(!fs.existsSync(path.join(receipt, 'deployment-intent.json')));
});


test('directory-only handoff explains failed builds and blocks every continuation', t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'receipt-failure-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const root = path.join(dir, 'project');
  fs.mkdirSync(root);
  const driver = path.join(root, 'broken.cjs');
  fs.writeFileSync(driver, "console.error('private-error-output'); process.exit(3)");
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git('init', '-q');
  git('add', '.');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture');
  const recipe = path.join(dir, 'recipe.json');
  fs.writeFileSync(recipe, JSON.stringify({ schemaVersion: 1, root, driver, args: [], artifact: path.join(dir, 'out.zip'),
    inputs: ['broken.cjs'], transformation: 'utf8', scriptMember: 'main.js', scriptPath: '/main.js', python: 'python3' }));
  const receipt = path.join(dir, 'receipt');
  const cliCall = (command, ...args) => spawnSync(process.execPath, [cli, 'dev-receipt', command, '--receipt', receipt, ...args], { encoding: 'utf8' });
  assert.equal(cliCall('build', '--recipe', recipe).status, 1);
  const before = fs.readdirSync(receipt);
  const recovery = cliCall('resume');
  assert.equal(recovery.status, 0);
  const { history, field, reason, hint } = JSON.parse(recovery.stdout);
  assert.equal(history.build, 'failed');
  assert.equal(field, 'driver');
  assert.equal(reason, 'BUILDER_FAILED');
  assert.match(hint, /fix the build/);
  assert(!recovery.stdout.includes(dir) && !recovery.stdout.includes('private-error-output'));
  for (const step of ['rebind', 'check-load', 'check-behavior'])
    assert.equal(JSON.parse(cliCall('continue', '--step', step).stderr).code, 'BUILD_NOT_VERIFIED');
  assert.deepEqual(fs.readdirSync(receipt), before);
});
