// Generated from game-project-provider.cts by TypeScript 6.0.2; source-lf-sha256=98b741618f6efe543b6d74f807c6c2d50d7bbfbbc1469f1ad68aa11964f59db1
"use strict";
'use strict';
// Reviewed project Recipes use the existing Session, Action and receipt contracts.
// Local modules have Node permissions; this is not an untrusted plugin sandbox.
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm'), { createHash } = require('node:crypto');
const native = require('./game-native-provider.cjs'), semantic = require('./game-semantic.cjs'), receipts = require('./game-receipts.cjs'), action = require('./action.cjs');
const { validate: scope, assertTarget } = require('./game-scope.cjs');
const id = 'project-experiment', hash = (v) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const keys = (v, allowed) => (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => allowed.includes(k)));
const bounded = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\u0000-\u001f]/.test(v);
function validateGoal(raw) {
    const g = raw;
    return keys(g, ['description', 'kind', 'recipe', 'scope', 'predicate', 'inputs']) && g.kind === id && path.isAbsolute(g.recipe || '') && scope(g.scope) && native.validateGoal(g.predicate) &&
        keys(g.inputs ?? {}, Object.keys(g.inputs ?? {})) && Buffer.byteLength(JSON.stringify(g.inputs ?? {})) <= 4096;
}
function validateRequest(raw) {
    const r = raw;
    if (!validateGoal(r?.goal))
        throw Error('Invalid project experiment Goal/scope');
    native.validateRequest({ ...r, goal: r.goal.predicate });
    recipe(r.goal);
    return JSON.parse(JSON.stringify(r));
}
function recipe(raw, expected) {
    const g = raw;
    if (!validateGoal(g))
        throw Error('Invalid project experiment Goal');
    const root = fs.realpathSync(g.scope.workspace), file = fs.realpathSync(g.recipe), relative = path.relative(root, file);
    if (!relative || relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative) || path.extname(file) !== '.cjs' || !fs.statSync(file).isFile() || fs.statSync(file).size > 65536)
        throw Error('Recipe must be a bounded local CJS file inside the scoped workspace');
    const sha256 = hash(fs.readFileSync(file, 'utf8'));
    if (expected !== undefined && sha256 !== expected)
        throw Error('Recipe changed; observe fresh candidates before dispatch');
    delete require.cache[require.resolve(file)];
    const value = require(file);
    if (!keys(value, ['schemaVersion', 'operations']) || value.schemaVersion !== 1 || !Array.isArray(value.operations) || !value.operations.length || value.operations.length > 16)
        throw Error('Invalid reviewed project Recipe');
    const seen = new Set(), operations = value.operations.map(raw => {
        const o = raw;
        if (!keys(o, ['id', 'label', 'intent', 'read', 'quote', 'execute', 'outcome', 'sceneTransition']) || !/^[a-z][a-z0-9-]{0,63}$/.test((o.id || '')) || seen.has(o.id) || !bounded(o.label) || !semantic.intents.includes(o.intent) || o.sceneTransition !== undefined && o.sceneTransition !== 'passage')
            throw Error('Invalid project operation');
        seen.add(o.id);
        const sources = {};
        for (const k of ['read', 'quote', 'execute', 'outcome']) {
            if (typeof o[k] !== 'function')
                throw Error('Recipe requires independent read, quote, execute and Outcome functions');
            const source = Function.prototype.toString.call(o[k]);
            if (Buffer.byteLength(source) > 8192)
                throw Error('Oversized project operation');
            new vm.Script('(' + source + ')');
            sources[k] = source;
        }
        return { id: o.id, label: o.label, intent: o.intent, sources, sourceHash: hash(sources), ...(o.sceneTransition ? { sceneTransition: o.sceneTransition } : {}) };
    });
    return { sha256, operations };
}
function validateAction(raw, intent, rawg) {
    const a = raw, g = rawg;
    if (!keys(a, ['type', 'operation', 'recipeSha256', 'sourceHash', 'before', 'cost', 'sceneTransition']) || a.type !== id || !/^[a-f0-9]{64}$/.test((a.recipeSha256 || '')) || !/^[a-f0-9]{64}$/.test((a.sourceHash || '')) || !Number.isSafeInteger(a.cost) || a.cost < 0 || !keys(a.before, Object.keys(a.before ?? {})) || Buffer.byteLength(JSON.stringify(a.before)) > 2048)
        throw Error('Invalid project experiment selection');
    const r = recipe(g, a.recipeSha256), o = r.operations.find(o => o.id === a.operation);
    if (!g.scope.intents.includes(intent))
        throw Error('Project operation outside scope');
    if (!o || o.intent !== intent || o.sourceHash !== a.sourceHash || o.sceneTransition !== a.sceneTransition)
        throw Error('Project operation identity mismatch');
    return o;
}
async function observe(client, rawg) {
    const g = rawg;
    try {
        const r = recipe(g), operations = [];
        for (const o of r.operations) {
            if (!g.scope.intents.includes(o.intent))
                continue;
            const before = await client.evaluate(`(${o.sources.read})(${JSON.stringify(g.inputs ?? {})})`);
            if (!keys(before, Object.keys(before ?? {})) || Buffer.byteLength(JSON.stringify(before)) > 2048)
                throw Error('Project original-state snapshot unavailable');
            const cost = await client.evaluate(`(${o.sources.quote})(${JSON.stringify(before)},${JSON.stringify(g.inputs ?? {})})`);
            if (cost === null)
                continue;
            if (!Number.isSafeInteger(cost) || cost < 0)
                throw Error('Project quote unavailable');
            operations.push({ operation: o.id, label: o.label, intent: o.intent, recipeSha256: r.sha256, sourceHash: o.sourceHash, before, cost, ...(o.sceneTransition ? { sceneTransition: o.sceneTransition } : {}) });
        }
        return { project: { status: 'available', operations } };
    }
    catch (error) {
        // Current Recipe availability cannot invalidate an old bound terminal receipt.
        return { project: { status: 'failed', reason: error?.code === 'ENOENT' ? 'recipe-file-unavailable' : 'recipe-or-original-state-read-failed', operations: [] } };
    }
}
function candidates(_facts, epoch, _proof, rawObserved, rawg) {
    const observed = rawObserved, g = rawg;
    return (observed?.operations ?? []).filter(o => g.scope.intents.includes(o.intent)).map(o => {
        const selected = { type: id, operation: o.operation, recipeSha256: o.recipeSha256, sourceHash: o.sourceHash, before: o.before, cost: o.cost, ...(o.sceneTransition ? { sceneTransition: o.sceneTransition } : {}) };
        return { ref: hash([epoch, selected]), kind: o.intent, cost: o.cost, risk: 'normal', label: o.label, selected, capability: { provider: id, name: 'recipe' } };
    });
}
function validateDescriptor(raw, g) { const c = raw; const o = validateAction(c.selected, c.kind, g); if (c.cost !== c.selected.cost || c.quote !== undefined || c.capability?.provider !== id || c.capability?.name !== 'recipe')
    throw Error('Project candidate/cost mismatch'); return o; }
function legacyDescriptor(raw, intent, g, ref) { const selected = raw; const descriptor = { ref, kind: intent, cost: selected.cost, risk: 'normal', selected, capability: { provider: id, name: 'recipe' } }; validateDescriptor(descriptor, g); return descriptor; }
const { operation } = require('./browser-abi/project-operation.cjs');
async function prepare(client, raw, rawg, attemptId) {
    const descriptor = raw, g = rawg;
    const o = validateDescriptor(descriptor, g), current = await client.evaluate(`(${o.sources.read})(${JSON.stringify(g.inputs ?? {})})`);
    if (JSON.stringify(current) !== JSON.stringify(descriptor.selected.before))
        throw Error('Project preparation state changed');
    const currentCost = await client.evaluate(`(${o.sources.quote})(${JSON.stringify(current)},${JSON.stringify(g.inputs ?? {})})`);
    if (currentCost !== descriptor.cost)
        throw Error('Project quote changed');
    const nonce = await receipts.context(client), binding = { provider: id, contract: o.sceneTransition ? 'project-recipe-v2' : 'project-recipe-v1', contextNonce: nonce, requestDigest: hash([descriptor, g.inputs ?? {}, g.scope]) };
    const config = { namespace: receipts.namespace, binding, attemptId, before: current, inputs: g.inputs ?? {}, recipeSha256: descriptor.selected.recipeSha256, operation: o.id, ...(o.sceneTransition ? { sceneTransition: o.sceneTransition } : {}) };
    return { action: { type: 'web-click', selector: '#passages > .passage' }, executionBinding: binding, projectExperiment: true,
        interpretation: { operation: o.id, recipeSha256: config.recipeSha256 },
        operation: action.reviewedOperation('project-experiment', `return (${operation.toString()})(node,${JSON.stringify(config)},${o.sources.read},${o.sources.execute},${o.sources.outcome},markOperationDispatch)`) };
}
function validateReceipt(rawr, rawe) {
    const r = rawr, e = rawe;
    if (r.outcome !== 'occurred' || !r.remoteClosed)
        return r.evidence === undefined;
    const p = r.evidence;
    return e.executionBinding?.provider === id && e.executionBinding.contract === (e.action.selected.sceneTransition ? 'project-recipe-v2' : 'project-recipe-v1') && keys(p, ['kind', 'recipeSha256', 'operation', 'before', 'after', 'executionCompleted']) &&
        p.kind === id && p.recipeSha256 === e.action.selected.recipeSha256 && p.operation === e.action.selected.operation && p.executionCompleted === true &&
        JSON.stringify(p.before) === JSON.stringify(e.action.selected.before) && keys(p.after, Object.keys(p.after ?? {})) && Number.isSafeInteger(r.spent) && r.spent >= 0;
}
const provider = { id, supportsGoal: (g) => g?.kind === id, validateGoal, validateRequest, validateAction, validateDescriptor, legacyDescriptor, observe, candidates, prepare, operation, validateReceipt, assertTarget,
    probe: (g) => native.probe(g.predicate), satisfied: (s, g, c) => native.satisfied(s, g.predicate, c), publicProof: (s) => s.scene?.goalProof ?? null,
    traceProgress: (p) => native.traceProgress(p), traceDistances: (p, g) => native.traceDistances(p, g.predicate),
    canPrepare: (raw, rawg, _c) => { const a = raw, g = rawg; return g.scope.intents.includes(a.kind) && (a.selected?.type !== id || validateDescriptor(a, g) && true); },
    publicOutcome: (raw) => { const o = raw; return { ...o, ...(o.evidence ? { evidence: { ...o.evidence, before: 'private', after: 'private' } } : {}) }; } };
module.exports = provider;
