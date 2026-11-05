declare namespace environmentProbe {
 interface Mod {name:string;version:string|null;reportedIndex:number;enabled:null;loadOrder:null}
 interface Snapshot {gameVersion:string|null;gameVersionSources:{startConfig:string|null;gameVersionMod:string|null};loaderVersion:string|null;viewport:{width:number;height:number;devicePixelRatio:number};capabilities:{modList:boolean;performanceObserver:boolean;mutationObserver:boolean;indexedDB:boolean};mods:{status:'unavailable'|'available'|'failed';items:Mod[];truncated:boolean;unreadable:number;scope:string;orderBasis:string}}
}
interface Loader {getModListNameNoAlias?():unknown;getMod?(name:string):unknown;version?:unknown}
interface MetadataWindow {modUtils?:Loader|null;StartConfig?:{version?:unknown}|null}
interface ModView {version?:unknown;bootJson?:{version?:unknown}|null}
// Only public loader metadata; no game variables, storage bodies or private stores.
function snapshot():environmentProbe.Snapshot {
  const metadata=window as unknown as MetadataWindow;
  const version = (fn:()=>unknown) => { try { const v = fn(); return typeof v === 'string' && /^[0-9A-Za-z._()+-]{1,64}$/.test(v) ? v : null; } catch { return null; } };
  const utils = metadata.modUtils;
  const mods:environmentProbe.Snapshot['mods'] = { status: 'unavailable', items: [], truncated: false, unreadable: 0,
    scope: 'loader-reported runtime list; imported/disabled inventory not inspected', orderBasis: 'reported-list; execution-order-unverified' };
  let reportedNames:unknown[]|null = null;
  if (typeof utils?.getModListNameNoAlias === 'function' && typeof utils?.getMod === 'function') {
    try {
      const names = utils.getModListNameNoAlias();
      if (!Array.isArray(names)) throw Error('Invalid mod list');
      reportedNames = names;
      mods.status = 'available'; mods.truncated = names.length > 300;
      const seen = new Set();
      for (const [reportedIndex, name] of names.slice(0, 300).entries()) {
        if (typeof name !== 'string' || !name || name.length > 128 || /[\\/\x00-\x1f]/.test(name) || seen.has(name)) { mods.unreadable++; continue; }
        seen.add(name);
        try {
          const mod = utils.getMod(name) as ModView|null|undefined;
          mods.items.push({ name, version: version(() => mod?.version ?? mod?.bootJson?.version), reportedIndex, enabled: null, loadOrder: null });
        } catch { mods.unreadable++; }
      }
    } catch { mods.status = 'failed'; }
  }
  const gameVersionMod = version(() => reportedNames?.includes('GameVersion') ? (utils!.getMod!('GameVersion') as ModView|null|undefined)?.version : null);
  return { gameVersion: version(() => metadata.StartConfig?.version ?? gameVersionMod),
    gameVersionSources: { startConfig: version(() => metadata.StartConfig?.version), gameVersionMod },
    loaderVersion: version(() => typeof utils?.version === 'function' ? utils.version() : utils?.version),
    viewport: { width: innerWidth, height: innerHeight, devicePixelRatio: devicePixelRatio },
    capabilities: { modList: typeof utils?.getModListNameNoAlias === 'function' && typeof utils?.getMod === 'function',
      performanceObserver: typeof PerformanceObserver === 'function', mutationObserver: typeof MutationObserver === 'function',
      indexedDB: typeof indexedDB !== 'undefined' }, mods };
}
const environmentProbe={snapshot};
export = environmentProbe;
