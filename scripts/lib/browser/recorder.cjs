// Generated from recorder.cts by TypeScript 6.0.2; source-lf-sha256=e895727ee25234e170db722e77c7a2afa5f2904b4d5116f05d76ef846cf48bb4
"use strict";
// Runs inside the inspected document. Only trusted event metadata is retained.
async function snapshot(scopeSelector, durationMs) {
    if (typeof scopeSelector !== 'string' || !scopeSelector.trim() || scopeSelector.length > 128 ||
        !Number.isInteger(durationMs) || durationMs < 1 || durationMs > 30000)
        throw Error('Invalid recorder options');
    const roots = document.querySelectorAll(scopeSelector);
    if (roots.length !== 1)
        throw Error('Recorder scope must match exactly one element');
    let root = roots[0];
    const records = [];
    const started = performance.now();
    let dropped = 0, truncated = false, cleanupConflicts = 0, timer, active = true;
    const installed = [];
    const address = (target) => {
        let node = target;
        if (!node || node.nodeType !== 1 || !root.contains(node))
            return null;
        const parts = [];
        while (node !== root) {
            if (parts.length === 8) {
                truncated = true;
                return null;
            }
            const parent = node.parentElement;
            if (!parent)
                return null;
            const index = Array.prototype.indexOf.call(parent.children, node);
            if (index < 0)
                return null;
            parts.unshift(index);
            node = parent;
        }
        return `0${parts.map(index => `/${index}`).join('')}`;
    };
    const onEvent = (event) => {
        if (!active || event.isTrusted !== true)
            return;
        try {
            const at = address(event.target);
            if (at === null)
                return;
            const target = event.target;
            const tag = String(target.tagName || '').toLowerCase();
            if (!/^[a-z][a-z0-9-]{0,31}$/.test(tag)) {
                truncated = true;
                return;
            }
            let replayable = true, reason = null;
            if (event.type === 'click' && !(event.target instanceof HTMLElement)) {
                replayable = false;
                reason = 'unsupported-click-target';
            }
            if (event.type !== 'click') {
                let type = '';
                try {
                    if (tag === 'input')
                        type = String(target.type || '').toLowerCase();
                }
                catch {
                    type = 'unknown';
                }
                if ((tag !== 'input' && tag !== 'textarea') || ['password', 'file', 'hidden'].includes(type)) {
                    replayable = false;
                    reason = 'unsupported-input-target';
                }
                if (type === 'unknown') {
                    replayable = false;
                    reason = 'unsupported-input-target';
                }
            }
            const atMs = Math.min(durationMs, Math.max(0, Math.round(performance.now() - started)));
            const last = records[records.length - 1];
            if (event.type !== 'click' && last && last.kind !== 'click' && last.address === at && last.tag === tag) {
                last.atMs = atMs;
                if (!replayable) {
                    last.replayable = false;
                    last.reason = reason;
                }
                return;
            }
            if (records.length >= 50) {
                dropped++;
                truncated = true;
                return;
            }
            records.push({ order: records.length + 1, atMs, kind: event.type, address: at, tag,
                replayable, reason });
        }
        catch {
            truncated = true;
        }
    };
    try {
        for (const type of ['click', 'input', 'change']) {
            root.addEventListener(type, onEvent, { capture: true, passive: true });
            installed.push(type);
        }
        await new Promise(resolve => { timer = setTimeout(resolve, durationMs); });
    }
    finally {
        active = false;
        try {
            clearTimeout(timer);
        }
        catch {
            cleanupConflicts++;
        }
        for (const type of installed) {
            try {
                root.removeEventListener(type, onEvent, true);
            }
            catch {
                cleanupConflicts++;
            }
        }
        root = null;
    }
    return { schemaVersion: 1, source: 'WebView user recorder', durationMs, records,
        dropped, truncated, cleanupConflicts, inputContent: 'omitted',
        nativeActions: 'not recorded' };
}
module.exports = { snapshot };
