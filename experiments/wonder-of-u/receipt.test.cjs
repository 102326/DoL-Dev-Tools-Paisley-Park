'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const { snapshot, state, append, targetIdentity } = require('./receipt.cjs');

function directory(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'won-receipt-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('input fingerprint distinguishes two dirty snapshots at the same HEAD', (t) => {
  const root = directory(t);
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git('init', '-q');
  fs.writeFileSync(path.join(root, 'entry.js'), 'const initial = 1;\n');
  git('add', 'entry.js');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture');
  fs.writeFileSync(path.join(root, 'entry.js'), 'const fixture = 2;\n');
  const first = snapshot(root, ['entry.js']);
  fs.writeFileSync(path.join(root, 'entry.js'), 'const fixture = 3;\n');
  const second = snapshot(root, ['entry.js']);
  assert.equal(first.head, second.head);
  assert.equal(first.dirty, true);
  assert.equal(second.dirty, true);
  assert.notEqual(first.sha256, second.sha256);
});

test('pending deployment cannot be silently overwritten or treated as a failure', (t) => {
  const dir = directory(t);
  append(dir, 'build', { status: 'built', artifact: { sha256: '0'.repeat(64) } });
  assert.equal(state(dir).next, 'check-current-target');
  append(dir, 'deployment-intent', { status: 'dispatching-unknown' });
  assert.equal(state(dir).next, 'observe-original-target');
  assert.equal(state(dir).deployment, 'unknown');
  assert.throws(() => append(dir, 'deployment-intent', { status: 'attempt-two' }), { code: 'RECEIPT_EXISTS' });
});

test('detached Chrome documents in the same target still have distinct proof identity', () => {
  const target = { profileId: 'x', browserId: 'b', targetId: 't', origin: 'http://127.0.0.1:8090',
    document: { frameId: 'frame', loaderId: 'first', url: 'http://127.0.0.1:8090/index.html', uniqueContextId: 'context' } };
  const first = targetIdentity(target);
  const next = targetIdentity({ ...target, document: { ...target.document, loaderId: 'next' } });
  assert.equal(first.targetSha256, next.targetSha256);
  assert.notEqual(first.documentSha256, next.documentSha256);
  assert.ok(!JSON.stringify(first).includes('127.0.0.1'));
});

test('a failed CLI build has no verified artifact and cannot authorize dispatch', (t) => {
  const root = directory(t);
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git('init', '-q');
  fs.writeFileSync(path.join(root, 'entry.js'), 'const fixture = 1;\n');
  git('add', 'entry.js');
  git('-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', '-c', 'commit.gpgsign=false', 'commit', '-qm', 'fixture');
  const driver = path.join(root, 'driver.cjs'), recipe = path.join(root, 'recipe.json'), dir = path.join(root, 'receipt');
  const artifact = path.join(root, 'new.zip');
  const cli = path.join(__dirname, 'dev-receipt.cjs');
  fs.writeFileSync(driver, 'process.stderr.write("private build output"); process.exit(1);');
  fs.writeFileSync(recipe, JSON.stringify({ schemaVersion: 1, root, driver, artifact, inputs: ['entry.js'], python: 'python3',
    args: [], scriptMember: 'release.js', transformation: 'utf8' }));
  const { spawnSync } = require('node:child_process');
  const run = (op, ...args) => spawnSync(process.execPath, [cli, op, '--receipt', dir, ...args], { encoding: 'utf8' });
  const failed = run('build', '--recipe', recipe);
  assert.equal(failed.status, 1);
  assert.equal(JSON.parse(failed.stderr).code, 'BUILDER_FAILED');
  assert(!failed.stderr.includes('private build output') && !failed.stderr.includes(root));
  assert.equal(JSON.parse(run('status').stdout).next, 'fix-build-and-start-new-receipt');
  const dispatch = run('deploy-begin', '--host', path.join(root, 'never-opened.json'), '--artifact', artifact, '--script-path', '/release.js');
  assert.equal(JSON.parse(dispatch.stderr).code, 'BUILD_NOT_VERIFIED');
  assert(!fs.existsSync(path.join(dir, 'deployment-intent.json')));
});

test('script comparison uses text from the selected realm and refuses ambiguous candidates', async () => {
  const { scriptObserver } = require('./loaded-script.cjs');
  const { digest } = require('./receipt.cjs');
  const url = 'http://127.0.0.1:8000/release.js';
  const observer = scriptObserver(url);
  const matches = 'const text = "甲乙";';
  const parsed = (scriptId, executionContextId) => observer.onEvent('Debugger.scriptParsed', { scriptId, url, executionContextId, hash: 'unrelated' });
  const send = async (method, args) => {
    if (method === 'Debugger.enable') { parsed('stale', 4); parsed('current', 5); return {}; }
    assert.equal(args.scriptId, 'current');
    return { scriptSource: matches };
  };
  assert.equal((await observer.compare(send, 5, digest(matches))).status, 'matched');
  parsed('duplicate', 5);
  assert.deepEqual(await observer.compare(send, 5, digest(matches)), { status: 'unknown', reason: 'ambiguous-script' });
});
