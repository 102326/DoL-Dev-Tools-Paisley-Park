'use strict';
const { spawnSync } = require('node:child_process');
const path = require('node:path');
const { ChromeHost } = require('../../scripts/lib/chrome-host.cjs');
const { record } = require('../../scripts/lib/pc-session.cjs');
const { digest, failure, readBytes, targetIdentity } = require('./receipt.cjs');

function archiveIdentity(file, member, python, transformation) {
  const bytes = readBytes(file, 64 * 1024 * 1024);
  const run = spawnSync(python, [path.join(__dirname, 'zip-members.py'), member], {
    input: bytes, timeout: 20000, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, windowsHide: true,
  });
  if (run.status !== 0) throw failure('ZIP_INSPECTION_FAILED', 'artifact', 'Check Python and the reviewed ZIP/member name and size.');
  const { members, selected } = JSON.parse(run.stdout);
  const memberBytes = Buffer.from(selected, 'base64');
  let text;
  // Preserve a UTF-8 BOM unless a reviewed loader transformation explicitly drops it.
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(memberBytes); }
  catch { throw failure('SCRIPT_ENCODING', 'scriptMember', 'Select a valid UTF-8 JavaScript member.'); }
  switch (transformation) {
    case 'utf8': break;
    case 'utf8-strip-bom': text = text.replace(/^\uFEFF/u, ''); break;
    case 'utf8-inline-html': text = text.replaceAll('</script', '<\\/script'); break;
    default: throw failure('LOADER_TRANSFORM_UNKNOWN', 'transformation', 'Review and declare the actual loader mapping.');
  }
  return { sha256: digest(bytes), size: bytes.length, members,
    representative: { name: member, byteSha256: digest(memberBytes), comparableTextSha256: digest(text), transformation } };
}

function hostRecord(file) {
  try {
    const value = record(file);
    return { target: value.target, ...targetIdentity(value.target) };
  } catch { throw failure('HOST_RECORD_INVALID', 'host', 'Select an owned Chrome pc-start or pc-bind record.'); }
}

function scriptObserver(url) {
  const events = new Map();
  let overflow = false;
  const candidates = (contextId) => [...events.values()].filter(event => event.executionContextId === contextId);
  return {
    onEvent(method, params) {
      if (method !== 'Debugger.scriptParsed' || params.url !== url || typeof params.scriptId !== 'string' || params.scriptLanguage === 'WebAssembly') return;
      if (!events.has(params.scriptId) && events.size >= 32) { overflow = true; return; }
      events.set(params.scriptId, params);
    },
    async compare(send, contextId, expectedHash) {
      if (!Number.isSafeInteger(contextId)) return { status: 'unknown', reason: 'context-unavailable' };
      // CDP can replay already parsed scripts on enable. Arrival order is not execution order.
      await send('Debugger.enable');
      const current = candidates(contextId);
      if (overflow || current.length > 1) return { status: 'unknown', reason: 'ambiguous-script' };
      if (current.length === 0) return { status: 'unknown', reason: 'script-unobserved' };
      const [candidate] = current;
      if (Number.isSafeInteger(candidate.length) && candidate.length > 1024 * 1024) return { status: 'unknown', reason: 'source-limit' };
      const result = await send('Debugger.getScriptSource', { scriptId: candidate.scriptId });
      if (overflow || candidates(contextId).length !== 1) return { status: 'unknown', reason: 'ambiguous-script' };
      const source = result?.scriptSource;
      if (typeof source !== 'string' || !source.isWellFormed() || Buffer.byteLength(source) > 1024 * 1024)
        return { status: 'unknown', reason: 'source-not-comparable' };
      const comparableTextSha256 = digest(source);
      return { status: comparableTextSha256 === expectedHash ? 'matched' : 'mismatch', comparableTextSha256,
        source: 'Debugger.getScriptSource', executionOrder: 'unknown' };
    },
  };
}

async function inspect(host, scriptPath, expectedHash) {
  let url;
  try {
    if (typeof scriptPath !== 'string' || !scriptPath.startsWith('/') || scriptPath.startsWith('//')) throw Error();
    const u = new URL(scriptPath, host.target.origin);
    if (u.origin !== host.target.origin || u.hash || u.username || u.password) throw Error();
    url = u.href;
  } catch { throw failure('SCRIPT_MAPPING_UNKNOWN', 'scriptPath', 'Declare one owned, same-origin script URL.'); }
  const binding = new ChromeHost(host.target);
  const observe = binding.onEvent.bind(binding);
  const observer = scriptObserver(url);
  binding.onEvent = (method, params) => {
    observe(method, params);
    observer.onEvent(method, params);
  };
  try {
    await binding.open();
    const context = [...binding.contexts.values()].find(value => value.uniqueId === binding.binding.uniqueContextId);
    return await observer.compare(async (method, params) => {
      await binding.assertBound();
      const value = await binding.client.send(method, params);
      await binding.assertBound();
      return value;
    }, context?.id, expectedHash);
  } catch (error) {
    if (error.code === 'PC_DOCUMENT_CHANGED') return { status: 'unknown', reason: 'document-changed' };
    return { status: 'unknown', reason: 'cdp-unavailable' };
  } finally { binding.close(); }
}

module.exports = { archiveIdentity, hostRecord, inspect, scriptObserver };
