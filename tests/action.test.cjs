const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { validate, summary, execute } = require('../scripts/lib/action.cjs');

const pkg = 'com.example.game';
function png(width = 20, height = 10) {
  const result = Buffer.alloc(24);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(result);
  result.writeUInt32BE(width, 16);
  result.writeUInt32BE(height, 20);
  return result;
}
function fixture(overrides = {}) {
  const calls = [], cleanupCalls = [], cleanup = [];
  const settings = { accelerometer_rotation: '1', user_rotation: '0' };
  const values = {
    'get-state': 'device',
    'shell am get-current-user': '10',
    [`shell dumpsys package ${pkg}`]: `Packages:\n  Package [${pkg}]\n    versionCode=1 versionName=1.0\n    User 10: installed=true hidden=false`,
    'shell dumpsys activity activities': `mResumedActivity: ActivityRecord{ u10 ${pkg}/.Main }`,
    'shell dumpsys window displays': `mCurrentFocusedWindow=Window{ u10 com.other/.Other }\n mCurrentFocus=Window{ u10 ${pkg}/.Main }`,
    'exec-out screencap -p': png(),
    [`shell cmd package resolve-activity --user 10 --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER ${pkg}`]: `${pkg}/.Main`,
    [`shell am start --user 10 -W -n ${pkg}/.Main`]: 'Status: ok',
    ...overrides,
  };
  const reply = async (args, list) => {
    list.push(args);
    const key = args.join(' ');
    if (args[0] === 'shell' && args[1] === 'settings') {
      const verb = args[4], name = args[6];
      if (verb === 'get') return Buffer.from(settings[name] ?? 'null');
      if (verb === 'put') settings[name] = args[7];
      if (verb === 'delete') delete settings[name];
      return Buffer.alloc(0);
    }
    const value = values[key];
    return Buffer.isBuffer(value) ? value : Buffer.from(value ?? '');
  };
  const ctx = { options: { serial: 'selected', package: pkg }, cleanup,
    adb: (...args) => reply(args, calls), cleanupAdb: (...args) => reply(args, cleanupCalls) };
  return { ctx, calls, cleanupCalls, settings };
}

test('validation and summaries allow only bounded actions without exposing inputs', () => {
  assert.throws(() => validate({ type: 'tap', x: 1, y: 2, extra: true }));
  assert.throws(() => validate({ type: 'input', value: '汉字' }));
  assert.throws(() => validate({ type: 'input', value: '%' }));
  assert.throws(() => validate({ type: 'web-input', selector: '.x', value: 'x'.repeat(1025) }));
  assert.throws(() => validate({ type: 'tap', x: 1.5, y: 2 }));
  assert.throws(() => validate({ type: 'rotate', degrees: 45 }));
  assert.deepEqual(summary({ type: 'input', value: 'private' }), { type: 'input', inputLength: 7 });
  const web = summary({ type: 'web-input', selector: '#private', value: 'private' });
  assert.equal(web.inputLength, 7);
  assert.equal(web.selectorHash.length, 64);
  assert.equal(JSON.stringify(web).includes('private'), false);
});

test('device, package, foreground activity, focus and screen bounds guard native side effects', async () => {
  for (const [override, pattern] of [
    [{ 'get-state': 'offline' }, /Device unavailable/],
    [{ [`shell dumpsys package ${pkg}`]: 'Package [com.other] versionCode=1' }, /Package unavailable/],
    [{ [`shell dumpsys package ${pkg}`]: `Package [${pkg}] versionCode=1\n User 0: installed=true\n User 10: installed=false` }, /Package unavailable/],
    [{ 'shell dumpsys activity activities': `mResumedActivity: ActivityRecord{ u10 ${pkg}.other/.Main }` }, /foreground/],
    [{ 'shell dumpsys window displays': 'mCurrentFocus=Window{ u10 com.android.systemui/.Dialog }' }, /foreground/],
    [{ 'shell dumpsys window displays': `mCurrentFocusedWindow=Window{ u10 ${pkg}/.Main }` }, /foreground/],
    [{ 'shell am get-current-user': 'unknown' }, /Android user/],
  ]) {
    const { ctx, calls } = fixture(override);
    await assert.rejects(execute(ctx, { type: 'tap', x: 1, y: 1 }), pattern);
    assert.equal(calls.some(args => args.includes('tap')), false);
  }
  const { ctx, calls } = fixture();
  const asleep=fixture({'shell dumpsys activity activities':'','shell dumpsys window displays':''});
  await execute(asleep.ctx,{type:'wake'});
  assert.ok(asleep.calls.some(args=>args.join(' ')==='shell input keyevent KEYCODE_WAKEUP'));
  assert.equal(asleep.calls.some(args=>args.includes('tap')),false);
  await assert.rejects(execute(ctx, { type: 'tap', x: 20, y: 0 }), /outside screen/);
  assert.equal(calls.some(args => args.includes('tap')), false);
  await execute(ctx, { type: 'tap', x: 19, y: 9 });
  assert.ok(calls.some(args => args.join(' ') === 'shell input tap 19 9'));
  await execute(ctx, { type: 'input', value: 'a b+@' });
  assert.ok(calls.some(args => args.join(' ') === 'shell input text a%sb+@'));
  const timed = fixture();
  const originalAdb = timed.ctx.adb;
  timed.ctx.adb = async (...args) => {
    if (args.join(' ') === 'shell input tap 1 1') throw Object.assign(Error('private stderr'), { code: 'ETIMEDOUT', killed: true });
    return originalAdb(...args);
  };
  await assert.rejects(execute(timed.ctx, { type: 'tap', x: 1, y: 1 }), error => {
    assert.equal(error.message, 'ADB command failed');
    assert.equal(error.code, 'ETIMEDOUT');
    assert.equal(error.killed, true);
    return true;
  });
  const raced = fixture();
  let captured = false, dispatched = false;
  const originalRaceAdb = raced.ctx.adb;
  raced.ctx.markSideEffect = () => { dispatched = true; };
  raced.ctx.adb = async (...args) => {
    if (args.join(' ') === 'exec-out screencap -p') { const result = await originalRaceAdb(...args); captured = true; return result; }
    if (captured && args.join(' ') === 'shell dumpsys window displays') return Buffer.from('mCurrentFocus=Window{ u10 com.android.systemui/.Dialog }');
    return originalRaceAdb(...args);
  };
  await assert.rejects(execute(raced.ctx, { type: 'tap', x: 1, y: 1 }), /foreground/);
  assert.equal(dispatched, false);
  assert.equal(raced.calls.some(args => args.includes('tap')), false);
});

test('web actions require a unique visible enabled target and input-safe element', async () => {
  let activeElement = null;
  class HTMLElement {
    constructor() { this.isConnected = true; this.disabled = false; this.readOnly = false; this.events = []; }
    matches() { return this.disabled; }
    closest() { return null; }
    getClientRects() { return [1]; }
    dispatchEvent(event) { this.events.push(event.type); }
    click() { this.clicked = true; }
    focus() { this.focused = true; activeElement = this; }
    get textContent() { throw Error('private text'); }
    get innerHTML() { throw Error('private HTML'); }
  }
  class HTMLInputElement extends HTMLElement { constructor(type = 'text') { super(); this.type = type; } }
  Object.defineProperty(HTMLInputElement.prototype, 'value', { set(value) { this.received = value; }, get() { throw Error('private existing value'); } });
  class HTMLTextAreaElement extends HTMLElement {}
  Object.defineProperty(HTMLTextAreaElement.prototype, 'value', { set(value) { this.received = value; }, get() { throw Error('private existing value'); } });
  class Event { constructor(type) { this.type = type; } }
  let nodes = [];
  const { ctx } = fixture();
  ctx.ensureWebview = async () => ({ evaluate: expression => vm.runInNewContext(expression, {
    document: { querySelectorAll: () => nodes, get activeElement() { return activeElement; } }, HTMLElement, HTMLInputElement, HTMLTextAreaElement, Event,
    getComputedStyle: () => ({ display: 'block', visibility: 'visible', opacity: '1',
      get cssText() { throw Error('private CSS'); } }),
  }) });
  const action = { type: 'web-click', selector: '#x' };
  await assert.rejects(execute(ctx, action), /Web target unavailable/);
  nodes = [new HTMLElement(), new HTMLElement()];
  await assert.rejects(execute(ctx, action), /Web target unavailable/);
  nodes = [new HTMLElement()]; nodes[0].disabled = true;
  await assert.rejects(execute(ctx, action), /Web target unavailable/);
  nodes = [new HTMLElement()];
  await execute(ctx, action);
  assert.equal(nodes[0].clicked, true);
  await execute(ctx, { type: 'web-focus', selector: '#x' });
  assert.equal(nodes[0].focused, true);
  nodes[0].focus = () => { activeElement = null; };
  await assert.rejects(execute(ctx, { type: 'web-focus', selector: '#x' }), /Web target unavailable/);
  nodes = [new HTMLInputElement('password')];
  await assert.rejects(execute(ctx, { type: 'web-input', selector: '#x', value: 'secret' }), /Web target unavailable/);
  nodes = [new HTMLInputElement()];
  await execute(ctx, { type: 'web-input', selector: '#x', value: 'secret' });
  assert.equal(nodes[0].received, 'secret');
  assert.deepEqual(nodes[0].events, ['input', 'change']);
  const race = fixture();
  let connected = false, evaluated = false;
  const originalWebAdb = race.ctx.adb;
  race.ctx.adb = async (...args) => {
    if (connected && args.join(' ') === 'shell dumpsys window displays') return Buffer.from('mCurrentFocus=Window{ u10 com.android.systemui/.Dialog }');
    return originalWebAdb(...args);
  };
  race.ctx.ensureWebview = async () => { connected = true; return { evaluate: async () => { evaluated = true; return { ok: true }; } }; };
  await assert.rejects(execute(race.ctx, action), /foreground/);
  assert.equal(evaluated, false);
  ctx.ensureWebview = async () => { throw Object.assign(Error('private CDP detail'), { code: 'ABORT_ERR', killed: true }); };
  await assert.rejects(execute(ctx, action), error => {
    assert.equal(error.message, 'WebView unavailable');
    assert.equal(error.code, 'ABORT_ERR');
    assert.equal(error.killed, true);
    return true;
  });
});

test('launch and restart bind current user and exact package, resolving before force-stop', async () => {
  const { ctx, calls } = fixture();
  await execute(ctx, { type: 'restart' });
  const commands = calls.map(args => args.join(' '));
  assert.ok(commands.some(line => line === `shell am force-stop --user 10 ${pkg}`));
  assert.ok(commands.some(line => line === `shell am start --user 10 -W -n ${pkg}/.Main`));
  assert.ok(commands.some(line => line.includes('resolve-activity --user 10')));
  assert.equal(commands.some(line => line.includes('clear')), false);
  const bad = fixture({ [`shell cmd package resolve-activity --user 10 --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER ${pkg}`]: 'com.other/.Main' });
  await assert.rejects(execute(bad.ctx, { type: 'restart' }), /Launcher unavailable/);
  assert.equal(bad.calls.some(args => args.includes('force-stop')), false);
  const externalClass = 'com.vrelnir.dol.MainActivity';
  const valid = fixture({
    [`shell cmd package resolve-activity --user 10 --brief -a android.intent.action.MAIN -c android.intent.category.LAUNCHER ${pkg}`]: `${pkg}/${externalClass}`,
    [`shell am start --user 10 -W -n ${pkg}/${externalClass}`]: 'Status: ok',
  });
  await execute(valid.ctx, { type: 'launch' });
  assert.ok(valid.calls.some(args => args.join(' ') === `shell am start --user 10 -W -n ${pkg}/${externalClass}`));
  const failed = fixture({ [`shell am start --user 10 -W -n ${pkg}/.Main`]: 'Error: Activity not started' });
  await assert.rejects(execute(failed.ctx, { type: 'launch' }), /Launch failed/);
});

test('rotation registers cleanup before writes; cleanup restores both keys without overwriting conflicts', async () => {
  const { ctx, calls, cleanupCalls, settings } = fixture();
  await execute(ctx, { type: 'rotate', degrees: 90 });
  assert.equal(ctx.cleanup.length, 1);
  assert.equal(settings.accelerometer_rotation, '0');
  assert.equal(settings.user_rotation, '1');
  assert.ok(calls.some(args => args.join(' ') === 'shell settings --user 10 put system user_rotation 1'));
  settings.accelerometer_rotation = '2'; // another actor changed it after our write
  await assert.rejects(ctx.cleanup[0](), /Rotation restore failed/);
  assert.equal(settings.accelerometer_rotation, '2');
  assert.equal(settings.user_rotation, '0');
  assert.ok(cleanupCalls.some(args => args.join(' ') === 'shell settings --user 10 put system user_rotation 0'));
  const missing = fixture();
  delete missing.settings.user_rotation;
  await execute(missing.ctx, { type: 'rotate', degrees: 90 });
  await missing.ctx.cleanup[0]();
  assert.equal('user_rotation' in missing.settings, false);
  assert.ok(missing.cleanupCalls.some(args => args.join(' ') === 'shell settings --user 10 delete system user_rotation'));
  const partial = fixture();
  const originalAdb = partial.ctx.adb;
  partial.ctx.adb = async (...args) => {
    if (args.join(' ') === 'shell settings --user 10 put system user_rotation 1') throw Error('private write failure');
    return originalAdb(...args);
  };
  await assert.rejects(execute(partial.ctx, { type: 'rotate', degrees: 90 }), /ADB command failed/);
  await partial.ctx.cleanup[0]();
  assert.equal(partial.settings.accelerometer_rotation, '1');
  assert.equal(partial.settings.user_rotation, '0');
});

test('screen lifecycle confirms power state and never dismisses a secure or unknown keyguard', async () => {
 const policy=(showing,secure,user='10')=>`KeyguardServiceDelegate\n showing=${showing}\n userId=${user}\n${secure===undefined?'':` secure=${secure}\n`} Looper state:\n`;
 const asleep=fixture({'shell dumpsys power':'mWakefulness=Asleep'});
 assert.equal((await execute(asleep.ctx,{type:'lock'})).screenOff,true);
 assert.ok(asleep.calls.some(a=>a.join(' ')==='shell input keyevent KEYCODE_SLEEP'));
 const unconfirmed=fixture({'shell dumpsys power':'mWakefulness=Awake'});
 await assert.rejects(execute(unconfirmed.ctx,{type:'lock'}),/unconfirmed/);
 for(const p of [policy(true,true),policy(true,undefined),policy(false,false,'0'),'unknown']){
  const f=fixture({'shell dumpsys window policy':p});
  await assert.rejects(execute(f.ctx,{type:'unlock'}));
  assert.equal(f.calls.some(a=>a.includes('KEYCODE_WAKEUP')||a.includes('dismiss-keyguard')),false);
 }
 const f=fixture({'shell dumpsys power':'mWakefulness=Awake'});const original=f.ctx.adb;let showing=true;
 f.ctx.adb=async(...args)=>{
  if(args.join(' ')==='shell dumpsys window policy')return Buffer.from(policy(showing,false));
  if(args.includes('dismiss-keyguard'))showing=false;return original(...args);
 };
 assert.equal((await execute(f.ctx,{type:'unlock'})).keyguardShowing,false);
 assert.ok(f.calls.some(a=>a.join(' ')==='shell wm dismiss-keyguard'));
 const clear=fixture({'shell dumpsys window policy':policy(false,undefined),'shell dumpsys power':'mWakefulness=Awake'});
 await execute(clear.ctx,{type:'unlock'});
 assert.equal(clear.calls.some(a=>a.includes('dismiss-keyguard')),false);
});
