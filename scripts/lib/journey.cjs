const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const collectors = require('./collectors.cjs');
const action = require('./action.cjs');
const { connect } = require('./cdp.cjs');
const { redact } = require('./privacy.cjs');
const { version } = require('../../package.json');
const hash = value => createHash('sha256').update(value).digest('hex');
const selector = value => typeof value === 'string' && !!value.trim() && value.length <= 256;
const inspectors = require('./inspectors.cjs');
const captureKinds = ['screenshot','dom','css','environment','console','network','performance','app-lifecycle','web-performance','leak-probe','timeline','storage',...inspectors.domModes];
function validate(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan) || plan.schemaVersion !== 1
    || Object.keys(plan).some(k => !['schemaVersion','name','scope','timeoutMs','steps'].includes(k))
    || plan.name !== undefined && !/^[A-Za-z0-9._-]{1,64}$/.test(plan.name)
    || plan.scope !== undefined && !selector(plan.scope)
    || !Array.isArray(plan.steps) || plan.steps.length < 1 || plan.steps.length > 50) throw Error('Invalid Journey plan');
  const timeoutMs = plan.timeoutMs ?? 120000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw Error('Invalid Journey deadline');
  for (const step of plan.steps) {
    if (step?.type === 'wait') {
      const keys = step.milliseconds !== undefined ? ['type','milliseconds'] : ['type','selector','condition','timeoutMs'];
      if (Object.keys(step).some(k=>!keys.includes(k))) throw Error('Invalid wait');
      if (step.milliseconds !== undefined) {
        if (!Number.isInteger(step.milliseconds) || step.milliseconds < 1 || step.milliseconds > 2000) throw Error('Invalid wait');
      } else if (!selector(step.selector) || !['exists','visible','hidden','absent'].includes(step.condition)
        || !Number.isInteger(step.timeoutMs) || step.timeoutMs < 1 || step.timeoutMs > 10000) throw Error('Invalid wait');
    } else if (step?.type === 'checkpoint') {
      if (Object.keys(step).some(k=>!['type','scope','capture','timelineMs','observerInstrumentation'].includes(k)) || step.scope !== undefined && !selector(step.scope)
        || !Array.isArray(step.capture) || step.capture.length < 1 || step.capture.length > captureKinds.length || new Set(step.capture).size !== step.capture.length
        || step.capture.some(k=>!captureKinds.includes(k))
        || step.capture.some(k=>['dom','css','timeline',...inspectors.domModes].includes(k)) && !selector(step.scope || plan.scope)
        || step.capture.includes('timeline') && (!Number.isInteger(step.timelineMs) || step.timelineMs < 1 || step.timelineMs > 10000)
        || !step.capture.includes('timeline') && (step.timelineMs !== undefined || step.observerInstrumentation !== undefined)
        || step.observerInstrumentation !== undefined && typeof step.observerInstrumentation !== 'boolean') throw Error('Invalid checkpoint');
    } else action.validate(step);
  }
  if (plan.steps.filter(s=>s.type==='rotate').length > 4) throw Error('Too many rotation experiments');
  return { ...plan, timeoutMs };
}
function read(filename, oneAction = false) {
  if (fs.statSync(filename).size > 65536) throw Error('Plan too large');
  const raw = fs.readFileSync(filename,'utf8'), data = JSON.parse(raw);
  const plan = oneAction ? { schemaVersion: 1, steps: [data] } : data;
  return { plan: validate(plan), sha256: hash(raw) };
}
function waitProbe(scope, condition) {
  const nodes = document.querySelectorAll(scope);
  if (condition === 'absent') return { satisfied: nodes.length === 0, matches: nodes.length };
  if (nodes.length !== 1) return { satisfied: false, matches: nodes.length };
  const n = nodes[0], rect = n.getBoundingClientRect(), style = getComputedStyle(n);
  const visible = n.isConnected && !n.hidden && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  return { satisfied: condition === 'exists' || (condition === 'visible' ? visible : !visible), matches: 1 };
}
async function run(options, loaded, overrides = {}) {
  const plan = validate(loaded.plan);
  if (!/^[\w.:-]{1,128}$/.test(options.serial || '') || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(options.package || '')
    || !options.out || options.targetId !== undefined && !/^[A-Za-z0-9._:-]{1,128}$/.test(options.targetId)
    || options.webviewSocket !== undefined && !/^(?:browser_)?webview_devtools_remote_[0-9]+$/.test(options.webviewSocket)) throw Error('Explicit valid target/output required');
  if (!options.plan && options.testEnvironment !== true) throw Error('Execution requires explicit test environment');
  const output = path.resolve(options.out); fs.mkdirSync(output);
  const incidentId = randomUUID(), started = Date.now();
  const report = { schemaVersion: 1, incidentId, toolVersion: version, source: options.plan ? 'Journey plan' : 'Journey execution',
    package: options.package, selectedDevice: 'explicit; serial omitted', planSha256: loaded.sha256,
    captureStart: new Date(started).toISOString(), timeoutMs: plan.timeoutMs, status: 'failed', steps: [], cleanup: [],
    privacy: { inputContent: 'omitted', screenshotsRequireManualReview: true }, remoteCancellationGuaranteed: false };
  function save(name, source, value) {
    const body = JSON.stringify({ schemaVersion: 1, incidentId, capturedAt: new Date().toISOString(), source, data: redact(value) },null,2);
    fs.writeFileSync(path.join(output,name+'.json'),body,{flag:'wx'});
    return { filename: name+'.json', sha256: hash(body) };
  }
  function checkpoint() { fs.writeFileSync(path.join(output,'manifest.pending'),JSON.stringify(report,null,2),{flag:'wx'}); fs.renameSync(path.join(output,'manifest.pending'),path.join(output,'manifest.json')); }
  const summarize = s => s.type === 'wait' ? { type: s.type, ...(s.milliseconds !== undefined ? {milliseconds:s.milliseconds} : {selectorHash:hash(s.selector),condition:s.condition,timeoutMs:s.timeoutMs}) }
    : s.type === 'checkpoint' ? {type:s.type,capture:s.capture,scopeHash:selector(s.scope||plan.scope)?hash(s.scope||plan.scope):null,
      ...(s.capture.includes('timeline') ? {timelineMs:s.timelineMs,observerInstrumentation:s.observerInstrumentation===true} : {})} : action.summary(s);
  if (options.plan) {
    report.steps = plan.steps.map(s=>({...summarize(s),status:'planned',targetCheck:'revalidated at execution; future selectors may not exist yet'}));
    report.status = 'planned'; report.captureEnd = new Date().toISOString(); checkpoint(); return report;
  }
  const controller = new AbortController(); let client, appPid, forwardPort, capture, forwardAllocationUncertain=false;
  const cleanup = [], baseAdb = overrides.adb || collectors.android(options), deadline = started + plan.timeoutMs;
  const assertActive = () => { if (controller.signal.aborted || Date.now() >= deadline) throw Object.assign(Error('Journey deadline'),{code:'ETIMEDOUT'}); };
  const timer = setTimeout(()=>{controller.abort();try{client?.close()}catch{/* Final cleanup records failures. */}},plan.timeoutMs);
  const execute = async (args, settings = {}) => {
    assertActive();
    if(args[0]==='forward'&&args[1]==='tcp:0')forwardAllocationUncertain=true;
    const signal=settings.signal?AbortSignal.any([settings.signal,controller.signal]):controller.signal;
    const result = baseAdb.execute ? await baseAdb.execute(args,{...settings,timeout:Math.min(settings.timeout??10000,10000,Math.max(1,deadline-Date.now())),signal}) : await baseAdb(...args);
    // Keep a successful dynamic port result so its owner can register cleanup even at the deadline.
    if (!(args[0] === 'forward' && args[1] === 'tcp:0')) assertActive(); return result;
  };
  const adb = (...args)=>execute(args); adb.execute = execute;
  const cleanupAdb = (...args)=>baseAdb.execute ? baseAdb.execute(args,{timeout:3000}) : baseAdb(...args);
  const ctx = { options, adb, cleanupAdb, cleanup, assertActive };
  let actionDispatched = false;
  ctx.markSideEffect = () => { assertActive(); actionDispatched = true; };
  async function closeTransport() {
    let closeFailed=false;try{client?.close()}catch{closeFailed=true}client=undefined;
    if (forwardPort) { await collectors.removeForward(ctx); forwardPort=undefined; }
    appPid=undefined;ctx.forwardPort=undefined;
    if(closeFailed)throw Error('Transport close failed');
  }
  ctx.ensureWebview = async () => {
    assertActive();
    const pid = (await adb('shell','pidof',options.package)).toString().trim();
    if (!/^\d+$/.test(pid)) throw Error('App identity unavailable');
    if (client && appPid === pid && (!client.isOpen || client.isOpen())) return ctx.client;
    await closeTransport(); assertActive();
    ctx.appPid=pid; await collectors.forward(ctx); forwardPort=ctx.forwardPort;forwardAllocationUncertain=false;appPid=pid;
    assertActive();
    capture=collectors.events();
    client = await (overrides.connect || connect)(ctx.endpoint,Math.min(15000,Math.max(1,deadline-Date.now())),capture.onEvent,options.targetId||null);
    assertActive();
    ctx.client = { async evaluate(source) { assertActive(); const result=await client.evaluate(source);assertActive();return result; },
      async send(method,params) { assertActive();const result=await client.send(method,params);assertActive();return result; } };
    ctx.channels={};
    for(const domain of ['Runtime','Network']) { try {await ctx.client.send(domain+'.enable');ctx.channels[domain]='available'} catch {assertActive();ctx.channels[domain]='unsupported'} }
    ctx.capture=capture;return ctx.client;
  };
  const pause = ms => new Promise((resolve,reject)=>{
    assertActive();const tick=setTimeout(done,ms);
    function done(){controller.signal.removeEventListener('abort',abort);resolve()}
    function abort(){clearTimeout(tick);reject(Object.assign(Error('Journey deadline'),{code:'ETIMEDOUT'}))}
    controller.signal.addEventListener('abort',abort,{once:true});
  });
  async function captureCheckpoint(step,index,entry) {
    const scope=step.scope||plan.scope; ctx.options={...options,scope,timelineMs:step.timelineMs,observerInstrumentation:step.observerInstrumentation===true}; entry.artifacts=[];
    for(const kind of step.capture) {
      assertActive(); const name=`step-${index}-${kind}`;
      if(kind==='screenshot') {
        const value=await collectors.screenshot(ctx), filename=name+'.png';fs.writeFileSync(path.join(output,filename),value.binary,{flag:'wx'});
        entry.artifacts.push({filename,sha256:hash(value.binary),...value.metadata,requiresPrivacyReview:true});
      } else if(kind==='performance') {
        entry.artifacts.push(save(name,'Journey Android performance checkpoint',{gfxinfo:await collectors.gfx(ctx),meminfo:await collectors.mem(ctx)}));
      } else if(kind==='app-lifecycle') {
        ctx.appData=await collectors.app(ctx);const value=await require('./app-lifecycle.cjs').collect(ctx);
        entry.artifacts.push(save(name,'Journey Android lifecycle checkpoint',value));
        if(value.collectorStatus)throw Error('Requested lifecycle capability incomplete');
      } else {
        await ctx.ensureWebview();
        let value;
        if(kind==='web-performance'||kind==='leak-probe'){
          value=await require('./performance-series.cjs').web(ctx.client,{detached:kind==='leak-probe'});
          if(value.status!=='available'||value.cleanupWarning||kind==='leak-probe'&&value.detachedNodes.status!=='available')value.collectorStatus='failed';
        }
        else if(kind==='timeline') value=await require('./timeline.cjs').collect(ctx);
        else if(kind==='storage'||inspectors.domModes.includes(kind)) value=await inspectors.collect(ctx,kind);
        else if(kind==='dom'||kind==='css') value=await collectors[kind](ctx);
        else if(kind==='environment') {
          ctx.deviceData=await collectors.device(ctx);ctx.appData=await collectors.app(ctx);ctx.webviewData=await collectors.webview(ctx);ctx.providerData=await collectors.provider(ctx);value=await collectors.environment(ctx);
        } else {ctx.cdpWindow={captureStart:report.captureStart,captureEnd:new Date().toISOString()};value=await collectors[kind==='console'?'consoleSummary':'networkSummary'](ctx)}
        entry.artifacts.push(save(name,`Journey ${kind} checkpoint`,value));
        if(['failed','unsupported'].includes(value?.collectorStatus))throw Error('Requested checkpoint capability incomplete');
      }
      checkpoint();
    }
  }
  checkpoint();
  try {
    ctx.deviceData=await collectors.device(ctx);ctx.appData=await collectors.app(ctx);
    report.device=redact(ctx.deviceData);report.app=redact(ctx.appData);
    for(const [index,step] of plan.steps.entries()) {
      const begin=Date.now(), entry={index,...summarize(step),captureStart:new Date().toISOString(),status:'failed'};
      report.steps.push(entry);checkpoint();
      try {
        actionDispatched=false;
        assertActive();
        if(step.type==='wait') {
          if(step.milliseconds!==undefined) await pause(step.milliseconds);
          else {
            const until=Date.now()+step.timeoutMs;
            while(true) {
              const c=await ctx.ensureWebview();const result=await c.evaluate(`(${waitProbe.toString()})(${JSON.stringify(step.selector)},${JSON.stringify(step.condition)})`);
              if(Date.now()>until) throw Error('Wait condition not satisfied');
              if(result?.satisfied===true) break;
              if(Date.now()>=until) throw Error('Wait condition not satisfied');
              await pause(Math.min(100,Math.max(1,until-Date.now())));
            }
          }
        } else if(step.type==='checkpoint') await captureCheckpoint(step,index,entry);
        else { if(['launch','restart'].includes(step.type)) await closeTransport();await (overrides.executeAction||action.execute)(ctx,step); }
        assertActive();entry.status='completed';
      } catch(error) {
        const timeout=controller.signal.aborted||error?.code==='ETIMEDOUT'||error?.killed;
        entry.reason=timeout?'deadline-or-command-timeout':'step-failed';entry.errorContent='omitted';
        if(actionDispatched)entry.outcome='unknown; side effect may have occurred';
        throw error;
      } finally {entry.captureEnd=new Date().toISOString();entry.durationMs=Date.now()-begin;checkpoint()}
    }
    report.status='complete';
  } catch {report.status=report.steps.some(s=>s.status==='completed'||s.artifacts?.length)?'partial':'failed'}
  finally {
    clearTimeout(timer);controller.abort();
    for(const restore of cleanup.reverse()) {try {await restore();report.cleanup.push({status:'completed'})} catch {report.cleanup.push({status:'failed',reason:'restore-failed-or-conflict'})} }
    try {await closeTransport();report.cleanup.push({status:'completed',resource:'own CDP transport'})} catch {report.cleanup.push({status:'failed',resource:'own CDP transport'})}
    if(forwardAllocationUncertain)report.cleanup.push({status:'failed',resource:'ADB forward allocation',reason:'ownership-unknown; no unrelated forwards removed'});
    if(report.cleanup.some(c=>c.status==='failed')&&report.status==='complete')report.status='partial';
    report.captureEnd=new Date().toISOString();checkpoint();
  }
  return report;
}
module.exports = { validate, read, run, waitProbe };
