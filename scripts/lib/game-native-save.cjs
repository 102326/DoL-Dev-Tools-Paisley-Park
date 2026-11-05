// Generated from game-native-save.cts by TypeScript 6.0.2; source-lf-sha256=cdfb900f12569f9e355f35bf3ce00e751fc0a1bd2667b524772cf936343db5e6
"use strict";
const { flags, capture } = require('./browser-abi/native-save.cjs');
const { createHash } = require('node:crypto'), contracts = require('./game-contract.cjs'), profile = require('./game-native-save-profile.json');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const authorized = (s) => require('./game-scope.cjs').validate(s) && s.intents.includes('save');
// Save flags describe permitted gameplay, not the reviewed native owner inventory.
async function bind(client, scope, objectGroup) {
    if (!authorized(scope))
        return null;
    const result = await client.send('Runtime.evaluate', { expression: `(${capture.toString()})(${JSON.stringify(require('./game-receipts.cjs').namespace)})`, objectGroup, returnByValue: false });
    if (result.exceptionDetails || !result.result?.objectId)
        throw Error('Scoped native save observer unavailable');
    const objectId = result.result.objectId;
    const meta = await client.send('Runtime.callFunctionOn', { objectId, functionDeclaration: 'function(){return this.metadata()}', returnByValue: true });
    const v = meta.result?.value;
    if (meta.exceptionDetails || !v || v.version !== profile.version || Object.entries(profile.methods).some(([k, h]) => sha(v.methods[k] || '') !== h) || sha(v.methods.setItem || '') !== profile.setItem ||
        Object.entries(profile.hooks).some(([k, hs]) => !Array.isArray(v.hooks[k]) || JSON.stringify(v.hooks[k].map(sha)) !== JSON.stringify(hs)) || sha(v.marshal || '') !== profile.marshal || sha(v.decoder || '') !== profile.decoder || v.dbNameGetter !== profile.dbNameGetter)
        throw Error('Scoped native save implementation not reviewed');
    const get = async (expression) => { const r = await client.send('Runtime.evaluate', { expression, objectGroup, returnByValue: false }); if (r.exceptionDetails || !r.result?.objectId)
        throw Error('Native save reference unavailable'); return r.result.objectId; };
    const save = await get('window.idb.saveState'), set = await contracts.captured(client, save, 'setItem');
    if (!await contracts.sameObject(client, set, await get('window.idb.setItem')) || !await contracts.sameObject(client, await contracts.captured(client, save, 'State', 'object', { maxResponseBytes: 8 * 1024 * 1024 }), await get('window.SugarCube.State')))
        throw Error('Native save captured owner changed');
    for (const key of ['makePromise', 'openDB'])
        if (sha(await contracts.functionSource(client, await contracts.captured(client, set, key))) !== profile[key])
            throw Error('Native save transaction implementation changed');
    return { objectId, digest: sha(JSON.stringify(profile) + capture.toString()) };
}
function validateEvidence(raw) { const v = raw; return v && Reflect.ownKeys(v).length === 6 && Object.keys(v).every(k => ['kind', 'slot', 'count', 'transactions', 'committed', 'readBack'].includes(k)) && v.kind === 'native-idb-save' && v.slot === 0 && Number.isSafeInteger(v.count) && v.count >= 0 && v.count <= 8 && v.transactions === v.count && v.committed === true && v.readBack === true; }
function execution(source, index) {
    return `return (async()=>{const nativeSaveWatch=observedInputs[${index}];try{return await (async()=>{${source}})()}finally{if(!nativeSaveWatch.restore())throw Error('Native save observer cleanup conflict')}})();`;
}
// Validate the new save witness separately, then reuse the original business projection.
function receipt(rawReceipt, rawEffect) {
    const r = rawReceipt, e = rawEffect;
    const contract = e?.executionBinding?.contract, hasSave = /-save-[a-f0-9]{12}$/.test((contract || ''));
    if (!hasSave)
        return Object.hasOwn(r.evidence || {}, 'save') ? null : { r, e };
    if (r.outcome === 'occurred' && (!r.remoteClosed || !validateEvidence(r.evidence?.save)))
        return null;
    const evidence = r.evidence ? Object.fromEntries(Object.entries(r.evidence).filter(([k]) => k !== 'save')) : undefined;
    return { r: { ...r, ...(evidence ? { evidence } : {}) }, e: { ...e, executionBinding: { ...e.executionBinding, contract: contract.replace(/-save-([a-f0-9]{12})$/, '-$1') } } };
}
const save = { authorized, flags, capture, bind, validateEvidence, execution, receipt };
module.exports = save;
