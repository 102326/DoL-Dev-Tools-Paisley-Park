const { test } = require('node:test');
const assert = require('node:assert/strict');
const { create } = require('../scripts/lib/execution-context.cjs');

function fixture() {
  let pid = '123', nextPort = 55555;
  let frame = { id: 'target', loaderId: 'loader', url: 'https://test.invalid/' };
  let historyURL = frame.url;
  let context = { id: 1, uniqueId: 'context-1', auxData: { isDefault: true, frameId: 'target' } };
  const mappings = new Map([['60000', 'localabstract:unrelated']]);
  const removed = [], clients = [];
  const adb = async (...args) => {
    const command = args.join(' ');
    if (command === 'shell pidof com.example.game') return Buffer.from(pid);
    if (command === 'shell cat /proc/net/unix') return Buffer.from(`@webview_devtools_remote_${pid}`);
    if (args[0] === 'forward' && args[1] === 'tcp:0') {
      const port = String(nextPort++);
      mappings.set(port, args[2]);
      return Buffer.from(port);
    }
    if (command === 'forward --list') return Buffer.from([...mappings].map(([port, remote]) => `offline-device tcp:${port} ${remote}`).join('\n'));
    if (args[0] === 'forward' && args[1] === '--remove') {
      const port = args[2].slice(4);
      removed.push(port); mappings.delete(port);
      return Buffer.alloc(0);
    }
    throw Error(`Unexpected ADB command: ${command}`);
  };
  const connect = async (_endpoint, _timeout, onEvent) => {
    const client = { calls: [], onEvent, closed: false, close() { this.closed = true; }, isOpen() { return !this.closed; },
      async evaluate() { return 1; },
      async send(method, params, settings) {
        this.calls.push({ method, params, settings });
        if (this.closed) throw Error('CDP_CONNECTION_CLOSED');
        if (method === 'Runtime.enable') onEvent('Runtime.executionContextCreated', { context });
        if (method === 'Page.getFrameTree') return { frameTree: { frame: { ...frame } } };
        if (method === 'Page.getNavigationHistory') return {currentIndex:0,entries:[{id:1,url:historyURL}]};
        if (method === 'Runtime.evaluate') {
          if (params.uniqueContextId && params.uniqueContextId !== context.uniqueId) throw Error('old unique context');
          return { result: { value: 1 } };
        }
        return { result: { value: 1 } };
      },
    };
    clients.push(client);
    return client;
  };
  const ctx = create({ serial: 'offline-device', package: 'com.example.game' }, { adb, connect });
  return { ctx, mappings, removed, clients, setPid(value) { pid = value; },
    setFrame(patch) { Object.assign(frame,patch); },
    removeFragment() { delete frame.urlFragment; },
    setHistoryURL(value) { historyURL = value; },
    changeDocument(patch = {}) {
      frame = { ...frame, loaderId: 'new-loader', ...patch };
      context = { ...context, id: 2, uniqueId: 'context-2' };
      for (const c of clients) {
        c.onEvent('Runtime.executionContextsCleared', {});
        c.onEvent('Runtime.executionContextCreated', { context });
      }
    },
  };
}

test('reported fragment changes reject old holders without events and cannot revive after returning',async()=>{
  const f=fixture();f.setFrame({urlFragment:'#one'});
  try{
    const held=await f.ctx.ensureWebview(),raw=f.clients[0];
    assert.equal(await held.evaluate('1'),1);
    f.setFrame({urlFragment:'#two'});const before=raw.calls.filter(c=>c.method==='Runtime.evaluate').length;
    await assert.rejects(held.evaluate('1'),e=>e.code==='ANDROID_DOCUMENT_CHANGED');
    f.setFrame({urlFragment:'#one'});
    await assert.rejects(held.evaluate('1'),e=>e.code==='ANDROID_DOCUMENT_CHANGED');
    assert.equal(raw.calls.filter(c=>c.method==='Runtime.evaluate').length,before);
    await assert.rejects(f.ctx.ensureWebview());assert.equal(f.clients.length,1);
    await f.ctx.closeTransport();const fresh=await f.ctx.ensureWebview();assert.equal(await fresh.evaluate('1'),1);
    await assert.rejects(held.evaluate('1'),e=>e.code==='ANDROID_BINDING_CLOSED');
  }finally{await f.ctx.finish()}
});

test('missing optional fragment uses native history, not an assumed empty fragment',async()=>{
  const f=fixture();f.setHistoryURL('https://test.invalid/#one');
  try{
    const held=await f.ctx.ensureWebview(),raw=f.clients[0];assert.equal(await held.evaluate('1'),1);
    assert(raw.calls.some(c=>c.method==='Page.getNavigationHistory'));
    f.setHistoryURL('https://test.invalid/#two');const before=raw.calls.filter(c=>c.method==='Runtime.evaluate').length;
    await assert.rejects(held.evaluate('1'),e=>e.code==='ANDROID_DOCUMENT_CHANGED');
    assert.equal(raw.calls.filter(c=>c.method==='Runtime.evaluate').length,before);
  }finally{await f.ctx.finish()}
});

test('optional metadata may appear or disappear only when independent full URL proof stays equal',async()=>{
  const f=fixture();f.setHistoryURL('https://test.invalid/#one');
  try{
    const held=await f.ctx.ensureWebview();f.setFrame({urlFragment:'#one'});assert.equal(await held.evaluate('1'),1);
    f.removeFragment();assert.equal(await held.evaluate('1'),1);
    f.setFrame({urlFragment:''});await assert.rejects(held.evaluate('1'),e=>e.code==='ANDROID_DOCUMENT_CHANGED');
  }finally{await f.ctx.finish()}
});

test('loss of usable URL proof makes the holder persistently invalid without exposing history',async()=>{
  const f=fixture();
  try{
    const held=await f.ctx.ensureWebview(),raw=f.clients[0],send=raw.send;
    raw.send=async function(method,...args){if(method==='Page.getNavigationHistory')return {currentIndex:0,entries:[{url:'https://PRIVATE.invalid/#SECRET'}]};return send.call(this,method,...args)};
    await assert.rejects(held.evaluate('1'),e=>e.code==='ANDROID_DOCUMENT_URL_UNAVAILABLE'&&!e.message.includes('PRIVATE')&&!e.message.includes('SECRET')&&e.notDispatched!==true);
    raw.send=send;await assert.rejects(held.evaluate('1'),e=>e.code==='ANDROID_DOCUMENT_URL_UNAVAILABLE');
  }finally{await f.ctx.finish()}
});

test('legacy full URL is retained exactly; malformed or contradictory fragments fail closed',async()=>{
  const good=fixture();good.setFrame({url:'https://test.invalid/#legacy'});
  try{assert.equal(await(await good.ctx.ensureWebview()).evaluate('1'),1)}finally{await good.ctx.finish()}
  for(const patch of [{urlFragment:undefined},{urlFragment:null},{urlFragment:1},{urlFragment:'no-hash'},
    {url:'https://test.invalid/#one',urlFragment:'#two'}]){
    const f=fixture();f.setFrame(patch);
    try{
      await assert.rejects(f.ctx.ensureWebview(),e=>e.code==='ANDROID_DOCUMENT_URL_UNAVAILABLE');
      assert.equal(f.clients[0].closed,true);assert.equal(f.mappings.has('60000'),true);
      assert(!f.clients[0].calls.some(c=>c.method==='Runtime.evaluate'));
    }finally{await f.ctx.finish()}
  }
});

test('missing fragment with unavailable or inconsistent native history never weakens binding',async()=>{
  for(const mode of ['unsupported','invalid-index','wrong-base','timeout']){
    const f=fixture(),baseConnect=async(_endpoint,_timeout,onEvent)=>{
      const raw={closed:false,close(){this.closed=true},isOpen(){return !this.closed},async send(method){
        if(method==='Runtime.enable')onEvent('Runtime.executionContextCreated',{context:{id:1,uniqueId:'owned-context',auxData:{isDefault:true,frameId:'owned'}}});
        if(method==='Page.getFrameTree')return {frameTree:{frame:{id:'owned',loaderId:'owned-loader',url:'https://test.invalid/'}}};
        if(method==='Page.getNavigationHistory'){
          if(mode==='unsupported')throw Object.assign(Error('PRIVATE_PROTOCOL'),{code:'CDP_COMMAND_REJECTED'});
          if(mode==='timeout')throw Object.assign(Error('PRIVATE_TIMEOUT'),{code:'ETIMEDOUT'});
          return {currentIndex:mode==='invalid-index'?2:0,entries:[{url:'https://other.invalid/#x'}]};
        }
        return {};
      }};f.clients.push(raw);return raw;
    };
    const ctx=create(f.ctx.options,{adb:f.ctx.adb,connect:baseConnect});
    try{await assert.rejects(ctx.ensureWebview(),e=>mode==='timeout'?e.code==='ETIMEDOUT':e.code==='ANDROID_DOCUMENT_URL_UNAVAILABLE'&&!e.message.includes('PRIVATE'));assert.equal(f.clients[0].closed,true);assert.equal(f.mappings.has('60000'),true)}
    finally{await ctx.finish();await f.ctx.finish()}
  }
});

test('same-document event permanently invalidates the main-frame holder, including URL ABA',async()=>{
  const f=fixture();f.setFrame({urlFragment:''});
  try{
    const held=await f.ctx.ensureWebview(),raw=f.clients[0];
    raw.onEvent('Page.navigatedWithinDocument',{frameId:'unrelated',url:'https://other.invalid/'});
    assert.equal(await held.evaluate('1'),1);
    raw.onEvent('Page.navigatedWithinDocument',{frameId:'target',url:'https://test.invalid/#temporary',navigationType:'fragment'});
    raw.onEvent('Page.navigatedWithinDocument',{frameId:'target',url:'https://test.invalid/',navigationType:'historyApi'});
    const before=raw.calls.length;await assert.rejects(held.evaluate('1'),e=>e.code==='ANDROID_DOCUMENT_CHANGED');
    await assert.rejects(f.ctx.ensureWebview());assert.equal(raw.calls.length,before);assert.equal(f.clients.length,1);
  }finally{await f.ctx.finish()}
});

test('same-document navigation during a remote call preserves uncertainty, never zero-effect authority',async()=>{
  const f=fixture();f.setFrame({urlFragment:''});
  try{
    const held=await f.ctx.ensureWebview(),raw=f.clients[0],send=raw.send;
    raw.send=async function(method,...args){
      if(method==='Runtime.evaluate')raw.onEvent('Page.navigatedWithinDocument',{frameId:'target',url:'https://test.invalid/#during-call',navigationType:'fragment'});
      return send.call(this,method,...args);
    };
    f.ctx.markSideEffect();
    await assert.rejects(held.evaluate('1'),e=>e.code==='ANDROID_DOCUMENT_CHANGED'&&e.notDispatched!==true);
    assert.equal(f.ctx.actionDispatched,true);
    assert.equal(raw.calls.filter(c=>c.method==='Runtime.evaluate').length,1);
  }finally{await f.ctx.finish()}
});

test('PID change refuses old holders; explicit close establishes a new binding and owns only its forwards', async () => {
  const f = fixture();
  const old = await f.ctx.ensureWebview();
  assert.equal(f.ctx.forwardPort, '55555');
  f.setPid('456');
  await assert.rejects(old.evaluate('1'), /target|process/i);
  await assert.rejects(f.ctx.ensureWebview(), /target|process/i);
  assert.equal(f.clients.length, 1);
  await f.ctx.closeTransport();
  await f.ctx.ensureWebview();
  await assert.rejects(old.evaluate('1'), /binding|transport/i);
  assert.equal(f.clients[0].closed, true);
  assert.equal(f.clients[1].closed, false);
  assert.deepEqual(f.removed, ['55555']);
  assert.equal(f.mappings.has('60000'), true);
  assert.equal(f.ctx.forwardPort, '55556');
  assert.deepEqual(await f.ctx.finish(), [{ status: 'completed', resource: 'own CDP transport' }]);
  assert.deepEqual(await f.ctx.finish(), []);
  assert.deepEqual(f.removed, ['55555', '55556']);
  assert.equal(f.clients[1].closed, true);
  assert.deepEqual([...f.mappings.keys()], ['60000']);
});

test('same document works; every evaluation uses its immutable unique context', async () => {
  const f = fixture();
  try {
    const c = await f.ctx.ensureWebview();
    assert.equal(await c.evaluate('1'), 1);
    await c.send('Runtime.evaluate', { expression: '1' });
    await c.send('Runtime.callFunctionOn', { objectId: 'old-object', functionDeclaration: 'function(){return 1}' });
    await c.send('Runtime.getProperties', { objectId: 'old-object', ownProperties: true }, { maxResponseBytes: 8 * 1024 * 1024 });
    assert.equal(await f.ctx.ensureWebview(), c);
    assert.ok(f.clients[0].calls.filter(c => c.method === 'Runtime.evaluate').every(c => c.params.uniqueContextId === 'context-1'));
    assert.equal(f.clients[0].calls.find(c => c.method === 'Runtime.getProperties').settings.maxResponseBytes, 8 * 1024 * 1024);
  } finally { await f.ctx.finish(); }
});

test('frame/loader/URL changes reject even without lifecycle events; context destruction alone also rejects', async () => {
  for (const patch of [{ id: 'replacement-target' }, { loaderId: 'replacement-loader' }, { url: 'https://other.invalid/' }, null]) {
    const f = fixture();
    try {
      const c = await f.ctx.ensureWebview(), raw = f.clients[0], send = raw.send;
      if (patch) raw.send = async function(method, ...args) {
        const result = await send.call(this, method, ...args);
        if (method === 'Page.getFrameTree') Object.assign(result.frameTree.frame, patch);
        return result;
      };
      else raw.onEvent('Runtime.executionContextDestroyed', { executionContextId: 1 });
      const before = raw.calls.filter(c => c.method === 'Runtime.evaluate').length;
      await assert.rejects(c.evaluate('1'), /document/i);
      assert.equal(raw.calls.filter(c => c.method === 'Runtime.evaluate').length, before);
    } finally { await f.ctx.finish(); }
  }
});

test('navigation between identity check and evaluation never switches to the new default context', async () => {
  const f = fixture();
  try {
    const c = await f.ctx.ensureWebview(), raw = f.clients[0], send = raw.send;
    raw.send = async function(method, ...args) {
      if (method === 'Runtime.evaluate') f.changeDocument();
      return send.call(this, method, ...args);
    };
    await assert.rejects(c.evaluate('1'), /old unique context/);
    assert.equal(raw.calls.at(-1).params.uniqueContextId, 'context-1');
    await assert.rejects(c.evaluate('1'), /document/i);
  } finally { await f.ctx.finish(); }
});

test('missing default context fails initial binding and cleans its own forward', async () => {
  const f = fixture();
  const connect = async (_e, _t, _event) => {
    const raw = { close() { this.closed = true; }, async send(method) {
      return method === 'Page.getFrameTree' ? { frameTree: { frame: { id: 't', loaderId: 'l', url: 'https://test.invalid/' } } } : {};
    } };
    f.clients.push(raw); return raw;
  };
  // Use the fixture ADB ownership model with an intentionally incomplete CDP peer.
  const ctx = create(f.ctx.options, { adb: f.ctx.adb, connect });
  try {
    await assert.rejects(ctx.ensureWebview(), /default document unavailable/);
    assert.equal(f.clients[0].closed, true);
    assert.equal(f.mappings.has('55555'), false);
    assert.equal(f.mappings.has('60000'), true);
  } finally { await ctx.finish(); await f.ctx.finish(); }
});

test('same PID target and URL reload rejects held evaluate, send, old context and old object without remote execution', async () => {
  const f = fixture();
  try {
    const c = await f.ctx.ensureWebview();
    f.changeDocument();
    const count = f.clients[0].calls.length;
    for (const call of [() => c.evaluate('1'), () => c.send('Runtime.evaluate', { expression: '1', uniqueContextId: 'context-1' }),
      () => c.send('Runtime.callFunctionOn', { objectId: 'old-object' }), () => c.send('Runtime.getProperties', { objectId: 'old-object' }), () => f.ctx.ensureWebview()]) {
      await assert.rejects(call(), /document/i);
    }
    assert.equal(f.clients[0].calls.length, count);
    await f.ctx.closeTransport();
    const fresh = await f.ctx.ensureWebview();
    assert.equal(await fresh.evaluate('1'), 1);
    assert.equal(f.clients[1].calls.find(c => c.method === 'Runtime.evaluate').params.uniqueContextId, 'context-2');
    await assert.rejects(c.evaluate('1'), /binding|transport/i);
  } finally { await f.ctx.finish(); }
});

test('closed transport cannot silently reconnect; explicit close is required', async () => {
  const f = fixture();
  try {
    const c = await f.ctx.ensureWebview(); f.clients[0].close();
    await assert.rejects(c.evaluate('1'), /disconnect|closed/i);
    await assert.rejects(f.ctx.ensureWebview(), /disconnect|closed/i);
    assert.equal(f.clients.length, 1);
    await f.ctx.closeTransport();
    assert.equal(await (await f.ctx.ensureWebview()).evaluate('1'), 1);
  } finally { await f.ctx.finish(); }
});

test('alternate context and unbound callFunctionOn cannot bypass document binding', async () => {
  const f = fixture();
  try {
    const c = await f.ctx.ensureWebview(), count = f.clients[0].calls.length;
    for (const params of [{ contextId: 1 }, { uniqueContextId: 'other' }]) {
      await assert.rejects(c.send('Runtime.evaluate', { expression: '1', ...params }), /context/i);
    }
    await assert.rejects(c.send('Runtime.callFunctionOn', { functionDeclaration: 'function(){return 1}', executionContextId: 2 }), /object|context/i);
    assert.equal(f.clients[0].calls.length, count);
  } finally { await f.ctx.finish(); }
});

test('changed forward ownership is reported and the external mapping is left alone', async () => {
  const f = fixture();
  await f.ctx.ensureWebview();
  f.mappings.set('55555', 'localabstract:another_process');
  assert.deepEqual(await f.ctx.finish(), [{ status: 'failed', resource: 'own CDP transport' }]);
  assert.deepEqual(await f.ctx.finish(), []);
  assert.deepEqual(f.removed, []);
  assert.equal(f.mappings.get('55555'), 'localabstract:another_process');
  assert.equal(f.mappings.get('60000'), 'localabstract:unrelated');
});
