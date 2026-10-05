const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { snapshot, expression, contract, diff, properties } = require('../scripts/lib/css.cjs');

function element(tag, id = '', children = [], values = {}) {
  return {
    tagName: tag, id, classList: ['panel'], children, values,
    getBoundingClientRect: () => ({ x: 1, y: 2, width: 30, height: 40 }),
    get textContent() { throw Error('private text read'); },
    get innerHTML() { throw Error('private HTML read'); },
    get value() { throw Error('private value read'); },
    get cssText() { throw Error('CSS rule read'); },
  };
}

function run(roots) {
  return vm.runInNewContext(expression('.hud'), {
    document: { querySelectorAll: () => roots },
    getComputedStyle: node => ({ getPropertyValue: key => node.values[key] ?? '',
      get cssText() { throw Error('computed CSS text read'); } }),
  });
}

test('CSS snapshot requires unique scope, stays scoped, and reports style and geometry changes', () => {
  assert.throws(() => run([]), /exactly one/);
  assert.throws(() => run([element('DIV'), element('DIV')]), /exactly one/);
  const outside = element('INPUT', 'secret');
  const before = run([element('SECTION', 'hud', [element('BUTTON', 'start', [], { display: 'block' })])]);
  const afterRoot = element('SECTION', 'hud', [element('BUTTON', 'start', [], { display: 'flex' }), element('P')]);
  afterRoot.children[0].getBoundingClientRect = () => ({ x: 1, y: 2, width: 31, height: 40 });
  const after = run([afterRoot]);
  assert.equal(before.nodes.length, 2);
  assert.equal(JSON.stringify(before).includes(outside.id), false);
  assert.equal(contract({ data: before }), before);
  const changes = diff(before, after).changes;
  assert.ok(changes.some(change => change.address === '0/0' && change.fields.includes('style.display') && change.fields.includes('rect.width')));
  assert.ok(changes.some(change => change.address === '0/1' && change.kind === 'added'));
  assert.equal(diff(before, after).identityNotProven, true);
  assert.equal(typeof snapshot, 'function');
  assert.ok(properties.includes('background-image'));
});

test('CSS snapshot masks URLs, bounds fields, and flags omitted nodes', () => {
  const root = element('DIV', 'x'.repeat(130), Array.from({ length: 205 }, (_, i) => element('SPAN', String(i))), {
    'background-image': 'linear-gradient(red, url(https://private.example/a(b)), blue)',
    filter: 'URL (https://private.example/filter)',
    color: 'x'.repeat(260),
  });
  root.classList = ['y'.repeat(129)];
  const result = run([root]);
  assert.equal(result.nodes.length, 200);
  assert.equal(result.truncated, true);
  assert.equal(result.nodes[0].id.length, 128);
  assert.equal(result.nodes[0].class[0].length, 128);
  assert.equal(result.nodes[0].style['background-image'], '[url omitted]');
  assert.equal(result.nodes[0].style.filter, '[url omitted]');
  assert.equal(result.nodes[0].style.color.length, 256);
  assert.equal(JSON.stringify(result).includes('private.example'), false);
  assert.equal(diff(result, result).incomplete, true);
  let deep = element('SPAN');
  for (let i = 0; i < 9; i++) deep = element('DIV', '', [deep]);
  const depthLimited = run([deep]);
  assert.equal(depthLimited.nodes.length, 9);
  assert.equal(depthLimited.truncated, true);
});

test('CSS contract rejects malformed imports and mismatched scopes', () => {
  const base = JSON.parse(JSON.stringify(run([element('DIV')])));
  const invalid = mutate => { const value = structuredClone(base); mutate(value); assert.throws(() => contract(value)); };
  invalid(value => { value.source = 'DOM'; });
  invalid(value => { value.nodes.push(structuredClone(value.nodes[0])); });
  invalid(value => { value.nodes[0].style.color = 'url(https://private.example)'; });
  invalid(value => { value.nodes[0].style.color = 'URL (https://private.example)'; });
  invalid(value => { value.nodes[0].style['unapproved-property'] = 'x'; });
  invalid(value => { value.nodes[0].rect.width = Infinity; });
  invalid(value => { value.nodes[0].id = 'x'.repeat(129); });
  invalid(value => { value.nodes[0].tag = 'x'.repeat(129); });
  invalid(value => { value.nodes[0].parent = '0'; });
  const a = { ...base, scopeHash: 'a'.repeat(64) }, b = { ...base, scopeHash: 'b'.repeat(64) };
  assert.throws(() => diff(a, b), /scopes differ/);
});
