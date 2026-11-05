import type collectorsType from './collectors.cjs';
import type execution from './execution-context.cjs';
import type cdp from './cdp.cjs';
import type integration from './integration.cjs';
import type diagnostics from './diagnostics.cjs';
declare namespace evidenceAPI {
 type StepStatus='completed'|'failed'|'skipped'|'unsupported';
 interface Options extends execution.Options {out:string;windowMs:number;profile?:string;css?:boolean;environment?:boolean;observerInstrumentation?:boolean;inspectors?:string[];webPerformance?:boolean;storage?:boolean;processes?:boolean;lifecycle?:boolean;layout?:boolean;allowHelper?:boolean;samples?:number;intervalMs?:number;seriesWebview?:boolean;logcatSeconds?:number;recordSeconds?:number;deepSeconds?:number;bugreport?:boolean;sensitive?:boolean;repro?:string}
 interface Context extends collectorsType.Context {options:execution.Options;output?:string;ensureWebview?:execution.Context['ensureWebview'];pause?:execution.Context['pause'];finish?:execution.Context['finish'];runHeavy?:unknown;deviceCaptureCleanupWarning?:boolean;[key:string]:unknown}
 type Collector=(ctx:Context)=>Promise<unknown>;
 interface Methods {device:Collector;app:Collector;screenshot:Collector;gfx:Collector;mem:Collector;forward:Collector;removeForward:Collector;cdp:Collector;consoleSummary:Collector;networkSummary:Collector;webview:Collector;versions:Collector;dom:Collector;css:Collector;environment:Collector;provider:Collector;perfetto:Collector;bugreport:Collector;logcat:Collector;record:Collector;timeline:Collector;performanceSeries:Collector;integration:(ctx:Context,path:string)=>Promise<integration.Result>}
 interface LocalIntegration {modulePath?:string;describe?:()=>{name?:unknown;version?:unknown;source?:unknown;supportedApiVersion?:unknown};detect?:(ctx:Context)=>Promise<unknown>;collect?:(ctx:Context)=>Promise<unknown>;redact?:(value:unknown)=>unknown}
 interface Overrides extends execution.Overrides {collectors?:Partial<Methods>;integrations?:LocalIntegration[];runHeavy?:unknown}
 interface Artifact {filename?:unknown;sha256?:unknown;bytes?:unknown;[key:string]:unknown}
 interface Step {name:string;source:string;required:boolean;commandTimeoutMs:number;captureStart:string;captureEnd?:string;durationMs?:number;status:StepStatus;reason?:unknown;artifact?:Artifact;coverage?:{truncated:true;reasons:string[]};errorContent?:string;diagnostic?:ReturnType<typeof diagnostics.describe>}
 interface IntegrationInfo {index:number;name:unknown;status:integration.Status;moduleSha256?:string;reason?:integration.FailureReason;[key:string]:unknown}
 interface Draft {schemaVersion:number;incidentId:string;toolVersion:unknown;captureStart:string;captureEnd?:string;localTimezone:string;observationsAreSequential:true;profile:string;status:'failed'|'partial'|'complete';steps:Step[];integrations:IntegrationInfo[];privacy:unknown;deviceCaptureCleanupWarning?:boolean;completed?:string[];failed?:string[];skipped?:string[];unsupported?:string[];[key:string]:unknown}
 type Manifest=Draft&Record<StepStatus,string[]>;
}
interface CaptureView {collectorStatus?:unknown;reason?:unknown;json?:unknown;file?:unknown;sha256?:unknown;bytes?:unknown;metadata?:unknown;binary?:unknown;extension?:unknown;truncated?:unknown;truncationReasons?:unknown}
interface ErrorView {code?:unknown;killed?:unknown;message?:unknown}
const fs:typeof import('node:fs')=require('node:fs');
const path:typeof import('node:path')=require('node:path');
const {randomUUID,createHash}:typeof import('node:crypto')=require('node:crypto');
const {performance}:typeof import('node:perf_hooks')=require('node:perf_hooks');
const collectors:typeof import('./collectors.cjs')=require('./collectors.cjs');
const {redact}:typeof import('./privacy.cjs')=require('./privacy.cjs');
const { version } = require('../../package.json');
const {reproduction}:typeof import('./support.cjs')=require('./support.cjs');
const profiles:Record<string,string[]> = {
  evidence: ['device','app','screenshot','gfxinfo','meminfo','transport','cdp','console','network','webview','versions','dom-contract'],
  capture: ['device','app','screenshot'], perf: ['device','app','gfxinfo','meminfo'],
  logcat: ['device','app','logcat'], record: ['device','app','record'],
  deep: ['device','app','gfxinfo','meminfo','perfetto'], bugreport: ['device','app','bugreport'],
  environment: ['device','app','provider','transport','cdp','webview','versions','environment'],
  series: ['device','app','performance-series'],
  layout: ['device','app','native-layout'],
  processes: ['device','app','process-memory'],
  lifecycle: ['device','app','app-lifecycle'],
};
function validate(options:evidenceAPI.Options) {
  if (options.host !== undefined && options.host !== 'chrome') throw new Error('Unsupported host');
  if (options.host !== 'chrome' && (!options.serial || !/^[\w.:-]{1,128}$/.test(options.serial))) throw new Error('Provide explicit --serial');
  if (options.host !== 'chrome' && !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(options.package || '')) throw new Error('Provide valid --package');
  if (!options.out) throw new Error('Provide a new --out directory');
  if (options.scope !== undefined && (typeof options.scope !== 'string' || !options.scope.trim() || options.scope.length > 256)) throw new Error('Invalid --scope');
  if (!Number.isInteger(options.windowMs) || options.windowMs < 0 || options.windowMs > 10000) throw new Error('--window-ms must be 0..10000');
  if (options.profile && !profiles[options.profile]) throw new Error('Unknown collection profile');
  if (options.css && !options.scope) throw new Error('CSS capture requires --scope');
  if (options.timelineMs !== undefined && (!options.scope || !Number.isInteger(options.timelineMs) || options.timelineMs < 1 || options.timelineMs > 10000)) throw new Error('Timeline requires scope and 1..10000 ms');
  if (options.observerInstrumentation !== undefined && (typeof options.observerInstrumentation !== 'boolean' || options.observerInstrumentation && options.timelineMs === undefined)) throw new Error('Observer instrumentation requires timeline');
  if (options.inspectors !== undefined && (!options.scope || !Array.isArray(options.inspectors) || options.inspectors.length < 1 || options.inspectors.length > 6 || new Set(options.inspectors).size !== options.inspectors.length || options.inspectors.some(mode => !require('./inspectors.cjs').domModes.includes(mode)))) throw Error('Invalid scoped inspectors');
  if (options.webPerformance && options.host !== 'chrome') throw Error('Web performance selection requires Chrome');
  if (options.webPerformance !== undefined && typeof options.webPerformance !== 'boolean') throw Error('Invalid web performance selection');
  if (options.storage !== undefined && typeof options.storage !== 'boolean') throw Error('Invalid storage selection');
  if(options.processes!==undefined&&typeof options.processes!=='boolean')throw Error('Invalid process selection');
  if(options.lifecycle!==undefined&&typeof options.lifecycle!=='boolean')throw Error('Invalid lifecycle selection');
  if(options.layout!==undefined&&typeof options.layout!=='boolean'||options.allowHelper!==undefined&&typeof options.allowHelper!=='boolean')throw Error('Invalid native layout selection');
  if(options.host !== 'chrome' && (options.layout||options.profile==='layout')&&options.allowHelper!==true)throw Error('Native layout requires explicit helper side effects selection');
  if (options.profile === 'series' || options.samples !== undefined) require('./performance-series.cjs').validate(options);
  if (options.seriesWebview !== undefined && typeof options.seriesWebview !== 'boolean') throw Error('Invalid WebView selection');
  if (options.targetId !== undefined && !/^[A-Za-z0-9._:-]{1,128}$/.test(options.targetId as string)) throw new Error('Invalid CDP target ID');
  if (options.webviewSocket !== undefined && !/^(?:browser_)?webview_devtools_remote_[0-9]+$/.test(options.webviewSocket as string)) throw new Error('Invalid WebView socket');
  if (options.logcatSeconds !== undefined && (!Number.isInteger(options.logcatSeconds) || options.logcatSeconds < 1 || options.logcatSeconds > 300)) throw new Error('Logcat window must be 1..300 seconds');
  if (options.recordSeconds !== undefined && (!Number.isInteger(options.recordSeconds) || options.recordSeconds < 1 || options.recordSeconds > 30)) throw new Error('Recording limit must be 1..30 seconds');
  if (options.deepSeconds !== undefined && (!Number.isInteger(options.deepSeconds) || options.deepSeconds < 1 || options.deepSeconds > 30)) throw new Error('Trace duration must be 1..30 seconds');
  if ((options.deepSeconds !== undefined || options.bugreport || ['deep','bugreport'].includes(options.profile as string)) && options.sensitive !== true) throw new Error('Heavy capture requires --sensitive yes');
}
async function evidence(options:evidenceAPI.Options, overrides:evidenceAPI.Overrides = {}):Promise<evidenceAPI.Manifest> {
  validate(options);
  if (options.host === 'chrome') options = { ...options, chromeRecord: (require('./host-options.cjs') as typeof import('./host-options.cjs')).chrome(options) };
  const repro = options.repro ? reproduction(options.repro) : null;
  const chrome = options.host === 'chrome';
  const chromeProfiles:Record<string,string[]> = { evidence: ['screenshot','console','network','dom-contract'], capture: ['screenshot'], perf: ['web-performance'], environment: ['environment'] };
  const selected = new Set((chrome && chromeProfiles[options.profile || 'evidence']) || profiles[options.profile || 'evidence']);
  if (options.logcatSeconds !== undefined) selected.add('logcat');
  if (options.recordSeconds !== undefined) selected.add('record');
  if (options.deepSeconds !== undefined) selected.add('perfetto');
  if (options.bugreport) selected.add('bugreport');
  if (options.css) selected.add('css-contract');
  if (options.environment) { if (!chrome) selected.add('provider'); selected.add('environment'); }
  if (options.timelineMs !== undefined) selected.add('timeline');
  if (options.storage) selected.add('storage');
  if (options.layout) selected.add('native-layout');
  if(options.processes)selected.add('process-memory');
  if(options.lifecycle)selected.add('app-lifecycle');
  if (options.samples !== undefined) selected.add('performance-series');
  if (options.webPerformance) selected.add('web-performance');
  if (chrome) for (const mode of options.inspectors || []) selected.add(mode);
  if (options.seriesWebview) for(const name of ['provider','transport','cdp','webview']) selected.add(name);
  if (repro) selected.add('repro');
  const output = path.resolve(options.out);
  fs.mkdirSync(output); // Exclusive; parent must already exist. Never overwrite a partial incident.
  const incidentId = randomUUID(), started = new Date().toISOString();
  const manifest:evidenceAPI.Draft = { schemaVersion: 1, incidentId, toolVersion: version, captureStart: started,
    localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    ...(chrome ? { host: 'chrome',target:(require('./host-options.cjs') as typeof import('./host-options.cjs')).publicIdentity(options.chromeRecord!.target) } : { package: options.package, selectedDevice: 'explicit; serial omitted' }), observationsAreSequential: true,
    profile: options.profile || 'evidence', status: 'failed', steps: [], integrations: [], privacy: {
      structured: 'allowlisted metadata plus aggregation redaction; no game state or control values',
      screenshot: 'requires manual privacy review; not automatically safe to share',
      integrations: 'reviewed module-specific allowlists plus heuristic core filtering; privacy not guaranteed',
    } };
  const ctx:evidenceAPI.Context = chrome ? (require('./execution-context.cjs') as typeof import('./execution-context.cjs')).create(options, overrides, { captureEvents: true }) :
    { options, output, adb: overrides.adb || collectors.android(options), connect: overrides.connect, runHeavy: overrides.runHeavy };
  ctx.output = output;
  const methods = { ...collectors, ...require('./deep.cjs'), logcat: require('./logcat.cjs').collect, record: require('./record.cjs').collect,
    integration: require('./integration.cjs').collect, timeline: require('./timeline.cjs').collect, performanceSeries:require('./performance-series.cjs').collect, ...overrides.collectors } as evidenceAPI.Methods;
  let evidenceCount = 0;
  function save(name:string, source:string, value:unknown) {
    const filename = `${name}.json`;
    const body = JSON.stringify({ schemaVersion: 1, incidentId, source, capturedAt: new Date().toISOString(), data: redact(value) }, null, 2);
    fs.writeFileSync(path.join(output, filename), body, { flag: 'wx' });
    return { filename, sha256: createHash('sha256').update(body).digest('hex') };
  }
  function checkpoint() {
    // The manifest is the only mutable file; artifacts remain exclusive and preserved.
    const pending = path.join(output, 'manifest.pending');
    fs.writeFileSync(pending, JSON.stringify(manifest, null, 2), { flag: 'wx' });
    fs.renameSync(pending, path.join(output, 'manifest.json'));
  }
  async function runStep(name:string, source:string, run:()=>Promise<unknown>, required = true, skip:string|null = null) {
    const begin = performance.now();
    const commandTimeoutMs = name === 'native-layout'?15000:['performance-series','process-memory'].includes(name) ? 60000 : name === 'timeline' ? options.timelineMs! + 5000 : name === 'record' ? (options.recordSeconds! + 5) * 1000 : name === 'perfetto' ? (options.deepSeconds! + 30) * 1000 : name === 'bugreport' ? 180000 : 10000;
    const record:evidenceAPI.Step = { name, source, required, commandTimeoutMs, captureStart: new Date().toISOString(), status: 'failed' };
    manifest.steps.push(record);
    try {
      if (skip) { record.status = 'skipped'; record.reason = skip; return; }
      const raw:unknown = await run();
      const result=raw as CaptureView|null|undefined;
      if (result?.collectorStatus === 'unsupported') { record.status = 'unsupported'; record.reason = result.reason; return; }
      if (result && Object.hasOwn(result, 'json')) record.artifact = save(name, source, result.json);
      else if (result?.file) {
        if (fs.realpathSync(path.dirname(result.file as string)) !== fs.realpathSync(output)) throw new Error('Artifact outside incident');
        record.artifact = { filename: path.basename(result.file as string), sha256: result.sha256, bytes: result.bytes, ...redact(result.metadata) as object|null|undefined };
      } else if (result?.binary) {
        const filename = `${name}.${result.extension}`;
        fs.writeFileSync(path.join(output, filename), result.binary as Buffer, { flag: 'wx' });
        record.artifact = { filename, sha256: createHash('sha256').update(result.binary as Buffer).digest('hex'), ...redact(result.metadata) as object|null|undefined };
      } else record.artifact = save(name, source, result);
      record.status = result?.collectorStatus === 'failed' ? 'failed' : 'completed';
      if (name === 'dom-contract' && result?.truncated === true) record.coverage = { truncated: true,
        reasons: Array.isArray(result.truncationReasons) ? result.truncationReasons.filter((r:unknown) => ['max-nodes','max-depth','class-count','data-count','id-length'].includes(r as string)).slice(0,5) as string[] : [] };
      if (result?.reason) record.reason = result.reason;
      if (record.status === 'completed' && !name.startsWith('integration-') && !name.startsWith('transport')) evidenceCount++;
    } catch (error) {
      // Raw tool stderr / CDP exceptions may contain input or credentials. Do not export them.
      record.reason = (error as ErrorView|null|undefined)?.code === 'ETIMEDOUT' || (error as ErrorView|null|undefined)?.killed ? 'timeout' : 'collector-error';
      const known = ['Device unavailable','Package unavailable','App identity unavailable','App process changed','App WebView socket unavailable',
        'Invalid forwarding port','Invalid screenshot','Unrecognized meminfo format','Unrecognized gfxinfo format',
        'Unsupported logcat epoch format','Invalid recording container','Invalid heavy artifact',
        'CDP evaluation timeout','CDP connection timeout','CDP connection failed','CDP connection closed before result','CDP command rejected'];
      if (known.includes((error as ErrorView|null|undefined)?.message as string)) record.reason = (error as ErrorView).message;
      if (['ENOENT','EACCES','ENOSPC','EEXIST'].includes((error as ErrorView|null|undefined)?.code as string)) record.reason = (error as ErrorView).code;
      record.errorContent = 'omitted';
      const detail = require('./diagnostics.cjs').describe(error);
      if (detail) record.diagnostic = detail;
    } finally {
      record.captureEnd = new Date().toISOString(); record.durationMs = Math.round(performance.now() - begin);
      checkpoint();
    }
  }
  async function step(name:string, ...args:[source:string,run:()=>Promise<unknown>,required?:boolean,skip?:string|null]) { if (selected.has(name)) await runStep(name, ...args); }
  checkpoint();
  try {
    let noCdp, noDevice;
    if (chrome) {
      const supported = new Map([['screenshot','screenshot'],['dom-contract','dom'],['css-contract','css'],['console','console'],['network','network'],['storage','storage'],['environment','environment'],['web-performance','web-performance']]);
      let windowReady = false;
      for (const name of selected) {
        if (name === 'repro') { await step('repro', 'User note', async () => repro); continue; }
        const kind = supported.get(name);
        if (!kind) { await runStep(name, 'Chrome', async () => ({ collectorStatus:'unsupported', reason:'not-supported-on-chrome' })); continue; }
        const skip = name === 'dom-contract' && !options.scope ? 'no-scope-requested' : null;
        await runStep(name, `Chrome ${kind}`, async () => {
          if ((kind === 'console' || kind === 'network') && !windowReady) {
            await ctx.ensureWebview!(); await ctx.pause!(options.windowMs); windowReady = true;
          }
          const value = await (require('./chrome-evidence.cjs') as typeof import('./chrome-evidence.cjs')).collect(ctx as unknown as execution.Context,kind,{captureEnd:new Date().toISOString()});
          if (kind === 'screenshot') value.extension = 'png';
          return value;
        }, name !== 'dom-contract' || !!options.scope, skip);
      }
      noCdp = !ctx.client ? 'cdp-unavailable' : null;
    } else {
    await step('device', 'ADB / Android', async () => {
      const data = await methods.device(ctx); ctx.deviceData = data; manifest.device = redact(data); return data;
    });
    noDevice = !ctx.deviceReady ? 'device-check-failed' : null;
    await step('app', 'ADB / Android', async () => { const data = await methods.app(ctx); ctx.appData = data; manifest.app = redact(data); return data; }, true, noDevice);
    await step('provider', 'Android WebView update service', async () => { const data = await methods.provider(ctx); ctx.providerData = data; return data; }, true, noDevice);
    await step('screenshot', 'ADB current screen', () => methods.screenshot(ctx), true, noDevice);
    await step('native-layout','Android CLI current native windows',()=>require('./native-layout.cjs').collect(ctx),true,noDevice);
    await step('record', 'ADB screenrecord', () => methods.record(ctx), true, noDevice);
    await step('logcat', 'PID-scoped Android logcat', () => methods.logcat(ctx), true, noDevice || (!ctx.appPid ? 'app-check-failed' : null));
    await step('repro', 'User note', async () => repro);
    await step('gfxinfo', 'Android gfxinfo', () => methods.gfx(ctx), true, noDevice || (!ctx.appPid ? 'app-check-failed' : null));
    await step('meminfo', 'Android meminfo', () => methods.mem(ctx), true, noDevice || (!ctx.appPid ? 'app-check-failed' : null));
    await step('process-memory','ActivityManager membership / PID meminfo',()=>require('./process-memory.cjs').collect(ctx),true,noDevice||(!ctx.appPid?'app-check-failed':null));
    await step('app-lifecycle','Android retained process exit metadata',()=>require('./app-lifecycle.cjs').collect(ctx),true,noDevice||(!ctx.appData?'app-check-failed':null));
    await step('transport', 'ADB forwarding', () => methods.forward(ctx), true, noDevice || (!ctx.appPid ? 'app-check-failed' : null));
    await step('cdp', 'CDP event window', () => methods.cdp(ctx), true, !ctx.endpoint ? 'verified-webview-unavailable' : null);
    noCdp = !ctx.client ? 'cdp-unavailable' : null;
    await step('console', 'CDP Runtime events', () => methods.consoleSummary(ctx), true, noCdp);
    await step('network', 'CDP Network events', () => methods.networkSummary(ctx), true, noCdp);
    await step('webview', 'CDP', async () => { const data = await methods.webview(ctx); ctx.webviewData = data; manifest.webview = redact(data); return data; }, true, noCdp);
    await step('versions', 'ModLoader version metadata via CDP', async () => {
      const data = await methods.versions(ctx),projected=redact(data);
      // Version observations do not own incident identity, step records or policy.
      // The complete redacted observation remains in its original versions.json.
      if(projected&&typeof projected==='object'&&!Array.isArray(projected))for(const field of ['gameVersion','gameVersionSources','loaderVersion'])if(Object.hasOwn(projected,field))manifest[field]=projected[field];
      return data;
    }, true, noCdp);
    await step('dom-contract', 'DOM via CDP', () => methods.dom(ctx), !!options.scope, noCdp || (!options.scope ? 'no-scope-requested' : null));
    await step('css-contract', 'Computed Style via CDP', () => methods.css(ctx), true, noCdp);
    await step('environment', 'Android and public WebView metadata', () => methods.environment(ctx), true, noCdp);
    await step('timeline', 'Scoped temporary WebView observation', () => methods.timeline(ctx), true, noCdp);
    await step('storage', 'WebView storage metadata and readonly counts', () => require('./inspectors.cjs').collect(ctx, 'storage'), true, noCdp);
    for (const mode of options.inspectors || []) await runStep(mode, 'Scoped generic DOM inspection', () => require('./inspectors.cjs').collect(ctx, mode), true, noCdp);
    await step('performance-series','Sequential Android and selected WebView metrics',()=>methods.performanceSeries(ctx),true,noDevice||(!ctx.appPid?'app-check-failed':null));
    }
    for (const [index, integration] of (overrides.integrations || []).entries()) {
      const info:evidenceAPI.IntegrationInfo = { index, name: null, status: 'unavailable' };
      manifest.integrations.push(info);
      if (integration.modulePath) {
        await runStep(`integration-${index}`, 'Optional Integration interpretation', async () => {
          const result = await methods.integration(ctx, integration.modulePath!);
          if(result.description)for(const field of Object.keys(result.description) as (keyof integration.Description)[])if(['name','version','supportedApiVersion','capabilities'].includes(field))info[field]=result.description[field];
          info.status=result.status;
          if (result.moduleSha256) info.moduleSha256 = result.moduleSha256;
          if (result.reason) info.reason = result.reason;
          return { json: result.data };
        }, false, noCdp);
      } else {
        // Internal test hook; public CLI modules always use the bounded worker above.
        let descriptionFailed = false;
        try {
          const description = integration.describe!();
          Object.assign(info, redact({ name: description.name, version: description.version, source: description.source, supportedApiVersion: description.supportedApiVersion }));
        } catch { descriptionFailed = true; }
        await runStep(`integration-${index}`, 'Optional Integration interpretation', async () => {
          if (descriptionFailed) throw new Error('Integration description unavailable');
          if (await integration.detect!(ctx) !== 'available') { info.status = 'unavailable'; return { status: info.status }; }
          const result = await integration.collect!(ctx) as {status?:unknown}|null|undefined;
          info.status = ['available','unavailable','unsupported','failed'].includes(result?.status as string) ? result!.status as integration.Status : 'failed';
          return { json: integration.redact!(result) };
        }, false, descriptionFailed ? null : noCdp);
      }
      const record = manifest.steps.at(-1)!;
      if (record.status === 'failed') info.status = 'failed';
      if (record.status === 'completed' && info.status !== 'available') { record.status = info.status === 'failed' ? 'failed' : info.status === 'unsupported' ? 'unsupported' : 'skipped'; record.reason = info.reason || info.status; }
    }
    if (!chrome) {
    await step('perfetto', 'Perfetto system trace', () => methods.perfetto(ctx), true, noDevice || (!ctx.appPid ? 'app-check-failed' : null));
    await step('bugreport', 'Android system bugreport', () => methods.bugreport(ctx), true, noDevice);
    }
  } finally {
    if (chrome) {
      const cleanup = await ctx.finish!();
      if (cleanup.some(item => item.status === 'failed')) await runStep('chrome-cleanup', 'Owned Chrome transport', async () => { throw Error('Chrome cleanup failed'); });
    } else try { (ctx.client as cdp.Client|undefined)?.close(); } catch { /* Forward cleanup and manifest still run. */ }
    if (ctx.forwardPort) await runStep('transport-cleanup', 'ADB forwarding', () => methods.removeForward(ctx), true);
    manifest.captureEnd = new Date().toISOString();
    for (const status of ['completed','failed','skipped','unsupported'] as const) manifest[status] = manifest.steps.filter(s => s.status === status).map(s => s.name);
    const incomplete = manifest.steps.some(s => s.required && s.status !== 'completed') || !!ctx.deviceCaptureCleanupWarning;
    if (ctx.deviceCaptureCleanupWarning) manifest.deviceCaptureCleanupWarning = true;
    manifest.status = evidenceCount === 0 ? 'failed' : incomplete ? 'partial' : 'complete';
    checkpoint();
  }
  return manifest as evidenceAPI.Manifest;
}
const evidenceAPI={evidence,validate};
export = evidenceAPI;
