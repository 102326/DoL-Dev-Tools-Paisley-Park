import type browserCSS from './browser/css.cjs';
interface Contract {schemaVersion:1;source:'CSS';nodes:browserCSS.Node[];truncated:boolean;scopeHash?:unknown}
interface NodeView {address?:unknown;parent?:unknown;tag?:unknown;id?:unknown;class?:unknown;childCount?:unknown;style?:unknown;rect?:unknown}
const {snapshot,properties}:typeof import('./browser/css.cjs')=require('./browser/css.cjs');
const expression = (scope:string|undefined) => `(${snapshot.toString()})(${JSON.stringify(scope)}, ${JSON.stringify(properties)})`;

function contract(value:unknown):Contract {
  const data = ((value as {data?:unknown}|null|undefined)?.data ?? value) as {schemaVersion?:unknown;source?:unknown;nodes?:unknown;truncated?:unknown;scopeHash?:unknown}|null|undefined;
  if (data?.schemaVersion !== 1 || data.source !== 'CSS' || !Array.isArray(data.nodes) ||
      data.nodes.length > 200 || typeof data.truncated !== 'boolean' ||
      (data.scopeHash !== undefined && !/^[a-f0-9]{64}$/.test(data.scopeHash as string))) throw new Error('Unsupported CSS contract');
  const addresses = new Set<string>();
  for (const raw of data.nodes as unknown[]) {
    const node=raw as NodeView|null|undefined;
    if (!node || typeof node.address !== 'string' || !/^0(?:\/\d+){0,8}$/.test(node.address) || addresses.has(node.address) ||
        node.parent !== (node.address === '0' ? null : node.address.slice(0, node.address.lastIndexOf('/'))) ||
        typeof node.tag !== 'string' || node.tag.length > 128 || !/^[a-z][a-z0-9-]*$/.test(node.tag) ||
        typeof node.id !== 'string' || node.id.length > 128 ||
        !Array.isArray(node.class) || node.class.length > 32 || node.class.some((name:unknown) => typeof name !== 'string' || name.length > 128) ||
        !Number.isSafeInteger(node.childCount) || (node.childCount as number) < 0 ||
        !node.style || typeof node.style !== 'object' || Array.isArray(node.style) ||
        Object.entries(node.style).some(([key, val]) => !properties.includes(key) || typeof val !== 'string' || val.length > 256 || /\burl\s*\(/i.test(val)) ||
        !node.rect || typeof node.rect !== 'object' ||
        ['x', 'y', 'width', 'height'].some(key => typeof (node.rect as Record<string,unknown>)[key] !== 'number' || !Number.isFinite((node.rect as Record<string,unknown>)[key]))) throw new Error('Invalid CSS node');
    addresses.add(node.address);
  }
  return data as unknown as Contract;
}

function diff(before:unknown, after:unknown) {
  const a = contract(before), b = contract(after);
  if (a.scopeHash && b.scopeHash && a.scopeHash !== b.scopeHash) throw new Error('CSS scopes differ');
  const old = new Map(a.nodes.map(node => [node.address, node]));
  const current = new Map(b.nodes.map(node => [node.address, node]));
  const changes:{address:string;kind:string;fields?:string[]}[] = [];
  // ponytail: structural addresses do not prove node identity; add stable target keys if insertion matching matters.
  for (const address of new Set([...old.keys(), ...current.keys()])) {
    const left = old.get(address), right = current.get(address);
    if (!left || !right) { changes.push({ address, kind: left ? 'removed' : 'added' }); continue; }
    const fields:string[] = (['tag', 'id', 'class', 'parent', 'childCount'] as const)
      .filter(key => JSON.stringify(left[key]) !== JSON.stringify(right[key]));
    for (const key of ['x', 'y', 'width', 'height'] as const) if (left.rect[key] !== right.rect[key]) fields.push(`rect.${key}`);
    for (const key of properties) if (left.style[key] !== right.style[key]) fields.push(`style.${key}`);
    if (fields.length) changes.push({ address, kind: 'changed', fields });
  }
  return { schemaVersion: 1, source: 'CSS comparison', identityNotProven: true,
    incomplete: a.truncated || b.truncated, changes };
}

const api={snapshot,expression,contract,diff,properties};
export = api;
