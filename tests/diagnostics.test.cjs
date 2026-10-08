const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { doctor } = require('../scripts/lib/doctor.cjs');
const { collect } = require('../scripts/lib/record.cjs');
const { support, reproduction } = require('../scripts/lib/support.cjs');

function temp(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'dol-diagnostics-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}

test('Doctor tolerates missing optional scrcpy and never substitutes another device', async t => {
  const root = temp(t), commands = [];
  const run = async (exe, args) => {
    commands.push([exe, ...args]);
    if (exe === 'node') return { stdout: `${process.versions.node}\n` };
    if (exe === 'python') return { stdout: 'Python 3.12.0' };
    if (exe === 'adb' && args.at(-1) === 'version') return { stdout: 'Android Debug Bridge 1.0.41' };
    if (exe === 'android') return { stdout: 'android-cli 1.2.3' };
    if (exe === 'scrcpy') throw Object.assign(Error('missing'), { code: 'ENOENT' });
    if (exe === 'adb' && args.at(-1) === 'devices') return { stdout: 'List of devices attached\nother-device device\n' };
    throw Error(`unexpected command ${exe} ${args.join(' ')}`);
  };
  const report = await doctor({ serial: 'requested-device', package: 'com.example.game', out: path.join(root, 'report.json') }, run);
  assert.equal(report.checks.find(c => c.name === 'scrcpy').status, 'unavailable');
  assert.equal(report.status, 'partial');
  const devices = report.checks.find(c => c.name === 'devices');
  assert.equal(devices.data.selectedDeviceReady, false);
  assert.ok(commands.some(c => c.includes('devices')));
  assert.equal(commands.some(c => c.includes('forward')), false);
  assert.equal(commands.some(c => c.includes('install')), false);
  assert.equal(commands.some(c => c.includes('run-as')), false);
  assert.equal(commands.some(c => c.some(a => String(a).includes('/data/'))), false);
});

test('screen recording validates duration, uses isolated paths, limits capture and cleans failed attempts', async () => {
  const calls = [];
  const mp4 = Buffer.from([0, 0, 0, 12, ...Buffer.from('ftyp'), 0, 0, 0, 0]);
  const adb = async (...args) => { calls.push(['call', ...args]); };
  adb.execute = async (args, options) => {
    calls.push(['execute', ...args, options]);
    return mp4;
  };
  for (const recordSeconds of [0, 31, 1.5]) await assert.rejects(collect({ options: { recordSeconds }, adb }), /1\.\.30/);
  assert.equal(calls.length, 0);
  const result = await collect({ options: { recordSeconds: 12 }, adb });
  assert.equal(result.extension, 'mp4');
  const mkdir = calls.find(c => c[0] === 'call' && c[2] === 'mkdir');
  const record = calls.find(c => c[0] === 'execute' && c[2] === 'screenrecord');
  assert.match(mkdir[3], /^\/data\/local\/tmp\/dol-dev-[0-9a-f-]{36}$/);
  assert.equal(record[3], '--time-limit');
  assert.equal(record[4], '12');
  assert.equal(record.at(-1).timeout, 17000);
  assert.ok(calls.some(c => c[0] === 'call' && c[2] === 'rm' && c[4].endsWith('/screen.mp4')));
  assert.ok(calls.some(c => c[0] === 'call' && c[2] === 'rmdir' && c[3] === mkdir[3]));

  const failed = [];
  const brokenAdb = async (...args) => { failed.push(args); if (args[1] === 'mkdir') return; throw Error('record failed'); };
  brokenAdb.execute = async () => { throw Error('screenrecord failed'); };
  await assert.rejects(collect({ options: { recordSeconds: 5 }, adb: brokenAdb }), /screenrecord failed/);
  assert.ok(failed.some(c => c[1] === 'rm'));
  assert.ok(failed.some(c => c[1] === 'rmdir'));

  const invalid = async (...args) => { if (args[1] === 'mkdir') return; };
  invalid.execute = async args => args[1] === 'screenrecord' ? Buffer.from('bad container') : Buffer.from('');
  await assert.rejects(collect({ options: { recordSeconds: 5 }, adb: invalid }), /Invalid recording container/);
});

function envelope(incidentId, data) { return JSON.stringify({ schemaVersion: 1, incidentId, data }); }

test('Support projects the allowlist only and rejects mismatched evidence without overwriting', t => {
  const root = temp(t), from = path.join(root, 'evidence');
  fs.mkdirSync(from);
  const incidentId = '123e4567-e89b-42d3-a456-426614174000';
  const hash = require('node:crypto').createHash('sha256');
  const artifacts = {};
  const png = Buffer.from([137,80,78,71,13,10,26,10,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1]);
  fs.writeFileSync(path.join(from, 'screenshot.png'), png);
  for (const [name, data] of Object.entries({
    device: { androidVersion: '15', model: 'private-model', serial: 'private-serial' },
    app: { versionName: '1.0', package: 'private-package', inputValue: 'private-input' },
    versions: { gameVersion: '1.2', loaderVersion: '3.4', token: 'private-token',gameVersionSources:{startConfig:'0.5.12.13',gameVersionMod:null,body:'private-source-body'} },
    console: { events: Array.from({ length: 55 }, () => ({ kind: 'console', level: 'error', timestampMs: 2, content: 'private-console' })), omitted: 800 },
    network: { requests: [{ host: 'private-host', path: '/private' }] },
    'dom-contract': { nodes: [{ id: 'private-dom-id' }] },
  })) {
    const body = envelope(incidentId, data);
    fs.writeFileSync(path.join(from, `${name}.json`), body);
    artifacts[name] = require('node:crypto').createHash('sha256').update(body).digest('hex');
  }
  const manifest = { schemaVersion: 1, incidentId, status: 'complete', steps: [
    ...['device','app','versions','console','network','dom-contract'].map(name => ({ name, status: 'completed', artifact: { sha256: artifacts[name] } })),
    { name: 'screenshot', status: 'completed', artifact: { sha256: require('node:crypto').createHash('sha256').update(png).digest('hex') } },
  ] };
  fs.writeFileSync(path.join(from, 'manifest.json'), JSON.stringify(manifest));
  const out = path.join(root, 'support');
  const report = support(from, out);
  assert.deepEqual(report.versions.gameVersionSources,{startConfig:'0.5.12.13',gameVersionMod:null});
  assert.equal(report.versions.gameVersion,'1.2');assert.equal(JSON.stringify(report).includes('private-source-body'),false);
  assert.equal(report.status, 'complete', JSON.stringify(report.steps));
  assert.equal(report.privacy.screenshotIncluded, false);
  assert.equal(fs.existsSync(path.join(out, 'screenshot.png')), false);
  const serialized = fs.readFileSync(path.join(out, 'support.json'), 'utf8');
  for (const secret of ['private-model','private-serial','private-package','private-input','private-token','private-console','private-host','private-dom-id']) assert.equal(serialized.includes(secret), false);
  assert.equal(JSON.parse(serialized).console.events[0].content, undefined);
  assert.equal(report.console.events.length, 50);
  assert.equal(report.console.sourceOmitted, 800);
  assert.equal(report.console.projectionOmitted, 5);
  const legacyConsole = envelope(incidentId, { events: [{ kind: 'console', timestampMs: 2 }] });
  fs.writeFileSync(path.join(from, 'console.json'), legacyConsole);
  const legacyManifest = { ...manifest, steps: [{ name: 'console', status: 'completed', artifact: { sha256: require('node:crypto').createHash('sha256').update(legacyConsole).digest('hex') } }] };
  fs.writeFileSync(path.join(from, 'manifest.json'), JSON.stringify(legacyManifest));
  const legacy = support(from, path.join(root, 'support-legacy'));
  assert.equal(legacy.status, 'complete');
  assert.equal(legacy.console.sourceOmitted, null);
  assert.equal(legacy.console.projectionOmitted, 0);

  const badOut = path.join(root, 'support-bad');
  const bad = { ...manifest, steps: [{ name: 'versions', status: 'completed', artifact: { sha256: '0'.repeat(64) } }] };
  fs.writeFileSync(path.join(from, 'manifest.json'), JSON.stringify(bad));
  const partial = support(from, badOut);
  assert.equal(partial.status, 'partial');
  const prior = fs.readFileSync(path.join(badOut, 'support.json'), 'utf8');
  assert.throws(() => support(from, badOut), { code: 'EEXIST' });
  assert.equal(fs.readFileSync(path.join(badOut, 'support.json'), 'utf8'), prior);

  const missingOut = path.join(root, 'support-missing-hash');
  fs.writeFileSync(path.join(from, 'manifest.json'), JSON.stringify({ ...manifest, steps: [{ name: 'device', status: 'completed' }] }));
  assert.equal(support(from, missingOut).status, 'partial');
  const incidentOut = path.join(root, 'support-incident-mismatch');
  const wrongIncident = envelope('123e4567-e89b-42d3-a456-426614174001', { androidVersion: '15' });
  fs.writeFileSync(path.join(from, 'device.json'), wrongIncident);
  fs.writeFileSync(path.join(from, 'manifest.json'), JSON.stringify({ ...manifest, steps: [{ name: 'device', status: 'completed', artifact: { sha256: require('node:crypto').createHash('sha256').update(wrongIncident).digest('hex') } }] }));
  assert.equal(support(from, incidentOut).status, 'partial');
});

test('reproduction note enforces text, step count, step types and file size', t => {
  const root = temp(t), filename = path.join(root, 'repro.json');
  fs.writeFileSync(filename, JSON.stringify({ summary: 'summary', expected: 'expected', actual: 'actual', steps: ['one', 'two'] }));
  assert.deepEqual(reproduction(filename).steps, ['one', 'two']);
  fs.writeFileSync(filename, JSON.stringify({ summary: 42 }));
  assert.throws(() => reproduction(filename), /fields must be text/);
  fs.writeFileSync(filename, JSON.stringify({ steps: Array(21).fill('step') }));
  assert.throws(() => reproduction(filename), /Invalid reproduction steps/);
  fs.writeFileSync(filename, JSON.stringify({ steps: ['ok', 3] }));
  assert.throws(() => reproduction(filename), /Invalid reproduction steps/);
  fs.writeFileSync(filename, ' '.repeat(65537));
  assert.throws(() => reproduction(filename), /too large/);
});

test('Support rejects nested version metadata even with matching incident and checksum', t => {
  const root = temp(t), from = path.join(root, 'evidence');
  fs.mkdirSync(from);
  const incidentId = '123e4567-e89b-42d3-a456-426614174000';
  const fields = [['device','androidVersion'],['app','versionName'],['app','versionCode'],['versions','gameVersion'],['versions','loaderVersion']];
  for (const [index, [name, field]] of fields.entries()) {
    const body = envelope(incidentId, { [field]: { model: 'private-model', serial: 'private-serial', account: 'private-account' } });
    fs.writeFileSync(path.join(from, `${name}.json`), body);
    fs.writeFileSync(path.join(from, 'manifest.json'), JSON.stringify({ schemaVersion: 1, incidentId, status: 'complete', steps: [
      { name, status: 'completed', artifact: { sha256: require('node:crypto').createHash('sha256').update(body).digest('hex') } },
    ] }));
    const out = path.join(root, `support-${index}`), report = support(from, out);
    assert.equal(report.status, 'partial');
    assert.equal(report.steps[0].supportProjection, 'failed');
    const output = fs.readFileSync(path.join(out, 'support.json'), 'utf8');
    for (const secret of ['private-model','private-serial','private-account']) assert.equal(output.includes(secret), false);
  }
});
