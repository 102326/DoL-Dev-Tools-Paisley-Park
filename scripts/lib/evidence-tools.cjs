const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const dom = require('./dom.cjs');
const css = require('./css.cjs');
const environment = require('./environment.cjs');
const { storageDiff } = require('./inspectors.cjs');
const lifecycle = require('./app-lifecycle.cjs');

const sha = value => createHash('sha256').update(value).digest('hex');
const uuid = value => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
const timestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const name = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
const filename = value => typeof value === 'string' && value.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && path.basename(value) === value;
const status = value => ['complete', 'partial', 'failed', 'planned'].includes(value);
const stepStatus = value => ['completed', 'failed', 'skipped', 'unsupported', 'planned'].includes(value);
const version = value => typeof value === 'string' && /^[0-9A-Za-z._()+-]{1,64}$/.test(value) ? value : null;
const reason = value => ['timeout','collector-error','device-check-failed','app-check-failed','verified-webview-unavailable',
  'cdp-unavailable','no-scope-requested','deadline-or-command-timeout','step-failed','restore-failed-or-conflict',
  'unavailable','unsupported','failed','ENOENT','EACCES','ENOSPC','EEXIST'].includes(value) ? value : 'generic';
const snapshotNames = ['dom-contract','css-contract','environment','storage'];

function projectSnapshot(kind, value) {
  const data = value?.data ?? value;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid reference snapshot');
  if (kind === 'dom-contract') {
    dom.contract(data);
    if (data.source !== 'DOM' || data.truncated !== false || !/^[a-f0-9]{64}$/.test(data.scopeHash || '') || !data.nodes.length) throw Error('Incomplete reference snapshot');
    const nodes = data.nodes.map(node => {
      if (!node || typeof node.tag !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(node.tag) ||
          typeof node.id !== 'string' || node.id.length > 128 || !Array.isArray(node.class) || node.class.length > 32 ||
          node.class.some(item => typeof item !== 'string' || item.length > 128) ||
          !Array.isArray(node.data) || node.data.length > 32 || node.data.some(item => typeof item !== 'string' || item.length > 128) ||
          typeof node.hidden !== 'boolean' || !Number.isSafeInteger(node.childCount) || node.childCount < 0 ||
          node.parent !== (node.address === '0' ? null : node.address.slice(0, node.address.lastIndexOf('/')))) throw Error('Invalid reference snapshot');
      return { address: node.address, parent: node.parent, tag: node.tag, id: sha(node.id),
        class: node.class.map(sha), data: node.data.map(sha), hidden: node.hidden, childCount: node.childCount };
    });
    return { schemaVersion: 1, source: 'DOM', scopeHash: data.scopeHash, nodes, truncated: false };
  }
  if (kind === 'css-contract') {
    css.contract(data);
    if (data.truncated || !/^[a-f0-9]{64}$/.test(data.scopeHash || '') || !data.nodes.length) throw Error('Incomplete reference snapshot');
    const nodes = data.nodes.map(node => ({ address: node.address, parent: node.parent, tag: node.tag,
      id: sha(node.id), class: node.class.map(sha), childCount: node.childCount,
      style: Object.fromEntries(Object.entries(node.style).map(([key, val]) => [key, sha(val)])),
      rect: { x: node.rect.x, y: node.rect.y, width: node.rect.width, height: node.rect.height } }));
    const projected = { schemaVersion: 1, source: 'CSS', scopeHash: data.scopeHash, nodes, truncated: false };
    css.contract(projected);
    return projected;
  }
  if (kind === 'environment') {
    const parsed = environment.contract(data);
    if (parsed.incomplete || data.incomplete === true) throw Error('Incomplete reference snapshot');
    const fields = parsed.fields, group = (name, keys) => Object.fromEntries(keys.map(key => [key, fields[`${name}.${key}`]]));
    const projected = { schemaVersion: 1, source: 'Environment',
      device: group('device', ['model','androidVersion']),
      app: group('app', ['package','versionName','versionCode','foregroundMatches']),
      provider: group('provider', ['status','package','version']),
      webview: group('webview', ['product','protocolVersion','jsVersion']),
      runtime: { ...group('runtime', ['gameVersion','loaderVersion']),
        viewport: group('runtime.viewport', ['width','height','devicePixelRatio']),
        capabilities: group('runtime.capabilities', ['modList','performanceObserver','mutationObserver','indexedDB']),
        mods: { status: 'available', truncated: false, unreadable: 0,
          items: parsed.mods.map(item => ({ name: sha(item.name), version: item.version,
            reportedIndex: item.reportedIndex, enabled: null, loadOrder: null })) } }, incomplete: false };
    for (const [part, key] of [['device','model'],['app','package'],['provider','package']])
      if (projected[part][key]) projected[part][key] = sha(projected[part][key]);
    environment.contract(projected);
    return projected;
  }
  if (kind === 'storage') {
    if (storageDiff(data, data).incomplete) throw Error('Incomplete reference snapshot');
    const section = item => ({ status: item.status, count: item.count, omitted: item.omitted,
      keys: item.keys.map(key => ({ hash: key.hash })) });
    const projected = { schemaVersion: 1, source: 'storage', local: section(data.local), session: section(data.session),
      indexedDB: { status: data.indexedDB.status, omitted: data.indexedDB.omitted,
        databases: data.indexedDB.databases.map(db => ({ nameHash: db.nameHash, version: db.version,
          status: db.status, omitted: db.omitted,
          stores: db.stores.map(store => ({ nameHash: store.nameHash, count: store.count, status: store.status })) })) } };
    storageDiff(projected, projected);
    return projected;
  }
  throw Error('Invalid reference snapshot');
}

function readManifest(dir) {
  let base, manifest;
  try {
    base = fs.realpathSync(dir);
    const file = fs.realpathSync(path.join(base, 'manifest.json'));
    if (path.dirname(file) !== base || fs.statSync(file).size > 1024 * 1024) throw Error();
    manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { throw new Error('Invalid evidence manifest'); }
  if (!manifest || manifest.schemaVersion !== 1 || !uuid(manifest.incidentId) || !status(manifest.status) ||
      !timestamp(manifest.captureStart) || manifest.captureEnd !== undefined && !timestamp(manifest.captureEnd) ||
      !version(manifest.toolVersion) || manifest.source !== undefined && !['Journey plan','Journey execution'].includes(manifest.source) ||
      !Array.isArray(manifest.steps) || manifest.steps.length > 100) throw new Error('Invalid evidence manifest');
  const journey = manifest.source === 'Journey plan' || manifest.source === 'Journey execution';
  const artifacts = new Map(), reasons = [], seen = new Set();
  const addReason = (step, code) => { if (reasons.length < 100) reasons.push({ step, code }); };
  let artifactCount = 0, verifiedBytes = 0;
  const stepNames = new Set();
  for (const [index, step] of manifest.steps.entries()) {
    if (!step || typeof step !== 'object' || Array.isArray(step) || !stepStatus(step.status) ||
        !(journey ? typeof step.type === 'string' && /^[a-z-]{1,32}$/.test(step.type) : name(step.name)) ||
        step.captureStart !== undefined && !timestamp(step.captureStart) ||
        step.captureEnd !== undefined && !timestamp(step.captureEnd) ||
        step.required !== undefined && typeof step.required !== 'boolean') throw new Error('Invalid evidence manifest');
    if (!journey && stepNames.has(step.name)) throw Error('Invalid evidence manifest');
    if (!journey) stepNames.add(step.name);
    const entries = journey ? step.artifacts : step.artifact ? [step.artifact] : [];
    if (step.status === 'completed' && !journey && entries.length === 0) addReason(index, 'artifact-missing');
    if (entries === undefined) continue;
    if (!Array.isArray(entries) || entries.length > 32) { addReason(index, 'artifact-invalid'); continue; }
    for (const [slot, item] of entries.entries()) {
      if (++artifactCount > 200) { addReason(index, 'artifact-limit'); continue; }
      if (!item || !filename(item.filename) || !/^[a-f0-9]{64}$/.test(item.sha256 || '')) {
        addReason(index, 'artifact-invalid'); continue;
      }
      if (seen.has(item.filename)) { addReason(index, 'artifact-duplicate'); continue; }
      seen.add(item.filename);
      let file;
      try { file = fs.realpathSync(path.join(base, item.filename)); }
      catch { addReason(index, 'artifact-missing'); continue; }
      try {
        if (path.dirname(file) !== base) { addReason(index, 'artifact-outside'); continue; }
        const stat = fs.statSync(file);
        if (!stat.isFile() || stat.size > 8 * 1024 * 1024) { addReason(index, 'artifact-invalid'); continue; }
        if (verifiedBytes + stat.size > 32 * 1024 * 1024) { addReason(index, 'artifact-limit'); continue; }
        verifiedBytes += stat.size;
        const raw = fs.readFileSync(file);
        if (sha(raw) !== item.sha256) { addReason(index, 'artifact-checksum'); continue; }
        if (item.filename.endsWith('.json')) {
          let envelope;
          try { envelope = JSON.parse(raw); } catch { addReason(index, 'artifact-invalid'); continue; }
          if (envelope?.schemaVersion !== 1 || envelope.incidentId !== manifest.incidentId) {
            addReason(index, 'artifact-invalid'); continue;
          }
        }
      } catch { addReason(index, 'artifact-invalid'); continue; }
      artifacts.set(`${index}:${slot}`, { filename: item.filename, sha256: item.sha256, file });
    }
  }
  return { manifest, artifacts, status: reasons.length ? 'partial' : manifest.status, reasons, journey };
}

function envelope(loaded, index, slot = 0) {
  const item = loaded.artifacts.get(`${index}:${slot}`);
  if (!item || !item.filename.endsWith('.json')) return null;
  try {
    const raw=fs.readFileSync(item.file);
    if(raw.length>8*1024*1024||sha(raw)!==item.sha256)return null;
    const value = JSON.parse(raw.toString('utf8'));
    return value?.schemaVersion === 1 && value.incidentId === loaded.manifest.incidentId &&
      value.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value : null;
  } catch { return null; }
}

function projected(loaded) {
  const m = loaded.manifest;
  return { incidentId: m.incidentId, captureStart: m.captureStart, captureEnd: timestamp(m.captureEnd) ? m.captureEnd : null,
    status: loaded.status };
}

function compareLifecycle(x, y, fields = {}) {
  try {
    if (!x || !y) throw Error('Lifecycle evidence unavailable');
    const diff = lifecycle.diff(x, y);
    return { step: 'app-lifecycle', ...fields, status: diff.incomplete ? 'unknown' : 'available', ...diff };
  } catch { return { step: 'app-lifecycle', ...fields, status: 'unknown' }; }
}

function compare(beforeDir, afterDir, outDir) {
  fs.mkdirSync(path.resolve(outDir));
  const result = { schemaVersion: 1, source: 'Evidence comparison', status: 'partial', before: null, after: null,
    steps: [], artifacts: [], comparisons: [], reasons: [] };
  result.automaticTestVerdict='not-inferred';result.conditionsVerified=false;
  let before, after;
  try { before = readManifest(beforeDir); result.before = projected(before); }
  catch { result.reasons.push({ side: 'before', code: 'manifest-invalid' }); }
  try { after = readManifest(afterDir); result.after = projected(after); }
  catch { result.reasons.push({ side: 'after', code: 'manifest-invalid' }); }
  if (before && after) {
    result.reasons.push(...before.reasons.map(item => ({ side: 'before', ...item })),
      ...after.reasons.map(item => ({ side: 'after', ...item })));
    const old = new Map(before.manifest.steps.map((step, i) => [before.journey ? `${i}:${step.type}` : step.name, { step, i }]));
    const current = new Map(after.manifest.steps.map((step, i) => [after.journey ? `${i}:${step.type}` : step.name, { step, i }]));
    for (const key of new Set([...old.keys(), ...current.keys()])) {
      const left = old.get(key), right = current.get(key);
      const label = left ? (before.journey ? left.step.type : left.step.name) : (after.journey ? right.step.type : right.step.name);
      const statusBefore = left?.step.status || null, statusAfter = right?.step.status || null;
      result.steps.push({ step: label, before: statusBefore, after: statusAfter, changed: statusBefore !== statusAfter });
      if (key.startsWith('integration-')) continue;
      const slots = Math.min(32,Math.max(Array.isArray(left?.step.artifacts) ? left.step.artifacts.length : left?.step.artifact ? 1 : 0,
        Array.isArray(right?.step.artifacts) ? right.step.artifacts.length : right?.step.artifact ? 1 : 0));
      for (let slot = 0; slot < slots; slot++) {
        const a = left && before.artifacts.get(`${left.i}:${slot}`);
        const b = right && after.artifacts.get(`${right.i}:${slot}`);
        if (a?.sha256 !== b?.sha256) result.artifacts.push({ step: label, slot, beforeSha256: a?.sha256 || null, afterSha256: b?.sha256 || null });
      }
      if (before.journey && after.journey) {
        const requested = entry => entry?.step.type === 'checkpoint' && Array.isArray(entry.step.capture) && entry.step.capture.includes('app-lifecycle');
        if (requested(left) || requested(right)) {
          const snapshot = (loaded, entry) => {
            if (!requested(entry) || entry.step.status !== 'completed') return null;
            const slot = entry.step.artifacts?.findIndex(item => item?.filename === `step-${entry.i}-app-lifecycle.json`);
            return Number.isInteger(slot) && slot >= 0 && slot < 32 ? envelope(loaded, entry.i, slot) : null;
          };
          result.comparisons.push(compareLifecycle(snapshot(before, left), snapshot(after, right), { stepIndex: left?.i ?? right.i }));
        }
      }
      if (!before.journey && !after.journey && key === 'app-lifecycle') {
        result.comparisons.push(compareLifecycle(left?.step.status === 'completed' ? envelope(before, left.i) : null,
          right?.step.status === 'completed' ? envelope(after, right.i) : null));
        continue;
      }
      if (before.journey || after.journey || !left || !right || left.step.status !== 'completed' || right.step.status !== 'completed') continue;
      if (snapshotNames.includes(key)) {
        const x = envelope(before, left.i), y = envelope(after, right.i);
        let comparison = { step: key, status: 'unknown' };
        if (x && y) try {
          const source = { 'dom-contract': dom.diff, 'css-contract': css.diff,
            environment: environment.diff, storage: storageDiff }[key];
          let first = x, second = y;
          const reference = 'caller-selected reference; business acceptance unverified';
          if (before.manifest.claim === reference && x.projection === 'known-good-hashed' && after.manifest.claim !== reference)
            second = { data: projectSnapshot(key, y) };
          if (after.manifest.claim === reference && y.projection === 'known-good-hashed' && before.manifest.claim !== reference)
            first = { data: projectSnapshot(key, x) };
          const diff = source(first, second);
          if (!diff.incomplete) {
            comparison = { step: key, status: 'available', changes: key === 'environment'
              ? diff.changes.map(change => ({ ...(change.field ? { field: change.field } : {}),
                ...(change.mod ? { modHash: sha(change.mod) } : {}), ...(change.kind ? { kind: change.kind } : {}),
                ...(change.fields ? { fields: change.fields } : {}) })) : diff.changes };
          }
        } catch { /* Unsupported or malformed snapshot remains unknown. */ }
        result.comparisons.push(comparison);
      } else if (['gfxinfo','meminfo'].includes(key)) {
        const x = envelope(before, left.i)?.data, y = envelope(after, right.i)?.data;
        const fields = key === 'gfxinfo' ? ['totalFrames','jankyFrames','sampledFrames','medianMs','p95Ms'] : ['pssKb','rssKb'];
        const changes = [];
        let valid = 0;
        for (const field of fields) if (Number.isFinite(x?.[field]) && x[field]>=0 && Number.isFinite(y?.[field]) && y[field]>=0) {
          valid++;
          if (x[field] !== y[field]) changes.push({ field, before: x[field], after: y[field] });
        }
        result.comparisons.push({ step: key, status: valid ? 'available' : 'unknown', changes });
      }
    }
    result.status = result.reasons.length || before.status !== 'complete' || after.status !== 'complete' ||
      result.comparisons.some(item => item.status === 'unknown') ? 'partial' : 'complete';
  }
  fs.writeFileSync(path.join(outDir, 'compare.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
  return result;
}

function readSupport(fromDir) {
  let data;
  try {
    const base = fs.realpathSync(fromDir), file = fs.realpathSync(path.join(base, 'support.json'));
    const stat = fs.statSync(file);
    if (path.dirname(file) !== base || !stat.isFile() || stat.size > 1024 * 1024) throw Error();
    data = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch { throw Error('Invalid support bundle'); }
  const object = value => value && typeof value === 'object' && !Array.isArray(value);
  if (!object(data) || data.schemaVersion !== 1 || !uuid(data.incidentId) || !uuid(data.supportId) ||
      !version(data.toolVersion) || data.source !== 'projected local Evidence Bundle' || !timestamp(data.capturedAt) ||
      !['complete','partial'].includes(data.status) || !object(data.versions) || !object(data.device) ||
      !Array.isArray(data.compatibility) || data.compatibility.length > 100 || !Array.isArray(data.steps) || data.steps.length > 100 ||
      !object(data.privacy) || typeof data.privacy.screenshotIncluded !== 'boolean' || data.privacy.requiresManualReview !== true)
    throw Error('Invalid support bundle');
  const versions = { toolVersion: data.toolVersion }, seen = new Set();
  const addVersion = (field, value) => {
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > 64)) throw Error('Invalid support version');
    if (version(value)) versions[field] = value;
  };
  for (const field of ['gameVersion','loaderVersion']) addVersion(field, data.versions[field]);
  if (data.versions.app !== undefined) {
    if (!object(data.versions.app)) throw Error('Invalid support version');
    addVersion('appVersion', data.versions.app.versionName);
    addVersion('appVersionCode', data.versions.app.versionCode);
  }
  const steps = data.steps.map(step => {
    if (!object(step) || !name(step.name) || seen.has(step.name) ||
        !['completed','failed','skipped','unsupported','unknown'].includes(step.status) ||
        step.required !== undefined && step.required !== null && typeof step.required !== 'boolean' ||
        step.supportProjection !== undefined && step.supportProjection !== 'failed') throw Error('Invalid support step');
    seen.add(step.name);
    return { step: step.name, status: step.status, required: step.required ?? null,
      ...(step.supportProjection === 'failed' ? { reason: 'support-projection-failed' } : step.status !== 'completed' ? { reason: 'generic' } : {}) };
  });
  const incomplete = step => step.reason === 'support-projection-failed' ||
    !/^integration-\d+$/.test(step.step) && step.status !== 'completed' &&
    (step.required === true || step.required !== false && (step.status === 'unknown' || ['device','app','app-lifecycle'].includes(step.step)));
  return { incidentId: data.incidentId, supportId: data.supportId, projectedAt: data.capturedAt, versions, steps,
    status: data.status === 'partial' || steps.some(incomplete) ? 'partial' : 'complete' };
}

function report(fromDir, outDir) {
  fs.mkdirSync(path.resolve(outDir));
  const result = { schemaVersion: 1, source: 'Evidence issue report', status: 'partial', incident: null,
    versions: {}, steps: [], repro: 'unknown', reasons: [] };
  let loaded, support, supportInput = false;
  try {
    // An invalid or dangling manifest must not fall back to a different source.
    try { fs.lstatSync(path.join(fromDir, 'manifest.json')); }
    catch (error) { if (error.code === 'ENOENT') supportInput = true; else throw error; }
    if (supportInput) support = readSupport(fromDir); else loaded = readManifest(fromDir);
  } catch { result.reasons.push(supportInput ? 'support-invalid' : 'manifest-invalid'); }
  if (support) {
    result.inputKind = 'support';
    result.support = { supportId: support.supportId, projectedAt: support.projectedAt, originalEvidenceVerified: false };
    result.incident = { incidentId: support.incidentId, captureStart: null, captureEnd: null, status: support.status };
    result.status = support.status; result.versions = support.versions; result.steps = support.steps;
    result.repro = support.steps.find(step => step.step === 'repro')?.status || 'unknown';
  }
  if (loaded) {
    const m = loaded.manifest;
    result.incident = projected(loaded);
    result.status = loaded.status === 'complete' ? 'complete' : 'partial';
    result.reasons = loaded.reasons.map(item => ({ step: item.step, code: item.code }));
    for (const field of ['toolVersion','gameVersion','loaderVersion']) {
      const value = version(m[field]);
      if (value) result.versions[field] = value;
    }
    if (version(m.app?.versionName)) result.versions.appVersion = version(m.app.versionName);
    for (const step of m.steps) {
      const label = loaded.journey ? step.type : step.name;
      result.steps.push({ step: label, status: step.status, ...(step.status !== 'completed' ? { reason: reason(step.reason) } : {}) });
      if (label === 'repro') result.repro = step.status;
    }
  }
  fs.writeFileSync(path.join(outDir, 'report.json'), JSON.stringify(result, null, 2), { flag: 'wx' });
  const lines = ['# Evidence issue report', '', `Status: ${result.status}`, '',
    `Incident: ${result.incident?.incidentId || 'unknown'}`,
    `Capture start: ${result.incident?.captureStart || 'unknown'}`,
    `Capture end: ${result.incident?.captureEnd || 'unknown'}`, '', '## Versions', ''];
  if (support) lines.splice(4, 0, 'Input: projected Support Bundle; original Evidence artifacts were not verified.',
    `Support projection time: ${support.projectedAt}`, '');
  for (const [field, value] of Object.entries(result.versions)) lines.push(`- ${field}: ${value}`);
  lines.push('', '## Steps', '');
  for (const step of result.steps) lines.push(`- ${step.step}: ${step.status}${step.reason ? ` (${step.reason})` : ''}`);
  lines.push('', 'Compatibility and performance conclusions require review of the underlying evidence.', '');
  fs.writeFileSync(path.join(outDir, 'report.md'), lines.join('\n'), { flag: 'wx' });
  return result;
}

function knownGood(fromDir, outDir, options = {}) {
  if (!options || typeof options !== 'object' || Array.isArray(options) ||
      Object.keys(options).some(key => !['label','snapshots'].includes(key)) ||
      options.snapshots !== undefined && (!Array.isArray(options.snapshots) || !options.snapshots.length || options.snapshots.length > 4 || new Set(options.snapshots).size !== options.snapshots.length || options.snapshots.some(kind=>!snapshotNames.includes(kind))) ||
      options.label !== undefined && (typeof options.label !== 'string' || options.label.length > 64 ||
        !/^[a-z0-9][a-z0-9-]*$/.test(options.label))) throw new Error('Invalid reference options');
  const loaded = readManifest(fromDir), origin = loaded.manifest;
  if (loaded.journey || loaded.status !== 'complete' || !timestamp(origin.captureEnd) ||
      origin.steps.some(step => step.required !== false && step.status !== 'completed')) throw new Error('Incomplete reference incident');
  if(origin.claim==='caller-selected reference; business acceptance unverified')throw Error('Source is already a reference');
  const selected = [];
  for (const [index, step] of origin.steps.entries()) {
    if (!snapshotNames.includes(step.name)) continue;
    if(options.snapshots && !options.snapshots.includes(step.name))continue;
    const value = envelope(loaded, index);
    if (!value || !timestamp(value.capturedAt)) throw new Error('Invalid reference snapshot');
    let data;
    try { data = projectSnapshot(step.name, value); }
    catch { throw new Error('Invalid or incomplete reference snapshot'); }
    selected.push({ name: step.name, capturedAt: value.capturedAt, data,
      captureStart: step.captureStart || origin.captureStart,
      captureEnd: step.captureEnd || origin.captureEnd });
  }
  if(options.snapshots && selected.length!==options.snapshots.length)throw Error('Requested reference snapshot missing');
  if (!selected.length) throw new Error('Reference needs a complete snapshot');
  const incidentId = randomUUID(), manifest = { schemaVersion: 1, incidentId,
    originIncidentId: origin.incidentId, toolVersion: require('../../package.json').version,
    profile: 'evidence', status: 'partial', captureStart: origin.captureStart, captureEnd: origin.captureEnd,
    integrations:[],privacy:{projection:'hashed identifiers and style strings; local reference',requiresManualReview:true},
    createdAt: new Date().toISOString(), claim: 'caller-selected reference; business acceptance unverified',
    selectedSnapshots:selected.map(item=>item.name),
    ...(options.label ? { label: options.label } : {}), steps: [] };
  fs.mkdirSync(path.resolve(outDir));
  try { for (const item of selected) {
    const filename = `${item.name}.json`;
    const body = JSON.stringify({ schemaVersion: 1, incidentId, source: item.name,
      capturedAt: item.capturedAt, projection: 'known-good-hashed', data: item.data }, null, 2);
    fs.writeFileSync(path.join(outDir, filename), body, { flag: 'wx' });
    manifest.steps.push({ name: item.name, source:'Caller-selected reference snapshot', status: 'completed', required: true,
      captureStart: item.captureStart, captureEnd: item.captureEnd,
      artifact: { filename, sha256: sha(body) } });
  } manifest.status='complete'; }
  finally {fs.writeFileSync(path.join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2), { flag: 'wx' });}
  return manifest;
}

function timelineReport(fromDir,outDir){
  const loaded=readManifest(fromDir),m=loaded.manifest,origin=Date.parse(m.captureStart),entries=[],unmapped=[];let omitted=0,sourceOmitted=0,sourceIncomplete=false;
  const result={schemaVersion:1,source:'Evidence time alignment',incidentId:m.incidentId,status:loaded.status==='complete'&&m.captureEnd?'complete':'partial',hostOrigin:m.captureStart,entries,unmapped,
    orderingDoesNotProveCausation:true,deviceClockMapping:'estimated only; native frame timestamps not reconstructed',reasons:loaded.reasons};
  const numeric=n=>Number.isFinite(n)&&n>=0;
  const offset=Number.isFinite(m.device?.clockOffsetMs)&&Math.abs(m.device.clockOffsetMs)<=86400000?m.device.clockOffsetMs:null;
  const uncertainty=numeric(m.device?.clockUncertaintyMs)?m.device.clockUncertaintyMs:null;
  function unknown(value){if(unmapped.length<100)unmapped.push(value);else omitted++}
  function sourceLoss(count,truncated=false){if(Number.isSafeInteger(count)&&count>=0)sourceOmitted=Math.min(Number.MAX_SAFE_INTEGER,sourceOmitted+count);else sourceIncomplete=true;if(truncated)sourceIncomplete=true}
  function put(kind,unixMs,fields={},basis='host',errorMs=0){
    if(entries.length>=1000){omitted++;return}
    if(!Number.isFinite(unixMs)||Math.abs(unixMs-origin)>86400000){unknown({kind,...fields,reason:'clock-unavailable-or-out-of-window'});return}
    entries.push({kind,atMs:unixMs-origin,clockBasis:basis,uncertaintyMs:errorMs,...fields});
  }
  const types=['web-click','web-input','web-focus','tap','input','back','home','launch','restart','wake','rotate','wait','checkpoint'];
  for(const [index,step]of m.steps.entries()){
    if(step.captureStart)put(loaded.journey?'journey-step':'collector',Date.parse(step.captureStart),{stepIndex:index,type:loaded.journey&&types.includes(step.type)?step.type:'collection',phase:'start',status:step.status});
    if(step.captureEnd)put(loaded.journey?'journey-step':'collector',Date.parse(step.captureEnd),{stepIndex:index,type:loaded.journey&&types.includes(step.type)?step.type:'collection',phase:'end',status:step.status});
    const count=loaded.journey?Math.min(32,step.artifacts?.length||0):step.artifact?1:0;
    for(let slot=0;slot<count;slot++){
      const artifact=loaded.artifacts.get(`${index}:${slot}`);
      const name=loaded.journey?(artifact?.filename||step.artifacts[slot]?.filename||'').replace(/^step-\d+-/,'').replace(/\.json$/,''):step.name;
      const value=envelope(loaded,index,slot);
      if(!value){if(['timeline','console','network','gfxinfo','meminfo','performance','web-performance','leak-probe','performance-series','process-memory'].includes(name))unknown({stepIndex:index,slot,reason:'source-envelope-unavailable'});continue;}
      const data=value.data;
      if(name==='timeline'){
        if(data.source!=='timeline'||!Number.isInteger(data.durationMs)||data.durationMs<1||data.durationMs>10000||!Array.isArray(data.records)||data.records.length>500){unknown({stepIndex:index,reason:'timeline-format-unavailable'});continue}
        sourceLoss(data.dropped,data.truncated!==false);
        const start=data.clock?.targetStartUnixMs;
        for(const event of data.records){
          if(!['event','mutation','observer','error','unhandledrejection','longtask'].includes(event?.kind)||!numeric(event.atMs)||event.atMs>data.durationMs){omitted++;continue;}
          const fields={stepIndex:index,slot};let relative=event.atMs;
          if(event.kind==='longtask'){
            if(Number.isFinite(event.startMs)&&event.startMs>=-60000&&event.startMs<=data.durationMs&&numeric(event.durationMs)&&event.durationMs<=60000){relative=event.startMs;fields.durationMs=event.durationMs;fields.observedRelativeToCaptureMs=event.atMs;fields.timingBasis='reported task start; callback observation time separately'}
            else {if(numeric(event.durationMs)&&event.durationMs<=60000)fields.reportedDurationMs=event.durationMs;fields.timingBasis='callback observation only; task interval unavailable'}
          }
          if(['click','pointerdown','pointerup','input','change','focus','blur','submit'].includes(event.type))fields.eventType=event.type;
          if(numeric(start)&&offset!==null)put(event.kind,start+relative-offset,fields,'target clock adjusted by Android estimate',uncertainty);
          else unknown({kind:event.kind,...fields,relativeToCaptureMs:relative,reason:'target-clock-anchor-unavailable'});
        }
      }else if(name==='console'&&Array.isArray(data.events)){
        sourceLoss(data.omitted);
        omitted+=Math.max(0,data.events.length-200);
        for(const event of data.events.slice(0,200))if(['console','exception'].includes(event?.kind)){
          if(numeric(event.timestampMs)&&offset!==null)put('console',event.timestampMs-offset,{stepIndex:index,slot,eventKind:event.kind},'target clock adjusted by Android estimate',uncertainty);
          else unknown({kind:'console',stepIndex:index,slot,reason:'target-clock-anchor-unavailable'});
        }else omitted++;
      }else if(name==='network'&&Array.isArray(data.requests)){
        sourceLoss(data.omitted);
        omitted+=Math.max(0,data.requests.length-200);
        for(const event of data.requests.slice(0,200))if(event&&typeof event==='object'&&!Array.isArray(event)){
          const fields={stepIndex:index,slot};if(typeof event.failed==='boolean')fields.failed=event.failed;if(numeric(event.durationMs))fields.durationMs=event.durationMs;
          if(numeric(event.timestampSeconds)&&offset!==null)put('network',event.timestampSeconds*1000-offset,fields,'target clock adjusted by Android estimate',uncertainty);
          else unknown({kind:'network',stepIndex:index,slot,reason:'target-clock-anchor-unavailable'});
        }else omitted++;
      }else if(['gfxinfo','meminfo','performance','web-performance','leak-probe','performance-series','process-memory'].includes(name)){
        put('performance-observation',Date.parse(value.capturedAt),{stepIndex:index,slot,sampleType:name,basis:'capture time; accumulated metrics are not instantaneous events'});
      }else if(['console','network'].includes(name))unknown({stepIndex:index,slot,reason:'source-format-unavailable'});
    }
  }
  entries.sort((a,b)=>a.atMs-b.atMs);result.projectionOmitted=omitted;result.sourceOmitted=sourceOmitted;result.sourceCompletenessUnverified=sourceIncomplete;result.omitted=Math.min(Number.MAX_SAFE_INTEGER,omitted+sourceOmitted);
  if(omitted||sourceOmitted||sourceIncomplete||unmapped.length)result.status='partial';
  const out=path.resolve(outDir);fs.mkdirSync(out);fs.writeFileSync(path.join(out,'timeline.json'),JSON.stringify(result,null,2),{flag:'wx'});return result;
}
module.exports = { compare, report, readManifest, knownGood, timelineReport };
