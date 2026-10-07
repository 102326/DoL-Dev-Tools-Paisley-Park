const collectors = require('./collectors.cjs');
const { connect } = require('./cdp.cjs');

function create(options, overrides = {}, settings = {}) {
  const baseAdb = overrides.adb || collectors.android(options);
  const controller = new AbortController();
  const deadline = settings.timeoutMs === undefined ? Infinity : (settings.started ?? Date.now()) + settings.timeoutMs;
  let client, appPid, forwardAllocationUncertain = false, actionDispatched = false, finished = false;
  const cleanup = [];
  const assertActive = () => {
    if (controller.signal.aborted || Date.now() >= deadline) throw Object.assign(Error('Journey deadline'), { code: 'ETIMEDOUT' });
  };
  const timer = Number.isFinite(deadline) ? setTimeout(() => { controller.abort(); try { client?.close(); } catch {} }, Math.max(1, deadline - Date.now())) : null;
  const execute = async (args, settings = {}) => {
    assertActive();
    const allocating = args[0] === 'forward' && args[1] === 'tcp:0';
    if (allocating) forwardAllocationUncertain = true;
    const signal = settings.signal ? AbortSignal.any([settings.signal, controller.signal]) : controller.signal;
    const result = baseAdb.execute
      ? await baseAdb.execute(args, { ...settings, timeout: Math.min(settings.timeout ?? 10000, 10000, Math.max(1, deadline - Date.now())), signal })
      : await baseAdb(...args);
    // Preserve a returned dynamic port even if the deadline expired during allocation.
    if (!allocating) assertActive();
    return result;
  };
  const adb = (...args) => execute(args);
  adb.execute = execute;
  const ctx = {
    options, adb, cleanup,
    cleanupAdb: (...args) => baseAdb.execute ? baseAdb.execute(args, { timeout: 3000 }) : baseAdb(...args),
    assertActive,
    markSideEffect() { assertActive(); actionDispatched = true; },
    resetSideEffect() { actionDispatched = false; },
    get actionDispatched() { return actionDispatched; },
    get timedOut() { return controller.signal.aborted; },
    async pause(ms) {
      assertActive();
      await new Promise((resolve, reject) => {
        const tick = setTimeout(done, ms);
        function done() { controller.signal.removeEventListener('abort', abort); resolve(); }
        function abort() { clearTimeout(tick); reject(Object.assign(Error('Journey deadline'), { code: 'ETIMEDOUT' })); }
        controller.signal.addEventListener('abort', abort, { once: true });
      });
      assertActive();
    },
    async closeTransport() {
      let closeFailed = false;
      try { client?.close(); } catch { closeFailed = true; }
      client = undefined; ctx.client = undefined;
      if (ctx.forwardPort) await collectors.removeForward(ctx);
      appPid = undefined; ctx.appPid = undefined;
      if (closeFailed) throw Error('Transport close failed');
    },
    async ensureWebview() {
      assertActive();
      const pid = (await adb('shell', 'pidof', options.package)).toString().trim();
      if (!/^\d+$/.test(pid)) throw Error('App identity unavailable');
      if (client && appPid === pid && (!client.isOpen || client.isOpen())) return ctx.client;
      await ctx.closeTransport(); assertActive();
      ctx.appPid = pid;
      await collectors.forward(ctx);
      forwardAllocationUncertain = false; appPid = pid;
      assertActive();
      const capture = settings.captureEvents ? collectors.events() : null;
      client = await (overrides.connect || connect)(ctx.endpoint, Math.min(settings.connectTimeoutMs ?? 15000, Math.max(1, deadline - Date.now())), capture?.onEvent || (() => {}), options.targetId || null);
      assertActive();
      ctx.client = {
        async evaluate(source) { assertActive(); const result = await client.evaluate(source); assertActive(); return result; },
        async send(method, params, settings) { assertActive(); const result = await client.send(method, params, settings); assertActive(); return result; },
      };
      if (capture) {
        ctx.channels = {};
        for (const domain of ['Runtime', 'Network']) {
          try { await ctx.client.send(domain + '.enable'); ctx.channels[domain] = 'available'; }
          catch { assertActive(); ctx.channels[domain] = 'unsupported'; }
        }
        ctx.capture = capture;
      }
      return ctx.client;
    },
    async finish() {
      if (finished) return [];
      finished = true;
      if (timer) clearTimeout(timer);
      controller.abort();
      const results = [];
      for (const restore of cleanup.reverse()) {
        try { await restore(); results.push({ status: 'completed' }); }
        catch { results.push({ status: 'failed', reason: 'restore-failed-or-conflict' }); }
      }
      try { await ctx.closeTransport(); results.push({ status: 'completed', resource: 'own CDP transport' }); }
      catch { results.push({ status: 'failed', resource: 'own CDP transport' }); }
      if (forwardAllocationUncertain) results.push({ status: 'failed', resource: 'ADB forward allocation', reason: 'ownership-unknown; no unrelated forwards removed' });
      return results;
    },
  };
  return ctx;
}

module.exports = { create };
