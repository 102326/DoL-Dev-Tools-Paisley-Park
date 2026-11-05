import type integration from './integration.cjs';
import type cdp from './cdp.cjs';
import type targetTypes from './runtime-target.cjs';
type Phase = 'load'|'contract'|'describe'|'document'|'detect'|'collect'|'redact';
interface Reader extends integration.ProbeClient { close():void }
interface BoundReader extends Reader { open():Promise<unknown>; assertBound():Promise<unknown> }
interface Hooks { describe():unknown; detect(ctx:{client:integration.ProbeClient}):unknown; collect(ctx:{client:integration.ProbeClient}):unknown; redact(result:Record<string,unknown>):unknown }
const {parentPort,workerData:rawWorkerData}:typeof import('node:worker_threads')=require('node:worker_threads');
const workerData=rawWorkerData as {modulePath:unknown;endpoint:unknown;targetId?:unknown;host?:unknown;chromeTarget?:unknown};
const fs:typeof import('node:fs')=require('node:fs');
const path:typeof import('node:path')=require('node:path');
const {createHash}:typeof import('node:crypto')=require('node:crypto');
const {connect}:typeof import('./cdp.cjs')=require('./cdp.cjs');
const { redact } = require('./privacy.cjs');
const statuses:readonly string[] = ['available','unavailable','unsupported','failed'];
const status=(value:unknown):value is integration.Status=>statuses.includes(value as string);
const object = (value:unknown):value is Record<string,unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
async function main():Promise<integration.Result> {
  let phase:Phase='load',client:Reader|undefined,bound:BoundReader|undefined,connection:Promise<cdp.Client>|undefined,description:integration.Description|undefined,moduleSha256:string|undefined;
  const chrome = workerData.host === 'chrome';
  async function assertDocument() {
    if (chrome) { phase = 'document'; await bound!.assertBound(); }
  }
  try {
    const filename = fs.realpathSync(workerData.modulePath as string);
    const stat = fs.statSync(filename);
    if (path.extname(filename) !== '.cjs' || !stat.isFile() || stat.size > 65536) throw new Error('Invalid module');
    moduleSha256 = createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
    const moduleValue=require(filename) as {contractVersion?:unknown;[key:string]:unknown};
    phase = 'contract';
    if (moduleValue.contractVersion !== 1) return { status: 'unsupported', moduleSha256, data: { status: 'unsupported', reason: 'integration-contract-unsupported' } };
    if (!['describe','detect','collect','redact'].every(key => typeof moduleValue[key] === 'function')) throw new Error('Invalid hooks');
    const hooks=moduleValue as unknown as Hooks;
    phase = 'describe';
    const raw = await hooks.describe();
    if (!object(raw) || typeof raw.name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(raw.name)
      || typeof raw.version !== 'string' || !/^[0-9A-Za-z._()+-]{1,64}$/.test(raw.version)) throw new Error('Invalid description');
    description = { name: raw.name, version: raw.version };
    if (raw.capabilities !== undefined) {
      if (!Array.isArray(raw.capabilities) || raw.capabilities.length > 16 || raw.capabilities.some((item:unknown) => typeof item !== 'string' || !/^[a-z0-9][a-z0-9.-]{0,63}$/.test(item))) throw new Error('Invalid capabilities');
      description.capabilities = raw.capabilities as string[];
    }
    if (raw.supportedApiVersion !== undefined) {
      if (!Number.isSafeInteger(raw.supportedApiVersion) || (raw.supportedApiVersion as number) < 0) throw new Error('Invalid API version');
      description.supportedApiVersion = raw.supportedApiVersion as number;
    }
    let calls = 0;
    if (chrome) {
      phase = 'document';
      // A second connection is allowed, a second document contract is not.
      // Never discover/adopt a current document when the owned record is absent.
      const target = workerData.chromeTarget as {host?:unknown;document?:unknown;profilePath?:unknown}|null|undefined;
      if (target?.host !== 'chrome' || !target.document || !target.profilePath) throw Error('Original Chrome document required');
      const {ChromeHost}:typeof import('./chrome-host.cjs')=require('./chrome-host.cjs');
      bound = new ChromeHost(target as unknown as targetTypes.Chrome, { timeoutMs: 3000 });
      client=bound;await bound.open();
    }
    const ctx = { client: { async evaluate(expression:unknown) {
      if (++calls > 16 || typeof expression !== 'string' || Buffer.byteLength(expression) > 32768) throw new Error('Probe limit');
      if (!chrome) {
        connection ||= connect(workerData.endpoint as string, 3000, undefined, workerData.targetId || null);
        client = await connection;
      }
      return client!.evaluate(expression);
    } } };
    phase = 'detect';
    const detected = await hooks.detect(ctx);
    if (!status(detected)) throw new Error('Invalid detection status');
    await assertDocument();
    if (detected !== 'available') return { status: detected, description, moduleSha256, data: { status: detected } };
    phase = 'collect';
    const collected = await hooks.collect(ctx);
    const value=collected as Record<string,unknown>|null|undefined;
    const collectedStatus = value?.status;
    if (!object(collected) || !status(collectedStatus)) throw new Error('Invalid collection result');
    phase = 'redact';
    const projected = await hooks.redact(collected);
    if (!object(projected) || projected.status !== collectedStatus) throw new Error('Redaction changed status');
    const data:unknown = redact(projected);
    if (!object(data) || data.status !== collectedStatus) throw new Error('Redaction changed status');
    await assertDocument();
    return { status:collectedStatus, description, moduleSha256, data:data as integration.Result['data'] };
  } catch (error) {
    if (chrome && (error as {code?:unknown}|null|undefined)?.code === 'PC_DOCUMENT_CHANGED') phase = 'document';
    const reason:integration.FailureReason = `integration-${phase}-failed`;
    return { status: 'failed', description, moduleSha256, reason, data: { status: 'failed', reason } };
  } finally { client?.close(); }
}
main().then(result => {
  try {
    const json = JSON.stringify(result)!;
    if (Buffer.byteLength(json) > 65536) throw new Error('Oversized integration output');
    parentPort!.postMessage(json);
  } catch { parentPort!.postMessage(JSON.stringify({ status: 'failed', data: { status: 'failed', reason: 'integration-output-invalid' }, reason: 'integration-output-invalid' })); }
});

export = {};
