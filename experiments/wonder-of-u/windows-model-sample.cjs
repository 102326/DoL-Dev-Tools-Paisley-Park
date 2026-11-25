'use strict';
// Keep both targets alive while independent operators verify the same candidate.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { setTimeout: delay } = require('node:timers/promises');
const { load, serve } = require('../../scripts/lib/pc-http.cjs');
const { launch } = require('../../scripts/lib/chrome-launch.cjs');
const { connect } = require('../../scripts/lib/cdp.cjs');
const { digest } = require('./receipt.cjs');

const cli = path.resolve(__dirname, '../../scripts/dol-dev.cjs');
const [out, chrome, python, portA, portB] = process.argv.slice(2);
const write = (file, data) => fs.writeFileSync(file, typeof data === 'string' ? data : JSON.stringify(data, null, 2), { flag: 'wx' });
const run = (exe, args, cwd) => execFileSync(exe, args, { cwd, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
const source = value => `document.querySelector('output').textContent = '${value}';\n`;

async function setupArm(dir, root, driver, port) {
  fs.mkdirSync(dir);
  const f = name => path.join(dir, name);
  const receipt = f('receipt'), zip = f('candidate.zip');
  const op = (verb, ...rest) => JSON.parse(run(process.execPath, [cli, 'dev-receipt', verb, '--receipt', receipt, ...rest], dir));
  write(f('recipe.json'), { schemaVersion: 1, root, driver, inputs: ['entry.js'], args: [python, zip], python,
    artifact: zip, scriptMember: 'release.js', scriptPath: '/release.js', transformation: 'utf8' });
  const build = op('build', '--recipe', f('recipe.json'));
  assert.equal(build.build, 'built');
  const candidate = run(python, ['-c', "import sys,zipfile;sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read('release.js'))", zip], dir);
  assert.equal(digest(candidate), digest(fs.readFileSync(path.join(root, 'entry.js'))));
  write(f('index.html'), '<!doctype html><meta charset="utf-8"><main><output></output></main><script src="/release.js"></script>');
  write(f('old.js'), source('draft'));
  write(f('resources.json'), { schemaVersion: 1, resources: [{ urlPath: '/release.js', file: f('old.js') }] });
  write(f('probe.js'), "({ label: document.querySelector('main output').textContent })");
  write(f('expected.json'), { label: 'reviewed' });
  const bundle = load(f('index.html'), f('resources.json')), server = await serve(bundle, port);
  let browser, client;
  const close = async () => { try { client?.close(); if (browser) await browser.stop(); } finally { await server.close(); } };
  try {
    browser = await launch({ executable: chrome, mode: 'headless', out: f('chrome'), url: server.url, resourceDigest: bundle.digest });
    const target = browser.record.target;
    op('prepare-handoff', '--recipe', f('recipe.json'), '--host', browser.hostFile, '--probe', f('probe.js'), '--expect', f('expected.json'));
    assert.equal(op('deploy-begin', '--host', browser.hostFile, '--recipe', f('recipe.json')).deployment, 'unknown');
    bundle.files.set('/release.js', { ...bundle.files.get('/release.js'), bytes: candidate, sha256: digest(candidate) });
    client = await connect(target.endpoint, 10000, () => {}, target.targetId);
    await client.send('Page.reload', { ignoreCache: true });
    const deadline = Date.now() + 10000;
    let ready = false;
    while (!ready && Date.now() < deadline) {
      const frame = (await client.send('Page.getFrameTree')).frameTree.frame;
      ready = frame.url === server.url && frame.loaderId !== target.document.loaderId &&
        await client.evaluate("document.readyState === 'complete' && document.querySelector('output')?.textContent === 'reviewed'");
      if (!ready) await delay(50);
    }
    assert(ready, 'The new document must finish loading before an operator is admitted');
    assert.equal(op('resume').reason, 'document-changed');
    write(f('dispatch.json'), { requests: 1, acknowledgement: 'unavailable' });
    write(f('manual.json'), { cli, originalHost: browser.hostFile, source: path.join(root, 'entry.js'), sourceHead: run('git', ['rev-parse','HEAD'], root).toString().trim(),
      artifact: zip, zipSha256: build.artifactSha256, member: 'release.js', scriptPath: '/release.js', inputAndMemberSha256: digest(candidate),
      probe: f('probe.js'), expect: f('expected.json'), receipt, deployment: 'one attempt; acknowledgement unavailable' });
    // Instrument the operator's Node commands, including failures. No prompt or tool answers go into the research repository.
    write(f('meter.cjs'), "const fs=require('node:fs'),p=require('node:path'),start=Date.now(); process.on('exit',code=>fs.appendFileSync(p.join(__dirname,'node-ops.jsonl'),JSON.stringify({start,end:Date.now(),code,argv:process.argv.slice(1)})+'\\n'));");
    return close;
  } catch (e) { await close(); throw e; }
}

async function main() {
  assert([out, chrome, python].every(v => typeof v === 'string' && path.isAbsolute(v)));
  assert(portA !== portB);
  fs.mkdirSync(out);
  const root = path.join(out,'source'), driver = path.join(out,'build.cjs');
  fs.mkdirSync(root);
  const entry = path.join(root,'entry.js');
  write(entry, source('draft'));
  run('git', ['init','-q'], root);
  run('git', ['-c','core.autocrlf=false','add','entry.js'], root);
  run('git', ['-c','user.name=Fixture','-c','user.email=fixture@example.invalid','-c','commit.gpgsign=false','commit','-qm','baseline'], root);
  fs.writeFileSync(entry, source('reviewed'));
  write(driver, `const {execFileSync}=require('node:child_process');
execFileSync(process.argv[2],['-c',"import sys,zipfile; z=zipfile.ZipFile(sys.argv[1],'x'); z.writestr(zipfile.ZipInfo('release.js'),open('entry.js','rb').read()); z.close()",process.argv[3]]);
console.log(JSON.stringify({inputs:['entry.js']}));`);
  const closers = [];
  try {
    for (const [name, port] of [['manual',portA],['receipt',portB]]) closers.push(await setupArm(path.join(out,name),root,driver,Number(port)));
    write(path.join(out,'ready.json'), { ready: true });
    let drift = false;
    const deadline = Date.now()+30*60*1000;
    while (!fs.existsSync(path.join(out,'stop')) && Date.now()<deadline) {
      if (!drift && fs.existsSync(path.join(out,'change-source'))) {
        assert.equal(fs.readFileSync(entry,'utf8'),source('reviewed'));
        fs.writeFileSync(entry,source('revised')); drift=true;
        write(path.join(out,'changed.json'), { sha256: digest(fs.readFileSync(entry)) });
      }
      await delay(200);
    }
  } finally {
    const closed = await Promise.allSettled(closers.map(fn => fn()));
    assert(closed.every(v => v.status === 'fulfilled'));
    write(path.join(out,'closed.json'), { hostsClosed: closed.length });
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
