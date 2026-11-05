interface TimelineRecord {kind:string;[key:string]:unknown}
interface ObserverInstances {createdAndInstrumented:number;aliveAtEnd:number;notAliveAtEnd:number;instrumentationMayRetainInstances:boolean;basis:string}
interface Capabilities {mutation:string;performance:string;instrumentation:string;callbackTracking:string;existingObservers:string;cleanupConflicts:number;omittedInstances:number;observers:Record<string,string>;observerInstances?:ObserverInstances}
interface Saved {method:string;previous:PropertyDescriptor|undefined;after:PropertyDescriptor}
// Evaluated in the inspected document. Never reads page content or observer payload bodies.
async function snapshot(scopeSelector:string, durationMs:number, observerInstrumentation = false) {
  if (typeof scopeSelector !== 'string' || !scopeSelector || scopeSelector.length > 256 ||
      !Number.isInteger(durationMs) || durationMs < 1 || durationMs > 10000 ||
      typeof observerInstrumentation !== 'boolean') throw new Error('Invalid timeline options');
  const roots = document.querySelectorAll(scopeSelector);
  if (roots.length !== 1) throw new Error('Timeline scope must match exactly one element');
  let root:Element|null = roots[0], records:TimelineRecord[]|null = [];
  const started = performance.now(), maxRecords = 500;
  let order = 0, dropped = 0, truncated = false, timer:ReturnType<typeof setTimeout>|undefined, completed = false;
  const capabilities:Capabilities = { mutation: 'unsupported', performance: 'unsupported',
    instrumentation: observerInstrumentation ? 'unsupported' : 'off',
    callbackTracking: 'unsupported without persistent callback replacement', existingObservers: 'not tracked',
    cleanupConflicts: 0, omittedInstances: 0, observers: {} };
  const elapsed = () => Math.max(0, Math.round(performance.now() - started));
  const put = (item:TimelineRecord) => {
    if (!records) return;
    if (records.length >= maxRecords) { dropped++; truncated = true; return; }
    records.push({ order: ++order, atMs: elapsed(), ...item });
  };
  const address = (target:Node|null) => {
    if (!root || !records) return null;
    let node:Element|null = target?.nodeType === 1 ? target as Element : target?.parentElement ?? null;
    if (!node || !root.contains(node)) return null;
    const parts:number[] = [];
    while (node !== root) {
      if (parts.length >= 8) { truncated = true; return null; }
      const parent:Element|null = node.parentElement;
      if (!parent) return null;
      const index = Array.prototype.indexOf.call(parent.children, node);
      if (index < 0) return null;
      parts.unshift(index);
      node = parent;
    }
    return `0${parts.map(index => `/${index}`).join('')}`;
  };
  const eventTypes = ['click', 'pointerdown', 'pointerup', 'input', 'change', 'focus', 'blur', 'submit'];
  const eventHandler = (event:Event) => {
    const at = address(event.target as Node|null);
    if (at === null) return;
    put({ kind: 'event', type: event.type, address: at,
      tag: String((event.target as Element|null)?.tagName || '').toLowerCase().slice(0, 32),
      isTrusted: event.isTrusted === true, defaultPreventedAtCapture: event.defaultPrevented === true });
  };
  const errorClass = (value:unknown) => {
    let name;
    try { name = (value as {name?:unknown}|null)?.name; } catch { return 'Other'; }
    return ['Error', 'TypeError', 'ReferenceError', 'SyntaxError', 'RangeError', 'URIError', 'EvalError'].includes(name as string) ? name : 'Other';
  };
  const number = (value:number) => Number.isSafeInteger(value) && value >= 0 ? value : null;
  const onError = (event:ErrorEvent) => put({ kind: 'error', errorClass: errorClass(event.error), line: number(event.lineno), column: number(event.colno) });
  const onRejection = (event:PromiseRejectionEvent) => put({ kind: 'unhandledrejection', errorClass: errorClass(event.reason) });
  let mutation:MutationObserver|undefined, perf:PerformanceObserver|undefined;
  const registeredRoot:string[] = [], registeredWindow:[string,EventListener][] = [], wrappers:{name:string;before:PropertyDescriptor;after:PropertyDescriptor}[] = [], refs:{ref:WeakRef<object>;saved:Saved[]}[] = [];
  const instrument:{active:boolean;emit:((name:string,method:string)=>void)|null} = { active: true, emit: (name, method) => put({ kind: 'observer', observer: name, method }) };
  const sameDescriptor = (a:PropertyDescriptor|undefined, b:PropertyDescriptor|undefined) => a === b || (!!a && !!b &&
    ['value', 'writable', 'configurable', 'enumerable', 'get', 'set'].every(key => a[key as keyof PropertyDescriptor] === b[key as keyof PropertyDescriptor]));
  const restore = (holder:object, key:string, before:PropertyDescriptor|undefined, after:PropertyDescriptor|undefined) => {
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
    registeredWindow.push(['error', onError as EventListener]);
    window.addEventListener('unhandledrejection', onRejection, { capture: true, passive: true });
    registeredWindow.push(['unhandledrejection', onRejection as EventListener]);
    if (typeof window.MutationObserver === 'function') {
      try {
        mutation = new window.MutationObserver(batch => {
        for (const item of batch) {
          const at = address(item.target);
          if (at === null) continue;
          const record:TimelineRecord = { kind: 'mutation', type: item.type, address: at };
          if (item.type === 'childList') {
            record.addedCount = item.addedNodes?.length || 0;
            record.removedCount = item.removedNodes?.length || 0;
          } else if (item.type === 'attributes') {
            record.attributeName = typeof item.attributeName === 'string' ? item.attributeName.slice(0, 128) : null;
            if ((item.attributeName?.length as number) > 128) truncated = true;
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
          const prepared:Saved[] = [];
          try {
            if (!Object.isExtensible(instance)) throw Error('not extensible');
            for (const method of methods) {
              const previous = Object.getOwnPropertyDescriptor(instance, method);
              if (previous && !previous.configurable) throw Error('method not configurable');
              let owner:object|null = instance, descriptor:PropertyDescriptor|undefined;
              while (owner && !descriptor) {
                descriptor = Object.getOwnPropertyDescriptor(owner, method);
                owner = Object.getPrototypeOf(owner);
              }
              if (!descriptor || !('value' in descriptor) || typeof descriptor.value !== 'function') throw Error('accessor method');
              const original = descriptor.value;
              const wrapped = function (this:unknown, ...callArgs:unknown[]) {
                try { if (instrument.active) instrument.emit?.(name, method); } catch { /* diagnostics cannot change observer behavior */ }
                return Reflect.apply(original, this, callArgs);
              };
              const after = { configurable: true, enumerable: previous?.enumerable ?? false, writable: true, value: wrapped };
              prepared.push({ method, previous, after });
            }
            const installed:Saved[] = [];
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
    await new Promise<void>(resolve => { timer = setTimeout(resolve, durationMs); });
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
      if (!instance) {if(observerInstrumentation)capabilities.observerInstances!.notAliveAtEnd++;continue;}
      if(observerInstrumentation)capabilities.observerInstances!.aliveAtEnd++;
      for (const { method, previous, after } of saved) restore(instance, method, previous, after);
    }
    try { mutation?.disconnect(); } catch { capabilities.cleanupConflicts++; }
    try { perf?.disconnect(); } catch { capabilities.cleanupConflicts++; }
    for (const type of registeredRoot) {
      try { root!.removeEventListener(type, eventHandler, true); } catch { capabilities.cleanupConflicts++; }
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

export = { snapshot };
