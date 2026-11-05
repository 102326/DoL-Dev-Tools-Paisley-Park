// Evaluated in the inspected document. Never reads page content or observer payload bodies.
async function snapshot(scopeSelector, durationMs, observerInstrumentation = false) {
  if (typeof scopeSelector !== 'string' || !scopeSelector || scopeSelector.length > 256 ||
      !Number.isInteger(durationMs) || durationMs < 1 || durationMs > 10000 ||
      typeof observerInstrumentation !== 'boolean') throw new Error('Invalid timeline options');
  const roots = document.querySelectorAll(scopeSelector);
  if (roots.length !== 1) throw new Error('Timeline scope must match exactly one element');
  let root = roots[0], records = [];
  const started = performance.now(), maxRecords = 500;
  let order = 0, dropped = 0, truncated = false, timer, completed = false;
  const capabilities = { mutation: 'unsupported', performance: 'unsupported',
    instrumentation: observerInstrumentation ? 'unsupported' : 'off',
    callbackTracking: 'unsupported without persistent callback replacement', existingObservers: 'not tracked',
    cleanupConflicts: 0, omittedInstances: 0, observers: {} };
  const elapsed = () => Math.max(0, Math.round(performance.now() - started));
  const put = item => {
    if (!records) return;
    if (records.length >= maxRecords) { dropped++; truncated = true; return; }
    records.push({ order: ++order, atMs: elapsed(), ...item });
  };
  const address = target => {
    if (!root || !records) return null;
    let node = target?.nodeType === 1 ? target : target?.parentElement;
    if (!node || !root.contains(node)) return null;
    const parts = [];
    while (node !== root) {
      if (parts.length >= 8) { truncated = true; return null; }
      const parent = node.parentElement;
      if (!parent) return null;
      const index = Array.prototype.indexOf.call(parent.children, node);
      if (index < 0) return null;
      parts.unshift(index);
      node = parent;
    }
    return `0${parts.map(index => `/${index}`).join('')}`;
  };
  const eventTypes = ['click', 'pointerdown', 'pointerup', 'input', 'change', 'focus', 'blur', 'submit'];
  const eventHandler = event => {
    const at = address(event.target);
    if (at === null) return;
    put({ kind: 'event', type: event.type, address: at,
      tag: String(event.target?.tagName || '').toLowerCase().slice(0, 32),
      isTrusted: event.isTrusted === true, defaultPreventedAtCapture: event.defaultPrevented === true });
  };
  const errorClass = value => {
    let name;
    try { name = value?.name; } catch { return 'Other'; }
    return ['Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'URIError', 'EvalError'].includes(name) ? name : 'Other';
  };
  const number = value => Number.isSafeInteger(value) && value >= 0 ? value : null;
  const onError = event => put({ kind: 'error', errorClass: errorClass(event.error), line: number(event.lineno), column: number(event.colno) });
  const onRejection = event => put({ kind: 'unhandledrejection', errorClass: errorClass(event.reason) });
  let mutation, perf;
  const registeredRoot = [], registeredWindow = [], wrappers = [], refs = [];
  const instrument = { active: true, emit: (name, method) => put({ kind: 'observer', observer: name, method }) };
  const sameDescriptor = (a, b) => a === b || (!!a && !!b &&
    ['value', 'writable', 'configurable', 'enumerable', 'get', 'set'].every(key => a[key] === b[key]));
  const restore = (holder, key, before, after) => {
    try {
      if (!sameDescriptor(Object.getOwnPropertyDescriptor(holder, key), after)) { capabilities.cleanupConflicts++; return; }
      if (before) Object.defineProperty(holder, key, before);
      else if (!Reflect.deleteProperty(holder, key)) { capabilities.cleanupConflicts++; return; }
      if (!sameDescriptor(Object.getOwnPropertyDescriptor(holder, key), before)) capabilities.cleanupConflicts++;
    } catch { capabilities.cleanupConflicts++; }
  };
  try {
    for (const type of eventTypes) {
      root.addEventListener(type, eventHandler, { capture: true, passive: true });
      registeredRoot.push(type);
    }
    window.addEventListener('error', onError, { capture: true, passive: true });
    registeredWindow.push(['error', onError]);
    window.addEventListener('unhandledrejection', onRejection, { capture: true, passive: true });
    registeredWindow.push(['unhandledrejection', onRejection]);
    if (typeof window.MutationObserver === 'function') {
      try {
        mutation = new window.MutationObserver(batch => {
        for (const item of batch) {
          const at = address(item.target);
          if (at === null) continue;
          const record = { kind: 'mutation', type: item.type, address: at };
          if (item.type === 'childList') {
            record.addedCount = item.addedNodes?.length || 0;
            record.removedCount = item.removedNodes?.length || 0;
          } else if (item.type === 'attributes') {
            record.attributeName = typeof item.attributeName === 'string' ? item.attributeName.slice(0, 128) : null;
            if (item.attributeName?.length > 128) truncated = true;
          } else if (item.type !== 'characterData') continue;
          put(record);
        }
        });
        mutation.observe(root, { subtree: true, childList: true, attributes: true, characterData: true });
        capabilities.mutation = 'available';
      } catch { capabilities.mutation = 'unsupported'; }
    }
    if (typeof window.PerformanceObserver === 'function') {
      try {
        perf = new window.PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (Number.isFinite(entry.duration) && Number.isFinite(entry.startTime))
            put({ kind: 'longtask', durationMs: Math.max(0, Math.round(entry.duration)), startMs: Math.round(entry.startTime - started) });
        }
        });
        perf.observe({ entryTypes: ['longtask'] });
        capabilities.performance = 'available';
      } catch { capabilities.performance = 'unsupported'; }
    }

    if (observerInstrumentation && typeof WeakRef === 'function') {
      for (const name of ['MutationObserver', 'ResizeObserver', 'IntersectionObserver']) {
        const before = Object.getOwnPropertyDescriptor(window, name);
        if (!before || !('value' in before) || typeof before.value !== 'function' || !before.configurable) {
          capabilities.observers[name] = 'unsupported'; continue;
        }
        const methods = name === 'MutationObserver' ? ['observe', 'disconnect', 'takeRecords'] : ['observe', 'unobserve', 'disconnect'];
        const Wrapper = new Proxy(before.value, { construct(target, args, newTarget) {
          const instance = Reflect.construct(target, args, newTarget);
          if (!instrument.active || refs.length >= 128) { capabilities.omittedInstances++; return instance; }
          const prepared = [];
          try {
            if (!Object.isExtensible(instance)) throw Error('not extensible');
            for (const method of methods) {
              const previous = Object.getOwnPropertyDescriptor(instance, method);
              if (previous && !previous.configurable) throw Error('method not configurable');
              let owner = instance, descriptor;
              while (owner && !descriptor) {
                descriptor = Object.getOwnPropertyDescriptor(owner, method);
                owner = Object.getPrototypeOf(owner);
              }
              if (!descriptor || !('value' in descriptor) || typeof descriptor.value !== 'function') throw Error('accessor method');
              const original = descriptor.value;
              const wrapped = function (...callArgs) {
                try { if (instrument.active) instrument.emit?.(name, method); } catch { /* diagnostics cannot change observer behavior */ }
                return Reflect.apply(original, this, callArgs);
              };
              const after = { configurable: true, enumerable: previous?.enumerable ?? false, writable: true, value: wrapped };
              prepared.push({ method, previous, after });
            }
            const installed = [];
            try {
              for (const item of prepared) {
                Object.defineProperty(instance, item.method, item.after);
                installed.push(item);
              }
              refs.push({ ref: new WeakRef(instance), saved: prepared });
              instrument.emit?.(name, 'create');
            } catch {
              for (const item of installed) restore(instance, item.method, item.previous, item.after);
              capabilities.observers[name] = 'partial';
            }
          } catch { capabilities.observers[name] = 'partial'; }
          return instance;
        } });
        const after = { ...before, value: Wrapper };
        try {
          Object.defineProperty(window, name, after);
          if (!sameDescriptor(Object.getOwnPropertyDescriptor(window, name), after)) throw Error('install mismatch');
          wrappers.push({ name, before, after });
          capabilities.observers[name] = 'available';
        } catch {
          try {
            const current = Object.getOwnPropertyDescriptor(window, name);
            if (sameDescriptor(current, after)) restore(window, name, before, after);
            else if (!sameDescriptor(current, before)) capabilities.cleanupConflicts++;
          } catch { capabilities.cleanupConflicts++; }
          capabilities.observers[name] = 'unsupported';
        }
      }
      capabilities.instrumentation = wrappers.length ? 'available' : 'unsupported';
    }
    await new Promise(resolve => { timer = setTimeout(resolve, durationMs); });
    completed = true;
  } finally {
    instrument.active = false;
    instrument.emit = null;
    if(observerInstrumentation)capabilities.observerInstances={createdAndInstrumented:refs.length,aliveAtEnd:0,notAliveAtEnd:0,instrumentationMayRetainInstances:true,basis:'new instrumented only; original method references may retain instances; no forced GC; existing observers and retained callbacks unmeasured'};
    try { clearTimeout(timer); } catch { capabilities.cleanupConflicts++; }
    for (const { name, before, after } of wrappers) restore(window, name, before, after);
    for (const { ref, saved } of refs) {
      let instance;
      try { instance = ref.deref(); } catch { capabilities.cleanupConflicts++; continue; }
      if (!instance) {if(observerInstrumentation)capabilities.observerInstances.notAliveAtEnd++;continue;}
      if(observerInstrumentation)capabilities.observerInstances.aliveAtEnd++;
      for (const { method, previous, after } of saved) restore(instance, method, previous, after);
    }
    try { mutation?.disconnect(); } catch { capabilities.cleanupConflicts++; }
    try { perf?.disconnect(); } catch { capabilities.cleanupConflicts++; }
    for (const type of registeredRoot) {
      try { root.removeEventListener(type, eventHandler, true); } catch { capabilities.cleanupConflicts++; }
    }
    for (const [type, handler] of registeredWindow) {
      try { window.removeEventListener(type, handler, true); } catch { capabilities.cleanupConflicts++; }
    }
    if (!completed) { root = null; records = null; }
  }
  const targetStartUnixMs=Number.isFinite(performance.timeOrigin)&&performance.timeOrigin>0?performance.timeOrigin+started:null;
  const result = { schemaVersion: 1, source: 'timeline', durationMs, records, dropped, truncated, capabilities,
    clock:{targetStartUnixMs,basis:'performance.timeOrigin + performance.now; target clock; not host time'} };
  root = null; records = null;
  return result;
}

function validate(scope, duration, flag) {
  if (typeof scope !== 'string' || !scope || scope.length > 256 ||
      !Number.isInteger(duration) || duration < 1 || duration > 10000 ||
      typeof flag !== 'boolean') throw new Error('Invalid timeline options');
}
const expression = (scope, duration, flag = false) => {
  validate(scope, duration, flag);
  return `(${snapshot.toString()})(${JSON.stringify(scope)}, ${duration}, ${flag})`;
};
async function collect(ctx) {
  const { scope, timelineMs, observerInstrumentation = false } = ctx.options;
  validate(scope, timelineMs, observerInstrumentation);
  if (!ctx.client || typeof ctx.client.evaluate !== 'function') throw new Error('CDP unavailable');
  const data = await ctx.client.evaluate(expression(scope, timelineMs, observerInstrumentation));
  return { ...data, ...(data?.capabilities?.cleanupConflicts > 0 ? {collectorStatus:'failed',reason:'timeline-cleanup-conflict'} : {}) };
}
module.exports = { snapshot, expression, collect };
