// Exact source is part of the persisted native head receipt contract.
async function operation(request, uiAction, wardrobe, entry, uiHost, getEnabled, measured, measure, outfit, sync, bridge, originalAction, originalMessage, markDispatch=()=>{}) {
  const { namespace, binding, attemptId, index, before, operation = 'equip', errorMessages, operationSha256 } = request;
  const context = window[namespace];
  const descriptor = Object.getOwnPropertyDescriptor(bridge, 'action');
  if (context?.nonce !== binding.contextNonce || !context.records || Object.hasOwn(context.records, attemptId) || Object.keys(context.records).length >= 64 ||
      window.DoLWardrobeUI !== uiHost || uiHost?.getEnabled !== getEnabled || getEnabled() !== true ||
      measured?.measure !== measure || outfit?.sync !== sync || bridge?.message !== originalMessage ||
      !descriptor || descriptor.writable !== true || descriptor.configurable !== true || descriptor.value !== originalAction) return { ok: false, guardRejected:true };
  // This point follows every synchronous guard. Existing started/terminal records
  // reject in the guard; neither is an authorization to run the recipe again.
  markDispatch();
  const started = { ...binding, attemptId, status: 'started', before, operationSha256 };
  context.records[attemptId] = Object.freeze(started);
  const list = document.querySelector('#wardrobeList'), parent = list?.parentNode;
  const root = wardrobe.passage;
  let calls = 0, invalid = false, detachedError = false, originalThrew = false, installed = false, restored = false;
  const wrapper = function(...args) {
    calls++;
    if (calls !== 1 || this !== bridge || args.length !== 3 || args[0] !== 'wear' || args[1] !== 'head' ||
        args[2] !== (operation === 'equip' ? index : 'strip')) {
      invalid = true;
      throw Error('Native UI bridge call mismatch');
    }
    try {
      const output = Reflect.apply(originalAction, this, args);
      if (!output || typeof output.querySelector !== 'function') { invalid = true; throw Error('Native UI bridge output unavailable'); }
      detachedError = !!output.querySelector('.error');
      return output;
    } catch (error) { originalThrew = true; throw error; }
  };
  try {
    Object.defineProperty(bridge, 'action', { ...descriptor, value: wrapper });
    installed = true;
    if (operation === 'equip') uiAction(wardrobe, entry);
    else uiAction(wardrobe);
  } catch { invalid = true; }
  finally {
    if (installed) {
      const now = Object.getOwnPropertyDescriptor(bridge, 'action');
      if (now?.value === wrapper && now.writable === descriptor.writable && now.configurable === descriptor.configurable && now.enumerable === descriptor.enumerable) {
        try { Object.defineProperty(bridge, 'action', descriptor); restored = true; } catch { invalid = true; }
      } else invalid = true;
    }
  }
  if (!restored || invalid || originalThrew || detachedError || calls !== 1 || wardrobe.refreshQueued !== true) return { ok: false };
  context.records[attemptId] = Object.freeze({ ...started, phase: 'business-returned' });
  // The original UI queues Y after business work. Only Y may run its own j/C
  // refresh; the bridge observer is already removed before any await.
  try { await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))); }
  catch { return { ok: false }; }
  const state = window.SugarCube?.State, v = state?.variables;
  const identity = i => JSON.stringify([i?.variable,i?.colour??null,i?.modder??null,i?.accessory_colour??null]);
  const expectedInventory = before.inventory.filter((_,i) => operation==='unequip'||i !== index);
  // Original wearoutfit updates lastTaken before generalUndress stores the old item.
  if (before.worn.variable !== 'naked') expectedInventory.push({ ...before.worn, lastTaken: 'wardrobe' });
  const roots = document.querySelectorAll('#passages > .passage'), inventory = v?.wardrobe?.head;
  const entries = wardrobe.entries, worn = v?.worn?.head, modelWorn = wardrobe.state?.wornItem;
  const finalDescriptor = Object.getOwnPropertyDescriptor(bridge, 'action');
  const refreshed = wardrobe.refreshQueued === false && wardrobe.snapshot?.inventory?.head === inventory && wardrobe.snapshot?.worn?.head === worn &&
    Array.isArray(entries) && Array.isArray(inventory) && entries.length === inventory.length &&
    entries.every((item,i) => item.key === 'head:' + i && item.slot === 'head' && item.index === i && item.raw === inventory[i]) &&
    (worn?.variable === 'naked' ? modelWorn === null : modelWorn?.key === 'worn:head' && modelWorn.name === wardrobe.state.wornName);
  if (refreshed) context.records[attemptId] = Object.freeze({ ...started, phase: 'refresh-observed' });
  if (window.DoLWardrobeUI !== uiHost || uiHost?.getEnabled !== getEnabled || getEnabled() !== true ||
      measured?.measure !== measure || outfit?.sync !== sync || bridge?.message !== originalMessage ||
      !finalDescriptor || finalDescriptor.value !== originalAction || finalDescriptor.writable !== descriptor.writable ||
      finalDescriptor.configurable !== descriptor.configurable || finalDescriptor.enumerable !== descriptor.enumerable ||
      roots.length !== 1 || roots[0] !== root || root.getAttribute('data-passage') !== 'Wardrobe' || !root.isConnected ||
      wardrobe.passage !== root || !wardrobe.original?.isConnected || !wardrobe.original.contains(list) ||
      document.querySelectorAll('#wardrobeList').length !== 1 || document.querySelector('#wardrobeList') !== list || list.parentNode !== parent ||
      root.querySelector('.error') || errorMessages.includes(wardrobe.state?.message) || !refreshed || wardrobe.state?.busy || wardrobe.state?.slot !== 'head' ||
      state?.passage !== 'Wardrobe' || state.turns !== before.turns || v?.money !== before.money || v?.timeStamp !== before.time ||
      identity(worn) !== identity(operation==='unequip'?before.naked:before.item) || JSON.stringify(inventory) !== JSON.stringify(expectedInventory)) return { ok: false };
  const receipt = Object.freeze({ ...binding, attemptId, status: 'terminal', outcome: 'occurred', remoteClosed: true, spent: 0 });
  context.records[attemptId] = receipt;
  return { ok: true, receipt };
}
module.exports={operation};
