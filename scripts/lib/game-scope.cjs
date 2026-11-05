// Generated from game-scope.cts by TypeScript 6.0.2; source-lf-sha256=1c596f57e4924ea00e1b0ad1eb66e37ac11acfb56955286d7561dcc8ec0fed31
"use strict";
// Host-granted task scope. Data here records authority; it cannot grant it.
const path = require('node:path'), semantic = require('./game-semantic.cjs');
const keys = (v, allowed) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => allowed.includes(k));
function scope(raw) {
    const s = raw;
    if (s?.host === 'chrome')
        return keys(s, ['host', 'workspace', 'profileId', 'origin', 'intents', 'dataDomain']) && typeof s.workspace === 'string' && path.isAbsolute(s.workspace) && typeof s.profileId === 'string' && /^[a-f0-9]{64}$/.test(s.profileId) && typeof s.origin === 'string' &&
            (() => { try {
                const u = new URL(s.origin);
                return u.protocol === 'http:' && u.hostname === '127.0.0.1' && !!u.port && u.origin === s.origin;
            }
            catch {
                return false;
            } })() &&
            s.dataDomain === 'chrome-origin-storage' && Array.isArray(s.intents) && s.intents.length <= 32 && new Set(s.intents).size === s.intents.length && s.intents.every(i => semantic.intents.includes(i) || i === 'debug');
    return keys(s, ['workspace', 'serial', 'package', 'userId', 'signingHash', 'intents', 'dataDomain']) && typeof s.workspace === 'string' && path.isAbsolute(s.workspace) &&
        typeof s.serial === 'string' && /^[\w.:-]{1,128}$/.test(s.serial) && typeof s.package === 'string' && /^[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)+$/.test(s.package) && typeof s.userId === 'string' && /^(0|[1-9]\d*)$/.test(s.userId) &&
        typeof s.signingHash === 'string' && /^[a-f0-9]{1,16}$/.test(s.signingHash) && s.dataDomain === 'app-user-data' && Array.isArray(s.intents) && s.intents.length <= 32 &&
        new Set(s.intents).size === s.intents.length && s.intents.every(i => semantic.intents.includes(i) || ['debug', 'data-reset'].includes(i));
}
function assertSessionTarget(s, target) {
    if (!scope(s) || (target.host === 'chrome' ? s.host !== 'chrome' || s.profileId !== target.profileId || s.origin !== target.origin : s.host === 'chrome' || ['serial', 'package', 'userId'].some(k => s[k] !== target[k])))
        throw Object.assign(Error('Session authorization target mismatch'), { code: 'PROJECT_SCOPE_TARGET_CHANGED' });
}
function assertTarget(options, g, userId, packageInfo) {
    const s = g.scope;
    if (!scope(s) || s.host === 'chrome')
        throw Error('Invalid host-granted authorization scope');
    if (options.serial !== s.serial || options.package !== s.package || userId !== s.userId)
        throw Object.assign(Error('Project authorization target mismatch'), { code: 'PROJECT_SCOPE_TARGET_CHANGED' });
    if (options.projectIntent !== undefined && !s.intents.includes(options.projectIntent))
        throw Object.assign(Error('Project operation outside authorized scope'), { code: 'PROJECT_SCOPE_INTENT_CHANGED' });
    const block = packageInfo.split(`Package [${options.package}]`)[1]?.split(/\n\s*Package \[/)[0];
    const signing = block?.match(/signatures=PackageSignatures\{[^\r\n]*?signatures:\[([a-f0-9]+)\]/)?.[1];
    if (signing !== s.signingHash)
        throw Object.assign(Error('Project signing identity changed'), { code: 'PROJECT_SCOPE_SIGNER_CHANGED' });
}
const authorization = { validate: scope, assertTarget, assertSessionTarget };
module.exports = authorization;
