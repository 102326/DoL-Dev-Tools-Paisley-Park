declare namespace browserDOM {
 interface Node {address:string;parent:string|null;tag:string;id:string;class:string[];data:string[];hidden:boolean;childCount:number}
 interface Snapshot {schemaVersion:1;source:'DOM';nodes:Node[];truncated:boolean;truncationReasons:string[];limits:{maxNodes:number;maxDepth:number};dataValues:string;textAndValues:string;viewport:{width:number;height:number}}
}
// Executed in the inspected document. No text, values, HTML or game state reads.
function snapshot(scopeSelector:string):browserDOM.Snapshot {
  const roots = document.querySelectorAll(scopeSelector);
  if (roots.length !== 1) throw new Error('DOM scope must match exactly one element');
  const nodes:browserDOM.Node[] = [], maxNodes = 500, maxDepth = 8;
  let truncated = false;
  const truncationReasons = new Set<string>();
  const truncate = (reason:string) => { truncated = true; truncationReasons.add(reason); };
  function visit(node:Element, address:string, parent:string|null, depth:number):void {
    if (nodes.length >= maxNodes) { truncate('max-nodes'); return; }
    if (depth > maxDepth) { truncate('max-depth'); return; }
    const classes = [...node.classList];
    const attributes = [...node.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name);
    nodes.push({ address, parent, tag: node.tagName.toLowerCase(), id: node.id.slice(0, 128),
      class: classes.slice(0, 32).map(c => c.slice(0, 128)), data: attributes.slice(0, 32),
      hidden: node.hasAttribute('hidden'), childCount: node.children.length });
    if (classes.length > 32) truncate('class-count');
    if (attributes.length > 32) truncate('data-count');
    if (node.id.length > 128) truncate('id-length');
    for (let i = 0; i < node.children.length; i++) {
      if (nodes.length >= maxNodes) { truncate('max-nodes'); break; }
      visit(node.children[i], `${address}/${i}`, address, depth + 1);
    }
  }
  visit(roots[0], '0', null, 0);
  return { schemaVersion: 1, source: 'DOM', nodes, truncated, truncationReasons: [...truncationReasons], limits: { maxNodes, maxDepth },
    dataValues: 'omitted', textAndValues: 'omitted', viewport: { width: innerWidth, height: innerHeight } };
}
const browserDOM={snapshot};
export = browserDOM;
