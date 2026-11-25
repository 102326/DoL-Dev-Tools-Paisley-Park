'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { load, serve } = require('../../scripts/lib/pc-http.cjs');
const { launch } = require('../../scripts/lib/chrome-launch.cjs');
const { connect } = require('../../scripts/lib/cdp.cjs');
const { compareHandoffs } = require('./fixtures/codex-handoff.cjs');
const { digest, readStage } = require('./receipt.cjs');
const exec = promisify(execFile);
const cli = path.resolve(__dirname, '../../scripts/dol-dev.cjs');
const receiptCli = path.join(__dirname, 'dev-receipt.cjs');
const driver = path.join(__dirname, 'fixtures/build-sticky.cjs');
const component = 'experiments/native-contract/startup-diagnostics.ts';
const [root, dependencyRoot, chrome, out, portText, python = 'python3'] = process.argv.slice(2);
const port = Number(portText);
const fault = process.env.WONDER_DISPATCH_FAULT ?? 'timeout';

async function main() {
  assert(['timeout', 'disconnect'].includes(fault));
  assert([root, dependencyRoot, chrome, out].every(value => typeof value === 'string' && path.isAbsolute(value)));
  fs.mkdirSync(out, { mode: 0o700 });
  const file = name => path.join(out, name);
  const write = (name, value) => { fs.writeFileSync(file(name), typeof value === 'string' ? value : JSON.stringify(value), { flag: 'wx', mode: 0o600 }); return file(name); };
  const run = (entry, args) => exec(process.execPath, [entry, ...args], { timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true });
  const command = async (entry, args) => JSON.parse((await run(entry, args)).stdout);
  const receipt = (op, name, ...args) => command(receiptCli, [op, '--receipt', file(name), ...args]);
  const expectError = async (code, name, op, ...args) => {
    await assert.rejects(receipt(op, name, ...args), error => {
      const result = JSON.parse(error.stderr);
      return result.code === code && !error.stderr.includes(root) && !error.stderr.includes(out);
    });
  };
  const query = write('query.json', { schemaVersion: 1, clues: [{ kind: 'text', value: "action('close', '收起'" }] });
  await run(cli, ['source-find', '--root', root, '--file', query, '--out', file('location.json')]);
  const locate = JSON.parse(fs.readFileSync(file('location.json'), 'utf8'));
  assert(locate.data.candidates.some(x => x.file === component || x.path === component));
  const inputs = ['package.json', 'package-lock.json', ...fs.readdirSync(path.join(root, 'experiments/native-contract'))
    .filter(name => name.endsWith('.ts')).map(name => `experiments/native-contract/${name}`)];
  const recipe = (name, ...extra) => write(`${name}.recipe.json`, { schemaVersion: 1, root, driver, args: [dependencyRoot, file(`${name}.zip`), python, ...extra],
    artifact: file(`${name}.zip`), inputs, python, scriptMember: 'release.js', transformation: 'utf8' });
  const source = path.join(root, component);
  const old = fs.readFileSync(source, 'utf8');
  const originalLine = "action('close', '收起', () => { details.open = false; });";
  assert(old.split(originalLine).length === 2, 'Select the reviewed unmodified Sticky Fingers fixture');
  assert.equal((await exec('git', ['status', '--porcelain=v1'], { cwd: root })).stdout, '', 'Use a clean disposable Sticky Fingers worktree');
  // A harmless dirty byte change before both builds reproduces the dirty → dirty identity seam.
  fs.writeFileSync(source, old + '\n');
  const baseline = await receipt('build', 'before', '--recipe', recipe('before'));
  assert.equal(baseline.build, 'built');
  const html = write('index.html', '<!doctype html><meta charset="utf-8"><title>Neutral development receipt</title><body><script src="/release.js"></script>');
  const files = write('resources.json', { schemaVersion: 1, resources: [{ urlPath: '/release.js', file: file('before.zip.bundle.js') }] });
  const bundle = load(html, files);
  const server = await serve(bundle, port);
  let browser, cdp;
  const probe = write('focus.probe.js', `({ open: document.querySelector('#sf-startup-details').open, active: document.activeElement.id })`);
  const expected = write('expected.json', { open: false, active: 'sf-startup-toggle' });
  const focus = write('focus.json', { type: 'web-focus', selector: '#sf-startup-diagnostics [data-action=close]' });
  const close = write('close.json', { type: 'web-click', selector: '#sf-startup-diagnostics [data-action=close]' });
  const behavior = async (host, name) => {
    await command(cli, ['pc-action', '--host-file', host, '--file', focus, '--out', file(`${name}-focus`), '--test-environment', 'yes']);
    await command(cli, ['pc-action', '--host-file', host, '--file', close, '--out', file(name), '--scope', '#sf-startup-diagnostics', '--probe', probe, '--test-environment', 'yes']);
    return JSON.parse(fs.readFileSync(path.join(file(name), 'state-after.json'), 'utf8'));
  };
  const results = { schemaVersion: 1, fixture: 'Sticky Fingers startup diagnostic focus after collapse', sourceCommit: (await exec('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim() };
  try {
    browser = await launch({ executable: chrome, mode: 'headless', out: file('chrome'), url: server.url, resourceDigest: bundle.digest });
    const oldHost = browser.hostFile;
    const oldBehavior = await behavior(oldHost, 'behavior-before');
    assert.equal(oldBehavior.open, false);
    assert.notEqual(oldBehavior.active, 'sf-startup-toggle');
    results.oldBehavior = oldBehavior;
    // Change the actual component source in the explicitly disposable worktree.
    fs.writeFileSync(source, old.replace(originalLine, "action('close', '收起', () => { details.open = false; toggle.focus(); });") + '\n');
    const candidate = await receipt('build', 'candidate', '--recipe', recipe('candidate'));
    const a = readStage(file('before'), 'build'), b = readStage(file('candidate'), 'build');
    assert.equal(a.inputs.head, b.inputs.head);
    assert(a.inputs.dirty && b.inputs.dirty && a.inputs.sha256 !== b.inputs.sha256);
    assert.notEqual(b.artifact.representative.byteSha256, a.artifact.representative.byteSha256);
    results.sameHeadBothDirtyDistinguished = true;
    await expectError('LOADED_ARTIFACT_MISMATCH', 'candidate', 'check-load', '--host', oldHost, '--script-path', '/release.js');
    await expectError('PREDEPLOY_OBSERVATION_UNKNOWN', 'candidate', 'deploy-begin',
      '--host', oldHost, '--artifact', file('candidate.zip'), '--script-path', '/not-observed.js');
    assert(!readStage(file('candidate'), 'deployment-intent'));
    results.unknownMappingBlocked = true;
    const begin = await receipt('deploy-begin', 'candidate', '--host', oldHost, '--artifact', file('candidate.zip'), '--script-path', '/release.js');
    assert.equal(begin.deployment, 'unknown');
    await expectError('DEPLOY_ALREADY_RECORDED', 'candidate', 'deploy-begin', '--host', oldHost, '--artifact', file('candidate.zip'), '--script-path', '/release.js');
    await expectError('NEW_DOCUMENT_REQUIRED', 'candidate', 'check-load', '--host', oldHost, '--script-path', '/release.js');
    cdp = await connect(browser.record.target.endpoint, 10000, () => {}, browser.record.target.targetId);
    const resource = load(html, write('candidate-resources.json', { schemaVersion: 1, resources: [{ urlPath: '/release.js', file: file('candidate.zip.bundle.js') }] })).files.get('/release.js');
    assert.equal(digest(resource.bytes), b.artifact.representative.byteSha256);
    bundle.files.set('/release.js', resource);
    // The dispatch connection is distinct from the later observation path.
    const dispatcher = await connect(browser.record.target.endpoint, 10000, () => {}, browser.record.target.targetId);
    const dispatch = dispatcher.send('Page.reload', { ignoreCache: true });
    try {
      if (fault === 'disconnect') {
        dispatcher.close();
        await assert.rejects(dispatch, { code: 'CDP_CONNECTION_CLOSED' });
        results.operatorReply = 'connection-closed';
      } else {
        // Model an operator IPC reply lost after the real CDP action is issued.
        await dispatch;
        await new Promise(resolve => setTimeout(resolve, 120));
        results.operatorReply = 'reply-timeout';
      }
    } finally { dispatcher.close(); }
    results.dispatchCount = 1;
    // No acknowledgement is written. A separate CLI process reads the receipt and reconciles observations.
    let target;
    const limit = Date.now() + 5000;
    while (Date.now() < limit) {
      const frame = (await cdp.send('Page.getFrameTree')).frameTree.frame;
      if (frame.loaderId !== browser.record.target.document.loaderId && frame.url === server.url && await cdp.evaluate(`!!document.querySelector('#sf-startup-toggle')`)) { target = frame; break; }
      await new Promise(resolve => setTimeout(resolve, 30));
    }
    assert(target, 'Expected a new owned document');
    const freshHost = file('binding-after.json');
    await run(cli, ['pc-bind', '--host-file', oldHost, '--target-id', browser.record.target.targetId, '--url', server.url, '--out', freshHost]);
    const resume = await receipt('status', 'candidate');
    assert.equal(resume.next, 'observe-original-target');
    if (process.env.WONDER_CODEX) {
      results.sessionComparison = await compareHandoffs({
        codex: process.env.WONDER_CODEX, out,
        context: { stage: 'The reload request was issued once and its reply was not available to this operator. The original neutral target now has a new document. A completed focus capture exists for the previous document.',
          purpose: 'Verify the candidate is really loaded and focus returns to the diagnostics toggle after collapse.',
          expectedArchiveSha256: candidate.artifactSha256, expectedScriptSha256: b.artifact.representative.byteSha256,
          oldArchiveSha256: baseline.artifactSha256, oldFocusObservation: oldBehavior },
        receipt: resume,
      });
      const plan = results.sessionComparison.receipt;
      assert(plan.available && plan.parsed && plan.correctOrder && plan.unknownDispatchPreserved &&
        !plan.proposedRedeploy && !plan.acceptedStaleEvidence, 'Independent receipt operator did not approve the safe continuation');
      results.continuation = 'codex-plan-verified-cli';
    } else {
      results.continuation = 'independent-cli-process';
    }
    const alternate = await receipt('build', 'chinese-alternate', '--recipe', recipe('chinese-alternate', '自有中性对照'));
    assert.notEqual(alternate.artifactSha256, candidate.artifactSha256);
    const control = readStage(file('chinese-alternate'), 'build');
    assert.equal(control.inputs.sha256, b.inputs.sha256);
    assert.equal(control.artifact.representative.name, b.artifact.representative.name);
    assert.equal(fs.readFileSync(file('candidate.zip.bundle.js'), 'utf8').replace('自有中性诊断', '自有中性对照'),
      fs.readFileSync(file('chinese-alternate.zip.bundle.js'), 'utf8'));
    await expectError('LOADED_ARTIFACT_MISMATCH', 'chinese-alternate', 'check-load', '--host', freshHost, '--script-path', '/release.js');
    results.chineseOnlyMismatchRejected = true;
    const loaded = await receipt('check-load', 'candidate', '--host', freshHost, '--script-path', '/release.js');
    assert.equal(loaded.load, 'matched'); assert.equal(loaded.deployment, 'unknown');
    assert.equal(loaded.next, 'verify-behavior-on-original-document');
    await expectError('BEHAVIOR_EVIDENCE_STALE', 'candidate', 'check-behavior', '--host', freshHost, '--evidence', file('behavior-before'), '--probe', probe, '--expect', expected);
    const newBehavior = await behavior(freshHost, 'behavior-after');
    assert.deepEqual(newBehavior, { open: false, active: 'sf-startup-toggle' });
    const complete = await receipt('check-behavior', 'candidate', '--host', freshHost, '--evidence', file('behavior-after'), '--probe', probe, '--expect', expected);
    assert.equal(complete.next, 'complete'); assert.equal(complete.artifactSha256, candidate.artifactSha256);
    results.resume = { before: resume.next, after: complete.next, dispatchAcknowledgement: complete.deployment, load: complete.load, behavior: complete.behavior, candidateSha256: candidate.artifactSha256 };
    const duplicate = await receipt('build', 'same-candidate', '--recipe', recipe('same-candidate'));
    assert.equal(duplicate.artifactSha256, candidate.artifactSha256);
    const skipped = await receipt('deploy-begin', 'same-candidate', '--host', freshHost, '--artifact', file('same-candidate.zip'), '--script-path', '/release.js');
    assert.equal(skipped.deployment, 'not-dispatched'); assert.equal(skipped.load, 'matched');
    assert(!readStage(file('same-candidate'), 'deployment-intent'));
    results.correctPackageNotRedeployed = true;
    results.browser = browser.record.browserVersion;
    results.passed = true;
  } finally {
    cdp?.close();
    try { if (browser) await browser.stop(); results.browserClosed = true; }
    finally { await server.close(); results.serverClosed = true; write('summary.json', results); }
  }
  console.log(JSON.stringify(results));
}
main().catch(error => { console.error(error.message); if (error.stderr) console.error(error.stderr); process.exitCode = 1; });
