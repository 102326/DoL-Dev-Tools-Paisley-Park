// Generated from index.cts by TypeScript 6.0.2; source-lf-sha256=7ec6e9929a70ed49d995d553aada4271e37513b84eb267596867087f74466d31
"use strict";
// Only this optional bridge knows Soft & Wet. No imports from its source tree.
const { redact } = require('../../scripts/lib/privacy.cjs');
const { probe } = require('../../scripts/lib/browser/integration-soft-wet.cjs');
async function detect(ctx) {
    if (!ctx.client)
        return 'unavailable';
    return ctx.client.evaluate("window.DoLGameUI?.ui ? 'available' : 'unavailable'");
}
function describe() { return { name: 'soft-and-wet', version: '0.1.0', supportedApiVersion: 1, source: 'Soft & Wet Runtime interpretation' }; }
async function collect(ctx) { return ctx.client.evaluate(`(${probe.toString()})()`); }
const api = { contractVersion: 1, detect, describe, collect, redact };
module.exports = api;
