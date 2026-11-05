// CLI projections remain separate from the lazily loaded production owners.
interface StatusView {status:string}
interface TargetView {type?:unknown;id?:unknown;title?:unknown;webSocketDebuggerUrl?:unknown}
interface Options { [key:string]:unknown; 'target-id'?:string;'webview-socket'?:string;'integration-file'?:string;'authorization-file'?:string;'host-file'?:string; out?:string;file?:string;golden?:string;current?:string;scope?:string;endpoint?:string;from?:string;before?:string;after?:string;goal?:string;operation?:string;host?:string;integration?:string;serial?:string;package?:string;input?:string;label?:string;snapshots?:string;mode?:string;region?:string;tolerance?:string;milliseconds?:string;seconds?:string;resume?:string|boolean;deep?:boolean;full?:boolean;plan?:boolean;sensitive?:string|boolean;inspectors?:string|string[];targetId?:string;webviewSocket?:string;testEnvironment?:boolean;exclusiveMetrics?:boolean;exclusiveNetwork?:boolean;webPerformance?:boolean;windowMs?:number;profile?:string;samples?:number;intervalMs?:number;seriesWebview?:boolean;allowHelper?:boolean;timelineMs?:number;observerInstrumentation?:boolean;deepSeconds?:number;bugreport?:boolean;logcatSeconds?:number;recordSeconds?:number;authorization?:unknown }
const fs:typeof import('node:fs') = require('node:fs');
const path:typeof import('node:path') = require('node:path');
const { randomUUID, createHash }:typeof import('node:crypto') = require('node:crypto');
const { evidence } = require('./lib/evidence.cjs') as typeof import('./lib/evidence.cjs');
const { evaluate } = require('./adb-evaluate.cjs') as typeof import('./adb-evaluate.cjs');
const dom = require('./lib/dom.cjs') as typeof import('./lib/dom.cjs');
const css = require('./lib/css.cjs') as typeof import('./lib/css.cjs');
const environment = require('./lib/environment.cjs') as typeof import('./lib/environment.cjs');
const timeline = require('./lib/timeline.cjs') as typeof import('./lib/timeline.cjs');
const inspectors = require('./lib/inspectors.cjs') as typeof import('./lib/inspectors.cjs');
const { redact } = require('./lib/privacy.cjs') as typeof import('./lib/privacy.cjs');
const { doctor } = require('./lib/doctor.cjs') as typeof import('./lib/doctor.cjs');
const { support } = require('./lib/support.cjs') as typeof import('./lib/support.cjs');
const { version, displayName, releaseName } = require('../package.json');
const help = `${displayName} ${version}${releaseName ? ' — '+releaseName : ''} (local development and diagnostics)
  --version
  pc-start --file ABS_HTML --chrome ABS_CHROME --port PORT --mode visible|headless --out NEW_DIR [--resources ABS_MANIFEST] [--resume-from ABS_OLD_HOST_JSON] [--allow-resource-update yes]
    Selected files only; loopback HTTP and owned Chrome. Keep this process running; Ctrl+C closes only its resources. Profiles are retained.
  pc-pages --host-file ABS_HOST_JSON
  pc-bind --host-file ABS_HOST_JSON --target-id ID --url EXACT_URL --out NEW_HOST_JSON
    Select an explicit page/new document in the same owned browser and origin; old effects are never settled.
  pc-observe --host-file ABS_HOST_JSON --out NEW_DIR [--scope SELECTOR] [--probe ABS_REVIEWED_JS]
  pc-action --host-file ABS_HOST_JSON --file ABS_ACTION_JSON --out NEW_DIR --test-environment yes [--scope SELECTOR] [--probe ABS_REVIEWED_JS]
    Debug Web Action and local evidence only; no business Outcome inference, durable GER or automatic replay. See docs/PC_RUNTIME.md.
  game-goal-start --file REVIEWED_GOAL_JSON --serial SERIAL --package PACKAGE --out NEW_DIR --test-environment yes
    Chrome: --host chrome --host-file ABS_HOST_JSON [--store ABS_SQLITE]; Session keeps the original document, never adopts a new binding.
    Native Gameplay Goals: reach-passage, native-state conditions, or native-knowledge membership with optional return Passage; clothing Goals belong to a domain provider.
  game-goal-step --goal GOAL_DIR --test-environment yes [--file REVIEWED_ACTION_JSON --intent navigation|dialogue|combat|buy|sell|equip|unequip|sleep|menu|settings|load-save|experiment|save|delete-save]
    Gameplay: reviewed native navigation/activity/combat selection; dol-shop browse/return/buy-one, native simple-head or optional sw-wardrobe. Host Agent supplies Decisions. No file: observe/check original Goal state.
    Unknown results stay pending until a reviewed terminal Outcome reader verifies closure and original effects.
    --store ABSOLUTE_SQLITE selects an isolated Store at start; normal use shares the local target ledger. --resume yes renews the binding at step.
  game-goal-status --goal GOAL_DIR
  game-session --goal GOAL_DIR --operation request|propose|dispatch|resume|reconcile|checkpoint|cancel|status [--file PROPOSAL_OR_CHECKPOINT_JSON] [--test-environment yes]
  game-observe --serial SERIAL --package PACKAGE --out NEW_DIR [--target-id ID] [--gameplay yes] [--shop yes]
    Gameplay view adds private bounded visible context and choice labels for Agent interpretation/replanning, never save bodies or input values.
  game-open-wardrobe --serial SERIAL --package PACKAGE --out NEW_DIR --test-environment yes [--plan]
    Gameplay: verified Bedroom entry only; original controls, no direct inventory/save writes or automatic retry.
  evidence --serial SERIAL --package PACKAGE --out NEW_DIR [--scope SELECTOR] [--window-ms 1000] [--integration soft-and-wet]
    Chrome: --host chrome --host-file ABS_HOST_JSON; omit serial/package. Optional --web-performance yes.
    Optional: --logcat-seconds 30 --record-seconds 10 --repro NOTE_JSON --integration-file REVIEWED_LOCAL.cjs
    Optional: --css yes --environment yes --target-id ID --webview-socket VERIFIED_PID_SOCKET
    Optional: --timeline-ms 1000 --scope SELECTOR [--observer-instrumentation yes]
    Optional: --inspectors selector-health,accessibility,overlays,scroll,ownership,hitboxes --storage yes
  action | journey --file LOCAL_JSON --serial SERIAL --package PACKAGE --out NEW_DIR --test-environment yes
    Optional: --authorization-file HOST_GRANTED_SCOPE_JSON --store ORIGINAL_SHARED_SQLITE
    data-reset clears scoped App data and records native generation proof; no Store/TargetKey substitution.
  source-find --root REVIEWED_ABSOLUTE_SOURCE --file QUERY_JSON --out NEW_JSON [--revision REVIEWED_REF]
    Read-only source candidates: Passage/widget/text/selector/event/symbol/path; no device or Goal.
    Query schema: schemas/source-find-query-v1.schema.json. Partial results are written with exit code 2.
  inspect --endpoint LOCAL_HTTP_CDP --out NEW_JSON
  environment --serial SERIAL --package PACKAGE --out NEW_DIR [--target-id ID]
  capture --serial SERIAL --package PACKAGE --out NEW_DIR
  perf --serial SERIAL --package PACKAGE --out NEW_DIR
  logcat --serial SERIAL --package PACKAGE --out NEW_DIR [--seconds N]
  record --serial SERIAL --package PACKAGE --out NEW_DIR [--seconds N]
  perf --deep --serial SERIAL --package PACKAGE --out NEW_DIR --seconds 10 --sensitive yes
  perf-series --serial SERIAL --package PACKAGE --out NEW_DIR --samples 3 --interval-ms 1000 [--webview yes]
  bugreport --serial SERIAL --package PACKAGE --out NEW_DIR --sensitive yes
  native-layout --serial SERIAL --package PACKAGE --out NEW_DIR --allow-helper yes
  process-memory --serial SERIAL --package PACKAGE --out NEW_DIR
  app-lifecycle --serial SERIAL --package PACKAGE --out NEW_DIR
  app-lifecycle-diff --before SNAPSHOT_JSON --after SNAPSHOT_JSON --out NEW_JSON
  evidence --full --serial SERIAL --package PACKAGE --out NEW_DIR --sensitive yes [other evidence options]
  doctor --out NEW_JSON [--serial SERIAL --package PACKAGE] [--endpoint LOCAL_CDP_URL]
  support --from EVIDENCE_DIR --out NEW_DIR [--include-screenshot yes]
  evidence-compare --before EVIDENCE_DIR --after EVIDENCE_DIR --out NEW_DIR
  issue-report --from EVIDENCE_OR_SUPPORT_DIR --out NEW_DIR
  evidence-timeline --from EVIDENCE_OR_JOURNEY_DIR --out NEW_DIR
  known-good --from COMPLETE_EVIDENCE_DIR --out NEW_DIR [--label SLUG] [--snapshots dom-contract,css-contract,environment,storage]
  visual-diff --golden PNG --current PNG --out NEW_DIR [--tolerance 8] [--region x,y,width,height]
  dom-snapshot --endpoint http://127.0.0.1:PORT --scope SELECTOR --out NEW_JSON
  dom-diff --before JSON --after JSON --out NEW_JSON
  css-snapshot --endpoint LOCAL_HTTP_CDP --scope SELECTOR --out NEW_JSON [--target-id ID]
  css-diff | environment-diff --before JSON --after JSON --out NEW_JSON
  timeline --endpoint LOCAL_HTTP_CDP --scope SELECTOR --milliseconds 1000 --out NEW_JSON [--observer-instrumentation yes]
  dom-inspect --mode selector-health|accessibility|overlays|scroll|ownership|hitboxes --endpoint LOCAL_HTTP_CDP --scope SELECTOR --out NEW_JSON
  storage-snapshot --endpoint LOCAL_HTTP_CDP --out NEW_JSON
  storage-diff --before JSON --after JSON --out NEW_JSON
  action | journey --file REVIEWED_JSON --serial SERIAL --package PACKAGE --out NEW_DIR --test-environment yes
    Chrome: --host chrome --host-file ABS_HOST_JSON --out NEW_DIR --test-environment yes
    --plan creates a static plan only; --target-id and --webview-socket are optional Android target overrides
  journey-record --endpoint LOCAL_HTTP_CDP --scope SELECTOR --milliseconds 1000 --out NEW_JSON
  matrix --file REVIEWED_JSON --out NEW_DIR --test-environment yes [--plan]
  animation-frames --input LOCAL_MP4_OR_WEBM --out NEW_DIR [--interval-ms 250] [--max-frames 30]
  network-scenario --file REVIEWED_JSON --endpoint LOCAL_CDP --out NEW_DIR --test-environment yes --exclusive-network yes [--plan]
  leak-probe --endpoint LOCAL_CDP --out NEW_JSON [--detached yes] [--target-id ID]
  viewport-matrix --file REVIEWED_JSON --endpoint LOCAL_CDP --out NEW_DIR --test-environment yes --exclusive-metrics yes [--plan]
  hitbox-overlay --input HITBOX_JSON --out NEW_SVG [--minimum-css-px 44]
  install-skill --out NEW_SKILL_DIRECTORY_NAMED_dol-dev-tools-paisley-park
Evidence creates and removes a temporary ADB forward for the explicit app process.
Default evidence collectors do not install APKs, perform business actions, read save bodies or repair the environment. Native layout requires explicit --allow-helper yes and may run/install the existing Android CLI helper. Action/Journey are separate explicit operations. Parent directory must exist.
Integration files execute reviewed local code with Node permissions; worker isolation is not a security sandbox.
Screenshot is private; review before sharing. Console text and network bodies/paths are omitted.`;
function parse(args:string[], allowed:string[]) {
  const options:Options = Object.create(null);
  while (args.length) {
    const flag = args.shift()!;
    if (flag === '--seconds' && !allowed.includes(flag)) throw Object.assign(Error('Option not applicable'),{code:'CLI_OPTION_NOT_APPLICABLE'});
    if (['--deep','--full','--plan'].includes(flag) && allowed.includes(flag) && !Object.hasOwn(options,flag.slice(2))) { options[flag.slice(2)] = true; continue; }
    if (!allowed.includes(flag) || Object.hasOwn(options, flag.slice(2)) || !args.length) throw Object.assign(new Error('Unknown, duplicate or incomplete option'),{code:'INVALID_CLI_ARGUMENTS'});
    options[flag.slice(2)] = args.shift();
  }
  return options;
}
function errorMessage(value:unknown) {
  const error=value as {code?:unknown;cliOperation?:unknown}|null;
  const detail = (require('./lib/diagnostics.cjs') as typeof import('./lib/diagnostics.cjs')).describe(error);
  if (detail) return `[${detail.code} stage=${detail.stage}] ${detail.method?'method='+detail.method+'; ':''}${detail.field?'field='+detail.field+': ':''}${detail.reason?'reason='+detail.reason+'; ':''}${detail.hint}`;
  const known:Record<string,[string,string]>={
    PC_INPUT_INVALID:['pc.validate','Review explicit absolute inputs, owned host file and command help. Private input omitted.'],
    PC_RESOURCES_INVALID:['pc.resources','Select reviewed HTML and a bounded explicit resource manifest; see docs/PC_RUNTIME.md.'],
    PC_LAUNCH_INVALID:['pc.launch','Use an installed absolute Chrome executable, visible/headless mode and the owned HTTP instance.'],
    PC_LAUNCH_FAILED:['pc.launch','Owned Chrome startup did not complete. Inspect this instance local logs; do not use a personal profile.'],
    PC_TARGET_UNAVAILABLE:['pc.target','Read pc-pages, select exact target ID and URL, then pc-bind. No replacement page was adopted.'],
    PC_BROWSER_UNAVAILABLE:['pc.browser','The original owned browser is unavailable. Inspect its instance records; no other browser will be adopted.'],
    PC_BROWSER_IDENTITY_CHANGED:['pc.browser','Live browser, debug endpoint or Profile identity differs from the owned record. Preserve records and select the original instance.'],
    PC_DOCUMENT_CHANGED:['pc.document','Old document binding is invalid. Observe current pages and explicitly pc-bind a new document; preserve original uncertain actions.'],
    PC_RESUME_IDENTITY_CHANGED:['pc.resume','Keep the same origin and resource inventory; reviewed source edits can use --allow-resource-update yes with --resume-from. Preserve the old Profile and confirm the actually loaded version.'],
    PC_PROFILE_IN_USE:['pc.resume','The previous owned browser or endpoint may still be running. Close it before resuming; no profile was taken over.'],
    PC_STOP_UNCONFIRMED:['pc.cleanup','Browser termination was not confirmed. Retain its Profile and local records; inspect this instance before reusing it.'],
    PC_ACTION_UNSUPPORTED:['pc.action','Chrome supports reviewed Web actions. Native Android actions require their explicit Android target; see docs/PC_RUNTIME.md.'],
    GAMEPLAY_RUNTIME_UNAVAILABLE:['runtime.prerequisites','Gameplay Runtime requires XState and Node SQLite. Use Node.js 26+ and run npm ci --ignore-scripts --no-audit --no-fund in the Tools root. Generic diagnostics remain available.'],
    INVALID_CLI_ARGUMENTS:['cli.parse','Unknown, duplicate or incomplete option; use --help. Supplied arguments omitted.'],
    UNSUPPORTED_CHECKPOINT_NAME:['journey.validate','field=name: Action/Journey checkpoints do not accept name. See docs/ACTIONS.md.'],
    CLI_OPTION_NOT_APPLICABLE:['cli.validate','field=seconds: omit --seconds for this command. Use logcat, record or perf --deep for supported timed collection; see --help.'],
    SKILL_TARGET_EXISTS:['install.preflight','field=out: Existing target preserved. Select a target path that does not exist and is named dol-dev-tools-paisley-park; see docs/SKILL_INSTALL.md.'],
    INVALID_SKILL_TARGET:['install.preflight','field=out: Select a target path that does not exist and is named dol-dev-tools-paisley-park; see docs/SKILL_INSTALL.md.'],
    SKILL_SOURCE_INCOMPLETE:['install.preflight','Required Skill source files are missing, unreadable or invalid. Recheck the complete toolkit from its verified package; no installation was published.'],
    SKILL_INSTALL_FAILED:['install.write','Installation failed; owned temporary files were removed. Check local directory permissions/filesystem support and retry an unused target; existing installations remain protected.'],
    SKILL_INSTALL_INCOMPLETE:['install.cleanup','Installation failed and some paths could not be safely removed. Preserve the target and unknown leftovers; retry a different unused parent path. See docs/SKILL_INSTALL.md.'],
    ETIMEDOUT:['command.timeout','Operation timed out; this is not proof of device failure or remote cancellation. Check the original target and execution evidence. Do not blindly replay an operation that may have been dispatched.'],
  };
  const code=typeof error?.code==='string'&&Object.hasOwn(known,error.code)?error.code:'COMMAND_FAILED';
  const stage=['request','propose','dispatch','resume','reconcile','checkpoint','cancel','status'].includes(error?.cliOperation as string)?'game-session.'+error!.cliOperation:'command';
  const [where,message]=known[code]??[stage,'Command failed. Check arguments, target availability and output protection; cause unknown, raw error content omitted.'];
  return `[${code} stage=${where}] ${message}`;
}
function write(out:string, source:string, data:unknown) {
  if (!out) throw new Error('Provide --out');
  fs.writeFileSync(out, JSON.stringify({ schemaVersion: 1, incidentId: randomUUID(), capturedAt: new Date().toISOString(), source, data: redact(data) }, null, 2), { flag: 'wx' });
}
async function main(args:string[] = process.argv.slice(2)) {
  const command = args.shift();
  if (!command || command === '--help') { console.log(help); return; }
  if (command === '--version' && !args.length) { console.log(version); return; }
  if(command==='pc-start'){
    const options=parse(args,['--file','--chrome','--port','--mode','--out','--resources','--resume-from','--allow-resource-update']);
    let finish!:()=>void;const ended=new Promise<void>(resolve=>{finish=resolve});
    const signal=()=>finish();process.once('SIGINT',signal);process.once('SIGTERM',signal);
    let instance;
    try{
      instance=await (require('./lib/pc-session.cjs') as typeof import('./lib/pc-session.cjs')).start(options);
      instance.browser.once('close',signal);
      if(instance.isClosed()||instance.browser.exitCode!==null||instance.browser.signalCode!==null)signal();
      console.log(JSON.stringify({url:instance.url,hostFile:instance.hostFile,processId:instance.record.target.processId,mode:instance.record.mode,profileRetained:true}));
      await ended;
    }finally{process.removeListener('SIGINT',signal);process.removeListener('SIGTERM',signal);if(instance)await instance.stop()}
  }else if(command==='pc-pages'){
    const options=parse(args,['--host-file']);console.log(JSON.stringify(await (require('./lib/pc-session.cjs') as typeof import('./lib/pc-session.cjs')).pages(options['host-file']),null,2));
  }else if(command==='pc-bind'){
    const options=parse(args,['--host-file','--target-id','--url','--out']);
    await (require('./lib/pc-session.cjs') as typeof import('./lib/pc-session.cjs')).bind(options['host-file'],options['target-id']!,options.url as string,options.out!);console.log('Fresh document binding saved; old effects unchanged.');
  }else if(['pc-observe','pc-action'].includes(command)){
    const options=parse(args,command==='pc-observe'?['--host-file','--out','--scope','--probe']:['--host-file','--file','--out','--scope','--probe','--test-environment']);
    const report=await (require('./lib/pc-session.cjs') as typeof import('./lib/pc-session.cjs')).capture(options,command==='pc-action');console.log(JSON.stringify({status:report.status,businessOutcome:report.businessOutcome,automaticReplay:false}));
  }else if(command==='source-find'){
    const options=parse(args,['--root','--file','--out','--revision']);
    const {result,cleanup}=await (require('./lib/source-find-cli.cjs') as typeof import('./lib/source-find-cli.cjs')).run(options);
    console.log(`Source lookup ${result.outcome}; ${result.candidates.length} candidates. Output stays local and may contain private source.`);
    if(cleanup!=='completed')console.log('Temporary cleanup unconfirmed; preserve unknown leftovers.');
    if(!result.complete)process.exitCode=2;
  } else if(command==='game-session'){
    const options=parse(args,['--goal','--operation','--file','--test-environment']);
    if(!options.goal||!['request','propose','dispatch','resume','reconcile','checkpoint','cancel','status'].includes(options.operation as string)||options['test-environment']!==undefined&&options['test-environment']!=='yes'||['propose','checkpoint'].includes(options.operation as string)&&!options.file||!['propose','checkpoint'].includes(options.operation as string)&&options.file)throw Error('Invalid Session operation/options');
    options.testEnvironment=options['test-environment']==='yes';let result;
    try{result=await (require('./lib/game-goal.cjs') as typeof import('./lib/game-goal.cjs')).session(options.goal!,options.operation!,options as Parameters<typeof import('./lib/game-goal.cjs').session>[2])}catch(error){if(error&&typeof error==='object')(error as {cliOperation?:unknown}).cliOperation=options.operation;throw error}
    console.log(JSON.stringify(result,null,2));if(['paused','exhausted','failed'].includes((result as StatusView).status))process.exitCode=1;
  } else if (['game-goal-start','game-goal-step','game-goal-status'].includes(command)) {
    const goal = require('./lib/game-goal.cjs') as typeof import('./lib/game-goal.cjs'); let result;
    if (command === 'game-goal-status') {
      const options = parse(args, ['--goal']); if (!options.goal) throw Error('Provide Goal directory'); result = goal.view(goal.status(options.goal));
    } else {
      const options = parse(args, command === 'game-goal-start' ? ['--file','--serial','--package','--out','--test-environment','--target-id','--webview-socket','--store','--host','--host-file'] : ['--goal','--file','--intent','--test-environment','--resume']);
      if(options.host!==undefined&&options.host!=='chrome'||options.host===undefined&&options['host-file']!==undefined)throw Object.assign(Error('Invalid host'),{code:'PC_INPUT_INVALID'});
      if (options['test-environment'] !== 'yes') throw Error('Explicit test environment required'); options.testEnvironment = true;
      if (command === 'game-goal-start') {
        if (!options.file || fs.statSync(options.file).size > 65536) throw Error('Provide bounded Goal request');
        options.targetId = options['target-id']; options.webviewSocket = options['webview-socket'];
        result = await goal.start(options, JSON.parse(fs.readFileSync(options.file, 'utf8')));
      } else { if (!options.goal) throw Error('Provide Goal directory'); if(options.resume!==undefined&&options.resume!=='yes')throw Error('Invalid resume option'); options.resume=options.resume==='yes';result = await goal.advance(options.goal, options as Parameters<typeof goal.advance>[1]); }
    }
    console.log(JSON.stringify(result, null, 2));
    if (['paused','exhausted','failed'].includes((result as StatusView).status)) process.exitCode = 1;
  } else if (['game-observe','game-open-wardrobe'].includes(command)) {
    const options = parse(args, ['--serial','--package','--out','--target-id','--webview-socket','--host','--host-file', ...(command === 'game-open-wardrobe' ? ['--test-environment','--plan'] : ['--gameplay','--shop'])]);
    if(options.host!==undefined&&options.host!=='chrome'||options.host===undefined&&options['host-file']!==undefined)throw Object.assign(Error('Invalid host'),{code:'PC_INPUT_INVALID'});
    if (options['test-environment'] !== undefined && options['test-environment'] !== 'yes') throw Error('Invalid test environment');
    options.testEnvironment = options['test-environment'] === 'yes'; options.targetId = options['target-id']; options.webviewSocket = options['webview-socket'];
    if (options.gameplay !== undefined && options.gameplay !== 'yes') throw Error('Invalid gameplay view');
    options.gameplay = options.gameplay === 'yes';
    if(options.shop!==undefined && options.shop!=='yes')throw Error('Invalid shop view');
    options.shop=options.shop==='yes';
    const site = require('./lib/game-dol-provider.cjs') as typeof import('./lib/game-dol-provider.cjs');
    const report = await site[command === 'game-observe' ? 'observe' : 'openWardrobe'](options as Parameters<typeof site.observe>[0],options.shop?{probeCapabilities:(client:import('./lib/execution-context.cjs').BoundClient)=>(require('./lib/game-clothing-provider.cjs') as typeof import('./lib/game-clothing-provider.cjs')).observe(client,{kind:'purchase-one'})}:{}) as {status:string;shop?:unknown;capabilities?:{shop?:unknown}};
    // Preserve the explicit domain CLI view while the shared collector uses a
    // generic provider hook instead of importing shop semantics itself.
    if(options.shop){report.shop=report.capabilities?.shop;fs.writeFileSync(path.join(options.out!,'semantic.json'),JSON.stringify(report,null,2))}
    console.log(`Experimental game semantic operation ${report.status}; inspect semantic.json and original-state proof limits.`);
    if (!['observed','completed','planned'].includes(report.status)) process.exitCode = 1;
  } else if (['evidence','capture','perf','logcat','record','bugreport','environment','perf-series','native-layout','process-memory','app-lifecycle'].includes(command)) {
    const allowed = command === 'evidence' ? ['--serial','--package','--out','--scope','--window-ms','--integration','--integration-file','--logcat-seconds','--record-seconds','--repro','--full','--sensitive','--css','--environment','--target-id','--webview-socket','--timeline-ms','--observer-instrumentation','--inspectors','--storage','--layout','--allow-helper','--processes','--lifecycle']
      : ['--serial','--package','--out', ...(command === 'logcat' || command === 'record' ? ['--seconds'] : []),
        ...(command === 'environment' ? ['--target-id','--webview-socket','--window-ms'] : []),
        ...(command === 'perf-series' ? ['--samples','--interval-ms','--webview','--target-id','--webview-socket'] : []),
        ...(command === 'native-layout' ? ['--allow-helper'] : []),
        ...(command === 'perf' ? ['--deep','--seconds','--sensitive'] : command === 'bugreport' ? ['--sensitive'] : [])];
    const options = parse(args, [...allowed,'--host','--host-file',...(command==='evidence'?['--web-performance']:[])]);
    if(options.host!==undefined&&options.host!=='chrome'||options.host===undefined&&options['host-file']!==undefined)throw Object.assign(Error('Invalid host'),{code:'PC_INPUT_INVALID'});
    if(options['web-performance']!==undefined){if(options['web-performance']!=='yes')throw Error('Explicit selection must be yes');options.webPerformance=true}
    if (options.integration && options.integration !== 'soft-and-wet') throw new Error('Unsupported integration');
    options.windowMs = options['window-ms'] === undefined ? 1000 : Number(options['window-ms']);
    options.profile = command==='app-lifecycle'?'lifecycle':command==='process-memory'?'processes':command==='native-layout'?'layout':command === 'perf-series' ? 'series' : command === 'perf' && options.deep ? 'deep' : command;
    if(command==='perf-series'){
      options.samples=Number(options.samples??3);options.intervalMs=Number(options['interval-ms']??1000);
      if(options.webview!==undefined&&options.webview!=='yes')throw Error('WebView selection must be yes');options.seriesWebview=options.webview==='yes';options.windowMs=0;
    }
    for (const name of ['css','environment','storage','layout','processes','lifecycle']) if (options[name] !== undefined) {
      if (options[name] !== 'yes') throw new Error('Explicit selection must be yes'); options[name] = true;
    }
    options.targetId = options['target-id']; options.webviewSocket = options['webview-socket'];
    if(options['allow-helper']!==undefined){if(options['allow-helper']!=='yes')throw Error('Helper selection must be yes');options.allowHelper=true}
    if (options.inspectors !== undefined) options.inspectors = (options.inspectors as string).split(',');
    if (options['timeline-ms'] !== undefined) options.timelineMs = Number(options['timeline-ms']);
    if (options['observer-instrumentation'] !== undefined) {
      if (options['observer-instrumentation'] !== 'yes') throw Error('Instrumentation selection must be yes');
      options.observerInstrumentation = true;
    }
    if (options.sensitive !== undefined && options.sensitive !== 'yes') throw new Error('Sensitive selection must be yes');
    options.sensitive = options.sensitive === 'yes';
    if (options.deep || options.full) options.deepSeconds = Number(options.seconds ?? 10);
    if (command === 'perf' && options.seconds !== undefined && !options.deep) throw Object.assign(Error('Option not applicable'),{code:'CLI_OPTION_NOT_APPLICABLE'});
    if (options.full) { options.bugreport = true; options.logcatSeconds = 30; options.recordSeconds = 10; }
    if (command === 'logcat' || options['logcat-seconds'] !== undefined) options.logcatSeconds = Number(options['logcat-seconds'] ?? options.seconds ?? 30);
    if (command === 'record' || options['record-seconds'] !== undefined) options.recordSeconds = Number(options['record-seconds'] ?? options.seconds ?? 10);
    const integrations = options.integration ? [{ modulePath: path.join(__dirname, '../integrations/soft-and-wet/index.cjs') }] : [];
    if (options['integration-file']) integrations.push({ modulePath: path.resolve(options['integration-file']) });
    const manifest = await evidence(options as unknown as Parameters<typeof evidence>[0], { integrations });
    console.log(`Evidence ${manifest.status}; manifest: ${path.resolve(options.out!, 'manifest.json')}`);
    console.log('Status describes requested collection steps, not complete content coverage or a functional test verdict.');
    const domCoverage = manifest.steps.find(step => step.name === 'dom-contract')?.coverage;
    if (domCoverage?.truncated) console.log(`DOM coverage truncated: ${domCoverage.reasons.length ? domCoverage.reasons.join(', ') : 'reason unknown'}; inspect dom-contract.json limits.`);
    if (manifest.completed.includes('console')) console.log('Console receive window may include cached Runtime events; timestamps are target event time, not receipt time or a live-event rate. Inspect console.json omitted/truncated counts.');
    if (manifest.completed.includes('versions')) {
      const display = (value:unknown) => typeof value === 'string' && /^[0-9A-Za-z._()+-]{1,64}$/.test(value) ? value : 'unknown';
      console.log(`Game version: ${display(manifest.gameVersion)} (CDP GameVersion); wrapper App version: ${display((manifest.app as {versionName?:unknown}|undefined)?.versionName)} (ADB package versionName).`);
      if(manifest.gameVersionSources)console.log(`Game version sources: StartConfig.version=${display((manifest.gameVersionSources as {startConfig?:unknown}).startConfig)}; GameVersion Mod=${display((manifest.gameVersionSources as {gameVersionMod?:unknown}).gameVersionMod)}. unknown means no usable value from that source, not a known cause.`);
    }
    if (manifest.status !== 'complete') process.exitCode = 1;
  } else if(command==='install-skill'){
    const options=parse(args,['--out']);const result=(require('./lib/install-skill.cjs') as typeof import('./lib/install-skill.cjs')).install(options.out);console.log('Skill files installed at '+result.skillDir+'. Host discovery is not verified; follow docs/SKILL_INSTALL.md and verify the resolved Tools location before use.');if(result.stagingCleanup==='retained-unknown')console.log('Temporary staging cleanup could not be confirmed; unknown leftovers were preserved. See docs/SKILL_INSTALL.md.');
  } else if(command==='hitbox-overlay'){
    const options=parse(args,['--input','--out','--minimum-css-px']);(require('./lib/hitbox-overlay.cjs') as typeof import('./lib/hitbox-overlay.cjs')).write(options.input as string,options.out as string,options['minimum-css-px']===undefined?44:Number(options['minimum-css-px']));console.log('Hitbox bounds SVG created; center hit and size hints do not prove click behavior.');
  } else if (command==='viewport-matrix') {
    const options=parse(args,['--file','--endpoint','--out','--test-environment','--exclusive-metrics','--target-id','--plan']);
    if(!options.file||['test-environment','exclusive-metrics'].some(k=>options[k]!==undefined&&options[k]!=='yes'))throw Error('Invalid viewport options');options.testEnvironment=options['test-environment']==='yes';options.exclusiveMetrics=options['exclusive-metrics']==='yes';options.targetId=options['target-id'];
    const vp=(require('./lib/viewport.cjs') as typeof import('./lib/viewport.cjs')),result=await vp.run(options as Parameters<typeof vp.run>[0],vp.read(options.file));console.log(`Viewport matrix ${result.status}; browser metrics do not prove physical device equivalence.`);if(!['complete','planned'].includes(result.status))process.exitCode=1;
  } else if (command==='leak-probe') {
    const options=parse(args,['--endpoint','--out','--detached','--target-id']);
    if(!options.endpoint||!options.out||fs.existsSync(options.out)||options.detached!==undefined&&options.detached!=='yes')throw Error('Invalid leak probe options');
    const client=await (require('./lib/cdp.cjs') as typeof import('./lib/cdp.cjs')).connect(options.endpoint,5000,()=>{},options['target-id']||null);let data;
    try{data=await (require('./lib/performance-series.cjs') as typeof import('./lib/performance-series.cjs')).web(client,{detached:options.detached==='yes'});write(options.out,'caller-selected WebView heap/DOM/listener and optional detached metadata; app association unverified',data)}finally{client.close()}
    console.log('Probe saved; growth and detached wrappers do not establish a leak.');if(data.status!=='available'||data.cleanupWarning||options.detached==='yes'&&(data.detachedNodes as {status?:unknown}).status!=='available')process.exitCode=1;
  } else if (command==='network-scenario') {
    const options=parse(args,['--file','--endpoint','--out','--test-environment','--exclusive-network','--target-id','--plan']);
    if(!options.file||['test-environment','exclusive-network'].some(k=>options[k]!==undefined&&options[k]!=='yes'))throw Error('Invalid network experiment options');
    options.testEnvironment=options['test-environment']==='yes';options.exclusiveNetwork=options['exclusive-network']==='yes';options.targetId=options['target-id'];
    const lab=(require('./lib/network-lab.cjs') as typeof import('./lib/network-lab.cjs')),result=await lab.run(options as Parameters<typeof lab.run>[0],lab.read(options.file));
    console.log(`Network experiment ${result.status}; inspect declared-baseline cleanup.`);if(!['complete','planned'].includes(result.status))process.exitCode=1;
  } else if (command==='animation-frames') {
    const options=parse(args,['--input','--out','--interval-ms','--max-frames']);
    if(!options.input||!options.out)throw Error('Provide local video and new output');
    const result=await (require('./lib/animation.cjs') as typeof import('./lib/animation.cjs')).extract(options.input,options.out,{intervalMs:Number(options['interval-ms']??250),maxFrames:Number(options['max-frames']??30)});
    console.log(`Animation frames ${result.status}; review private pixels before sharing.`);if(result.status!=='complete')process.exitCode=1;
  } else if (command==='matrix') {
    const options=parse(args,['--file','--out','--plan','--test-environment']);
    if(!options.file||options['test-environment']!==undefined&&options['test-environment']!=='yes')throw Error('Invalid matrix options');
    options.testEnvironment=options['test-environment']==='yes';const matrix=(require('./lib/matrix.cjs') as typeof import('./lib/matrix.cjs'));
    const result=await matrix.run(options as Parameters<typeof matrix.run>[0],matrix.read(options.file));console.log(`Selected matrix ${result.status}; labels do not prove configuration or device equivalence.`);if(!['complete','planned'].includes(result.status))process.exitCode=1;
  } else if (command==='journey-record') {
    const options=parse(args,['--endpoint','--scope','--milliseconds','--out','--target-id']);
    if(!options.endpoint||!options.out||fs.existsSync(options.out))throw Error('Provide endpoint and new recorder output');
    const recorder=(require('./lib/recorder.cjs') as typeof import('./lib/recorder.cjs')),duration=Number(options.milliseconds??1000);
    const data=await evaluate(options.endpoint,recorder.expression(options.scope as string,duration),duration+5000,options['target-id']||null);
    write(options.out,'bounded WebView manual recorder; native actions and input content omitted',{recording:data,candidate:recorder.candidate(data,options.scope as string)});
    console.log('Review-required candidates saved; input placeholders cannot be executed as Journey steps.');if((data as {cleanupConflicts:number}).cleanupConflicts>0)process.exitCode=1;
  } else if (['action','journey'].includes(command)) {
    const options=parse(args,['--file','--serial','--package','--out','--plan','--authorization-file','--store','--test-environment','--target-id','--webview-socket','--host','--host-file']);
    if(options.host!==undefined&&options.host!=='chrome'||options.host===undefined&&options['host-file']!==undefined)throw Error('Invalid host options');
    if(!options.file || options['test-environment']!==undefined && options['test-environment']!=='yes')throw Error('Invalid execution options');
    options.testEnvironment=options['test-environment']==='yes';options.targetId=options['target-id'];options.webviewSocket=options['webview-socket'];
    if(options['authorization-file']){if(fs.statSync(options['authorization-file']).size>8192)throw Error('Oversized authorization scope');options.authorization=JSON.parse(fs.readFileSync(options['authorization-file'],'utf8'));if(!(require('./lib/game-scope.cjs') as typeof import('./lib/game-scope.cjs')).validate(options.authorization))throw Error('Invalid host-granted authorization scope')}
    const journey=(require('./lib/journey.cjs') as typeof import('./lib/journey.cjs')), loaded=journey.read(options.file,command==='action');
    const report=await journey.run(options,loaded);
    console.log(`Journey ${report.status}; inspect local manifest and checkpoints.`);
    if(!['planned','complete'].includes(report.status))process.exitCode=1;
  } else if (command === 'inspect') {
    const options = parse(args, ['--endpoint','--out']);
    if (!options.endpoint || !options.out || fs.existsSync(options.out)) throw new Error('Provide endpoint and new output');
    const list = await (require('./lib/cdp.cjs') as typeof import('./lib/cdp.cjs')).targets(options.endpoint);
    write(options.out, 'caller-specified CDP target inventory; app association unverified', { targets: list.filter(t => (t as TargetView|null)?.type === 'page').map(raw => { const t=raw as TargetView; return ({
      id: typeof t.id === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(t.id) ? t.id : null,
      standardDoLTitle: t.title === 'Degrees of Lewdity',
      titleHash: typeof t.title === 'string' ? createHash('sha256').update(t.title).digest('hex') : null,
      debuggerAvailable: typeof t.webSocketDebuggerUrl === 'string', titleAndUrl: 'omitted' }); }) });
    console.log('Target inventory saved; select an explicit ID when the default game title is ambiguous.');
  } else if (command === 'doctor') {
    const options = parse(args, ['--out','--serial','--package','--endpoint']);
    if (!options.out || fs.existsSync(options.out)) throw new Error('Provide a new --out file');
    const report = await doctor(options as Parameters<typeof doctor>[0]);
    write(options.out, 'environment checks', report);
    console.log(`Doctor ${report.status}; no environment repairs performed.`);
    if (report.status !== 'complete') process.exitCode = 1;
  } else if (command === 'support') {
    const options = parse(args, ['--from','--out','--include-screenshot']);
    if (!options.from || !options.out || options['include-screenshot'] !== undefined && options['include-screenshot'] !== 'yes') throw new Error('Invalid Support options');
    const report = support(options.from, options.out, options['include-screenshot'] === 'yes');
    console.log(`Support ${report.status}; inspect before sharing.`);
    if (report.status !== 'complete') process.exitCode = 1;
  } else if (['evidence-compare','issue-report','known-good','evidence-timeline'].includes(command)) {
    const options=parse(args,command==='evidence-compare'?['--before','--after','--out']:['--from','--out',...(command==='known-good'?['--label','--snapshots']:[])]);
    if(!options.out||command==='evidence-compare'&&(!options.before||!options.after)||command!=='evidence-compare'&&!options.from)throw Error('Provide source and new output');
    const helpers=require('./lib/evidence-tools.cjs') as typeof import('./lib/evidence-tools.cjs');
    const result=command==='evidence-compare'?helpers.compare(options.before!,options.after!,options.out):command==='issue-report'?helpers.report(options.from!,options.out):command==='evidence-timeline'?helpers.timelineReport(options.from!,options.out):helpers.knownGood(options.from!,options.out,{...(options.label?{label:options.label}:{}),...(options.snapshots!==undefined?{snapshots:options.snapshots.split(',')}:{})});
    console.log(`Local ${command} ${result.status}; no upload or automatic compatibility verdict.`);if(result.status!=='complete')process.exitCode=1;
  } else if (command === 'visual-diff') {
    const options = parse(args, ['--golden','--current','--out','--tolerance','--region']);
    if (!options.golden || !options.current || !options.out) throw new Error('Provide images and --out');
    const { promisify }:typeof import('node:util') = require('node:util');
    const execute = promisify((require('node:child_process') as typeof import('node:child_process')).execFile);
    try {
      const result = await execute(process.env.DOL_PYTHON || 'python', [path.join(__dirname,'visual-diff.py'), '--golden',options.golden,'--current',options.current,'--out',options.out,'--tolerance',options.tolerance ?? '8',...(options.region!==undefined?['--region',options.region]:[])],
        { timeout: 30000, maxBuffer: 65536, windowsHide: true });
      console.log(result.stdout.trim());
    } catch (error) {
      if ((error as {code?:unknown}).code === 2) console.error('Visual comparison needs Python with optional Pillow. Select an existing environment through DOL_PYTHON; no installation performed.');
      else console.error('Visual comparison failed; check image dimensions, limits and output protection.');
      process.exitCode = 1;
    }
  } else if (['dom-inspect','storage-snapshot'].includes(command)) {
    const options = parse(args, ['--endpoint','--scope','--mode','--out','--target-id']);
    if (!options.endpoint || !options.out || fs.existsSync(options.out)) throw Error('Provide endpoint and new output');
    const mode = command === 'storage-snapshot' ? 'storage' : options.mode;
    if (command === 'storage-snapshot' && (options.mode !== undefined || options.scope !== undefined) || command === 'dom-inspect' && !inspectors.domModes.includes(mode as typeof inspectors.domModes[number])) throw Error('Invalid inspector selection');
    const data = await evaluate(options.endpoint, inspectors.expression(mode as typeof inspectors.domModes[number],options.scope), 12000,options['target-id']||null);
    write(options.out, `${mode} via caller-specified CDP endpoint; app association unverified`, { ...(data as object), ...(mode === 'storage' ? {} : {scopeHash:createHash('sha256').update(options.scope as string).digest('hex')}) });
    console.log('Inspection saved; descriptive observations require project interpretation.');
  } else if (command === 'timeline') {
    const options = parse(args, ['--endpoint','--scope','--milliseconds','--out','--target-id','--observer-instrumentation']);
    if (!options.endpoint || !options.out || fs.existsSync(options.out) || options['observer-instrumentation'] !== undefined && options['observer-instrumentation'] !== 'yes') throw Error('Invalid timeline options');
    const duration = Number(options.milliseconds ?? 1000);
    const source = timeline.expression(options.scope as string, duration, options['observer-instrumentation'] === 'yes');
    const data = await evaluate(options.endpoint, source, duration + 5000, options['target-id'] || null);
    write(options.out, 'temporary scoped timeline via caller-specified CDP endpoint; app association unverified', { ...(data as object), scopeHash: createHash('sha256').update(options.scope as string).digest('hex') });
    console.log('Timeline saved; ordering within this window does not prove causation.');
    if (((data as {capabilities?:{cleanupConflicts?:number}}|null)?.capabilities?.cleanupConflicts as number) > 0) process.exitCode = 1;
  } else if (['dom-snapshot','css-snapshot'].includes(command)) {
    const module = command === 'dom-snapshot' ? dom : css;
    const options = parse(args, ['--endpoint','--scope','--out','--target-id']);
    if (!options.endpoint || !options.scope || options.scope.length > 256 || !options.out) throw new Error('Provide --endpoint, --scope and --out');
    if (fs.existsSync(options.out)) throw new Error('Output already exists');
    const data = await evaluate(options.endpoint, module.expression(options.scope), 10000, options['target-id'] || null);
    write(options.out, `${command} via caller-specified CDP endpoint; app association unverified`, { ...module.contract(data), scopeHash: createHash('sha256').update(options.scope as string).digest('hex') });
    console.log('Scoped contract saved.');
  } else if (['dom-diff','css-diff','environment-diff','storage-diff','app-lifecycle-diff'].includes(command)) {
    const module = command==='app-lifecycle-diff'?(require('./lib/app-lifecycle.cjs') as typeof import('./lib/app-lifecycle.cjs')):command === 'dom-diff' ? dom : command === 'css-diff' ? css : command === 'storage-diff' ? {diff:inspectors.storageDiff} : environment;
    const options = parse(args, ['--before','--after','--out']);
    if (!options.before || !options.after || !options.out) throw new Error('Provide --before, --after and --out');
    const read = (file:string) => { if (fs.statSync(file).size > 1024 * 1024) throw new Error('Contract too large'); return JSON.parse(fs.readFileSync(file, 'utf8')); };
    const before = read(options.before), after = read(options.after);
    const comparison=module.diff(before, after);
    const inputIncidents=[before.incidentId,after.incidentId].map(id=>typeof id==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)?id:null);
    write(options.out, `${command} comparison`, { ...comparison, inputIncidents });
    if(command==='app-lifecycle-diff'&&comparison.incomplete)process.exitCode=1;
    console.log('Diff saved; observed differences do not prove compatibility failure.');
  } else throw new Error('Unknown command; use --help');
}
export = { main, parse };
if (require.main === module) main().catch(error => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
