interface Node {address:string;[key:string]:unknown}
interface Contract {schemaVersion:1;nodes:Node[];scopeHash?:unknown;truncated?:unknown;[key:string]:unknown}
const {snapshot}:typeof import('./browser/dom.cjs')=require('./browser/dom.cjs');
const expression = (scope:string|undefined) => `(${snapshot.toString()})(${JSON.stringify(scope)})`;
function contract(value:unknown):Contract {
  const data = ((value as {data?:unknown}|null|undefined)?.data ?? value) as {schemaVersion?:unknown;nodes?:unknown}|null|undefined;
  if (data?.schemaVersion !== 1 || !Array.isArray(data.nodes) || data.nodes.length > 500) throw new Error('Unsupported DOM contract');
  const addresses = new Set<string>();
  for (const raw of data.nodes as unknown[]) {
    const node=raw as {address?:unknown}|null|undefined;
    if (!node || typeof node.address !== 'string' || !/^0(?:\/\d+){0,8}$/.test(node.address) || addresses.has(node.address)) throw new Error('Invalid DOM address');
    addresses.add(node.address);
  }
  return data as Contract;
}
function diff(before:unknown, after:unknown) {
  const a = contract(before), b = contract(after);
  if (a.scopeHash && b.scopeHash && a.scopeHash !== b.scopeHash) throw new Error('DOM scopes differ');
  const old = new Map(a.nodes.map(n => [n.address, n])), current = new Map(b.nodes.map(n => [n.address, n]));
  const changes:{address:string;kind:string;fields?:string[]}[] = [];
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
const api={snapshot,expression,diff,contract};
export = api;
