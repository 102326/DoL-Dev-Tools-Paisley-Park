declare namespace integration {
  type Status = 'available'|'unavailable'|'unsupported'|'failed';
  type FailureReason = `integration-${'load'|'contract'|'describe'|'document'|'detect'|'collect'|'redact'|'worker'}-failed`|'integration-output-invalid'|'integration-timeout'|'integration-worker-exited';
  interface ProbeClient { evaluate(expression:string):Promise<unknown> }
  interface Description { name:string; version:string; supportedApiVersion?:number; capabilities?:string[] }
  interface Result { status:Status; data:Record<string,unknown>&{status:Status}; description?:Description; moduleSha256?:string; reason?:FailureReason }
  interface Context { endpoint?:unknown; options?:{host?:unknown;targetId?:unknown;chromeRecord?:{target?:unknown}}; ensureWebview?:()=>Promise<unknown> }
}
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const status=(value:unknown):value is integration.Status=>['available','unavailable','unsupported','failed'].includes(value as integration.Status);
const path:typeof import('node:path')=require('node:path');
const {Worker}:typeof import('node:worker_threads')=require('node:worker_threads');
import type {Worker as WorkerType} from 'node:worker_threads';
const failed = (reason:integration.FailureReason):integration.Result => ({ status: 'failed', data: { status: 'failed', reason }, reason });

// Reviewed local code only. Worker isolation bounds host progress, not permissions or remote side effects.
function collect(ctx:integration.Context, modulePath:string, timeoutMs = 10000):Promise<integration.Result> {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000) throw new Error('Invalid integration deadline');
  return new Promise<integration.Result>(resolve => {
    let worker:WorkerType|undefined, settled = false, received = false;
    const chrome = ctx.options?.host === 'chrome';
    const finish = (result:integration.Result) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (worker) { worker.unref(); worker.terminate().catch(() => {}); }
      resolve(result);
    };
    const timer = setTimeout(() => finish(failed('integration-timeout')), timeoutMs);
    async function checkDocument() {
      if (chrome) {
        try { if(typeof ctx.ensureWebview!=='function')throw Error('Original host binding unavailable'); await ctx.ensureWebview(); }
        catch { finish(failed('integration-document-failed')); return false; }
      }
      return !settled;
    }
    async function start() {
    // The original connection remembers invalidation events a fresh worker
    // cannot see (for example, a hash navigation that returned to the old URL).
    if (!await checkDocument()) return;
    try {
      worker = new Worker(path.join(__dirname, 'integration-worker.cjs'), {
        workerData: { modulePath: path.resolve(modulePath), endpoint: ctx.endpoint, targetId: ctx.options?.targetId || null,
          ...(ctx.options?.host === 'chrome' ? { host: 'chrome', chromeTarget: ctx.options!.chromeRecord?.target } : {}) },
        stdout: true, stderr: true, resourceLimits: { maxOldGenerationSizeMb: 32 },
      });
      worker.stdout!.resume(); worker.stderr!.resume();
      worker.on('message', async (json:unknown) => {
        if (settled || received) return;
        received = true;
        try {
          if (typeof json !== 'string' || Buffer.byteLength(json) > 65536) throw new Error('Invalid worker output');
          const result:unknown = JSON.parse(json);
          if (!object(result) || !status(result.status) || !object(result.data) || result.data.status !== result.status) throw new Error('Invalid integration status');
          if (result.description !== undefined) {
            const d = result.description;if(!object(d))throw Error('Invalid description');
            if (typeof d.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(d.name) || typeof d.version !== 'string' || !/^[0-9A-Za-z._()+-]{1,64}$/.test(d.version)) throw new Error('Invalid description');
            result.description = { name: d.name, version: d.version,
              ...(Number.isSafeInteger(d.supportedApiVersion) && (d.supportedApiVersion as number) >= 0 ? { supportedApiVersion: d.supportedApiVersion as number } : {}) };
            if (d.capabilities !== undefined) {
              if (!Array.isArray(d.capabilities) || d.capabilities.length > 16 || d.capabilities.some((item:unknown) => typeof item !== 'string' || !/^[a-z0-9][a-z0-9.-]{0,63}$/.test(item))) throw new Error('Invalid capabilities');
              (result.description as integration.Description).capabilities = d.capabilities as string[];
            }
          }
          if (result.moduleSha256 !== undefined && (typeof result.moduleSha256!=='string'||!/^[0-9a-f]{64}$/.test(result.moduleSha256))) throw new Error('Invalid module hash');
          if (result.reason !== undefined && (typeof result.reason!=='string'||!/^integration-(?:load|contract|describe|document|detect|collect|redact)-failed$|^integration-output-invalid$/.test(result.reason))) throw new Error('Invalid failure reason');
          if (await checkDocument()) finish(result as unknown as integration.Result);
        } catch { finish(failed('integration-output-invalid')); }
      });
      worker.on('error', () => finish(failed('integration-worker-failed')));
      worker.on('exit', () => { if (!received) finish(failed('integration-worker-exited')); });
    } catch { finish(failed('integration-worker-failed')); }
    }
    start().catch(() => finish(failed('integration-worker-failed')));
  });
}
const integration={collect};
export = integration;
