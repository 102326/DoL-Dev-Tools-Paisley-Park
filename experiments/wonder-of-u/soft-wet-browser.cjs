'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { load, serve } = require('../../scripts/lib/pc-http.cjs');
const { launch } = require('../../scripts/lib/chrome-launch.cjs');
const { connect } = require('../../scripts/lib/cdp.cjs');
const { digest, readStage } = require('./receipt.cjs');
const exec = promisify(execFile);
const cli = path.resolve(__dirname, '../../scripts/dol-dev.cjs');
const driver = path.join(__dirname, 'fixtures/build-soft-wet.cjs');
const [root, chrome, out, port, python = 'python3'] = process.argv.slice(2);
const source = 'src/theme/acrylic.ts';

async function main() {
  assert([root, chrome, out].every(v => typeof v === 'string' && path.isAbsolute(v)));
  fs.mkdirSync(out, { mode: 0o700 });
  const file = name => path.join(out, name);
  const write = (name, value) => {
    fs.writeFileSync(file(name), typeof value === 'string' ? value : JSON.stringify(value), { flag: 'wx', mode: 0o600 });
    return file(name);
  };
  const run = (entry, args) => exec(process.execPath, [entry, ...args], { timeout: 30000, maxBuffer: 1024 * 1024, windowsHide: true });
  const receipt = async (op, name, ...args) => JSON.parse((await run(cli, ['dev-receipt', op, '--receipt', file(name), ...args])).stdout);
  const query = write('query.json', { schemaVersion: 1, clues: [{ kind: 'text', value: 'function acrylicParameters' }] });
  await run(cli, ['source-find', '--root', root, '--file', query, '--out', file('location.json')]);
  const location = JSON.parse(fs.readFileSync(file('location.json'), 'utf8'));
  assert(location.data.candidates.some(x => x.file === source || x.path === source));
  const build = mode => receipt('build', mode, '--recipe', write(mode + '.recipe.json', {
    schemaVersion: 1, root, driver, args: [mode, file(mode + '.zip'), python], artifact: file(mode + '.zip'), inputs: [source],
    python, scriptMember: 'release.js', transformation: 'utf8',
  }));
  const buildLive = await build('live');
  const buildStatic = await build('static');
  assert.notEqual(buildLive.artifactSha256, buildStatic.artifactSha256);
  const bundleFor = mode => load(file(mode + '.zip.members/index.html'), write(mode + '.resources.json', { schemaVersion: 1,
    resources: ['release.js', 'styles.css'].map(name => ({ urlPath: '/' + name, file: file(mode + '.zip.members/' + name) })) }));
  const bundle = bundleFor('live');
  const server = await serve(bundle, Number(port));
  const result = { fixture: 'Soft & Wet Acrylic with a neutral shared action', passed: false,
    sourceCommit: readStage(file('live'), 'build').inputs.head, variants: {} };
  const probe = write('probe.js', `({ count: Number(document.querySelector('#count').dataset.count), filter: getComputedStyle(document.querySelector('#panel')).backdropFilter })`);
  const click = write('click.json', { type: 'web-click', selector: '#exercise' });
  let browser, transport;
  async function waitFixture(previous) {
    const limit = Date.now() + 5000;
    do {
      const frame = (await transport.send('Page.getFrameTree')).frameTree.frame;
      if (frame.loaderId !== previous && frame.url === server.url &&
        await transport.evaluate("document.documentElement.dataset.fixture === 'ready'")) return;
      await new Promise(resolve => setTimeout(resolve, 30));
    } while (Date.now() < limit);
    assert.fail('Expected the neutral Acrylic document to initialize');
  }
  async function checkBehavior(host, mode, filter) {
    const evidence = file(mode + '-action');
    const expectation = write(mode + '-expected.json', { count: 1, filter });
    await run(cli, ['pc-action', '--host-file', host, '--file', click, '--out', evidence, '--scope', 'main', '--probe', probe, '--test-environment', 'yes']);
    const status = await receipt('check-behavior', mode, '--host', host, '--evidence', evidence, '--probe', probe, '--expect', expectation);
    assert.equal(status.behavior, 'passed');
    result.variants[mode] = { filter, deployment: status.deployment, loadedScript: status.load, behavior: status.behavior, archiveSha256: status.artifactSha256 };
  }
  try {
    browser = await launch({ executable: chrome, mode: 'headless', out: file('chrome'), url: server.url, resourceDigest: bundle.digest });
    const initial = browser.hostFile;
    const previous = browser.record.target;
    transport = await connect(previous.endpoint, 10000, () => {}, previous.targetId);
    await waitFixture();
    await receipt('check-load', 'live', '--host', initial, '--script-path', '/release.js');
    await checkBehavior(initial, 'live', 'blur(22px)');
    await receipt('deploy-begin', 'static', '--recipe', file('static.recipe.json'), '--host', initial, '--artifact', file('static.zip'), '--script-path', '/release.js');
    const staticBundle = bundleFor('static');
    const replacement = staticBundle.files.get('/release.js');
    assert.equal(digest(replacement.bytes), readStage(file('static'), 'build').artifact.representative.byteSha256);
    // The two neutral artifacts share identical HTML/CSS; only the Acrylic filter binding differs.
    for (const name of ['/index.html', '/styles.css']) {
      assert.deepEqual(bundle.files.get(name)?.bytes, staticBundle.files.get(name)?.bytes);
    }
    bundle.files.set('/release.js', replacement);
    await transport.send('Page.reload', { ignoreCache: true });
    await waitFixture(previous.document.loaderId);
    const fresh = file('binding-static.json');
    await run(cli, ['pc-bind', '--host-file', initial, '--target-id', previous.targetId, '--url', server.url, '--out', fresh]);
    await receipt('deploy-ack', 'static', '--host', fresh);
    await receipt('check-load', 'static', '--host', fresh, '--script-path', '/release.js');
    await checkBehavior(fresh, 'static', 'none');
    result.browser = browser.record.browserVersion;
    result.passed = true;
  } finally {
    transport?.close();
    try { if (browser) await browser.stop(); result.browserClosed = true; }
    finally { await server.close(); result.serverClosed = true; write('summary.json', result); }
  }
  console.log(JSON.stringify(result));
}
main().catch(error => { console.error(error.message); if (error.stderr) console.error(error.stderr); process.exitCode = 1; });
