'use strict';

// Opt-in diagnostic example. Install only on reviewed local code before its patch phase.
function install({replacer, utils, resources, identity, mods = null, crypto = globalThis.crypto}) {
  if (!replacer || typeof replacer.do_patch !== 'function' ||
      !utils || typeof utils.replaceFollowSC2DataInfo !== 'function') throw Error('Unsupported patch/publication API');
  if (!Array.isArray(resources) || resources.length < 1 || resources.length > 2 ||
      resources.some(name => typeof name !== 'string' || !name || name.length > 160) ||
      new Set(resources).size !== resources.length) throw Error('Select one or two reviewed resources');
  const selectedResources = [...resources];
  if (!identity || typeof identity.documentId !== 'string' || !identity.documentId || identity.documentId.length > 160 ||
      !/^[a-f0-9]{64}$/.test(identity.sourceSha256 || '')) throw Error('Reviewed source and document identity required');
  if (!crypto?.subtle || typeof crypto.subtle.digest !== 'function') throw Error('SHA-256 unavailable');
  if (mods !== null && (!Array.isArray(mods) || mods.length < 1 || mods.length > 2 ||
      mods.some(name => typeof name !== 'string' || !name || name.length > 160) ||
      new Set(mods).size !== mods.length)) throw Error('Select one or two reviewed Mods, or all');
  const selectedMods = mods === null ? null : [...mods];

  const originalPatch = replacer.do_patch, originalPublish = utils.replaceFollowSC2DataInfo;
  const patchOwn = Object.getOwnPropertyDescriptor(replacer, 'do_patch');
  const publishOwn = Object.getOwnPropertyDescriptor(utils, 'replaceFollowSC2DataInfo');
  const events = [], tokens = new Set(), encoder = new TextEncoder();
  const report = {schemaVersion: 1, identity: {documentId: identity.documentId, sourceSha256: identity.sourceSha256}, active: true, dropped: 0,
    selection: {mods: selectedMods, publication: 'all'}, filtered: 0,
    observerErrors: 0, firstFailure: null, cleanup: null, events};
  let sequence = 0, deadline;
  const failure = (kind, seq) => { report.firstFailure ||= {kind, sequence: seq}; };
  const safe = fn => { try { return fn(); } catch { report.observerErrors++; return null; } };

  function snapshot(sc, token) {
    return selectedResources.map(resource => {
      const value = sc?.passageDataItems?.map?.get(resource)?.content;
      const state = {resource, status: 'absent', sha256: null};
      if (typeof value !== 'string') return state;
      // Bound encoding allocation too, before allocating a UTF-8 copy.
      if (value.length > 32768) { state.status = 'content-limit'; return state; }
      const bytes = encoder.encode(value);
      if (bytes.length > 32768) { state.status = 'content-limit'; return state; }
      state.status = 'digest-pending';
      Promise.resolve(crypto.subtle.digest('SHA-256', bytes)).then(digest => {
        if (!token.active) return;
        state.sha256 = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
        state.status = 'captured';
      }, () => { if (token.active) { state.status = 'digest-failed'; report.observerErrors++; } });
      return state;
    });
  }
  function begin(kind, mod, sc) {
    const seq = ++sequence;
    if (!report.active) return {seq};
    if (kind === 'do_patch' && selectedMods !== null && !selectedMods.includes(mod)) { report.filtered++; return {seq}; }
    if (events.length >= 16) { report.dropped++; return {seq}; }
    const event = {sequence: seq, kind, mod: typeof mod === 'string' ? mod.slice(0, 160) : null,
      phase: 'started', before: null, after: null};
    const token = {seq, event, sc, active: true};
    tokens.add(token); events.push(event);
    event.before = snapshot(sc, token);
    return token;
  }
  function end(token, phase) {
    if (!report.active) return;
    if (phase === 'threw' || phase === 'rejected') failure(phase, token?.seq ?? null);
    if (!token?.active) return;
    token.event.phase = phase;
    token.event.after = snapshot(token.sc, token);
    token.sc = null;
  }
  function patch(...args) {
    const token = safe(() => begin('do_patch', args[0]?.mod?.name, args[1]));
    let result;
    try { result = Reflect.apply(originalPatch, this, args); }
    catch (error) { safe(() => end(token, 'threw')); throw error; }
    // Return the called method's exact Promise. Added reactions change rejection tracking/timing.
    safe(() => Promise.prototype.then.call(result,
      () => safe(() => end(token, 'resolved')),
      () => safe(() => end(token, 'rejected'))));
    return result;
  }
  function publish(...args) {
    const token = safe(() => begin('publication', null, args[0]));
    try {
      const result = Reflect.apply(originalPublish, this, args);
      // Only the reviewed synchronous publisher is supported; never infer async settlement.
      safe(() => end(token, result && typeof result.then === 'function' ? 'returned-unsettled' : 'returned'));
      return result;
    } catch (error) { safe(() => end(token, 'threw')); throw error; }
  }
  function restore(owner, name, wrapper, original, descriptor) {
    if (owner[name] !== wrapper) return 'ownership-conflict';
    if (descriptor) Object.defineProperty(owner, name, descriptor);
    else delete owner[name];
    return owner[name] === original ? 'restored' : 'restore-failed';
  }
  function stop(reason = 'explicit') {
    if (report.cleanup) return {...report.cleanup};
    clearTimeout(deadline); report.stopReason = reason;
    report.active = false;
    for (const token of tokens) {
      token.active = false; token.sc = null;
      if (token.event.phase === 'started') token.event.phase = 'stopped-unsettled';
      for (const state of [...(token.event.before || []), ...(token.event.after || [])]) {
        if (state.status === 'digest-pending') state.status = 'stopped-unsettled';
      }
    }
    tokens.clear();
    report.cleanup = {
      patch: safe(() => restore(replacer, 'do_patch', patch, originalPatch, patchOwn)) || 'restore-failed',
      publication: safe(() => restore(utils, 'replaceFollowSC2DataInfo', publish, originalPublish, publishOwn)) || 'restore-failed',
    };
    return {...report.cleanup};
  }
  try {
    Object.defineProperty(replacer, 'do_patch', {value: patch, writable: true, configurable: true});
    Object.defineProperty(utils, 'replaceFollowSC2DataInfo', {value: publish, writable: true, configurable: true});
  } catch (error) { stop(); throw error; }
  deadline = setTimeout(() => stop('deadline'), 30000); deadline.unref?.();
  return {read: () => JSON.parse(JSON.stringify(report)), stop: () => stop()};
}
module.exports = {install};
