'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { load, serve } = require('../../scripts/lib/pc-http.cjs');
const { launch } = require('../../scripts/lib/chrome-launch.cjs');
const { connect } = require('../../scripts/lib/cdp.cjs');
const { inspect, hostRecord } = require('./loaded-script.cjs');
const { liveHandoff } = require('./fixtures/codex-live.cjs');
const { compareHandoffs } = require('./fixtures/codex-handoff.cjs');
const { digest, readStage } = require('./receipt.cjs');
const exec = promisify(execFile);
const cli = path.resolve(__dirname, '../../scripts/dol-dev.cjs');
const driver = path.join(__dirname, 'fixtures/build-sticky.cjs');
const component = 'experiments/native-contract/startup-diagnostics.ts';
const [root, dependencyRoot, chrome, out, portText, python = 'python3'] = process.argv.slice(2);
const port = Number(portText);
const fault = process.env.WONDER_DISPATCH_FAULT ?? 'timeout';
const codex = process.env.WONDER_CODEX;
const liveMode = process.env.WONDER_LIVE_CODEX;
const twoRounds = process.env.WONDER_TWO_ROUNDS === '1';

async function main() {
  assert(['timeout', 'disconnect'].includes(fault));
  assert(!twoRounds || !liveMode && codex && path.isAbsolute(codex));
  assert(!liveMode || ['legacy', 'receipt'].includes(liveMode) && codex && path.isAbsolute(codex));
  assert([root, dependencyRoot, chrome, out].every(value => typeof value === 'string' && path.isAbsolute(value)));
  fs.mkdirSync(out, { mode: 0o700 });
  const file = name => path.join(out, name);
  const write = (name, value) => { fs.writeFileSync(file(name), typeof value === 'string' ? value : JSON.stringify(value), { flag: 'wx', mode: 0o600 }); return file(name); };
  const run = (entry, args) => exec(process.execPath, [entry, ...args], { timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true });
  const command = async (entry, args) => JSON.parse((await run(entry, args)).stdout);
  const receipt = (op, name, ...args) => command(cli, ['dev-receipt', op, '--receipt', file(name), ...args]);
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
      '--recipe', file('candidate.recipe.json'), '--host', oldHost, '--artifact', file('candidate.zip'), '--script-path', '/not-observed.js');
    assert(!readStage(file('candidate'), 'deployment-intent'));
    results.unknownMappingBlocked = true;
    const begin = await receipt('deploy-begin', 'candidate', '--recipe', file('candidate.recipe.json'), '--host', oldHost, '--artifact', file('candidate.zip'), '--script-path', '/release.js');
    assert.equal(begin.deployment, 'unknown');
    await expectError('DEPLOY_ALREADY_RECORDED', 'candidate', 'deploy-begin', '--recipe', file('candidate.recipe.json'), '--host', oldHost, '--artifact', file('candidate.zip'), '--script-path', '/release.js');
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
    if (liveMode) {
      const context = { operatorReply: results.operatorReply, expectedArchiveSha256: candidate.artifactSha256,
        expectedScriptSha256: b.artifact.representative.comparableTextSha256,
        oldEvidence: { archiveSha256: baseline.artifactSha256, observation: oldBehavior },
        task: 'Verify on the original target that the new script loaded and closing the panel returns focus to its title.' };
      let loaded = false;
      results.liveHandoff = await liveHandoff({ codex, dir: file('live-operator'), mode: liveMode,
        context: liveMode === 'receipt' ? { ...context, receipt: resume } : context,
        operations: {
          observe: async () => {
            const observed = await command(cli, ['pc-observe', '--host-file', freshHost, '--out', file('live-observe'),
              '--scope', '#sf-startup-diagnostics', '--probe', probe]);
            const manifest = JSON.parse(fs.readFileSync(path.join(file('live-observe'), 'manifest.json'), 'utf8'));
            assert.equal(manifest.status, 'observed');
            assert(observed && target.loaderId !== browser.record.target.document.loaderId);
            return { originalTarget: true, newDocument: true, oldEvidenceApplies: false };
          },
          'check-load': async () => {
            const result = liveMode === 'receipt' ? await receipt('check-load', 'candidate', '--host', freshHost, '--script-path', '/release.js')
              : await inspect(hostRecord(freshHost), '/release.js', context.expectedScriptSha256);
            assert.equal(result.load ?? result.status, 'matched');
            loaded = true;
            return { load: 'matched', deployment: 'unknown' };
          },
          'check-behavior': async () => {
            assert(loaded);
            const state = await behavior(freshHost, 'live-behavior');
            assert.deepEqual(state, { open: false, active: 'sf-startup-toggle' });
            if (liveMode === 'receipt') {
              const completed = await receipt('check-behavior', 'candidate', '--host', freshHost, '--evidence', file('live-behavior'),
                '--probe', probe, '--expect', expected);
              assert.equal(completed.next, 'complete');
            } else assert.equal((await inspect(hostRecord(freshHost), '/release.js', context.expectedScriptSha256)).status, 'matched');
            return { behavior: 'passed', deployment: 'unknown', observation: state };
          },
        },
      });
      assert(results.liveHandoff.complete, 'The fresh Codex session did not complete all live verification steps');
      results.browser = browser.record.browserVersion;
      results.passed = true;
      return;
    }
    if (codex && !twoRounds) {
      results.sessionComparison = await compareHandoffs({
        codex, out,
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
    const skipped = await receipt('deploy-begin', 'same-candidate', '--recipe', file('same-candidate.recipe.json'), '--host', freshHost, '--artifact', file('same-candidate.zip'), '--script-path', '/release.js');
    assert.equal(skipped.deployment, 'not-dispatched'); assert.equal(skipped.load, 'matched');
    assert(!readStage(file('same-candidate'), 'deployment-intent'));
    results.correctPackageNotRedeployed = true;
    if (twoRounds) {
      const firstRecipe = file('candidate.recipe.json');
      const blockedRecipe = recipe('stale-no-intent');
      await receipt('build', 'stale-no-intent', '--recipe', blockedRecipe);
      const currentArgs = ['--recipe', firstRecipe, '--host', freshHost, '--script-path', '/release.js'];
      const initiallyCurrent = await receipt('verify-current', 'candidate', ...currentArgs);
      assert.equal(initiallyCurrent.source, 'matched');
      assert.equal(initiallyCurrent.currentLoad, 'matched');
      const historical = ['build', 'load', 'behavior'].map(stage => fs.readFileSync(path.join(file('candidate'), stage + '.json')));
      const readme = path.join(root, 'README.md');
      const readmeBefore = fs.readFileSync(readme);
      try {
        fs.appendFileSync(readme, '\nNeutral README comparison.\n');
        assert.equal((await receipt('verify-current', 'candidate', ...currentArgs)).source, 'matched');
      } finally { fs.writeFileSync(readme, readmeBefore); }
      const refreshLine = "action('refresh', '刷新诊断', refresh);";
      const firstSource = fs.readFileSync(source, 'utf8');
      assert.equal(firstSource.split(refreshLine).length, 2);
      fs.writeFileSync(source, firstSource.replace(refreshLine, "action('refresh', '刷新诊断', () => { refresh(); if (alive && reportRegion.dataset.stale === 'false') status.textContent += ' 已刷新。'; });"));
      const partial = async (...args) => {
        try { await receipt('verify-current', 'candidate', ...args); }
        catch (error) { assert.equal(error.code, 2); return JSON.parse(error.stdout); }
        assert.fail('Expected exit 2 from explicit verification');
      };
      const drift = await partial(...currentArgs);
      assert.deepEqual([drift.source, drift.currentLoad, drift.behavior, drift.next],
        ['needs-rebuild', 'matched', 'passed', 'build-current-source-in-new-receipt']);
      const uncertain = source + '.comparison-hold';
      assert(!fs.existsSync(uncertain));
      fs.renameSync(source, uncertain);
      try { assert.equal((await partial(...currentArgs)).source, 'unknown'); }
      finally { fs.renameSync(uncertain, source); }
      assert.equal((await cdp.send('Page.getFrameTree')).frameTree.frame.loaderId, target.loaderId);
      assert.deepEqual(['build', 'load', 'behavior'].map(stage => fs.readFileSync(path.join(file('candidate'), stage + '.json'))), historical);

      const secondRecipe = recipe('second');
      const refresh = write('refresh-action.json', { type: 'web-click', selector: '#sf-startup-diagnostics [data-action=refresh]' });
      const refreshProbe = write('refresh.probe.js', `({ announced: document.querySelector('#sf-startup-status').textContent.endsWith(' 已刷新。') })`);
      const refreshExpected = write('refresh.expected.json', { announced: true });
      const invocation = (operation, dir, ...args) => ['node', cli, 'dev-receipt', operation, '--receipt', dir, ...args].map(v => JSON.stringify(v)).join(' ');
      const secondHost = file('binding-second.json');
      const handoff = await liveHandoff({
        codex, dir: file('round-two-operator'), mode: 'two-rounds', writableOut: out,
        context: { historicalBehavior: 'passed', reasonForHandoff: 'The second reviewed source edit is present. The first document is still running.' },
        instructions: [
          'Own the continuation on this neutral fixture. Read the first receipt, confirm source drift and build the second candidate with the built Paisley Park CLI.',
          invocation('status', file('candidate')),
          invocation('verify-source', file('candidate'), '--recipe', firstRecipe) + ' (exit 2 means rebuild with the new recipe)',
          invocation('build', file('second'), '--recipe', secondRecipe),
          'Then run these owned browser operations in order. Each writes independent evidence through the same built CLI.',
          'node handoff-probe.cjs observe',
          'node handoff-probe.cjs check-load',
          'node handoff-probe.cjs check-behavior',
          'Check each result and stop if it fails. Never retry a deployment. Report whether the new refresh actually announced success.',
        ],
        operations: {
          observe: async () => {
            const second = readStage(file('second'), 'build');
            assert.equal(second.inputs.head, b.inputs.head);
            assert(second.inputs.dirty && second.inputs.sha256 !== b.inputs.sha256);
            await expectError('BUILD_SOURCE_DRIFT', 'stale-no-intent', 'deploy-begin',
              '--recipe', blockedRecipe, '--host', freshHost, '--script-path', '/release.js');
            assert(!readStage(file('stale-no-intent'), 'deployment-intent'));
            assert.equal(await cdp.evaluate(`document.querySelector('#sf-startup-status').textContent.endsWith(' 已刷新。')`), false);
            const prep = await receipt('deploy-begin', 'second', '--recipe', secondRecipe, '--host', freshHost, '--script-path', '/release.js');
            assert.equal(prep.deployment, 'unknown');
            const resources = write('second-resources.json', { schemaVersion: 1, resources: [{ urlPath: '/release.js', file: file('second.zip.bundle.js') }] });
            const next = load(html, resources).files.get('/release.js');
            assert.equal(digest(next.bytes), second.artifact.representative.byteSha256);
            bundle.files.set('/release.js', next);
            await cdp.send('Page.reload', { ignoreCache: true });
            const limit = Date.now() + 5000;
            let ready = false;
            while (Date.now() < limit) {
              const frame = (await cdp.send('Page.getFrameTree')).frameTree.frame;
              ready = frame.loaderId !== target.loaderId && frame.url === server.url &&
                await cdp.evaluate(`!!document.querySelector('#sf-startup-toggle')`);
              if (ready) break;
              await new Promise(resolve => setTimeout(resolve, 30));
            }
            assert(ready);
            await run(cli, ['pc-bind', '--host-file', freshHost, '--target-id', browser.record.target.targetId, '--url', server.url, '--out', secondHost]);
            await receipt('deploy-ack', 'second', '--host', secondHost);
            return { boundNewDocument: true, dispatchCount: 1 };
          },
          'check-load': async () => {
            const verified = await receipt('check-load', 'second', '--host', secondHost);
            assert.equal(verified.load, 'matched');
            return { load: verified.load };
          },
          'check-behavior': async () => {
            await command(cli, ['pc-action', '--host-file', secondHost, '--file', refresh, '--out', file('refresh-action-sample'),
              '--scope', '#sf-startup-diagnostics', '--probe', refreshProbe, '--test-environment', 'yes']);
            const final = await receipt('check-behavior', 'second', '--host', secondHost, '--evidence', file('refresh-action-sample'),
              '--probe', refreshProbe, '--expect', refreshExpected);
            assert.equal(final.next, 'complete');
            return { announced: true, next: final.next };
          },
        },
      });
      assert(handoff.complete, 'Second-round Codex handoff did not finish');
      const secondCurrent = await receipt('verify-current', 'second', '--recipe', secondRecipe, '--host', secondHost);
      assert.deepEqual([secondCurrent.source, secondCurrent.currentLoad, secondCurrent.behavior], ['matched', 'matched', 'passed']);
      results.secondRound = {
        handoff, firstReceiptUnchanged: true, sameDocumentDuringDrift: true, unrelatedReadmeIgnored: true,
        drift: { source: drift.source, currentLoad: drift.currentLoad, previousBehavior: drift.behavior },
        unavailableInputWasUnknown: true, newBehavior: secondCurrent.behavior, candidateSha256: secondCurrent.artifactSha256,
      };
    }

    results.browser = browser.record.browserVersion;
    results.passed = true;
  } finally {
    cdp?.close();
    try { if (browser) await browser.stop(); results.browserClosed = true; }
    finally { await server.close(); results.serverClosed = true; write('summary.json', results); console.log(JSON.stringify(results)); }
  }
}
main().catch(error => { console.error(error.message); if (error.stderr) console.error(error.stderr); process.exitCode = 1; });
