// Generated from integration-native-head-recovery.cts by TypeScript 6.0.2; source-lf-sha256=ed7ef31e7657fa55828e91b3848927848a61c190a64a76c95400fc466b41aac9
"use strict";
function closedRecoveryReader(expected, before, observedInputs, indices) {
    const node = this, nodes = document.querySelectorAll('#passages > .passage .dgw-strip');
    if (nodes.length !== 1 || nodes[0] !== node || !node.isConnected)
        return { ok: false };
    const w = window;
    const ctx = w[indices.namespace], r = ctx?.records?.[expected.attemptId];
    if (!ctx || ctx.nonce !== expected.binding.contextNonce || !r || r.status !== 'started' || r.attemptId !== expected.attemptId ||
        ['provider', 'contract', 'contextNonce', 'requestDigest'].some(k => r[k] !== expected.binding[k]))
        return { ok: false };
    const state = w.SugarCube?.State, v = state?.variables, worn = v?.worn?.head, inventory = v?.wardrobe?.head;
    const wardrobe = observedInputs[indices.context], bridge = observedInputs[indices.bridge], action = observedInputs[indices.action];
    const list = document.querySelector('#wardrobeList'), root = wardrobe.passage, native = list?.closest('.dgw-native');
    const expectedInventory = before.inventory.filter((_, i) => i !== indices.index);
    if (before.worn.variable !== 'naked')
        expectedInventory.push({ ...before.worn, lastTaken: 'wardrobe' });
    const expectedWorn = { ...before.item, lastTaken: 'wardrobe' }, entries = wardrobe.entries, modelWorn = wardrobe.state?.wornItem;
    const descriptor = Object.getOwnPropertyDescriptor(bridge, 'action');
    if (state?.passage !== 'Wardrobe' || state.turns !== before.turns || v?.timeStamp !== before.time || v.money !== before.money ||
        JSON.stringify(worn) !== JSON.stringify(expectedWorn) || JSON.stringify(inventory) !== JSON.stringify(expectedInventory) ||
        !root?.isConnected || root !== document.querySelector('#passages > .passage') || root.querySelector('.error') ||
        document.querySelectorAll('#wardrobeList').length !== 1 || !list?.isConnected || !wardrobe.original?.contains(list) ||
        !native || native.hidden !== true || getComputedStyle(native).display !== 'none' ||
        !descriptor || descriptor.value !== action || descriptor.writable !== true || descriptor.configurable !== true ||
        wardrobe.refreshQueued !== false || wardrobe.state?.busy !== false || wardrobe.state?.slot !== 'head' ||
        wardrobe.snapshot?.inventory?.head !== inventory || wardrobe.snapshot?.worn?.head !== worn ||
        !Array.isArray(entries) || !Array.isArray(inventory) || entries.length !== inventory.length ||
        entries.some((item, i) => item.key !== 'head:' + i || item.slot !== 'head' || item.index !== i || item.raw !== inventory[i]) ||
        modelWorn?.key !== 'worn:head' || modelWorn.name !== wardrobe.state.wornName ||
        indices.errorMessages.includes(wardrobe.state.message))
        return { ok: false };
    return { ok: true, proof: { receiptStatus: r.status, passage: state.passage, wornVariable: worn.variable, inventoryLength: inventory.length,
            money: v.money, timeStamp: v.timeStamp, turns: state.turns, modelRefreshed: true, bridgeRestored: true, uiEnabled: true } };
}
module.exports = { closedRecoveryReader };
