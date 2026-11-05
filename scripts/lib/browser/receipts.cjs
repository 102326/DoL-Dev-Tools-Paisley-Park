// Generated from receipts.cts by TypeScript 6.0.2; source-lf-sha256=828db85372b487329510b414da600b643656609bf86d0e499532bc626845af65
"use strict";
function initialize(name, nonce) {
    if (!Object.prototype.hasOwnProperty.call(window, name)) {
        // At most 64 live receipts per document; only committed terminal proof may retire.
        const value = Object.freeze({ version: 1, nonce, records: Object.create(null) });
        Object.defineProperty(window, name, { value, configurable: false, enumerable: false, writable: false });
    }
    const current = window[name];
    return current?.version === 1 && typeof current.nonce === 'string' && current.records && Object.getPrototypeOf(current.records) === null ? current.nonce : null;
}
function read(name, effects) {
    // Recovery only reads; it never initializes a namespace or repairs a missing receipt.
    const current = window[name];
    if (current?.version !== 1 || !current.records || Object.getPrototypeOf(current.records) !== null)
        return [];
    const result = [];
    for (const effect of effects) {
        const binding = effect.executionBinding, receipt = current.records[effect.id];
        if (!binding || current.nonce !== binding.contextNonce || !receipt || receipt.status !== 'terminal' || receipt.attemptId !== effect.id ||
            ['provider', 'contract', 'contextNonce', 'requestDigest'].some(k => receipt[k] !== binding[k]) || receipt.outcome !== 'occurred' || receipt.remoteClosed !== true ||
            !Number.isSafeInteger(receipt.spent) || receipt.spent < 0)
            continue;
        const evidence = receipt.evidence;
        if (evidence !== undefined && (!evidence || typeof evidence !== 'object' || Array.isArray(evidence) || new TextEncoder().encode(JSON.stringify(evidence)).length > 4096))
            continue;
        result.push({ attemptId: effect.id, outcome: 'occurred', remoteClosed: true, spent: receipt.spent, source: 'reviewed native operation terminal: ' + binding.contract,
            ...(evidence === undefined ? {} : { evidence }) });
    }
    return result;
}
function retire(name, effects) {
    const current = window[name];
    if (current?.version !== 1 || !current.records || Object.getPrototypeOf(current.records) !== null)
        return { available: false, retired: [], remaining: null, capacity: 64 };
    const retired = [];
    for (const e of effects) {
        const b = e.executionBinding, r = current.records[e.id];
        // A committed result owns the proof now. Never select an unresolved attempt.
        if (e.status !== 'settled' || e.result?.outcome !== 'occurred' || !b)
            continue;
        if (current.nonce !== b.contextNonce || !Object.hasOwn(current.records, e.id)) {
            retired.push(e.id);
            continue;
        }
        if (r?.status !== 'terminal' || r.outcome !== 'occurred' || r.remoteClosed !== true || r.attemptId !== e.id || r.spent !== e.result.spent ||
            ['provider', 'contract', 'contextNonce', 'requestDigest'].some(k => r[k] !== b[k]) || JSON.stringify(r.evidence ?? null) !== JSON.stringify(e.result.evidence ?? null))
            continue;
        if (Reflect.deleteProperty(current.records, e.id))
            retired.push(e.id);
    }
    return { available: true, retired, remaining: Object.keys(current.records).length, capacity: 64 };
}
const receiptProbe = { initialize, read, retire };
module.exports = receiptProbe;
