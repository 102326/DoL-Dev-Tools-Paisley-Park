'use strict';
// Opt-in neutral validation relay. It exposes three fixed operations to the fresh Codex
// session, with no shared credentials, browser address, deploy, reload or general shell.
const fs = require('node:fs');
const path = require('node:path');
const { execFile } = require('node:child_process');
const { promisify } = require('node:util');
const { performance } = require('node:perf_hooks');
const exec = promisify(execFile);

async function liveHandoff({ codex, dir, mode, context, operations, instructions, writableOut }) {
  fs.mkdirSync(dir, { mode: 0o700 });
  fs.copyFileSync(path.join(__dirname, 'handoff-probe.cjs'), path.join(dir, 'handoff-probe.cjs'), fs.constants.COPYFILE_EXCL);
  const prompt = [
    ...(instructions ?? [
    'This is an owned neutral browser handoff. Continue from the supplied deploy handoff using live evidence.',
    'The browser is already running. You may invoke the following fixed commands from this work directory:',
    'node handoff-probe.cjs observe',
    'node handoff-probe.cjs check-load',
    'node handoff-probe.cjs check-behavior',
    'Decide the order and run one at a time. Use each result to decide if you can continue. Stop on failure.',
    'Do not use other commands, inspect unrelated files, or retry a dispatch. Report loading, behavior and deploy acknowledgement separately.',
    ]),
    JSON.stringify(context),
  ].join('\n');
  const start = performance.now();
  const child = exec(codex, ['exec', '--ephemeral', '--skip-git-repo-check', '-s', 'workspace-write', ...(writableOut ? ['--add-dir', writableOut] : []), '--json', prompt],
    { cwd: dir, timeout: 120000, maxBuffer: 1024 * 1024, windowsHide: true });
  child.child.stdin.end();
  let finished = false, output, processOk = false;
  const done = child.then(result => { output = result.stdout; processOk = true; }, () => {}).finally(() => { finished = true; });
  const handled = new Set();
  const steps = [];
  let blocked = false;
  const keys = Object.keys(operations);
  while (!finished) {
    for (const key of keys) {
      if (handled.has(key) || !fs.existsSync(path.join(dir, key + '.request'))) continue;
      handled.add(key);
      let result = { ok: false, code: 'HANDOFF_ORDER_REQUIRED' };
      if (!blocked && key === keys[steps.length]) {
        try { result = { ok: true, ...await operations[key]() }; }
        catch { result = { ok: false, code: 'LIVE_OBSERVATION_UNCONFIRMED' }; }
      }
      const response = path.join(dir, key + '.partial');
      fs.writeFileSync(response, JSON.stringify(result), { flag: 'wx', mode: 0o600 });
      fs.renameSync(response, path.join(dir, key + '.json'));
      steps.push({ operation: key, ok: result.ok });
      blocked ||= !result.ok;
    }
    if (!finished) await new Promise(resolve => setTimeout(resolve, 50));
  }
  await done;
  // Only register whether the live steps completed. Raw model output never becomes runtime proof.
  const result = { mode, elapsedMs: Math.round(performance.now() - start), steps,
    complete: processOk && !blocked && steps.length === keys.length, processOk, reported: Boolean(output) };
  fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(result, null, 2), { flag: 'wx', mode: 0o600 });
  return result;
}
module.exports = { liveHandoff };
