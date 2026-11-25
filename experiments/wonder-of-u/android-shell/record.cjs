'use strict';
// One read-only observation per new file, including negative controls and unknown outcomes.
const fs = require('node:fs');
const path = require('node:path');
const { verify } = require('./observe.cjs');

async function record(out, expect, observe) {
  if (!path.isAbsolute(out) || !['matched', 'staged-bytes-differ'].includes(expect))
    throw new Error('Select a new absolute evidence path and a supported expectation.');
  const fd = fs.openSync(out, 'wx', 0o600);
  try {
    let result;
    try { result = await observe(); }
    catch (error) {
      result = { status: 'unknown', reason: 'observation-error', code: error.field ? error.code : 'SHELL_OBSERVATION_UNAVAILABLE' };
    }
    const accepted = expect === 'matched'
      ? result.status === 'matched' && result.cleanup === 'completed' && /^[a-f0-9]{64}$/.test(result.documentSha256)
      : result.status === 'mismatch' && result.reason === 'staged-bytes-differ';
    fs.writeFileSync(fd, JSON.stringify({ capturedAt: new Date().toISOString(), expect, accepted, result }, null, 2) + '\n');
    fs.fsyncSync(fd);
    return { status: result.status, reason: result.reason, accepted };
  } finally { fs.closeSync(fd); }
}

if (require.main === module) {
  const [out, expect, serial, target, zip, python = 'python3'] = process.argv.slice(2);
  if (out === '--help') {
    console.log('node record.cjs NEW_ABS_JSON matched|staged-bytes-differ SERIAL PAGE_ID ABS_ZIP [PYTHON]');
  } else if (!out || !expect || !serial || !target || !zip) {
    console.error('Select a new record, expectation, serial, target ID and neutral ZIP.');
    process.exitCode = 1;
  } else {
    record(out, expect, () => verify(serial, target, zip, python)).then(summary => {
      console.log(JSON.stringify(summary));
      if (!summary.accepted) process.exitCode = 2;
    }).catch(error => {
      console.error(error.code === 'EEXIST' ? 'Evidence path already exists. No observation started.' : 'Could not create or finish the observation record.');
      process.exitCode = 1;
    });
  }
}
module.exports = { record };
