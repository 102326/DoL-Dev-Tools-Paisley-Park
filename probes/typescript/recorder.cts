interface RecordEntry {order:number;atMs:number;kind:string;address:string;tag:string;replayable:boolean;reason:string|null}
// Runs inside the inspected document. Only trusted event metadata is retained.
async function snapshot(scopeSelector:string, durationMs:number) {
  if (typeof scopeSelector !== 'string' || !scopeSelector.trim() || scopeSelector.length > 128 ||
      !Number.isInteger(durationMs) || durationMs < 1 || durationMs > 30000) throw Error('Invalid recorder options');
  const roots = document.querySelectorAll(scopeSelector);
  if (roots.length !== 1) throw Error('Recorder scope must match exactly one element');
  let root:Element|null = roots[0];
  const records:RecordEntry[] = [];
  const started = performance.now();
  let dropped = 0, truncated = false, cleanupConflicts = 0, timer:ReturnType<typeof setTimeout>|undefined, active = true;
  const installed:string[] = [];
  const address = (target:EventTarget|null) => {
    let node = target as Element|null;
    if (!node || node.nodeType !== 1 || !root!.contains(node)) return null;
    const parts:number[] = [];
    while (node !== root) {
      if (parts.length === 8) { truncated = true; return null; }
      const parent:Element|null = node!.parentElement;
      if (!parent) return null;
      const index = Array.prototype.indexOf.call(parent.children, node);
      if (index < 0) return null;
      parts.unshift(index);
      node = parent;
    }
    return `0${parts.map(index => `/${index}`).join('')}`;
  };
  const onEvent = (event:Event) => {
    if (!active || event.isTrusted !== true) return;
    try {
      const at = address(event.target);
      if (at === null) return;
      const target = event.target as Element;
      const tag = String(target.tagName || '').toLowerCase();
      if (!/^[a-z][a-z0-9-]{0,31}$/.test(tag)) { truncated = true; return; }
      let replayable = true, reason:string|null = null;
      if(event.type==='click'&&!(event.target instanceof HTMLElement)){replayable=false;reason='unsupported-click-target'}
      if (event.type !== 'click') {
        let type = '';
        try { if (tag === 'input') type = String((target as HTMLInputElement).type || '').toLowerCase(); }
        catch { type = 'unknown'; }
        if ((tag !== 'input' && tag !== 'textarea') || ['password', 'file', 'hidden'].includes(type)) {
          replayable = false;
          reason = 'unsupported-input-target';
        }
        if (type === 'unknown') { replayable = false; reason = 'unsupported-input-target'; }
      }
      const atMs = Math.min(durationMs, Math.max(0, Math.round(performance.now() - started)));
      const last = records[records.length - 1];
      if (event.type !== 'click' && last && last.kind !== 'click' && last.address === at && last.tag === tag) {
        last.atMs = atMs;
        if (!replayable) { last.replayable = false; last.reason = reason; }
        return;
      }
      if (records.length >= 50) { dropped++; truncated = true; return; }
      records.push({ order: records.length + 1, atMs, kind: event.type, address: at, tag,
        replayable, reason });
    } catch { truncated = true; }
  };
  try {
    for (const type of ['click', 'input', 'change']) {
      root.addEventListener(type, onEvent, { capture: true, passive: true });
      installed.push(type);
    }
    await new Promise<void>(resolve => { timer = setTimeout(resolve, durationMs); });
  } finally {
    active = false;
    try { clearTimeout(timer); } catch { cleanupConflicts++; }
    for (const type of installed) {
      try { root!.removeEventListener(type, onEvent, true); } catch { cleanupConflicts++; }
    }
    root = null;
  }
  return { schemaVersion: 1, source: 'WebView user recorder', durationMs, records,
    dropped, truncated, cleanupConflicts, inputContent: 'omitted',
    nativeActions: 'not recorded' };
}

export = { snapshot };
