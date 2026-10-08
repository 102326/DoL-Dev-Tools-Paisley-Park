// Only public loader metadata; no game variables, storage bodies or private stores.
function snapshot() {
  const version = fn => { try { const v = fn(); return typeof v === 'string' && /^[0-9A-Za-z._()+-]{1,64}$/.test(v) ? v : null; } catch { return null; } };
  const utils = window.modUtils;
  const mods = { status: 'unavailable', items: [], truncated: false, unreadable: 0,
    scope: 'loader-reported runtime list; imported/disabled inventory not inspected', orderBasis: 'reported-list; execution-order-unverified' };
  if (typeof utils?.getModListNameNoAlias === 'function' && typeof utils?.getMod === 'function') {
    try {
      const names = utils.getModListNameNoAlias();
      if (!Array.isArray(names)) throw Error('Invalid mod list');
      mods.status = 'available'; mods.truncated = names.length > 300;
      const seen = new Set();
      for (const [reportedIndex, name] of names.slice(0, 300).entries()) {
        if (typeof name !== 'string' || !name || name.length > 128 || /[\\/\x00-\x1f]/.test(name) || seen.has(name)) { mods.unreadable++; continue; }
        seen.add(name);
        try {
          const mod = utils.getMod(name);
          mods.items.push({ name, version: version(() => mod?.version ?? mod?.bootJson?.version), reportedIndex, enabled: null, loadOrder: null });
        } catch { mods.unreadable++; }
      }
    } catch { mods.status = 'failed'; }
  }
  return { gameVersion: version(() => window.StartConfig?.version ?? utils?.getMod?.('GameVersion')?.version),
    gameVersionSources: { startConfig: version(() => window.StartConfig?.version), gameVersionMod: version(() => utils?.getMod?.('GameVersion')?.version) },
    loaderVersion: version(() => typeof utils?.version === 'function' ? utils.version() : utils?.version),
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio: devicePixelRatio },
    capabilities: { modList: typeof utils?.getModListNameNoAlias === 'function' && typeof utils?.getMod === 'function',
      performanceObserver: typeof PerformanceObserver === 'function', mutationObserver: typeof MutationObserver === 'function',
      indexedDB: typeof indexedDB !== 'undefined' }, mods };
}
function provider(output) {
  const match = output.match(/Current WebView package \(name, version\):\s*\(([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+),\s*([0-9A-Za-z._()+-]{1,64})\)/);
  return match ? { status: 'available', package: match[1], version: match[2] }
    : { collectorStatus: 'unsupported', reason: 'webview-provider-format-unrecognized' };
}
async function collectProvider(ctx) { return provider((await ctx.adb('shell', 'dumpsys', 'webviewupdate')).toString()); }
async function collect(ctx) {
  const runtime = await ctx.client.evaluate(`(${snapshot.toString()})()`);
  return { schemaVersion: 1, source: 'Environment', device: ctx.deviceData || {}, app: ctx.appData || {},
    provider: ctx.providerData || { status: 'unavailable' }, webview: ctx.webviewData || {}, runtime,
    incomplete: runtime.mods.status !== 'available' || runtime.mods.truncated || runtime.mods.unreadable > 0,
    privateData: 'not inspected' };
}
const fields = {
  device: { model: 'text', androidVersion: 'version' },
  app: { package: 'text', versionName: 'version', versionCode: 'version', foregroundMatches: 'boolean' },
  provider: { status: 'text', package: 'text', version: 'version' },
  webview: { product: 'product', protocolVersion: 'version', jsVersion: 'version' },
  runtime: { gameVersion: 'version', loaderVersion: 'version' },
};
function contract(value) {
  const data = value?.data ?? value;
  if (!data || data.schemaVersion !== 1 || data.source !== 'Environment') throw Error('Unsupported environment snapshot');
  const plain = v => v && typeof v === 'object' && !Array.isArray(v);
  const result = {};
  const scalar = (v, kind) => {
    if (v === undefined || v === null) return null;
    if (kind === 'boolean') { if (typeof v !== 'boolean') throw Error('Invalid environment field'); return v; }
    if (typeof v !== 'string' || v.length > 128 || /[\\\x00-\x1f]/.test(v)
      || kind !== 'product' && v.includes('/') || kind === 'version' && !/^[0-9A-Za-z._()+-]{1,64}$/.test(v)
      || kind === 'product' && !/^[0-9A-Za-z ._-]+\/[0-9A-Za-z._()+-]{1,64}$/.test(v)) throw Error('Invalid environment field');
    return v;
  };
  for (const [group, properties] of Object.entries(fields)) {
    if (!plain(data[group])) throw Error('Invalid environment group');
    for (const [key, kind] of Object.entries(properties)) result[`${group}.${key}`] = scalar(data[group][key], kind);
  }
  if (data.runtime.gameVersionSources !== undefined && !plain(data.runtime.gameVersionSources)) throw Error('Invalid environment version sources');
  for (const source of ['startConfig','gameVersionMod']) result[`runtime.gameVersionSources.${source}`] = scalar(data.runtime.gameVersionSources?.[source], 'version');
  const viewport = data.runtime.viewport;
  if (!plain(viewport)) throw Error('Invalid viewport');
  for (const key of ['width','height','devicePixelRatio']) {
    if (!Number.isFinite(viewport[key]) || viewport[key] < 0) throw Error('Invalid viewport');
    result[`runtime.viewport.${key}`] = viewport[key];
  }
  const capabilities = data.runtime.capabilities;
  if (!plain(capabilities)) throw Error('Invalid capabilities');
  for (const key of ['modList','performanceObserver','mutationObserver','indexedDB']) result[`runtime.capabilities.${key}`] = scalar(capabilities[key], 'boolean');
  const mods = data.runtime.mods;
  if (!plain(mods) || !['available','unavailable','unsupported','failed'].includes(mods.status) || !Array.isArray(mods.items)
    || mods.items.length > 300 || typeof mods.truncated !== 'boolean' || !Number.isSafeInteger(mods.unreadable) || mods.unreadable < 0) throw Error('Invalid mod metadata');
  result['runtime.mods.status'] = mods.status;
  const names = new Set();
  const items = mods.items.map(item => {
    if (!plain(item) || typeof item.name !== 'string' || !item.name || names.has(item.name)
      || !Number.isSafeInteger(item.reportedIndex) || item.reportedIndex < 0 || item.reportedIndex >= 300
      || item.enabled !== null || item.loadOrder !== null) throw Error('Invalid mod metadata');
    names.add(item.name);
    return { name: scalar(item.name,'text'), version: scalar(item.version,'version'), reportedIndex: item.reportedIndex };
  });
  return { fields: result, mods: items, incomplete: mods.status !== 'available' || mods.truncated || mods.unreadable > 0 };
}
function diff(before, after) {
  const a = contract(before), b = contract(after), changes = [];
  for (const key of Object.keys(a.fields)) if (a.fields[key] !== b.fields[key]) changes.push({ field: key, before: a.fields[key], after: b.fields[key] });
  const old = new Map(a.mods.map(m => [m.name,m])), current = new Map(b.mods.map(m => [m.name,m]));
  for (const name of new Set([...old.keys(),...current.keys()])) {
    const left = old.get(name), right = current.get(name);
    if (!left || !right) changes.push({ mod: name, kind: left ? 'removed-from-reported-list' : 'added-to-reported-list' });
    else {
      const changed = ['version','reportedIndex'].filter(key => left[key] !== right[key]);
      if (changed.length) changes.push({ mod: name, kind: 'changed', fields: changed });
    }
  }
  return { schemaVersion: 1, source: 'Environment comparison', incomplete: a.incomplete || b.incomplete,
    reportedOrderIsNotExecutionOrder: true, changes };
}
module.exports = { snapshot, provider, collectProvider, collect, contract, diff };
