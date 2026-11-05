// Generated from integration-native-head-state.cts by TypeScript 6.0.2; source-lf-sha256=1f0ff4492f806e8fdc1f185f044c99f17d3aedf853abe0495a6f840d66508fbf
"use strict";
function stateReader(request, interpret, slots) {
    const w = window;
    const mapped = interpret(request), state = w.SugarCube?.State, v = state?.variables, t = state?.temporary;
    const unavailable = (reason) => ({ status: 'unsupported', reason });
    if (!['equip', 'unequip'].includes(request.operation) || mapped.status !== 'available' || mapped.uiVersion !== '2.2.2')
        return unavailable('native-head-profile-context');
    // The selected target already has both optional pet displays disabled. We do
    // not change their settings or claim the unreviewed RAF/render branch is closed.
    if (v?.options?.maplebirch?.npcsidebar?.pet?.enabled !== false || v?.options?.maplebirch?.character?.pet?.enabled !== false)
        return unavailable('native-display-tail-profile-unavailable');
    const selectedWardrobe = v?.settings?.multipleWardrobes ? v?.wardrobes?.wardrobe : v?.wardrobe;
    if (w.V !== v || !t || v.wardrobe_location !== 'wardrobe' || !v.wardrobes?.wardrobe || selectedWardrobe !== v.wardrobe ||
        selectedWardrobe.locationRequirement?.length && !selectedWardrobe.locationRequirement.includes(v.location) ||
        slots.some(slot => v['wear_' + slot] !== 'none') || v.wear_outfit !== 'none' || v.delete_outfit !== 'none' ||
        ![undefined, false, 0].includes(v.randomWear) || v.runWardrobeSanityChecker !== false || t.wearAction !== undefined || ![undefined, 0, false].includes(t.strip_restrict) ||
        v.clothingShop?.stolenClothes !== 0 || v.adultShop !== undefined && v.adultShop?.stolenClothes !== 0)
        return unavailable('other-native-wardrobe-operation-active');
    if (Object.keys(v.wornStacking || {}).length || w.DolOptimization?.wornStackingStattedSlots?.size !== 0)
        return unavailable('stacking-profile-not-empty');
    const worn = v.worn.head, item = request.operation === 'equip' ? v.wardrobe.head[mapped.index] : worn;
    const simple = (i) => i && !i.cursed && i.outfitPrimary === undefined && i.outfitSecondary === undefined && !i.colourCustom && !i.accessory_colourCustom && !i.pattern && Array.isArray(i.type) && !i.type.some(type => ['strap-on', 'constricting'].includes(type));
    if (!simple(item) || !simple(worn) || !['hairpin', 'beanie'].includes(item.variable) || !w.setup.wardrobeSkip.includes('naked') || worn.variable !== 'naked' && w.setup.wardrobeSkip.includes(worn.name))
        return unavailable('native-simple-head-branch-unavailable');
    const definition = w.setup?.clothes?.head?.filter(i => i.variable === item.variable && i.modder === item.modder);
    if (definition?.length !== 1 || v.wardrobe.head.deleteAt !== Array.prototype.deleteAt || !Number.isSafeInteger(v.money) || !Number.isFinite(v.timeStamp))
        return unavailable('original-head-definition-unavailable');
    const lists = document.querySelectorAll('#wardrobeList'), root = document.querySelector('#passages > .passage');
    const list = lists[0], preserved = list?.closest('.dgw-preserved'), native = list?.closest('.dgw-native');
    if (lists.length !== 1 || !root?.contains(list) || !preserved || !native || native.hidden !== true || getComputedStyle(native).display !== 'none' || document.querySelector('#oldWardrobeListDisplay') || root.querySelector('.error'))
        return unavailable('hidden-native-list-branch-unavailable');
    const naked = request.operation === 'unequip' ? w.setup.clothes.head[0] : undefined;
    if (request.operation === 'unequip' && naked?.variable !== 'naked')
        return unavailable('original-naked-head-definition-unavailable');
    const before = { turns: state.turns, time: v.timeStamp, money: v.money, worn, item, inventory: v.wardrobe.head, ...(naked ? { naked } : {}) };
    const raw = JSON.stringify(before);
    // This snapshot becomes part of the fixed operation source (Action's 32 KiB
    // ceiling). Reject before preparation rather than failing after the claim.
    if (new TextEncoder().encode(raw).length > 16384)
        return unavailable('bounded-head-operation-state-unavailable');
    return { ...mapped, before: JSON.parse(raw), nativeListSelector: '#wardrobeList' };
}
module.exports = { stateReader };
