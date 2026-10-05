const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { expression, collect } = require('../scripts/lib/timeline.cjs');

function fixture() {
  const listeners = new Map(), windows = new Map(), observers = [];
  let finish, now = 0, cleared = false;
  const root = { nodeType: 1, tagName: 'SECTION', children: [], parentElement: null,
    contains(node) { for (; node; node = node.parentElement) if (node === this) return true; return false; },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type, fn) { if (listeners.get(type) === fn) listeners.delete(type); },
    get textContent() { throw Error('private text'); },
    get innerHTML() { throw Error('private HTML'); },
    get value() { throw Error('private input'); } };
  const child = { nodeType: 1, tagName: 'BUTTON', children: [], parentElement: root,
    get textContent() { throw Error('private child text'); }, get value() { throw Error('private child input'); } };
  root.children.push(child);
  class MutationObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() { this.observed = true; }
    disconnect() { this.disconnected = true; }
    takeRecords() { return []; }
  }
  class ResizeObserver {
    constructor(callback) { this.callback = callback; }
    observe() { this.observed = true; }
    unobserve() { this.unobserved = true; }
    disconnect() { this.disconnected = true; }
  }
  class IntersectionObserver extends ResizeObserver {}
  class PerformanceObserver {
    constructor(callback) { this.callback = callback; observers.push(this); }
    observe() { this.observed = true; }
    disconnect() { this.disconnected = true; }
  }
  const window = { MutationObserver, ResizeObserver, IntersectionObserver, PerformanceObserver,
    addEventListener(type, fn) { windows.set(type, fn); },
    removeEventListener(type, fn) { if (windows.get(type) === fn) windows.delete(type); } };
  const context = { document: { querySelectorAll: () => [root] }, window,
    performance: { now: () => now }, WeakRef,
    setTimeout(fn) { finish = fn; return 1; }, clearTimeout() { cleared = true; } };
  return { root, child, window, observers, listeners, windows, context,
    advance(value) { now = value; }, fire() { finish(); }, get cleared() { return cleared; } };
}

test('timeline captures bounded structural signals and cleans up its own observers', async () => {
  const f = fixture();
  const pending = vm.runInNewContext(expression('.hud', 20), f.context);
  f.advance(5);
  f.listeners.get('click')({ type: 'click', target: f.child, isTrusted: true, defaultPrevented: false,
    get detail() { throw Error('private event body'); } });
  f.observers[0].callback([{ type: 'attributes', target: f.child, attributeName: 'data-active',
    get oldValue() { throw Error('private old value'); } },
  { type: 'childList', target: f.root, addedNodes: [1], removedNodes: [],
    get textContent() { throw Error('private mutation body'); } }]);
  f.windows.get('error')({ error: { name: 'TypeError', get message() { throw Error('private error'); } }, lineno: 12, colno: 3 });
  f.windows.get('unhandledrejection')({ reason: { name: 'Error', get message() { throw Error('private rejection'); } } });
  f.observers[1].callback({ getEntries: () => [{ duration: 55, startTime: 4,
    get name() { throw Error('private URL'); } }] });
  f.fire();
  const result = await pending;
  assert.equal(result.records.length, 6);
  assert.deepEqual(JSON.parse(JSON.stringify(result.records[0])), { order: 1, atMs: 5, kind: 'event', type: 'click', address: '0/0', tag: 'button', isTrusted: true, defaultPreventedAtCapture: false });
  assert.equal(result.records[1].attributeName, 'data-active');
  assert.equal(result.records[2].addedCount, 1);
  assert.equal(result.records[3].errorClass, 'TypeError');
  assert.equal(result.records[4].errorClass, 'Error');
  assert.equal(result.records[5].kind, 'longtask');
  assert.equal(result.capabilities.mutation, 'available');
  assert.equal(result.capabilities.performance, 'available');
  assert.equal(f.listeners.size, 0);
  assert.equal(f.windows.size, 0);
  assert.equal(f.observers.every(observer => observer.disconnected), true);
  assert.equal(f.cleared, true);
  assert.equal(JSON.stringify(result).includes('private'), false);
});

test('timeline caps records, validates host options, and leaves project observers connected', async () => {
  assert.throws(() => expression('x'.repeat(257), 1));
  assert.throws(() => expression('.hud', 10001));
  await assert.rejects(collect({ options: { scope: '.hud', timelineMs: 0 }, client: { evaluate() { throw Error('called'); } } }));
  const f = fixture(), Original = f.window.MutationObserver;
  const pending = vm.runInNewContext(expression('.hud', 10, true), f.context);
  let calls = 0;
  const callback = () => { calls++; };
  const project = new f.window.MutationObserver(callback);
  const originalObserve = Original.prototype.observe;
  project.observe(f.child);
  project.callback([]);
  for (let i = 0; i < 505; i++) f.listeners.get('click')({ type: 'click', target: f.child, isTrusted: false, defaultPrevented: false });
  f.fire();
  const result = await pending;
  assert.equal(calls, 1);
  assert.equal(result.records.length, 500);
  assert.equal(result.truncated, true);
  assert.ok(result.dropped >= 5);
  assert.equal(f.window.MutationObserver, Original);
  assert.equal(project.observe, originalObserve);
  assert.equal(project.disconnected, undefined);
  assert.equal(result.capabilities.observerInstances.createdAndInstrumented,1);
  assert.equal(result.capabilities.observerInstances.aliveAtEnd,1);
  assert.equal(result.capabilities.callbackTracking, 'unsupported without persistent callback replacement');
  assert.ok(result.records.some(record => record.kind === 'observer' && record.method === 'observe'));
  assert.ok(JSON.stringify(result).length < 128 * 1024);
});

test('instrumentation reports global restoration conflict without overwriting project changes', async () => {
  const f = fixture();
  const pending = vm.runInNewContext(expression('.hud', 10, true), f.context);
  const changed = function ProjectObserver() {};
  f.window.MutationObserver = changed;
  f.fire();
  const result = await pending;
  assert.equal(f.window.MutationObserver, changed);
  assert.equal(result.capabilities.cleanupConflicts, 1);
});

test('throwing observer getter and setup failure leave listeners and installed wrappers cleaned', async () => {
  const f = fixture(), Original = f.window.MutationObserver;
  Object.defineProperty(f.window, 'ResizeObserver', { configurable: true, get() { throw Error('project getter'); } });
  const pending = vm.runInNewContext(expression('.hud', 10, true), f.context);
  f.fire();
  const result = await pending;
  assert.equal(result.capabilities.observers.ResizeObserver, 'unsupported');
  assert.equal(f.window.MutationObserver, Original);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.windows.size, 0);
  assert.equal(f.observers.every(observer => observer.disconnected), true);

  const broken = fixture(), OriginalBroken = broken.window.MutationObserver;
  broken.context.setTimeout = () => { throw Error('timer setup failed'); };
  await assert.rejects(vm.runInNewContext(expression('.hud', 10, true), broken.context), /timer setup failed/);
  assert.equal(broken.window.MutationObserver, OriginalBroken);
  assert.equal(broken.listeners.size, 0);
  assert.equal(broken.windows.size, 0);
  assert.equal(broken.observers.every(observer => observer.disconnected), true);
});

test('cleanup skips conflicting accessor and frozen instance while cleaning other resources', async () => {
  const f = fixture(), Resize = f.window.ResizeObserver;
  const pending = vm.runInNewContext(expression('.hud', 10, true), f.context);
  const Wrapped = f.window.MutationObserver;
  const project = new Wrapped(() => {});
  Object.freeze(project);
  Object.defineProperty(f.window, 'MutationObserver', { configurable: true,
    get() { return Wrapped; }, set() { throw Error('project setter'); } });
  f.fire();
  const result = await pending;
  assert.ok(result.capabilities.cleanupConflicts >= 2);
  assert.equal(f.window.ResizeObserver, Resize);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.windows.size, 0);
  assert.equal(f.observers[0].disconnected, true);
  assert.equal(project.disconnected, undefined);
});

test('observer constructor remains usable when a method is a throwing accessor', async () => {
  const f = fixture();
  const Original = f.window.ResizeObserver;
  Object.defineProperty(Original.prototype, 'observe', { configurable: true,
    get() { throw Error('project method getter'); } });
  const pending = vm.runInNewContext(expression('.hud', 10, true), f.context);
  const instance = new f.window.ResizeObserver(() => {});
  assert.ok(instance instanceof Original);
  f.fire();
  const result = await pending;
  assert.equal(result.capabilities.observers.ResizeObserver, 'partial');
  assert.equal(f.window.ResizeObserver, Original);
});

test('collect evaluates the bounded expression through the supplied client', async () => {
  let source;
  const result = await collect({ options: { scope: '.hud', timelineMs: 10, observerInstrumentation: false },
    client: { evaluate: async value => { source = value; return { records: [] }; } } });
  assert.deepEqual(result, { records: [] });
  assert.ok(source.includes('(\".hud\", 10, false)'));
});
