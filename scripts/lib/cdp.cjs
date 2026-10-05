// Shared local CDP transport; target selection stays explicit and unambiguous.
async function connect(endpoint, timeoutMs = 10000, onEvent = () => {}) {
  const url = new URL(endpoint);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.protocol !== 'http:' || url.username || url.password) {
    throw new Error('CDP endpoint must be a local HTTP address');
  }
  const response = await fetch(new URL('/json/list', url), { signal: AbortSignal.timeout(timeoutMs), redirect: 'error' });
  if (!response.ok) throw new Error(`CDP target listing failed: ${response.status}`);
  const targets = await response.json();
  const pages = targets.filter(item => item.type === 'page' && item.title === 'Degrees of Lewdity');
  if (pages.length !== 1) throw new Error(`Expected one game page, found ${pages.length}`);
  const socketUrl = new URL(pages[0].webSocketDebuggerUrl);
  if (!['127.0.0.1', 'localhost', '[::1]'].includes(socketUrl.hostname) || socketUrl.protocol !== 'ws:' || socketUrl.username || socketUrl.password) {
    throw new Error('CDP WebSocket must be local');
  }
  const socket = new WebSocket(socketUrl);
  let nextId = 0, closed = false;
  const pending = new Map();
  function close() {
    if (closed) return;
    closed = true;
    for (const item of pending.values()) { clearTimeout(item.timer); item.reject(new Error('CDP connection closed before result')); }
    pending.clear(); socket.close();
  }
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP connection timeout')), timeoutMs);
      socket.onopen = () => { clearTimeout(timer); resolve(); };
      socket.onerror = () => { clearTimeout(timer); reject(new Error('CDP connection failed')); };
      socket.onclose = () => { clearTimeout(timer); reject(new Error('CDP connection closed before result')); };
    });
  } catch (error) { close(); throw error; }
  socket.onerror = close;
  socket.onclose = close;
  socket.onmessage = event => {
    try {
      if (typeof event.data !== 'string' || event.data.length > 4 * 1024 * 1024) throw new Error('Oversized CDP response');
      const message = JSON.parse(event.data);
      if (!message.id) { onEvent(message.method, message.params); return; }
      const item = pending.get(message.id);
      if (!item) return;
      pending.delete(message.id); clearTimeout(item.timer);
      if (message.error) item.reject(new Error('CDP command rejected'));
      else item.resolve(message.result);
    } catch { close(); }
  };
  function send(method, params = {}) {
    if (closed) return Promise.reject(new Error('CDP connection closed'));
    return new Promise((resolve, reject) => {
      const id = ++nextId;
      const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP evaluation timeout')); }, timeoutMs);
      pending.set(id, { resolve, reject, timer });
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
module.exports = { connect };
