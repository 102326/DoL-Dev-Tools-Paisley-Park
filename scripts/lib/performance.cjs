function memory(text) {
  const read = label => { const match = text.match(new RegExp(`${label}:\\s*(\\d+)`)); return match ? Number(match[1]) : null; };
  const pssKb = read('TOTAL PSS'), rssKb = read('TOTAL RSS');
  const total = text.match(/^\s*TOTAL\s+(\d+)\s+/m);
  const result = { pssKb: pssKb ?? (total ? Number(total[1]) : null), rssKb, leakDiagnosis: 'not-inferred' };
  if (result.pssKb === null && rssKb === null) throw new Error('Unrecognized meminfo format');
  return result;
}
function frames(text) {
  const read = label => { const match = text.match(new RegExp(`${label}:\\s*(\\d+)`)); return match ? Number(match[1]) : null; };
  const values = []; let columns = null, examined = 0, truncated = false, nonZeroFlags = 0, invalidTiming = 0;
  for (const line of text.split('\n')) {
    if (line.startsWith('Flags,')) { columns = line.trim().split(','); continue; }
    if (!columns || !/^\d+,/.test(line)) continue;
    if (++examined > 10000) { truncated = true; break; }
    const row = line.split(',');
    if (row[0] !== '0') { nonZeroFlags++; continue; }
    const start = Number(row[columns.indexOf('IntendedVsync')]), end = Number(row[columns.indexOf('FrameCompleted')]);
    if (Number.isFinite(start) && Number.isFinite(end) && start > 0 && end >= start && end - start < 60e9) values.push((end - start) / 1e6);
    else invalidTiming++;
  }
  values.sort((a, b) => a - b);
  const totalFrames = read('Total frames rendered'), jankyFrames = read('Janky frames');
  if (totalFrames === null && !values.length) throw new Error('Unrecognized gfxinfo format');
  return { totalFrames, jankyFrames, sampledFrames: values.length, truncated,
    excludedSamples: { nonZeroFlags, invalidTiming },
    medianMs: values.length ? values[Math.floor((values.length - 1) * .5)] : null,
    p95Ms: values.length ? values[Math.ceil(values.length * .95) - 1] : null,
    scope: 'Android gfxinfo accumulated app statistics; nonzero frame flags excluded without interpretation; not whole-game speed or Chromium-only timing' };
}
module.exports = { memory, frames };
