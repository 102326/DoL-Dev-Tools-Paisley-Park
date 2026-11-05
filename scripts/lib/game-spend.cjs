// Generated from game-spend.cts by TypeScript 6.0.2; source-lf-sha256=d79de182282063904f7fce37f8f155119f1ad6711b8f4131b53989228edf9b16
"use strict";
// null is an explicit unlimited contract; never let JS coerce it to zero.
const validLimit = (v) => v === null || Number.isSafeInteger(v) && v >= 0 && v <= 100000000;
const withinSpend = (amount, limit) => Number.isSafeInteger(amount) && amount >= 0 && (limit === null || validLimit(limit) && amount <= limit);
function combinedLimit(parent, child) {
    const a = parent === undefined ? null : parent, b = child === undefined ? null : child;
    if (!validLimit(a) || !validLimit(b))
        throw Error('Invalid spend limit');
    return a === null ? b : b === null ? a : Math.min(a, b);
}
const spend = { validLimit, withinSpend, combinedLimit };
module.exports = spend;
