interface Request {type?:unknown;operation:string;slot?:unknown;variable?:unknown;colour?:unknown;modder?:unknown;accessoryColour?:unknown}
interface Client {evaluate(expression:string):Promise<unknown>;send(method:string,params:unknown):Promise<unknown>}
// Explicit reviewed gameplay mapping, separate from diagnostic Contract 1.
// ponytail: simple head items only; add linked slots when a real task supplies their rules.
function validate(value:unknown) {
  const request=value as Request;
  const allowed = request?.operation === 'equip' ? ['type','operation','slot','variable','colour','modder','accessoryColour'] : ['type','operation','slot'];
  const text = (v:unknown) => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\u0000-\u001f]/.test(v);
  if (!request || Array.isArray(request) || Object.keys(request).some(k => !allowed.includes(k)) || request.type !== 'sw-wardrobe' ||
      request.slot !== 'head' || !['select-slot','equip','unequip'].includes(request.operation) ||
      request.operation === 'equip' && (!text(request.variable) || request.variable === 'naked' || !(text(request.colour) || request.colour === 0 || request.colour === null) ||
        !(request.modder === undefined || request.modder === null || text(request.modder)) ||
        !(request.accessoryColour===undefined||request.accessoryColour===null||request.accessoryColour===0||text(request.accessoryColour)))) throw Error('Unsupported wardrobe mapping request');
  return request;
}
const {reader}:typeof import('../../scripts/lib/browser/integration-soft-wet-gameplay.cjs')=require('../../scripts/lib/browser/integration-soft-wet-gameplay.cjs');

async function prepare(client:Client, request:Request) {
  validate(request);
  const current = await client.evaluate(`(${reader.toString()})(${JSON.stringify(request)})`) as {status?:unknown;index?:unknown;selector?:unknown;uiVersion?:unknown}|null;
  if (current?.status !== 'available') throw Object.assign(Error('Reviewed wardrobe mapping unavailable'),{code:'MAPPING_UNAVAILABLE'});
  const objectIds:unknown[] = [];
  try {
    if (request.operation !== 'select-slot') {
      const sources = ['window.SugarCube.State.variables.worn.head'];
      if (request.operation === 'equip') sources.push(`window.SugarCube.State.variables.wardrobe.head[${current.index}]`);
      for (const expression of sources) {
        const r = await client.send('Runtime.evaluate',{expression,returnByValue:false}) as {exceptionDetails?:unknown;result?:{objectId?:unknown}};
        if (r.exceptionDetails || !r.result?.objectId) throw Error('Original item binding unavailable');
        objectIds.push(r.result.objectId);
      }
    }
    return {action:{type:'web-click',selector:current.selector},objectIds,arguments:objectIds.map(objectId=>({objectId})),interpretation:current,
      source:`
        const mapped=(${reader.toString()})(${JSON.stringify(request)});
        if(mapped.status!=='available' || mapped.selector!==${JSON.stringify(current.selector)} || mapped.index!==${JSON.stringify(current.index)} ||
           mapped.uiVersion!==${JSON.stringify(current.uiVersion)}) return {ok:false,guardRejected:true};
        ${request.operation === 'select-slot' ? '' : `if(window.SugarCube.State.variables.worn.head!==observedInputs[0]) return {ok:false,guardRejected:true};`}
        ${request.operation !== 'equip' ? '' : `if(window.SugarCube.State.variables.wardrobe.head[${current.index}]!==observedInputs[1]) return {ok:false,guardRejected:true};`}
      `};
  } catch (error) {
    for (const objectId of objectIds) { try { await client.send('Runtime.releaseObject',{objectId}); } catch {} }
    throw error;
  }
}
export = {validate,reader,prepare};
