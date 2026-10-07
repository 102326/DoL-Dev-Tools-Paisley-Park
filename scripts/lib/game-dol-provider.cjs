// Concrete DoL site provider: SugarCube/Mod observations and guarded execution.
// Version and DOM details stay here or in its domain/native contracts.
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const collectors = require('./collectors.cjs');
const execution = require('./execution-context.cjs');
const action = require('./action.cjs');
const journey = require('./journey.cjs');
const { version } = require('../../package.json');
const rootSelector = '#passages > .passage';
const wardrobeSelector = `${rootSelector} a.link-internal[data-passage="Wardrobe"]`;

// Reviewed DoL reader: original SugarCube state, never a UI/Adapter inventory.
// ponytail: only Bedroom -> Wardrobe; add another verified route when a real goal needs it.
function reader() {
  const state = window.SugarCube?.State;
  const roots = document.querySelectorAll('#passages > .passage');
  const known = ['Bedroom', 'Wardrobe'];
  const passage = known.includes(state?.passage) ? state.passage : 'unknown';
  const matches = roots.length === 1 && roots[0].getAttribute('data-passage') === state?.passage;
  const blocked = document.documentElement.classList.contains('ui-open') ||
    [...document.querySelectorAll('.dgu-surface, [aria-modal="true"]')].some(n => {
      const s = getComputedStyle(n), r = n.getBoundingClientRect();
      return n.isConnected && r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility === 'visible';
    });
  const links = document.querySelectorAll('#passages > .passage a.link-internal[data-passage="Wardrobe"]');
  let entryActionable = false;
  if (links.length === 1) {
    const node = links[0], r = node.getBoundingClientRect(), style = getComputedStyle(node);
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (node instanceof HTMLElement && node.isConnected && !node.matches(':disabled, [aria-disabled="true"]') && !node.closest('[inert]') &&
        r.width > 0 && r.height > 0 && x >= 0 && y >= 0 && x < innerWidth && y < innerHeight &&
        style.display !== 'none' && style.visibility === 'visible' && style.opacity !== '0' && style.pointerEvents !== 'none') {
      const hit = document.elementFromPoint(x, y); entryActionable = !!hit && (hit === node || node.contains(hit));
    }
  }
  const turns = Number.isSafeInteger(state?.turns) ? state.turns : null;
  const time = Number.isFinite(state?.variables?.timeStamp) ? state.variables.timeStamp : null;
  return { passage, matches, blocked, links: links.length, entryActionable, turns, time,
    location: ['home', 'school', 'town'].includes(state?.variables?.location) ? state.variables.location : 'unknown' };
}
const expression = () => `(${reader.toString()})()`;
// Explicit local gameplay view. Labels are private decision inputs, not Generic Evidence.
function gameplayReader(controlProbe) {
  const state = window.SugarCube?.State, roots = document.querySelectorAll('#passages > .passage');
  const bounded = value => typeof value === 'string' && value.length <= 128 && !/[\u0000-\u001f]/.test(value) ? value : null;
  const passage = bounded(state?.passage), location = bounded(state?.variables?.location);
  const domAgrees = roots.length === 1 && roots[0].getAttribute('data-passage') === passage && passage !== null;
  const dialog = document.documentElement.classList.contains('ui-open') ? document.querySelector('#ui-dialog-body') : null;
  const surfaces = [...document.querySelectorAll('.dgu-surface, [aria-modal="true"]')].filter(n => {
    const r = n.getBoundingClientRect(), s = getComputedStyle(n);
    return n.isConnected && r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility === 'visible';
  });
  const scope = dialog || (surfaces.length === 1 ? surfaces[0] : roots[0]);
  const nodes = scope ? scope.querySelectorAll('a.link-internal, button, [role="button"], label:has(> input.macro-radiobutton[type="radio"])') : [];
  const choices = [];
  // Explicit private Gameplay context, excluding forms/save lists and never input values.
  let narrative='',narrativeTruncated=false;
  if(scope&&document.createTreeWalker){
    const walker=document.createTreeWalker(scope,4);let n,scannedText=0,visibleText=0;
    while((n=walker.nextNode())){
      // SugarCube emits hundreds of whitespace nodes while evaluating widgets.
      // Keep traversal bounded without charging those against readable context.
      if(++scannedText>4096){narrativeTruncated=true;break}
      const parent=n.parentElement;
      if(!parent||parent.closest('script,style,form,input,textarea,select,#saves,.saveList,.dgs-host,[data-save-slot]'))continue;
      const style=getComputedStyle(parent);if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0')continue;
      const part=(n.textContent||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();if(!part)continue;
      if(++visibleText>256){narrativeTruncated=true;break}
      const joined=(narrative?narrative+' ': '')+part;
      if(joined.length>2048){narrative=joined.slice(0,2048);narrativeTruncated=true;break}narrative=joined;
    }
  }
  function selectorFor(node){
    const parts=[];let n=node;
    while(n&&n!==document.documentElement&&parts.length<16){
      const tag=n.tagName?.toLowerCase(),parent=n.parentElement;if(!/^[a-z][a-z0-9-]*$/.test(tag||'')||!parent)return null;
      const index=Array.prototype.indexOf.call(parent.children,n);if(index<0)return null;parts.unshift(tag+':nth-child('+(index+1)+')');n=parent;
    }
    if(n!==document.documentElement)return null;const selector='html > '+parts.join(' > ');
    return selector.length<=256&&document.querySelectorAll(selector).length===1?selector:null;
  }
  // Do not read passage body, input contents, save objects, inventory or credentials.
  let scanned = 0;
  for (let i = 0; i < Math.min(nodes.length, 512) && choices.length < 64; i++) {
    scanned++;
    const node = nodes[i], r = node.getBoundingClientRect(), style = getComputedStyle(node);
    if(node.tagName==='LABEL'&&(state?.variables?.combat!==1||node.querySelectorAll('input').length!==1||node.querySelector('select,textarea')||node.closest('form')))continue;
    if (!node.isConnected || r.width <= 0 || r.height <= 0 || style.display === 'none' || style.visibility !== 'visible' || style.opacity === '0') continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementFromPoint(x, y) : null;
    const rawLabel = node.getAttribute('aria-label') || node.textContent || '';
    const control=controlProbe?.(node);
    choices.push({ index: i, selector:selectorFor(node),safe:control?.safe===true,requiresQuote:control?.requiresQuote===true,riskReason:control?.reason??null,tag: node.tagName.toLowerCase(), label: rawLabel.trim().slice(0, 160), labelTruncated: rawLabel.trim().length > 160,
      destination: bounded(node.getAttribute('data-passage')),
      linkDestinationKind: node.getAttribute('href') ? node.getAttribute('href').startsWith('#') ? 'fragment' : 'requires-review' : 'not-present',
      credentialForm: !!node.closest('form')?.querySelector('input[type="password"]'),
      scrollEligible: control?.scrollEligible===true,
      centerActionable: control ? control.actionable===true : node.isConnected && !node.matches(':disabled, [aria-disabled="true"]') && !node.closest('[inert]') &&
        r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility === 'visible' && style.opacity !== '0' &&
        style.pointerEvents !== 'none' && !!hit && (hit === node || node.contains(hit)) });
  }
  return { source: 'original game state and current visible control metadata; choices require Agent interpretation', passage, location, domAgrees, turns:state?.turns??null,time:state?.variables?.timeStamp??null,
    surface: dialog ? 'sugarcube-dialog' : surfaces.length === 1 ? 'overlay' : surfaces.length > 1 ? 'ambiguous-overlays' : 'passage',
    narrative,narrativeTruncated,choices, choicesTruncated: scanned < nodes.length, candidateControls: nodes.length, scannedControls: scanned,
    stateReadable: Number.isSafeInteger(state?.turns) && Number.isFinite(state?.variables?.timeStamp),
    privacy: 'private bounded visible gameplay context and labels; no save body, input value or inventory' };
}
function project(value) {
  if (!value || !['Bedroom', 'Wardrobe', 'unknown'].includes(value.passage) || typeof value.matches !== 'boolean' ||
    typeof value.blocked !== 'boolean' || typeof value.entryActionable !== 'boolean' || !Number.isSafeInteger(value.links) || value.links < 0 ||
    !['home', 'school', 'town', 'unknown'].includes(value.location) ||
    value.turns !== null && !Number.isSafeInteger(value.turns) || value.time !== null && !Number.isFinite(value.time)) throw Error('Invalid semantic observation');
  return { source: 'original SugarCube state and passage DOM', passage: value.passage, location: value.location,
    domAgrees: value.matches, blockingSurface: value.blocked,
    originalStateReadable: value.turns !== null && value.time !== null,
    availableActions: value.passage === 'Bedroom' && value.location === 'home' && value.matches && !value.blocked && value.links === 1 && value.entryActionable &&
      value.turns !== null && value.time !== null ? ['open-wardrobe'] : [] };
}
function guard(before) {
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
function validateTarget(options) {
  if (!/^[\w.:-]{1,128}$/.test(options.serial || '') || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(options.package || '') ||
    !options.out || options.targetId !== undefined && !/^[A-Za-z0-9._:-]{1,128}$/.test(options.targetId) ||
    options.webviewSocket !== undefined && !/^(?:browser_)?webview_devtools_remote_[0-9]+$/.test(options.webviewSocket)) throw Error('Explicit semantic target/output required');
}
function save(out, report) { fs.writeFileSync(path.join(out, 'semantic.json'), JSON.stringify(report, null, 2), { flag: 'wx' }); }
const { intents } = require('./game-semantic.cjs');
// Known game controls only. This is a reviewed workflow guard, not a sandbox for arbitrary Mod JS.
function controlReader(node) {
  const state = window.SugarCube?.State, roots = document.querySelectorAll('#passages > .passage');
  const label = (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 256);
  const href = node.getAttribute('href');
  const saveContext = !!node.closest('#saves, .dgs-host, .dgs-shell, .dgs-layout, .saveList, [data-save-slot]');
  const saveRead = node.matches('.dgs-load, .loadButton, .load, .dgs-item:not(.dgs-empty-slot), .ui-close') || /^(读取|加载|Load|取消|Cancel|关闭|Close)$/i.test(label);
  const destructive = node.matches('.deleteButton, .saveButton, .dgs-delete, [data-action="delete-save"], [data-action="overwrite-save"]') ||
    /(?:删除|覆盖|清空|Delete|Overwrite).{0,20}(?:存档|Save)|(?:存档|Save).{0,20}(?:删除|覆盖|清空|Delete|Overwrite)/i.test(label) || saveContext && !saveRead;
  const external = !!href && !href.startsWith('#') && !/^javascript:void\(0\);?$/.test(href);
  const credentials = !!node.closest('form')?.querySelector('input[type="password"]');
  const requiresQuote=!!node.closest('#buy-send-home,#buy-and-wear,.buy-button,[data-action="buy"],[data-action="sell"]');
  const gameControl = !!node.closest('#passages, #ui-dialog, #ui-bar, .dgu-surface');
  const r = node.getBoundingClientRect(), style = getComputedStyle(node), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementFromPoint(x, y) : null;
  const dialogOpen=document.documentElement.classList.contains('ui-open');
  const dialog = dialogOpen ? document.querySelector('#ui-dialog-body') : null;
  const surfaces = [...document.querySelectorAll('.dgu-surface, [aria-modal="true"]')].filter(n => {
    const rect=n.getBoundingClientRect(), s=getComputedStyle(n);
    return n.isConnected && rect.width>0 && rect.height>0 && s.display!=='none' && s.visibility==='visible';
  });
  const scope=dialogOpen ? dialog : surfaces.length===1 ? surfaces[0] : surfaces.length===0 ? roots[0] : null;
  let ancestorsVisible=true;
  for(let ancestor=node;ancestor;ancestor=ancestor.parentElement){
    const s=getComputedStyle(ancestor);
    if(s.display==='none'||s.visibility!=='visible'||s.opacity==='0'||s.pointerEvents==='none'){ancestorsVisible=false;break}
  }
  const scrollEligible=node.isConnected && roots.length===1 && scope?.contains(node)===true &&
    !node.matches(':disabled, [aria-disabled="true"]') && !node.closest('[inert]') && ancestorsVisible &&
    Number.isFinite(x) && Number.isFinite(y) && r.width>0 && r.height>0 &&
    (x<0||y<0||x>=innerWidth||y>=innerHeight);
  return { passage: typeof state?.passage === 'string' && state.passage.length <= 128 ? state.passage : null,
    domAgrees: roots.length === 1 && roots[0].getAttribute('data-passage') === state?.passage,
    turns: Number.isSafeInteger(state?.turns) ? state.turns : null, time: Number.isFinite(state?.variables?.timeStamp) ? state.variables.timeStamp : null,
    safe: gameControl && !destructive && !external && !credentials,requiresQuote,scrollEligible,
    reason: destructive ? 'save-write-or-destruction' : external ? 'external-system' : credentials ? 'credentials' : !gameControl ? 'unverified-game-control' : null,
    actionable: node.isConnected && roots.length===1 && scope?.contains(node)===true && ancestorsVisible && !node.matches(':disabled, [aria-disabled="true"]') && !node.closest('[inert]') && r.width > 0 && r.height > 0 &&
      style.display !== 'none' && style.visibility === 'visible' && style.opacity !== '0' && style.pointerEvents !== 'none' && !!hit && (hit === node || node.contains(hit)) };
}
function stableScene(scene){
  return JSON.stringify({...scene,choices:scene.choices.map(({centerActionable,scrollEligible,...choice})=>choice)});
}
async function act(options, selected, intent, overrides = {}) {
  // A prepared capability has no raw action until its Provider resolves it.
  // Journey's local seed is never dispatched: prepareAction must replace it
  // with a validated action before any binding or side-effect reservation.
  if (selected === null && typeof overrides.prepareAction === 'function') selected = {type:'web-click',selector:rootSelector};
  validateTarget(options); action.validate(selected);
  if (selected.type !== 'web-click' || !intents.includes(intent)) throw Error('Unsupported gameplay action or intent');
  const plan = { schemaVersion: 1, name: 'gameplay-fragment', timeoutMs: Math.min(30000, options.timeoutMs ?? 30000), steps: [selected] };
  const report = { experimental: true, operation: intent, scope: 'one reviewed game action; not overall Goal completion', status: 'replan-required', dispatch: 'not-dispatched' };
  const result = await journey.run(options, { plan, sha256: createHash('sha256').update(JSON.stringify(plan)).digest('hex') }, {
    ...overrides,
    async executeAction(ctx, step) {
      const client = await ctx.ensureWebview(); let objectId, mapping;
      try {
        if (overrides.prepareAction) {
          mapping = await overrides.prepareAction(client);
          step = action.validate(mapping.action);
          if (!['web-click','web-input'].includes(step.type)) throw Error('Invalid mapped gameplay action');
          report.mapping = mapping.interpretation;
          if(mapping.executionBinding)overrides.bindExecution?.(mapping.executionBinding);
        }
        const bound = await client.send('Runtime.evaluate', { expression: `(() => { const n=document.querySelectorAll(${JSON.stringify(step.selector)}); return n.length===1?n[0]:null; })()`, returnByValue: false });
        objectId = bound?.result?.objectId;
        if (!objectId || bound.exceptionDetails) { report.reason = 'target-not-unique'; throw Error('Target unavailable'); }
        const raw = await client.send('Runtime.callFunctionOn', { objectId, functionDeclaration: `function() { return (${controlReader.toString()})(this); }`, returnByValue: true });
        const before = raw?.result?.value;
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
            const observed=await client.send('Runtime.callFunctionOn',{objectId,functionDeclaration:`function(){const nodes=document.querySelectorAll(${JSON.stringify(step.selector)});return nodes.length===1&&nodes[0]===this?(${controlReader.toString()})(this):null}`,returnByValue:true});
            const current=observed?.result?.value;
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
        ctx.webGuard = { objectId, arguments: mapping?.arguments, ...(mapping?.operation?{operation:mapping.operation}:{}), source: `
          ${guardScene?`if(JSON.stringify((${gameplayReader.toString()})(${controlReader.toString()}))!==${JSON.stringify(JSON.stringify(guardScene))})return {ok:false,guardRejected:true};`:''}
          ${guardMoney===undefined?'':`if(window.SugarCube?.State?.variables?.money!==${JSON.stringify(guardMoney)})return {ok:false,guardRejected:true};`}
          const current=(${controlReader.toString()})(node);
          if(node!==observedRoot || !current.safe || !current.actionable || !current.domAgrees ||
             current.requiresQuote&&${costAuthorized?'false':'true'} ||
             current.passage!==${JSON.stringify(before.passage)} || current.turns!==${JSON.stringify(before.turns)} || current.time!==${JSON.stringify(before.time)})
            return {ok:false,guardRejected:true};
          ${mapping?.source || ''}
        ` };
        const mark = ctx.markSideEffect;
        ctx.markSideEffect = () => { overrides.reserve?.(); mark(); report.dispatch = 'unknown'; };
        try {
          const executed=await action.execute(ctx, step); report.dispatch = 'acknowledged';
          if(executed.execution==='native-operation')report.execution={type:executed.execution,operation:executed.operation};
        }
        catch (error) {
          if (error.notDispatched) report.dispatch = 'not-dispatched';
          else if (report.dispatch === 'unknown') report.status = 'outcome-undetermined';
          if(error.operationReason)report.reason=error.operationReason;
          if (error.code === 'TARGET_USER_CHANGED') { report.status = 'paused'; report.reason = 'Android-user-changed'; }
          throw error;
        }
        finally { ctx.markSideEffect = mark; delete ctx.webGuard; }
        report.after = await client.evaluate(`(${gameplayReader.toString()})(${controlReader.toString()})`);
        if (!report.after?.domAgrees) { report.status = 'paused'; report.reason = 'reliable-scene-observation-unavailable'; throw Error('Scene unconfirmed'); }
        if (overrides.probeGoal) report.goalProof = await overrides.probeGoal(client);
        if (overrides.probeOutcome) report.effectReceipts = await overrides.probeOutcome(client);
        if(overrides.probeCapabilities)report.capabilities=await overrides.probeCapabilities(client);
        // A different Passage is normal Gameplay. The caller interprets it and replans.
        report.status = 'observed';
      } catch (error) {
        if (error.code === 'MAPPING_UNAVAILABLE') { report.status = 'unsupported'; report.reason = 'optional-mapping-unavailable'; }
        if (report.dispatch === 'acknowledged' && !report.after?.domAgrees) { report.status = 'paused'; report.reason = 'reliable-post-action-observation-unavailable'; }
        throw error;
      } finally {
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
async function observe(options, overrides = {}) {
  validateTarget(options);
  fs.mkdirSync(options.out);
  const ctx = execution.create(options, overrides, { connectTimeoutMs: 5000,...(options.timeoutMs===undefined?{}:{timeoutMs:options.timeoutMs}) });
  const report = { experimental: true, toolVersion: version, incidentId: randomUUID(), operation: 'observe',
    actions: false, status: 'failed', observedAt: new Date().toISOString(), cleanup: [] };
  try {
    if (options.expectedUserId !== undefined && (await ctx.adb('shell','am','get-current-user')).toString().trim() !== options.expectedUserId) throw Error('Android user changed');
    report.app = await collectors.app(ctx);
    const client = await ctx.ensureWebview();
    if (options.gameplay === true) {
      const scene = await client.evaluate(`(${gameplayReader.toString()})(${controlReader.toString()})`);
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
async function openWardrobe(options, overrides = {}) {
  validateTarget(options);
  const plan = { schemaVersion: 1, name: 'semantic-open-wardrobe', timeoutMs: 30000, steps: [{ type: 'web-click', selector: wardrobeSelector }] };
  const report = { experimental: true, operation: 'open-wardrobe', scope: 'one execution fragment; not overall Goal completion', status: 'replan-required', dispatch: 'not-dispatched',
    privacy: 'game values, inventory, save content and text omitted', remoteCancellationGuaranteed: false };
  const result = await journey.run(options, { plan, sha256: createHash('sha256').update(JSON.stringify(plan)).digest('hex') }, {
    ...overrides,
    async executeAction(ctx, step) {
      const client = await ctx.ensureWebview();
      let before = await client.evaluate(expression()); report.before = project(before);
      if (before.passage === 'Wardrobe' && before.matches && !before.blocked) { report.status = 'completed'; report.dispatch = 'not-required'; return; }
      if (!report.before.availableActions.includes('open-wardrobe')) { report.status = 'unsupported'; report.reason = 'verified-entry-unavailable'; throw Error('Unsupported entry'); }
      let objectId;
      try {
        const bound = await client.send('Runtime.evaluate', { expression: `document.querySelector(${JSON.stringify(rootSelector)})`, returnByValue: false });
        objectId = bound?.result?.objectId;
        if (bound?.exceptionDetails || !objectId) throw Error('Root binding unavailable');
        const observation = await client.send('Runtime.callFunctionOn', { objectId,
          functionDeclaration: `function() { if (document.querySelector(${JSON.stringify(rootSelector)}) !== this) return null; return (${reader.toString()})(); }`, returnByValue: true });
        if (observation?.exceptionDetails) throw Error('Bound observation failed');
        before = observation?.result?.value; report.before = project(before);
        ctx.webGuard = { objectId, source: guard(before) };
        const mark = ctx.markSideEffect;
        ctx.markSideEffect = () => { mark(); report.dispatch = 'unknown'; };
        try { await action.execute(ctx, step); report.dispatch = 'acknowledged'; }
        catch (error) {
          if (error.notDispatched === true) { report.dispatch = 'not-dispatched'; report.reason = 'guard-rejected'; }
          else {
            report.reason = report.dispatch === 'unknown' ? 'action-outcome-unknown' : 'target-unavailable';
            if (report.dispatch === 'unknown') report.status = 'outcome-undetermined';
          }
          throw error;
        } finally { ctx.markSideEffect = mark; delete ctx.webGuard; }
        const until = Date.now() + 5000;
        do {
          ctx.assertActive();
          const after = await client.evaluate(expression()); report.after = project(after);
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
module.exports = { reader, gameplayReader, controlReader, expression, project, guard, observe, openWardrobe, act };
