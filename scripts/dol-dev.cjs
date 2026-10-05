const fs = require('node:fs');
const path = require('node:path');
const { randomUUID, createHash } = require('node:crypto');
const { evidence } = require('./lib/evidence.cjs');
const { evaluate } = require('./adb-evaluate.cjs');
const dom = require('./lib/dom.cjs');
const { redact } = require('./lib/privacy.cjs');
const { doctor } = require('./lib/doctor.cjs');
const { support } = require('./lib/support.cjs');
const { version } = require('../package.json');
const help = `DoL Dev Tools ${version} (read-only diagnostics)
  --version
  evidence --serial SERIAL --package PACKAGE --out NEW_DIR [--scope SELECTOR] [--window-ms 1000] [--integration soft-and-wet]
    Optional: --logcat-seconds 30 --record-seconds 10 --repro NOTE_JSON
  capture | perf | logcat | record --serial SERIAL --package PACKAGE --out NEW_DIR [--seconds N]
  perf --deep --serial SERIAL --package PACKAGE --out NEW_DIR --seconds 10 --sensitive yes
  bugreport --serial SERIAL --package PACKAGE --out NEW_DIR --sensitive yes
  evidence --full --serial SERIAL --package PACKAGE --out NEW_DIR --sensitive yes [other evidence options]
  doctor --out NEW_JSON [--serial SERIAL --package PACKAGE] [--endpoint LOCAL_CDP_URL]
  support --from EVIDENCE_DIR --out NEW_DIR [--include-screenshot yes]
  visual-diff --golden PNG --current PNG --out NEW_DIR [--tolerance 8]
  dom-snapshot --endpoint http://127.0.0.1:PORT --scope SELECTOR --out NEW_JSON
  dom-diff --before JSON --after JSON --out NEW_JSON
Evidence creates and removes a temporary ADB forward for the explicit app process.
No APK installation, game actions, save access or environment repair. Parent directory must exist.
Screenshot is private; review before sharing. Console text and network bodies/paths are omitted.`;
function parse(args, allowed) {
  const options = Object.create(null);
  while (args.length) {
    const flag = args.shift();
    if (['--deep','--full'].includes(flag) && allowed.includes(flag) && !Object.hasOwn(options,flag.slice(2))) { options[flag.slice(2)] = true; continue; }
    if (!allowed.includes(flag) || Object.hasOwn(options, flag.slice(2)) || !args.length) throw new Error('Unknown, duplicate or incomplete option');
    options[flag.slice(2)] = args.shift();
  }
  return options;
}
function write(out, source, data) {
  if (!out) throw new Error('Provide --out');
  fs.writeFileSync(out, JSON.stringify({ schemaVersion: 1, incidentId: randomUUID(), capturedAt: new Date().toISOString(), source, data: redact(data) }, null, 2), { flag: 'wx' });
}
async function main(args = process.argv.slice(2)) {
  const command = args.shift();
  if (!command || command === '--help') { console.log(help); return; }
  if (command === '--version' && !args.length) { console.log(version); return; }
  if (['evidence','capture','perf','logcat','record','bugreport'].includes(command)) {
    const allowed = command === 'evidence' ? ['--serial','--package','--out','--scope','--window-ms','--integration','--logcat-seconds','--record-seconds','--repro','--full','--sensitive']
      : ['--serial','--package','--out', ...(command === 'logcat' || command === 'record' ? ['--seconds'] : []),
        ...(command === 'perf' ? ['--deep','--seconds','--sensitive'] : command === 'bugreport' ? ['--sensitive'] : [])];
    const options = parse(args, allowed);
    if (options.integration && options.integration !== 'soft-and-wet') throw new Error('Unsupported integration');
    options.windowMs = options['window-ms'] === undefined ? 1000 : Number(options['window-ms']);
    options.profile = command === 'perf' && options.deep ? 'deep' : command;
    if (options.sensitive !== undefined && options.sensitive !== 'yes') throw new Error('Sensitive selection must be yes');
    options.sensitive = options.sensitive === 'yes';
    if (options.deep || options.full) options.deepSeconds = Number(options.seconds ?? 10);
    if (command === 'perf' && options.seconds !== undefined && !options.deep) throw new Error('--seconds requires --deep for perf');
    if (options.full) { options.bugreport = true; options.logcatSeconds = 30; options.recordSeconds = 10; }
    if (command === 'logcat' || options['logcat-seconds'] !== undefined) options.logcatSeconds = Number(options['logcat-seconds'] ?? options.seconds ?? 30);
    if (command === 'record' || options['record-seconds'] !== undefined) options.recordSeconds = Number(options['record-seconds'] ?? options.seconds ?? 10);
    const integrations = options.integration ? [require('../integrations/soft-and-wet/index.cjs')] : [];
    const manifest = await evidence(options, { integrations });
    console.log(`Evidence ${manifest.status}; manifest: ${path.resolve(options.out, 'manifest.json')}`);
    if (manifest.status !== 'complete') process.exitCode = 1;
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
  } else if (command === 'visual-diff') {
    const options = parse(args, ['--golden','--current','--out','--tolerance']);
    if (!options.golden || !options.current || !options.out) throw new Error('Provide images and --out');
    const { promisify } = require('node:util');
    const execute = promisify(require('node:child_process').execFile);
    try {
      const result = await execute(process.env.DOL_PYTHON || 'python', [path.join(__dirname,'visual-diff.py'), '--golden',options.golden,'--current',options.current,'--out',options.out,'--tolerance',options.tolerance ?? '8'],
        { timeout: 30000, maxBuffer: 65536, windowsHide: true });
      console.log(result.stdout.trim());
    } catch (error) {
      if (error.code === 2) console.error('Visual comparison needs Python with optional Pillow. Select an existing environment through DOL_PYTHON; no installation performed.');
      else console.error('Visual comparison failed; check image dimensions, limits and output protection.');
      process.exitCode = 1;
    }
  } else if (command === 'dom-snapshot') {
    const options = parse(args, ['--endpoint','--scope','--out']);
    if (!options.endpoint || !options.scope || options.scope.length > 256 || !options.out) throw new Error('Provide --endpoint, --scope and --out');
    if (fs.existsSync(options.out)) throw new Error('Output already exists');
    const data = await evaluate(options.endpoint, dom.expression(options.scope), 10000);
    write(options.out, 'DOM via caller-specified CDP endpoint; app association unverified', { ...dom.contract(data), scopeHash: createHash('sha256').update(options.scope).digest('hex') });
    console.log('DOM contract saved.');
  } else if (command === 'dom-diff') {
    const options = parse(args, ['--before','--after','--out']);
    if (!options.before || !options.after || !options.out) throw new Error('Provide --before, --after and --out');
    const read = file => { if (fs.statSync(file).size > 1024 * 1024) throw new Error('DOM contract too large'); return JSON.parse(fs.readFileSync(file, 'utf8')); };
    const before = read(options.before), after = read(options.after);
    write(options.out, 'DOM comparison', { ...dom.diff(before, after), inputIncidents: [before.incidentId ?? null, after.incidentId ?? null] });
    console.log('DOM diff saved; structural differences do not prove compatibility failure.');
  } else throw new Error('Unknown command; use --help');
}
module.exports = { main, parse };
if (require.main === module) main().catch(() => { console.error('Command failed. Check arguments, target availability and output protection; raw error content omitted.'); process.exitCode = 1; });
