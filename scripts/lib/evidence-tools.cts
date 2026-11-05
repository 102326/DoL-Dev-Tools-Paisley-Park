interface TimelineView {source?:unknown;durationMs?:unknown;records?:unknown;dropped?:unknown;truncated?:unknown;clock?:{targetStartUnixMs?:unknown}}
interface TimelineEvent {kind?:unknown;atMs?:unknown;startMs?:unknown;durationMs?:unknown;type?:unknown}
interface ConsoleView {events?:unknown;omitted?:unknown}
interface ConsoleEvent {kind?:unknown;timestampMs?:unknown}
interface NetworkView {requests?:unknown;omitted?:unknown}
interface NetworkEvent {failed?:unknown;durationMs?:unknown;timestampSeconds?:unknown}
interface TimelineEntry {kind:unknown;atMs:number;clockBasis:string;uncertaintyMs:unknown;[key:string]:unknown}
interface TimelineResult {schemaVersion:number;source:string;incidentId:unknown;status:string;hostOrigin:unknown;entries:TimelineEntry[];unmapped:unknown[];orderingDoesNotProveCausation:boolean;deviceClockMapping:string;reasons:{step:number;code:string}[];projectionOmitted?:number;sourceOmitted?:number;sourceCompletenessUnverified?:boolean;omitted?:number}
interface SupportView {schemaVersion?:unknown;incidentId?:unknown;supportId?:unknown;toolVersion?:unknown;source?:unknown;capturedAt?:unknown;status?:unknown;versions?:unknown;device?:unknown;compatibility?:unknown;steps?:unknown;privacy?:unknown}
interface SupportStepView {name?:unknown;status?:unknown;required?:unknown;supportProjection?:unknown}
interface SupportVersionsView {gameVersion?:unknown;loaderVersion?:unknown;gameVersionSources?:Record<string,unknown>;app?:{versionName?:unknown;versionCode?:unknown};[key:string]:unknown}
interface ReportStep {step:unknown;status:unknown;reason?:unknown;required?:unknown}
interface ReportResult {schemaVersion:number;source:string;status:unknown;incident:ReturnType<typeof projected>|null;versions:Record<string,unknown>;steps:ReportStep[];repro:unknown;reasons:unknown[];inputKind?:string;support?:Record<string,unknown>}
// These describe accessed fields only. JSON input begins as unknown and existing checks establish facts.
interface ArtifactView {filename?:unknown;sha256?:unknown}
interface StepView {name?:unknown;type?:unknown;status?:unknown;captureStart?:unknown;captureEnd?:unknown;required?:unknown;reason?:unknown;capture?:unknown;artifact?:unknown;artifacts?:unknown}
interface ManifestInput {schemaVersion?:unknown;incidentId?:unknown;status?:unknown;captureStart?:unknown;captureEnd?:unknown;toolVersion?:unknown;source?:unknown;steps?:unknown;claim?:unknown;app?:{versionName?:unknown};gameVersionSources?:Record<string,unknown>;device?:{clockOffsetMs?:unknown;clockUncertaintyMs?:unknown};[key:string]:unknown}
interface VerifiedArtifact {filename:string;sha256:string;file:string}
interface EnvelopeView {schemaVersion?:unknown;incidentId?:unknown;data?:unknown;capturedAt?:unknown;projection?:unknown}
interface Comparison {step:unknown;status:string;changes?:unknown;[key:string]:unknown}
interface CompareResult {schemaVersion:number;source:string;status:string;before:ReturnType<typeof projected>|null;after:ReturnType<typeof projected>|null;steps:Record<string,unknown>[];artifacts:Record<string,unknown>[];comparisons:Comparison[];reasons:Record<string,unknown>[];automaticTestVerdict?:string;conditionsVerified?:boolean}
interface StepEntry {step:StepView;i:number}
interface Loaded {manifest:ManifestInput & {steps:StepView[]};artifacts:Map<string,VerifiedArtifact>;status:unknown;reasons:{step:number;code:string}[];journey:boolean}
const fs:typeof import('node:fs') = require('node:fs');
const path:typeof import('node:path') = require('node:path');
const { createHash, randomUUID }:typeof import('node:crypto') = require('node:crypto');
const dom = require('./dom.cjs') as typeof import('./dom.cjs');
const css = require('./css.cjs') as typeof import('./css.cjs');
const environment = require('./environment.cjs') as typeof import('./environment.cjs');
const { storageDiff } = require('./inspectors.cjs') as typeof import('./inspectors.cjs');
const lifecycle = require('./app-lifecycle.cjs') as typeof import('./app-lifecycle.cjs');

const sha = (value:string|Buffer) => createHash('sha256').update(value).digest('hex');
const uuid = (value:unknown) => typeof value === 'string' && /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value);
const timestamp = (value:unknown) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(value) && Number.isFinite(Date.parse(value));
const name = (value:unknown) => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
const filename = (value:unknown) => typeof value === 'string' && value.length <= 128 && /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value) && path.basename(value) === value;
const status = (value:unknown) => ['complete', 'partial', 'failed', 'planned'].includes(value as string);
const stepStatus = (value:unknown) => ['completed', 'failed', 'skipped', 'unsupported', 'planned'].includes(value as string);
const version = (value:unknown) => typeof value === 'string' && /^[0-9A-Za-z._()+-]{1,64}$/.test(value) ? value : null;
const reason = (value:unknown) => ['timeout','collector-error','device-check-failed','app-check-failed','verified-webview-unavailable',
  'cdp-unavailable','no-scope-requested','deadline-or-command-timeout','step-failed','restore-failed-or-conflict',
  'unavailable','unsupported','failed','ENOENT','EACCES','ENOSPC','EEXIST'].includes(value as string) ? value : 'generic';
const snapshotNames = ['dom-contract','css-contract','environment','storage'];

function projectSnapshot(kind:string, value:unknown) {
  const data = (value as {data?:unknown}|null|undefined)?.data ?? value;
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid reference snapshot');
  if (kind === 'dom-contract') {
    dom.contract(data);
    const d=data as ReturnType<typeof dom.contract>;
    if (d.source !== 'DOM' || d.truncated !== false || !/^[a-f0-9]{64}$/.test((d.scopeHash || '') as string) || !d.nodes.length) throw Error('Incomplete reference snapshot');
    const nodes = d.nodes.map(raw => {
      const node=raw as typeof raw & {tag?:unknown;id?:unknown;class?:unknown;data?:unknown;hidden?:unknown;childCount?:unknown;parent?:unknown};
      if (!node || typeof node.tag !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(node.tag) ||
          typeof node.id !== 'string' || node.id.length > 128 || !Array.isArray(node.class) || node.class.length > 32 ||
          node.class.some((item:unknown) => typeof item !== 'string' || item.length > 128) ||
          !Array.isArray(node.data) || node.data.length > 32 || node.data.some((item:unknown) => typeof item !== 'string' || item.length > 128) ||
          typeof node.hidden !== 'boolean' || !Number.isSafeInteger(node.childCount) || (node.childCount as number) < 0 ||
          node.parent !== (node.address === '0' ? null : node.address.slice(0, node.address.lastIndexOf('/')))) throw Error('Invalid reference snapshot');
      return { address: node.address, parent: node.parent, tag: node.tag, id: sha(node.id),
        class: (node.class as string[]).map(sha), data: (node.data as string[]).map(sha), hidden: node.hidden, childCount: node.childCount };
    });
    return { schemaVersion: 1, source: 'DOM', scopeHash: d.scopeHash, nodes, truncated: false };
  }
  if (kind === 'css-contract') {
    css.contract(data);
    const d=data as ReturnType<typeof css.contract>;
    if (d.truncated || !/^[a-f0-9]{64}$/.test((d.scopeHash || '') as string) || !d.nodes.length) throw Error('Incomplete reference snapshot');
    const nodes = d.nodes.map(node => ({ address: node.address, parent: node.parent, tag: node.tag,
      id: sha(node.id), class: node.class.map(sha), childCount: node.childCount,
      style: Object.fromEntries(Object.entries(node.style).map(([key, val]) => [key, sha(val as string)])),
      rect: { x: node.rect.x, y: node.rect.y, width: node.rect.width, height: node.rect.height } }));
    const projected = { schemaVersion: 1, source: 'CSS', scopeHash: d.scopeHash, nodes, truncated: false };
    css.contract(projected);
    return projected;
  }
  if (kind === 'environment') {
    const parsed = environment.contract(data);
    if (parsed.incomplete || (data as {incomplete?:unknown}).incomplete === true) throw Error('Incomplete reference snapshot');
    const fields = parsed.fields, group = (name:string, keys:string[]) => Object.fromEntries(keys.map(key => [key, fields[`${name}.${key}`]]));
    const projected = { schemaVersion: 1, source: parsed.host === 'chrome' ? 'Chrome environment' : 'Environment',
      ...(parsed.host === 'chrome' ? { browser: group('browser', ['product','protocolVersion','jsVersion']) } : {
        device: group('device', ['model','androidVersion']),
        app: group('app', ['package','versionName','versionCode','foregroundMatches']),
        provider: group('provider', ['status','package','version']),
        webview: group('webview', ['product','protocolVersion','jsVersion']) }),
      runtime: { ...group('runtime', ['gameVersion','loaderVersion']),
        gameVersionSources: group('runtime.gameVersionSources', ['startConfig','gameVersionMod']),
        viewport: group('runtime.viewport', ['width','height','devicePixelRatio']),
        capabilities: group('runtime.capabilities', ['modList','performanceObserver','mutationObserver','indexedDB']),
        mods: { status: 'available', truncated: false, unreadable: 0,
          items: parsed.mods.map(item => ({ name: sha(item.name as string), version: item.version,
            reportedIndex: item.reportedIndex, enabled: null, loadOrder: null })) } }, incomplete: false };
    for (const [part, key] of [['device','model'],['app','package'],['provider','package']])
      if ((projected as unknown as Record<string,Record<string,string>>)[part]?.[key]) (projected as unknown as Record<string,Record<string,string>>)[part][key] = sha((projected as unknown as Record<string,Record<string,string>>)[part][key]);
    environment.contract(projected);
    return projected;
  }
  if (kind === 'storage') {
    if (storageDiff(data, data).incomplete) throw Error('Incomplete reference snapshot');
    const storage=data as unknown as {local:import('./browser/inspectors.cjs').StorageSection;session:import('./browser/inspectors.cjs').StorageSection;indexedDB:import('./browser/inspectors.cjs').IndexedSection};
    const section = (item:import('./browser/inspectors.cjs').StorageSection) => ({ status: item.status, count: item.count, omitted: item.omitted,
      keys: item.keys.map(key => ({ hash: key.hash })) });
    const projected = { schemaVersion: 1, source: 'storage', local: section(storage.local), session: section(storage.session),
      indexedDB: { status: storage.indexedDB.status, omitted: storage.indexedDB.omitted,
        databases: storage.indexedDB.databases.map(db => ({ nameHash: db.nameHash, version: db.version,
          status: db.status, omitted: db.omitted,
          stores: db.stores.map(store => ({ nameHash: store.nameHash, count: store.count, status: store.status })) })) } };
    storageDiff(projected, projected);
    return projected;
  }
  throw Error('Invalid reference snapshot');
}

function readManifest(dir:string) {
  let base:string, manifest:ManifestInput;
  try {
    base = fs.realpathSync(dir);
    const file = fs.realpathSync(path.join(base, 'manifest.json'));
    if (path.dirname(file) !== base || fs.statSync(file).size > 1024 * 1024) throw Error();
    manifest = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown as ManifestInput;
  } catch { throw new Error('Invalid evidence manifest'); }
  if (!manifest || manifest.schemaVersion !== 1 || !uuid(manifest.incidentId) || !status(manifest.status) ||
      !timestamp(manifest.captureStart) || manifest.captureEnd !== undefined && !timestamp(manifest.captureEnd) ||
      !version(manifest.toolVersion) || manifest.source !== undefined && !['Journey plan','Journey execution'].includes(manifest.source as string) ||
      !Array.isArray(manifest.steps) || manifest.steps.length > 100) throw new Error('Invalid evidence manifest');
  const journey = manifest.source === 'Journey plan' || manifest.source === 'Journey execution';
  const artifacts = new Map<string,VerifiedArtifact>(), reasons:{step:number;code:string}[] = [], seen = new Set<string>();
  const addReason = (step:number, code:string) => { if (reasons.length < 100) reasons.push({ step, code }); };
  let artifactCount = 0, verifiedBytes = 0;
  const stepNames = new Set<unknown>();
  for (const [index, rawStep] of (manifest.steps as unknown[]).entries()) {
    const step=rawStep as StepView;
    if (!step || typeof step !== 'object' || Array.isArray(step) || !stepStatus(step.status) ||
        !(journey ? typeof step.type === 'string' && /^[a-z-]{1,32}$/.test(step.type) : name(step.name)) ||
        step.captureStart !== undefined && !timestamp(step.captureStart) ||
        step.captureEnd !== undefined && !timestamp(step.captureEnd) ||
        step.required !== undefined && typeof step.required !== 'boolean') throw new Error('Invalid evidence manifest');
    if (!journey && stepNames.has(step.name)) throw Error('Invalid evidence manifest');
    if (!journey) stepNames.add(step.name);
    const entries = journey ? step.artifacts : step.artifact ? [step.artifact] : [];
    if (step.status === 'completed' && !journey && (entries as unknown[]).length === 0) addReason(index, 'artifact-missing');
    if (entries === undefined) continue;
    if (!Array.isArray(entries) || entries.length > 32) { addReason(index, 'artifact-invalid'); continue; }
    for (const [slot, rawItem] of (entries as unknown[]).entries()) {
      const item=rawItem as ArtifactView;
      if (++artifactCount > 200) { addReason(index, 'artifact-limit'); continue; }
      if (!item || !filename(item.filename) || !/^[a-f0-9]{64}$/.test((item.sha256 || '') as string)) {
        addReason(index, 'artifact-invalid'); continue;
      }
      if (seen.has(item.filename as string)) { addReason(index, 'artifact-duplicate'); continue; }
      seen.add(item.filename as string);
      let file;
      try { file = fs.realpathSync(path.join(base, item.filename as string)); }
      catch { addReason(index, 'artifact-missing'); continue; }
      try {
        if (path.dirname(file) !== base) { addReason(index, 'artifact-outside'); continue; }
        const stat = fs.statSync(file);
        if (!stat.isFile() || stat.size > 8 * 1024 * 1024) { addReason(index, 'artifact-invalid'); continue; }
        if (verifiedBytes + stat.size > 32 * 1024 * 1024) { addReason(index, 'artifact-limit'); continue; }
        verifiedBytes += stat.size;
        const raw = fs.readFileSync(file);
        if (sha(raw) !== item.sha256) { addReason(index, 'artifact-checksum'); continue; }
        if ((item.filename as string).endsWith('.json')) {
          let envelope;
          try { envelope = JSON.parse(raw as unknown as string) as unknown as {schemaVersion?:unknown;incidentId?:unknown}; } catch { addReason(index, 'artifact-invalid'); continue; }
          if (envelope?.schemaVersion !== 1 || envelope.incidentId !== manifest.incidentId) {
            addReason(index, 'artifact-invalid'); continue;
          }
        }
      } catch { addReason(index, 'artifact-invalid'); continue; }
      artifacts.set(`${index}:${slot}`, { filename: item.filename as string, sha256: item.sha256 as string, file });
    }
  }
  return { manifest:manifest as ManifestInput & {steps:StepView[]}, artifacts, status: reasons.length ? 'partial' : manifest.status, reasons, journey };
}

function envelope(loaded:Loaded, index:number, slot = 0) {
  const item = loaded.artifacts.get(`${index}:${slot}`);
  if (!item || !(item.filename as string).endsWith('.json')) return null;
  try {
    const raw=fs.readFileSync(item.file);
    if(raw.length>8*1024*1024||sha(raw)!==item.sha256)return null;
    const value = JSON.parse(raw.toString('utf8')) as unknown as EnvelopeView|null;
    return value?.schemaVersion === 1 && value.incidentId === loaded.manifest.incidentId &&
      value.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value : null;
  } catch { return null; }
}

function projected(loaded:Loaded) {
  const m = loaded.manifest;
  return { incidentId: m.incidentId, captureStart: m.captureStart, captureEnd: timestamp(m.captureEnd) ? m.captureEnd : null,
    status: loaded.status };
}

function compareLifecycle(x:unknown, y:unknown, fields:Record<string,unknown> = {}) {
  try {
    if (!x || !y) throw Error('Lifecycle evidence unavailable');
    const diff = lifecycle.diff(x, y);
    return { step: 'app-lifecycle', ...fields, status: diff.incomplete ? 'unknown' : 'available', ...diff };
  } catch { return { step: 'app-lifecycle', ...fields, status: 'unknown' }; }
}

function compare(beforeDir:string, afterDir:string, outDir:string) {
  fs.mkdirSync(path.resolve(outDir));
  const result:CompareResult = { schemaVersion: 1, source: 'Evidence comparison', status: 'partial', before: null, after: null,
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
    const old = new Map(before.manifest.steps.map((step, i) => [(before.journey ? `${i}:${step.type}` : step.name) as string, { step, i }]));
    const current = new Map(after.manifest.steps.map((step, i) => [(after.journey ? `${i}:${step.type}` : step.name) as string, { step, i }]));
    for (const key of new Set([...old.keys(), ...current.keys()])) {
      const left = old.get(key), right = current.get(key);
      const label = left ? (before.journey ? left.step.type : left.step.name) : (after.journey ? right!.step.type : right!.step.name);
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
        const requested = (entry:StepEntry|undefined) => entry?.step.type === 'checkpoint' && Array.isArray(entry.step.capture) && entry.step.capture.includes('app-lifecycle');
        if (requested(left) || requested(right)) {
          const snapshot = (loaded:Loaded, entry:StepEntry|undefined) => {
            if (!requested(entry) || entry!.step.status !== 'completed') return null;
            const slot = (entry!.step.artifacts as ArtifactView[]|undefined)?.findIndex(item => item?.filename === `step-${entry!.i}-app-lifecycle.json`);
            return Number.isInteger(slot) && (slot as number) >= 0 && (slot as number) < 32 ? envelope(loaded, entry!.i, slot as number) : null;
          };
          result.comparisons.push(compareLifecycle(snapshot(before, left), snapshot(after, right), { stepIndex: left?.i ?? right!.i }));
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
        let comparison:Comparison = { step: key, status: 'unknown' };
        if (x && y) try {
          const source = ({ 'dom-contract': dom.diff, 'css-contract': css.diff,
            environment: environment.diff, storage: storageDiff } as Record<string,(a:unknown,b:unknown)=>{incomplete:boolean;changes:unknown[]}>)[key];
          let first:unknown = x, second:unknown = y;
          const reference = 'caller-selected reference; business acceptance unverified';
          if (before.manifest.claim === reference && x.projection === 'known-good-hashed' && after.manifest.claim !== reference)
            second = { data: projectSnapshot(key, y) };
          if (after.manifest.claim === reference && y.projection === 'known-good-hashed' && before.manifest.claim !== reference)
            first = { data: projectSnapshot(key, x) };
          const diff = source(first, second);
          if (!diff.incomplete) {
            comparison = { step: key, status: 'available', changes: key === 'environment'
              ? diff.changes.map(raw => { const change=raw as {field?:unknown;mod?:unknown;kind?:unknown;fields?:unknown}; return ({ ...(change.field ? { field: change.field } : {}),
                ...(change.mod ? { modHash: sha(change.mod as string) } : {}), ...(change.kind ? { kind: change.kind } : {}),
                ...(change.fields ? { fields: change.fields } : {}) }); }) : diff.changes };
          }
        } catch { /* Unsupported or malformed snapshot remains unknown. */ }
        result.comparisons.push(comparison);
      } else if (['gfxinfo','meminfo'].includes(key)) {
        const x = envelope(before, left.i)?.data as Record<string,unknown>|undefined, y = envelope(after, right.i)?.data as Record<string,unknown>|undefined;
        const fields = key === 'gfxinfo' ? ['totalFrames','jankyFrames','sampledFrames','medianMs','p95Ms'] : ['pssKb','rssKb'];
        const changes = [];
        let valid = 0;
        for (const field of fields) if (Number.isFinite(x?.[field]) && (x![field] as number)>=0 && Number.isFinite(y?.[field]) && (y![field] as number)>=0) {
          valid++;
          if (x![field] !== y![field]) changes.push({ field, before: x![field], after: y![field] });
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

function readSupport(fromDir:string) {
  let data:SupportView;
  try {
    const base = fs.realpathSync(fromDir), file = fs.realpathSync(path.join(base, 'support.json'));
    const stat = fs.statSync(file);
    if (path.dirname(file) !== base || !stat.isFile() || stat.size > 1024 * 1024) throw Error();
    data = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown as SupportView;
  } catch { throw Error('Invalid support bundle'); }
  const object = (value:unknown) => value && typeof value === 'object' && !Array.isArray(value);
  if (!object(data) || data.schemaVersion !== 1 || !uuid(data.incidentId) || !uuid(data.supportId) ||
      !version(data.toolVersion) || data.source !== 'projected local Evidence Bundle' || !timestamp(data.capturedAt) ||
      !['complete','partial'].includes(data.status as string) || !object(data.versions) || !object(data.device) ||
      !Array.isArray(data.compatibility) || data.compatibility.length > 100 || !Array.isArray(data.steps) || data.steps.length > 100 ||
      !object(data.privacy) || typeof (data.privacy as {screenshotIncluded?:unknown}).screenshotIncluded !== 'boolean' || (data.privacy as {requiresManualReview?:unknown}).requiresManualReview !== true)
    throw Error('Invalid support bundle');
  const rawVersions=data.versions as SupportVersionsView;
  const versions:Record<string,unknown> = { toolVersion: data.toolVersion }, seen = new Set<unknown>();
  const addVersion = (field:string, value:unknown) => {
    if (value !== undefined && value !== null && (typeof value !== 'string' || value.length > 64)) throw Error('Invalid support version');
    if (version(value)) versions[field] = value;
  };
  for (const field of ['gameVersion','loaderVersion']) addVersion(field, rawVersions[field]);
  if (rawVersions.gameVersionSources !== undefined) {
    if (!object(rawVersions.gameVersionSources)) throw Error('Invalid support version sources');
    for (const source of ['startConfig','gameVersionMod']) addVersion(source+'Version',rawVersions.gameVersionSources[source]);
  }
  if (rawVersions.app !== undefined) {
    if (!object(rawVersions.app)) throw Error('Invalid support version');
    addVersion('appVersion', rawVersions.app.versionName);
    addVersion('appVersionCode', rawVersions.app.versionCode);
  }
  const steps = (data.steps as unknown[]).map(raw => {
    const step=raw as SupportStepView;
    if (!object(step) || !name(step.name) || seen.has(step.name) ||
        !['completed','failed','skipped','unsupported','unknown'].includes(step.status as string) ||
        step.required !== undefined && step.required !== null && typeof step.required !== 'boolean' ||
        step.supportProjection !== undefined && step.supportProjection !== 'failed') throw Error('Invalid support step');
    seen.add(step.name);
    return { step: step.name, status: step.status, required: step.required ?? null,
      ...(step.supportProjection === 'failed' ? { reason: 'support-projection-failed' } : step.status !== 'completed' ? { reason: 'generic' } : {}) };
  });
  const incomplete = (step:ReportStep) => step.reason === 'support-projection-failed' ||
    !/^integration-\d+$/.test(step.step as string) && step.status !== 'completed' &&
    (step.required === true || step.required !== false && (step.status === 'unknown' || ['device','app','app-lifecycle'].includes(step.step as string)));
  return { incidentId: data.incidentId, supportId: data.supportId, projectedAt: data.capturedAt, versions, steps,
    status: data.status === 'partial' || steps.some(incomplete) ? 'partial' : 'complete' };
}

function report(fromDir:string, outDir:string) {
  fs.mkdirSync(path.resolve(outDir));
  const result:ReportResult = { schemaVersion: 1, source: 'Evidence issue report', status: 'partial', incident: null,
    versions: {}, steps: [], repro: 'unknown', reasons: [] };
  let loaded, support, supportInput = false;
  try {
    // An invalid or dangling manifest must not fall back to a different source.
    try { fs.lstatSync(path.join(fromDir, 'manifest.json')); }
    catch (error) { if ((error as {code?:unknown}).code === 'ENOENT') supportInput = true; else throw error; }
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
    if (version(m.app?.versionName)) result.versions.appVersion = version(m.app!.versionName);
    for (const source of ['startConfig','gameVersionMod']) {
      const value=version(m.gameVersionSources?.[source]);if(value)result.versions[source+'Version']=value;
    }
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

function knownGood(fromDir:string, outDir:string, options:{label?:string;snapshots?:string[]} = {}) {
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
    if (!snapshotNames.includes(step.name as string)) continue;
    if(options.snapshots && !options.snapshots.includes(step.name as string))continue;
    const value = envelope(loaded, index);
    if (!value || !timestamp(value.capturedAt)) throw new Error('Invalid reference snapshot');
    let data;
    try { data = projectSnapshot(step.name as string, value); }
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
    ...(options.label ? { label: options.label } : {}), steps: [] as Record<string,unknown>[] };
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

function timelineReport(fromDir:string,outDir:string){
  const loaded=readManifest(fromDir),m=loaded.manifest,origin=Date.parse(m.captureStart as string),entries:TimelineEntry[]=[],unmapped:unknown[]=[];let omitted=0,sourceOmitted=0,sourceIncomplete=false;
  const result:TimelineResult={schemaVersion:1,source:'Evidence time alignment',incidentId:m.incidentId,status:loaded.status==='complete'&&m.captureEnd?'complete':'partial',hostOrigin:m.captureStart,entries,unmapped,
    orderingDoesNotProveCausation:true,deviceClockMapping:'estimated only; native frame timestamps not reconstructed',reasons:loaded.reasons};
  const numeric=(n:unknown):n is number=>Number.isFinite(n)&&(n as number)>=0;
  const offset=Number.isFinite(m.device?.clockOffsetMs)&&Math.abs(m.device!.clockOffsetMs as number)<=86400000?m.device!.clockOffsetMs as number:null;
  const uncertainty=numeric(m.device?.clockUncertaintyMs)?m.device!.clockUncertaintyMs as number:null;
  function unknown(value:unknown){if(unmapped.length<100)unmapped.push(value);else omitted++}
  function sourceLoss(count:unknown,truncated=false){if(Number.isSafeInteger(count)&&(count as number)>=0)sourceOmitted=Math.min(Number.MAX_SAFE_INTEGER,sourceOmitted+(count as number));else sourceIncomplete=true;if(truncated)sourceIncomplete=true}
  function put(kind:unknown,unixMs:number,fields:Record<string,unknown>={},basis='host',errorMs:number|null=0){
    if(entries.length>=1000){omitted++;return}
    if(!Number.isFinite(unixMs)||Math.abs(unixMs-origin)>86400000){unknown({kind,...fields,reason:'clock-unavailable-or-out-of-window'});return}
    entries.push({kind,atMs:unixMs-origin,clockBasis:basis,uncertaintyMs:errorMs,...fields});
  }
  const types=['web-click','web-input','web-focus','tap','input','back','home','launch','restart','wake','rotate','wait','checkpoint'];
  for(const [index,step]of m.steps.entries()){
    if(step.captureStart)put(loaded.journey?'journey-step':'collector',Date.parse(step.captureStart as string),{stepIndex:index,type:loaded.journey&&types.includes(step.type as string)?step.type:'collection',phase:'start',status:step.status});
    if(step.captureEnd)put(loaded.journey?'journey-step':'collector',Date.parse(step.captureEnd as string),{stepIndex:index,type:loaded.journey&&types.includes(step.type as string)?step.type:'collection',phase:'end',status:step.status});
    const count=loaded.journey?Math.min(32,(step.artifacts as {length?:number}|undefined)?.length||0):step.artifact?1:0;
    for(let slot=0;slot<count;slot++){
      const artifact=loaded.artifacts.get(`${index}:${slot}`);
      const name=loaded.journey?((artifact?.filename||(step.artifacts as ArtifactView[])[slot]?.filename||'') as string).replace(/^step-\d+-/,'').replace(/\.json$/,''):step.name;
      const value=envelope(loaded,index,slot);
      if(!value){if(['timeline','console','network','gfxinfo','meminfo','performance','web-performance','leak-probe','performance-series','process-memory'].includes(name as string))unknown({stepIndex:index,slot,reason:'source-envelope-unavailable'});continue;}
      const data=value.data;
      if(name==='timeline'){
        const timeline=data as TimelineView;
        if(timeline.source!=='timeline'||!Number.isInteger(timeline.durationMs)||(timeline.durationMs as number)<1||(timeline.durationMs as number)>10000||!Array.isArray(timeline.records)||timeline.records.length>500){unknown({stepIndex:index,reason:'timeline-format-unavailable'});continue}
        sourceLoss(timeline.dropped,timeline.truncated!==false);
        const start=timeline.clock?.targetStartUnixMs;
        for(const event of timeline.records as (TimelineEvent|null)[]){
          if(!['event','mutation','observer','error','unhandledrejection','longtask'].includes(event?.kind as string)||!numeric(event!.atMs)||(event!.atMs as number)>(timeline.durationMs as number)){omitted++;continue;}
          const fields:Record<string,unknown>={stepIndex:index,slot};let relative=event!.atMs as number;
          if(event!.kind==='longtask'){
            if(Number.isFinite(event!.startMs)&&(event!.startMs as number)>=-60000&&(event!.startMs as number)<=(timeline.durationMs as number)&&numeric(event!.durationMs)&&event!.durationMs<=60000){relative=event!.startMs as number;fields.durationMs=event!.durationMs;fields.observedRelativeToCaptureMs=event!.atMs;fields.timingBasis='reported task start; callback observation time separately'}
            else {if(numeric(event!.durationMs)&&event!.durationMs<=60000)fields.reportedDurationMs=event!.durationMs;fields.timingBasis='callback observation only; task interval unavailable'}
          }
          if(['click','pointerdown','pointerup','input','change','focus','blur','submit'].includes(event!.type as string))fields.eventType=event!.type;
          if(numeric(start)&&offset!==null)put(event!.kind,start+relative-offset,fields,'target clock adjusted by Android estimate',uncertainty);
          else unknown({kind:event!.kind,...fields,relativeToCaptureMs:relative,reason:'target-clock-anchor-unavailable'});
        }
      }else if(name==='console'&&Array.isArray((data as ConsoleView).events)){
        const consoleData=data as ConsoleView & {events:unknown[]};
        sourceLoss(consoleData.omitted);
        omitted+=Math.max(0,consoleData.events.length-200);
        for(const event of consoleData.events.slice(0,200) as (ConsoleEvent|null)[])if(['console','exception'].includes(event?.kind as string)){
          if(numeric(event!.timestampMs)&&offset!==null)put('console',(event!.timestampMs as number)-offset,{stepIndex:index,slot,eventKind:event!.kind},'target clock adjusted by Android estimate',uncertainty);
          else unknown({kind:'console',stepIndex:index,slot,reason:'target-clock-anchor-unavailable'});
        }else omitted++;
      }else if(name==='network'&&Array.isArray((data as NetworkView).requests)){
        const networkData=data as NetworkView & {requests:unknown[]};
        sourceLoss(networkData.omitted);
        omitted+=Math.max(0,networkData.requests.length-200);
        for(const event of networkData.requests.slice(0,200) as (NetworkEvent|null)[])if(event&&typeof event==='object'&&!Array.isArray(event)){
          const fields:Record<string,unknown>={stepIndex:index,slot};if(typeof event.failed==='boolean')fields.failed=event.failed;if(numeric(event.durationMs))fields.durationMs=event.durationMs;
          if(numeric(event.timestampSeconds)&&offset!==null)put('network',event.timestampSeconds*1000-offset,fields,'target clock adjusted by Android estimate',uncertainty);
          else unknown({kind:'network',stepIndex:index,slot,reason:'target-clock-anchor-unavailable'});
        }else omitted++;
      }else if(['gfxinfo','meminfo','performance','web-performance','leak-probe','performance-series','process-memory'].includes(name as string)){
        put('performance-observation',Date.parse(value.capturedAt as string),{stepIndex:index,slot,sampleType:name,basis:'capture time; accumulated metrics are not instantaneous events'});
      }else if(['console','network'].includes(name as string))unknown({stepIndex:index,slot,reason:'source-format-unavailable'});
    }
  }
  entries.sort((a,b)=>a.atMs-b.atMs);result.projectionOmitted=omitted;result.sourceOmitted=sourceOmitted;result.sourceCompletenessUnverified=sourceIncomplete;result.omitted=Math.min(Number.MAX_SAFE_INTEGER,omitted+sourceOmitted);
  if(omitted||sourceOmitted||sourceIncomplete||unmapped.length)result.status='partial';
  const out=path.resolve(outDir);fs.mkdirSync(out);fs.writeFileSync(path.join(out,'timeline.json'),JSON.stringify(result,null,2),{flag:'wx'});return result;
}
export = { compare, report, readManifest, knownGood, timelineReport };
