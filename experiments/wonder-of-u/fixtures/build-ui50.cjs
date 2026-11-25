'use strict';
// Adapter for the fixed UI 5.0 player-package build, using the project's normal producers.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function inputs(root) {
  const scopes = ['framework', 'src', 'twee', 'package.json', 'package-lock.json', 'tsconfig.public.json',
    'tsconfig.tools.json', 'shop-page-experiment.ts', 'scripts/build-tooling.mts', 'scripts/build-framework.mts',
    'scripts/build-early.cts', 'scripts/package.py', 'scripts/package-framework.py', 'scripts/shop_package.py',
    'docs/UI_SETTINGS.md', 'docs/OPTIONAL_ADAPTERS.md', 'docs/RELEASE_4.5.1.md', 'docs/INSTALL_4.5.md',
    'LICENSE', 'UPSTREAM-RENDERER-LICENSE', 'UPSTREAM-RENDERER-NOTICE.md', 'MODHUB-PERFORMANCE-NOTICE.txt'];
  const inventory = execFileSync('git', ['ls-files', '-z', '--', ...scopes], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  // The optional packaged Markdown can be absent at this fixed revision.
  return inventory.filter(name => fs.existsSync(path.join(root, name))).sort();
}

const names = ['StoneFreeHost-0.1.5-experimental.mod.zip', 'DoLGameUI-4.5.1.mod.zip'];
if (require.main === module) {
  try {
    const [host, ui, python] = process.argv.slice(2);
    const root = process.cwd();
    const prepared = names.map(name => path.join(root, 'dist', 'framework', name));
    if (prepared.some(file => fs.existsSync(file))) throw Error('The UI build needs fresh package output slots');
    const run = (program, args) => execFileSync(program, args, {
      cwd: root, stdio: 'ignore', timeout: 100000, windowsHide: true,
    });
    run(process.execPath, ['--experimental-strip-types', 'scripts/build-tooling.mts']);
    run(process.execPath, ['scripts/build-framework.mjs']);
    run(python, ['scripts/package.py']);
    for (const [i, file] of [host, ui].entries()) fs.copyFileSync(prepared[i], file, fs.constants.COPYFILE_EXCL);
    console.log(JSON.stringify({ inputs: inputs(root) }));
  } catch {
    console.error('UI 5.0 package build failed. Check the project tools, released-package inputs and fresh output slots.');
    process.exitCode = 1;
  }
}
module.exports = { inputs, names };
