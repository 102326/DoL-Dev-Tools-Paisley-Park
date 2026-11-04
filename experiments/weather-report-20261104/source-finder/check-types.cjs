'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const compiler = process.env.PAISLEY_TSC || require.resolve('typescript/bin/tsc');
const types = process.env.PAISLEY_TYPE_ROOTS || path.join(__dirname,'node_modules/@types');
const root = fs.mkdtempSync(path.join(os.tmpdir(),'weather-types-'));
try {
  const file = path.join(root,'negative.mts');
  const engine = path.resolve(__dirname,'../../../scripts/lib/source-find.mts');
  fs.writeFileSync(file,`import type {Kind,Code,Result,Candidate} from ${JSON.stringify(engine)};\n` +
    "const kind: Kind = 'regex';\nconst code: Code = 'RAW_EXCEPTION';\nconst outcome: Result['outcome'] = 'matched';\nconst role: Candidate['basis'][number]['role'] = 'executed';\n");
  const checked = spawnSync(process.execPath,[compiler,'--allowImportingTsExtensions','--noEmit','--strict','--target','ES2022','--module','Node16','--moduleResolution','Node16','--types','node','--typeRoots',types,file],{encoding:'utf8'});
  assert.equal(checked.status,2,'negative control must fail type checking');
  assert.equal((checked.stdout.match(/error TS2322:/g)||[]).length,4,'all four contract drifts must be rejected');
  console.log('PASS: four finite-contract type drifts rejected (TS2322)');
} finally { fs.rmSync(root,{recursive:true,force:true}); }
