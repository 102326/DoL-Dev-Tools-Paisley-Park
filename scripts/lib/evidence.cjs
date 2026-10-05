const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { performance } = require('node:perf_hooks');
const collectors = require('./collectors.cjs');
const { redact } = require('./privacy.cjs');
const { version } = require('../../package.json');
const { reproduction } = require('./support.cjs');
const profiles = {
  evidence: ['device','app','screenshot','gfxinfo','meminfo','transport','cdp','console','network','webview','versions','dom-contract'],
  capture: ['device','app','screenshot'], perf: ['device','app','gfxinfo','meminfo'],
  logcat: ['device','app','logcat'], record: ['device','app','record'],
  deep: ['device','app','gfxinfo','meminfo','perfetto'], bugreport: ['device','app','bugreport'],
};
function validate(options) {
  if (!options.serial || !/^[\w.:-]{1,128}$/.test(options.serial)) throw new Error('Provide explicit --serial');
  if (!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(options.package || '')) throw new Error('Provide valid --package');
  if (!options.out) throw new Error('Provide a new --out directory');
  if (options.scope !== undefined && (typeof options.scope !== 'string' || !options.scope.trim() || options.scope.length > 256)) throw new Error('Invalid --scope');
  if (!Number.isInteger(options.windowMs) || options.windowMs < 0 || options.windowMs > 10000) throw new Error('--window-ms must be 0..10000');
  if (options.profile && !profiles[options.profile]) throw new Error('Unknown collection profile');
  if (options.logcatSeconds !== undefined && (!Number.isInteger(options.logcatSeconds) || options.logcatSeconds < 1 || options.logcatSeconds > 300)) throw new Error('Logcat window must be 1..300 seconds');
  if (options.recordSeconds !== undefined && (!Number.isInteger(options.recordSeconds) || options.recordSeconds < 1 || options.recordSeconds > 30)) throw new Error('Recording limit must be 1..30 seconds');
  if (options.deepSeconds !== undefined && (!Number.isInteger(options.deepSeconds) || options.deepSeconds < 1 || options.deepSeconds > 30)) throw new Error('Trace duration must be 1..30 seconds');
  if ((options.deepSeconds !== undefined || options.bugreport || ['deep','bugreport'].includes(options.profile)) && options.sensitive !== true) throw new Error('Heavy capture requires --sensitive yes');
}
async function evidence(options, overrides = {}) {
  validate(options);
  const repro = options.repro ? reproduction(options.repro) : null;
  const selected = new Set(profiles[options.profile || 'evidence']);
  if (options.logcatSeconds !== undefined) selected.add('logcat');
  if (options.recordSeconds !== undefined) selected.add('record');
  if (options.deepSeconds !== undefined) selected.add('perfetto');
  if (options.bugreport) selected.add('bugreport');
  if (repro) selected.add('repro');
  const output = path.resolve(options.out);
  fs.mkdirSync(output); // Exclusive; parent must already exist. Never overwrite a partial incident.
  const incidentId = randomUUID(), started = new Date().toISOString();
  const manifest = { schemaVersion: 1, incidentId, toolVersion: version, captureStart: started,
    localTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone, package: options.package,
    selectedDevice: 'explicit; serial omitted', observationsAreSequential: true,
    profile: options.profile || 'evidence', status: 'failed', steps: [], integrations: [], privacy: {
      structured: 'allowlisted metadata plus aggregation redaction; no game state or control values',
      screenshot: 'requires manual privacy review; not automatically safe to share',
    } };
  const ctx = { options, output, adb: overrides.adb || collectors.android(options), connect: overrides.connect, runHeavy: overrides.runHeavy };
  const methods = { ...collectors, ...require('./deep.cjs'), logcat: require('./logcat.cjs').collect, record: require('./record.cjs').collect, ...overrides.collectors };
  let evidenceCount = 0;
  function save(name, source, value) {
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
  async function runStep(name, source, run, required = true, skip = null) {
    const begin = performance.now();
    const commandTimeoutMs = name === 'record' ? (options.recordSeconds + 5) * 1000 : name === 'perfetto' ? (options.deepSeconds + 30) * 1000 : name === 'bugreport' ? 180000 : 10000;
    const record = { name, source, required, commandTimeoutMs, captureStart: new Date().toISOString(), status: 'failed' };
    manifest.steps.push(record);
    try {
      if (skip) { record.status = 'skipped'; record.reason = skip; return; }
      const result = await run();
      if (result?.collectorStatus === 'unsupported') { record.status = 'unsupported'; record.reason = result.reason; return; }
      if (result?.file) {
        if (fs.realpathSync(path.dirname(result.file)) !== fs.realpathSync(output)) throw new Error('Artifact outside incident');
        record.artifact = { filename: path.basename(result.file), sha256: result.sha256, bytes: result.bytes, ...redact(result.metadata) };
      } else if (result?.binary) {
        const filename = `${name}.${result.extension}`;
        fs.writeFileSync(path.join(output, filename), result.binary, { flag: 'wx' });
        record.artifact = { filename, sha256: createHash('sha256').update(result.binary).digest('hex'), ...redact(result.metadata) };
      } else record.artifact = save(name, source, result);
      record.status = result?.collectorStatus === 'failed' ? 'failed' : 'completed';
      if (result?.reason) record.reason = result.reason;
      if (record.status === 'completed' && !name.startsWith('integration-') && !name.startsWith('transport')) evidenceCount++;
    } catch (error) {
      // Raw tool stderr / CDP exceptions may contain input or credentials. Do not export them.
      record.reason = error?.code === 'ETIMEDOUT' || error?.killed ? 'timeout' : 'collector-error';
      const known = ['Device unavailable','Package unavailable','App identity unavailable','App process changed','App WebView socket unavailable',
        'Invalid forwarding port','Invalid screenshot','Unrecognized meminfo format','Unrecognized gfxinfo format',
        'Unsupported logcat epoch format','Invalid recording container','Invalid heavy artifact',
        'CDP evaluation timeout','CDP connection timeout','CDP connection failed','CDP connection closed before result','CDP command rejected'];
      if (known.includes(error?.message)) record.reason = error.message;
      if (['ENOENT','EACCES','ENOSPC','EEXIST'].includes(error?.code)) record.reason = error.code;
      record.errorContent = 'omitted';
    } finally {
      record.captureEnd = new Date().toISOString(); record.durationMs = Math.round(performance.now() - begin);
      checkpoint();
    }
  }
  async function step(name, ...args) { if (selected.has(name)) await runStep(name, ...args); }
  checkpoint();
  try {
    await step('device', 'ADB / Android', async () => {
      const data = await methods.device(ctx); manifest.device = redact(data); return data;
    });
    const noDevice = !ctx.deviceReady ? 'device-check-failed' : null;
    await step('app', 'ADB / Android', async () => { const data = await methods.app(ctx); manifest.app = redact(data); return data; }, true, noDevice);
    await step('screenshot', 'ADB current screen', () => methods.screenshot(ctx), true, noDevice);
    await step('record', 'ADB screenrecord', () => methods.record(ctx), true, noDevice);
    await step('logcat', 'PID-scoped Android logcat', () => methods.logcat(ctx), true, noDevice || (!ctx.appPid ? 'app-check-failed' : null));
    await step('repro', 'User note', async () => repro);
    await step('gfxinfo', 'Android gfxinfo', () => methods.gfx(ctx), true, noDevice || (!ctx.appPid ? 'app-check-failed' : null));
    await step('meminfo', 'Android meminfo', () => methods.mem(ctx), true, noDevice || (!ctx.appPid ? 'app-check-failed' : null));
    await step('transport', 'ADB forwarding', () => methods.forward(ctx), true, noDevice || (!ctx.appPid ? 'app-check-failed' : null));
    await step('cdp', 'CDP event window', () => methods.cdp(ctx), true, !ctx.endpoint ? 'verified-webview-unavailable' : null);
    const noCdp = !ctx.client ? 'cdp-unavailable' : null;
    await step('console', 'CDP Runtime events', () => methods.consoleSummary(ctx), true, noCdp);
    await step('network', 'CDP Network events', () => methods.networkSummary(ctx), true, noCdp);
    await step('webview', 'CDP', async () => { const data = await methods.webview(ctx); manifest.webview = redact(data); return data; }, true, noCdp);
    await step('versions', 'ModLoader version metadata via CDP', async () => { const data = await methods.versions(ctx); Object.assign(manifest, redact(data)); return data; }, true, noCdp);
    await step('dom-contract', 'DOM via CDP', () => methods.dom(ctx), !!options.scope, noCdp || (!options.scope ? 'no-scope-requested' : null));
    for (const [index, integration] of (overrides.integrations || []).entries()) {
      const info = { index, name: null, status: 'unavailable' };
      let descriptionFailed = false;
      try {
        const description = integration.describe();
        Object.assign(info, redact({ name: description.name, version: description.version, source: description.source, supportedApiVersion: description.supportedApiVersion }));
      } catch { descriptionFailed = true; }
      manifest.integrations.push(info);
      await runStep(`integration-${index}`, 'Optional Integration interpretation', async () => {
        if (descriptionFailed) throw new Error('Integration description unavailable');
        if (await integration.detect(ctx) !== 'available') { info.status = 'unavailable'; return { status: info.status }; }
        const result = await integration.collect(ctx);
        info.status = ['available','unavailable','unsupported','failed'].includes(result?.status) ? result.status : 'failed';
        return integration.redact(result);
      }, false, descriptionFailed ? null : noCdp);
      const record = manifest.steps.at(-1);
      if (record.status === 'failed') info.status = 'failed';
      if (record.status === 'completed' && info.status !== 'available') { record.status = info.status === 'failed' ? 'failed' : info.status === 'unsupported' ? 'unsupported' : 'skipped'; record.reason = info.status; }
    }
    await step('perfetto', 'Perfetto system trace', () => methods.perfetto(ctx), true, noDevice || (!ctx.appPid ? 'app-check-failed' : null));
    await step('bugreport', 'Android system bugreport', () => methods.bugreport(ctx), true, noDevice);
  } finally {
    try { ctx.client?.close(); } catch { /* Forward cleanup and manifest still run. */ }
    if (ctx.forwardPort) await runStep('transport-cleanup', 'ADB forwarding', async () => {
      await ctx.adb('forward', '--remove', `tcp:${ctx.forwardPort}`); return { removed: true };
    }, true);
    manifest.captureEnd = new Date().toISOString();
    for (const status of ['completed','failed','skipped','unsupported']) manifest[status] = manifest.steps.filter(s => s.status === status).map(s => s.name);
    const incomplete = manifest.steps.some(s => s.required && s.status !== 'completed') || !!ctx.deviceCaptureCleanupWarning;
    if (ctx.deviceCaptureCleanupWarning) manifest.deviceCaptureCleanupWarning = true;
    manifest.status = evidenceCount === 0 ? 'failed' : incomplete ? 'partial' : 'complete';
    checkpoint();
  }
  return manifest;
}
module.exports = { evidence, validate };
