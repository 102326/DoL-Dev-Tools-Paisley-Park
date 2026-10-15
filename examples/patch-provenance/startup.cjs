'use strict';
const {install} = require('./observe.cjs');

// Explicit diagnostic Mod entry: the caller supplies hashes reviewed for this target build.
function register(host, reviewed) {
  if (host.WhiteSnakePatchProbe) throw Error('Probe already registered');
  if (host.location?.origin !== 'https://localhost' || !host.modUtils?.getAddonPluginManager ||
      !host.crypto?.subtle || !Array.isArray(reviewed?.resources) ||
      reviewed.resources.length < 1 || reviewed.resources.length > 2 ||
      reviewed.resources.some(n => typeof n !== 'string' || !n || n.length > 160) ||
      new Set(reviewed.resources).size !== reviewed.resources.length ||
      (reviewed.mods != null && (!Array.isArray(reviewed.mods) || reviewed.mods.length < 1 || reviewed.mods.length > 2 ||
        reviewed.mods.some(n => typeof n !== 'string' || !n || n.length > 160) || new Set(reviewed.mods).size !== reviewed.mods.length)) ||
      !['patchSha256', 'publicationSha256'].every(k => /^[a-f0-9]{64}$/.test(reviewed[k] || ''))) {
    throw Error('Reviewed Android localhost profile required');
  }
  let observation, stopped = false;
  const report = {schemaVersion: 1, document: {nonce: host.crypto.randomUUID(), timeOrigin: host.performance.timeOrigin},
    status: 'registered', coverage: 'afterEarlyLoad installation through this addon afterPatchModToGame hook; later publishers not covered',
    reviewed: {patchSha256: reviewed.patchSha256, publicationSha256: reviewed.publicationSha256,
      resources: [...reviewed.resources], mods: reviewed.mods == null ? null : [...reviewed.mods]}};
  const profile = report.reviewed;
  const read = () => {
    const data = observation?.read() ?? null;
    return JSON.parse(JSON.stringify({...report, status: stopped || data?.active === false ? 'stopped' : report.status, observation: data}));
  };
  const stop = () => { stopped = true; report.status = 'stopped'; return observation?.stop() ?? null; };
  const api = Object.freeze({read, stop});
  const hooks = {
    async afterEarlyLoad() {
      if (stopped || observation) return;
      let timer;
      try {
        const replacer = host.modUtils.getMod('TweeReplacer')?.modRef, utils = host.modUtils;
        if (typeof replacer?.do_patch !== 'function' || typeof utils.replaceFollowSC2DataInfo !== 'function') {
          report.status = 'unsupported-api'; return;
        }
        const patch = replacer.do_patch, publication = utils.replaceFollowSC2DataInfo;
        const digest = async fn => Array.from(new Uint8Array(await host.crypto.subtle.digest('SHA-256',
          new TextEncoder().encode(Function.prototype.toString.call(fn)))), b => b.toString(16).padStart(2, '0')).join('');
        const actual = await Promise.race([Promise.all([digest(patch), digest(publication)]),
          new Promise((resolve, reject) => { timer = setTimeout(() => reject(Error('Source check deadline')), 1000); })]);
        if (stopped) return;
        report.actual = {patchSha256: actual[0], publicationSha256: actual[1]};
        if (actual[0] !== profile.patchSha256 || actual[1] !== profile.publicationSha256 ||
            replacer.do_patch !== patch || utils.replaceFollowSC2DataInfo !== publication) {
          report.status = 'source-mismatch'; return;
        }
        observation = install({replacer, utils, resources: profile.resources, mods: profile.mods,
          identity: {documentId: report.document.nonce, sourceSha256: actual[0]}, crypto: host.crypto});
        report.status = 'collecting';
      } catch { if (!stopped) report.status = 'installation-failed'; }
      finally { clearTimeout(timer); }
    },
    async afterPatchModToGame() {
      if (!observation || stopped) return;
      report.ownAfterPatchHookReached = true;
      // Give pending digests a bounded drain; this deliberately adds diagnostic startup latency.
      const end = Date.now() + 500;
      while (!stopped && JSON.stringify(observation.read()).includes('digest-pending') && Date.now() < end) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      stop();
    },
  };
  Object.defineProperty(host, 'WhiteSnakePatchProbe', {value: api, configurable: true});
  try { host.modUtils.getAddonPluginManager().registerAddonPlugin('WhiteSnakePatchProbe', 'PatchObservation', hooks); }
  catch (error) { stop(); if (host.WhiteSnakePatchProbe === api) delete host.WhiteSnakePatchProbe; throw error; }
  return api;
}
module.exports = {register};
