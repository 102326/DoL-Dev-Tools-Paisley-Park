// Generated from inspectors.cts by TypeScript 6.0.2; source-lf-sha256=0a6ff0fe65482ee460bb4bfba82713a943e5385e9344807cb73cca07d714b925
"use strict";
function inspect(mode, scope) {
    if (typeof scope !== 'string' || !scope || scope.length > 256)
        throw new Error('Invalid scope');
    const roots = document.querySelectorAll(scope);
    if (mode === 'selector-health') {
        const reasons = [];
        if (/:nth-(?:child|of-type)\(/i.test(scope))
            reasons.push('nth-child or nth-of-type');
        if (/[+~]/.test(scope))
            reasons.push('sibling combinator');
        if (/:contains\(|:has-text\(|text\(\)/i.test(scope))
            reasons.push('text dependency');
        if ((scope.match(/\.[A-Za-z_][\w-]*/g) || []).length > 3)
            reasons.push('long class chain');
        if (/\b[xy]\s*[:=]\s*\d+/i.test(scope))
            reasons.push('coordinate dependency');
        return { schemaVersion: 1, source: 'selector-health', count: roots.length, unique: roots.length === 1,
            heuristicOnly: true, fragilityReasons: reasons };
    }
    if (roots.length !== 1)
        throw new Error('Scope must match exactly one element');
    const root = roots[0], nodes = [], maxNodes = 200, maxDepth = 8;
    let truncated = false;
    const rect = (node) => {
        const box = node.getBoundingClientRect(), out = {};
        for (const key of ['x', 'y', 'width', 'height']) {
            out[key] = Number.isFinite(box[key]) ? box[key] : 0;
            if (!Number.isFinite(box[key]))
                truncated = true;
        }
        return out;
    };
    const metric = (value) => Number.isFinite(value) && value >= 0 ? value : 0;
    const opaque = (value) => {
        if (typeof value !== 'string')
            return null;
        const hex = value.match(/^#([\da-f]{3}|[\da-f]{6})$/i);
        if (hex) {
            const digits = hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1];
            return [0, 2, 4].map(i => parseInt(digits.slice(i, i + 2), 16));
        }
        const rgb = value.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
        if (rgb) {
            const values = rgb.slice(1).map(Number);
            return values.every(n => n <= 255) ? values : null;
        }
        return null;
    };
    const luminance = (rgb) => rgb.map(channel => {
        const x = channel / 255;
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
    }).reduce((sum, value, i) => sum + value * [0.2126, 0.7152, 0.0722][i], 0);
    function visit(node, address, parent, depth) {
        if (nodes.length >= maxNodes || depth > maxDepth) {
            truncated = true;
            return;
        }
        const style = getComputedStyle(node), box = rect(node);
        const entry = { address, parent, tag: node.tagName.toLowerCase().slice(0, 32), rect: box };
        if (mode === 'accessibility') {
            const role = node.getAttribute('role');
            entry.role = typeof role === 'string' && /^[a-z-]{1,32}$/.test(role) ? role : role === null ? null : 'other';
            entry.labelPresent = node.hasAttribute('aria-label') || node.hasAttribute('aria-labelledby') ||
                !!node.labels?.length || !!node.closest('label');
            entry.hidden = !!node.hidden || style.display === 'none' || style.visibility === 'hidden';
            entry.tabIndex = Number.isSafeInteger(node.tabIndex) ? node.tabIndex : null;
            entry.focusable = !entry.hidden && !node.disabled && entry.tabIndex !== null && entry.tabIndex >= 0;
            entry.targetSize = { width: box.width, height: box.height };
            let background = null, current = node;
            while (current) {
                const currentStyle = getComputedStyle(current);
                if (Number(currentStyle.opacity ?? 1) < 1 || currentStyle.filter && currentStyle.filter !== 'none')
                    break;
                background = opaque(currentStyle.backgroundColor);
                if (background || current === root)
                    break;
                if (!/^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/.test(currentStyle.backgroundColor) && currentStyle.backgroundColor !== 'transparent')
                    break;
                current = current.parentElement;
            }
            const foreground = opaque(style.color);
            entry.contrastRatio = foreground && background ? Math.round((Math.max(luminance(foreground), luminance(background)) + 0.05) /
                (Math.min(luminance(foreground), luminance(background)) + 0.05) * 100) / 100 : null;
        }
        else if (mode === 'overlays') {
            const reasons = [];
            if (style.position === 'fixed' || style.position === 'sticky')
                reasons.push('position');
            if (style.position !== 'static' && style.zIndex !== 'auto')
                reasons.push('position and z-index');
            if (Number(style.opacity) < 1)
                reasons.push('opacity');
            if (style.transform && style.transform !== 'none')
                reasons.push('transform');
            if (style.filter && style.filter !== 'none')
                reasons.push('filter');
            entry.stackingContextReasons = reasons;
            entry.zIndex = /^-?\d{1,6}$/.test(style.zIndex) ? Number(style.zIndex) : null;
        }
        else if (mode === 'scroll') {
            entry.overflowX = ['visible', 'hidden', 'clip', 'scroll', 'auto'].includes(style.overflowX) ? style.overflowX : 'other';
            entry.overflowY = ['visible', 'hidden', 'clip', 'scroll', 'auto'].includes(style.overflowY) ? style.overflowY : 'other';
            entry.scrollWidth = metric(node.scrollWidth);
            entry.scrollHeight = metric(node.scrollHeight);
            entry.clientWidth = metric(node.clientWidth);
            entry.clientHeight = metric(node.clientHeight);
            entry.scrollLeft = Number.isFinite(node.scrollLeft) ? node.scrollLeft : 0;
            entry.scrollTop = Number.isFinite(node.scrollTop) ? node.scrollTop : 0;
            entry.scrollable = (entry.scrollWidth > entry.clientWidth && ['auto', 'scroll'].includes(entry.overflowX)) ||
                (entry.scrollHeight > entry.clientHeight && ['auto', 'scroll'].includes(entry.overflowY));
        }
        else if (mode === 'ownership')
            entry.owner = 'unknown';
        else if (mode === 'hitboxes') {
            entry.semanticControl = ['button', 'input', 'select', 'textarea', 'a'].includes(entry.tag) || ['button', 'link', 'checkbox', 'radio', 'switch', 'tab'].includes(node.getAttribute('role'));
            entry.pointerEvents = ['auto', 'none'].includes(style.pointerEvents) ? style.pointerEvents : 'other';
            entry.disabled = !!node.disabled;
            entry.hidden = !!node.hidden || style.display === 'none' || style.visibility === 'hidden';
            entry.centerHitWithinNode = null;
            const x = box.x + box.width / 2, y = box.y + box.height / 2;
            if (box.width > 0 && box.height > 0 && typeof innerWidth === 'number' && typeof innerHeight === 'number' && x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && typeof document.elementFromPoint === 'function') {
                const hit = document.elementFromPoint(x, y);
                entry.centerHitWithinNode = hit ? hit === node || typeof node.contains === 'function' && node.contains(hit) : null;
            }
        }
        nodes.push(entry);
        for (let i = 0; i < node.children.length; i++) {
            if (nodes.length >= maxNodes) {
                truncated = true;
                break;
            }
            visit(node.children[i], `${address}/${i}`, address, depth + 1);
        }
    }
    visit(root, '0', null, 0);
    if (mode === 'scroll') {
        const byAddress = new Map(nodes.map(node => [node.address, node]));
        for (const node of nodes) {
            let parent = node.parent;
            node.nestedScroll = false;
            while (node.scrollable && parent) {
                const ancestor = byAddress.get(parent);
                if (ancestor?.scrollable) {
                    node.nestedScroll = true;
                    break;
                }
                parent = ancestor?.parent;
            }
        }
    }
    const result = { schemaVersion: 1, source: mode, nodes, truncated,
        limits: { maxNodes, maxDepth }, content: 'omitted' };
    if (mode === 'overlays')
        result.globalOrder = 'unknown';
    if (mode === 'accessibility')
        result.contrastBasis = 'computed opaque color pair only; images, gradients and compositing not inspected; rendered contrast unverified';
    if (mode === 'ownership')
        result.attribution = 'unknown without explicit integration';
    if (mode === 'hitboxes') {
        const intersections = [];
        for (let i = 0; i < nodes.length; i++)
            for (let j = i + 1; j < nodes.length; j++) {
                const a = nodes[i].rect, b = nodes[j].rect;
                const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
                const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
                if (width > 0 && height > 0) {
                    if (intersections.length >= 500) {
                        result.truncated = true;
                        break;
                    }
                    intersections.push({ a: nodes[i].address, b: nodes[j].address, width, height });
                }
            }
        result.intersections = intersections;
    }
    return result;
}
async function storage() {
    const deadline = Date.now() + 8000, maxNames = 200;
    const hash = async (name) => {
        const data = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(name));
        return Array.from(new Uint8Array(data), byte => byte.toString(16).padStart(2, '0')).join('');
    };
    const within = (promise, ms) => new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('deadline')), ms);
        Promise.resolve(promise).then(value => { clearTimeout(timer); resolve(value); }, error => { clearTimeout(timer); reject(error); });
    });
    const remaining = () => Math.max(1, deadline - Date.now());
    const result = { schemaVersion: 1, source: 'storage', local: null, session: null, indexedDB: null,
        content: 'metadata and counts only' };
    const readStorage = async (store) => {
        if (!store)
            return { status: 'unsupported', count: null, keys: [], omitted: 0 };
        try {
            const count = store.length, keys = [], limit = Math.min(count, maxNames);
            let omitted = Math.max(0, count - maxNames);
            for (let i = 0; i < limit; i++) {
                if (Date.now() >= deadline)
                    return { status: 'partial', count, keys, omitted: omitted + limit - i };
                const name = store.key(i);
                if (typeof name !== 'string' || name.length > 128) {
                    omitted++;
                    continue;
                }
                keys.push({ hash: await within(hash(name), remaining()) });
            }
            return { status: 'available', count, keys, omitted };
        }
        catch {
            return { status: 'unsupported', count: null, keys: [], omitted: 0 };
        }
    };
    let local, session;
    try {
        local = window.localStorage;
    }
    catch { /* blocked */ }
    try {
        session = window.sessionStorage;
    }
    catch { /* blocked */ }
    if (typeof crypto === 'undefined' || !crypto.subtle || typeof TextEncoder !== 'function') {
        result.local = { status: 'unsupported', count: null, keys: [], omitted: 0 };
        result.session = { status: 'unsupported', count: null, keys: [], omitted: 0 };
    }
    else {
        result.local = await readStorage(local);
        result.session = await readStorage(session);
    }
    const idb = { status: 'unsupported', databases: [], omitted: 0 };
    result.indexedDB = idb;
    if (typeof crypto === 'undefined' || !crypto.subtle || typeof indexedDB === 'undefined' || !indexedDB?.databases)
        return result;
    if (Date.now() >= deadline) {
        idb.status = 'partial';
        return result;
    }
    let databases;
    try {
        databases = await within(indexedDB.databases(), remaining());
    }
    catch {
        return result;
    }
    if (!Array.isArray(databases))
        return result;
    idb.status = 'available';
    idb.omitted = Math.max(0, databases.length - 10);
    for (const raw of databases.slice(0, 10)) {
        const meta = raw;
        if (Date.now() >= deadline) {
            idb.status = 'partial';
            break;
        }
        if (typeof meta.name !== 'string' || meta.name.length > 128 || !Number.isSafeInteger(meta.version) || meta.version < 1) {
            idb.omitted++;
            continue;
        }
        let nameHash;
        try {
            nameHash = await within(hash(meta.name), remaining());
        }
        catch {
            idb.status = 'partial';
            break;
        }
        if (Date.now() >= deadline) {
            idb.status = 'partial';
            break;
        }
        const entry = { nameHash, version: meta.version, status: 'unsupported', stores: [], omitted: 0 };
        idb.databases.push(entry);
        await new Promise(resolve => {
            let db, finished = false;
            const transactions = [];
            const end = (status) => {
                if (finished)
                    return;
                finished = true;
                clearTimeout(timer);
                for (const tx of transactions) {
                    try {
                        tx.abort();
                    }
                    catch { /* already complete */ }
                }
                try {
                    db?.close();
                }
                catch { /* already closed */ }
                entry.status = status;
                resolve();
            };
            const timer = setTimeout(() => end('timeout'), remaining());
            let request;
            if (Date.now() >= deadline) {
                end('timeout');
                return;
            }
            try {
                request = indexedDB.open(meta.name);
            }
            catch {
                end('unsupported');
                return;
            }
            request.onupgradeneeded = event => {
                try {
                    event.target.transaction.abort();
                }
                catch { /* race */ }
                end('changed-during-inspection');
            };
            request.onerror = () => end('unsupported');
            request.onsuccess = async () => {
                if (finished) {
                    try {
                        request.result.close();
                    }
                    catch { /* stale callback */ }
                    return;
                }
                db = request.result;
                try {
                    if (db.version !== undefined && db.version !== meta.version) {
                        end('changed-during-inspection');
                        return;
                    }
                    const names = Array.from(db.objectStoreNames);
                    entry.omitted = Math.max(0, names.length - 50);
                    for (const name of names.slice(0, 50)) {
                        if (Date.now() >= deadline) {
                            end('timeout');
                            return;
                        }
                        if (name.length > 128) {
                            entry.omitted++;
                            continue;
                        }
                        const store = { nameHash: await within(hash(name), remaining()), count: null, status: 'unsupported' };
                        if (finished)
                            return;
                        if (Date.now() >= deadline) {
                            end('timeout');
                            return;
                        }
                        entry.stores.push(store);
                        const tx = db.transaction(name, 'readonly');
                        transactions.push(tx);
                        const count = tx.objectStore(name).count();
                        await new Promise(done => {
                            count.onsuccess = () => { if (!finished) {
                                store.count = count.result;
                                store.status = 'available';
                            } done(); };
                            count.onerror = () => done();
                            tx.onabort = () => done();
                        });
                        if (finished)
                            return;
                    }
                    end(entry.stores.some(store => store.status !== 'available') ? 'partial' : 'available');
                }
                catch {
                    end('unsupported');
                }
            };
        });
    }
    return result;
}
const browserInspectors = { inspect, storage };
module.exports = browserInspectors;
