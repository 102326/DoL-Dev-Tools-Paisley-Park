'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { load, serve } = require('../../scripts/lib/pc-http.cjs');
const { launch } = require('../../scripts/lib/chrome-launch.cjs');
const { connect } = require('../../scripts/lib/cdp.cjs');
const { digest, readStage } = require('./receipt.cjs');
const { inputs, names } = require('./fixtures/build-ui50.cjs');
const exec = promisify(execFile);
const cli = path.resolve(__dirname, '../../scripts/dol-dev.cjs');
const driver = path.join(__dirname, 'fixtures/build-ui50.cjs');
const [root, chrome, out, port, python = 'python3'] = process.argv.slice(2);
const head = 'f24a0dfb0d03f015993899c2eb9bf09d924e62ae';

async function main() {
  assert([root, chrome, out].every(name => typeof name === 'string' && path.isAbsolute(name)));
  assert.equal((await exec('git', ['rev-parse', 'HEAD'], { cwd: root })).stdout.trim(), head);
  fs.mkdirSync(out, { mode: 0o700 });
  const file = name => path.join(out, name);
  const write = (name, value) => {
    fs.writeFileSync(file(name), typeof value === 'string' ? value : JSON.stringify(value), { flag: 'wx', mode: 0o600 });
    return file(name);
  };
  const run = args => exec(process.execPath, [cli, ...args], { timeout: 120000, maxBuffer: 1024 * 1024, windowsHide: true });
  const cmd = async args => JSON.parse((await run(args)).stdout);
  const receipt = (operation, ...args) => cmd(['dev-receipt', operation, '--receipt', file('pair'), ...args]);
  const zip = names.map(file);
  const roles = ['host', 'ui'];
  const recipe = write('ui50.recipe.json', { schemaVersion: 2, root, driver, python,
    args: [...zip, python], inputs: inputs(root), artifacts: roles.map((role, i) => ({
      role, artifact: zip[i], scriptMember: 'index.js', scriptPath: `/${role}.js`, transformation: 'utf8-strip-bom',
    })) });
  const result = await receipt('build', '--recipe', recipe);
  assert.deepEqual(result.artifacts.map(x => x.role), roles);
  const loadHelper = async module => import(pathToFileURL(path.join(root, 'prototypes/host5/panel-budget', module)).href);
  const { readPackage } = await loadHelper('package-input.mts');
  const { createLabServer } = await loadHelper('server.mts');
  const packages = [readPackage(zip[0], 'StoneFreeHost'), readPackage(zip[1], 'DoLGameUI')];
  const sealed = readStage(file('pair'), 'build').artifact.artifacts;
  for (const [i, pkg] of packages.entries()) {
    assert.equal(pkg.sha, sealed[i].sha256);
    assert.equal(pkg.scripts.length, 1);
    assert.equal(digest(pkg.scripts[0]), sealed[i].representative.comparableTextSha256);
  }
  const neutral = await createLabServer();
  let scaffold;
  try {
    await neutral.listen();
    const address = neutral.httpServer.address();
    const original = await fetch(`http://127.0.0.1:${address.port}/panel-test`);
    assert(original.ok);
    scaffold = await original.text();
    assert(scaffold.includes('id="inspector"'));
  } finally { await neutral.close(); }
  const extra = '<aside id="ui-bar"></aside><script src="/host.js"></script><script src="/scene.js"></script><script src="/ui.js"></script>';
  const html = write('index.html', scaffold + extra);
  const actualUi = write('ui.js', packages[1].scripts[0]);
  const resourceFiles = {
    '/host.js': write('host.js', packages[0].scripts[0]),
    '/scene.js': write('scene.js', 'window.DoLUiHost.sceneReady();'),
    '/ui.js': write('wrong-ui.js', packages[1].scripts[0] + '\n/* wrong UI control */'),
    '/ui.css': write('ui.css', packages[1].styles.join('\n')),
  };
  fs.appendFileSync(html, '<link rel="stylesheet" href="/ui.css">');
  const resources = Object.entries(resourceFiles).map(([urlPath, resource]) => ({ urlPath, file: resource }));
  const bundle = load(html, write('resources-wrong.json', { schemaVersion: 1, resources }));
  const exactBundle = load(html, write('resources-exact.json', { schemaVersion: 1,
    resources: resources.map(item => item.urlPath === '/ui.js' ? { ...item, file: actualUi } : item) }));
  const server = await serve(bundle, Number(port));
  let browser, driverCdp;
  const summary = { head, versions: packages.map(({ name, version }) => ({ name, version })), archives: result.artifacts, passed: false };
  try {
    browser = await launch({ executable: chrome, out: file('chrome'), mode: 'headless', url: server.url, resourceDigest: bundle.digest });
    const original = browser.record.target;
    driverCdp = await connect(original.endpoint, 10000, () => {}, original.targetId);
    async function ready(previousLoader) {
      const limit = Date.now() + 5000;
      do {
        const frame = (await driverCdp.send('Page.getFrameTree')).frameTree.frame;
        if (frame.loaderId !== previousLoader && frame.url === server.url &&
            await driverCdp.evaluate("!!document.querySelector('#dol-midnight-sidebar-button')")) return;
        await new Promise(resolve => setTimeout(resolve, 30));
      } while (Date.now() < limit);
      assert.fail('The real UI settings entry did not initialize on the neutral document');
    }
    async function verifyCurrent(host, expectedCode = 0) {
      try { return await receipt('verify-current', '--recipe', recipe, '--host', host); }
      catch (error) { assert.equal(error.code, expectedCode); return JSON.parse(error.stdout); }
    }
    await ready();
    const mismatch = await verifyCurrent(browser.hostFile, 2);
    assert.deepEqual(mismatch.currentArtifacts, [{ role: 'host', status: 'matched' }, { role: 'ui', status: 'mismatch' }]);
    assert.equal(mismatch.currentLoad, 'mismatch');
    const intent = await receipt('deploy-begin', '--recipe', recipe, '--host', browser.hostFile);
    assert.equal(intent.deployment, 'unknown');
    assert.equal((await verifyCurrent(browser.hostFile, 2)).loadReason, 'new-document-required');
    bundle.files.set('/ui.js', exactBundle.files.get('/ui.js'));
    await driverCdp.send('Page.reload', { ignoreCache: true });
    await ready(original.document.loaderId);
    const rebind = file('binding-after.json');
    await run(['pc-bind', '--host-file', browser.hostFile, '--target-id', original.targetId, '--url', server.url, '--out', rebind]);
    await receipt('deploy-ack', '--host', rebind);
    await receipt('check-load', '--host', rebind);
    const click = (name, selector, probe) => {
      const action = write(name + '.action.json', { type: 'web-click', selector });
      return cmd(['pc-action', '--host-file', rebind, '--out', file(name + '-evidence'), '--file', action,
        '--scope', 'body', ...(probe ? ['--probe', probe] : []), '--test-environment', 'yes']);
    };
    await click('open', '#dol-midnight-sidebar-button');
    const categoryChild = await driverCdp.evaluate(`(() => {
      const button = [...document.querySelectorAll('.dmt-workspace-nav [data-kw-nav-control="category"]')]
        .find(element => element.textContent.trim() === '材质');
      return button ? Array.prototype.indexOf.call(button.parentElement.children, button) + 1 : null;
    })()`);
    assert(Number.isSafeInteger(categoryChild) && categoryChild > 0);
    await click('material', `.dmt-workspace-nav button:nth-child(${categoryChild})`);
    const glass = '#dol-midnight-controls .dmt-workspace-material input[aria-label="玻璃模糊"]';
    const cssBefore = await driverCdp.evaluate(`getComputedStyle(document.querySelector('#dol-midnight-controls .dmt-settings-shell')).backdropFilter`);
    assert.match(cssBefore, /^blur\(/);
    const probe = write('behavior.probe.js', `({ enabled: document.querySelector(${JSON.stringify(glass)}).checked,
      filter: getComputedStyle(document.querySelector('#dol-midnight-controls .dmt-settings-shell')).backdropFilter,
      hostSurface: !!window.DoLUiHost?.layerPresets?.surface })`);
    const expectation = write('behavior.expected.json', { enabled: false, filter: 'none', hostSurface: true });
    await click('glass', glass, probe);
    const complete = await receipt('check-behavior', '--host', rebind, '--evidence', file('glass-evidence'), '--probe', probe, '--expect', expectation);
    summary.glass = { before: cssBefore, after: 'none' };
    assert.equal(complete.next, 'complete');
    const current = await verifyCurrent(rebind);
    assert.equal(current.source, 'matched');
    assert.deepEqual(current.currentArtifacts, [{ role: 'host', status: 'matched' }, { role: 'ui', status: 'matched' }]);
    summary.wrongUi = mismatch.currentArtifacts;
    summary.final = { ...current, behavior: complete.behavior };
    summary.browser = browser.record.browserVersion;
    summary.passed = true;
  } finally {
    driverCdp?.close();
    try { if (browser) await browser.stop(); summary.browserClosed = true; }
    finally { await server.close(); summary.serverClosed = true; write('summary.json', summary); console.log(JSON.stringify(summary)); }
  }
}
main().catch(error => { console.error(error.message); if (error.stderr) console.error(error.stderr); process.exitCode = 1; });
