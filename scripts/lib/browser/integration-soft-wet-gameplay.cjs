// Generated from integration-soft-wet-gameplay.cts by TypeScript 6.0.2; source-lf-sha256=aebeda0237392e9f227f30fc60cc23122e78f455e594bd232dbe29487f3c6fad
"use strict";
function reader(request) {
    const w = window;
    const state = w.SugarCube?.State, v = state?.variables, roots = document.querySelectorAll('#passages > .passage');
    const uiVersion = w.DoLGameUI?.version;
    const unavailable = (reason) => ({ status: 'unsupported', reason, source: 'optional Soft & Wet control interpretation; original game item fields' });
    if (!['2.2.1', '2.2.2'].includes(uiVersion) || state?.passage !== 'Wardrobe' || roots.length !== 1 || roots[0].getAttribute('data-passage') !== 'Wardrobe' ||
        v?.wardrobe_location !== 'wardrobe' || roots[0].querySelectorAll('.dgw-shell').length !== 1 || roots[0].querySelector('.dgw-shell.dgw-managing'))
        return unavailable('verified-wardrobe-context-unavailable');
    const simple = (item) => !!item && !item.cursed && item.outfitPrimary === undefined && item.outfitSecondary === undefined && !item.colourCustom && !item.accessory_colourCustom;
    const worn = v.worn?.head;
    if (!simple(worn))
        return unavailable('linked-custom-or-cursed-worn-item');
    let selector, index = null;
    if (request.operation === 'select-slot') {
        const buttons = [...roots[0].querySelectorAll('.dgw-slots > button')];
        const matches = buttons.map((n, i) => ({ n, i })).filter(({ n }) => n.textContent.trim().replace(/\s*!\s*$/, '') === '头饰');
        if (matches.length !== 1)
            return unavailable('slot-control-ambiguous');
        selector = '#passages > .passage .dgw-slots > button:nth-of-type(' + (matches[0].i + 1) + ')';
    }
    else {
        if (v.lastWardrobeSlot !== 'head')
            return unavailable('wrong-original-slot');
        if (request.operation === 'equip') {
            const list = v.wardrobe?.head;
            if (!Array.isArray(list) || list.length > 512)
                return unavailable('bounded-original-slot-unavailable');
            const matches = list.map((item, i) => ({ item, i })).filter(({ item }) => item?.variable === request.variable && (item.colour ?? null) === request.colour && (item.modder ?? null) === (request.modder ?? null) &&
                (request.accessoryColour === undefined || (item.accessory_colour ?? null) === request.accessoryColour));
            if (matches.length !== 1)
                return unavailable('item-identity-ambiguous-or-missing');
            if (!simple(matches[0].item))
                return unavailable('linked-custom-or-cursed-item');
            index = matches[0].i;
            selector = '#passages > .passage .dgw-item[data-key="head:' + index + '"]';
        }
        else
            selector = '#passages > .passage .dgw-strip';
    }
    if (document.querySelectorAll(selector).length !== 1)
        return unavailable('mapped-control-unavailable');
    return { status: 'available', source: 'optional Soft & Wet control interpretation; original game item fields', uiVersion, selector, index, operation: request.operation, slot: 'head' };
}
module.exports = { reader };
