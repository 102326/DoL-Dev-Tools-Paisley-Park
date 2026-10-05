const { randomUUID } = require('node:crypto');
async function collect(ctx) {
  const seconds = ctx.options.recordSeconds;
  if (!Number.isInteger(seconds) || seconds < 1 || seconds > 30) throw new Error('Recording limit must be 1..30 seconds');
  const directory = `/data/local/tmp/dol-dev-${randomUUID()}`;
  const filename = `${directory}/screen.mp4`;
  let created = false, binary, cleanupComplete = true;
  try {
    await ctx.adb('shell','mkdir',directory); created = true;
    // These are transport/capture effects only; no taps, input, restart or app state writes.
    await ctx.adb.execute(['shell','screenrecord','--time-limit',String(seconds),'--bit-rate','4000000',filename], { timeout: (seconds + 5) * 1000 });
    binary = await ctx.adb.execute(['exec-out','cat',filename], { maxBuffer: 64 * 1024 * 1024 });
    if (binary.length < 12 || binary.subarray(4,8).toString() !== 'ftyp') throw new Error('Invalid recording container');
  } finally {
    if (created) {
      try { await ctx.adb('shell','rm','-f',filename); } catch { cleanupComplete = false; }
      try { await ctx.adb('shell','rmdir',directory); } catch { cleanupComplete = false; }
      if (!cleanupComplete) ctx.deviceCaptureCleanupWarning = true;
    }
  }
  return { binary, extension: 'mp4', metadata: { timeLimitSeconds: seconds, bitRate: 4000000,
    deviceCleanupComplete: cleanupComplete, requiresPrivacyReview: true, playbackVerified: false,
    source: 'current device screen; target app foreground not enforced' } };
}
module.exports = { collect };
