interface Context {client?:{evaluate(expression:string):Promise<unknown>}}
interface RequiredContext {client:{evaluate(expression:string):Promise<unknown>}}
// Only this optional bridge knows Soft & Wet. No imports from its source tree.
const { redact }:typeof import('../../scripts/lib/privacy.cjs') = require('../../scripts/lib/privacy.cjs');
const {probe}:typeof import('../../scripts/lib/browser/integration-soft-wet.cjs')=require('../../scripts/lib/browser/integration-soft-wet.cjs');

async function detect(ctx:Context) {
  if (!ctx.client) return 'unavailable';
  return ctx.client.evaluate("window.DoLGameUI?.ui ? 'available' : 'unavailable'");
}
function describe() { return { name: 'soft-and-wet', version: '0.1.0', supportedApiVersion: 1, source: 'Soft & Wet Runtime interpretation' }; }
async function collect(ctx:RequiredContext) { return ctx.client.evaluate(`(${probe.toString()})()`); }
const api = { contractVersion: 1, detect, describe, collect, redact };

export = api;
