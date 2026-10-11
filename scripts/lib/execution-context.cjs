const collectors = require('./collectors.cjs');
const { connect } = require('./cdp.cjs');

function create(options, overrides = {}, settings = {}) {
  const baseAdb = overrides.adb || collectors.android(options);
  const controller = new AbortController();
  const deadline = settings.timeoutMs === undefined ? Infinity : (settings.started ?? Date.now()) + settings.timeoutMs;
  let client, forwardAllocationUncertain = false, actionDispatched = false, finished = false;
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
      ctx.appPid = undefined;
      if (closeFailed) throw Error('Transport close failed');
    },
    async ensureWebview() {
      assertActive();
      if (client) { await ctx.client.assertBound(); return ctx.client; }
      const pid = (await adb('shell', 'pidof', options.package)).toString().trim();
      if (!/^\d+$/.test(pid)) throw Error('App identity unavailable');
      await ctx.closeTransport(); assertActive();
      ctx.appPid = pid;
      await collectors.forward(ctx);
      forwardAllocationUncertain = false;
      assertActive();
      const capture = settings.captureEvents ? collectors.events() : null;
      const contexts = new Map(); let binding, invalid;
      const reject = code => { invalid ||= code; throw Object.assign(Error(invalid), { code: invalid }); };
      const onEvent = (method, params) => {
        if (method === 'Runtime.executionContextCreated') contexts.set(params.context.id, params.context);
        if (method === 'Runtime.executionContextDestroyed') {
          if (binding && contexts.get(params.executionContextId)?.uniqueId === binding.uniqueContextId) invalid = 'ANDROID_DOCUMENT_CHANGED';
          contexts.delete(params.executionContextId);
        }
        if (method === 'Runtime.executionContextsCleared') { contexts.clear(); if (binding) invalid = 'ANDROID_DOCUMENT_CHANGED'; }
        capture?.onEvent(method, params);
      };
      try {
        client = await (overrides.connect || connect)(ctx.endpoint, Math.min(settings.connectTimeoutMs ?? 15000, Math.max(1, deadline - Date.now())), onEvent, options.targetId || null);
        const transport = client;
        // Never use the default realm after binding; old holders cannot follow a reload.
        await transport.send('Page.enable'); await transport.send('Runtime.enable'); assertActive();
        const frame = (await transport.send('Page.getFrameTree')).frameTree?.frame;
        const defaults = [...contexts.values()].filter(c => c.auxData?.isDefault === true && c.auxData.frameId === frame?.id && typeof c.uniqueId === 'string' && c.uniqueId);
        if (!frame || !['id', 'loaderId', 'url'].every(k => typeof frame[k] === 'string' && frame[k]) || defaults.length !== 1) throw Error('Android default document unavailable');
        binding = Object.freeze({ frameId: frame.id, loaderId: frame.loaderId, url: frame.url, uniqueContextId: defaults[0].uniqueId });
        const bound = {
          async assertBound() {
            assertActive();
            if (client !== transport || ctx.client !== bound) throw Object.assign(Error('Android transport binding closed'), { code: 'ANDROID_BINDING_CLOSED' });
            if (invalid) reject(invalid);
            if (transport.isOpen && !transport.isOpen()) reject('CDP_CONNECTION_CLOSED');
            if ((await adb('shell', 'pidof', options.package)).toString().trim() !== pid) reject('ANDROID_TARGET_CHANGED');
            const current = (await transport.send('Page.getFrameTree')).frameTree?.frame;
            if (invalid || !current || current.id !== binding.frameId || current.loaderId !== binding.loaderId || current.url !== binding.url ||
              ![...contexts.values()].some(c => c.uniqueId === binding.uniqueContextId && c.auxData?.isDefault === true && c.auxData.frameId === binding.frameId)) reject('ANDROID_DOCUMENT_CHANGED');
            assertActive();
          },
          async evaluate(expression) {
            const result = await bound.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
            if (result?.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
            return result?.result?.value;
          },
          async send(method, params = {}, settings) {
            if (method === 'Runtime.evaluate') {
              if (params.contextId !== undefined || params.uniqueContextId !== undefined && params.uniqueContextId !== binding.uniqueContextId) throw Error('Wrong Android context');
              params = { ...params, uniqueContextId: binding.uniqueContextId };
            }
            // Reviewed callFunctionOn paths use held objects, never an implicit current context.
            if (method === 'Runtime.callFunctionOn' && (typeof params.objectId !== 'string' || !params.objectId || params.executionContextId !== undefined || params.uniqueContextId !== undefined)) throw Error('Bound Android object required; no context override');
            await bound.assertBound();
            const result = await transport.send(method, params, settings);
            await bound.assertBound(); return result;
          },
        };
        ctx.client = bound;
        await bound.assertBound();
        if (capture) {
          ctx.channels = { Runtime: 'available' };
          try { await bound.send('Network.enable'); ctx.channels.Network = 'available'; }
          catch { assertActive(); ctx.channels.Network = 'unsupported'; }
          ctx.capture = capture;
        }
      } catch (error) {
        try { await ctx.closeTransport(); }
        catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Android document binding and cleanup failed'); }
        throw error;
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
