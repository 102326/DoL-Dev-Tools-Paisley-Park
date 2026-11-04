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
function actualHelperRoot(){return path.resolve(__dirname,'../../../../scripts/lib')}
test('checker rejects generated drift and accepts checkout-only CRLF without rewriting it',async t=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'weather-build-drift-'));
  t.after(()=>fs.rm(dir,{recursive:true,force:true}));
  const home=path.join(dir,'experiments/weather-report-20261104/source-finder'),lib=path.join(dir,'scripts/lib');
  await fs.mkdir(home,{recursive:true});await fs.mkdir(lib,{recursive:true});
  const actual=path.resolve(__dirname,'../../../../scripts/lib');
  const build=path.join(home,'build.cjs');
  await fs.copyFile(path.join(actualHelperRoot(),'owned-files.cjs'),path.join(lib,'owned-files.cjs'));
  await fs.copyFile(path.join(__dirname,'../build.cjs'),build);
  const runtime=(await fs.readFile(path.join(actual,'source-find.cjs'),'utf8')).replaceAll('\r\n','\n'),source=(await fs.readFile(path.join(actual,'source-find.mts'),'utf8')).replaceAll('\r\n','\n');
  await fs.writeFile(path.join(lib,'source-find.mts'),source.replaceAll('\n','\r\n'));
  await fs.writeFile(path.join(lib,'source-find.cjs'),runtime.replaceAll('\n','\r\n'));
  const env={...process.env,PAISLEY_TSC:process.env.PAISLEY_TSC||require.resolve('typescript/bin/tsc'),PAISLEY_TYPE_ROOTS:process.env.PAISLEY_TYPE_ROOTS||path.resolve(__dirname,'../node_modules/@types')};
  const run=()=>spawnSync(process.execPath,[build,'--check'],{encoding:'utf8',env});
  const match=run();assert.equal(match.status,0,match.stdout+match.stderr);
  const changed=runtime+'\n// synthetic runtime drift\n';await fs.writeFile(path.join(lib,'source-find.cjs'),changed);
  const drift=run();assert.equal(drift.status,1);assert.match(drift.stderr,/SOURCE_BUILD_DRIFT/);
  assert.equal(await fs.readFile(path.join(lib,'source-find.cjs'),'utf8'),changed,'check mode cannot overwrite a tracked runtime');
  await assert.rejects(fs.access(path.join(home,'dist')),{code:'ENOENT'});
  const shim=path.join(dir,'write-failure.cjs');
  await fs.writeFile(shim,`const fs=require('node:fs'),write=fs.writeFileSync;fs.writeFileSync=function(fd,bytes,...args){if(typeof fd==='number'){fs.writeSync(fd,Buffer.from(bytes).subarray(0,9));throw Object.assign(Error('synthetic partial write'),{code:'EIO'})}return write.call(this,fd,bytes,...args)};`);
  const failed=spawnSync(process.execPath,['-r',shim,build,'--write-production'],{encoding:'utf8',env});
  assert.equal(failed.status,1);assert.equal(await fs.readFile(path.join(lib,'source-find.cjs'),'utf8'),changed,'partial staging failure must preserve previous runtime');
  const refreshed=spawnSync(process.execPath,[build,'--write-production'],{encoding:'utf8',env});
  assert.equal(refreshed.status,0,refreshed.stderr);assert.equal(await fs.readFile(path.join(lib,'source-find.cjs'),'utf8'),runtime);
});
