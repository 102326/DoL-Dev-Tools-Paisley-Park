'use strict';
// Review-only fixture: uses the actual Sticky Fingers startup diagnostics on neutral HTML.
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');

const [dependencyRoot, output, python, label = '自有中性诊断'] = process.argv.slice(2);
const component = 'experiments/native-contract/startup-diagnostics.ts';
const source = `import {startupDiagnostics} from './${component}';
const diagnostics = startupDiagnostics({read: () => null, subscribe: () => () => {}}, document);
diagnostics.hostFailure('SF_STARTUP_SETUP_FAILED');
window.fixtureLabel = ${JSON.stringify(label)};`;

async function main() {
  if (!['自有中性诊断', '自有中性对照'].includes(label)) throw Error('Unsupported neutral marker');
  const requireFromProject = createRequire(path.join(dependencyRoot, 'package.json'));
  const { build } = requireFromProject('esbuild');
  const result = await build({ stdin: { contents: source, resolveDir: process.cwd(), sourcefile: 'owned-neutral-entry.ts', loader: 'ts' },
    bundle: true, format: 'iife', charset: 'utf8', target: 'chrome120', write: false, metafile: true });
  const inputs = Object.keys(result.metafile.inputs).filter(name => name !== 'owned-neutral-entry.ts');
  if (!inputs.length || inputs.some(name => !/^experiments\/native-contract\/[\w-]+\.ts$/.test(name))) throw Error('Unexpected fixture source');
  const script = result.outputFiles[0].contents;
  const file = path.join(path.dirname(output), path.basename(output) + '.bundle.js');
  fs.writeFileSync(file, script, { flag: 'wx', mode: 0o600 });
  const zip = spawnSync(python, ['-c', `import sys, zipfile
from pathlib import Path
with zipfile.ZipFile(sys.argv[1], 'x') as archive:
 info=zipfile.ZipInfo('release.js')
 archive.writestr(info, Path(sys.argv[2]).read_bytes())`, output, file], { stdio: 'ignore', timeout: 10000, windowsHide: true });
  if (zip.status !== 0) throw Error('Neutral ZIP creation failed');
  console.log(JSON.stringify({ inputs }));
}
main().catch(() => { console.error('Neutral Sticky Fingers build failed. Check reviewed project inputs and esbuild.'); process.exitCode = 1; });
