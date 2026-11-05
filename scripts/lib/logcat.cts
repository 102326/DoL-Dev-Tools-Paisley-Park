import type collectors from './collectors.cjs';
interface Row {timestamp:number;level:string;category:string}
interface Context extends Pick<collectors.Context,'adb'|'appPid'> {options:{logcatSeconds?:number}}
'use strict';

const TAG_CATEGORIES = new Map([
  ['AndroidRuntime', 'AndroidRuntime'],
  ['chromium', 'chromium'],
  ['WebView', 'WebView'],
  ['ActivityManager', 'ActivityManager'],
]);

function parseLine(line:string):Row|'separator'|null {
  line = line.trimStart();
  if (/^--------- beginning of [a-z]+$/.test(line)) return 'separator';
  const match = line.match(/^(\d{10}(?:\.\d+)?)\s+\d+\s+\d+\s+([VDIWEF])\s+([^(:]+)(?:\([^)]*\))?:/);
  if (!match) return null;
  const timestamp = Number(match[1]);
  if (!Number.isFinite(timestamp)) return null;
  return { timestamp, level: match[2], category: TAG_CATEGORIES.get(match[3].trim()) || 'other' };
}

function summarize(text:unknown) {
  const lines = String(text).split(/\r?\n/).filter(Boolean);
  const parsed = lines.map(parseLine);
  if (parsed.some(row => row === null)) throw new Error('Unsupported logcat epoch format');
  const records = parsed.filter(row => row !== 'separator') as Row[];
  return {
    records,
    count: records.length,
    privacyPolicy: 'messages and arbitrary tags omitted',
  };
}

async function collect(ctx:Context) {
  if (!/^\d+$/.test(String(ctx.appPid || ''))) return { collectorStatus: 'unsupported', reason: 'app-process-unavailable' };
  const requested = ctx.options?.logcatSeconds ?? 30;
  if (!Number.isInteger(requested) || requested < 1 || requested > 300) throw new Error('Invalid logcatSeconds');

  const deviceNow = Number((await ctx.adb('shell', 'date', '+%s')).toString().trim());
  if (!Number.isSafeInteger(deviceNow) || deviceNow <= 0) throw new Error('Invalid device epoch time');
  const raw = (await ctx.adb('logcat', '-d', '-v', 'epoch', '--pid=' + ctx.appPid, '-t', '300')).toString();
  const summary = summarize(raw);
  const start = deviceNow - requested;
  const records = summary.records.filter(row => row.timestamp >= start && row.timestamp <= deviceNow);
  return {
    window: { startEpochSeconds: start, endEpochSeconds: deviceNow, seconds: requested },
    records,
    count: records.length,
    privacyPolicy: summary.privacyPolicy,
    truncated: summary.count >= 300,
    clockResolutionSeconds: 1,
  };
}

const api={collect,summarize};
export = api;
