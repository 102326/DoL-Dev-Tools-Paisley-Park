declare namespace browserCSS {
 interface Node {address:string;parent:string|null;tag:string;id:string;class:string[];childCount:number;style:Partial<Record<string,string>>;rect:Record<'x'|'y'|'width'|'height',number>}
 interface Snapshot {schemaVersion:1;source:'CSS';nodes:Node[];truncated:boolean;limits:{maxNodes:number;maxDepth:number};textAndValues:string}
}
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
function snapshot(scopeSelector:string, allowedProperties:readonly string[] = properties):browserCSS.Snapshot {
  const roots = document.querySelectorAll(scopeSelector);
  if (roots.length !== 1) throw new Error('CSS scope must match exactly one element');
  const nodes:browserCSS.Node[] = [], maxNodes = 200, maxDepth = 8;
  let truncated = false;
  function visit(node:Element, address:string, parent:string|null, depth:number):void {
    if (nodes.length >= maxNodes || depth > maxDepth) { truncated = true; return; }
    const classes = [...node.classList];
    const id = node.id, tag = node.tagName.toLowerCase();
    if (id.length > 128 || tag.length > 128 || classes.length > 32 || classes.some(name => name.length > 128)) truncated = true;
    const computed = getComputedStyle(node), style:Record<string,string> = {};
    for (const property of allowedProperties) {
      const value = computed.getPropertyValue(property);
      if (typeof value !== 'string') { truncated = true; continue; }
      if (/\burl\s*\(/i.test(value)) { style[property] = '[url omitted]'; truncated = true; }
      else { style[property] = value.slice(0, 256); if (value.length > 256) truncated = true; }
    }
    const box = node.getBoundingClientRect(), rect = {} as browserCSS.Node['rect'];
    for (const key of ['x', 'y', 'width', 'height'] as const) {
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

const browserCSS={snapshot,properties};
export = browserCSS;
