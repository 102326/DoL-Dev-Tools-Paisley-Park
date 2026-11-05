import type privacy from './privacy.cjs';
interface StepView {name?:unknown;status?:unknown;required?:unknown;artifact?:{sha256?:unknown}}
interface Step {name:string;status:string;required:boolean|null;supportProjection?:'failed'}
interface Report {schemaVersion:number;incidentId:unknown;supportId:string;toolVersion:unknown;source:string;capturedAt:string;status:'partial'|'complete';versions:Record<string,unknown>;device:unknown;compatibility:unknown[];steps:Step[];privacy:{screenshotIncluded:boolean;requiresManualReview:true};console?:unknown;logcat?:unknown}
interface DataView {androidVersion?:unknown;versionName?:unknown;versionCode?:unknown;gameVersion?:unknown;loaderVersion?:unknown;gameVersionSources?:unknown;events?:unknown;omitted?:unknown;count?:unknown;status?:unknown;adapters?:unknown}
interface EventView {kind?:unknown;level?:unknown;timestampMs?:unknown}
interface AdapterView {match?:unknown;degraded?:unknown}
interface IntegrationView {index?:unknown;name?:unknown;version?:unknown}
const fs:typeof import('node:fs')=require('node:fs');
const path:typeof import('node:path')=require('node:path');
const {createHash,randomUUID}:typeof import('node:crypto')=require('node:crypto');
const {redact}:typeof import('./privacy.cjs')=require('./privacy.cjs');
const { version } = require('../../package.json');
function reproduction(filename:string) {
  if (fs.statSync(filename).size > 65536) throw new Error('Reproduction note too large');
  const raw:unknown=JSON.parse(fs.readFileSync(filename,'utf8'));
  const input=raw as Record<string,unknown>|null|undefined;
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid reproduction note');
  const result:Record<string,unknown> = {};
  for (const field of ['summary','expected','actual','note']) {
    if (input[field] !== undefined && typeof input[field] !== 'string') throw new Error('Reproduction fields must be text');
    if (input[field] !== undefined) result[field] = input[field];
  }
  if (input.steps !== undefined && (!Array.isArray(input.steps) || input.steps.length > 20 || input.steps.some(s => typeof s !== 'string'))) throw new Error('Invalid reproduction steps');
  result.steps = input.steps || [];
  return { ...redact(result) as object|null|undefined, source: 'User note', requiresPrivacyReview: true };
}
function support(from:string, out:string, includeScreenshot = false) {
  const base = fs.realpathSync(from);
  function read(name:string, max = 1024 * 1024) {
    const filename = fs.realpathSync(path.join(base, name));
    if (path.dirname(filename) !== base || fs.statSync(filename).size > max) throw new Error('Invalid evidence artifact');
    return fs.readFileSync(filename);
  }
  const rawManifest:unknown=JSON.parse(read('manifest.json') as unknown as string);
  const manifest=rawManifest as {schemaVersion?:unknown;incidentId?:unknown;steps?:unknown;integrations?:unknown;status?:unknown};
  if (manifest.schemaVersion !== 1 || !/^[0-9a-f-]{36}$/.test((manifest.incidentId as string)||'') || !Array.isArray(manifest.steps) || manifest.steps.length > 100) throw new Error('Unsupported evidence manifest');
  fs.mkdirSync(path.resolve(out));
  const report:Report = { schemaVersion: 1, incidentId: manifest.incidentId, supportId: randomUUID(), toolVersion: version,
    source: 'projected local Evidence Bundle', capturedAt: new Date().toISOString(), status: 'partial',
    versions: {}, device: {}, compatibility: [], steps: [], privacy: { screenshotIncluded: includeScreenshot, requiresManualReview: true } };
  const versionField = (value:unknown):string|null => {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string' || value.length > 64) throw new Error('Invalid version metadata');
    return value;
  };
  function write(name:string, data:unknown) { fs.writeFileSync(path.join(out, name), JSON.stringify(redact(data), null, 2), { flag: 'wx' }); }
  try {
    for (const raw of manifest.steps as unknown[]) {
      const step=raw as StepView;
      if (typeof step.name !== 'string') continue;
      report.steps.push({ name: /^[a-z0-9-]{1,64}$/.test(step.name) ? step.name : 'unknown',
        status: ['completed','failed','skipped','unsupported'].includes(step.status as string) ? step.status as string : 'unknown',
        required: typeof step.required === 'boolean' ? step.required : null });
      if (step.status !== 'completed' || !['device','app','versions','console','repro','logcat','screenshot'].includes(step.name) && !/^integration-\d+$/.test(step.name)) continue;
      try {
        const file = step.name === 'screenshot' ? 'screenshot.png' : `${step.name}.json`;
        if (file.endsWith('.png') && !includeScreenshot) continue;
        const raw = read(file, file.endsWith('.png') ? 8 * 1024 * 1024 : 1024 * 1024);
        if (!/^[0-9a-f]{64}$/.test((step.artifact?.sha256 as string)||'') || createHash('sha256').update(raw).digest('hex') !== step.artifact!.sha256) throw new Error('Artifact checksum mismatch');
        if (file.endsWith('.png')) {
          if (raw.length < 24 || !raw.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Invalid PNG');
          fs.writeFileSync(path.join(out, file), raw, { flag: 'wx' }); continue;
        }
        const parsed:unknown=JSON.parse(raw as unknown as string);
        const envelope=parsed as {schemaVersion?:unknown;incidentId?:unknown;data?:unknown};
        if (envelope.schemaVersion !== 1 || envelope.incidentId !== manifest.incidentId) throw new Error('Incident mismatch');
        const data = envelope.data as DataView;
        if (step.name === 'device') report.device = { androidVersion: versionField(data.androidVersion) }; // Omit model and serial for support by default.
        if (step.name === 'app') report.versions.app = { versionName: versionField(data.versionName), versionCode: versionField(data.versionCode) };
        if (step.name === 'versions') {
          Object.assign(report.versions, { gameVersion: versionField(data.gameVersion), loaderVersion: versionField(data.loaderVersion) });
          if(data.gameVersionSources!==undefined){
            if(!data.gameVersionSources||typeof data.gameVersionSources!=='object'||Array.isArray(data.gameVersionSources))throw Error('Invalid version sources');
            const sources:Record<string,string|null>={};for(const source of ['startConfig','gameVersionMod']){
              const value=versionField((data.gameVersionSources as Record<string,unknown>)[source]);if(value!==null&&!/^[0-9A-Za-z._()+-]{1,64}$/.test(value))throw Error('Invalid version source');sources[source]=value;
            }
            report.versions.gameVersionSources=sources;
          }
        }
        if (step.name === 'console') report.console = { events: ((data.events || []) as EventView[]).slice(0,50).map(e => ({
          kind: ['console','exception'].includes(e.kind as string) ? e.kind as string : 'other', level: ['error','warning','log','info','debug'].includes(e.level as string) ? e.level as string : 'other',
          timestampMs: typeof e.timestampMs === 'number' ? e.timestampMs : null })), content: 'omitted',
          history: 'may include cached Runtime events; not a live-event rate',
          timestampOrigin: 'target event time; not receipt time; clocks may differ',
          sourceOmitted: Number.isSafeInteger(data.omitted) && (data.omitted as number) >= 0 ? data.omitted : null,
          projectionOmitted: Array.isArray(data.events) ? Math.max(0, data.events.length - 50) : null };
        if (step.name === 'logcat') report.logcat = { count: typeof data.count === 'number' ? data.count : null, content: 'omitted' };
        if (step.name === 'repro') write('repro.json', { schemaVersion: 1, incidentId: report.incidentId, data: reproductionData(data) });
        if (step.name.startsWith('integration-')) {
          const index = Number(step.name.slice('integration-'.length));
          const meta = Array.isArray(manifest.integrations) ? manifest.integrations.find((item:IntegrationView|null|undefined) => item?.index === index) as IntegrationView|undefined : null;
          report.compatibility.push({ name: typeof meta?.name === 'string' && /^[a-z0-9][a-z0-9-]{0,63}$/.test(meta.name) ? meta.name : null,
            version: versionField(meta?.version), status: ['available','unavailable','unsupported','failed'].includes(data.status as string) ? data.status as string : 'unknown',
            adapters: Array.isArray(data.adapters) ? data.adapters.slice(0,32).map((a:AdapterView) => ({ match: ['full','partial','none'].includes(a.match as string) ? a.match as string : 'unknown', degraded: !!a.degraded })) : [] });
        }
      } catch { report.steps.at(-1)!.supportProjection = 'failed'; }
    }
    report.status = report.steps.some(s => s.supportProjection === 'failed') || manifest.status !== 'complete' ? 'partial' : 'complete';
  } finally { write('support.json', report); }
  return report;
}
function reproductionData(raw:unknown) {
  const data=raw as Record<string,unknown>|null|undefined;
  const result:Record<string,unknown> = {};
  for (const key of ['summary','expected','actual','note']) if (typeof data?.[key] === 'string') result[key] = data[key];
  result.steps = Array.isArray(data?.steps) ? data.steps.filter((s:unknown) => typeof s === 'string').slice(0,20) : [];
  return { ...redact(result) as object|null|undefined, source: 'User note', requiresPrivacyReview: true };
}
const api={support,reproduction};
export = api;
