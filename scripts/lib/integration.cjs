const path = require('node:path');
const { Worker } = require('node:worker_threads');
const failed = reason => ({ status: 'failed', data: { status: 'failed', reason }, reason });

// Reviewed local code only. Worker isolation bounds host progress, not permissions or remote side effects.
function collect(ctx, modulePath, timeoutMs = 10000) {
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10000) throw new Error('Invalid integration deadline');
  return new Promise(resolve => {
    let worker, settled = false;
    const finish = result => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      if (worker) { worker.unref(); worker.terminate().catch(() => {}); }
      resolve(result);
    };
    const timer = setTimeout(() => finish(failed('integration-timeout')), timeoutMs);
    try {
      worker = new Worker(path.join(__dirname, 'integration-worker.cjs'), {
        workerData: { modulePath: path.resolve(modulePath), endpoint: ctx.endpoint, targetId: ctx.options?.targetId || null },
        stdout: true, stderr: true, resourceLimits: { maxOldGenerationSizeMb: 32 },
      });
      worker.stdout.resume(); worker.stderr.resume();
      worker.on('message', json => {
        try {
          if (typeof json !== 'string' || Buffer.byteLength(json) > 65536) throw new Error('Invalid worker output');
          const result = JSON.parse(json);
          if (!['available','unavailable','unsupported','failed'].includes(result.status) || result.data?.status !== result.status) throw new Error('Invalid integration status');
          if (result.description) {
            const d = result.description;
            if (typeof d.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(d.name) || typeof d.version !== 'string' || !/^[0-9A-Za-z._()+-]{1,64}$/.test(d.version)) throw new Error('Invalid description');
            result.description = { name: d.name, version: d.version,
              ...(Number.isSafeInteger(d.supportedApiVersion) && d.supportedApiVersion >= 0 ? { supportedApiVersion: d.supportedApiVersion } : {}) };
            if (d.capabilities !== undefined) {
              if (!Array.isArray(d.capabilities) || d.capabilities.length > 16 || d.capabilities.some(item => typeof item !== 'string' || !/^[a-z0-9][a-z0-9.-]{0,63}$/.test(item))) throw new Error('Invalid capabilities');
              result.description.capabilities = d.capabilities;
            }
          }
          if (result.moduleSha256 !== undefined && !/^[0-9a-f]{64}$/.test(result.moduleSha256)) throw new Error('Invalid module hash');
          if (result.reason !== undefined && !/^integration-(?:load|contract|describe|detect|collect|redact)-failed$|^integration-output-invalid$/.test(result.reason)) throw new Error('Invalid failure reason');
          finish(result);
        } catch { finish(failed('integration-output-invalid')); }
      });
      worker.on('error', () => finish(failed('integration-worker-failed')));
      worker.on('exit', () => finish(failed('integration-worker-exited')));
    } catch { finish(failed('integration-worker-failed')); }
  });
}
module.exports = { collect };
