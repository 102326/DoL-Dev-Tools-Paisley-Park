interface Context {client:{evaluate(expression:string):Promise<unknown>}}
// A minimal, reviewed example. Replace the public read-only probe for your own Mod.
// No text, input values, game state, paths, ADB calls or dependency on Soft & Wet.
const api = {
  contractVersion: 1,
  describe: () => ({ name: 'dom-summary-example', version: '1.0.0', capabilities: ['dom-summary'] }),
  detect: (ctx:Context) => ctx.client.evaluate("document.querySelectorAll('#passages').length === 1 ? 'available' : 'unavailable'"),
  collect: (ctx:Context) => ctx.client.evaluate(`(() => {
    const root = document.querySelector('#passages');
    if (!root) return {status:'unavailable'};
    return {status:'available', childCount:root.children.length, hidden:root.hasAttribute('hidden')};
  })()`),
  redact: (value:unknown) => { /* Property view only; preserve existing runtime checks. */ const result=value as {status:unknown;childCount:number;hidden:unknown}; return ({ status: result.status,
    childCount: Number.isSafeInteger(result.childCount) && result.childCount >= 0 ? result.childCount : null,
    hidden: typeof result.hidden === 'boolean' ? result.hidden : null }); },
};

export = api;
