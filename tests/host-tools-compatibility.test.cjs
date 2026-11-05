const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');

// Recorder and timeline expressions are transient probes, not persistent identity digests.
async function capture(module, name) {
  const listeners = new Map(), windowListeners = new Map(), removed = [];
  let finish, now = 0;
  const root = {
    nodeType: 1, tagName: 'SECTION', children: [],
    contains(node) { return node === this || node.parentElement === this; },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); removed.push(type); },
  };
  const button = { nodeType: 1, tagName: 'BUTTON', parentElement: root };
  root.children.push(button);
  const context = {
    document: { querySelectorAll: () => [root] },
    window: { addEventListener(type, fn) { windowListeners.set(type, fn); }, removeEventListener(type, fn) { if (windowListeners.get(type) === fn) windowListeners.delete(type); } },
    HTMLElement: { [Symbol.hasInstance]: () => true },
    performance: { now: () => now, timeOrigin: 1000 },
    setTimeout(fn) { finish = fn; return 1; }, clearTimeout() {},
  };
  const promise = vm.runInNewContext(module.expression('.scope', 100), context);
  now = 7;
  listeners.get('click')({ type: 'click', target: button, isTrusted: true, defaultPrevented: false });
  finish();
  const result = await promise;
  return { result: JSON.parse(JSON.stringify(result)), removed: removed.sort(), remaining: listeners.size, remainingWindow: windowListeners.size };
}
for (const name of ['recorder', 'timeline']) {
  test(`${name} matches the original capture and cleanup behavior`, async () => {
    const before = require(`./fixtures/typed-host-tools-baseline/${name}.cjs`);
    const after = require(`../scripts/lib/${name}.cjs`);
    const oldCapture = await capture(before, name), newCapture = await capture(after, name);
    assert.deepEqual(newCapture, oldCapture);
    assert.equal(newCapture.result.records.length, 1);
    assert.equal(newCapture.result.records[0].kind, name === 'recorder' ? 'click' : 'event');
    assert.equal(newCapture.remaining, 0);
    assert.equal(newCapture.remainingWindow, 0);
  });
}
