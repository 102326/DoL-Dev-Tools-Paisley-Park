// Generated from game-shop-native.cts by TypeScript 6.0.2; source-lf-sha256=470ddefe5772967471046dd0240c8cf40e424d326f34bdcc7ff984bdcaf45b5f
"use strict";
const { branch, readCurrent, dateGetterOf, sourceCheck } = require('./browser-abi/native-shop.cjs');
const { createHash } = require('node:crypto'), shop = require('./game-shop.cjs'), control = require('./game-native-control.cjs'), contracts = require('./game-contract.cjs');
const { bind, checkBindings } = require('./game-native-business-bindings.cjs'), environment = require('./game-native-environment.cjs'), receipts = require('./game-receipts.cjs');
const { operation } = require('./game-shop-operation.cjs'), profile = require('./game-shop-profile.json');
const sha = (s) => createHash('sha256').update(s).digest('hex');
const button = '#buy-send-home > .buy-button > .buy-button-inner', anchor = button + ' > a.link-internal';
async function prepare(client, raw, goal, attemptId, { quote, attestOnly = false, scope } = {}) {
    const request = shop.validate(raw);
    if (request.operation !== 'buy-one' || !quote || typeof attestOnly !== 'boolean' || !attestOnly && !/^[a-f0-9-]{36}$/.test((attemptId || '')))
        throw Object.assign(Error('Native purchase contract unavailable'), { code: 'MAPPING_UNAVAILABLE' });
    let mapped, held, releaseCalled = false;
    const groups = [];
    const release = async () => {
        releaseCalled = true;
        const results = await Promise.allSettled([...groups.splice(0).map(objectGroup => client.send('Runtime.releaseObjectGroup', { objectGroup })),
            ...(mapped ? [...mapped.objectIds.map(objectId => client.send('Runtime.releaseObject', { objectId })), ...mapped.objectGroups.map(objectGroup => client.send('Runtime.releaseObjectGroup', { objectGroup }))] : []), ...(held ? [held.release()] : [])]);
        if (results.some(r => r.status === 'rejected'))
            throw Object.assign(Error('Native shop binding cleanup failed'), { code: 'NATIVE_BINDING_CLEANUP_FAILED' });
    };
    try {
        mapped = await shop.prepare(client, request, goal, { quote });
        held = await control.attest(client, { kind: 'menu', selected: { type: 'web-click', selector: anchor } }, { allowShopPropagationStops: true });
        if (held.payloadSha256 !== profile.payloadSha256 || JSON.stringify(held.shadowKeys) !== JSON.stringify(profile.shadowKeys))
            throw Error('Original purchase payload differs');
        const saveWatch = await require('./game-native-save.cjs').bind(client, scope, held.objectGroup);
        const env = await environment.bind(client, held, require('./game-native-intro-profile.json'), undefined, saveWatch !== null);
        const business = await bind(client, held, profile, groups);
        const money = await contracts.member(client, business.bundleId, 'this.macros.find(r=>r.name==="money").fn', held.objectGroup);
        const time = await contracts.captured(client, money, 'Time', 'object', { maxResponseBytes: 16 * 1024 * 1024 });
        const dateGetter = await contracts.member(client, time, `(${dateGetterOf.toString()})(this)`, held.objectGroup);
        const compiled = `function(phase,inputs){const checkBindings=${checkBindings.toString()},dateGetterOf=${dateGetterOf.toString()};
      const reason=(${sourceCheck.toString()})(inputs[0],inputs[1],inputs[2]);if(reason!==undefined)return reason;
      const branchReason=(${branch.toString()})(phase,${saveWatch !== null});if(branchReason!==undefined)return branchReason;
      const nativeEnvInputs=[inputs[3]];return (function(){${env.guard}})();}`;
        const guard = await client.send('Runtime.evaluate', { expression: '(' + compiled + ')', objectGroup: held.objectGroup, returnByValue: false });
        if (guard.exceptionDetails || !guard.result?.objectId || await contracts.functionSource(client, guard.result.objectId) !== compiled)
            throw Error('Native purchase guard unavailable');
        const inputs = [{ objectId: business.bundleId }, { objectId: time }, { objectId: dateGetter }, ...env.arguments];
        const check = await client.send('Runtime.callFunctionOn', { objectId: guard.result.objectId, functionDeclaration: 'function(...inputs){return this("before",inputs)}', arguments: inputs, returnByValue: true });
        if (check.exceptionDetails || check.result?.type !== 'undefined')
            throw Error('Native shop preflight rejected: ' + (check.result?.value || 'exception'));
        const raw = await client.send('Runtime.callFunctionOn', { objectId: time, functionDeclaration: `function(q){return (${readCurrent.toString()})(q,this.date.timeStamp)}`, arguments: [{ value: quote }], returnByValue: true });
        if (raw.exceptionDetails || !raw.result?.value)
            throw Error('Native purchase original snapshot unavailable');
        const before = raw.result.value;
        if (attestOnly) {
            await release();
            return { status: 'attested', actions: false, profile: profile.id, before, widgets: business.widgets, functions: business.functions, bindingCleanup: 'completed' };
        }
        const binding = { provider: 'dol-shop-native', contract: 'shop-buy-one-' + (saveWatch ? 'save-' : '') + sha(JSON.stringify(profile) + operation.toString() + compiled + readCurrent.toString() + (saveWatch?.digest || '')).slice(0, 12),
            contextNonce: await receipts.context(client), requestDigest: sha(JSON.stringify({ attemptId, request, quote, before, payload: held.payloadSha256 })) };
        const o = held.objects, args = [{ objectId: o.node }, { objectId: o.click }, { objectId: o.context }, { objectId: guard.result.objectId }, ...inputs, ...mapped.arguments];
        const saveIndex = saveWatch ? args.push({ objectId: saveWatch.objectId }) - 1 : null;
        const source = `if(node!==observedInputs[0].parentElement||(${control.clickReader.toString()})(observedInputs[0],true)!==observedInputs[1]||
      observedInputs[2]?.payload?.[0]?.contents!==${JSON.stringify(held.payload)})return {ok:false,guardRejected:true};
      ${saveWatch ? `if(observedInputs[${saveIndex}].check()!==undefined)return {ok:false,guardRejected:true};` : ''}
      const mappedGuard=(function(observedInputs){${mapped.source}})(observedInputs.slice(8));if(mappedGuard?.guardRejected)return mappedGuard;
      try{if(observedInputs[3]('before',observedInputs.slice(4,8))!==undefined)return {ok:false,guardRejected:true};}catch{return {ok:false,guardRejected:true};}`;
        const config = { namespace: receipts.namespace, binding, attemptId, quote, before };
        let operationSource = `return (${operation.toString()})(observedInputs[0],${JSON.stringify(config)},function(){return (${readCurrent.toString()})(${JSON.stringify(quote)},observedInputs[5].date.timeStamp)},function(phase){return observedInputs[3](phase,observedInputs.slice(4,8))},markOperationDispatch,invokeBoundClick${saveWatch ? `,observedInputs[${saveIndex}]` : ''});`;
        if (saveWatch)
            operationSource = require('./game-native-save.cjs').execution(operationSource, saveIndex);
        if (Buffer.byteLength(operationSource) > 32768)
            throw Error('Native purchase operation bound');
        return { clickReceiverObjectId: o.node, action: { type: 'web-click', selector: button }, arguments: args, objectGroups: [held.objectGroup, ...groups, ...mapped.objectGroups], objectIds: mapped.objectIds,
            source, executionBinding: binding, interpretation: { ...mapped.interpretation, provider: 'dol-shop-native', contract: binding.contract, execution: 'native-operation' },
            operation: require('./action.cjs').reviewedOperation('native-shop-buy-one', operationSource) };
    }
    catch (error) {
        if (releaseCalled && error.code === 'NATIVE_BINDING_CLEANUP_FAILED')
            throw error;
        try {
            await release();
        }
        catch (cleanup) {
            throw Object.assign(new AggregateError([error, cleanup], 'Native purchase preparation and cleanup failed'), { code: 'NATIVE_BINDING_CLEANUP_FAILED' });
        }
        throw Object.assign(Error('Reviewed native purchase unavailable', { cause: error }), { code: 'MAPPING_UNAVAILABLE' });
    }
}
const nativeShop = { prepare, branch, readCurrent, sourceCheck, dateGetterOf };
module.exports = nativeShop;
