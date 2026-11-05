// Generated from game-goal-reader.cts by TypeScript 6.0.2; source-lf-sha256=84ac7bce802f93569e32cf16664db7ab9e85b94d17faa40ff726c012f4add25d
"use strict";
const { goalReader } = require('./browser/goal-reader.cjs');
// Reviewed original-state predicates shared by Runtime and direct probes.
const { validLimit, withinSpend } = require('./game-spend.cjs');
const keys = (v, allowed) => !!v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).every(k => allowed.includes(k));
const bounded = (v) => typeof v === 'string' && v.length > 0 && v.length <= 128 && !/[\u0000-\u001f]/.test(v);
function checkRequest(raw) {
    const request = raw;
    if (!keys(request, ['name', 'description', 'mode', 'goal', 'budget', 'requiredCheckpoints']) || !/^[A-Za-z0-9._-]{1,64}$/.test((request.name || '')) || !['gameplay', 'development'].includes(request.mode) ||
        request.description !== undefined && (typeof request.description !== 'string' || !request.description.trim() || request.description.length > 512 || /[\u0000-\u001f]/.test(request.description)))
        throw Error('Invalid Goal request');
    if (request.requiredCheckpoints !== undefined && (request.mode !== 'development' || !Array.isArray(request.requiredCheckpoints) || request.requiredCheckpoints.length > 8 || !request.requiredCheckpoints.every(bounded) || new Set(request.requiredCheckpoints).size !== request.requiredCheckpoints.length))
        throw Error('Invalid required checkpoints');
    const g = request.goal;
    if (g?.kind === 'reach-passage') {
        if (!keys(g, ['kind', 'passage']) || !bounded(g.passage))
            throw Error('Invalid passage Goal');
    }
    else if (['equip-matching', 'purchase-and-equip'].includes(g?.kind)) {
        if (!keys(g, ['kind', 'slot', 'colour', 'passage']) || g.slot !== 'head' || !bounded(g.colour) || ['random', 'custom'].includes(g.colour) || g.passage !== undefined && !bounded(g.passage))
            throw Error('Invalid conditional equipment Goal');
    }
    else if (['equip', 'purchase-one'].includes(g?.kind)) {
        if (!keys(g, ['kind', 'slot', 'variable', 'colour', 'modder', 'accessoryColour', ...(g.kind === 'purchase-one' ? ['baselineMoney', 'baselineCount', 'unitCost', 'maxSpend'] : [])]) || !/^[a-z][a-z_]{0,31}$/.test((g.slot || '')) || ['constructor', 'prototype', '__proto__'].includes(g.slot) ||
            !bounded(g.variable) || !(bounded(g.colour) || g.colour === null || g.colour === 0) || !(g.modder === undefined || g.modder === null || bounded(g.modder)) ||
            !(g.accessoryColour === undefined || g.accessoryColour === null || g.accessoryColour === 0 || bounded(g.accessoryColour)))
            throw Error('Invalid equipment Goal');
        if (g.kind === 'purchase-one' && (g.slot !== 'head' || !bounded(g.colour) || !bounded(g.accessoryColour) || ['random', 'custom'].includes(g.colour) || ['random', 'custom'].includes(g.accessoryColour) ||
            !Number.isSafeInteger(g.baselineMoney) || g.baselineMoney < 0 || !Number.isSafeInteger(g.baselineCount) || g.baselineCount < 0 || g.baselineCount > 511 ||
            !Number.isSafeInteger(g.unitCost) || g.unitCost < 0 || g.unitCost > g.baselineMoney || g.maxSpend !== undefined && (!validLimit(g.maxSpend) || !withinSpend(g.unitCost, g.maxSpend))))
            throw Error('Invalid one-item purchase Goal');
    }
    else
        throw Error('Unsupported Goal kind');
    const b = request.budget;
    if (!keys(b, ['timeoutMs', 'maxActions', 'maxObservations', 'maxReplans', 'maxSpend']) || !Number.isInteger(b.timeoutMs) || b.timeoutMs < 1000 || b.timeoutMs > 3600000 ||
        !Number.isInteger(b.maxActions) || b.maxActions < 1 || b.maxActions > 64 || !Number.isInteger(b.maxObservations) || b.maxObservations < 1 || b.maxObservations > 192)
        throw Error('Invalid Goal budget');
    if (b.maxReplans !== undefined && (!Number.isSafeInteger(b.maxReplans) || b.maxReplans < 1 || b.maxReplans > 192) || b.maxSpend !== undefined && !validLimit(b.maxSpend))
        throw Error('Invalid additional Goal budget');
}
function validate(raw) {
    checkRequest(raw);
    const result = JSON.parse(JSON.stringify(raw));
    // Check the data actually returned: inherited fields or toJSON must not erase
    // requirements that were present only during the first validation.
    checkRequest(result);
    const g = result.goal;
    if (g.kind === 'purchase-one' && g.maxSpend === undefined)
        result.goal.maxSpend = null;
    return result;
}
const nonnegative = (v) => Number.isSafeInteger(v) && v >= 0;
const variantKeys = ['slot', 'variable', 'colour', 'accessoryColour', 'modder'];
const sameVariant = (a, b) => variantKeys.every(k => a?.[k] === b?.[k]);
function validateQuote(raw, g) {
    const q = raw;
    return keys(q, ['variant', 'baselineMoney', 'baselineCount', 'baselineWornCount', 'unitCost']) && keys(q.variant, variantKeys) && q.variant.slot === 'head' &&
        ['hairpin', 'beanie'].includes(q.variant.variable) && bounded(q.variant.colour) && q.variant.colour === g.colour && bounded(q.variant.accessoryColour) && !['random', 'custom'].includes(q.variant.accessoryColour) &&
        (q.variant.modder === null || bounded(q.variant.modder)) && nonnegative(q.baselineMoney) && q.baselineCount === 0 && q.baselineWornCount === 0 && nonnegative(q.unitCost) && q.unitCost <= q.baselineMoney;
}
function quoteFromShop(raw, g) {
    const shop = raw;
    if (g.kind !== 'purchase-and-equip' || shop?.status !== 'available' || shop.pattern != null || shop.destination !== 'wardrobe' || !Number.isFinite(shop.space) || shop.space < 1 || !Number.isSafeInteger(shop.quantity) || shop.quantity < 1 || shop.quantity > 512)
        return null;
    const q = { variant: { slot: 'head', variable: shop.variable, colour: shop.colour, accessoryColour: shop.accessoryColour, modder: shop.modder ?? null }, baselineMoney: shop.money, baselineCount: shop.count, baselineWornCount: shop.wornCount, unitCost: shop.cost };
    return validateQuote(q, g) ? q : null;
}
function validatePurchaseReceipt(r, e) {
    const verified = require('./game-native-save.cjs').receipt(r, e);
    if (!verified)
        return false;
    const receipt = verified.r, effect = verified.e;
    const q = effect.action?.quote;
    if (!q || effect.action.kind !== 'buy')
        return receipt.evidence === undefined;
    if (receipt.outcome !== 'occurred' || !receipt.remoteClosed)
        return receipt.evidence === undefined;
    const p = receipt.evidence;
    return validateQuote(q, { colour: q.variant?.colour }) && keys(p, ['kind', 'variant', 'beforeMoney', 'afterMoney', 'beforeCount', 'afterCount', 'beforeWornCount', 'afterWornCount', 'turns', 'contextNonce']) && p.kind === 'purchase' && keys(p.variant, variantKeys) && sameVariant(p.variant, q.variant) &&
        effect.executionBinding?.provider === 'dol-shop-native' && /^shop-buy-one-[a-f0-9]{12}$/.test(effect.executionBinding.contract) && p.contextNonce === effect.executionBinding.contextNonce &&
        p.beforeMoney === q.baselineMoney && nonnegative(p.afterMoney) && p.beforeMoney - p.afterMoney === receipt.spent && (receipt.spent > 0 || q.unitCost === 0 && receipt.spent === 0) && receipt.spent <= q.unitCost &&
        p.beforeCount === 0 && p.beforeWornCount === 0 && p.afterCount === 1 && p.afterWornCount === 0 && nonnegative(p.turns);
}
const purchases = (context) => context.effects.filter((e) => !!(e.status === 'settled' && e.action.kind === 'buy' && e.action.quote && e.result?.outcome === 'occurred'));
function canPrepare(action, g, context) {
    if (g.kind !== 'purchase-and-equip')
        return true;
    const bought = purchases(context);
    if (bought.length && action.kind === 'load-save')
        return false;
    if (action.kind === 'buy' || action.quote)
        return !bought.length && !!action.quote && validateQuote(action.quote, g) && (action.kind !== 'buy' || action.cost === action.quote.unitCost);
    if (['sw-wardrobe', 'dol-wardrobe'].includes(action.selected?.type) && action.selected.operation === 'equip')
        return bought.length === 1 && validatePurchaseReceipt(bought[0].result, bought[0]) && sameVariant({ slot: action.selected.slot, variable: action.selected.variable, colour: action.selected.colour, accessoryColour: action.selected.accessoryColour ?? null, modder: action.selected.modder ?? null }, bought[0].action.quote.variant);
    return true;
}
function purchaseSatisfied(scene, g, context) {
    if (g.kind !== 'purchase-and-equip')
        return scene.goalProof.satisfied === true;
    const bought = purchases(context), p = scene.goalProof;
    if (bought.length !== 1 || !validatePurchaseReceipt(bought[0].result, bought[0]) || !p.conditionsSatisfied || !p.wornMatches || p.ownedTruncated !== false || !Array.isArray(p.owned))
        return false;
    const e = bought[0], variant = e.action.quote.variant;
    const inventory = p.owned.find(i => JSON.stringify(i.variant) === JSON.stringify([variant.variable, variant.colour, variant.modder, variant.accessoryColour]));
    return validateQuote(e.action.quote, g) && p.receiptContext === e.executionBinding.contextNonce && nonnegative(p.turns) && p.turns >= e.result.evidence.turns &&
        sameVariant({ slot: 'head', ...p.worn }, variant) && (inventory?.count ?? 0) === 0 && withinSpend(context.spent, context.budget.maxSpend) && context.reserved === 0;
}
// Facts come from the game; this journal never owns inventory or a shadow worn state.
const predicates = { validate, goalReader, validateQuote, quoteFromShop, validatePurchaseReceipt, canPrepare, purchaseSatisfied };
module.exports = predicates;
