'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');
test('failed compiler discovery or version check removes stale runtime output', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(),'weather-build-'));
  t.after(() => fs.rm(dir,{recursive:true,force:true}));
  await fs.copyFile(path.join(__dirname,'../build.cjs'),path.join(dir,'build.cjs'));
  await fs.mkdir(path.join(dir,'bad-compiler','bin'),{recursive:true});
  await fs.writeFile(path.join(dir,'bad-compiler','package.json'),'{"version":"0.0.0"}');
  for (const compiler of [path.join(dir,'missing','bin','tsc'),path.join(dir,'bad-compiler','bin','tsc')]) {
    await fs.mkdir(path.join(dir,'dist'),{recursive:true});
    await fs.writeFile(path.join(dir,'dist','engine.js'),'stale');
    const run = spawnSync(process.execPath,[path.join(dir,'build.cjs')],{env:{...process.env,PAISLEY_TSC:compiler}});
    assert.notEqual(run.status,0);
    await assert.rejects(fs.access(path.join(dir,'dist','engine.js')),{code:'ENOENT'});
  }
});
