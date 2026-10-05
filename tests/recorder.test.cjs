const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { expression, candidate } = require('../scripts/lib/recorder.cjs');

function fixture() {
  let clock = 0, finish;
  const listeners = new Map(), removed = [];
  const root = {
    nodeType: 1, tagName: 'DIV', children: [],
    contains(node) { return node === this || node.parentElement === this; },
    addEventListener(type, callback, options) { listeners.set(type, callback); assert.equal(options.passive, true); },
    removeEventListener(type) { removed.push(type); listeners.delete(type); },
  };
  const button = { nodeType: 1, tagName: 'BUTTON', parentElement: root,
    get value() { throw Error('private value read'); }, get textContent() { throw Error('private text read'); } };
  const input = { nodeType: 1, tagName: 'INPUT', type: 'text', parentElement: root,
    get value() { throw Error('private value read'); }, get innerHTML() { throw Error('private html read'); } };
  root.children.push(button, input);
  const context = { HTMLElement:{[Symbol.hasInstance]:node=>node.namespaceURI!=='svg'},document: { querySelectorAll: () => [root] }, performance: { now: () => clock },
    setTimeout(callback) { finish = callback; return 1; }, clearTimeout() {} };
  return { context, root, button, input, listeners, removed,
    send(type, target, trusted = true) { clock += 5; listeners.get(type)?.({ type, target, isTrusted: trusted }); },
    end() { finish(); } };
}

test('trusted metadata only, input omission, coalescing, and cleanup', async () => {
  const f = fixture();
  const pending = vm.runInNewContext(expression('.scope', 100), f.context);
  f.send('click', f.button, false);
  f.send('click', f.button);
  f.send('input', f.input);
  f.send('input', f.input);
  f.send('change', f.input);
  f.end();
  const data = await pending;
  assert.equal(data.records.length, 2);
  assert.equal(data.records[0].kind, 'click');
  assert.equal(data.records[1].atMs, 25);
  assert.equal(data.inputContent, 'omitted');
  assert.equal(JSON.stringify(data).includes('private'), false);
  assert.deepEqual(f.removed, ['click', 'input', 'change']);
  assert.equal(f.listeners.size, 0);
  const steps = candidate(data, '.scope').steps;
  assert.equal(steps[0].selector, ':is(.scope) > :nth-child(1)');
  assert.equal(steps[0].isExecutable,false);
  assert.equal(candidate(data,'.a,.b').steps[0].selector,':is(.a,.b) > :nth-child(1)');
  assert.equal(steps[0].type, 'web-click');
  assert.equal(steps[1].type, 'unresolved-input');
  assert.equal(steps[1].isExecutable, false);
  assert.equal(steps[1].inputContent, 'omitted');
});

test('sensitive and non-input targets remain unresolved', async () => {
  const f = fixture();
  f.input.type = 'password';
  const pending = vm.runInNewContext(expression('.scope', 100), f.context);
  f.send('input', f.input);
  f.send('change', f.button);
  f.end();
  const data = await pending;
  assert.equal(data.records.length, 2);
  assert.ok(data.records.every(record => !record.replayable && record.reason === 'unsupported-input-target'));
  assert.ok(candidate(data, '.scope').steps.every(step => step.type === 'unresolved-input'));
});

test('SVG clicks require a reviewed replacement target',async()=>{
 const f=fixture();f.button.namespaceURI='svg';f.button.tagName='path';
 const pending=vm.runInNewContext(expression('.scope',100),f.context);f.send('click',f.button);f.end();
 const data=await pending,step=candidate(data,'.scope').steps[0];assert.equal(step.type,'unresolved-click');assert.equal(step.canConvertToAction,false);assert.equal(step.reason,'unsupported-click-target');
});

test('bounded records, address depth, cleanup failure and late callbacks', async () => {
  const f = fixture();
  let saved;
  const original = f.root.addEventListener;
  f.root.addEventListener = function (type, callback, options) { if (type === 'click') saved = callback; original.call(this, type, callback, options); };
  f.root.removeEventListener = function (type) { f.removed.push(type); if (type === 'click') throw Error('cleanup failed'); f.listeners.delete(type); };
  const pending = vm.runInNewContext(expression('.scope', 100), f.context);
  for (let i = 0; i < 55; i++) f.send('click', f.button);
  f.end();
  const data = await pending;
  assert.equal(data.records.length, 50);
  assert.equal(data.dropped, 5);
  assert.equal(data.cleanupConflicts, 1);
  assert.deepEqual(f.removed, ['click', 'input', 'change']);
  saved({ type: 'click', target: f.button, isTrusted: true });
  assert.equal(data.records.length, 50);
  assert.throws(() => candidate({ ...data, records: [{ ...data.records[0], address: '0/1/2/3/4/5/6/7/8/9' }] }, '.scope'));
});

test('invalid scope, setup failure and malformed imported metadata reject', async () => {
  assert.throws(() => expression('x'.repeat(129), 1));
  assert.throws(() => expression('.scope', 30001));
  const f = fixture();
  f.root.addEventListener = function (type, callback) { if (type === 'change') throw Error('setup failed'); f.listeners.set(type, callback); };
  await assert.rejects(vm.runInNewContext(expression('.scope', 10), f.context), /setup failed/);
  assert.deepEqual(f.removed, ['click', 'input']);
  const data = { schemaVersion: 1, source: 'WebView user recorder', durationMs: 10, dropped: 0,
    truncated: false, cleanupConflicts: 0, inputContent: 'omitted', nativeActions: 'not recorded',
    records: [{ order: 1, atMs: 1, kind: 'click', address: '0', tag: 'button', replayable: true, reason: null }] };
  assert.throws(() => candidate({ ...data, records: [{ ...data.records[0], atMs: 11 }] }, '.scope'));
  assert.throws(() => candidate({ ...data, records: [{ ...data.records[0], value: 'secret' }] }, '.scope'));
  assert.throws(() => candidate({ ...data, cleanupConflicts: -1 }, '.scope'));
});
