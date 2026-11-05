// Generated from journey-wait.cts by TypeScript 6.0.2; source-lf-sha256=d0718159cafd48f0dbe9ed8d4301ef8bffc749cf723b50777e02b8a0509480aa
"use strict";
function waitProbe(scope, condition) {
    const nodes = document.querySelectorAll(scope);
    if (condition === 'absent')
        return { satisfied: nodes.length === 0, matches: nodes.length };
    if (nodes.length !== 1)
        return { satisfied: false, matches: nodes.length };
    const n = nodes[0], rect = n.getBoundingClientRect(), style = getComputedStyle(n);
    const visible = n.isConnected && !n.hidden && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
    return { satisfied: condition === 'exists' || (condition === 'visible' ? visible : !visible), matches: 1 };
}
const api = { waitProbe };
module.exports = api;
