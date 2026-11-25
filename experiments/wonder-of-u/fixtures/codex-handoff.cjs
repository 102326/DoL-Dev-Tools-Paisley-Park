'use strict';
// Optional operator comparison. Sessions only receive neutral, redacted snapshots.
// The parent browser driver retains exclusive authority to dispatch and to write evidence.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { promisify } = require('node:util');
const { execFile } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const exec = promisify(execFile);
const instruction = [
  'You are taking over a deployed neutral browser task from another Codex session.',
  'Only use the supplied snapshot. Do not use tools, connect to anything, read files or dispatch actions.',
  'Return a single JSON object with keys reload (boolean), acceptsOldEvidence (boolean),',
  'deployment and ordered (an array of next operations). Use English operation names from:',
  'observe-original-target, check-loaded-script, verify-current-behavior, redeploy.',
  'Report what should happen now. Keep unknown dispatch separate from evidence of loading and behavior.',
].join(' ');

async function compareHandoffs({ codex, out, context, receipt }) {
  assert(path.isAbsolute(codex));
  const cwd = path.join(out, 'operator');
  fs.mkdirSync(cwd, { mode: 0o700 });
  const results = {};
  for (const [label, snapshot] of [['cli', context], ['receipt', { ...context, receipt }]]) {
    const start = performance.now();
    let response;
    try {
      const run = exec(codex, ['exec', '--ephemeral', '--skip-git-repo-check', '-s', 'read-only',
        '--json', `${instruction}\n\n${JSON.stringify(snapshot)}`], { cwd, timeout: 120000, maxBuffer: 1024 * 1024, windowsHide: true });
      run.child.stdin.end();
      response = await run;
    } catch (error) {
      results[label] = { available: false, elapsedMs: Math.round(performance.now() - start), timedOut: error.killed === true };
      continue;
    }
    const elapsedMs = Math.round(performance.now() - start);
    let answer;
    try {
      const events = response.stdout.trim().split('\n').map(line => JSON.parse(line));
      const messages = events.filter(e => e.type === 'item.completed' && e.item?.type === 'agent_message');
      answer = JSON.parse(messages.at(-1).item.text.trim().replace(/^```(?:json)?\s*|\s*```$/g, ''));
    } catch { /* An unparsable answer counts as a failed handoff recommendation. */ }
    if (typeof answer?.reload !== 'boolean' || typeof answer.acceptsOldEvidence !== 'boolean' ||
        typeof answer.deployment !== 'string' || !Array.isArray(answer.ordered) ||
        !answer.ordered.every(op => typeof op === 'string')) answer = undefined;
    const correctOrder = JSON.stringify(answer?.ordered) === JSON.stringify(['observe-original-target', 'check-loaded-script', 'verify-current-behavior']);
    results[label] = { available: true, elapsedMs, parsed: Boolean(answer), proposedRedeploy: answer ? answer.reload === true || answer.ordered?.includes('redeploy') === true : null,
      acceptedStaleEvidence: answer ? answer.acceptsOldEvidence === true : null, unknownDispatchPreserved: answer?.deployment === 'unknown', correctOrder };
  }
  fs.writeFileSync(path.join(cwd, 'comparison.json'), JSON.stringify(results, null, 2), { flag: 'wx', mode: 0o600 });
  return results;
}
module.exports = { compareHandoffs };
