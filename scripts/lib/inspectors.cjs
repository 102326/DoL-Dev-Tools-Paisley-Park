// Generated from inspectors.cts by TypeScript 6.0.2; source-lf-sha256=307bc7d0e335e6378e3ffebe257a9a3657cd461706803550a22f2229bda0f28d
"use strict";
const { inspect, storage } = require('./browser/inspectors.cjs');
const selectorHealth = (scope) => inspect('selector-health', scope);
const accessibility = (scope) => inspect('accessibility', scope);
const overlays = (scope) => inspect('overlays', scope);
const scroll = (scope) => inspect('scroll', scope);
const ownership = (scope) => inspect('ownership', scope);
const hitboxes = (scope) => inspect('hitboxes', scope);
const modes = { 'selector-health': selectorHealth, accessibility, overlays, scroll, ownership, hitboxes, storage };
const domModes = Object.keys(modes).filter(mode => mode !== 'storage');
function expression(mode, scope) {
    if (!Object.prototype.hasOwnProperty.call(modes, mode))
        throw new Error('Invalid inspector');
    if (mode === 'storage')
        return `(${storage.toString()})()`;
    if (typeof scope !== 'string' || !scope || scope.length > 256)
        throw new Error('Invalid scope');
    return `(${inspect.toString()})(${JSON.stringify(mode)}, ${JSON.stringify(scope)})`;
}
function storageDiff(before, after) {
    const contract = (value) => {
        const data = (value?.data ?? value);
        if (data?.schemaVersion !== 1 || data.source !== 'storage')
            throw new Error('Invalid storage metadata');
        const hash = (value) => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
        const section = (raw) => {
            const item = raw;
            return item && ['available', 'partial', 'unsupported'].includes(item.status) &&
                Number.isSafeInteger(item.omitted) && item.omitted >= 0 &&
                (item.count === null || Number.isSafeInteger(item.count) && item.count >= 0) &&
                Array.isArray(item.keys) && item.keys.length <= 200 &&
                item.keys.every((key) => hash(key.hash)) && new Set(item.keys.map((key) => key.hash)).size === item.keys.length;
        };
        if (!section(data.local) || !section(data.session) || !data.indexedDB ||
            !Number.isSafeInteger(data.indexedDB.omitted) || data.indexedDB.omitted < 0 ||
            !['available', 'partial', 'unsupported'].includes(data.indexedDB.status) ||
            !Array.isArray(data.indexedDB.databases) || data.indexedDB.databases.length > 10)
            throw new Error('Invalid storage metadata');
        const dbs = data.indexedDB.databases;
        if (new Set(dbs.map((db) => db.nameHash)).size !== dbs.length || dbs.some((db) => !hash(db.nameHash) ||
            !['available', 'partial', 'unsupported', 'timeout', 'changed-during-inspection'].includes(db.status) ||
            !Number.isSafeInteger(db.omitted) || db.omitted < 0 ||
            !Number.isSafeInteger(db.version) || db.version < 1 ||
            !Array.isArray(db.stores) || db.stores.length > 50 ||
            new Set(db.stores.map((store) => store.nameHash)).size !== db.stores.length ||
            db.stores.some((store) => !hash(store.nameHash) || !['available', 'unsupported'].includes(store.status) ||
                (store.count !== null && (!Number.isSafeInteger(store.count) || store.count < 0)))))
            throw new Error('Invalid storage metadata');
        return data;
    };
    const a = contract(before), b = contract(after), changes = [];
    for (const area of ['local', 'session']) {
        if ([a[area], b[area]].some(section => section.status !== 'available' || section.omitted > 0)) {
            changes.push({ area, kind: 'unobserved' });
            continue;
        }
        if (a[area].count !== b[area].count)
            changes.push({ area, kind: 'count', before: a[area].count, after: b[area].count });
        const old = new Set(a[area].keys.map(key => key.hash)), current = new Set(b[area].keys.map(key => key.hash));
        for (const hash of old)
            if (!current.has(hash))
                changes.push({ area, kind: 'removed', hash });
        for (const hash of current)
            if (!old.has(hash))
                changes.push({ area, kind: 'added', hash });
    }
    const oldDb = new Map(a.indexedDB.databases.map(db => [db.nameHash, db]));
    const newDb = new Map(b.indexedDB.databases.map(db => [db.nameHash, db]));
    const databasesComplete = [a.indexedDB, b.indexedDB].every(section => section.status === 'available' && section.omitted === 0);
    if (!databasesComplete)
        changes.push({ area: 'indexedDB', kind: 'unobserved' });
    for (const hash of databasesComplete ? new Set([...oldDb.keys(), ...newDb.keys()]) : []) {
        const left = oldDb.get(hash), right = newDb.get(hash);
        if (!left || !right) {
            changes.push({ area: 'indexedDB', kind: left ? 'removed' : 'added', hash });
            continue;
        }
        if ([left, right].some(db => db.status !== 'available' || db.omitted > 0 || db.stores.some(store => store.status !== 'available'))) {
            changes.push({ area: 'indexedDB', hash, kind: 'unobserved' });
            continue;
        }
        if (left.version !== right.version)
            changes.push({ area: 'indexedDB', kind: 'version', hash, before: left.version, after: right.version });
        const oldStores = new Map(left.stores.map(store => [store.nameHash, store]));
        const newStores = new Map(right.stores.map(store => [store.nameHash, store]));
        for (const storeHash of new Set([...oldStores.keys(), ...newStores.keys()])) {
            const x = oldStores.get(storeHash), y = newStores.get(storeHash);
            if (!x || !y)
                changes.push({ area: 'indexedDB', databaseHash: hash, kind: x ? 'store-removed' : 'store-added', hash: storeHash });
            else if (x.count !== y.count)
                changes.push({ area: 'indexedDB', databaseHash: hash, kind: 'count', hash: storeHash, before: x.count, after: y.count });
        }
    }
    const incomplete = (data) => [data.local, data.session, data.indexedDB].some(area => area.status !== 'available' || area.omitted > 0) ||
        data.indexedDB.databases.some(db => db.status !== 'available' || db.omitted > 0 || db.stores.some(store => store.status !== 'available'));
    return { schemaVersion: 1, source: 'storage comparison', changes, incomplete: incomplete(a) || incomplete(b),
        identityNotProven: true, absenceDoesNotProveDeletion: true };
}
async function collect(ctx, mode) {
    const source = expression(mode, ctx.options.scope);
    const data = await ctx.client.evaluate(source);
    return { ...data, ...(mode === 'storage' ? {} : { scopeHash: require('node:crypto').createHash('sha256').update(ctx.options.scope).digest('hex') }) };
}
const api = { selectorHealth, accessibility, overlays, scroll, ownership, hitboxes, storage, expression, storageDiff, domModes, collect };
module.exports = api;
