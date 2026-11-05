// Generated from dom.cts by TypeScript 6.0.2; source-lf-sha256=1b609e5ad02cbfcbec4880ea562300cfe64feb9341d693d1dc11c84d50ad3a0e
"use strict";
const { snapshot } = require('./browser/dom.cjs');
const expression = (scope) => `(${snapshot.toString()})(${JSON.stringify(scope)})`;
function contract(value) {
    const data = (value?.data ?? value);
    if (data?.schemaVersion !== 1 || !Array.isArray(data.nodes) || data.nodes.length > 500)
        throw new Error('Unsupported DOM contract');
    const addresses = new Set();
    for (const raw of data.nodes) {
        const node = raw;
        if (!node || typeof node.address !== 'string' || !/^0(?:\/\d+){0,8}$/.test(node.address) || addresses.has(node.address))
            throw new Error('Invalid DOM address');
        addresses.add(node.address);
    }
    return data;
}
function diff(before, after) {
    const a = contract(before), b = contract(after);
    if (a.scopeHash && b.scopeHash && a.scopeHash !== b.scopeHash)
        throw new Error('DOM scopes differ');
    const old = new Map(a.nodes.map(n => [n.address, n])), current = new Map(b.nodes.map(n => [n.address, n]));
    const changes = [];
    // ponytail: structural addresses, not node identity; add target-specific keys when insertions need reliable correspondence.
    for (const address of new Set([...old.keys(), ...current.keys()])) {
        const left = old.get(address), right = current.get(address);
        if (!left || !right) {
            changes.push({ address, kind: left ? 'removed' : 'added' });
            continue;
        }
        const fields = ['tag', 'id', 'class', 'data', 'hidden', 'parent', 'childCount'].filter(key => JSON.stringify(left[key]) !== JSON.stringify(right[key]));
        if (fields.length)
            changes.push({ address, kind: 'changed', fields });
    }
    return { schemaVersion: 1, source: 'DOM comparison', identityNotProven: true,
        incomplete: !!(a.truncated || b.truncated), changes };
}
const api = { snapshot, expression, diff, contract };
module.exports = api;
