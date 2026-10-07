// Explicit reviewed gameplay mapping, separate from diagnostic Contract 1.
// ponytail: simple head items only; add linked slots when a real task supplies their rules.
function validate(request) {
  const allowed = request?.operation === 'equip' ? ['type','operation','slot','variable','colour','modder','accessoryColour'] : ['type','operation','slot'];
  const text = v => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\u0000-\u001f]/.test(v);
  if (!request || Array.isArray(request) || Object.keys(request).some(k => !allowed.includes(k)) || request.type !== 'sw-wardrobe' ||
      request.slot !== 'head' || !['select-slot','equip','unequip'].includes(request.operation) ||
      request.operation === 'equip' && (!text(request.variable) || request.variable === 'naked' || !(text(request.colour) || request.colour === 0 || request.colour === null) ||
        !(request.modder === undefined || request.modder === null || text(request.modder)) ||
        !(request.accessoryColour===undefined||request.accessoryColour===null||request.accessoryColour===0||text(request.accessoryColour)))) throw Error('Unsupported wardrobe mapping request');
  return request;
}
function reader(request) {
  const state = window.SugarCube?.State, v = state?.variables, roots = document.querySelectorAll('#passages > .passage');
  const uiVersion = window.DoLGameUI?.version;
  const unavailable = reason => ({status:'unsupported',reason,source:'optional Soft & Wet control interpretation; original game item fields'});
  if (!['2.2.1','2.2.2'].includes(uiVersion) || state?.passage !== 'Wardrobe' || roots.length !== 1 || roots[0].getAttribute('data-passage') !== 'Wardrobe' ||
      v?.wardrobe_location !== 'wardrobe' || roots[0].querySelectorAll('.dgw-shell').length !== 1 || roots[0].querySelector('.dgw-shell.dgw-managing')) return unavailable('verified-wardrobe-context-unavailable');
  const simple = item => !!item && !item.cursed && item.outfitPrimary === undefined && item.outfitSecondary === undefined && !item.colourCustom && !item.accessory_colourCustom;
  const worn = v.worn?.head;
  if (!simple(worn)) return unavailable('linked-custom-or-cursed-worn-item');
  let selector, index = null;
  if (request.operation === 'select-slot') {
    const buttons = [...roots[0].querySelectorAll('.dgw-slots > button')];
    const matches = buttons.map((n,i)=>({n,i})).filter(({n})=>n.textContent.trim().replace(/\s*!\s*$/,'') === '头饰');
    if (matches.length !== 1) return unavailable('slot-control-ambiguous');
    selector = '#passages > .passage .dgw-slots > button:nth-of-type('+(matches[0].i+1)+')';
  } else {
    if (v.lastWardrobeSlot !== 'head') return unavailable('wrong-original-slot');
    if (request.operation === 'equip') {
      const list = v.wardrobe?.head;
      if (!Array.isArray(list) || list.length > 512) return unavailable('bounded-original-slot-unavailable');
      const matches = list.map((item,i)=>({item,i})).filter(({item})=>item?.variable === request.variable && (item.colour ?? null) === request.colour && (item.modder ?? null) === (request.modder ?? null) &&
        (request.accessoryColour===undefined||(item.accessory_colour??null)===request.accessoryColour));
      if (matches.length !== 1) return unavailable('item-identity-ambiguous-or-missing');
      if (!simple(matches[0].item)) return unavailable('linked-custom-or-cursed-item');
      index = matches[0].i;
      selector = '#passages > .passage .dgw-item[data-key="head:'+index+'"]';
    } else selector = '#passages > .passage .dgw-strip';
  }
  if (document.querySelectorAll(selector).length !== 1) return unavailable('mapped-control-unavailable');
  return {status:'available',source:'optional Soft & Wet control interpretation; original game item fields',uiVersion,selector,index,operation:request.operation,slot:'head'};
}
async function prepare(client, request) {
  validate(request);
  const current = await client.evaluate(`(${reader.toString()})(${JSON.stringify(request)})`);
  if (current?.status !== 'available') throw Object.assign(Error('Reviewed wardrobe mapping unavailable'),{code:'MAPPING_UNAVAILABLE'});
  const objectIds = [];
  try {
    if (request.operation !== 'select-slot') {
      const sources = ['window.SugarCube.State.variables.worn.head'];
      if (request.operation === 'equip') sources.push(`window.SugarCube.State.variables.wardrobe.head[${current.index}]`);
      for (const expression of sources) {
        const r = await client.send('Runtime.evaluate',{expression,returnByValue:false});
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
module.exports = {validate,reader,prepare};
