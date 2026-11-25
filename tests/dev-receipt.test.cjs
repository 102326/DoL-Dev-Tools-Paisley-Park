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
  fs.unlinkSync(file);
  assert.equal(run('verify-source', '--recipe', recipe).data.source, 'unknown');
  assert(!fs.existsSync(path.join(receipt, 'deployment-intent.json')));
});
