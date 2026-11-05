import type browserInspectors from './browser/inspectors.cjs';
import type collectors from './collectors.cjs';
interface StorageContract {local:browserInspectors.StorageSection;session:browserInspectors.StorageSection;indexedDB:browserInspectors.IndexedSection}
interface SectionView {status?:unknown;omitted?:unknown;count?:unknown;keys?:unknown}
interface DatabaseView {nameHash?:unknown;status?:unknown;omitted?:unknown;version?:unknown;stores?:unknown}
interface StoreView {nameHash?:unknown;status?:unknown;count?:unknown}
const {inspect,storage}:typeof import('./browser/inspectors.cjs')=require('./browser/inspectors.cjs');
const selectorHealth = (scope:string|undefined) => inspect('selector-health', scope);
const accessibility = (scope:string|undefined) => inspect('accessibility', scope);
const overlays = (scope:string|undefined) => inspect('overlays', scope);
const scroll = (scope:string|undefined) => inspect('scroll', scope);
const ownership = (scope:string|undefined) => inspect('ownership', scope);
const hitboxes = (scope:string|undefined) => inspect('hitboxes', scope);

const modes = { 'selector-health': selectorHealth, accessibility, overlays, scroll, ownership, hitboxes, storage };
const domModes = Object.keys(modes).filter(mode => mode !== 'storage');
function expression(mode:string, scope?:string) {
  if (!Object.prototype.hasOwnProperty.call(modes, mode)) throw new Error('Invalid inspector');
  if (mode === 'storage') return `(${storage.toString()})()`;
  if (typeof scope !== 'string' || !scope || scope.length > 256) throw new Error('Invalid scope');
  return `(${inspect.toString()})(${JSON.stringify(mode)}, ${JSON.stringify(scope)})`;
}

function storageDiff(before:unknown, after:unknown) {
  const contract = (value:unknown):StorageContract => {
    const data = ((value as {data?:unknown}|null|undefined)?.data ?? value) as {schemaVersion?:unknown;source?:unknown;local?:unknown;session?:unknown;indexedDB?:{omitted?:unknown;status?:unknown;databases?:unknown}}|null|undefined;
    if (data?.schemaVersion !== 1 || data.source !== 'storage') throw new Error('Invalid storage metadata');
    const hash = (value:unknown) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
    const section = (raw:unknown) => {const item=raw as SectionView|null|undefined;return item && ['available', 'partial', 'unsupported'].includes(item.status as string) &&
      Number.isSafeInteger(item.omitted) && (item.omitted as number) >= 0 &&
      (item.count === null || Number.isSafeInteger(item.count) && (item.count as number) >= 0) &&
      Array.isArray(item.keys) && item.keys.length <= 200 &&
      item.keys.every((key:{hash?:unknown}) => hash(key.hash)) && new Set(item.keys.map((key:{hash?:unknown}) => key.hash)).size === item.keys.length;};
    if (!section(data.local) || !section(data.session) || !data.indexedDB ||
        !Number.isSafeInteger(data.indexedDB.omitted) || (data.indexedDB.omitted as number) < 0 ||
        !['available', 'partial', 'unsupported'].includes(data.indexedDB.status as string) ||
        !Array.isArray(data.indexedDB.databases) || data.indexedDB.databases.length > 10) throw new Error('Invalid storage metadata');
    const dbs = data.indexedDB.databases;
    if (new Set(dbs.map((db:DatabaseView) => db.nameHash)).size !== dbs.length || dbs.some((db:DatabaseView) => !hash(db.nameHash) ||
        !['available','partial','unsupported','timeout','changed-during-inspection'].includes(db.status as string) ||
        !Number.isSafeInteger(db.omitted) || (db.omitted as number) < 0 ||
        !Number.isSafeInteger(db.version) || (db.version as number) < 1 ||
        !Array.isArray(db.stores) || db.stores.length > 50 ||
        new Set(db.stores.map((store:StoreView) => store.nameHash)).size !== db.stores.length ||
        db.stores.some((store:StoreView) => !hash(store.nameHash) || !['available','unsupported'].includes(store.status as string) ||
          (store.count !== null && (!Number.isSafeInteger(store.count) || (store.count as number) < 0))))) throw new Error('Invalid storage metadata');
    return data as unknown as StorageContract;
  };
  const a = contract(before), b = contract(after), changes:{area:string;kind:string;hash?:string;databaseHash?:string;before?:number|null;after?:number|null}[] = [];
  for (const area of ['local', 'session'] as const) {
    if ([a[area],b[area]].some(section => section.status !== 'available' || section.omitted > 0)) { changes.push({area,kind:'unobserved'}); continue; }
    if (a[area].count !== b[area].count) changes.push({ area, kind: 'count', before: a[area].count, after: b[area].count });
    const old = new Set(a[area].keys.map(key => key.hash)), current = new Set(b[area].keys.map(key => key.hash));
    for (const hash of old) if (!current.has(hash)) changes.push({ area, kind: 'removed', hash });
    for (const hash of current) if (!old.has(hash)) changes.push({ area, kind: 'added', hash });
  }
  const oldDb = new Map(a.indexedDB.databases.map(db => [db.nameHash, db]));
  const newDb = new Map(b.indexedDB.databases.map(db => [db.nameHash, db]));
  const databasesComplete = [a.indexedDB,b.indexedDB].every(section => section.status === 'available' && section.omitted === 0);
  if (!databasesComplete) changes.push({area:'indexedDB',kind:'unobserved'});
  for (const hash of databasesComplete ? new Set([...oldDb.keys(), ...newDb.keys()]) : []) {
    const left = oldDb.get(hash), right = newDb.get(hash);
    if (!left || !right) { changes.push({ area: 'indexedDB', kind: left ? 'removed' : 'added', hash }); continue; }
    if ([left,right].some(db => db.status !== 'available' || db.omitted > 0 || db.stores.some(store => store.status !== 'available'))) {changes.push({area:'indexedDB',hash,kind:'unobserved'});continue;}
    if (left.version !== right.version) changes.push({ area: 'indexedDB', kind: 'version', hash, before: left.version, after: right.version });
    const oldStores = new Map(left.stores.map(store => [store.nameHash, store]));
    const newStores = new Map(right.stores.map(store => [store.nameHash, store]));
    for (const storeHash of new Set([...oldStores.keys(), ...newStores.keys()])) {
      const x = oldStores.get(storeHash), y = newStores.get(storeHash);
      if (!x || !y) changes.push({ area: 'indexedDB', databaseHash: hash, kind: x ? 'store-removed' : 'store-added', hash: storeHash });
      else if (x.count !== y.count) changes.push({ area: 'indexedDB', databaseHash: hash, kind: 'count', hash: storeHash, before: x.count, after: y.count });
    }
  }
  const incomplete = (data:StorageContract) => [data.local, data.session, data.indexedDB].some(area => area.status !== 'available' || area.omitted > 0) ||
    data.indexedDB.databases.some(db => db.status !== 'available' || db.omitted > 0 || db.stores.some(store => store.status !== 'available'));
  return { schemaVersion: 1, source: 'storage comparison', changes, incomplete: incomplete(a) || incomplete(b),
    identityNotProven: true, absenceDoesNotProveDeletion: true };
}
async function collect(ctx:Pick<collectors.Context,'options'|'client'>, mode:string) {
  const source = expression(mode, ctx.options.scope);
  const data = await ctx.client!.evaluate(source);
  return { ...data as object|null|undefined, ...(mode === 'storage' ? {} : { scopeHash: require('node:crypto').createHash('sha256').update(ctx.options.scope!).digest('hex') }) };
}
const api = { selectorHealth, accessibility, overlays, scroll, ownership, hitboxes, storage, expression, storageDiff, domModes, collect };
export = api;
