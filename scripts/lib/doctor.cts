import type {ExecFileOptions} from 'node:child_process';
import type privacy from './privacy.cjs';
declare namespace doctorAPI {
 interface Options {serial?:string;package?:string;endpoint?:string;out:string}
 type Runner=(file:string,args:string[],settings:ExecFileOptions&{encoding:'utf8'})=>Promise<{stdout:string}>;
 interface Check {name:string;required:boolean;status:'unavailable'|'available';data?:privacy.Redacted;reason?:string;durationMs?:number}
}
const fs:typeof import('node:fs')=require('node:fs');
const path:typeof import('node:path')=require('node:path');
const {promisify}:typeof import('node:util')=require('node:util');
const {execFile}:typeof import('node:child_process')=require('node:child_process');
const {connect}:typeof import('./cdp.cjs')=require('./cdp.cjs');
const {redact}:typeof import('./privacy.cjs')=require('./privacy.cjs');
const { version } = require('../../package.json');
const exec = promisify(execFile);
async function doctor(options:doctorAPI.Options, run:doctorAPI.Runner = exec) {
  if (options.serial && !/^[\w.:-]{1,128}$/.test(options.serial)) throw new Error('Invalid serial');
  if (options.package && (!options.serial || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(options.package))) throw new Error('Package check requires explicit serial and valid package');
  const checks:doctorAPI.Check[] = [];
  async function check(name:string, fn:()=>Promise<unknown>, required = false) {
    const start = Date.now(), entry:doctorAPI.Check = { name, required, status: 'unavailable' };
    checks.push(entry);
    try { entry.data = redact(await fn()); entry.status = 'available'; }
    catch (error) { entry.reason = ['ENOENT','EACCES'].includes((error as {code?:unknown}|null|undefined)?.code as string) ? (error as {code:string}).code : 'check-failed'; }
    entry.durationMs = Date.now() - start;
  }
  const command = async (exe:string, args:string[]) => (await run(exe, args, { encoding: 'utf8', timeout: 3000, maxBuffer: 1024 * 1024, windowsHide: true })).stdout || '';
  const adb = (...args:string[]) => command(process.env.DOL_ADB || 'adb', [...(options.serial ? ['-s', options.serial] : []), ...args]);
  await check('node', async () => {
    const [major] = process.versions.node.split('.').map(Number);
    if (major < 26) throw new Error('Unsupported Node version');
    return { version: process.versions.node, supported: true };
  }, true);
  const tools:[string,string,string[]][] = [
    ['python', process.env.DOL_PYTHON || 'python', ['--version']],
    ['adb', process.env.DOL_ADB || 'adb', ['version']],
    ['android-cli', process.env.DOL_ANDROID_CLI || 'android', ['--no-metrics', '--version']],
    ['scrcpy', process.env.DOL_SCRCPY || 'scrcpy', ['--version']],
  ];
  for (const [name,exe,args]of tools) await check(name, async () => {
    const output = await command(exe, args);
    const detected = output.match(/\b\d+\.\d+(?:\.\d+)?\b/)?.[0];
    if (!detected) throw new Error('Version unavailable');
    return { version: detected };
  }, name === 'adb');
  let selected = false, connected = 0;
  await check('devices', async () => {
    const output = await adb('devices');
    const rows = output.split(/\r?\n/).map(line => line.trim().split(/\s+/)).filter(row => row.length >= 2 && ['device','offline','unauthorized'].includes(row[1]));
    selected = !!options.serial && rows.some(row => row[0] === options.serial && row[1] === 'device');
    connected = rows.filter(row => row[1] === 'device').length;
    return { connected, unavailable: rows.filter(row => row[1] !== 'device').length,
      multipleDevices: rows.length > 1, explicitSerial: !!options.serial, selectedDeviceReady: selected, serials: 'omitted' };
  }, true);
  let pid:string|null = null;
  if (selected && options.package) {
    await check('package', async () => {
      const output = await adb('shell','dumpsys','package',options.package!);
      const versionName = output.match(/versionName=([^\s]+)/)?.[1];
      if (!versionName) throw new Error('Package unavailable');
      return { package: options.package, versionName };
    }, true);
    await check('app-process', async () => {
      const value = (await adb('shell','pidof',options.package!)).trim();
      if (!/^\d+$/.test(value)) throw new Error('Expected one app process');
      pid = value; return { uniqueRunningProcess: true };
    });
    await check('webview-socket', async () => {
      const sockets = (await adb('shell','cat','/proc/net/unix')).split('\n');
      const count = pid ? ['webview_devtools_remote_','browser_webview_devtools_remote_'].filter(prefix => sockets.some(line => line.trim().endsWith(`@${prefix}${pid}`))).length : 0;
      if (!count) throw new Error('Socket unavailable');
      return { supportedAppSocket: true, socketCount: count, forwardingCreated: false };
    });
    await check('run-as', async () => { await adb('shell','run-as',options.package!,'id'); return { available: true, privateDataRead: false }; });
  }
  if (selected) {
    await check('webview-provider', async () => {
      const data = require('./environment.cjs').provider(await adb('shell','dumpsys','webviewupdate'));
      if (data.collectorStatus) throw new Error('Provider unavailable'); return data;
    });
    await check('perfetto', async () => { await adb('shell','which','perfetto'); return { installed: true, traceStarted: false }; });
    await check('forwards', async () => {
      const output = await adb('forward','--list');
      return { selectedDeviceForwardCount: output.split('\n').filter(line => line.startsWith(`${options.serial} `)).length, addresses: 'omitted' };
    });
  }
  if (options.endpoint) await check('cdp', async () => {
    const client = await connect(options.endpoint!, 3000);
    try { const data = await client.send('Browser.getVersion') as {product?:unknown}; return { product: data.product, appAssociation: 'caller-provided; unverified' }; }
    finally { client.close(); }
  });
  await check('output-parent', async () => { fs.accessSync(path.dirname(path.resolve(options.out)), fs.constants.W_OK); return { writablePermissionCheck: true, fileCreationTested: false }; }, true);
  return { schemaVersion: 1, toolVersion: version, capturedAt: new Date().toISOString(), source: 'environment checks',
    status: checks.some(c => c.required && c.status !== 'available') || !connected || (options.serial && !selected) ? 'partial' : 'complete',
    checks, chromeInspect: 'chrome://inspect/#devices', repairedEnvironment: false };
}
const doctorAPI={doctor};
export = doctorAPI;
