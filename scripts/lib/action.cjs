const { createHash } = require('node:crypto');
const { android } = require('./collectors.cjs');

const fields = {
  'web-click': ['selector'], 'web-focus': ['selector'], 'web-input': ['selector', 'value'],
  tap: ['x', 'y'], input: ['value'], back: [], home: [], launch: [], restart: [], wake: [], lock: [], unlock: [], rotate: ['degrees'],
};
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
function sanitized(error, message) {
  const result = new Error(message);
  if (typeof error?.code === 'string' && /^[A-Z0-9_]{1,32}$/.test(error.code)) result.code = error.code;
  else if (Number.isInteger(error?.code)) result.code = error.code;
  if (error?.killed === true) result.killed = true;
  return result;
}

function validate(action) {
  if (!action || typeof action !== 'object' || Array.isArray(action) || !own(action, 'type') || !own(fields, action.type) ||
      Object.keys(action).some(key => key !== 'type' && !fields[action.type].includes(key)) ||
      fields[action.type].some(key => !own(action, key))) throw new Error('Invalid action');
  if (action.type.startsWith('web-') && (typeof action.selector !== 'string' || !action.selector || action.selector.length > 256)) throw new Error('Invalid selector');
  if (action.type === 'web-input' && (typeof action.value !== 'string' || action.value.length > 1024)) throw new Error('Invalid web input');
  if (action.type === 'input' && (typeof action.value !== 'string' || !action.value || action.value.length > 256 || !/^[A-Za-z0-9 .,_@:+-]+$/.test(action.value))) throw new Error('Invalid native input');
  if (action.type === 'tap' && (!Number.isSafeInteger(action.x) || action.x < 0 || !Number.isSafeInteger(action.y) || action.y < 0)) throw new Error('Invalid tap');
  if (action.type === 'rotate' && ![0, 90, 180, 270].includes(action.degrees)) throw new Error('Invalid rotation');
  return action;
}

function summary(action) {
  validate(action);
  const result = { type: action.type };
  if (action.selector !== undefined) result.selectorHash = createHash('sha256').update(action.selector).digest('hex');
  if (action.value !== undefined) result.inputLength = action.value.length;
  if (action.type === 'tap') { result.x = action.x; result.y = action.y; }
  if (action.type === 'rotate') result.degrees = action.degrees;
  return result;
}

function webExpression(action) {
  return `(() => {
    const nodes = document.querySelectorAll(${JSON.stringify(action.selector)});
    if (nodes.length !== 1) return {ok:false};
    const node = nodes[0];
    if (!(node instanceof HTMLElement) || !node.isConnected || node.matches(':disabled') || node.closest('[inert]') ||
        !node.getClientRects().length) return {ok:false};
    const style = getComputedStyle(node);
    if (style.display === 'none' || style.visibility !== 'visible' || style.opacity === '0') return {ok:false};
    if (${JSON.stringify(action.type)} === 'web-input') {
      const input = node instanceof HTMLInputElement, area = node instanceof HTMLTextAreaElement;
      if (!input && !area) return {ok:false};
      if (node.readOnly || (input && ['password','file','hidden','button','submit','radio','checkbox'].includes(node.type))) return {ok:false};
      const setter = Object.getOwnPropertyDescriptor(input ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype, 'value').set;
      setter.call(node, ${JSON.stringify(action.value || '')});
      node.dispatchEvent(new Event('input', {bubbles:true}));
      node.dispatchEvent(new Event('change', {bubbles:true}));
    } else if (${JSON.stringify(action.type)} === 'web-click') node.click();
    else { node.focus(); if (document.activeElement !== node) return {ok:false}; }
    return {ok:true};
  })()`;
}

async function execute(ctx, action) {
  validate(action);
  const options = ctx?.options;
  if (!options || typeof options.serial !== 'string' || !options.serial ||
      typeof options.package !== 'string' || !/^[A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)+$/.test(options.package)) throw new Error('Target unavailable');
  const rawAdb = ctx.adb || android(options);
  const adb = async (...args) => { try { return await rawAdb(...args); } catch (error) { throw sanitized(error, 'ADB command failed'); } };
  if ((await adb('get-state')).toString().trim() !== 'device') throw new Error('Device unavailable');
  const userId = (await adb('shell', 'am', 'get-current-user')).toString().trim();
  if (!/^\d+$/.test(userId)) throw new Error('Android user unavailable');
  const packageInfo = (await adb('shell', 'dumpsys', 'package', options.package)).toString();
  const packageBlock = packageInfo.split(`Package [${options.package}]`)[1]?.split(/\n\s*Package \[/)[0];
  if (!packageBlock ||
      !(/\bversionCode=\d+\b/.test(packageBlock) || /\bversionName=[0-9A-Za-z._()+-]{1,64}\b/.test(packageBlock)) ||
      !(new RegExp(`^\\s*User ${userId}:[^\\r\\n]*\\binstalled=true\\b`, 'm')).test(packageBlock)) throw new Error('Package unavailable');

  const foreground = async () => {
    const activity = (await adb('shell', 'dumpsys', 'activity', 'activities')).toString();
    const window = (await adb('shell', 'dumpsys', 'window', 'displays')).toString();
    const resumed = activity.match(/(?:mResumedActivity|topResumedActivity)[^\n]*/)?.[0];
    const focused = window.match(/^\s*mCurrentFocus\s*=[^\n]*/m)?.[0];
    const component = line => line?.match(/\bu(\d+)\s+([A-Za-z_][A-Za-z0-9_.]*)\//);
    const active = component(resumed), focus = component(focused);
    if (!active || !focus || active[1] !== userId || focus[1] !== userId ||
        active[2] !== options.package || focus[2] !== options.package) throw new Error('Target app is not foreground');
  };
  const launcher = async () => {
    const output = (await adb('shell', 'cmd', 'package', 'resolve-activity', '--user', userId, '--brief', '-a', 'android.intent.action.MAIN', '-c', 'android.intent.category.LAUNCHER', options.package)).toString().trim();
    const component = output.split(/\r?\n/).at(-1);
    const [pkg, activity, extra] = component.split('/');
    const segment = '[A-Za-z_$][A-Za-z0-9_$]*';
    const className = new RegExp(`^(?:\\.${segment}(?:\\.${segment})*|${segment}(?:\\.${segment})+)$`);
    if (extra !== undefined || pkg !== options.package || !className.test(activity || '')) throw new Error('Launcher unavailable');
    return component;
  };
  const start = async component => {
    ctx.markSideEffect?.();
    const output = (await adb('shell', 'am', 'start', '--user', userId, '-W', '-n', component)).toString();
    if (!/^Status:\s*ok\s*$/mi.test(output)) throw new Error('Launch failed');
  };
  const launch = async () => start(await launcher());
  const keyguard = async () => {
    const output = (await adb('shell', 'dumpsys', 'window', 'policy')).toString();
    const block = output.split(/\bKeyguardServiceDelegate\s*\r?\n/)[1]?.split(/\n\s*Looper state:/)[0];
    const showing = block?.match(/^\s*showing=(true|false)\s*$/m)?.[1];
    const user = block?.match(/^\s*userId=(\d+)\s*$/m)?.[1];
    const secure = block?.match(/^\s*secure=(true|false)\s*$/m)?.[1];
    if (!showing || user !== userId) throw Error('Keyguard state unavailable');
    return { showing: showing === 'true', secure: secure === undefined ? null : secure === 'true' };
  };

  if (action.type.startsWith('web-')) {
    await foreground();
    let client;
    try { client = await ctx.ensureWebview(); } catch (error) { throw sanitized(error, 'WebView unavailable'); }
    client ||= ctx.client;
    if (!client || typeof client.evaluate !== 'function') throw new Error('WebView unavailable');
    await foreground();
    let result;
    try { ctx.markSideEffect?.(); result = await client.evaluate(webExpression(action)); } catch (error) { throw sanitized(error, 'Web action failed'); }
    if (result?.ok !== true) throw new Error('Web target unavailable');
  } else if (action.type === 'wake') {
    ctx.markSideEffect?.();
    await adb('shell','input','keyevent','KEYCODE_WAKEUP');
  } else if (action.type === 'lock') {
    await foreground();
    ctx.markSideEffect?.();
    await adb('shell', 'input', 'keyevent', 'KEYCODE_SLEEP');
    // Screen-off is a lifecycle action, not a guarantee that credential locking has occurred.
    const power = (await adb('shell', 'dumpsys', 'power')).toString();
    if (!/^\s*mWakefulness=(Asleep|Dozing|DozingSuspend)\s*$/m.test(power)) throw Error('Screen-off unconfirmed');
    return { status: 'completed', type: 'lock', screenOff: true, credentialLock: 'not inferred', restoration: 'explicit unlock or manual authentication' };
  } else if (action.type === 'unlock') {
    let state = await keyguard();
    if (state.showing && state.secure !== false) throw Error('Manual device authentication required or keyguard security unknown');
    ctx.markSideEffect?.();
    await adb('shell', 'input', 'keyevent', 'KEYCODE_WAKEUP');
    state = await keyguard();
    if (state.showing) {
      if (state.secure !== false) throw Error('Manual device authentication required or keyguard security unknown');
      ctx.markSideEffect?.();
      await adb('shell', 'wm', 'dismiss-keyguard');
    }
    if ((await keyguard()).showing) throw Error('Keyguard dismissal unconfirmed');
    if (!/^\s*mWakefulness=Awake\s*$/m.test((await adb('shell', 'dumpsys', 'power')).toString())) throw Error('Wake unconfirmed');
    return { status: 'completed', type: 'unlock', awake: true, keyguardShowing: false, appForeground: 'not inferred' };
  } else if (action.type === 'launch') await launch();
  else if (action.type === 'restart') {
    const component = await launcher();
    ctx.markSideEffect?.();
    await adb('shell', 'am', 'force-stop', '--user', userId, options.package);
    await start(component);
  } else if (action.type === 'rotate') {
    await foreground();
    if (!Array.isArray(ctx.cleanup)) throw new Error('Cleanup unavailable');
    const keys = ['accelerometer_rotation', 'user_rotation'];
    const originals = [];
    for (const key of keys) {
      const raw = (await adb('shell', 'settings', '--user', userId, 'get', 'system', key)).toString().trim();
      if (raw !== 'null' && !(key === 'accelerometer_rotation' ? /^[01]$/ : /^[0-3]$/).test(raw)) throw new Error('Rotation state unavailable');
      originals.push(raw === 'null' ? null : raw);
    }
    await foreground();
    const restoreAdb = ctx.cleanupAdb || rawAdb;
    const applied = ['0', String(action.degrees / 90)];
    ctx.cleanup.push(async () => {
      const results = await Promise.allSettled(keys.map(async (key, i) => {
        const raw = (await restoreAdb('shell', 'settings', '--user', userId, 'get', 'system', key)).toString().trim();
        const current = raw === 'null' ? null : raw;
        if (current === originals[i]) return;
        if (current !== applied[i]) throw new Error('Rotation restore conflict');
        await restoreAdb('shell', 'settings', '--user', userId,
          originals[i] === null ? 'delete' : 'put', 'system', key, ...(originals[i] === null ? [] : [originals[i]]));
      }));
      if (results.some(result => result.status === 'rejected')) throw new Error('Rotation restore failed');
    });
    ctx.markSideEffect?.();
    await adb('shell', 'settings', '--user', userId, 'put', 'system', 'accelerometer_rotation', applied[0]);
    ctx.markSideEffect?.();
    await adb('shell', 'settings', '--user', userId, 'put', 'system', 'user_rotation', applied[1]);
  } else {
    await foreground();
    if (action.type === 'tap') {
      const png = await adb('exec-out', 'screencap', '-p');
      if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Screen bounds unavailable');
      const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
      if (!width || !height || action.x >= width || action.y >= height) throw new Error('Tap outside screen');
      await foreground();
      ctx.markSideEffect?.();
      await adb('shell', 'input', 'tap', String(action.x), String(action.y));
    } else if (action.type === 'input') {
      ctx.markSideEffect?.();
      await adb('shell', 'input', 'text', action.value.replace(/ /g, '%s'));
    } else {
      ctx.markSideEffect?.();
      await adb('shell', 'input', 'keyevent', action.type === 'back' ? 'KEYCODE_BACK' : 'KEYCODE_HOME');
    }
  }
  return { status: 'completed', ...summary(action) };
}

module.exports = { validate, summary, execute };
