// Generated from css.cts by TypeScript 6.0.2; source-lf-sha256=63c18d3155e81789d4647ebae59eae229503f6601bbc8e1bbe59a7b806930ff5
"use strict";
const { snapshot, properties } = require('./browser/css.cjs');
const expression = (scope) => `(${snapshot.toString()})(${JSON.stringify(scope)}, ${JSON.stringify(properties)})`;
function contract(value) {
    const data = (value?.data ?? value);
    if (data?.schemaVersion !== 1 || data.source !== 'CSS' || !Array.isArray(data.nodes) ||
        data.nodes.length > 200 || typeof data.truncated !== 'boolean' ||
        (data.scopeHash !== undefined && !/^[a-f0-9]{64}$/.test(data.scopeHash)))
        throw new Error('Unsupported CSS contract');
    const addresses = new Set();
    for (const raw of data.nodes) {
        const node = raw;
        if (!node || typeof node.address !== 'string' || !/^0(?:\/\d+){0,8}$/.test(node.address) || addresses.has(node.address) ||
            node.parent !== (node.address === '0' ? null : node.address.slice(0, node.address.lastIndexOf('/'))) ||
            typeof node.tag !== 'string' || node.tag.length > 128 || !/^[a-z][a-z0-9-]*$/.test(node.tag) ||
            typeof node.id !== 'string' || node.id.length > 128 ||
            !Array.isArray(node.class) || node.class.length > 32 || node.class.some((name) => typeof name !== 'string' || name.length > 128) ||
            !Number.isSafeInteger(node.childCount) || node.childCount < 0 ||
            !node.style || typeof node.style !== 'object' || Array.isArray(node.style) ||
            Object.entries(node.style).some(([key, val]) => !properties.includes(key) || typeof val !== 'string' || val.length > 256 || /\burl\s*\(/i.test(val)) ||
            !node.rect || typeof node.rect !== 'object' ||
            ['x', 'y', 'width', 'height'].some(key => typeof node.rect[key] !== 'number' || !Number.isFinite(node.rect[key])))
            throw new Error('Invalid CSS node');
        addresses.add(node.address);
    }
    return data;
}
function diff(before, after) {
    const a = contract(before), b = contract(after);
    if (a.scopeHash && b.scopeHash && a.scopeHash !== b.scopeHash)
        throw new Error('CSS scopes differ');
    const old = new Map(a.nodes.map(node => [node.address, node]));
    const current = new Map(b.nodes.map(node => [node.address, node]));
    const changes = [];
    // ponytail: structural addresses do not prove node identity; add stable target keys if insertion matching matters.
    for (const address of new Set([...old.keys(), ...current.keys()])) {
        const left = old.get(address), right = current.get(address);
        if (!left || !right) {
            changes.push({ address, kind: left ? 'removed' : 'added' });
            continue;
        }
        const fields = ['tag', 'id', 'class', 'parent', 'childCount']
            .filter(key => JSON.stringify(left[key]) !== JSON.stringify(right[key]));
        for (const key of ['x', 'y', 'width', 'height'])
            if (left.rect[key] !== right.rect[key])
                fields.push(`rect.${key}`);
        for (const key of properties)
            if (left.style[key] !== right.style[key])
                fields.push(`style.${key}`);
        if (fields.length)
            changes.push({ address, kind: 'changed', fields });
    }
    return { schemaVersion: 1, source: 'CSS comparison', identityNotProven: true,
        incomplete: a.truncated || b.truncated, changes };
}
const api = { snapshot, expression, contract, diff, properties };
module.exports = api;
