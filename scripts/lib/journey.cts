import type actionTypes from './action.cjs';
import type executionTypes from './execution-context.cjs';
import type inspectorBrowser from './browser/inspectors.cjs';
import type diagnostics from './diagnostics.cjs';
declare namespace journeyAPI {
 type CaptureKind='screenshot'|'dom'|'css'|'environment'|'console'|'network'|'performance'|'app-lifecycle'|'web-performance'|'leak-probe'|'timeline'|'storage'|inspectorBrowser.Mode;
 type Condition='exists'|'visible'|'hidden'|'absent';
 type Wait={type:'wait';milliseconds:number;selector?:never;condition?:never;timeoutMs?:never}|{type:'wait';milliseconds?:never;selector:string;condition:Condition;timeoutMs:number};
 interface Checkpoint {type:'checkpoint';scope?:string;capture:CaptureKind[];timelineMs?:number;observerInstrumentation?:boolean}
 type Step=Wait|Checkpoint|actionTypes.Action;
 interface Plan {schemaVersion:1;name?:unknown;scope?:string;timeoutMs:number;steps:Step[]}
 interface Loaded {plan:unknown;sha256:string}
 interface Options extends actionTypes.Options {out?:string;plan?:boolean;testEnvironment?:boolean}
 interface Artifact {filename:string;sha256:string;[key:string]:unknown}
 interface Entry {index?:number;type:string;status:'failed'|'completed'|'planned';captureStart?:string;captureEnd?:string;durationMs?:number;artifacts?:Artifact[];outcome?:string;reason?:string;errorContent?:string;diagnostic?:ReturnType<typeof diagnostics.describe>;[key:string]:unknown}
 interface Report {schemaVersion:number;incidentId:string;toolVersion:unknown;source:string;planSha256:string;captureStart:string;captureEnd?:string;timeoutMs:number;status:'failed'|'partial'|'planned'|'complete';steps:Entry[];cleanup:executionTypes.CleanupResult[];privacy:{inputContent:string;screenshotsRequireManualReview:true};remoteCancellationGuaranteed:false;device?:unknown;app?:unknown;[key:string]:unknown}
 interface Overrides extends executionTypes.Overrides {executeAction?:(ctx:executionTypes.Context,action:actionTypes.Action)=>Promise<unknown>}
}
interface RawStep {type?:unknown;milliseconds?:unknown;selector?:unknown;condition?:unknown;timeoutMs?:unknown;scope?:unknown;capture?:unknown;timelineMs?:unknown;observerInstrumentation?:unknown}
interface ErrorView {code?:unknown;killed?:unknown;notDispatched?:unknown}
const {waitProbe}:typeof import('./browser/journey-wait.cjs')=require('./browser/journey-wait.cjs');
const fs:typeof import('node:fs')=require('node:fs');
const path:typeof import('node:path')=require('node:path');
const {randomUUID,createHash}:typeof import('node:crypto')=require('node:crypto');
const collectors:typeof import('./collectors.cjs')=require('./collectors.cjs');
const action:typeof import('./action.cjs')=require('./action.cjs');
const execution:typeof import('./execution-context.cjs')=require('./execution-context.cjs');
const {redact}:typeof import('./privacy.cjs')=require('./privacy.cjs');
const { version } = require('../../package.json');
const hash = (value:string|Buffer) => createHash('sha256').update(value).digest('hex');
const selector = (value:unknown):value is string => typeof value === 'string' && !!value.trim() && value.length <= 256;
const inspectors:typeof import('./inspectors.cjs')=require('./inspectors.cjs');
const captureKinds:journeyAPI.CaptureKind[] = ['screenshot','dom','css','environment','console','network','performance','app-lifecycle','web-performance','leak-probe','timeline','storage',...inspectors.domModes];
function validate(raw:unknown):journeyAPI.Plan {
  const plan=raw as {schemaVersion?:unknown;name?:unknown;scope?:unknown;timeoutMs?:unknown;steps?:unknown}|null|undefined;
  if (!plan || typeof plan !== 'object' || Array.isArray(plan) || plan.schemaVersion !== 1
    || Object.keys(plan).some(k => !['schemaVersion','name','scope','timeoutMs','steps'].includes(k as string))
    || plan.name !== undefined && !/^[A-Za-z0-9._-]{1,64}$/.test(plan.name as string)
    || plan.scope !== undefined && !selector(plan.scope)
    || !Array.isArray(plan.steps) || plan.steps.length < 1 || plan.steps.length > 50) throw Error('Invalid Journey plan');
  const timeoutMs = (plan.timeoutMs ?? 120000) as number;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120000) throw Error('Invalid Journey deadline');
  for (const raw of plan.steps as unknown[]) {
    const step=raw as RawStep;
    if (step?.type === 'wait') {
      const keys = step.milliseconds !== undefined ? ['type','milliseconds'] : ['type','selector','condition','timeoutMs'];
      if (Object.keys(step).some(k=>!keys.includes(k))) throw Error('Invalid wait');
      if (step.milliseconds !== undefined) {
        if (!Number.isInteger(step.milliseconds) || (step.milliseconds as number) < 1 || (step.milliseconds as number) > 2000) throw Error('Invalid wait');
      } else if (!selector(step.selector) || !['exists','visible','hidden','absent'].includes(step.condition as string)
        || !Number.isInteger(step.timeoutMs) || (step.timeoutMs as number) < 1 || (step.timeoutMs as number) > 10000) throw Error('Invalid wait');
    } else if (step?.type === 'checkpoint') {
      if (Object.hasOwn(step,'name')) throw Object.assign(Error('Invalid checkpoint'),{code:'UNSUPPORTED_CHECKPOINT_NAME'});
      if (Object.keys(step).some(k=>!['type','scope','capture','timelineMs','observerInstrumentation'].includes(k as string)) || step.scope !== undefined && !selector(step.scope)
        || !Array.isArray(step.capture) || step.capture.length < 1 || step.capture.length > captureKinds.length || new Set(step.capture).size !== step.capture.length
        || step.capture.some((k:unknown)=>!captureKinds.includes(k as journeyAPI.CaptureKind))
        || step.capture.some((k:unknown)=>['dom','css','timeline',...inspectors.domModes].includes(k as string)) && !selector(step.scope || plan.scope)
        || step.capture.includes('timeline') && (!Number.isInteger(step.timelineMs) || (step.timelineMs as number) < 1 || (step.timelineMs as number) > 10000)
        || !step.capture.includes('timeline') && (step.timelineMs !== undefined || step.observerInstrumentation !== undefined)
        || step.observerInstrumentation !== undefined && typeof step.observerInstrumentation !== 'boolean') throw Error('Invalid checkpoint');
    } else action.validate(step);
  }
  if (plan.steps.filter((s:RawStep)=>s.type==='rotate').length > 4) throw Error('Too many rotation experiments');
  return { ...plan, timeoutMs } as journeyAPI.Plan;
}
function read(filename:string, oneAction = false):journeyAPI.Loaded {
  if (fs.statSync(filename).size > 65536) throw Error('Plan too large');
  const raw = fs.readFileSync(filename,'utf8'), data:unknown = JSON.parse(raw);
  const plan = oneAction ? { schemaVersion: 1, steps: [data] } : data;
  return { plan: validate(plan), sha256: hash(raw) };
}
async function run(options:journeyAPI.Options, loaded:journeyAPI.Loaded, overrides:journeyAPI.Overrides = {}):Promise<journeyAPI.Report> {
  const plan = validate(loaded.plan);
  if (options.host === 'chrome') {
    options = {...options,chromeRecord:(require('./host-options.cjs') as typeof import('./host-options.cjs')).chrome(options,{gameplay:options.gameplay===true})};
    if (plan.steps.some(s => !['wait','checkpoint'].includes(s.type) && !s.type.startsWith('web-'))) throw Object.assign(Error('Unsupported Chrome action'),{code:'PC_ACTION_UNSUPPORTED'});
    if (!options.out) throw Error('Explicit valid target/output required');
  } else if (options.host !== undefined || !/^[\w.:-]{1,128}$/.test(options.serial || '') || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(options.package || '')
    || !options.out || options.targetId !== undefined && !/^[A-Za-z0-9._:-]{1,128}$/.test(options.targetId as string)
    || options.webviewSocket !== undefined && !/^(?:browser_)?webview_devtools_remote_[0-9]+$/.test(options.webviewSocket as string)) throw Error('Explicit valid target/output required');
  if (!options.plan && options.testEnvironment !== true) throw Error('Execution requires explicit test environment');
  const output = path.resolve(options.out!); fs.mkdirSync(output);
  const incidentId = randomUUID(), started = Date.now();
  const report:journeyAPI.Report = { schemaVersion: 1, incidentId, toolVersion: version, source: options.plan ? 'Journey plan' : 'Journey execution',
    ...(options.host === 'chrome' ? {host:'chrome', identity:{profileId:options.chromeRecord!.target.profileId,browserId:options.chromeRecord!.target.browserId,targetId:options.chromeRecord!.target.targetId,document:options.chromeRecord!.target.document}} : {package:options.package,selectedDevice:'explicit; serial omitted'}), planSha256: loaded.sha256,
    captureStart: new Date(started).toISOString(), timeoutMs: plan.timeoutMs, status: 'failed', steps: [], cleanup: [],
    privacy: { inputContent: 'omitted', screenshotsRequireManualReview: true }, remoteCancellationGuaranteed: false };
  function save(name:string, source:string, value:unknown) {
    const body = JSON.stringify({ schemaVersion: 1, incidentId, capturedAt: new Date().toISOString(), source, data: redact(value) },null,2);
    fs.writeFileSync(path.join(output,name+'.json'),body,{flag:'wx'});
    return { filename: name+'.json', sha256: hash(body) };
  }
  function checkpoint() { fs.writeFileSync(path.join(output,'manifest.pending'),JSON.stringify(report,null,2),{flag:'wx'}); fs.renameSync(path.join(output,'manifest.pending'),path.join(output,'manifest.json')); }
  const summarize = (s:journeyAPI.Step) => s.type === 'wait' ? { type: s.type, ...(s.milliseconds !== undefined ? {milliseconds:s.milliseconds} : {selectorHash:hash(s.selector),condition:s.condition,timeoutMs:s.timeoutMs}) }
    : s.type === 'checkpoint' ? {type:s.type,capture:s.capture,scopeHash:selector(s.scope||plan.scope)?hash((s.scope||plan.scope)!):null,
      ...(s.capture.includes('timeline') ? {timelineMs:s.timelineMs,observerInstrumentation:s.observerInstrumentation===true} : {})} : action.summary(s);
  if (options.plan) {
    report.steps = plan.steps.map(s=>({...summarize(s),status:'planned',targetCheck:'revalidated at execution; future selectors may not exist yet'}));
    report.status = 'planned'; report.captureEnd = new Date().toISOString(); checkpoint(); return report;
  }
  const ctx = execution.create(options, overrides, { started, timeoutMs: plan.timeoutMs, captureEvents: true });
  const { assertActive } = ctx;
  async function captureCheckpoint(step:journeyAPI.Checkpoint,index:number,entry:journeyAPI.Entry) {
    const scope=step.scope||plan.scope; ctx.options={...options,scope,timelineMs:step.timelineMs,observerInstrumentation:step.observerInstrumentation===true}; entry.artifacts=[];
    for(const kind of step.capture) {
      assertActive(); const name=`step-${index}-${kind}`;
      if(options.host==='chrome') {
        let value:import('./chrome-evidence.cjs').Result;
        if(kind==='screenshot') {
          const shot=await (require('./chrome-evidence.cjs') as typeof import('./chrome-evidence.cjs')).collect(ctx,kind,{captureStart:report.captureStart,captureEnd:new Date().toISOString()});value=shot;
          const filename=name+'.png';fs.writeFileSync(path.join(output,filename),shot.binary,{flag:'wx'});
          entry.artifacts.push({filename,sha256:hash(shot.binary),...shot.metadata,requiresPrivacyReview:true});
        } else {value=await (require('./chrome-evidence.cjs') as typeof import('./chrome-evidence.cjs')).collect(ctx,kind,{captureStart:report.captureStart,captureEnd:new Date().toISOString()});entry.artifacts.push(save(name,`Journey Chrome ${kind} checkpoint`,value));}
        if(['failed','unsupported'].includes(value?.collectorStatus as string)) throw Error('Requested checkpoint capability incomplete');
      } else if(kind==='screenshot') {
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
        else if(kind==='storage'||inspectors.domModes.includes(kind as inspectorBrowser.Mode)) value=await inspectors.collect(ctx,kind);
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
    if(options.host!=='chrome') {
      ctx.deviceData=await collectors.device(ctx);ctx.appData=await collectors.app(ctx);
      report.device=redact(ctx.deviceData);report.app=redact(ctx.appData);
    }
    for(const [index,step] of plan.steps.entries()) {
      const begin=Date.now(), entry:journeyAPI.Entry={index,...summarize(step),captureStart:new Date().toISOString(),status:'failed'};
      report.steps.push(entry);checkpoint();
      try {
        ctx.resetSideEffect();
        assertActive();
        if(step.type==='wait') {
          if(step.milliseconds!==undefined) await ctx.pause(step.milliseconds);
          else {
            const until=Date.now()+step.timeoutMs;
            while(true) {
              const c=await ctx.ensureWebview();const result=await c.evaluate(`(${waitProbe.toString()})(${JSON.stringify(step.selector)},${JSON.stringify(step.condition)})`);
              if(Date.now()>until) throw Error('Wait condition not satisfied');
              if((result as {satisfied?:unknown}|null|undefined)?.satisfied===true) break;
              if(Date.now()>=until) throw Error('Wait condition not satisfied');
              await ctx.pause(Math.min(100,Math.max(1,until-Date.now())));
            }
          }
        } else if(step.type==='checkpoint') await captureCheckpoint(step,index,entry);
        else {
          ctx.recordResource=(value:unknown)=>{entry.artifacts??=[];entry.artifacts.push(save('resource-'+index+'-'+entry.artifacts.length,'native App data generation proof',value))};
          if(['launch','restart','data-reset'].includes(step.type)) await ctx.closeTransport();
          if(options.host==='chrome'){entry.outcome='unknown; side effect may have occurred';checkpoint()}
          await (overrides.executeAction||action.execute)(ctx,step);
          if(options.host==='chrome')delete entry.outcome;
        }
        assertActive();entry.status='completed';
      } catch(error) {
        const timeout=ctx.timedOut||(error as ErrorView|null|undefined)?.code==='ETIMEDOUT'||(error as ErrorView|null|undefined)?.killed;
        entry.reason=timeout?'deadline-or-command-timeout':'step-failed';entry.errorContent='omitted';
        const detail = require('./diagnostics.cjs').describe(error);
        if (detail) entry.diagnostic = detail;
        if(options.host==='chrome' && !ctx.actionDispatched)delete entry.outcome;
        if((error as ErrorView|null|undefined)?.notDispatched === true)entry.outcome='not dispatched; guard rejection acknowledged';
        else if(ctx.actionDispatched)entry.outcome='unknown; side effect may have occurred';
        throw error;
      } finally {entry.captureEnd=new Date().toISOString();entry.durationMs=Date.now()-begin;checkpoint()}
    }
    report.status='complete';
  } catch {report.status=report.steps.some(s=>s.status==='completed'||s.artifacts?.length)?'partial':'failed'}
  finally {
    report.cleanup.push(...await ctx.finish());
    if(report.cleanup.some(c=>c.status==='failed')&&report.status==='complete')report.status='partial';
    report.captureEnd=new Date().toISOString();checkpoint();
  }
  return report;
}
const journeyAPI={validate,read,run,waitProbe};
export = journeyAPI;
