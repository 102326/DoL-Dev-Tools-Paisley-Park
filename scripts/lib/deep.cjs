const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const exec = promisify(execFile);
function fileInfo(filename, maximum) {
  const stat = fs.lstatSync(filename);
  if (!stat.isFile() || stat.size === 0 || stat.size > maximum) throw new Error('Invalid heavy artifact');
  const digest = createHash('sha256'), buffer = Buffer.alloc(1024 * 1024);
  const descriptor = fs.openSync(filename, 'r');
  try { let size; while ((size = fs.readSync(descriptor, buffer, 0, buffer.length, null))) digest.update(buffer.subarray(0,size)); }
  finally { fs.closeSync(descriptor); }
  return { bytes: stat.size, sha256: digest.digest('hex') };
}
async function perfetto(ctx) {
  if (ctx.options.sensitive !== true) throw new Error('Heavy capture requires explicit sensitive-data selection');
  const helper = process.env.DOL_PERFETTO_RECORDER;
  if (!helper || !['record_android_trace','record_android_trace.py'].includes(path.basename(helper)) || !fs.statSync(helper).isFile()) {
    return { collectorStatus: 'unsupported', reason: 'official-recorder-not-configured' };
  }
  const seconds = ctx.options.deepSeconds;
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 30) throw new Error('Trace duration must be 1..30');
  const helperSha256 = fileInfo(helper, 1024 * 1024).sha256;
  const sdk = Number((await ctx.adb('shell','getprop','ro.build.version.sdk')).toString().trim());
  if (!Number.isInteger(sdk) || sdk < 29) return { collectorStatus: 'unsupported', reason: 'android-10-required-no-sideload' };
  await ctx.adb('shell','which','perfetto');
  const filename = path.join(ctx.output,'trace.perfetto-trace');
  if (fs.existsSync(filename)) throw new Error('Trace output exists');
  const run = ctx.runHeavy || exec;
  let failed = false;
  const adbPath = process.env.DOL_ADB;
  try {
    await run(process.env.DOL_PYTHON || 'python', [helper,'--serial',ctx.options.serial,'--no-open','-t',`${seconds}s`,'-b','32mb','-a',ctx.options.package,'-o',filename,'sched','gfx','wm'], {
      timeout: (seconds + 30) * 1000, maxBuffer: 65536, windowsHide: true,
      env: { ...process.env, ...(adbPath ? { PATH: `${path.dirname(path.resolve(adbPath))}${path.delimiter}${process.env.PATH || ''}` } : {}) },
    });
  } catch { failed = true; }
  const info = fileInfo(filename, 40 * 1024 * 1024);
  return { file: filename, ...info, collectorStatus: failed ? 'failed' : 'completed', reason: failed ? 'recorder-failed-artifact-preserved' : null,
    metadata: { source: 'official Perfetto recorder; system interpretation requires external viewer',
      helperSha256, durationLimitSeconds: seconds, bufferMb: 32,
      categories: ['sched','gfx','wm'], sensitive: true, requiresPrivacyReview: true, traceParsed: false } };
}
async function bugreport(ctx) {
  if (ctx.options.sensitive !== true) throw new Error('Heavy capture requires explicit sensitive-data selection');
  const filename = path.join(ctx.output,'bugreport.zip');
  if (fs.existsSync(filename)) throw new Error('Bugreport output exists');
  let failed = false;
  try { await ctx.adb.execute(['bugreport',filename], { timeout: 180000, maxBuffer: 65536 }); }
  catch { failed = true; }
  const info = fileInfo(filename, 512 * 1024 * 1024);
  const descriptor = fs.openSync(filename,'r'), header = Buffer.alloc(4);
  try { fs.readSync(descriptor,header,0,4,0); } finally { fs.closeSync(descriptor); }
  if (header.subarray(0,2).toString() !== 'PK') failed = true;
  return { file: filename, ...info, collectorStatus: failed ? 'failed' : 'completed', reason: failed ? 'bugreport-failed-artifact-preserved' : null,
    metadata: { source: 'Android system bugreport; includes information outside target app', sensitive: true,
      requiresPrivacyReview: true, archiveIntegrityVerified: false, timeoutMs: 180000, systemMayRetainCopy: true } };
}
module.exports = { perfetto, bugreport, fileInfo };
