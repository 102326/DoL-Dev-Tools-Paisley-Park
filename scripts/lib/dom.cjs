// Executed in the inspected document. No text, values, HTML or game state reads.
function snapshot(scopeSelector) {
  const roots = document.querySelectorAll(scopeSelector);
  if (roots.length !== 1) throw new Error('DOM scope must match exactly one element');
  const nodes = [], maxNodes = 500, maxDepth = 8;
  let truncated = false;
  function visit(node, address, parent, depth) {
    if (nodes.length >= maxNodes || depth > maxDepth) { truncated = true; return; }
    const classes = [...node.classList];
    const attributes = [...node.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name);
    nodes.push({ address, parent, tag: node.tagName.toLowerCase(), id: node.id.slice(0, 128),
      class: classes.slice(0, 32).map(c => c.slice(0, 128)), data: attributes.slice(0, 32),
      hidden: node.hasAttribute('hidden'), childCount: node.children.length });
    if (classes.length > 32 || attributes.length > 32 || node.id.length > 128) truncated = true;
    for (let i = 0; i < node.children.length; i++) {
      if (nodes.length >= maxNodes) { truncated = true; break; }
      visit(node.children[i], `${address}/${i}`, address, depth + 1);
    }
  }
  visit(roots[0], '0', null, 0);
  return { schemaVersion: 1, source: 'DOM', nodes, truncated, limits: { maxNodes, maxDepth },
    dataValues: 'omitted', textAndValues: 'omitted', viewport: { width: innerWidth, height: innerHeight } };
}
const expression = scope => `(${snapshot.toString()})(${JSON.stringify(scope)})`;
function contract(value) {
  const data = value?.data ?? value;
  if (data?.schemaVersion !== 1 || !Array.isArray(data.nodes) || data.nodes.length > 500) throw new Error('Unsupported DOM contract');
  const addresses = new Set();
  for (const node of data.nodes) {
    if (!node || typeof node.address !== 'string' || !/^0(?:\/\d+){0,8}$/.test(node.address) || addresses.has(node.address)) throw new Error('Invalid DOM address');
    addresses.add(node.address);
  }
  return data;
}
function diff(before, after) {
  const a = contract(before), b = contract(after);
  if (a.scopeHash && b.scopeHash && a.scopeHash !== b.scopeHash) throw new Error('DOM scopes differ');
  const old = new Map(a.nodes.map(n => [n.address, n])), current = new Map(b.nodes.map(n => [n.address, n]));
  const changes = [];
  // ponytail: structural addresses, not node identity; add target-specific keys when insertions need reliable correspondence.
  for (const address of new Set([...old.keys(), ...current.keys()])) {
    const left = old.get(address), right = current.get(address);
    if (!left || !right) { changes.push({ address, kind: left ? 'removed' : 'added' }); continue; }
    const fields = ['tag', 'id', 'class', 'data', 'hidden', 'parent', 'childCount'].filter(key => JSON.stringify(left[key]) !== JSON.stringify(right[key]));
    if (fields.length) changes.push({ address, kind: 'changed', fields });
  }
  return { schemaVersion: 1, source: 'DOM comparison', identityNotProven: true,
    incomplete: !!(a.truncated || b.truncated), changes };
}
module.exports = { snapshot, expression, diff, contract };
