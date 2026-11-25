'use strict';
// Transfer one reviewed archive into the selected debug app's private inbox.
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { archiveIdentity } = require('../loaded-script.cjs');
const { digest, failure, readBytes } = require('../receipt.cjs');
const packageId = 'org.paisleypark.wondershell';
const maxArchive = 4 * 1024 * 1024;
const names = new Set(['index.html', 'release.js', 'styles.css']);

function stage(serial, zip, python, invoke = execFileSync) {
  if (typeof serial !== 'string' || !/^[\w.:-]{1,128}$/.test(serial) || typeof zip !== 'string' || !path.isAbsolute(zip)
    || !(path.isAbsolute(python) || ['python3', 'python'].includes(python)))
    throw failure('SHELL_INPUT_INVALID', 'arguments', 'Select the exact device, approved neutral ZIP and Python executable.');
  const archive = archiveIdentity(zip, 'release.js', python, 'utf8');
  if (!archive.members.some(v => v.name === 'index.html') || archive.members.some(v => !names.has(v.name) || v.size > 1024 * 1024))
    throw failure('SHELL_ARCHIVE_INVALID', 'artifact', 'Use the reviewed neutral fixture with index.html, release.js and optional styles.css.');
  const bytes = readBytes(zip, maxArchive);
  if (digest(bytes) !== archive.sha256) throw failure('SHELL_ARCHIVE_CHANGED', 'artifact', 'Select the original sealed fixture ZIP.');
  const adb = (args, input) => invoke(process.env.DOL_ADB || 'adb', ['-s', serial, ...args], {
    input, stdio: [input ? 'pipe' : 'ignore', 'pipe', 'pipe'], timeout: 15000, maxBuffer: maxArchive, windowsHide: true,
  });
  const partial = 'files/fixture-inbox.partial';
  const inbox = 'files/fixture-inbox.zip';
  try {
    // Remote shell text is fixed. Noclobber preserves a partial transfer from an earlier uncertain attempt.
    adb(['shell', '-T', `run-as ${packageId} sh -c 'set -C; cat > ${partial}'`], bytes);
    if (digest(adb(['exec-out', 'run-as', packageId, 'cat', partial])) !== archive.sha256)
      throw Error('Transfer digest mismatch');
    adb(['shell', 'run-as', packageId, 'mv', partial, inbox]);
    if (digest(adb(['exec-out', 'run-as', packageId, 'cat', inbox])) !== archive.sha256)
      throw Error('Inbox digest mismatch');
  } catch {
    throw failure('SHELL_STAGE_UNCONFIRMED', 'transfer', 'Inspect the selected private inbox and partial transfer before retrying or activating.');
  }
  return { schemaVersion: 1, status: 'staged', activation: 'operator-required', artifactSha256: archive.sha256 };
}

if (require.main === module) {
  const [serial, zip, python = 'python3'] = process.argv.slice(2);
  if (!serial || serial === '--help') console.log('node stage.cjs SELECTED_SERIAL ABS_NEUTRAL_ZIP [PYTHON]');
  else {
    try { console.log(JSON.stringify(stage(serial, zip, python))); }
    catch (error) {
      console.error(JSON.stringify(error.field ? { code: error.code, field: error.field, hint: error.hint }
        : { code: 'SHELL_STAGE_INPUT_UNAVAILABLE', hint: 'Check the selected reviewed ZIP and Python executable.' }));
      process.exitCode = 1;
    }
  }
}
module.exports = { stage };
