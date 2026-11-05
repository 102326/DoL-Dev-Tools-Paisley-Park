// Generated from environment.cts by TypeScript 6.0.2; source-lf-sha256=a1dff8100fbb7c8124d443699b8d3b6afc729c5d2421202f0742c6272c4bbd07
"use strict";
// Only public loader metadata; no game variables, storage bodies or private stores.
function snapshot() {
    const metadata = window;
    const version = (fn) => { try {
        const v = fn();
        return typeof v === 'string' && /^[0-9A-Za-z._()+-]{1,64}$/.test(v) ? v : null;
    }
    catch {
        return null;
    } };
    const utils = metadata.modUtils;
    const mods = { status: 'unavailable', items: [], truncated: false, unreadable: 0,
        scope: 'loader-reported runtime list; imported/disabled inventory not inspected', orderBasis: 'reported-list; execution-order-unverified' };
    let reportedNames = null;
    if (typeof utils?.getModListNameNoAlias === 'function' && typeof utils?.getMod === 'function') {
        try {
            const names = utils.getModListNameNoAlias();
            if (!Array.isArray(names))
                throw Error('Invalid mod list');
            reportedNames = names;
            mods.status = 'available';
            mods.truncated = names.length > 300;
            const seen = new Set();
            for (const [reportedIndex, name] of names.slice(0, 300).entries()) {
                if (typeof name !== 'string' || !name || name.length > 128 || /[\\/\x00-\x1f]/.test(name) || seen.has(name)) {
                    mods.unreadable++;
                    continue;
                }
                seen.add(name);
                try {
                    const mod = utils.getMod(name);
                    mods.items.push({ name, version: version(() => mod?.version ?? mod?.bootJson?.version), reportedIndex, enabled: null, loadOrder: null });
                }
                catch {
                    mods.unreadable++;
                }
            }
        }
        catch {
            mods.status = 'failed';
        }
    }
    const gameVersionMod = version(() => reportedNames?.includes('GameVersion') ? utils.getMod('GameVersion')?.version : null);
    return { gameVersion: version(() => metadata.StartConfig?.version ?? gameVersionMod),
        gameVersionSources: { startConfig: version(() => metadata.StartConfig?.version), gameVersionMod },
        loaderVersion: version(() => typeof utils?.version === 'function' ? utils.version() : utils?.version),
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio: devicePixelRatio },
        capabilities: { modList: typeof utils?.getModListNameNoAlias === 'function' && typeof utils?.getMod === 'function',
            performanceObserver: typeof PerformanceObserver === 'function', mutationObserver: typeof MutationObserver === 'function',
            indexedDB: typeof indexedDB !== 'undefined' }, mods };
}
const environmentProbe = { snapshot };
module.exports = environmentProbe;
