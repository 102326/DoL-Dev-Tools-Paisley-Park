'use strict';
// Protocol-only fixture; production entry always imports the actual source-finder engine.
require('./protocol.cjs').serve((request, signal) => {
  if (request.fail) throw Object.assign(new Error('private detail'), { code: request.fail, stage: request.stage });
  return new Promise(resolve => {
  const timer = setTimeout(() => resolve({ marker: request.large ? 'x'.repeat(70000) : request.marker }), request.delay || 0);
  signal.addEventListener('abort', () => { if (!request.ignoreAbort) { clearTimeout(timer); resolve({ aborted: true }); } }, { once: true });
});
});
