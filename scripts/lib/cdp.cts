declare namespace cdp {
  type ErrorCode = 'CDP_DISCOVERY_TIMEOUT'|'CDP_CONNECT_TIMEOUT'|'ETIMEDOUT'|'CDP_TARGET_MISSING'|'CDP_TARGET_AMBIGUOUS'|'CDP_CONNECTION_CLOSED'|'CDP_INVALID_RESPONSE_LIMIT'|'CDP_INVALID_RESPONSE'|'CDP_RESPONSE_TOO_LARGE'|'CDP_COMMAND_REJECTED';
  type OnEvent = (method:string, params:unknown)=>void;
  interface Client { send(method:string,params?:unknown,options?:unknown):Promise<unknown>; close(reason?:unknown):void; isOpen():boolean; evaluate(expression:string):Promise<unknown> }
}
// Shared local CDP transport; target selection stays explicit and unambiguous.
const {cdpTimeout}:typeof import('./diagnostics.cjs')=require('./diagnostics.cjs');
const DEFAULT_MAX_RESPONSE_BYTES=4*1024*1024,PROPERTIES_MAX_RESPONSE_BYTES=16*1024*1024,ABSOLUTE_MAX_RESPONSE_BYTES=64*1024*1024;
async function targets(endpoint:string|URL, timeoutMs = 10000):Promise<unknown[]> {
  const url = new URL(endpoint);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:' || url.username || url.password) {
    throw new Error('CDP endpoint must be a local HTTP address');
  }
  try {
    const response = await fetch(new URL('/json/list', url), { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
    if (!response.ok) throw new Error(`CDP target listing failed: ${response.status}`);
    const list = await response.json();
    if (!Array.isArray(list) || list.length > 100 || Buffer.byteLength(JSON.stringify(list)) > 65536) throw new Error('Invalid CDP target inventory');
    return list;
  } catch (error) {
    if ((error as {code?:unknown}|null|undefined)?.code === 'ETIMEDOUT') throw Object.assign(cdpTimeout('cdp.discovery'),{code:'ETIMEDOUT'});
    if ((error as {name?:unknown}|null|undefined)?.name === 'TimeoutError') throw cdpTimeout('cdp.discovery');
    throw error;
  }
}
async function connect(endpoint:string|URL, timeoutMs = 10000, onEvent:cdp.OnEvent = () => {}, targetId:unknown = null):Promise<cdp.Client> {
  if (targetId !== null && (typeof targetId !== 'string' || !/^[A-Za-z0-9._:-]{1,128}$/.test(targetId))) throw new Error('Invalid CDP target ID');
  const list = await targets(endpoint, timeoutMs);
  const pages = (list as ({type?:unknown;title?:unknown;id?:unknown;webSocketDebuggerUrl?:unknown}|null|undefined)[]).filter(item => item?.type === 'page' && (targetId === null ? item.title === 'Degrees of Lewdity' : item.id === targetId));
  if (pages.length !== 1) throw Object.assign(new Error(`Expected one game page, found ${pages.length}`),
    {code:pages.length === 0 ? 'CDP_TARGET_MISSING' : 'CDP_TARGET_AMBIGUOUS'});
  const socketUrl = new URL(pages[0]!.webSocketDebuggerUrl as string);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(socketUrl.hostname) || socketUrl.protocol !== 'ws:' || socketUrl.username || socketUrl.password) {
    throw new Error('CDP WebSocket must be local');
  }
  const socket = new WebSocket(socketUrl);
  let nextId = 0, closed = false;
  const pending = new Map<number,{timer:ReturnType<typeof setTimeout>;resolve:(value:unknown)=>void;reject:(reason:unknown)=>void;maxResponseBytes:number}>();
  function codedError(code:cdp.ErrorCode, protocolCode?:unknown) {
    const error = new Error(code) as Error & {code:cdp.ErrorCode;protocolCode?:number};
    error.code = code;
    if (Number.isFinite(protocolCode)) error.protocolCode = protocolCode as number;
    return error;
  }
  function responseLimit(method:string,options:unknown){
    if(options===undefined)return DEFAULT_MAX_RESPONSE_BYTES;
    if(!options||typeof options!=='object'||Array.isArray(options)||Reflect.ownKeys(options).length!==1||!Object.hasOwn(options,'maxResponseBytes'))throw codedError('CDP_INVALID_RESPONSE_LIMIT');
    const limit=(options as {maxResponseBytes:unknown}).maxResponseBytes as number;
    if(!Number.isSafeInteger(limit)||limit<1||limit>ABSOLUTE_MAX_RESPONSE_BYTES||
      limit>DEFAULT_MAX_RESPONSE_BYTES&&method!=='DOM.getDetachedDomNodes'&&!(method==='Runtime.getProperties'&&limit<=PROPERTIES_MAX_RESPONSE_BYTES))throw codedError('CDP_INVALID_RESPONSE_LIMIT');
    return limit;
  }
  function close(reason:unknown = codedError('CDP_CONNECTION_CLOSED')) {
    if (closed) return;
    closed = true;
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(reason); }
    pending.clear(); socket.close();
  }
  try {
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(cdpTimeout('cdp.connect')), timeoutMs);
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
    let message:unknown;
    try {
      message = JSON.parse(event.data);
    } catch { return close(codedError('CDP_INVALID_RESPONSE')); }
    if (!message || typeof message !== 'object' || Array.isArray(message)) return close(codedError('CDP_INVALID_RESPONSE'));
    const packet=message as Record<string,unknown>;
    if (packet.id === undefined) {
      if(responseBytes>DEFAULT_MAX_RESPONSE_BYTES)return close(codedError('CDP_RESPONSE_TOO_LARGE'));
      if (typeof packet.method !== 'string') return close(codedError('CDP_INVALID_RESPONSE'));
      try { onEvent(packet.method, packet.params); } catch { close(); }
      return;
    }
    if (!Number.isSafeInteger(packet.id) || (packet.id as number) < 1) return close(codedError('CDP_INVALID_RESPONSE'));
    const item = pending.get(packet.id as number);
    if(responseBytes>(item?.maxResponseBytes??DEFAULT_MAX_RESPONSE_BYTES))return close(codedError('CDP_RESPONSE_TOO_LARGE'));
    if (!item) return;
    if (!packet.error && !Object.hasOwn(message, 'result')) return close(codedError('CDP_INVALID_RESPONSE'));
    pending.delete(packet.id as number); clearTimeout(item.timer);
    if (packet.error) item.reject(codedError('CDP_COMMAND_REJECTED', (packet.error as {code?:unknown}).code));
    else item.resolve(packet.result);
  };
  function send(method:string, params:unknown = {}, options?:unknown):Promise<unknown> {
    let maxResponseBytes:number;
    try{maxResponseBytes=responseLimit(method,options)}catch(error){return Promise.reject(error)}
    if (closed) return Promise.reject(codedError('CDP_CONNECTION_CLOSED'));
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(cdpTimeout('cdp.command',method)); }, timeoutMs);
      pending.set(id, { resolve, reject, timer, maxResponseBytes });
      try { socket.send(JSON.stringify({ id, method, params })); }
      catch { pending.delete(id); clearTimeout(timer); reject(new Error('CDP send failed')); }
    });
  }
  return { send, close, isOpen: () => !closed, async evaluate(expression:string) {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    const value=result as {exceptionDetails?:unknown;result?:{value?:unknown}}|null|undefined;
    if (value?.exceptionDetails) throw new Error(JSON.stringify(value.exceptionDetails));
    return value?.result?.value;
  } };
}
const cdp={connect,targets};
export = cdp;
