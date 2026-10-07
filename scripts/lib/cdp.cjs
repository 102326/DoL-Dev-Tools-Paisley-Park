// Shared local CDP transport; target selection stays explicit and unambiguous.
const DEFAULT_MAX_RESPONSE_BYTES=4*1024*1024,PROPERTIES_MAX_RESPONSE_BYTES=16*1024*1024,ABSOLUTE_MAX_RESPONSE_BYTES=64*1024*1024;
async function targets(endpoint, timeoutMs = 10000) {
  const url = new URL(endpoint);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:' || url.username || url.password) {
    throw new Error('CDP endpoint must be a local HTTP address');
  }
  const response = await fetch(new URL('/json/list', url), { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
  if (!response.ok) throw new Error(`CDP target listing failed: ${response.status}`);
  const list = await response.json();
  if (!Array.isArray(list) || list.length > 100 || Buffer.byteLength(JSON.stringify(list)) > 65536) throw new Error('Invalid CDP target inventory');
  return list;
}
async function connect(endpoint, timeoutMs = 10000, onEvent = () => {}, targetId = null) {
  if (targetId !== null && (typeof targetId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(targetId))) throw new Error('Invalid CDP target ID');
  const list = await targets(endpoint, timeoutMs);
  const pages = list.filter(item => item?.type === 'page' && (targetId === null ? item.title === 'Degrees of Lewdity' : item.id === targetId));
  if (pages.length !== 1) throw new Error(`Expected one game page, found ${pages.length}`);
  const socketUrl = new URL(pages[0].webSocketDebuggerUrl);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(socketUrl.hostname) || socketUrl.protocol !== 'ws:' || socketUrl.username || socketUrl.password) {
    throw new Error('CDP WebSocket must be local');
  }
  const socket = new WebSocket(socketUrl);
  let nextId = 0, closed = false;
  const pending = new Map();
  function codedError(code, protocolCode) {
    const error = new Error(code);
    error.code = code;
    if (Number.isFinite(protocolCode)) error.protocolCode = protocolCode;
    return error;
  }
  function responseLimit(method,options){
    if(options===undefined)return DEFAULT_MAX_RESPONSE_BYTES;
    if(!options||typeof options!=='object'||Array.isArray(options)||Reflect.ownKeys(options).length!==1||!Object.hasOwn(options,'maxResponseBytes'))throw codedError('CDP_INVALID_RESPONSE_LIMIT');
    const limit=options.maxResponseBytes;
    if(!Number.isSafeInteger(limit)||limit<1||limit>ABSOLUTE_MAX_RESPONSE_BYTES||
      limit>DEFAULT_MAX_RESPONSE_BYTES&&method!=='DOM.getDetachedDomNodes'&&!(method==='Runtime.getProperties'&&limit<=PROPERTIES_MAX_RESPONSE_BYTES))throw codedError('CDP_INVALID_RESPONSE_LIMIT');
    return limit;
  }
  function close(reason = codedError('CDP_CONNECTION_CLOSED')) {
    if (closed) return;
    closed = true;
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(reason); }
    pending.clear(); socket.close();
  }
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP connection timeout')), timeoutMs);
      socket.onopen = () => { clearTimeout(timer); resolve(); };
      socket.onerror = () => { clearTimeout(timer); reject(codedError('CDP_CONNECTION_CLOSED')); };
      socket.onclose = () => { clearTimeout(timer); reject(codedError('CDP_CONNECTION_CLOSED')); };
    });
  } catch (error) { close(); throw error; }
  socket.onerror = () => close();
  socket.onclose = () => close();
  socket.onmessage = event => {
    if (typeof event.data !== 'string') return close(codedError('CDP_INVALID_RESPONSE'));
    const responseBytes=Buffer.byteLength(event.data,'utf8');
    const absolutePendingLimit=Math.max(DEFAULT_MAX_RESPONSE_BYTES,...Array.from(pending.values(),item=>item.maxResponseBytes));
    if (responseBytes > absolutePendingLimit) return close(codedError('CDP_RESPONSE_TOO_LARGE'));
    let message;
    try {
      message = JSON.parse(event.data);
    } catch { return close(codedError('CDP_INVALID_RESPONSE')); }
    if (!message || typeof message !== 'object' || Array.isArray(message)) return close(codedError('CDP_INVALID_RESPONSE'));
    if (message.id === undefined) {
      if(responseBytes>DEFAULT_MAX_RESPONSE_BYTES)return close(codedError('CDP_RESPONSE_TOO_LARGE'));
      if (typeof message.method !== 'string') return close(codedError('CDP_INVALID_RESPONSE'));
      try { onEvent(message.method, message.params); } catch { close(); }
      return;
    }
    if (!Number.isSafeInteger(message.id) || message.id < 1) return close(codedError('CDP_INVALID_RESPONSE'));
    const item = pending.get(message.id);
    if(responseBytes>(item?.maxResponseBytes??DEFAULT_MAX_RESPONSE_BYTES))return close(codedError('CDP_RESPONSE_TOO_LARGE'));
    if (!item) return;
    if (!message.error && !Object.hasOwn(message, 'result')) return close(codedError('CDP_INVALID_RESPONSE'));
    pending.delete(message.id); clearTimeout(item.timer);
    if (message.error) item.reject(codedError('CDP_COMMAND_REJECTED', message.error.code));
    else item.resolve(message.result);
  };
  function send(method, params = {}, options) {
    let maxResponseBytes;
    try{maxResponseBytes=responseLimit(method,options)}catch(error){return Promise.reject(error)}
    if (closed) return Promise.reject(codedError('CDP_CONNECTION_CLOSED'));
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(Object.assign(new Error('CDP evaluation timeout'), { code: 'ETIMEDOUT' })); }, timeoutMs);
      pending.set(id, { resolve, reject, timer, maxResponseBytes });
      try { socket.send(JSON.stringify({ id, method, params })); }
      catch { pending.delete(id); clearTimeout(timer); reject(new Error('CDP send failed')); }
    });
  }
  return { send, close, isOpen: () => !closed, async evaluate(expression) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result?.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result?.result?.value;
  } };
}
module.exports = { connect, targets };
