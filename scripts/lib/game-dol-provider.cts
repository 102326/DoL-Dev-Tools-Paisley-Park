interface ControlView {domAgrees?:unknown;turns?:unknown;time?:unknown;passage?:unknown;safe?:unknown;reason?:unknown;requiresQuote?:unknown;scrollEligible?:unknown;actionable?:unknown}
interface ActReport {experimental:boolean;operation:unknown;scope:string;status:string;dispatch:string;mapping?:unknown;before?:{passage:unknown;domAgrees:unknown};after?:SceneView|null;reason?:unknown;viewportPreparation?:{scroll:number;gameActions:number;status:string};execution?:unknown;goalProof?:unknown;effectReceipts?:unknown;capabilities?:unknown;invocationCleanup?:string;mappingCleanup?:string;objectCleanup?:string;incidentId?:string;journeyManifest?:string;cleanup?:executionTypes.CleanupResult[]}
interface ObserveReport {experimental:boolean;toolVersion:unknown;incidentId:string;operation:string;actions:boolean;status:string;observedAt:string;cleanup:executionTypes.CleanupResult[];host?:string;app?:unknown;gameplay?:unknown;requiresPrivateReview?:boolean;observation?:unknown;goalProof?:unknown;effectReceipts?:unknown;capabilities?:unknown;reason?:string}
interface WardrobeReport {experimental:boolean;operation:string;scope:string;status:string;dispatch:string;privacy:string;remoteCancellationGuaranteed:boolean;before?:ReturnType<typeof project>;after?:ReturnType<typeof project>;reason?:string;objectCleanup?:string;incidentId?:string;journeyManifest?:string;cleanup?:executionTypes.CleanupResult[]}
import type actionTypes from './action.cjs';
import type executionTypes from './execution-context.cjs';
import type journeyTypes from './journey.cjs';
type Options=actionTypes.Options & {out:string;plan?:boolean;timeoutMs?:number};
// Local property views describe accessed external values, not validated schemas.
interface SemanticView {passage?:unknown;matches?:unknown;blocked?:unknown;entryActionable?:unknown;links?:unknown;location?:unknown;turns?:unknown;time?:unknown}
interface ChoiceView {centerActionable?:unknown;scrollEligible?:unknown;[key:string]:unknown}
interface SceneView {choices:ChoiceView[];domAgrees?:unknown;passage?:unknown;location?:unknown;surface?:unknown;stateReadable?:unknown;source?:unknown}
interface Mapping {action:unknown;interpretation?:unknown;executionBinding?:unknown;projectExperiment?:unknown;operation?:actionTypes.Operation;arguments?:unknown[];source?:string;objectIds?:unknown[];objectGroups?:unknown[];clickReceiverObjectId?:unknown}
interface Overrides extends journeyTypes.Overrides {prepareAction?:(client:executionTypes.BoundClient)=>unknown|Promise<unknown>;bindExecution?:(binding:unknown)=>void;authorizeCostedControl?:(mapping:Mapping|undefined)=>unknown;expectedScene?:unknown;reserve?:()=>void;probeGoal?:(client:executionTypes.BoundClient)=>Promise<unknown>;probeOutcome?:(client:executionTypes.BoundClient)=>Promise<unknown>;probeCapabilities?:(client:executionTypes.BoundClient)=>Promise<unknown>}
interface RemoteView {exceptionDetails?:unknown;result?:{objectId?:unknown;value?:unknown}}
interface ErrorView {code?:unknown;notDispatched?:unknown;operationReason?:unknown}
// Concrete DoL site provider: SugarCube/Mod observations and guarded execution.
// Version and DOM details stay here or in its domain/native contracts.
const fs:typeof import('node:fs') = require('node:fs');
const path:typeof import('node:path') = require('node:path');
const { createHash, randomUUID }:typeof import('node:crypto') = require('node:crypto');
const collectors = (require('./collectors.cjs') as typeof import('./collectors.cjs'));
const execution = (require('./execution-context.cjs') as typeof import('./execution-context.cjs'));
const action = (require('./action.cjs') as typeof import('./action.cjs'));
const journey = (require('./journey.cjs') as typeof import('./journey.cjs'));
const { version } = require('../../package.json') as {version:unknown};
const rootSelector = '#passages > .passage';
const wardrobeSelector = `${rootSelector} a.link-internal[data-passage="Wardrobe"]`;

// Reviewed DoL reader: original SugarCube state, never a UI/Adapter inventory.
// ponytail: only Bedroom -> Wardrobe; add another verified route when a real goal needs it.
const {reader,gameplayReader,controlReader}:typeof import('./browser/game-dol-provider.cjs')=require('./browser/game-dol-provider.cjs');

const expression = () => `(${reader.toString()})()`;
// Explicit local gameplay view. Labels are private decision inputs, not Generic Evidence.

function project(raw:unknown) {
  const value=raw as SemanticView;
  if (!value || !['Bedroom', 'Wardrobe', 'unknown'].includes(value.passage as string) || typeof value.matches !== 'boolean' ||
    typeof value.blocked !== 'boolean' || typeof value.entryActionable !== 'boolean' || !Number.isSafeInteger(value.links) || (value.links as number) < 0 ||
    !['home', 'school', 'town', 'unknown'].includes(value.location as string) ||
    value.turns !== null && !Number.isSafeInteger(value.turns) || value.time !== null && !Number.isFinite(value.time)) throw Error('Invalid semantic observation');
  return { source: 'original SugarCube state and passage DOM', passage: value.passage, location: value.location,
    domAgrees: value.matches, blockingSurface: value.blocked,
    originalStateReadable: value.turns !== null && value.time !== null,
    availableActions: value.passage === 'Bedroom' && value.location === 'home' && value.matches && !value.blocked && value.links === 1 && value.entryActionable &&
      value.turns !== null && value.time !== null ? ['open-wardrobe'] : [] };
}
function guard(raw:unknown) {
  const before=raw as SemanticView;
  if (!project(before).availableActions.includes('open-wardrobe')) throw Error('Unsupported wardrobe entry');
  return `
    const current = (${reader.toString()})();
    const reject = () => ({ok:false, guardRejected:true});
    if (document.querySelector(${JSON.stringify(rootSelector)}) !== observedRoot || !observedRoot.isConnected ||
        current.passage !== 'Bedroom' || current.location !== 'home' || !current.matches || current.blocked || current.links !== 1 || !current.entryActionable ||
        current.turns !== ${JSON.stringify(before.turns)} || current.time !== ${JSON.stringify(before.time)} ||
        node.getAttribute('data-passage') !== 'Wardrobe') return reject();
  `;
}
function validateTarget(options:Options) {
  if(options.host==='chrome'){(require('./host-options.cjs') as typeof import('./host-options.cjs')).chrome(options,{gameplay:options.gameplay===true});if(!options.out)throw Error('Explicit output required');return}
  if (!/^[\w.:-]{1,128}$/.test(options.serial || '') || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(options.package || '') ||
    !options.out || options.targetId !== undefined && !/^[A-Za-z0-9._:-]{1,128}$/.test(options.targetId as string) ||
    options.webviewSocket !== undefined && !/^(?:browser_)?webview_devtools_remote_[0-9]+$/.test(options.webviewSocket as string)) throw Error('Explicit semantic target/output required');
}
function save(out:string, report:unknown) { fs.writeFileSync(path.join(out, 'semantic.json'), JSON.stringify(report, null, 2), { flag: 'wx' }); }
const { intents } = (require('./game-semantic.cjs') as typeof import('./game-semantic.cjs'));
// Known game controls only. This is a reviewed workflow guard, not a sandbox for arbitrary Mod JS.

function stableScene(raw:unknown){
  const scene=raw as SceneView;
  return JSON.stringify({...scene,choices:scene.choices.map(({centerActionable,scrollEligible,...choice})=>choice)});
}
async function act(options:Options, selected:unknown, intent:unknown, overrides:Overrides = {}) {
  // A prepared capability has no raw action until its Provider resolves it.
  // Journey's local seed is never dispatched: prepareAction must replace it
  // with a validated action before any binding or side-effect reservation.
  if (selected === null && typeof overrides.prepareAction === 'function') selected = {type:'web-click',selector:rootSelector};
  validateTarget(options); action.validate(selected);
  if ((selected as {type?:unknown}).type !== 'web-click' || !intents.includes(intent as typeof intents[number])) throw Error('Unsupported gameplay action or intent');
  const windowMs=(require('./game-native-save.cjs') as typeof import('./game-native-save.cjs')).authorized(options.authorization)?120000:30000;
  const plan = { schemaVersion: 1, name: 'gameplay-fragment', timeoutMs: Math.min(windowMs, options.timeoutMs ?? windowMs), steps: [selected] };
  const report:ActReport = { experimental: true, operation: intent, scope: 'one reviewed game action; not overall Goal completion', status: 'replan-required', dispatch: 'not-dispatched' };
  const result = await journey.run(options, { plan, sha256: createHash('sha256').update(JSON.stringify(plan)).digest('hex') }, {
    ...overrides,
    async executeAction(ctx, step) {
      const client = await ctx.ensureWebview(); let objectId:unknown, mapping:Mapping|undefined, invocation:Awaited<ReturnType<typeof import('./game-native-invocation.cjs').bind>>|undefined;
      try {
        if (overrides.prepareAction) {
          mapping = await overrides.prepareAction(client) as Mapping;
          step = action.validate(mapping.action);
          if (!['web-click','web-input'].includes(step.type)) throw Error('Invalid mapped gameplay action');
          report.mapping = mapping.interpretation;
          if(mapping.executionBinding)overrides.bindExecution?.(mapping.executionBinding);
        }
        const bound = await client.send('Runtime.evaluate', { expression: `(() => { const n=document.querySelectorAll(${JSON.stringify(step.selector)}); return n.length===1?n[0]:null; })()`, returnByValue: false }) as RemoteView;
        objectId = bound?.result?.objectId;
        if (!objectId || bound.exceptionDetails) { report.reason = 'target-not-unique'; throw Error('Target unavailable'); }
        if(mapping?.projectExperiment===true){
          const scene=await client.evaluate(`(${gameplayReader.toString()})(${controlReader.toString()})`) as SceneView|null;
          if(!options.projectGoal||!scene?.domAgrees||overrides.expectedScene&&JSON.stringify(scene)!==JSON.stringify(overrides.expectedScene))throw Error('Project Scene/authorization changed');
          report.before={passage:scene.passage,domAgrees:true};
          ctx.webGuard={objectId,operation:mapping.operation,source:`
            if(node!==observedRoot||node!==document.querySelector('#passages > .passage')||
              JSON.stringify((${gameplayReader.toString()})(${controlReader.toString()}))!==${JSON.stringify(JSON.stringify(scene))})return {ok:false,guardRejected:true};
          `};
        }else{
        const raw = await client.send('Runtime.callFunctionOn', { objectId, functionDeclaration: `function() { return (${controlReader.toString()})(this); }`, returnByValue: true }) as RemoteView;
        const before = raw?.result?.value as ControlView|null|undefined;
        if (raw.exceptionDetails || !before || !before.domAgrees || before.turns === null || before.time === null) throw Error('Scene observation unavailable');
        report.before = { passage: before.passage, domAgrees: before.domAgrees };
        const scene=(overrides.expectedScene || (before.scrollEligible && !before.actionable)) ?
          await client.evaluate(`(${gameplayReader.toString()})(${controlReader.toString()})`) : null;
        if(overrides.expectedScene&&JSON.stringify(scene)!==JSON.stringify(overrides.expectedScene)){report.reason='decision-scene-changed';throw Error('Current Scene differs from Decision epoch')}
        if (!before.safe) { report.status = 'blocked'; report.reason = before.reason; throw Error('Hard boundary'); }
        const costAuthorized=overrides.authorizeCostedControl?.(mapping)===true;
        if(before.requiresQuote&&!costAuthorized){report.status='unsupported';report.reason='reviewed-commerce-quote-required';throw Error('Unquoted commerce control')}
        let guardScene=overrides.expectedScene,guardMoney;
        if(!before.actionable&&before.scrollEligible){
          report.viewportPreparation={scroll:0,gameActions:0,status:'failed'};
          try{
            const moneyBefore=await client.evaluate('(()=>{const v=window.SugarCube?.State?.variables?.money;return Number.isFinite(v)?v:null})()');
            if(!Number.isFinite(moneyBefore))throw Error('Money unavailable');
            report.viewportPreparation.scroll=1;
            await client.send('DOM.scrollIntoViewIfNeeded',{objectId});
            const observed=await client.send('Runtime.callFunctionOn',{objectId,functionDeclaration:`function(){const nodes=document.querySelectorAll(${JSON.stringify(step.selector)});return nodes.length===1&&nodes[0]===this?(${controlReader.toString()})(this):null}`,returnByValue:true}) as RemoteView;
            const current=observed?.result?.value as ControlView|null|undefined;
            const afterScene=await client.evaluate(`(${gameplayReader.toString()})(${controlReader.toString()})`);
            const moneyAfter=await client.evaluate('(()=>{const v=window.SugarCube?.State?.variables?.money;return Number.isFinite(v)?v:null})()');
            if(observed?.exceptionDetails||!current||!current.safe||current.requiresQuote||!current.actionable||!current.domAgrees||
              current.passage!==before.passage||current.turns!==before.turns||current.time!==before.time||!Number.isFinite(moneyAfter)||moneyAfter!==moneyBefore||
              stableScene(afterScene)!==stableScene(scene))throw Error('Viewport preparation changed Scene');
            guardScene=afterScene;guardMoney=moneyBefore;
            report.viewportPreparation.status='completed';
          }catch{report.reason='viewport-preparation-failed';throw Error('Viewport preparation failed')}
        }
        else if (!before.actionable) { report.reason = 'target-not-actionable'; throw Error('Target unavailable'); }
        if(step.type==='web-click'&&mapping&&(mapping.clickReceiverObjectId||!mapping.operation))invocation=await (require('./game-native-invocation.cjs') as typeof import('./game-native-invocation.cjs')).bind(client,mapping.clickReceiverObjectId||objectId);
        ctx.webGuard = { objectId, ...(invocation?{invocation}:{}), arguments: mapping?.arguments, ...(mapping?.operation?{operation:mapping.operation}:{}), source: `
          ${guardScene?`if(JSON.stringify((${gameplayReader.toString()})(${controlReader.toString()}))!==${JSON.stringify(JSON.stringify(guardScene))})return {ok:false,guardRejected:true};`:''}
          ${guardMoney===undefined?'':`if(window.SugarCube?.State?.variables?.money!==${JSON.stringify(guardMoney)})return {ok:false,guardRejected:true};`}
          const current=(${controlReader.toString()})(node);
          if(node!==observedRoot || !current.safe || !current.actionable || !current.domAgrees ||
             current.requiresQuote&&${costAuthorized?'false':'true'} ||
             current.passage!==${JSON.stringify(before.passage)} || current.turns!==${JSON.stringify(before.turns)} || current.time!==${JSON.stringify(before.time)})
            return {ok:false,guardRejected:true};
          ${mapping?.source || ''}
        ` };
        }
        const mark = ctx.markSideEffect;
        ctx.markSideEffect = () => { overrides.reserve?.(); mark(); report.dispatch = 'unknown'; };
        try {
          const executed=await action.execute(ctx, step); report.dispatch = 'acknowledged';
          if(executed.execution==='native-operation')report.execution={type:executed.execution,operation:executed.operation};
        }
        catch (error) {
          if ((error as ErrorView).notDispatched) report.dispatch = 'not-dispatched';
          else if (report.dispatch === 'unknown') report.status = 'outcome-undetermined';
          if((error as ErrorView).operationReason)report.reason=(error as ErrorView).operationReason;
          if ((error as ErrorView).code === 'TARGET_USER_CHANGED') { report.status = 'paused'; report.reason = 'Android-user-changed'; }
          throw error;
        }
        finally { ctx.markSideEffect = mark; delete ctx.webGuard; }
        report.after = await client.evaluate(`(${gameplayReader.toString()})(${controlReader.toString()})`) as SceneView|null;
        if (!report.after?.domAgrees) { report.status = 'paused'; report.reason = 'reliable-scene-observation-unavailable'; throw Error('Scene unconfirmed'); }
        if (overrides.probeGoal) report.goalProof = await overrides.probeGoal(client);
        if (overrides.probeOutcome) report.effectReceipts = await overrides.probeOutcome(client);
        if(overrides.probeCapabilities)report.capabilities=await overrides.probeCapabilities(client);
        // A different Passage is normal Gameplay. The caller interprets it and replans.
        report.status = 'observed';
      } catch (error) {
        if ((error as ErrorView).code === 'MAPPING_UNAVAILABLE') { report.status = 'unsupported'; report.reason = 'optional-mapping-unavailable'; }
        if (report.dispatch === 'acknowledged' && !report.after?.domAgrees) { report.status = 'paused'; report.reason = 'reliable-post-action-observation-unavailable'; }
        throw error;
      } finally {
        if(invocation){try{await client.send('Runtime.releaseObject',{objectId:invocation.callableId});report.invocationCleanup='completed'}catch{report.invocationCleanup='failed';report.mappingCleanup='failed'}}
        for (const objectGroup of mapping?.objectGroups || []) {
          try { await client.send('Runtime.releaseObjectGroup', { objectGroup }); }
          catch { report.mappingCleanup = 'failed'; }
        }
        for (const id of mapping?.objectIds || []) {
          try { await client.send('Runtime.releaseObject', { objectId: id }); }
          catch { report.mappingCleanup = 'failed'; }
        }
        if ((mapping?.objectIds?.length || mapping?.objectGroups?.length) && report.mappingCleanup !== 'failed') report.mappingCleanup = 'completed';
        if (objectId) {
          try { await client.send('Runtime.releaseObject', { objectId }); report.objectCleanup = 'completed'; }
          catch { report.objectCleanup = 'failed'; }
        }
      }
    },
  });
  report.incidentId = result.incidentId; report.journeyManifest = 'manifest.json'; report.cleanup = result.cleanup;
  if (options.plan) report.status = 'planned';
  else if (!report.before && !report.reason) { report.status = 'paused'; report.reason = 'reliable-scene-observation-unavailable'; }
  save(options.out, report); return report;
}
async function observe(options:Options, overrides:Overrides = {}) {
  validateTarget(options);
  fs.mkdirSync(options.out);
  const ctx = execution.create(options, overrides, { connectTimeoutMs: 5000,...(options.timeoutMs===undefined?{}:{timeoutMs:options.timeoutMs}) });
  const report:ObserveReport = { experimental: true, toolVersion: version, incidentId: randomUUID(), operation: 'observe',
    actions: false, status: 'failed', observedAt: new Date().toISOString(), cleanup: [] };
  try {
    if (options.expectedUserId !== undefined && (await ctx.adb('shell','am','get-current-user')).toString().trim() !== options.expectedUserId) throw Error('Android user changed');
    if(options.host==='chrome')report.host='chrome';else report.app = await collectors.app(ctx);
    const client = await ctx.ensureWebview();
    if (options.gameplay === true) {
      const scene = await client.evaluate(`(${gameplayReader.toString()})(${controlReader.toString()})`) as SceneView|null;
      if (!scene || !Array.isArray(scene.choices) || scene.choices.length > 64 || typeof scene.domAgrees !== 'boolean') throw Error('Invalid gameplay observation');
      report.gameplay = scene; report.requiresPrivateReview = true;
      report.observation={source:scene.source,passage:scene.passage??'unknown',location:scene.location??'unknown',domAgrees:scene.domAgrees,
        blockingSurface:scene.surface!=='passage',originalStateReadable:scene.stateReadable,availableActions:[]};
    }else report.observation = project(await client.evaluate(expression()));
    if (overrides.probeGoal) report.goalProof = await overrides.probeGoal(client);
    if (overrides.probeOutcome) report.effectReceipts = await overrides.probeOutcome(client);
    if(overrides.probeCapabilities){report.requiresPrivateReview=true;report.capabilities=await overrides.probeCapabilities(client)}
    if (options.expectedUserId !== undefined && (await ctx.adb('shell','am','get-current-user')).toString().trim() !== options.expectedUserId) throw Error('Android user changed');
    report.status = 'observed';
  } catch { report.reason = 'observation-unavailable'; }
  finally {
    report.cleanup.push(...await ctx.finish());
    if (report.cleanup.some(item => item.status === 'failed')) report.status = 'failed';
    save(options.out, report);
  }
  return report;
}
async function openWardrobe(options:Options, overrides:Overrides = {}) {
  validateTarget(options);
  const plan = { schemaVersion: 1, name: 'semantic-open-wardrobe', timeoutMs: 30000, steps: [{ type: 'web-click', selector: wardrobeSelector }] };
  const report:WardrobeReport = { experimental: true, operation: 'open-wardrobe', scope: 'one execution fragment; not overall Goal completion', status: 'replan-required', dispatch: 'not-dispatched',
    privacy: 'game values, inventory, save content and text omitted', remoteCancellationGuaranteed: false };
  const result = await journey.run(options, { plan, sha256: createHash('sha256').update(JSON.stringify(plan)).digest('hex') }, {
    ...overrides,
    async executeAction(ctx, step) {
      const client = await ctx.ensureWebview();
      let before = await client.evaluate(expression()) as SemanticView; report.before = project(before);
      if (before.passage === 'Wardrobe' && before.matches && !before.blocked) { report.status = 'completed'; report.dispatch = 'not-required'; return; }
      if (!report.before.availableActions.includes('open-wardrobe')) { report.status = 'unsupported'; report.reason = 'verified-entry-unavailable'; throw Error('Unsupported entry'); }
      let objectId;
      try {
        const bound = await client.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(rootSelector)})`, returnByValue: false }) as RemoteView;
        objectId = bound?.result?.objectId;
        if (bound?.exceptionDetails || !objectId) throw Error('Root binding unavailable');
        const observation = await client.send('Runtime.callFunctionOn', { objectId,
          functionDeclaration: `function() { if (document.querySelector(${JSON.stringify(rootSelector)}) !== this) return null; return (${reader.toString()})(); }`, returnByValue: true }) as RemoteView;
        if (observation?.exceptionDetails) throw Error('Bound observation failed');
        before = observation?.result?.value as SemanticView; report.before = project(before);
        ctx.webGuard = { objectId, source: guard(before) };
        const mark = ctx.markSideEffect;
        ctx.markSideEffect = () => { mark(); report.dispatch = 'unknown'; };
        try { await action.execute(ctx, step); report.dispatch = 'acknowledged'; }
        catch (error) {
          if ((error as ErrorView).notDispatched === true) { report.dispatch = 'not-dispatched'; report.reason = 'guard-rejected'; }
          else {
            report.reason = report.dispatch === 'unknown' ? 'action-outcome-unknown' : 'target-unavailable';
            if (report.dispatch === 'unknown') report.status = 'outcome-undetermined';
          }
          throw error;
        } finally { ctx.markSideEffect = mark; delete ctx.webGuard; }
        const until = Date.now() + 5000;
        do {
          ctx.assertActive();
          const after = await client.evaluate(expression()) as SemanticView; report.after = project(after);
          if (after.passage === 'Wardrobe' && after.matches && !after.blocked) { report.status = 'completed'; return; }
          if (after.passage !== 'Bedroom' || !after.matches || after.blocked) break;
          await new Promise(resolve => setTimeout(resolve, 100));
        } while (Date.now() < until);
        report.reason = 'original-postcondition-unconfirmed'; throw Error('Postcondition unconfirmed');
      } finally {
        if (objectId) {
          try { await client.send('Runtime.releaseObject', { objectId }); report.objectCleanup = 'completed'; }
          catch { report.objectCleanup = 'failed'; report.status = 'paused'; }
        }
      }
    },
  });
  report.incidentId = result.incidentId; report.journeyManifest = 'manifest.json';
  report.cleanup = result.cleanup;
  if (options.plan) { report.status = 'planned'; report.dispatch = 'not-dispatched'; }
  else if (!report.before) { report.status = 'paused'; report.reason = 'reliable-observation-unavailable'; }
  else if (result.status !== 'complete' && report.status === 'completed') report.status = 'paused';
  save(options.out, report);
  return report;
}
export = { reader, gameplayReader, controlReader, expression, project, guard, observe, openWardrobe, act };
