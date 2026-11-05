import type {SpawnSyncOptionsWithStringEncoding,SpawnSyncReturns} from 'node:child_process';
declare namespace androidInspect {
 interface Options {cli?:string;sdk?:string;run?:(file:string,args:string[],settings:SpawnSyncOptionsWithStringEncoding)=>SpawnSyncReturns<string>}
 interface Check {name:string;durationMs:number;status:number|null;stdout:string;stderr:string;error?:string;dimensions?:number[]}
 interface Report {serial:string;cli:string;checks:Check[];complete:boolean;version?:string;error?:unknown}
}
const fs:typeof import('node:fs')=require('node:fs');
const path:typeof import('node:path')=require('node:path');
const {spawnSync}:typeof import('node:child_process')=require('node:child_process');

function inspect(serial:string, directory:string, options:androidInspect.Options = {}):androidInspect.Report {
  if (!serial || !/^[\w.:-]+$/.test(serial)) throw new Error('Provide an explicit device serial');
  if (!directory) throw new Error('Provide a new private output directory');
  const output = path.resolve(directory);
  // Exclusive directory creation protects previous reports, including partial failures.
  fs.mkdirSync(output);
  const run = options.run || spawnSync;
  const cli = options.cli || process.env.DOL_ANDROID_CLI || 'android';
  const sdk = options.sdk || process.env.DOL_ANDROID_SDK;
  const base = ['--no-metrics', ...(sdk ? [`--sdk=${sdk}`] : [])];
  const report:androidInspect.Report = { serial, cli, checks: [], complete: false };
  try {
    const calls:[string,string[]][] = [
      ['version', ['--version']],
      ['screen', ['screen', 'capture', `--device=${serial}`, `--output=${path.join(output, 'screen.png')}`]],
      ['annotated', ['screen', 'capture', `--device=${serial}`, '--annotate', `--output=${path.join(output, 'annotated.png')}`]],
      ['layout', ['layout', `--device=${serial}`, '--full', '--no-idle', `--output=${path.join(output, 'layout.json')}`]],
    ];
    for(const [name,args]of calls){
      const start = Date.now();
      const result = run(cli, [...base, ...args], { encoding: 'utf8', timeout: 30000, windowsHide: true });
      report.checks.push({ name, durationMs: Date.now() - start, status: result.status,
        stdout: result.stdout || '', stderr: result.stderr || '', error: result.error?.message });
      if (result.error || result.status !== 0) throw new Error(`${name} failed; see report.json. Use the documented ADB/CDP fallback.`);
      if (name === 'version') report.version = result.stdout.trim();
      if (name === 'screen' || name === 'annotated') {
        const png = fs.readFileSync(path.join(output, name === 'screen' ? 'screen.png' : 'annotated.png'));
        if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
          throw new Error(`${name} did not produce a PNG`);
        }
        report.checks.at(-1)!.dimensions = [png.readUInt32BE(16), png.readUInt32BE(20)];
      }
      if (name === 'layout') {
        const layout:unknown = JSON.parse(fs.readFileSync(path.join(output, 'layout.json'), 'utf8'));
        if (!Array.isArray(layout) || !layout.length) throw new Error('Empty or invalid layout tree');
      }
    }
    report.complete = true;
    return report;
  } catch (error) {
    report.error = (error as {message?:unknown}|null|undefined)?.message;
    throw error;
  } finally {
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2), { flag: 'wx' });
  }
}

const androidInspect={inspect};
export = androidInspect;
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args[0] === '--help') console.log('Usage: node scripts/android-inspect.cjs DEVICE_SERIAL NEW_PRIVATE_DIRECTORY\nDOL_ANDROID_CLI: executable; DOL_ANDROID_SDK: existing SDK. Does not tap, restart or install the game. Layout may install its independent Google helper APK. Inspect screenshots manually; complete does not prove correct UI or an unlocked screen.');
  else try {
    if (args.length !== 2) throw new Error('Expected DEVICE_SERIAL and NEW_PRIVATE_DIRECTORY');
    console.log(JSON.stringify(inspect(args[0],args[1]), null, 2));
  } catch (error) { console.error((error as {message?:unknown}|null|undefined)?.message); process.exitCode = 1; }
}
