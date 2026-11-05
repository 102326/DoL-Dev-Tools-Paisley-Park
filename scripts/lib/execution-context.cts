import type cdp from './cdp.cjs';
import type targets from './runtime-target.cjs';
interface Capture {onEvent:cdp.OnEvent;snapshot():unknown}
interface Frame {id:string;loaderId:string;url:string;urlFragment?:unknown}
interface ContextView {id?:unknown;uniqueId?:unknown;auxData?:unknown;origin?:unknown}
interface AuxData {isDefault?:unknown;frameId?:unknown}
interface AndroidBinding {frameId:string;loaderId:string;url:string;documentURL:string;uniqueContextId:string}
interface Transport extends Pick<cdp.Client,'send'|'evaluate'|'close'> {isOpen?():boolean}
interface ChromeReader extends execution.BoundClient {open():Promise<unknown>;close():void;capture:Capture}
declare namespace execution {
 interface Options {host?:unknown;package?:string;targetId?:unknown;gameplay?:boolean;chromeRecord?:{target:targets.Chrome};[key:string]:unknown}
 interface CommandSettings {timeout?:number;signal?:AbortSignal;[key:string]:unknown}
 interface Settings {timeoutMs?:number;started?:number;captureEvents?:boolean;connectTimeoutMs?:number}
 interface Adb {(...args:string[]):Promise<Buffer>;execute?:(args:string[],settings?:CommandSettings)=>Promise<Buffer>}
 interface BoundClient {assertBound():Promise<void>;evaluate(expression:string):Promise<unknown>;send(method:string,params?:Record<string,unknown>,settings?:unknown):Promise<unknown>}
 interface CleanupResult {status:'completed'|'failed';resource?:string;reason?:string}
 interface Context {options:Options;adb:Adb;cleanup:(()=>unknown)[];cleanupAdb(...args:string[]):Promise<unknown>;assertActive():void;markSideEffect():void;resetSideEffect():void;readonly actionDispatched:boolean;readonly timedOut:boolean;pause(ms:number):Promise<void>;closeTransport():Promise<void>;ensureWebview():Promise<BoundClient>;finish():Promise<CleanupResult[]>;client?:BoundClient;appPid?:string;endpoint?:string;capture?:Capture;channels?:Record<string,'available'|'unsupported'>;assertForeground?:()=>Promise<void>;[key:string]:unknown}
 interface Overrides {adb?:Adb;connect?:(endpoint:string|URL,timeout:number,event:cdp.OnEvent,targetId?:unknown)=>Promise<Transport>;chromeHostFactory?:(target:targets.Chrome)=>ChromeReader;[key:string]:unknown}
}
const collectors:{android(options:execution.Options):execution.Adb;forward(ctx:execution.Context):Promise<unknown>;removeForward(ctx:execution.Context):Promise<unknown>;events():Capture}=require('./collectors.cjs');
const {connect}:typeof import('./cdp.cjs')=require('./cdp.cjs');

async function documentURL(frame:Pick<Frame,'url'|'urlFragment'>,transport:Pick<cdp.Client,'send'>):Promise<string> {
  const unavailable = () => Object.assign(Error('Android document URL unavailable'),{code:'ANDROID_DOCUMENT_URL_UNAVAILABLE'});
  const url = frame.url, hash = url.indexOf('#');
  if (Object.hasOwn(frame,'urlFragment')) {
    const fragment = frame.urlFragment;
    if (typeof fragment !== 'string' || fragment !== '' && !fragment.startsWith('#') ||
        hash >= 0 && url.slice(hash) !== fragment) throw unavailable();
    return hash >= 0 ? url : url + fragment;
  }
  if (hash >= 0) return url; // Older peers may report the complete URL in this field.
  // Missing optional metadata is not proof of an empty fragment. Read browser-owned
  // history, not page JS, and correlate its current entry with this main-frame URL.
  let history:unknown;
  try { history = await transport.send('Page.getNavigationHistory'); }
  catch (error) { if ((error as {code?:unknown}|null|undefined)?.code === 'CDP_COMMAND_REJECTED') throw unavailable(); throw error; }
  const value=history as {currentIndex?:unknown;entries?:unknown}|null|undefined;
  const index = value?.currentIndex;
  if (!Array.isArray(value?.entries) || !Number.isSafeInteger(index) || (index as number) < 0 || (index as number) >= value.entries.length) throw unavailable();
  const full = (value.entries[index as number] as {url?:unknown}|undefined|null)?.url;
  if (typeof full !== 'string' || !full || full.split('#',1)[0] !== url) throw unavailable();
  return full;
}

function create(options:execution.Options, overrides:execution.Overrides = {}, settings:execution.Settings = {}):execution.Context {
  const baseAdb = overrides.adb || collectors.android(options);
  const controller = new AbortController();
  const deadline = settings.timeoutMs === undefined ? Infinity : (settings.started ?? Date.now()) + settings.timeoutMs;
  let client:Transport|ChromeReader|undefined, forwardAllocationUncertain = false, actionDispatched = false, finished = false;
  const cleanup:(()=>unknown)[] = [];
  const assertActive = () => {
    if (controller.signal.aborted || Date.now() >= deadline) throw Object.assign(Error('Journey deadline'), { code: 'ETIMEDOUT' });
  };
  const timer = Number.isFinite(deadline) ? setTimeout(() => { controller.abort(); try { client?.close(); } catch {} }, Math.max(1, deadline - Date.now())) : null;
  const execute = async (args:string[], settings:execution.CommandSettings = {}) => {
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
  const adb:execution.Adb = (...args:string[]) => execute(args);
  adb.execute = execute;
  const ctx:execution.Context = {
    options, adb, cleanup,
    cleanupAdb: (...args:string[]) => baseAdb.execute ? baseAdb.execute(args, { timeout: 3000 }) : baseAdb(...args),
    assertActive,
    markSideEffect() { assertActive(); actionDispatched = true; },
    resetSideEffect() { actionDispatched = false; },
    get actionDispatched() { return actionDispatched; },
    get timedOut() { return controller.signal.aborted; },
    async pause(ms:number) {
      assertActive();
      await new Promise<void>((resolve, reject) => {
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
      if (client) { await ctx.client!.assertBound(); return ctx.client!; }
      const pid = (await adb('shell', 'pidof', options.package!)).toString().trim();
      if (!/^\d+$/.test(pid)) throw Error('App identity unavailable');
      await ctx.closeTransport(); assertActive();
      ctx.appPid = pid;
      await collectors.forward(ctx);
      forwardAllocationUncertain = false;
      assertActive();
      const capture = settings.captureEvents ? collectors.events() : null;
      const contexts=new Map<unknown,ContextView>();let binding:Readonly<AndroidBinding>|undefined,invalid:string|undefined;
      const reject = (code:string):never => { invalid ||= code; throw Object.assign(Error(invalid), { code: invalid }); };
      const onEvent:cdp.OnEvent = (method, raw) => {
        const params=raw as Record<string,unknown>;
        if (method === 'Runtime.executionContextCreated') contexts.set((params.context as ContextView).id, params.context as ContextView);
        if (method === 'Runtime.executionContextDestroyed') {
          if (binding && contexts.get(params.executionContextId)?.uniqueId === binding!.uniqueContextId) invalid = 'ANDROID_DOCUMENT_CHANGED';
          contexts.delete(params.executionContextId);
        }
        if (method === 'Runtime.executionContextsCleared') { contexts.clear(); if (binding) invalid = 'ANDROID_DOCUMENT_CHANGED'; }
        if (method === 'Page.navigatedWithinDocument' && binding && params.frameId === binding!.frameId) invalid = 'ANDROID_DOCUMENT_CHANGED';
        capture?.onEvent(method, params);
      };
      try {
        client = await (overrides.connect || connect)(ctx.endpoint!, Math.min(settings.connectTimeoutMs ?? 15000, Math.max(1, deadline - Date.now())), onEvent, options.targetId || null);
        const transport = client as Transport;
        // Never use the default realm after binding; old holders cannot follow a reload.
        await transport.send('Page.enable'); await transport.send('Runtime.enable'); assertActive();
        const frame = (await transport.send('Page.getFrameTree') as {frameTree?:{frame?:Frame}}).frameTree?.frame;
        const defaults = [...contexts.values()].filter(c => (c.auxData as AuxData|undefined|null)?.isDefault === true && (c.auxData as AuxData).frameId === frame?.id && typeof c.uniqueId === 'string' && c.uniqueId);
        if (!frame || !['id', 'loaderId', 'url'].every(k => typeof (frame as unknown as Record<string,unknown>)[k] === 'string' && (frame as unknown as Record<string,unknown>)[k]) || defaults.length !== 1) throw Error('Android default document unavailable');
        binding = Object.freeze({ frameId: frame.id, loaderId: frame.loaderId, url: frame.url,
          documentURL: await documentURL(frame,transport), uniqueContextId: defaults[0].uniqueId as string });
        const bound:execution.BoundClient = {
          async assertBound() {
            assertActive();
            if (client !== transport || ctx.client !== bound) throw Object.assign(Error('Android transport binding closed'), { code: 'ANDROID_BINDING_CLOSED' });
            if (invalid) reject(invalid);
            if (transport.isOpen && !transport.isOpen()) reject('CDP_CONNECTION_CLOSED');
            if ((await adb('shell', 'pidof', options.package!)).toString().trim() !== pid) reject('ANDROID_TARGET_CHANGED');
            const current = (await transport.send('Page.getFrameTree') as {frameTree?:{frame?:Frame}}).frameTree?.frame;
            if (invalid || !current || current.id !== binding!.frameId || current.loaderId !== binding!.loaderId || current.url !== binding!.url) return reject('ANDROID_DOCUMENT_CHANGED');
            let fullURL;
            try { fullURL = await documentURL(current,transport); }
            catch (error) { if ((error as {code?:unknown}|null|undefined)?.code === 'ANDROID_DOCUMENT_URL_UNAVAILABLE') reject('ANDROID_DOCUMENT_URL_UNAVAILABLE'); throw error; }
            if (invalid || fullURL !== binding!.documentURL || ![...contexts.values()].some(c => c.uniqueId === binding!.uniqueContextId && (c.auxData as AuxData|undefined|null)?.isDefault === true && (c.auxData as AuxData).frameId === binding!.frameId)) reject('ANDROID_DOCUMENT_CHANGED');
            assertActive();
          },
          async evaluate(expression:string) {
            const result = await bound.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }) as {exceptionDetails?:unknown;result?:{value?:unknown}}|null|undefined;
            if (result?.exceptionDetails) throw Error(JSON.stringify(result.exceptionDetails));
            return result?.result?.value;
          },
          async send(method:string, params:Record<string,unknown> = {}, settings?:unknown) {
            if (method === 'Runtime.evaluate') {
              if (params.contextId !== undefined || params.uniqueContextId !== undefined && params.uniqueContextId !== binding!.uniqueContextId) throw Error('Wrong Android context');
              params = { ...params, uniqueContextId: binding!.uniqueContextId };
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
      return ctx.client!;
    },
    async finish() {
      if (finished) return [];
      finished = true;
      if (timer) clearTimeout(timer);
      controller.abort();
      const results:execution.CleanupResult[] = [];
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
  if (options.host === 'chrome') {
    options={...options,chromeRecord:(require('./host-options.cjs') as {chrome(options:execution.Options,settings:{gameplay:boolean}):{target:targets.Chrome}}).chrome(options,{gameplay:options.gameplay===true})};ctx.options=options;
    let opened = false;
    ctx.assertForeground = async () => { assertActive(); if (client) await (client as ChromeReader).assertBound(); assertActive(); };
    ctx.ensureWebview = async () => {
      assertActive();
      if (client) { await (client as ChromeReader).assertBound(); assertActive(); return client as ChromeReader; }
      if (opened) throw Object.assign(Error('Chrome transport closed; no automatic reconnect'),{code:'PC_DOCUMENT_CHANGED'});
      opened = true;
      ctx.cdpCaptureStart = new Date().toISOString();
      const chrome = overrides.chromeHostFactory ? overrides.chromeHostFactory(options.chromeRecord!.target) : new (require('./chrome-host.cjs') as typeof import('./chrome-host.cjs')).ChromeHost(options.chromeRecord!.target,{assertActive,timeoutMs:Math.max(1,Math.min(5000,deadline-Date.now()))});
      client=chrome;
      try {
        await chrome.open(); assertActive();
        ctx.client = chrome; ctx.capture = chrome.capture; ctx.channels = {Runtime:'available',Network:'available'};
        return chrome;
      } catch (error) { client?.close(); client = undefined; throw error; }
    };
    ctx.closeTransport = async () => { client?.close(); client = undefined; ctx.client = undefined; };
  }
  return ctx;
}

const execution={create,documentURL};
export = execution;
