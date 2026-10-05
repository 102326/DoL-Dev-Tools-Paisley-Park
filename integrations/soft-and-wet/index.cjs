// Only this optional bridge knows Soft & Wet. No imports from its source tree.
const { redact } = require('../../scripts/lib/privacy.cjs');
function probe() {
  const ui = window.DoLGameUI?.ui;
  if (!ui) return { status: 'unavailable' };
  if (ui.apiVersion !== 1 || typeof ui.getCapabilities !== 'function') return { status: 'unsupported' };
  const capability = ui.getCapabilities();
  const choose = (v, list) => list.includes(v) ? v : 'unknown';
  const diagnostics = typeof ui.getDiagnostics === 'function' ? ui.getDiagnostics() : null;
  if (diagnostics && diagnostics.schemaVersion !== 1) return { status: 'unsupported' };
  const raw = diagnostics?.adapters ?? (typeof ui.getAdapterDiagnostics === 'function' ? ui.getAdapterDiagnostics() : null);
  const roles = ['page-shell','title','toolbar','section','card','compact-row','list','primary-action','secondary-action','danger-action','status','badge','modal','drawer'];
  const reasons = ['page-not-present','missing-selector','ambiguous-selector','ui-or-page-disabled','target-not-detected','safe-fingerprint-mismatch','matched','structure-drift','version-unverified','surface-already-owned','adapter-error','adapter-detached','requires-full-match'];
  return { status: 'available', apiVersion: 1, runtimeSnapshotAvailable: !!diagnostics, adapterProbeAvailable: Array.isArray(raw),
    capabilities: { enabled: !!capability.enabled, styleAdapters: !!capability.styleAdapters, surfaces: !!capability.surfaces,
      visualTier: choose(capability.visualTier, ['Smooth','Balanced','Fancy']), glass: !!capability.glass, motion: !!capability.motion },
    // User-supplied IDs, selector strings and event messages are omitted by default.
    adapters: Array.isArray(raw) ? raw.slice(0, 32).map((a, index) => ({ index,
      match: choose(a.match, ['full','partial','none']), status: choose(a.status, ['idle','active','partial','inactive','unknown','failed','disposed']),
      reason: choose(a.reason, reasons), targetDetected: !!a.targetDetected, degraded: !!a.degraded,
      level: choose(a.level, ['Style Only','Disabled']), fingerprintDeclared: typeof a.fingerprint === 'string',
      mapped: Array.isArray(a.mapped) ? a.mapped.filter(r => roles.includes(r)).slice(0,32) : [],
      mappings: Array.isArray(a.mappings) ? a.mappings.slice(0,64).map(m => ({
        role: choose(m.role, [...roles,'scope','fingerprint:safe','fingerprint:required']), fallback: !!m.fallback,
        count: Number.isSafeInteger(m.count) && m.count >= 0 ? m.count : null, reason: choose(m.reason || 'matched', reasons) })) : [] })) : [],
    surfaces: Array.isArray(diagnostics?.surfaces) ? diagnostics.surfaces.slice(0,32).map(s => ({
      kind: choose(s.kind, ['modal','drawer','native-overlay']), source: choose(s.source, ['Soft & Wet','Runtime','Adapter','Native / Third-party']) })) : [],
    recentEventCount: Array.isArray(diagnostics?.events) ? Math.min(32, diagnostics.events.length) : null };
}
async function detect(ctx) {
  if (!ctx.client) return 'unavailable';
  return ctx.client.evaluate("window.DoLGameUI?.ui ? 'available' : 'unavailable'");
}
function describe() { return { name: 'soft-and-wet', version: '0.1.0', supportedApiVersion: 1, source: 'Soft & Wet Runtime interpretation' }; }
async function collect(ctx) { return ctx.client.evaluate(`(${probe.toString()})()`); }
module.exports = { detect, describe, collect, redact };
