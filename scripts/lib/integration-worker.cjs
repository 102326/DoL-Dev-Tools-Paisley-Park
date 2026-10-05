const { parentPort, workerData } = require('node:worker_threads');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { connect } = require('./cdp.cjs');
const { redact } = require('./privacy.cjs');
const statuses = ['available','unavailable','unsupported','failed'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
async function main() {
  let phase = 'load', client, connection, description, moduleSha256;
  try {
    const filename = fs.realpathSync(workerData.modulePath);
    const stat = fs.statSync(filename);
    if (path.extname(filename) !== '.cjs' || !stat.isFile() || stat.size > 65536) throw new Error('Invalid module');
    moduleSha256 = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
    const integration = require(filename);
    phase = 'contract';
    if (integration.contractVersion !== 1) return { status: 'unsupported', moduleSha256, data: { status: 'unsupported', reason: 'integration-contract-unsupported' } };
    if (!['describe','detect','collect','redact'].every(key => typeof integration[key] === 'function')) throw new Error('Invalid hooks');
    phase = 'describe';
    const raw = await integration.describe();
    if (!object(raw) || typeof raw.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(raw.name)
      || typeof raw.version !== 'string' || !/^[0-9A-Za-z._()+-]{1,64}$/.test(raw.version)) throw new Error('Invalid description');
    description = { name: raw.name, version: raw.version };
    if (raw.capabilities !== undefined) {
      if (!Array.isArray(raw.capabilities) || raw.capabilities.length > 16 || raw.capabilities.some(item => typeof item !== 'string' || !/^[a-z0-9][a-z0-9.-]{0,63}$/.test(item))) throw new Error('Invalid capabilities');
      description.capabilities = raw.capabilities;
    }
    if (raw.supportedApiVersion !== undefined) {
      if (!Number.isSafeInteger(raw.supportedApiVersion) || raw.supportedApiVersion < 0) throw new Error('Invalid API version');
      description.supportedApiVersion = raw.supportedApiVersion;
    }
    let calls = 0;
    const ctx = { client: { async evaluate(expression) {
      if (++calls > 16 || typeof expression !== 'string' || Buffer.byteLength(expression) > 32768) throw new Error('Probe limit');
      connection ||= connect(workerData.endpoint, 3000);
      client = await connection;
      return client.evaluate(expression);
    } } };
    phase = 'detect';
    const detected = await integration.detect(ctx);
    if (!statuses.includes(detected)) throw new Error('Invalid detection status');
    if (detected !== 'available') return { status: detected, description, moduleSha256, data: { status: detected } };
    phase = 'collect';
    const collected = await integration.collect(ctx);
    const status = collected?.status;
    if (!object(collected) || !statuses.includes(status)) throw new Error('Invalid collection result');
    phase = 'redact';
    const projected = await integration.redact(collected);
    if (!object(projected) || projected.status !== status) throw new Error('Redaction changed status');
    const data = redact(projected);
    if (data.status !== status) throw new Error('Redaction changed status');
    return { status, description, moduleSha256, data };
  } catch {
    const reason = `integration-${phase}-failed`;
    return { status: 'failed', description, moduleSha256, reason, data: { status: 'failed', reason } };
  } finally { client?.close(); }
}
main().then(result => {
  try {
    const json = JSON.stringify(result);
    if (Buffer.byteLength(json) > 65536) throw new Error('Oversized integration output');
    parentPort.postMessage(json);
  } catch { parentPort.postMessage(JSON.stringify({ status: 'failed', data: { status: 'failed', reason: 'integration-output-invalid' }, reason: 'integration-output-invalid' })); }
});
