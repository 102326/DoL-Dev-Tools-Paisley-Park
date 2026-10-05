const properties = Object.freeze([
  'display', 'visibility', 'position', 'width', 'height',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'background-color', 'background-image', 'color',
  'border-width', 'border-style', 'border-color',
  ...['top', 'right', 'bottom', 'left'].flatMap(side =>
    ['width', 'style', 'color'].map(part => `border-${side}-${part}`)),
  'opacity', 'filter', 'backdrop-filter', 'z-index', 'transform',
  'overflow-x', 'overflow-y', 'font-size', 'font-weight', 'line-height',
  'flex-direction', 'gap', 'grid-template-columns', 'pointer-events',
]);

// Executed in the inspected document. Read only bounded structural and computed CSS data.
function snapshot(scopeSelector, allowedProperties = properties) {
  const roots = document.querySelectorAll(scopeSelector);
  if (roots.length !== 1) throw new Error('CSS scope must match exactly one element');
  const nodes = [], maxNodes = 200, maxDepth = 8;
  let truncated = false;
  function visit(node, address, parent, depth) {
    if (nodes.length >= maxNodes || depth > maxDepth) { truncated = true; return; }
    const classes = [...node.classList];
    const id = node.id, tag = node.tagName.toLowerCase();
    if (id.length > 128 || tag.length > 128 || classes.length > 32 || classes.some(name => name.length > 128)) truncated = true;
    const computed = getComputedStyle(node), style = {};
    for (const property of allowedProperties) {
      const value = computed.getPropertyValue(property);
      if (typeof value !== 'string') { truncated = true; continue; }
      if (/\burl\s*\(/i.test(value)) { style[property] = '[url omitted]'; truncated = true; }
      else { style[property] = value.slice(0, 256); if (value.length > 256) truncated = true; }
    }
    const box = node.getBoundingClientRect(), rect = {};
    for (const key of ['x', 'y', 'width', 'height']) {
      rect[key] = Number.isFinite(box[key]) ? box[key] : 0;
      if (!Number.isFinite(box[key])) truncated = true;
    }
    nodes.push({ address, parent, tag: tag.slice(0, 128), id: id.slice(0, 128),
      class: classes.slice(0, 32).map(name => name.slice(0, 128)),
      childCount: node.children.length, style, rect });
    for (let i = 0; i < node.children.length; i++) {
      if (nodes.length >= maxNodes) { truncated = true; break; }
      visit(node.children[i], `${address}/${i}`, address, depth + 1);
    }
  }
  visit(roots[0], '0', null, 0);
  return { schemaVersion: 1, source: 'CSS', nodes, truncated,
    limits: { maxNodes, maxDepth }, textAndValues: 'omitted' };
}

const expression = scope => `(${snapshot.toString()})(${JSON.stringify(scope)}, ${JSON.stringify(properties)})`;

function contract(value) {
  const data = value?.data ?? value;
  if (data?.schemaVersion !== 1 || data.source !== 'CSS' || !Array.isArray(data.nodes) ||
      data.nodes.length > 200 || typeof data.truncated !== 'boolean' ||
      (data.scopeHash !== undefined && !/^[a-f0-9]{64}$/.test(data.scopeHash))) throw new Error('Unsupported CSS contract');
  const addresses = new Set();
  for (const node of data.nodes) {
    if (!node || typeof node.address !== 'string' || !/^0(?:\/\d+){0,8}$/.test(node.address) || addresses.has(node.address) ||
        node.parent !== (node.address === '0' ? null : node.address.slice(0, node.address.lastIndexOf('/'))) ||
        typeof node.tag !== 'string' || node.tag.length > 128 || !/^[a-z][a-z0-9-]*$/.test(node.tag) ||
        typeof node.id !== 'string' || node.id.length > 128 ||
        !Array.isArray(node.class) || node.class.length > 32 || node.class.some(name => typeof name !== 'string' || name.length > 128) ||
        !Number.isSafeInteger(node.childCount) || node.childCount < 0 ||
        !node.style || typeof node.style !== 'object' || Array.isArray(node.style) ||
        Object.entries(node.style).some(([key, val]) => !properties.includes(key) || typeof val !== 'string' || val.length > 256 || /\burl\s*\(/i.test(val)) ||
        !node.rect || typeof node.rect !== 'object' ||
        ['x', 'y', 'width', 'height'].some(key => typeof node.rect[key] !== 'number' || !Number.isFinite(node.rect[key]))) throw new Error('Invalid CSS node');
    addresses.add(node.address);
  }
  return data;
}

function diff(before, after) {
  const a = contract(before), b = contract(after);
  if (a.scopeHash && b.scopeHash && a.scopeHash !== b.scopeHash) throw new Error('CSS scopes differ');
  const old = new Map(a.nodes.map(node => [node.address, node]));
  const current = new Map(b.nodes.map(node => [node.address, node]));
  const changes = [];
  // ponytail: structural addresses do not prove node identity; add stable target keys if insertion matching matters.
  for (const address of new Set([...old.keys(), ...current.keys()])) {
    const left = old.get(address), right = current.get(address);
    if (!left || !right) { changes.push({ address, kind: left ? 'removed' : 'added' }); continue; }
    const fields = ['tag', 'id', 'class', 'parent', 'childCount']
      .filter(key => JSON.stringify(left[key]) !== JSON.stringify(right[key]));
    for (const key of ['x', 'y', 'width', 'height']) if (left.rect[key] !== right.rect[key]) fields.push(`rect.${key}`);
    for (const key of properties) if (left.style[key] !== right.style[key]) fields.push(`style.${key}`);
    if (fields.length) changes.push({ address, kind: 'changed', fields });
  }
  return { schemaVersion: 1, source: 'CSS comparison', identityNotProven: true,
    incomplete: a.truncated || b.truncated, changes };
}

module.exports = { snapshot, expression, contract, diff, properties };
