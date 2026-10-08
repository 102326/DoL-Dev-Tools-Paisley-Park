const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { createHash } = require('node:crypto');
const { connect } = require('./cdp.cjs');
const { expression } = require('./dom.cjs');
const { networkAddress } = require('./privacy.cjs');
const { memory, frames } = require('./performance.cjs');
const exec = promisify(execFile);
function android(options, run = exec) {
  const adb = process.env.DOL_ADB || 'adb';
  const execute = async (args, settings = {}) => {
    const result = await run(adb, ['-s', options.serial, ...args], {
      encoding: 'buffer', timeout: 10000, maxBuffer: 8 * 1024 * 1024, windowsHide: true, ...settings,
    });
    return Buffer.isBuffer(result.stdout) ? result.stdout : Buffer.from(result.stdout || '');
  };
  const invoke = (...args) => execute(args);
  invoke.execute = execute;
  return invoke;
}
async function device(ctx) {
  if ((await ctx.adb('get-state')).toString().trim() !== 'device') throw new Error('Device unavailable');
  const model = (await ctx.adb('shell', 'getprop', 'ro.product.model')).toString().trim();
  const androidVersion = (await ctx.adb('shell', 'getprop', 'ro.build.version.release')).toString().trim();
  const start = Date.now();
  const deviceTime = (await ctx.adb('shell', 'date', '+%s')).toString().trim();
  const end = Date.now(), seconds = /^\d{10}$/.test(deviceTime) ? Number(deviceTime) : null;
  let wakefulness = null;
  try {
    const state = (await ctx.adb('shell','dumpsys','power')).toString().match(/^\s*mWakefulness=(Awake|Asleep|Dozing|DozingSuspend)\s*$/m)?.[1];
    wakefulness = state || null;
  } catch { /* Device power state is conditional metadata. */ }
  ctx.deviceReady = true;
  return { model, androidVersion, wakefulness, explicitDevice: true, serial: '[omitted]',
    deviceTimestamp: seconds === null ? null : new Date(seconds * 1000).toISOString(),
    clockOffsetMs: seconds === null ? null : seconds * 1000 - (start + end) / 2,
    clockUncertaintyMs: 1000 + (end - start) / 2 };
}
async function app(ctx) {
  const output = (await ctx.adb('shell', 'dumpsys', 'package', ctx.options.package)).toString();
  const versionName = output.match(/versionName=([^\s]+)/)?.[1] || null;
  const versionCode = output.match(/versionCode=(\d+)/)?.[1] || null;
  if (!versionName && !versionCode) throw new Error('Package unavailable');
  let pids = [];
  try { pids = (await ctx.adb('shell', 'pidof', ctx.options.package)).toString().trim().split(/\s+/); } catch { /* Installed app may not be running. */ }
  ctx.appPid = pids.length === 1 && /^\d+$/.test(pids[0]) ? pids[0] : null;
  const foreground = (await ctx.adb('shell', 'dumpsys', 'activity', 'activities')).toString();
  const resumed = foreground.match(/(?:mResumedActivity|topResumedActivity)[^\n]*/)?.[0];
  return { package: ctx.options.package, versionName, versionCode, uniqueRunningProcess: !!ctx.appPid,
    foregroundMatches: resumed ? resumed.includes(`${ctx.options.package}/`) : null };
}
async function screenshot(ctx) {
  const png = await ctx.adb('exec-out', 'screencap', '-p');
  if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Invalid screenshot');
  return { binary: png, extension: 'png', metadata: { width: png.readUInt32BE(16), height: png.readUInt32BE(20),
    source: 'current device screen; may differ from target app', requiresPrivacyReview: true } };
}
async function forward(ctx) {
  if (!ctx.appPid) throw new Error('App identity unavailable');
  if ((await ctx.adb('shell', 'pidof', ctx.options.package)).toString().trim() !== ctx.appPid) throw new Error('App process changed');
  const sockets = (await ctx.adb('shell', 'cat', '/proc/net/unix')).toString();
  const candidates = ['webview_devtools_remote_', 'browser_webview_devtools_remote_'].map(prefix => `${prefix}${ctx.appPid}`)
    .filter(name => sockets.split('\n').some(line => line.trim().endsWith(`@${name}`)));
  const name = ctx.options.webviewSocket || (candidates.length === 1 ? candidates[0] : null);
  if (!name || !candidates.includes(name)) throw new Error('App WebView socket unavailable');
  const port = (await ctx.adb('forward', 'tcp:0', `localabstract:${name}`)).toString().trim();
  if (!/^\d{1,5}$/.test(port) || Number(port) < 1 || Number(port) > 65535) throw new Error('Invalid forwarding port');
  ctx.forwardPort = port;
  ctx.forwardRemote = `localabstract:${name}`;
  ctx.endpoint = `http://127.0.0.1:${port}`;
  return { appProcessSocketVerified: true, temporaryForward: true };
}
async function removeForward(ctx) {
  const port = ctx.forwardPort, remote = ctx.forwardRemote, adb = ctx.cleanupAdb || ctx.adb;
  if (!/^\d{1,5}$/.test(port || '') || !remote || !ctx.options.serial) throw Error('Forward ownership unavailable');
  const mappings = async () => (await adb('forward','--list')).toString().trim().split('\n').map(line => line.trim().split(/\s+/));
  const own = rows => rows.filter(row => row[0] === ctx.options.serial && row[1] === `tcp:${port}`);
  const matches = own(await mappings());
  if (matches.length !== 1 || matches[0].length !== 3 || matches[0][2] !== remote) throw Error('Forward ownership changed');
  // ponytail: ADB has no compare-and-remove; callers must not share/rebind this dynamic port during cleanup.
  await adb('forward','--remove',`tcp:${port}`);
  if (own(await mappings()).length) throw Error('Forward removal unconfirmed');
  ctx.forwardPort = undefined; ctx.forwardRemote = undefined;
  return { removed: true };
}
function events() {
  const consoleEvents = [], network = [], active = new Map();
  let omittedConsole = 0, omittedNetwork = 0, stopped = false;
  const add = (list, value) => { if (list.length < 200) { list.push(value); return true; } return false; };
  const epoch = value => Number.isFinite(value) && value >= 0 ? value : null;
  const allowed = (value, values) => values.includes(value) ? value : 'other';
  function onEvent(method, p = {}) {
    if (stopped) return;
    if (method === 'Runtime.consoleAPICalled') {
      if (!add(consoleEvents, { kind: 'console', level: allowed(p.type, ['error','warning','log','info','debug']),
        timestampMs: epoch(p.timestamp), argumentCount: Array.isArray(p.args) ? p.args.length : 0, content: 'omitted' })) omittedConsole++;
    } else if (method === 'Runtime.exceptionThrown') {
      const detail = p.exceptionDetails || {};
      if (!add(consoleEvents, { kind: 'exception', timestampMs: epoch(p.timestamp), content: 'omitted',
        exceptionClass: allowed(detail.exception?.className, ['Error','TypeError','ReferenceError','SyntaxError','RangeError','URIError','EvalError']),
        lineNumber: Number.isSafeInteger(detail.lineNumber) && detail.lineNumber >= 0 ? detail.lineNumber : null,
        columnNumber: Number.isSafeInteger(detail.columnNumber) && detail.columnNumber >= 0 ? detail.columnNumber : null,
        scriptHash: typeof detail.url === 'string' ? createHash('sha256').update(detail.url).digest('hex').slice(0,16) : null })) omittedConsole++;
    } else if (method === 'Network.requestWillBeSent') {
      if (!active.has(p.requestId) && network.length >= 200) { omittedNetwork++; return; }
      const entry = { ...networkAddress(p.request?.url), method: allowed(p.request?.method, ['GET','POST','PUT','DELETE','PATCH','HEAD','OPTIONS']),
        resourceType: allowed(p.type, ['Document','Stylesheet','Image','Media','Font','Script','XHR','Fetch','WebSocket','Other']),
        timestampSeconds: epoch(p.wallTime), startedMonotonicSeconds: epoch(p.timestamp), status: null, durationMs: null, failed: false };
      if (!add(network, entry)) { omittedNetwork++; return; }
      active.set(p.requestId, entry);
    } else if (method === 'Network.responseReceived') {
      const entry = active.get(p.requestId);
      if (entry) entry.status = Number.isInteger(p.response?.status) ? p.response.status : null;
    } else if (method === 'Network.loadingFinished' || method === 'Network.loadingFailed') {
      const entry = active.get(p.requestId);
      if (entry) {
        entry.failed = method === 'Network.loadingFailed';
        if (Number.isFinite(p.timestamp) && entry.startedMonotonicSeconds !== null) entry.durationMs = Math.max(0, (p.timestamp - entry.startedMonotonicSeconds) * 1000);
        active.delete(p.requestId);
      }
    }
  }
  return { onEvent, stop: () => { stopped = true; }, snapshot: () => ({ console: consoleEvents, network, omittedConsole, omittedNetwork,
    contentPolicy: 'no console text, headers, bodies, URL paths or query; hostname hashed', history: 'received during this connection; Runtime may replay cached events; live versus replay unknown' }) };
}
async function cdp(ctx) {
  if (!ctx.endpoint) throw new Error('Verified WebView endpoint unavailable');
  const capture = events();
  const client = await (ctx.connect || connect)(ctx.endpoint, Math.max(10000, (ctx.options.timelineMs || 0) + 5000), capture.onEvent, ctx.options.targetId || null);
  ctx.client = client;
  const channels = {};
  const start = new Date().toISOString();
  for (const domain of ['Runtime', 'Network']) {
    try { await client.send(`${domain}.enable`); channels[domain] = 'available'; }
    catch { channels[domain] = 'unsupported'; }
  }
  await new Promise(resolve => setTimeout(resolve, ctx.options.windowMs));
  capture.stop();
  if (client.isOpen && !client.isOpen()) throw new Error('CDP connection closed before result');
  ctx.capture = capture;
  ctx.channels = channels;
  ctx.cdpWindow = { captureStart: start, captureEnd: new Date().toISOString() };
  return { channels, ...ctx.cdpWindow, history: 'receive window includes domain enable; Runtime may replay cached events; not complete history or a live-event rate' };
}
async function consoleSummary(ctx) {
  if (ctx.channels?.Runtime !== 'available') return { collectorStatus: 'unsupported', reason: 'runtime-events-unavailable' };
  const data = ctx.capture.snapshot();
  return { ...ctx.cdpWindow, events: data.console, omitted: data.omittedConsole, content: 'omitted',
    history: data.history, windowMeaning: 'host receive window, not event occurrence window',
    timestampOrigin: 'CDP Runtime target Unix milliseconds; not host receipt time; clocks may differ',
    liveVersusReplay: 'unknown', limit: 200, truncated: data.omittedConsole > 0 };
}
async function networkSummary(ctx) {
  if (ctx.channels?.Network !== 'available') return { collectorStatus: 'unsupported', reason: 'network-events-unavailable' };
  const data = ctx.capture.snapshot();
  return { ...ctx.cdpWindow, requests: data.network, omitted: data.omittedNetwork, contentPolicy: data.contentPolicy };
}
async function webview(ctx) {
  if (!ctx.client) throw new Error('CDP unavailable');
  const version = await ctx.client.send('Browser.getVersion');
  const viewport = await ctx.client.evaluate('({width:innerWidth,height:innerHeight})');
  return { product: version.product, protocolVersion: version.protocolVersion, jsVersion: version.jsVersion, viewport };
}
async function dom(ctx) {
  if (!ctx.client) throw new Error('CDP unavailable');
  return { ...await ctx.client.evaluate(expression(ctx.options.scope)), scopeHash: createHash('sha256').update(ctx.options.scope).digest('hex') };
}
async function css(ctx) {
  return { ...await ctx.client.evaluate(require('./css.cjs').expression(ctx.options.scope)),
    scopeHash: createHash('sha256').update(ctx.options.scope).digest('hex') };
}
async function versions(ctx) {
  if (!ctx.client) throw new Error('CDP unavailable');
  return ctx.client.evaluate(`(() => {
    const read = fn => {try {const v=fn(); return typeof v==='string' && /^[0-9A-Za-z._()+-]{1,64}$/.test(v) ? v : null} catch {return null}};
    const gameVersion=read(()=>window.modUtils?.getMod?.('GameVersion')?.version);
    return {gameVersion,gameVersionSources:{gameVersionMod:gameVersion,startConfig:read(()=>window.StartConfig?.version)},
      loaderVersion:read(()=>typeof window.modUtils?.version==='function' ? window.modUtils.version() : window.modUtils?.version)};
  })()`);
}
async function gfx(ctx) { return frames((await ctx.adb('shell', 'dumpsys', 'gfxinfo', ctx.options.package, 'framestats')).toString()); }
async function mem(ctx) { return memory((await ctx.adb('shell', 'dumpsys', 'meminfo', ctx.options.package)).toString()); }
module.exports = { android, device, app, screenshot, forward, removeForward, cdp, consoleSummary, networkSummary, webview, dom, versions, gfx, mem, events,
  css, provider: require('./environment.cjs').collectProvider, environment: require('./environment.cjs').collect };
