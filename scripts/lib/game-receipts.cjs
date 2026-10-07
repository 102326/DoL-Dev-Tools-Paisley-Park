// Private reviewed gameplay receipts. Page instrumentation is not a security sandbox.
const { randomUUID } = require('node:crypto');
const namespace = '__paisleyParkGameplayReceiptsV1';
const uuid = v => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
const text = v => typeof v === 'string' && /^[a-zA-Z0-9._-]{1,64}$/.test(v);
function validate(binding) {
  if (!binding || Object.keys(binding).length !== 4 || !text(binding.provider) || !text(binding.contract) || !uuid(binding.contextNonce) || !/^[a-f0-9]{64}$/.test(binding.requestDigest)) throw Error('Invalid gameplay receipt binding');
  return binding;
}
function initialize(name, nonce) {
  if (!Object.prototype.hasOwnProperty.call(window, name)) {
    // ponytail: at most 64 receipts per page context, matching the Session action cap; no silent eviction.
    const value = Object.freeze({ version: 1, nonce, records: Object.create(null) });
    Object.defineProperty(window, name, { value, configurable: false, enumerable: false, writable: false });
  }
  const current = window[name];
  return current?.version === 1 && typeof current.nonce === 'string' && current.records && Object.getPrototypeOf(current.records) === null ? current.nonce : null;
}
async function context(client) {
  const nonce = await client.evaluate(`(${initialize.toString()})(${JSON.stringify(namespace)},${JSON.stringify(randomUUID())})`);
  if (!uuid(nonce)) throw Error('Gameplay receipt context unavailable');
  return nonce;
}
function read(name, effects) {
  // Recovery only reads; it never initializes a namespace or repairs a missing receipt.
  const current = window[name];
  if (current?.version !== 1 || !current.records || Object.getPrototypeOf(current.records) !== null) return [];
  const result = [];
  for (const effect of effects) {
    const binding = effect.executionBinding, receipt = current.records[effect.id];
    if (!binding || current.nonce !== binding.contextNonce || !receipt || receipt.status !== 'terminal' || receipt.attemptId !== effect.id ||
        ['provider','contract','contextNonce','requestDigest'].some(k => receipt[k] !== binding[k]) || receipt.outcome !== 'occurred' || receipt.remoteClosed !== true ||
        !Number.isSafeInteger(receipt.spent) || receipt.spent < 0) continue;
    const evidence=receipt.evidence;
    if(evidence!==undefined&&(!evidence||typeof evidence!=='object'||Array.isArray(evidence)||new TextEncoder().encode(JSON.stringify(evidence)).length>4096))continue;
    result.push({ attemptId: effect.id, outcome: 'occurred', remoteClosed: true, spent: receipt.spent, source: 'reviewed native operation terminal: ' + binding.contract,
      ...(evidence===undefined?{}:{evidence}) });
  }
  return result;
}
async function recover(client, effects) {
  if (!Array.isArray(effects) || effects.length > 64) throw Error('Invalid receipt recovery batch');
  const selected = effects.filter(e => e.executionBinding && e.status !== 'prepared' && e.status !== 'settled').map(e => {
    if (!uuid(e.id)) throw Error('Invalid receipt attempt');
    return { id: e.id, executionBinding: validate(e.executionBinding) };
  });
  if (!selected.length) return [];
  const result = await client.evaluate(`(${read.toString()})(${JSON.stringify(namespace)},${JSON.stringify(selected)})`);
  if (!Array.isArray(result) || result.length > selected.length) throw Error('Gameplay receipts unavailable');
  return result;
}
module.exports = { namespace, validate, context, recover };
