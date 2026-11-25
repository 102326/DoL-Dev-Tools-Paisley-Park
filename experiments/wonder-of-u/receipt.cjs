'use strict';
const fs = require('node:fs');
const path = require('node:path');
const { createHash, randomUUID } = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { owned } = require('../../scripts/lib/owned-files.cjs');

const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const hashObject = (value) => digest(JSON.stringify(value));
const failure = (code, field, hint) => Object.assign(Error(code), { code, field, hint });
const MAX_RECORD = 512 * 1024;

function readBytes(file, max) {
  const stat = fs.lstatSync(file);
  if (!stat.isFile() || stat.size > max) throw failure('INPUT_FILE', 'file', 'Select a bounded regular local file.');
  const fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
  try {
    const actual = fs.fstatSync(fd);
    if (!actual.isFile() || actual.size > max || actual.ino !== stat.ino) throw failure('INPUT_CHANGED', 'file', 'Select a stable regular file.');
    const bytes = Buffer.alloc(actual.size);
    let offset = 0;
    while (offset < bytes.length) {
      const size = fs.readSync(fd, bytes, offset, bytes.length - offset, offset);
      if (size === 0) break;
      offset += size;
    }
    if (offset !== actual.size || fs.fstatSync(fd).size !== actual.size) throw failure('INPUT_CHANGED', 'file', 'Wait for the selected file to finish writing.');
    return bytes;
  } finally { fs.closeSync(fd); }
}

function readJson(file, max = MAX_RECORD) { return JSON.parse(readBytes(file, max).toString('utf8')); }

function readStage(dir, stage) {
  try { return readJson(path.join(dir, `${stage}.json`)); }
  catch (error) {
    if (error.code === 'ENOENT') return undefined;
    throw failure('RECEIPT_INVALID', stage, 'Preserve this receipt and inspect the local record.');
  }
}

function append(dir, stage, value) {
  if (!fs.lstatSync(dir).isDirectory()) throw failure('RECEIPT_DIRECTORY', 'receipt', 'Use the original regular receipt directory.');
  const slot = path.join(dir, `${stage}.json`);
  const scratch = path.join(dir, `.write-${randomUUID()}`);
  const bytes = Buffer.from(JSON.stringify({ schemaVersion: 1, ...value }, null, 2) + '\n');
  if (bytes.length > MAX_RECORD) throw failure('RECEIPT_LIMIT', stage, 'Reduce the number of recorded inputs.');
  const owner = owned();
  try {
    owner.write(scratch, bytes);
    const fd = fs.openSync(scratch, 'r+');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    // Exclusive publication: a concurrent caller can never replace a stage.
    fs.linkSync(scratch, slot);
  } catch (error) {
    if (error.code === 'EEXIST') throw failure('RECEIPT_EXISTS', stage, 'Read status and preserve the earlier stage.');
    throw error;
  } finally { owner.cleanup(); }
}

function snapshot(root, inputList) {
  const inputs = [...new Set(inputList)].sort();
  if (!Array.isArray(inputList) || inputs.length < 1 || inputs.length !== inputList.length || inputs.length > 512)
    throw failure('BUILD_INPUTS_INVALID', 'inputs', 'List each reviewed build input once.');
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !name.toUpperCase().startsWith('GIT_')));
  const git = (args) => execFileSync('git', args, { cwd: root, env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 10000 });
  const realRoot = fs.realpathSync(root);
  if (fs.realpathSync(git(['rev-parse', '--show-toplevel']).trim()) !== realRoot)
    throw failure('BUILD_ROOT_INVALID', 'root', 'Use the exact Git repository root.');
  const head = git(['rev-parse', 'HEAD']).trim();
  const dirty = !!git(['status', '--porcelain=v1', '--untracked-files=normal']);
  const members = inputs.map((name) => {
    if (typeof name !== 'string' || !name || /[\\:\u0000-\u001f]/.test(name) || name.split('/').some((v) => !v || v === '..' || v === '.' || v.toLowerCase() === '.git'))
      throw failure('BUILD_INPUT_PATH', 'inputs', 'Use canonical relative source paths inside the selected root.');
    const file = path.join(realRoot, name);
    if (fs.realpathSync(file) !== file) throw failure('BUILD_INPUT_PATH', 'inputs', 'Select source files without symbolic links.');
    const bytes = readBytes(file, 16 * 1024 * 1024);
    return { name, bytes: bytes.length, sha256: digest(bytes) };
  });
  return { head, dirty, files: members, sha256: hashObject(members) };
}

function targetIdentity(target) {
  const { profileId, browserId, targetId, origin, document } = target;
  const targetSha256 = hashObject([profileId, browserId, targetId, origin]);
  return { targetSha256, documentSha256: hashObject([targetSha256, document.frameId, document.loaderId, document.url, document.uniqueContextId]) };
}

function state(dir) {
  const built = readStage(dir, 'build');
  const blocked = readStage(dir, 'build-failure');
  const intent = readStage(dir, 'deployment-intent');
  const ack = readStage(dir, 'deployment-ack');
  const loaded = readStage(dir, 'load');
  const behavior = readStage(dir, 'behavior');
  const result = {
    schemaVersion: 1, build: built?.status ?? blocked?.status ?? 'unknown', artifactSha256: built?.artifact.sha256 ?? null,
    deployment: ack?.status ?? (intent ? 'unknown' : 'not-dispatched'), load: loaded?.status ?? 'unverified',
    behavior: behavior?.status ?? 'unverified', automaticReplay: false,
  };
  if (blocked || !built) return { ...result, next: blocked ? 'fix-build-and-start-new-receipt' : 'inspect-build-interruption' };
  if (behavior) return { ...result, next: behavior.status === 'passed' ? 'complete' : 'inspect-behavior-failure' };
  if (loaded) return { ...result, next: 'verify-behavior-on-original-document' };
  if (ack?.status === 'acknowledged') return { ...result, next: 'verify-loaded-artifact' };
  if (intent) return { ...result, next: 'observe-original-target' };
  return { ...result, next: 'check-current-target' };
}

module.exports = { digest, hashObject, failure, append, readBytes, readJson, readStage, snapshot, state, targetIdentity };
