// Generated from game-native-environment.cts by TypeScript 6.0.2; source-lf-sha256=d8010f2337ba73e34d8d533670e2efe37c2265601371c6c608533fce66af7333
"use strict";
const { collect, ordered, tooltipMovesAllowed, sameFlags, check, capture, metadata, saveFlagsMatch } = require('./browser-abi/native-environment.cjs');
function normalizedMetadata(rows) {
    const clean = (r) => r.mode === 'event' ? { ...r, name: undefined } : r;
    return [...rows.filter(r => r.mode !== 'event'), ...rows.filter(r => r.mode === 'event' && r.functionName !== 'updateCaptionTooltip'),
        ...rows.filter(r => r.mode === 'event' && r.functionName === 'updateCaptionTooltip')].map(clean);
}
async function bind(client, held, raw, flagsMatch = sameFlags, allowSave = false) {
    const profile = raw;
    const { createHash } = require('node:crypto');
    const sha = (value) => createHash('sha256').update(value).digest('hex');
    if (!profile || profile.terminalReviewed !== true || typeof profile.id !== 'string' || !Array.isArray(profile.functions) || !Array.isArray(profile.texts) || typeof flagsMatch !== 'function')
        throw Error('Reviewed native environment profile required');
    const evaluated = await client.send('Runtime.evaluate', { expression: `(()=>{const collect=${collect.toString()};return (${capture.toString()})()})()`, returnByValue: false, objectGroup: held.objectGroup, silent: true });
    const bundle = evaluated.result?.objectId;
    if (evaluated.exceptionDetails || !bundle)
        throw Error('Native environment capture unavailable');
    const result = await client.send('Runtime.callFunctionOn', { objectId: bundle, functionDeclaration: metadata.toString(), returnByValue: true });
    const value = result.result?.value;
    if (result.exceptionDetails || !value)
        throw Error('Native environment metadata unavailable');
    const functions = value.functions.map(({ source, ...row }) => ({ ...row, sha256: source === null ? null : sha(source) }));
    const texts = value.texts.map(({ name, value }) => ({ name, sha256: sha(value) }));
    const compare = (a, b) => allowSave ? saveFlagsMatch(a, b, flagsMatch, require('./game-native-save.cjs').flags) : flagsMatch(a, b);
    if (compare(value.flags, profile.flags) !== true || !tooltipMovesAllowed(functions, profile.functions) || JSON.stringify(normalizedMetadata(functions)) !== JSON.stringify(normalizedMetadata(profile.functions)) || JSON.stringify(texts) !== JSON.stringify(profile.texts))
        throw Error('Native environment differs from reviewed profile');
    const member = async (key) => {
        const r = await client.send('Runtime.callFunctionOn', { objectId: bundle, functionDeclaration: `function(){return this[${JSON.stringify(key)}]}`, returnByValue: false, objectGroup: held.objectGroup });
        if (r.exceptionDetails || !r.result?.objectId)
            throw Error('Native environment owner unavailable');
        return r.result.objectId;
    };
    return { id: profile.id, terminalReviewed: true, arguments: [{ objectId: bundle }],
        objects: { jq: await member('jq'), footer: await member('footer'), ...(value.hasAddon === true ? { addon: await member('addon') } : {}) },
        guard: `const collect=${collect.toString()},ordered=${ordered.toString()},tooltipMovesAllowed=${tooltipMovesAllowed.toString()},sameFlags=${sameFlags.toString()};return (${check.toString()})(collect(),nativeEnvInputs[0],${allowSave ? `function(a,b){return (${saveFlagsMatch.toString()})(a,b,${flagsMatch.toString()},${require('./game-native-save.cjs').flags.toString()})}` : flagsMatch.toString()});` };
}
const environment = { collect, ordered, check, tooltipMovesAllowed, capture, metadata, normalizedMetadata, bind, sameFlags };
module.exports = environment;
