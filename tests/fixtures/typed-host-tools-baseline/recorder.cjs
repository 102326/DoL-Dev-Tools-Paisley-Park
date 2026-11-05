// Runs inside the inspected document. Only trusted event metadata is retained.
async function snapshot(scopeSelector, durationMs) {
  if (typeof scopeSelector !== 'string' || !scopeSelector.trim() || scopeSelector.length > 128 ||
      !Number.isInteger(durationMs) || durationMs < 1 || durationMs > 30000) throw Error('Invalid recorder options');
  const roots = document.querySelectorAll(scopeSelector);
  if (roots.length !== 1) throw Error('Recorder scope must match exactly one element');
  let root = roots[0], records = [];
  const started = performance.now();
  let dropped = 0, truncated = false, cleanupConflicts = 0, timer, active = true;
  const installed = [];
  const address = target => {
    let node = target;
    if (!node || node.nodeType !== 1 || !root.contains(node)) return null;
    const parts = [];
    while (node !== root) {
      if (parts.length === 8) { truncated = true; return null; }
      const parent = node.parentElement;
      if (!parent) return null;
      const index = Array.prototype.indexOf.call(parent.children, node);
      if (index < 0) return null;
      parts.unshift(index);
      node = parent;
    }
    return `0${parts.map(index => `/${index}`).join('')}`;
  };
  const onEvent = event => {
    if (!active || event.isTrusted !== true) return;
    try {
      const at = address(event.target);
      if (at === null) return;
      const tag = String(event.target.tagName || '').toLowerCase();
      if (!/^[a-z][a-z0-9-]{0,31}$/.test(tag)) { truncated = true; return; }
      let replayable = true, reason = null;
      if(event.type==='click'&&!(event.target instanceof HTMLElement)){replayable=false;reason='unsupported-click-target'}
      if (event.type !== 'click') {
        let type = '';
        try { if (tag === 'input') type = String(event.target.type || '').toLowerCase(); }
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
    await new Promise(resolve => { timer = setTimeout(resolve, durationMs); });
  } finally {
    active = false;
    try { clearTimeout(timer); } catch { cleanupConflicts++; }
    for (const type of installed) {
      try { root.removeEventListener(type, onEvent, true); } catch { cleanupConflicts++; }
    }
    root = null;
  }
  return { schemaVersion: 1, source: 'WebView user recorder', durationMs, records,
    dropped, truncated, cleanupConflicts, inputContent: 'omitted',
    nativeActions: 'not recorded' };
}

function expression(scope, duration) {
  if (typeof scope !== 'string' || !scope.trim() || scope.length > 128 ||
      !Number.isInteger(duration) || duration < 1 || duration > 30000) throw Error('Invalid recorder options');
  return `(${snapshot.toString()})(${JSON.stringify(scope)},${duration})`;
}

function candidate(value, scope) {
  const data = value?.data ?? value;
  const exactKeys = (item, keys) => item && typeof item === 'object' && !Array.isArray(item) &&
    Object.keys(item).every(key => keys.includes(key)) && keys.every(key => Object.hasOwn(item, key));
  if (typeof scope !== 'string' || !scope.trim() || scope.length > 128 ||
      !exactKeys(data, ['schemaVersion','source','durationMs','records','dropped','truncated',
        'cleanupConflicts','inputContent','nativeActions']) ||
      data.schemaVersion !== 1 || data.source !== 'WebView user recorder' ||
      !Number.isInteger(data.durationMs) || data.durationMs < 1 || data.durationMs > 30000 ||
      !Array.isArray(data.records) || data.records.length > 50 ||
      !Number.isSafeInteger(data.dropped) || data.dropped < 0 ||
      typeof data.truncated !== 'boolean' ||
      !Number.isSafeInteger(data.cleanupConflicts) || data.cleanupConflicts < 0 ||
      data.inputContent !== 'omitted' || data.nativeActions !== 'not recorded') throw Error('Invalid recorder data');
  const steps = [];
  let previousOrder = 0, previousTime = -1;
  for (const record of data.records) {
    if (!record || !Number.isSafeInteger(record.order) || record.order <= previousOrder ||
        !Number.isSafeInteger(record.atMs) || record.atMs < previousTime || record.atMs > data.durationMs ||
        !['click', 'input', 'change'].includes(record.kind) ||
        typeof record.address !== 'string' || !/^0(?:\/(?:0|[1-9]\d{0,5})){0,8}$/.test(record.address) ||
        typeof record.tag !== 'string' || !/^[a-z][a-z0-9-]{0,31}$/.test(record.tag) ||
      typeof record.replayable !== 'boolean' ||
      !exactKeys(record, ['order','atMs','kind','address','tag','replayable','reason']) ||
        (record.kind==='click' ? record.replayable ? record.reason!==null : record.reason!=='unsupported-click-target'
          : record.replayable ? record.reason!==null : record.reason!=='unsupported-input-target')) throw Error('Invalid recorder record');
    previousOrder = record.order;
    previousTime = record.atMs;
    const selector = `:is(${scope})` + record.address.slice(1).split('/').filter(Boolean).map(part => ` > :nth-child(${Number(part) + 1})`).join('');
    if (selector.length > 256) throw Error('Recorder selector too long');
    const base = { order: record.order, atMs: record.atMs, address: record.address, tag: record.tag,
      selector, requiresReview: true, identityNotProven: true };
    if (record.kind === 'click') steps.push({ ...base, type: record.replayable?'web-click':'unresolved-click', isExecutable: false, canConvertToAction: record.replayable, ...(record.reason?{reason:record.reason}:{}) });
    else steps.push({ ...base, type: 'unresolved-input', isExecutable: false,
      inputContent: 'omitted', reason: record.reason || 'input-content-omitted' });
  }
  return { schemaVersion: 1, source: 'WebView recorder candidates', durationMs: data.durationMs,
    dropped: data.dropped, truncated: data.truncated, cleanupConflicts: data.cleanupConflicts,
    requiresReview: true, identityNotProven: true, isExecutable: false,
    inputContent: 'omitted', steps };
}

module.exports = { snapshot, expression, candidate };
