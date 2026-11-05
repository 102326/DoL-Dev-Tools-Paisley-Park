// Generated from integration-patch-observation.cts by TypeScript 6.0.2; source-lf-sha256=d0089b8d294e79d5da049b58691898e2053731766fee54606042f1fdd36e82b1
"use strict";
function probe() {
    const bridge = window.WhiteSnakePatchProbe;
    if (typeof bridge?.read !== 'function')
        return { status: 'unavailable' };
    const record = bridge.read();
    if (record?.schemaVersion !== 1 || !Number.isFinite(record.document?.timeOrigin) ||
        typeof record.document?.nonce !== 'string' || !record.document.nonce ||
        record.document.timeOrigin !== performance.timeOrigin)
        return { status: 'unsupported', reason: 'capture-document-mismatch' };
    const observation = record.observation;
    if (observation !== null && (observation?.schemaVersion !== 1 ||
        observation.identity?.documentId !== record.document.nonce ||
        !Array.isArray(observation.events) || observation.events.length > 16))
        return { status: 'unsupported', reason: 'capture-contract-mismatch' };
    // A current-document record is not cross-evaluate binding or a business success claim.
    return { status: 'available', source: 'reviewed optional startup observation', record };
}
module.exports = { probe };
