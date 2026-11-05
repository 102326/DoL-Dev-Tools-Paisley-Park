// Generated from gameplay.cts by TypeScript 6.0.2; source-lf-sha256=2e7c3334695bbfbbf2c888a5d61c47737275afe08f93311d6031a5ce83cd1239
"use strict";
// Explicit reviewed gameplay mapping, separate from diagnostic Contract 1.
// ponytail: simple head items only; add linked slots when a real task supplies their rules.
function validate(value) {
    const request = value;
    const allowed = request?.operation === 'equip' ? ['type', 'operation', 'slot', 'variable', 'colour', 'modder', 'accessoryColour'] : ['type', 'operation', 'slot'];
    const text = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\u0000-\u001f]/.test(v);
    if (!request || Array.isArray(request) || Object.keys(request).some(k => !allowed.includes(k)) || request.type !== 'sw-wardrobe' ||
        request.slot !== 'head' || !['select-slot', 'equip', 'unequip'].includes(request.operation) ||
        request.operation === 'equip' && (!text(request.variable) || request.variable === 'naked' || !(text(request.colour) || request.colour === 0 || request.colour === null) ||
            !(request.modder === undefined || request.modder === null || text(request.modder)) ||
            !(request.accessoryColour === undefined || request.accessoryColour === null || request.accessoryColour === 0 || text(request.accessoryColour))))
        throw Error('Unsupported wardrobe mapping request');
    return request;
}
const { reader } = require('../../scripts/lib/browser/integration-soft-wet-gameplay.cjs');
async function prepare(client, request) {
    validate(request);
    const current = await client.evaluate(`(${reader.toString()})(${JSON.stringify(request)})`);
    if (current?.status !== 'available')
        throw Object.assign(Error('Reviewed wardrobe mapping unavailable'), { code: 'MAPPING_UNAVAILABLE' });
    const objectIds = [];
    try {
        if (request.operation !== 'select-slot') {
            const sources = ['window.SugarCube.State.variables.worn.head'];
            if (request.operation === 'equip')
                sources.push(`window.SugarCube.State.variables.wardrobe.head[${current.index}]`);
            for (const expression of sources) {
                const r = await client.send('Runtime.evaluate', { expression, returnByValue: false });
                if (r.exceptionDetails || !r.result?.objectId)
                    throw Error('Original item binding unavailable');
                objectIds.push(r.result.objectId);
            }
        }
        return { action: { type: 'web-click', selector: current.selector }, objectIds, arguments: objectIds.map(objectId => ({ objectId })), interpretation: current,
            source: `
        const mapped=(${reader.toString()})(${JSON.stringify(request)});
        if(mapped.status!=='available' || mapped.selector!==${JSON.stringify(current.selector)} || mapped.index!==${JSON.stringify(current.index)} ||
           mapped.uiVersion!==${JSON.stringify(current.uiVersion)}) return {ok:false,guardRejected:true};
        ${request.operation === 'select-slot' ? '' : `if(window.SugarCube.State.variables.worn.head!==observedInputs[0]) return {ok:false,guardRejected:true};`}
        ${request.operation !== 'equip' ? '' : `if(window.SugarCube.State.variables.wardrobe.head[${current.index}]!==observedInputs[1]) return {ok:false,guardRejected:true};`}
      ` };
    }
    catch (error) {
        for (const objectId of objectIds) {
            try {
                await client.send('Runtime.releaseObject', { objectId });
            }
            catch { }
        }
        throw error;
    }
}
module.exports = { validate, reader, prepare };
