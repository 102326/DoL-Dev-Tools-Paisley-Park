import type collectors from './collectors.cjs';
declare namespace environmentAPI {
 interface Context extends collectors.Context {deviceData?:unknown;appData?:unknown;providerData?:unknown;webviewData?:unknown}
 interface Contract {host?:'chrome';fields:Record<string,string|boolean|number|null>;mods:{name:string|null;version:string|null;reportedIndex:number}[];incomplete:boolean}
 type Change={field:string;before:string|boolean|number|null;after:string|boolean|number|null}|{mod:string|null;kind:'removed-from-reported-list'|'added-to-reported-list'}|{mod:string|null;kind:'changed';fields:('version'|'reportedIndex')[]};
}
interface View {schemaVersion?:unknown;source?:unknown;incomplete?:unknown;[key:string]:unknown}
interface RuntimeView {gameVersionSources?:unknown;viewport?:unknown;capabilities?:unknown;mods?:unknown;[key:string]:unknown}
const {snapshot}:typeof import('./browser/environment.cjs')=require('./browser/environment.cjs');
function provider(output:string) {
  const match = output.match(/Current WebView package \(name, version\):\s*\(([A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+),\s*([0-9A-Za-z._()+-]{1,64})\)/);
  return match ? { status: 'available', package: match[1], version: match[2] }
    : { collectorStatus: 'unsupported', reason: 'webview-provider-format-unrecognized' };
}
async function collectProvider(ctx:Pick<collectors.Context,'adb'>) { return provider((await ctx.adb('shell', 'dumpsys', 'webviewupdate')).toString()); }
async function collect(ctx:environmentAPI.Context) {
  const runtime = await ctx.client!.evaluate(`(${snapshot.toString()})()`);
  const observed=runtime as {mods:{status?:unknown;truncated?:unknown;unreadable?:unknown}};
  return { schemaVersion: 1, source: 'Environment', device: ctx.deviceData || {}, app: ctx.appData || {},
    provider: ctx.providerData || { status: 'unavailable' }, webview: ctx.webviewData || {}, runtime,
    incomplete: observed.mods.status !== 'available' || observed.mods.truncated || (observed.mods.unreadable as number) > 0,
    privateData: 'not inspected' };
}
const fields = {
  device: { model: 'text', androidVersion: 'version' },
  app: { package: 'text', versionName: 'version', versionCode: 'version', foregroundMatches: 'boolean' },
  provider: { status: 'text', package: 'text', version: 'version' },
  webview: { product: 'product', protocolVersion: 'version', jsVersion: 'version' },
  runtime: { gameVersion: 'version', loaderVersion: 'version' },
};
function contract(value:unknown):environmentAPI.Contract {
  const data = ((value as {data?:unknown}|null|undefined)?.data ?? value) as View|null|undefined;
  if (!data || data.schemaVersion !== 1 || !['Environment','Chrome environment'].includes(data.source as string)) throw Error('Unsupported environment snapshot');
  const chrome = data.source === 'Chrome environment';
  const plain = (v:unknown):v is Record<string,unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  const result:environmentAPI.Contract['fields'] = {};
  function scalar(v:unknown,kind:'boolean'):boolean|null;
  function scalar(v:unknown,kind:'text'|'version'|'product'):string|null;
  function scalar(v:unknown,kind:string):string|boolean|null;
  function scalar(v:unknown,kind:string):string|boolean|null {
    if (v === undefined || v === null) return null;
    if (kind === 'boolean') { if (typeof v !== 'boolean') throw Error('Invalid environment field'); return v; }
    if (typeof v !== 'string' || v.length > 128 || /[\\\x00-\x1f]/.test(v)
      || kind !== 'product' && v.includes('/') || kind === 'version' && !/^[0-9A-Za-z._()+-]{1,64}$/.test(v)
      || kind === 'product' && !/^[0-9A-Za-z ._-]+\/[0-9A-Za-z._()+-]{1,64}$/.test(v)) throw Error('Invalid environment field');
    return v;
  };
  const selectedFields = chrome ? { browser: fields.webview, runtime: fields.runtime } : fields;
  for (const [group, properties] of Object.entries(selectedFields)) {
    if (!plain(data[group])) throw Error('Invalid environment group');
    for (const [key, kind] of Object.entries(properties)) result[`${group}.${key}`] = scalar((data[group] as Record<string,unknown>)[key], kind);
  }
  if ((data.runtime as RuntimeView).gameVersionSources !== undefined && !plain((data.runtime as RuntimeView).gameVersionSources)) throw Error('Invalid environment version sources');
  for (const source of ['startConfig','gameVersionMod']) result[`runtime.gameVersionSources.${source}`] = scalar(((data.runtime as RuntimeView).gameVersionSources as Record<string,unknown>|undefined)?.[source], 'version');
  const viewport = (data.runtime as RuntimeView).viewport;
  if (!plain(viewport)) throw Error('Invalid viewport');
  for (const key of ['width','height','devicePixelRatio']) {
    if (!Number.isFinite(viewport[key]) || (viewport[key] as number) < 0) throw Error('Invalid viewport');
    result[`runtime.viewport.${key}`] = viewport[key] as number;
  }
  const capabilities = (data.runtime as RuntimeView).capabilities;
  if (!plain(capabilities)) throw Error('Invalid capabilities');
  for (const key of ['modList','performanceObserver','mutationObserver','indexedDB']) result[`runtime.capabilities.${key}`] = scalar(capabilities[key], 'boolean');
  const mods = (data.runtime as RuntimeView).mods;
  if (!plain(mods) || !['available','unavailable','unsupported','failed'].includes(mods.status as string) || !Array.isArray(mods.items)
    || mods.items.length > 300 || typeof mods.truncated !== 'boolean' || !Number.isSafeInteger(mods.unreadable) || (mods.unreadable as number) < 0) throw Error('Invalid mod metadata');
  result['runtime.mods.status'] = mods.status as string;
  const names = new Set();
  const items = (mods.items as unknown[]).map(item => {
    if (!plain(item) || typeof item.name !== 'string' || !item.name || names.has(item.name)
      || !Number.isSafeInteger(item.reportedIndex) || (item.reportedIndex as number) < 0 || (item.reportedIndex as number) >= 300
      || item.enabled !== null || item.loadOrder !== null) throw Error('Invalid mod metadata');
    names.add(item.name);
    return { name: scalar(item.name,'text'), version: scalar(item.version,'version'), reportedIndex: item.reportedIndex as number };
  });
  return { ...(chrome ? { host: 'chrome' } : {}), fields: result, mods: items, incomplete: mods.status !== 'available' || mods.truncated || (mods.unreadable as number) > 0 || chrome && data.incomplete === true };
}
function diff(before:unknown, after:unknown) {
  const a = contract(before), b = contract(after), changes:environmentAPI.Change[] = [];
  if (a.host !== b.host) throw Error('Environment hosts differ');
  for (const key of Object.keys(a.fields)) if (a.fields[key] !== b.fields[key]) changes.push({ field: key, before: a.fields[key], after: b.fields[key] });
  const old = new Map(a.mods.map(m => [m.name,m])), current = new Map(b.mods.map(m => [m.name,m]));
  for (const name of new Set([...old.keys(),...current.keys()])) {
    const left = old.get(name), right = current.get(name);
    if (!left || !right) changes.push({ mod: name, kind: left ? 'removed-from-reported-list' : 'added-to-reported-list' });
    else {
      const changed = (['version','reportedIndex'] as const).filter(key => left[key] !== right[key]);
      if (changed.length) changes.push({ mod: name, kind: 'changed', fields: changed });
    }
  }
  return { schemaVersion: 1, source: 'Environment comparison', incomplete: a.incomplete || b.incomplete,
    reportedOrderIsNotExecutionOrder: true, changes };
}
const environmentAPI = { snapshot, provider, collectProvider, collect, contract, diff };
export = environmentAPI;
