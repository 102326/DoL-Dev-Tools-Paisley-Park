const {snapshot}:typeof import('./browser/recorder.cjs')=require('./browser/recorder.cjs');
interface RecordView {order:number;atMs:number;kind:string;address:string;tag:string;replayable:boolean;reason:string|null}
interface RecorderView {schemaVersion:number;source:string;durationMs:number;records:RecordView[];dropped:number;truncated:boolean;cleanupConflicts:number;inputContent:string;nativeActions:string}

function expression(scope:string, duration:number) {
  if (typeof scope !== 'string' || !scope.trim() || scope.length > 128 ||
      !Number.isInteger(duration) || duration < 1 || duration > 30000) throw Error('Invalid recorder options');
  return `(${snapshot.toString()})(${JSON.stringify(scope)},${duration})`;
}

function candidate(value:unknown, scope:string) {
  const data = (((value as {data?:unknown}|null)?.data ?? value) as RecorderView); // Checked below before use.
  const exactKeys = (item:unknown, keys:string[]) => item && typeof item === 'object' && !Array.isArray(item) &&
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

export = { snapshot, expression, candidate };
