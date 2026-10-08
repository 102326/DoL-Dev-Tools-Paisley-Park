const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { evidence } = require('./lib/evidence.cjs');
const { evaluate } = require('./adb-evaluate.cjs');
const dom = require('./lib/dom.cjs');
const css = require('./lib/css.cjs');
const environment = require('./lib/environment.cjs');
const timeline = require('./lib/timeline.cjs');
const inspectors = require('./lib/inspectors.cjs');
const { redact } = require('./lib/privacy.cjs');
const { doctor } = require('./lib/doctor.cjs');
const { support } = require('./lib/support.cjs');
const { version, displayName, releaseName } = require('../package.json');
const help = `${displayName} ${version}${releaseName ? ' — '+releaseName : ''} (local development and diagnostics)
  --version
  game-goal-start --file REVIEWED_GOAL_JSON --serial SERIAL --package PACKAGE --out NEW_DIR --test-environment yes
    Native Gameplay Goals: reach-passage, native-state conditions, or native-knowledge membership with optional return Passage; clothing Goals belong to a domain provider.
  game-goal-step --goal GOAL_DIR --test-environment yes [--file REVIEWED_ACTION_JSON --intent navigation|dialogue|combat|buy|sell|equip|unequip|sleep|menu|settings|load-save]
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
    Optional: --logcat-seconds 30 --record-seconds 10 --repro NOTE_JSON --integration-file REVIEWED_LOCAL.cjs
    Optional: --css yes --environment yes --target-id ID --webview-socket VERIFIED_PID_SOCKET
    Optional: --timeline-ms 1000 --scope SELECTOR [--observer-instrumentation yes]
    Optional: --inspectors selector-health,accessibility,overlays,scroll,ownership,hitboxes --storage yes
  inspect --endpoint LOCAL_HTTP_CDP --out NEW_JSON
  environment --serial SERIAL --package PACKAGE --out NEW_DIR [--target-id ID]
  capture | perf | logcat | record --serial SERIAL --package PACKAGE --out NEW_DIR [--seconds N]
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
    --plan creates a static plan only; --target-id and --webview-socket are optional explicit target overrides
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
function parse(args, allowed) {
  const options = Object.create(null);
  while (args.length) {
    const flag = args.shift();
    if (['--deep','--full','--plan'].includes(flag) && allowed.includes(flag) && !Object.hasOwn(options,flag.slice(2))) { options[flag.slice(2)] = true; continue; }
    if (!allowed.includes(flag) || Object.hasOwn(options, flag.slice(2)) || !args.length) throw Object.assign(new Error('Unknown, duplicate or incomplete option'),{code:'INVALID_CLI_ARGUMENTS'});
    options[flag.slice(2)] = args.shift();
  }
  return options;
}
function errorMessage(error) {
  const known={
    GAMEPLAY_RUNTIME_UNAVAILABLE:['runtime.prerequisites','Gameplay Runtime requires XState and Node SQLite. Run npm ci --ignore-scripts --no-audit --no-fund in the Tools root; Node 22.12 needs --experimental-sqlite. Generic diagnostics remain available.'],
    INVALID_CLI_ARGUMENTS:['cli.parse','Unknown, duplicate or incomplete option; use --help. Supplied arguments omitted.'],
    UNSUPPORTED_CHECKPOINT_NAME:['journey.validate','field=name: Action/Journey checkpoints do not accept name. See docs/ACTIONS.md.'],
  };
  const code=typeof error?.code==='string'&&Object.hasOwn(known,error.code)?error.code:'COMMAND_FAILED';
  const stage=['request','propose','dispatch','resume','reconcile','checkpoint','cancel','status'].includes(error?.cliOperation)?'game-session.'+error.cliOperation:'command';
  const [where,message]=known[code]??[stage,'Command failed. Check arguments, target availability and output protection; cause unknown, raw error content omitted.'];
  return `[${code} stage=${where}] ${message}`;
}
function write(out, source, data) {
  if (!out) throw new Error('Provide --out');
  fs.writeFileSync(out, JSON.stringify({ schemaVersion: 1, incidentId: randomUUID(), capturedAt: new Date().toISOString(), source, data: redact(data) }, null, 2), { flag: 'wx' });
}
async function main(args = process.argv.slice(2)) {
  const command = args.shift();
  if (!command || command === '--help') { console.log(help); return; }
  if (command === '--version' && !args.length) { console.log(version); return; }
  if(command==='game-session'){
    const options=parse(args,['--goal','--operation','--file','--test-environment']);
    if(!options.goal||!['request','propose','dispatch','resume','reconcile','checkpoint','cancel','status'].includes(options.operation)||options['test-environment']!==undefined&&options['test-environment']!=='yes'||['propose','checkpoint'].includes(options.operation)&&!options.file||!['propose','checkpoint'].includes(options.operation)&&options.file)throw Error('Invalid Session operation/options');
    options.testEnvironment=options['test-environment']==='yes';let result;
    try{result=await require('./lib/game-goal.cjs').session(options.goal,options.operation,options)}catch(error){if(error&&typeof error==='object')error.cliOperation=options.operation;throw error}
    console.log(JSON.stringify(result,null,2));if(['paused','exhausted','failed'].includes(result.status))process.exitCode=1;
  } else if (['game-goal-start','game-goal-step','game-goal-status'].includes(command)) {
    const goal = require('./lib/game-goal.cjs'); let result;
    if (command === 'game-goal-status') {
      const options = parse(args, ['--goal']); if (!options.goal) throw Error('Provide Goal directory'); result = goal.view(goal.status(options.goal));
    } else {
      const options = parse(args, command === 'game-goal-start' ? ['--file','--serial','--package','--out','--test-environment','--target-id','--webview-socket','--store'] : ['--goal','--file','--intent','--test-environment','--resume']);
      if (options['test-environment'] !== 'yes') throw Error('Explicit test environment required'); options.testEnvironment = true;
      if (command === 'game-goal-start') {
        if (!options.file || fs.statSync(options.file).size > 65536) throw Error('Provide bounded Goal request');
        options.targetId = options['target-id']; options.webviewSocket = options['webview-socket'];
        result = await goal.start(options, JSON.parse(fs.readFileSync(options.file, 'utf8')));
      } else { if (!options.goal) throw Error('Provide Goal directory'); if(options.resume!==undefined&&options.resume!=='yes')throw Error('Invalid resume option'); options.resume=options.resume==='yes';result = await goal.advance(options.goal, options); }
    }
    console.log(JSON.stringify(result, null, 2));
    if (['paused','exhausted','failed'].includes(result.status)) process.exitCode = 1;
  } else if (['game-observe','game-open-wardrobe'].includes(command)) {
    const options = parse(args, ['--serial','--package','--out','--target-id','--webview-socket', ...(command === 'game-open-wardrobe' ? ['--test-environment','--plan'] : ['--gameplay','--shop'])]);
    if (options['test-environment'] !== undefined && options['test-environment'] !== 'yes') throw Error('Invalid test environment');
    options.testEnvironment = options['test-environment'] === 'yes'; options.targetId = options['target-id']; options.webviewSocket = options['webview-socket'];
    if (options.gameplay !== undefined && options.gameplay !== 'yes') throw Error('Invalid gameplay view');
    options.gameplay = options.gameplay === 'yes';
    if(options.shop!==undefined && options.shop!=='yes')throw Error('Invalid shop view');
    options.shop=options.shop==='yes';
    const site = require('./lib/game-dol-provider.cjs');
    const report = await site[command === 'game-observe' ? 'observe' : 'openWardrobe'](options,options.shop?{probeCapabilities:client=>require('./lib/game-clothing-provider.cjs').observe(client,{kind:'purchase-one'})}:{});
    // Preserve the explicit domain CLI view while the shared collector uses a
    // generic provider hook instead of importing shop semantics itself.
    if(options.shop){report.shop=report.capabilities?.shop;fs.writeFileSync(path.join(options.out,'semantic.json'),JSON.stringify(report,null,2))}
    console.log(`Experimental game semantic operation ${report.status}; inspect semantic.json and original-state proof limits.`);
    if (!['observed','completed','planned'].includes(report.status)) process.exitCode = 1;
  } else if (['evidence','capture','perf','logcat','record','bugreport','environment','perf-series','native-layout','process-memory','app-lifecycle'].includes(command)) {
    const allowed = command === 'evidence' ? ['--serial','--package','--out','--scope','--window-ms','--integration','--integration-file','--logcat-seconds','--record-seconds','--repro','--full','--sensitive','--css','--environment','--target-id','--webview-socket','--timeline-ms','--observer-instrumentation','--inspectors','--storage','--layout','--allow-helper','--processes','--lifecycle']
      : ['--serial','--package','--out', ...(command === 'logcat' || command === 'record' ? ['--seconds'] : []),
        ...(command === 'environment' ? ['--target-id','--webview-socket','--window-ms'] : []),
        ...(command === 'perf-series' ? ['--samples','--interval-ms','--webview','--target-id','--webview-socket'] : []),
        ...(command === 'native-layout' ? ['--allow-helper'] : []),
        ...(command === 'perf' ? ['--deep','--seconds','--sensitive'] : command === 'bugreport' ? ['--sensitive'] : [])];
    const options = parse(args, allowed);
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
    if (options.inspectors !== undefined) options.inspectors = options.inspectors.split(',');
    if (options['timeline-ms'] !== undefined) options.timelineMs = Number(options['timeline-ms']);
    if (options['observer-instrumentation'] !== undefined) {
      if (options['observer-instrumentation'] !== 'yes') throw Error('Instrumentation selection must be yes');
      options.observerInstrumentation = true;
    }
    if (options.sensitive !== undefined && options.sensitive !== 'yes') throw new Error('Sensitive selection must be yes');
    options.sensitive = options.sensitive === 'yes';
    if (options.deep || options.full) options.deepSeconds = Number(options.seconds ?? 10);
    if (command === 'perf' && options.seconds !== undefined && !options.deep) throw new Error('--seconds requires --deep for perf');
    if (options.full) { options.bugreport = true; options.logcatSeconds = 30; options.recordSeconds = 10; }
    if (command === 'logcat' || options['logcat-seconds'] !== undefined) options.logcatSeconds = Number(options['logcat-seconds'] ?? options.seconds ?? 30);
    if (command === 'record' || options['record-seconds'] !== undefined) options.recordSeconds = Number(options['record-seconds'] ?? options.seconds ?? 10);
    const integrations = options.integration ? [{ modulePath: path.join(__dirname, '../integrations/soft-and-wet/index.cjs') }] : [];
    if (options['integration-file']) integrations.push({ modulePath: path.resolve(options['integration-file']) });
    const manifest = await evidence(options, { integrations });
    console.log(`Evidence ${manifest.status}; manifest: ${path.resolve(options.out, 'manifest.json')}`);
    console.log('Status describes requested collection steps, not complete content coverage or a functional test verdict.');
    const domCoverage = manifest.steps.find(step => step.name === 'dom-contract')?.coverage;
    if (domCoverage?.truncated) console.log(`DOM coverage truncated: ${domCoverage.reasons.length ? domCoverage.reasons.join(', ') : 'reason unknown'}; inspect dom-contract.json limits.`);
    if (manifest.completed.includes('console')) console.log('Console receive window may include cached Runtime events; timestamps are target event time, not receipt time or a live-event rate. Inspect console.json omitted/truncated counts.');
    if (manifest.completed.includes('versions')) {
      const display = value => typeof value === 'string' && /^[0-9A-Za-z._()+-]{1,64}$/.test(value) ? value : 'unknown';
      console.log(`Game version: ${display(manifest.gameVersion)} (CDP GameVersion); wrapper App version: ${display(manifest.app?.versionName)} (ADB package versionName).`);
      if(manifest.gameVersionSources)console.log(`Game version sources: StartConfig.version=${display(manifest.gameVersionSources.startConfig)}; GameVersion Mod=${display(manifest.gameVersionSources.gameVersionMod)}. unknown means no usable value from that source, not a known cause.`);
    }
    if (manifest.status !== 'complete') process.exitCode = 1;
  } else if(command==='install-skill'){
    const options=parse(args,['--out']);const result=require('./lib/install-skill.cjs').install(options.out);console.log('Skill installed at '+result.skillDir+'; available on the next turn. Tools location will be reverified before use.');
  } else if(command==='hitbox-overlay'){
    const options=parse(args,['--input','--out','--minimum-css-px']);require('./lib/hitbox-overlay.cjs').write(options.input,options.out,options['minimum-css-px']===undefined?44:Number(options['minimum-css-px']));console.log('Hitbox bounds SVG created; center hit and size hints do not prove click behavior.');
  } else if (command==='viewport-matrix') {
    const options=parse(args,['--file','--endpoint','--out','--test-environment','--exclusive-metrics','--target-id','--plan']);
    if(!options.file||['test-environment','exclusive-metrics'].some(k=>options[k]!==undefined&&options[k]!=='yes'))throw Error('Invalid viewport options');options.testEnvironment=options['test-environment']==='yes';options.exclusiveMetrics=options['exclusive-metrics']==='yes';options.targetId=options['target-id'];
    const vp=require('./lib/viewport.cjs'),result=await vp.run(options,vp.read(options.file));console.log(`Viewport matrix ${result.status}; browser metrics do not prove physical device equivalence.`);if(!['complete','planned'].includes(result.status))process.exitCode=1;
  } else if (command==='leak-probe') {
    const options=parse(args,['--endpoint','--out','--detached','--target-id']);
    if(!options.endpoint||!options.out||fs.existsSync(options.out)||options.detached!==undefined&&options.detached!=='yes')throw Error('Invalid leak probe options');
    const client=await require('./lib/cdp.cjs').connect(options.endpoint,5000,()=>{},options['target-id']||null);let data;
    try{data=await require('./lib/performance-series.cjs').web(client,{detached:options.detached==='yes'});write(options.out,'caller-selected WebView heap/DOM/listener and optional detached metadata; app association unverified',data)}finally{client.close()}
    console.log('Probe saved; growth and detached wrappers do not establish a leak.');if(data.status!=='available'||data.cleanupWarning||options.detached==='yes'&&data.detachedNodes.status!=='available')process.exitCode=1;
  } else if (command==='network-scenario') {
    const options=parse(args,['--file','--endpoint','--out','--test-environment','--exclusive-network','--target-id','--plan']);
    if(!options.file||['test-environment','exclusive-network'].some(k=>options[k]!==undefined&&options[k]!=='yes'))throw Error('Invalid network experiment options');
    options.testEnvironment=options['test-environment']==='yes';options.exclusiveNetwork=options['exclusive-network']==='yes';options.targetId=options['target-id'];
    const lab=require('./lib/network-lab.cjs'),result=await lab.run(options,lab.read(options.file));
    console.log(`Network experiment ${result.status}; inspect declared-baseline cleanup.`);if(!['complete','planned'].includes(result.status))process.exitCode=1;
  } else if (command==='animation-frames') {
    const options=parse(args,['--input','--out','--interval-ms','--max-frames']);
    if(!options.input||!options.out)throw Error('Provide local video and new output');
    const result=await require('./lib/animation.cjs').extract(options.input,options.out,{intervalMs:Number(options['interval-ms']??250),maxFrames:Number(options['max-frames']??30)});
    console.log(`Animation frames ${result.status}; review private pixels before sharing.`);if(result.status!=='complete')process.exitCode=1;
  } else if (command==='matrix') {
    const options=parse(args,['--file','--out','--plan','--test-environment']);
    if(!options.file||options['test-environment']!==undefined&&options['test-environment']!=='yes')throw Error('Invalid matrix options');
    options.testEnvironment=options['test-environment']==='yes';const matrix=require('./lib/matrix.cjs');
    const result=await matrix.run(options,matrix.read(options.file));console.log(`Selected matrix ${result.status}; labels do not prove configuration or device equivalence.`);if(!['complete','planned'].includes(result.status))process.exitCode=1;
  } else if (command==='journey-record') {
    const options=parse(args,['--endpoint','--scope','--milliseconds','--out','--target-id']);
    if(!options.endpoint||!options.out||fs.existsSync(options.out))throw Error('Provide endpoint and new recorder output');
    const recorder=require('./lib/recorder.cjs'),duration=Number(options.milliseconds??1000);
    const data=await evaluate(options.endpoint,recorder.expression(options.scope,duration),duration+5000,options['target-id']||null);
    write(options.out,'bounded WebView manual recorder; native actions and input content omitted',{recording:data,candidate:recorder.candidate(data,options.scope)});
    console.log('Review-required candidates saved; input placeholders cannot be executed as Journey steps.');if(data.cleanupConflicts>0)process.exitCode=1;
  } else if (['action','journey'].includes(command)) {
    const options=parse(args,['--file','--serial','--package','--out','--plan','--test-environment','--target-id','--webview-socket']);
    if(!options.file || options['test-environment']!==undefined && options['test-environment']!=='yes')throw Error('Invalid execution options');
    options.testEnvironment=options['test-environment']==='yes';options.targetId=options['target-id'];options.webviewSocket=options['webview-socket'];
    const journey=require('./lib/journey.cjs'), loaded=journey.read(options.file,command==='action');
    const report=await journey.run(options,loaded);
    console.log(`Journey ${report.status}; inspect local manifest and checkpoints.`);
    if(!['planned','complete'].includes(report.status))process.exitCode=1;
  } else if (command === 'inspect') {
    const options = parse(args, ['--endpoint','--out']);
    if (!options.endpoint || !options.out || fs.existsSync(options.out)) throw new Error('Provide endpoint and new output');
    const list = await require('./lib/cdp.cjs').targets(options.endpoint);
    write(options.out, 'caller-specified CDP target inventory; app association unverified', { targets: list.filter(t => t?.type === 'page').map(t => ({
      id: typeof t.id === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(t.id) ? t.id : null,
      standardDoLTitle: t.title === 'Degrees of Lewdity',
      titleHash: typeof t.title === 'string' ? createHash('sha256').update(t.title).digest('hex') : null,
      debuggerAvailable: typeof t.webSocketDebuggerUrl === 'string', titleAndUrl: 'omitted' })) });
    console.log('Target inventory saved; select an explicit ID when the default game title is ambiguous.');
  } else if (command === 'doctor') {
    const options = parse(args, ['--out','--serial','--package','--endpoint']);
    if (!options.out || fs.existsSync(options.out)) throw new Error('Provide a new --out file');
    const report = await doctor(options);
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
    const helpers=require('./lib/evidence-tools.cjs');
    const result=command==='evidence-compare'?helpers.compare(options.before,options.after,options.out):command==='issue-report'?helpers.report(options.from,options.out):command==='evidence-timeline'?helpers.timelineReport(options.from,options.out):helpers.knownGood(options.from,options.out,{...(options.label?{label:options.label}:{}),...(options.snapshots!==undefined?{snapshots:options.snapshots.split(',')}:{})});
    console.log(`Local ${command} ${result.status}; no upload or automatic compatibility verdict.`);if(result.status!=='complete')process.exitCode=1;
  } else if (command === 'visual-diff') {
    const options = parse(args, ['--golden','--current','--out','--tolerance','--region']);
    if (!options.golden || !options.current || !options.out) throw new Error('Provide images and --out');
    const { promisify } = require('node:util');
    const execute = promisify(require('node:child_process').execFile);
    try {
      const result = await execute(process.env.DOL_PYTHON || 'python', [path.join(__dirname,'visual-diff.py'), '--golden',options.golden,'--current',options.current,'--out',options.out,'--tolerance',options.tolerance ?? '8',...(options.region!==undefined?['--region',options.region]:[])],
        { timeout: 30000, maxBuffer: 65536, windowsHide: true });
      console.log(result.stdout.trim());
    } catch (error) {
      if (error.code === 2) console.error('Visual comparison needs Python with optional Pillow. Select an existing environment through DOL_PYTHON; no installation performed.');
      else console.error('Visual comparison failed; check image dimensions, limits and output protection.');
      process.exitCode = 1;
    }
  } else if (['dom-inspect','storage-snapshot'].includes(command)) {
    const options = parse(args, ['--endpoint','--scope','--mode','--out','--target-id']);
    if (!options.endpoint || !options.out || fs.existsSync(options.out)) throw Error('Provide endpoint and new output');
    const mode = command === 'storage-snapshot' ? 'storage' : options.mode;
    if (command === 'storage-snapshot' && (options.mode !== undefined || options.scope !== undefined) || command === 'dom-inspect' && !inspectors.domModes.includes(mode)) throw Error('Invalid inspector selection');
    const data = await evaluate(options.endpoint, inspectors.expression(mode,options.scope), 12000,options['target-id']||null);
    write(options.out, `${mode} via caller-specified CDP endpoint; app association unverified`, { ...data, ...(mode === 'storage' ? {} : {scopeHash:createHash('sha256').update(options.scope).digest('hex')}) });
    console.log('Inspection saved; descriptive observations require project interpretation.');
  } else if (command === 'timeline') {
    const options = parse(args, ['--endpoint','--scope','--milliseconds','--out','--target-id','--observer-instrumentation']);
    if (!options.endpoint || !options.out || fs.existsSync(options.out) || options['observer-instrumentation'] !== undefined && options['observer-instrumentation'] !== 'yes') throw Error('Invalid timeline options');
    const duration = Number(options.milliseconds ?? 1000);
    const source = timeline.expression(options.scope, duration, options['observer-instrumentation'] === 'yes');
    const data = await evaluate(options.endpoint, source, duration + 5000, options['target-id'] || null);
    write(options.out, 'temporary scoped timeline via caller-specified CDP endpoint; app association unverified', { ...data, scopeHash: createHash('sha256').update(options.scope).digest('hex') });
    console.log('Timeline saved; ordering within this window does not prove causation.');
    if (data?.capabilities?.cleanupConflicts > 0) process.exitCode = 1;
  } else if (['dom-snapshot','css-snapshot'].includes(command)) {
    const module = command === 'dom-snapshot' ? dom : css;
    const options = parse(args, ['--endpoint','--scope','--out','--target-id']);
    if (!options.endpoint || !options.scope || options.scope.length > 256 || !options.out) throw new Error('Provide --endpoint, --scope and --out');
    if (fs.existsSync(options.out)) throw new Error('Output already exists');
    const data = await evaluate(options.endpoint, module.expression(options.scope), 10000, options['target-id'] || null);
    write(options.out, `${command} via caller-specified CDP endpoint; app association unverified`, { ...module.contract(data), scopeHash: createHash('sha256').update(options.scope).digest('hex') });
    console.log('Scoped contract saved.');
  } else if (['dom-diff','css-diff','environment-diff','storage-diff','app-lifecycle-diff'].includes(command)) {
    const module = command==='app-lifecycle-diff'?require('./lib/app-lifecycle.cjs'):command === 'dom-diff' ? dom : command === 'css-diff' ? css : command === 'storage-diff' ? {diff:inspectors.storageDiff} : environment;
    const options = parse(args, ['--before','--after','--out']);
    if (!options.before || !options.after || !options.out) throw new Error('Provide --before, --after and --out');
    const read = file => { if (fs.statSync(file).size > 1024 * 1024) throw new Error('Contract too large'); return JSON.parse(fs.readFileSync(file, 'utf8')); };
    const before = read(options.before), after = read(options.after);
    const comparison=module.diff(before, after);
    const inputIncidents=[before.incidentId,after.incidentId].map(id=>typeof id==='string'&&/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(id)?id:null);
    write(options.out, `${command} comparison`, { ...comparison, inputIncidents });
    if(command==='app-lifecycle-diff'&&comparison.incomplete)process.exitCode=1;
    console.log('Diff saved; observed differences do not prove compatibility failure.');
  } else throw new Error('Unknown command; use --help');
}
module.exports = { main, parse };
if (require.main === module) main().catch(error => {
  console.error(errorMessage(error));
  process.exitCode = 1;
});
