'use strict';
// Reuse the neutral HTML/resource lists from CLI_CONTINUATION. Build fresh sealed receipts.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { launch } = require('../../scripts/lib/chrome-launch.cjs');
const { load, serve } = require('../../scripts/lib/pc-http.cjs');
const { connect } = require('../../scripts/lib/cdp.cjs');
const [kind, previous, out, chrome, uiRoot] = process.argv.slice(2);
const cli = path.resolve(__dirname, '../../scripts/dol-dev.cjs');
const pair = kind === 'ui';
assert(pair || kind === 'sticky');
const file = name => path.join(out, name);
const receipt = file('receipt');
const write = (name, value) => {
  const slot = file(name);
  fs.writeFileSync(slot, typeof value === 'string' ? value : JSON.stringify(value), { flag: 'wx', mode: 0o600 });
  return slot;
};
const run = (...args) => JSON.parse(execFileSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 125000 }));
const operation = (op, ...args) => run('dev-receipt', op, '--receipt', receipt, ...args);
async function main() {
  fs.mkdirSync(out, { mode: 0o700 });
  const template = require(path.join(previous, pair ? 'ui50.recipe.json' : 'second.recipe.json'));
  if (pair) {
    template.root = uiRoot;
    assert.equal(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: uiRoot, encoding: 'utf8' }).trim(), 'f24a0dfb0d03f015993899c2eb9bf09d924e62ae');
    for (const [i, item] of template.artifacts.entries()) template.args[i] = item.artifact = file(path.basename(item.artifact));
  } else {
    template.args[1] = template.artifact = file('sticky.zip');
    template.scriptPath = '/release.js';
  }
  const recipe = write('recipe.json', template);
  operation('build', '--recipe', recipe);
  const res = require(path.join(previous, pair ? 'resources-exact.json' : 'second-resources.json'));
  // The archived neutral host may still be serving the previous build. CDP must compare it independently.
  const bundle = load(path.join(previous, 'index.html'), write('resources.json', res));
  const pending = !pair && process.env.WONDER_PENDING === 'yes';
  const exact = bundle.files.get('/release.js');
  if (pending) {
    const previousBundle = load(path.join(previous, 'index.html'), path.join(previous, 'resources.json'));
    bundle.files.set('/release.js', previousBundle.files.get('/release.js'));
  }
  const server = await serve(bundle, pair ? 19185 : 19186);
  let browser, client;
  try {
    browser = await launch({ executable: chrome, out: file('chrome'), mode: 'headless', url: server.url, resourceDigest: bundle.digest });
    const target = browser.record.target;
    client = await connect(target.endpoint, 10000, () => {}, target.targetId);
    const probe = write('probe.js', pair ? "({ settingsEntry: !!document.querySelector('#dol-midnight-sidebar-button'), hostSurface: !!window.DoLUiHost?.layerPresets?.surface })"
      : "({ diagnostics: !!document.querySelector('#sf-startup-toggle'), marker: window.fixtureLabel })");
    const expected = write('expect.json', pair ? { settingsEntry: true, hostSurface: true } : { diagnostics: true, marker: '自有中性诊断' });
    operation('prepare-handoff', '--recipe', recipe, '--host', browser.hostFile, '--probe', probe, '--expect', expected);
    if (pending) {
      assert.equal(operation('resume').next, 'inspect-loaded-artifact');
      operation('deploy-begin', '--recipe', recipe, '--host', browser.hostFile);
      assert.equal(operation('resume').next, 'inspect-pending-deployment');
      bundle.files.set('/release.js', exact);
    } else assert.equal(operation('resume').next, 'record-loaded-artifact');
    for (const input of [recipe, probe, expected]) fs.renameSync(input, input + '.retired');
    await client.send('Page.reload', { ignoreCache: true });
    for (let i = 0; i < 100; i++) {
      if ((await client.send('Page.getFrameTree')).frameTree.frame.loaderId !== target.document.loaderId) break;
      await delay(50);
    }
    assert.equal(operation('resume').next, 'rebind-original-target');
    console.log('READY ' + receipt);
    if (pair || process.env.WONDER_INDEPENDENT === 'yes') {
      // An independent operator receives only this directory and the normal tool discovery entry.
      for (let i = 0; i < 900 && !fs.existsSync(path.join(receipt, 'behavior.json')); i++) await delay(1000);
    } else {
      for (const step of ['rebind', 'check-load', 'check-behavior']) operation('continue', '--step', step);
    }
    const result = operation('resume');
    assert.equal(result.next, 'complete');
    assert.equal(result.history.deployment, pending ? 'unknown' : 'not-dispatched');
    assert.equal(fs.existsSync(path.join(receipt, 'deployment-intent.json')), pending);
    assert(!fs.existsSync(path.join(receipt, 'deployment-ack.json')));
    write('result.json', result);
    // A subsequent document must never inherit the completed behavior proof.
    await client.send('Page.reload', { ignoreCache: true });
    let next;
    for (let i = 0; i < 20; i++) {
      next = operation('resume');
      if (next.next === 'inspect-replacement-document') break;
      await delay(100);
    }
    assert.equal(next.next, 'inspect-replacement-document');
    assert.equal(next.history.behavior, 'passed');
    console.log('PASS ' + kind);
  } finally {
    client?.close();
    try { if (browser) await browser.stop(); } finally { await server.close(); }
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
