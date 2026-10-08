const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { compare, report, readManifest, knownGood, timelineReport } = require('../scripts/lib/evidence-tools.cjs');

const incident = '123e4567-e89b-42d3-a456-426614174000';
const hash = value => createHash('sha256').update(value).digest('hex');
function fixture(t) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'dol-compare-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  return base;
}
function incidentDir(base, folder, steps, extras = {}) {
  const dir = path.join(base, folder);
  fs.mkdirSync(dir);
  const manifest = { schemaVersion: 1, incidentId: incident, status: 'complete',
    captureStart: '2026-10-05T00:00:00.000Z', captureEnd: '2026-10-05T00:00:01.000Z',
    toolVersion: '1.0.0', steps: [], ...extras };
  for (const [name, data] of Object.entries(steps)) {
    const filename = `${name}.json`;
    const body = JSON.stringify({ schemaVersion: 1, incidentId: incident, source: name,
      capturedAt: '2026-10-05T00:00:00.000Z', data });
    fs.writeFileSync(path.join(dir, filename), body);
    manifest.steps.push({ name, status: 'completed', artifact: { filename, sha256: hash(body) },
      captureStart: manifest.captureStart, captureEnd: manifest.captureEnd });
  }
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  return { dir, manifest };
}
test('time alignment preserves clock uncertainty and unknown anchors without exporting event bodies',t=>{
 const base=fixture(t),start=Date.parse('2026-10-05T00:00:00.000Z');
 const source=incidentDir(base,'aligned',{timeline:{source:'timeline',durationMs:100,dropped:0,truncated:false,clock:{targetStartUnixMs:start+1000},records:[{kind:'event',atMs:10,type:'click',text:'PRIVATE_EVENT'},{kind:'error',atMs:20,errorBody:'PRIVATE_ERROR'},{kind:'longtask',atMs:80,startMs:10,durationMs:50}]},network:{omitted:0,requests:[{timestampSeconds:(start+1030)/1000,durationMs:50,failed:false,url:'PRIVATE_URL'}]}},{device:{clockOffsetMs:1000,clockUncertaintyMs:100}});
 const result=timelineReport(source.dir,path.join(base,'timeline'));assert.equal(result.status,'complete');assert.equal(result.entries.find(e=>e.kind==='event').atMs,10);assert.equal(result.entries.find(e=>e.kind==='event').uncertaintyMs,100);assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
 assert.equal(result.entries.find(e=>e.kind==='longtask').atMs,10);assert.equal(result.entries.find(e=>e.kind==='longtask').observedRelativeToCaptureMs,80);
 const truncated=incidentDir(base,'truncated-time',{timeline:{source:'timeline',durationMs:100,dropped:500,truncated:true,clock:{targetStartUnixMs:start+1000},records:[]},console:{omitted:5,events:[]}},{device:{clockOffsetMs:1000,clockUncertaintyMs:100}});const incomplete=timelineReport(truncated.dir,path.join(base,'truncated-report'));assert.equal(incomplete.status,'partial');assert.equal(incomplete.sourceOmitted,505);
 const empty=incidentDir(base,'empty-source',{timeline:null});const missing=timelineReport(empty.dir,path.join(base,'empty-report'));assert.equal(missing.status,'partial');assert.equal(missing.unmapped[0].reason,'source-envelope-unavailable');
 const bad=incidentDir(base,'malformed-sources',{console:{events:null},network:{omitted:0,requests:[null]}});const invalid=timelineReport(bad.dir,path.join(base,'malformed-report'));assert.equal(invalid.status,'partial');assert.equal(invalid.unmapped[0].reason,'source-format-unavailable');assert.equal(invalid.projectionOmitted,1);
 source.manifest.device={};fs.writeFileSync(path.join(source.dir,'manifest.json'),JSON.stringify(source.manifest));const unknown=timelineReport(source.dir,path.join(base,'unmapped'));assert.equal(unknown.status,'partial');assert.equal(unknown.entries.some(e=>e.kind==='event'),false);assert.equal(unknown.unmapped[0].relativeToCaptureMs,10);
});
const domNode = id => ({ address: '0', parent: null, tag: 'div', id, class: [], data: [], hidden: false, childCount: 0 });
const cssNode = display => ({ address: '0', parent: null, tag: 'div', id: '', class: [], childCount: 0,
  style: { display }, rect: { x: 0, y: 0, width: 10, height: 10 } });

function lifecycleSnapshot(pid = '123', reason = 5) {
  const pkg = 'com.example.game';
  const history = require('../scripts/lib/app-lifecycle.cjs').history;
  return { schemaVersion: 1, source: 'Android lifecycle', package: pkg, userId: 0, packageUid: 10331,
    bootIdHash: 'a'.repeat(64), mainPid: pid, incomplete: false,
    exitHistory: history(`ACTIVITY MANAGER PROCESS EXIT INFO (dumpsys activity exit-info)\n package: ${pkg}\n ApplicationExitInfo #0:\n timestamp=2026-10-06 10:00:00.000 pid=100 realUid=10331 packageUid=10331 definingUid=10331 user=0\n process=${pkg} reason=${reason} (IGNORED) status=0\n description=SECRET_BODY\n`, pkg, 0, 10331),
    arbitrary: 'SECRET_BODY' };
}

test('Evidence lifecycle comparison uses semantic metadata and preserves unknown target/coverage', t => {
  const base = fixture(t), before = incidentDir(base, 'life-before', { 'app-lifecycle': lifecycleSnapshot() });
  const next = lifecycleSnapshot('456', 6), after = incidentDir(base, 'life-after', { 'app-lifecycle': next });
  const compared = compare(before.dir, after.dir, path.join(base, 'life-out'));
  assert.equal(compared.status, 'complete');
  assert.equal(compared.comparisons[0].pidChanged, true);
  assert.equal(compared.comparisons[0].newlyReportedExits[0].reason, 'ANR');
  const serialized = JSON.stringify(compared);
  for (const privateField of ['SECRET_BODY','com.example.game','packageUid','2026-10-06 10:00']) assert.equal(serialized.includes(privateField), false);
  for (const [folder, data] of [['foreign', { ...next, bootIdHash: 'b'.repeat(64) }], ['incomplete', { ...next, incomplete: true }], ['malformed', { ...next, packageUid: 0 }]]) {
    const source = incidentDir(base, folder, { 'app-lifecycle': data });
    const result = compare(before.dir, source.dir, path.join(base, folder + '-out'));
    assert.equal(result.status, 'partial'); assert.equal(result.comparisons[0].status, 'unknown');
  }
  const missing = incidentDir(base, 'missing-lifecycle', {});
  assert.equal(compare(before.dir, missing.dir, path.join(base, 'missing-lifecycle-out')).status, 'partial');
  assert.throws(() => knownGood(before.dir, path.join(base, 'lifecycle-reference')), /complete snapshot/);
});

test('Journey lifecycle checkpoints pair their declared kind rather than artifact position', t => {
  const base = fixture(t);
  function journeyDir(folder, reversed, capture = ['app-lifecycle','console']) {
    const source = incidentDir(base, folder, { 'step-0-app-lifecycle': lifecycleSnapshot(), 'step-0-console': { body: 'SECRET_CONSOLE' } }, { source: 'Journey execution' });
    const artifacts = source.manifest.steps.map(step => step.artifact);
    source.manifest.steps = [{ type: 'checkpoint', status: 'completed', capture, artifacts: reversed ? artifacts.reverse() : artifacts }];
    fs.writeFileSync(path.join(source.dir, 'manifest.json'), JSON.stringify(source.manifest));
    return source;
  }
  const before = journeyDir('journey-before', false), after = journeyDir('journey-after', true);
  const compared = compare(before.dir, after.dir, path.join(base, 'journey-life-out'));
  assert.equal(compared.status, 'complete'); assert.equal(compared.comparisons[0].stepIndex, 0);
  assert.equal(compared.comparisons[0].pidChanged, false);
  assert.deepEqual(compared.comparisons[0].newlyReportedExits, []);
  const undeclared = journeyDir('journey-undeclared', false, ['console']);
  assert.equal(compare(before.dir, undeclared.dir, path.join(base, 'journey-undeclared-out')).status, 'partial');
  after.manifest.steps[0].artifacts = after.manifest.steps[0].artifacts.filter(item => item.filename.includes('console'));
  fs.writeFileSync(path.join(after.dir, 'manifest.json'), JSON.stringify(after.manifest));
  assert.equal(compare(before.dir, after.dir, path.join(base, 'journey-missing-out')).status, 'partial');
});

test('Issue Report consumes projected Support without exporting private fields or inventing Evidence time', t => {
  const base = fixture(t), source = incidentDir(base, 'support-source', { app: { versionName: '0.5.12', versionCode: '512' } });
  const supportDir = path.join(base, 'support');
  const data = require('../scripts/lib/support.cjs').support(source.dir, supportDir);
  data.privateBody = 'SECRET_BODY'; data.console = { events: [{ body: 'SECRET_CONSOLE' }] };
  data.versions.extra = { body: 'SECRET_VERSION' };
  data.versions.gameVersionSources={startConfig:'0.5.12.13',gameVersionMod:null,body:'SECRET_SOURCE'};
  fs.writeFileSync(path.join(supportDir, 'support.json'), JSON.stringify(data));
  fs.writeFileSync(path.join(supportDir, 'repro.json'), 'SECRET_REPRO');
  const out = path.join(base, 'support-report'), result = report(supportDir, out);
  assert.equal(result.status, 'complete'); assert.equal(result.inputKind, 'support');
  assert.equal(result.versions.appVersion, '0.5.12'); assert.equal(result.incident.incidentId, incident);
  assert.equal(result.versions.startConfigVersion,'0.5.12.13');assert.equal(result.versions.gameVersionModVersion,undefined);
  assert.equal(result.support.supportId, data.supportId); assert.equal(result.support.originalEvidenceVerified, false);
  assert.equal(result.incident.captureStart, null); assert.equal(result.incident.captureEnd, null);
  for (const file of ['report.json','report.md']) assert.equal(fs.readFileSync(path.join(out, file), 'utf8').includes('SECRET_'), false);
  data.steps[0].supportProjection = 'failed';
  fs.writeFileSync(path.join(supportDir, 'support.json'), JSON.stringify(data));
  const failed = report(supportDir, path.join(base, 'support-partial'));
  assert.equal(failed.status, 'partial'); assert.equal(failed.steps[0].reason, 'support-projection-failed');
  delete data.steps[0].supportProjection;
  data.steps.push({ name: 'app-lifecycle', status: 'failed' });
  fs.writeFileSync(path.join(supportDir, 'support.json'), JSON.stringify(data));
  assert.equal(report(supportDir, path.join(base, 'support-conflict')).status, 'partial');
  data.steps.pop();
  data.steps.push({ name: 'dom-contract', status: 'skipped', required: false }, { name: 'integration-0', status: 'failed' });
  fs.writeFileSync(path.join(supportDir, 'support.json'), JSON.stringify(data));
  assert.equal(report(supportDir, path.join(base, 'support-optional')).status, 'complete');
  data.steps.push({ name: 'network', status: 'failed', required: true });
  fs.writeFileSync(path.join(supportDir, 'support.json'), JSON.stringify(data));
  assert.equal(report(supportDir, path.join(base, 'support-required')).status, 'partial');
  for (const [field, value] of [['incidentId', { body: 'SECRET_ID' }], ['steps', Array(101).fill(data.steps[0])], ['versions', { app: { versionName: { body: 'SECRET_VERSION' } } }]]) {
    const badDir = path.join(base, 'bad-' + field); fs.mkdirSync(badDir);
    fs.writeFileSync(path.join(badDir, 'support.json'), JSON.stringify({ ...data, [field]: value }));
    const bad = report(badDir, path.join(base, 'bad-' + field + '-report'));
    assert.equal(bad.status, 'partial'); assert.deepEqual(bad.reasons, ['support-invalid']);
    assert.equal(JSON.stringify(bad).includes('SECRET_'), false);
  }
  fs.writeFileSync(path.join(supportDir, 'manifest.json'), '{}');
  const noFallback = report(supportDir, path.join(base, 'support-no-fallback'));
  assert.deepEqual(noFallback.reasons, ['manifest-invalid']); assert.equal(noFallback.support, undefined);
  assert.throws(() => report(supportDir, out), { code: 'EEXIST' });
});

test('compare emits validated DOM/CSS fields and hashes without exporting unknown payload', t => {
  const base = fixture(t);
  const before = incidentDir(base, 'before', {
    'dom-contract': { schemaVersion: 1, source: 'DOM', nodes: [domNode('old')], truncated: false, scopeHash: 'a'.repeat(64) },
    'css-contract': { schemaVersion: 1, source: 'CSS', nodes: [cssNode('block')], truncated: false, scopeHash: 'a'.repeat(64) },
    network: { privatePayload: 'SECRET_BODY' },
  }, { serial: 'SECRET_SERIAL', unknown: 'SECRET_MANIFEST' });
  const after = incidentDir(base, 'after', {
    'dom-contract': { schemaVersion: 1, source: 'DOM', nodes: [domNode('new')], truncated: false, scopeHash: 'a'.repeat(64) },
    'css-contract': { schemaVersion: 1, source: 'CSS', nodes: [cssNode('flex')], truncated: false, scopeHash: 'a'.repeat(64) },
    network: { privatePayload: 'DIFFERENT_SECRET_BODY' },
  });
  const out = path.join(base, 'out');
  const result = compare(before.dir, after.dir, out);
  assert.equal(result.status, 'complete');
  assert.ok(result.comparisons.find(item => item.step === 'dom-contract').changes[0].fields.includes('id'));
  assert.ok(result.comparisons.find(item => item.step === 'css-contract').changes[0].fields.includes('style.display'));
  assert.ok(result.artifacts.some(item => item.step === 'network'));
  const saved = fs.readFileSync(path.join(out, 'compare.json'), 'utf8');
  assert.equal(saved.includes('SECRET_'), false);
  assert.equal(saved.includes(before.dir), false);
});

test('tampered, missing and escaping artifacts yield partial without reading payloads', t => {
  const base = fixture(t);
  const good = incidentDir(base, 'good', { 'dom-contract': { schemaVersion: 1, source: 'DOM', nodes: [domNode('x')] } });
  const tampered = incidentDir(base, 'tampered', { 'dom-contract': { schemaVersion: 1, source: 'DOM', nodes: [domNode('x')] } });
  fs.appendFileSync(path.join(tampered.dir, 'dom-contract.json'), 'private-extra');
  const loaded = readManifest(tampered.dir);
  assert.equal(loaded.status, 'partial');
  assert.equal(loaded.reasons[0].code, 'artifact-checksum');
  const missing = incidentDir(base, 'missing', { 'dom-contract': { schemaVersion: 1, source: 'DOM', nodes: [domNode('x')] } });
  fs.rmSync(path.join(missing.dir, 'dom-contract.json'));
  assert.equal(readManifest(missing.dir).reasons[0].code, 'artifact-missing');
  const escaped = incidentDir(base, 'escaped', { 'dom-contract': { schemaVersion: 1, source: 'DOM', nodes: [domNode('x')] } });
  escaped.manifest.steps[0].artifact.filename = '../outside.json';
  fs.writeFileSync(path.join(escaped.dir, 'manifest.json'), JSON.stringify(escaped.manifest));
  assert.equal(readManifest(escaped.dir).reasons[0].code, 'artifact-invalid');
  const result = compare(good.dir, tampered.dir, path.join(base, 'out'));
  assert.equal(result.status, 'partial');
  assert.equal(result.comparisons.find(item => item.step === 'dom-contract').status, 'unknown');
});

test('report uses fixed Markdown and version grammar; exclusive output preserves existing files', t => {
  const base = fixture(t);
  const source = incidentDir(base, 'source', { repro: { summary: '<script>private</script>' },
    console: { body: 'SECRET_CONSOLE' } }, { gameVersion: '0.5.1', loaderVersion: '<unsafe>', package: 'SECRET_PACKAGE' });
  source.manifest.steps.push({ name: 'network', status: 'failed', reason: '<script>bad</script>' });
  fs.writeFileSync(path.join(source.dir, 'manifest.json'), JSON.stringify(source.manifest));
  const out = path.join(base, 'report');
  const result = report(source.dir, out);
  assert.equal(result.repro, 'completed');
  assert.equal(result.versions.gameVersion, '0.5.1');
  assert.equal(result.versions.loaderVersion, undefined);
  assert.equal(result.steps.at(-1).reason, 'generic');
  const markdown = fs.readFileSync(path.join(out, 'report.md'), 'utf8');
  assert.equal(markdown.includes('<script>'), false);
  assert.equal(markdown.includes('SECRET_'), false);
  fs.writeFileSync(path.join(out, 'sentinel'), 'keep');
  assert.throws(() => report(source.dir, out), { code: 'EEXIST' });
  assert.equal(fs.readFileSync(path.join(out, 'sentinel'), 'utf8'), 'keep');
});

test('knownGood keeps only projected snapshots, compares with source, and never overwrites', t => {
  const base = fixture(t), privateNode = { ...domNode('SECRET_ID'), class: ['SECRET_CLASS'] };
  const source = incidentDir(base, 'source', {
    'dom-contract': { schemaVersion: 1, source: 'DOM', nodes: [privateNode], truncated: false, scopeHash: 'a'.repeat(64) },
    'css-contract': { schemaVersion: 1, source: 'CSS', nodes: [cssNode('block')], truncated: false, scopeHash: 'a'.repeat(64) },
    network: { privatePayload: 'SECRET_BODY' }, repro: { note: 'SECRET_NOTE' },
  }, { serial: 'SECRET_SERIAL' });
  const out = path.join(base, 'reference');
  const manifest = knownGood(source.dir, out, { label: 'known-ui' });
  assert.notEqual(manifest.incidentId, incident);
  assert.equal(manifest.originIncidentId, incident);
  assert.equal(manifest.claim, 'caller-selected reference; business acceptance unverified');
  assert.deepEqual(manifest.steps.map(step => step.name), ['dom-contract', 'css-contract']);
  assert.equal(readManifest(out).status, 'complete');
  const text = fs.readdirSync(out).map(file => fs.readFileSync(path.join(out, file), 'utf8')).join('\n');
  assert.equal(/SECRET_|privatePayload|serial|network|repro/.test(text), false);
  const result = compare(out, source.dir, path.join(base, 'comparison'));
  assert.equal(result.status, 'complete');
  assert.equal(result.comparisons.every(item => item.status === 'available' && item.changes.length === 0), true);
  fs.writeFileSync(path.join(out, 'sentinel'), 'keep');
  assert.throws(() => knownGood(source.dir, out), { code: 'EEXIST' });
  assert.equal(fs.readFileSync(path.join(out, 'sentinel'), 'utf8'), 'keep');
});

test('knownGood rejects partial and truncated sources before creating output', t => {
  const base = fixture(t);
  const truncated = incidentDir(base, 'truncated', {
    'dom-contract': { schemaVersion: 1, source: 'DOM', nodes: [domNode('x')], truncated: true, scopeHash: 'a'.repeat(64) },
  });
  const first = path.join(base, 'first');
  assert.throws(() => knownGood(truncated.dir, first), /reference snapshot/);
  assert.equal(fs.existsSync(first), false);
  const selected=incidentDir(base,'selected',{'dom-contract':{schemaVersion:1,source:'DOM',nodes:[domNode('x')],truncated:false,scopeHash:'a'.repeat(64)},storage:{schemaVersion:1,source:'storage'}});
  assert.equal(knownGood(selected.dir,path.join(base,'selected-reference'),{snapshots:['dom-contract']}).status,'complete');
  assert.throws(()=>knownGood(selected.dir,path.join(base,'missing-reference'),{snapshots:['environment']}),/missing/);
  assert.equal(fs.existsSync(path.join(base,'missing-reference')),false);
  const partial = incidentDir(base, 'partial', {
    'dom-contract': { schemaVersion: 1, source: 'DOM', nodes: [domNode('x')], truncated: false, scopeHash: 'a'.repeat(64) },
  }, { status: 'partial' });
  const second = path.join(base, 'second');
  assert.throws(() => knownGood(partial.dir, second), /Incomplete reference incident/);
  assert.equal(fs.existsSync(second), false);
});

test('knownGood projects complete environment and storage metadata without extra fields', t => {
  const base = fixture(t);
  const environment = { schemaVersion: 1, source: 'Environment',
    device: { model: 'SECRET_MODEL', androidVersion: '16' },
    app: { package: 'com.example.game', versionName: '1', versionCode: '1', foregroundMatches: true },
    provider: { status: 'available', package: 'com.android.webview', version: '1' },
    webview: { product: 'WebView/1', protocolVersion: '1', jsVersion: '1' },
    runtime: { gameVersion: '1', loaderVersion: '1',gameVersionSources:{startConfig:'1',gameVersionMod:null,body:'SECRET_SOURCE'}, viewport: { width: 100, height: 100, devicePixelRatio: 1 },
      capabilities: { modList: true, performanceObserver: true, mutationObserver: true, indexedDB: true },
      mods: { status: 'available', items: [{ name: 'SECRET_MOD', version: '1', reportedIndex: 0,
        enabled: null, loadOrder: null }], truncated: false, unreadable: 0 } },
    incomplete: false, unknownPrivateField: 'SECRET_EXTRA' };
  const storage = { schemaVersion: 1, source: 'storage',
    local: { status: 'available', count: 1, omitted: 0, keys: [{ hash: 'a'.repeat(64) }] },
    session: { status: 'available', count: 0, omitted: 0, keys: [] },
    indexedDB: { status: 'available', omitted: 0, databases: [{ nameHash: 'b'.repeat(64), version: 1,
      status: 'available', omitted: 0, stores: [{ nameHash: 'c'.repeat(64), status: 'available', count: 2 }] }] },
    unknownPrivateField: 'SECRET_STORAGE' };
  const source = incidentDir(base, 'source', { environment, storage });
  const out = path.join(base, 'reference');
  source.manifest.steps.push({name:'integration-0',required:false,status:'failed'});
  fs.writeFileSync(path.join(source.dir,'manifest.json'),JSON.stringify(source.manifest));
  knownGood(source.dir, out);
  const saved = fs.readdirSync(out).map(file => fs.readFileSync(path.join(out, file), 'utf8')).join('\n');
  assert.equal(saved.includes('SECRET_'), false);
  assert.equal(saved.includes('unknownPrivateField'), false);
  const comparison = compare(out, source.dir, path.join(base, 'comparison'));
  assert.equal(comparison.status, 'complete');
  assert.equal(comparison.comparisons.every(item => item.status === 'available' && item.changes.length === 0), true);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(out,'environment.json'),'utf8')).data.runtime.gameVersionSources,{startConfig:'1',gameVersionMod:null});
  storage.local.status = 'unsupported';
  const incomplete = incidentDir(base, 'incomplete', { storage });
  assert.throws(() => knownGood(incomplete.dir, path.join(base, 'refused')), /reference snapshot/);
});

test('Journey labels ignore arbitrary step names and excessive artifacts stay bounded', t => {
  const base = fixture(t), dir = path.join(base, 'journey');
  fs.mkdirSync(dir);
  const manifest = { schemaVersion: 1, incidentId: incident, toolVersion: '1.0.0', source: 'Journey execution',
    status: 'complete', captureStart: '2026-10-05T00:00:00.000Z', captureEnd: '2026-10-05T00:00:01.000Z',
    steps: [{ type: 'checkpoint', name: 'SECRET_PRIVATE_NAME', status: 'completed', artifacts: Array(33).fill({ filename: 'x.json', sha256: 'a'.repeat(64) }) }] };
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest));
  assert.equal(readManifest(dir).reasons[0].code, 'artifact-invalid');
  const compared = compare(dir, dir, path.join(base, 'out'));
  assert.equal(compared.status, 'partial');
  assert.equal(JSON.stringify(compared).includes('SECRET_PRIVATE_NAME'), false);
  const issue = report(dir, path.join(base, 'issue'));
  assert.equal(JSON.stringify(issue).includes('SECRET_PRIVATE_NAME'), false);
});
