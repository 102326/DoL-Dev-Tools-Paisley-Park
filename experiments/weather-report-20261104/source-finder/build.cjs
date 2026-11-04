'use strict';
const path = require('node:path');
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
// A failed toolchain lookup must not leave runnable stale output.
fs.rmSync(path.join(__dirname, 'dist'), {recursive: true, force: true});
const compiler = process.env.PAISLEY_TSC || require.resolve('typescript/bin/tsc');
const typeRoots = process.env.PAISLEY_TYPE_ROOTS || path.join(__dirname, 'node_modules/@types');
const version = require(path.join(path.dirname(compiler), '../package.json')).version;
if (version !== '6.0.2') throw new Error('Expected TypeScript 6.0.2');
const args = ['--noEmitOnError', '--erasableSyntaxOnly', '--strict', '--target', 'ES2022', '--module', 'Node16', '--moduleResolution', 'Node16',
  '--types', 'node', '--typeRoots', typeRoots, '--declaration', '--outDir', path.join(__dirname, 'dist'),
  ...fs.readdirSync(path.join(__dirname, 'src')).filter(f => f.endsWith('.ts')).map(f => path.join(__dirname, 'src', f))];
const result = spawnSync(process.execPath, [compiler, ...args], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
