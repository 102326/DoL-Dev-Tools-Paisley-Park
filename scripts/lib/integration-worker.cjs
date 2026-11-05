// Generated from integration-worker.cts by TypeScript 6.0.2; source-lf-sha256=abfe32aac1a8d9ee4161c6b645d2493d869e5ffef039069f62ac354adf7762b0
"use strict";
const { parentPort, workerData: rawWorkerData } = require('node:worker_threads');
const workerData = rawWorkerData;
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { connect } = require('./cdp.cjs');
const { redact } = require('./privacy.cjs');
const statuses = ['available', 'unavailable', 'unsupported', 'failed'];
const status = (value) => statuses.includes(value);
const object = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
async function main() {
    let phase = 'load', client, bound, connection, description, moduleSha256;
    const chrome = workerData.host === 'chrome';
    async function assertDocument() {
        if (chrome) {
            phase = 'document';
            await bound.assertBound();
        }
    }
    try {
        const filename = fs.realpathSync(workerData.modulePath);
        const stat = fs.statSync(filename);
        if (path.extname(filename) !== '.cjs' || !stat.isFile() || stat.size > 65536)
            throw new Error('Invalid module');
        moduleSha256 = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
        const moduleValue = require(filename);
        phase = 'contract';
        if (moduleValue.contractVersion !== 1)
            return { status: 'unsupported', moduleSha256, data: { status: 'unsupported', reason: 'integration-contract-unsupported' } };
        if (!['describe', 'detect', 'collect', 'redact'].every(key => typeof moduleValue[key] === 'function'))
            throw new Error('Invalid hooks');
        const hooks = moduleValue;
        phase = 'describe';
        const raw = await hooks.describe();
        if (!object(raw) || typeof raw.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(raw.name)
            || typeof raw.version !== 'string' || !/^[0-9A-Za-z._()+-]{1,64}$/.test(raw.version))
            throw new Error('Invalid description');
        description = { name: raw.name, version: raw.version };
        if (raw.capabilities !== undefined) {
            if (!Array.isArray(raw.capabilities) || raw.capabilities.length > 16 || raw.capabilities.some((item) => typeof item !== 'string' || !/^[a-z0-9][a-z0-9.-]{0,63}$/.test(item)))
                throw new Error('Invalid capabilities');
            description.capabilities = raw.capabilities;
        }
        if (raw.supportedApiVersion !== undefined) {
            if (!Number.isSafeInteger(raw.supportedApiVersion) || raw.supportedApiVersion < 0)
                throw new Error('Invalid API version');
            description.supportedApiVersion = raw.supportedApiVersion;
        }
        let calls = 0;
        if (chrome) {
            phase = 'document';
            // A second connection is allowed, a second document contract is not.
            // Never discover/adopt a current document when the owned record is absent.
            const target = workerData.chromeTarget;
            if (target?.host !== 'chrome' || !target.document || !target.profilePath)
                throw Error('Original Chrome document required');
            bound = new (require('./chrome-host.cjs').ChromeHost)(target, { timeoutMs: 3000 });
            client = bound;
            await bound.open();
        }
        const ctx = { client: { async evaluate(expression) {
                    if (++calls > 16 || typeof expression !== 'string' || Buffer.byteLength(expression) > 32768)
                        throw new Error('Probe limit');
                    if (!chrome) {
                        connection ||= connect(workerData.endpoint, 3000, undefined, workerData.targetId || null);
                        client = await connection;
                    }
                    return client.evaluate(expression);
                } } };
        phase = 'detect';
        const detected = await hooks.detect(ctx);
        if (!status(detected))
            throw new Error('Invalid detection status');
        await assertDocument();
        if (detected !== 'available')
            return { status: detected, description, moduleSha256, data: { status: detected } };
        phase = 'collect';
        const collected = await hooks.collect(ctx);
        const value = collected;
        const collectedStatus = value?.status;
        if (!object(collected) || !status(collectedStatus))
            throw new Error('Invalid collection result');
        phase = 'redact';
        const projected = await hooks.redact(collected);
        if (!object(projected) || projected.status !== collectedStatus)
            throw new Error('Redaction changed status');
        const data = redact(projected);
        if (!object(data) || data.status !== collectedStatus)
            throw new Error('Redaction changed status');
        await assertDocument();
        return { status: collectedStatus, description, moduleSha256, data: data };
    }
    catch (error) {
        if (chrome && error?.code === 'PC_DOCUMENT_CHANGED')
            phase = 'document';
        const reason = `integration-${phase}-failed`;
        return { status: 'failed', description, moduleSha256, reason, data: { status: 'failed', reason } };
    }
    finally {
        client?.close();
    }
}
main().then(result => {
    try {
        const json = JSON.stringify(result);
        if (Buffer.byteLength(json) > 65536)
            throw new Error('Oversized integration output');
        parentPort.postMessage(json);
    }
    catch {
        parentPort.postMessage(JSON.stringify({ status: 'failed', data: { status: 'failed', reason: 'integration-output-invalid' }, reason: 'integration-output-invalid' }));
    }
});
module.exports = {};
