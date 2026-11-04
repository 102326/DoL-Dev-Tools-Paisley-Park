const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const {spawnSync}=require('node:child_process');
const cli=path.resolve(__dirname,'../scripts/dol-dev.cjs');
function fixture(t) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-source-cli-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const root=path.join(dir,'source'),file=path.join(dir,'query.json'),out=path.join(dir,'result.json');
  fs.mkdirSync(root);fs.writeFileSync(path.join(root,'rooms.twee'),':: PracticeRoom\nA paper umbrella.\n');
  fs.writeFileSync(file,JSON.stringify({schemaVersion:1,clues:[{kind:'passage',value:'PracticeRoom'}]}));
  const args=['source-find','--root',root,'--file',file,'--out',out];
  const run=(flags=[],prefix=[])=>spawnSync(process.execPath,[...prefix,cli,...args,...flags],{encoding:'utf8',timeout:10000});
  const shim=body=>{const name=path.join(dir,'shim.cjs');fs.writeFileSync(name,body);return ['-r',name]};
  return {dir,root,file,out,args,run,shim};
}
test('formal CLI uses prebuilt runtime without device/Goal and publishes bounded local candidates',t=>{
  const f=fixture(t),r=f.run();assert.equal(r.status,0,r.stderr);
  assert.match(r.stdout,/Source lookup candidates/);assert(!r.stdout.includes(f.dir));
  const value=JSON.parse(fs.readFileSync(f.out));
  assert.equal(value.schemaVersion,1);assert.equal(value.selection.root,f.root);assert.equal(value.selection.limits.maxFiles,2000);assert.equal(value.data.candidates[0].file,'rooms.twee');
  assert.equal(value.data.candidates[0].basis[0].role,'definition');assert.equal(value.data.complete,true);
  assert.deepEqual(fs.readdirSync(f.dir).sort(),['query.json','result.json','source']);
});
test('invalid/missing/oversized/non-UTF8 query and root override fail without output or raw inputs',t=>{
  const f=fixture(t);
  for(const body of ['{PRIVATE',JSON.stringify({schemaVersion:1,root:'PRIVATE',clues:[{kind:'text',value:'x'}]}),' '.repeat(65537),Buffer.from([0xff])]){
    fs.writeFileSync(f.file,body);const r=f.run();assert.equal(r.status,1);assert.match(r.stderr,/SOURCE_(QUERY|REQUEST)_INVALID/);
    assert(!r.stderr.includes('PRIVATE'));assert(!r.stderr.includes(f.dir));assert(!fs.existsSync(f.out));
  }
  fs.unlinkSync(f.file);const r=f.run();assert.match(r.stderr,/SOURCE_QUERY_INVALID stage=source.query/);
});
test('existing output, dangling symlink and peer output created at publication are preserved',t=>{
  const f=fixture(t);fs.writeFileSync(f.out,'PRIVATE_EXISTING');
  assert.match(f.run().stderr,/SOURCE_OUTPUT_EXISTS/);assert.equal(fs.readFileSync(f.out,'utf8'),'PRIVATE_EXISTING');
  fs.unlinkSync(f.out);
  if(process.platform!=='win32'){
    fs.symlinkSync(path.join(f.dir,'missing'),f.out);assert.match(f.run().stderr,/SOURCE_OUTPUT_EXISTS/);assert(fs.lstatSync(f.out).isSymbolicLink());fs.unlinkSync(f.out);
  }
  const injection=f.shim(`const fs=require('node:fs'),link=fs.linkSync;fs.linkSync=(a,b)=>{fs.writeFileSync(b,'peer',{flag:'wx'});return link(a,b)};`);
  const r=f.run([],injection);assert.equal(r.status,1);assert.match(r.stderr,/SOURCE_OUTPUT_EXISTS/);assert.equal(fs.readFileSync(f.out,'utf8'),'peer');
  assert(!fs.readdirSync(f.dir).some(n=>n.startsWith('.paisley-source-find-')));
});
test('partial results are retained with exit 2, full no-match uses exit 0',t=>{
  const f=fixture(t);fs.writeFileSync(path.join(f.root,'second.js'),'const x=1;');
  fs.writeFileSync(f.file,JSON.stringify({schemaVersion:1,clues:[{kind:'text',value:'absent'}],limits:{maxFiles:1}}));
  const r=f.run();assert.equal(r.status,2,r.stderr);const result=JSON.parse(fs.readFileSync(f.out)).data;
  assert.equal(result.outcome,'partial');assert(result.partialReasons.includes('max-files'));
  fs.unlinkSync(f.out);fs.writeFileSync(f.file,JSON.stringify({schemaVersion:1,clues:[{kind:'text',value:'absent'}]}));
  assert.equal(f.run().status,0);assert.equal(JSON.parse(fs.readFileSync(f.out)).data.outcome,'none');
});
test('failed temporary write publishes nothing; hard-link failure has no non-atomic fallback',t=>{
  const f=fixture(t);
  for(const body of [
    `const fs=require('node:fs'),write=fs.writeFileSync;fs.writeFileSync=(fd,...args)=>{if(typeof fd==='number'){fs.writeSync(fd,'{');throw Error('PRIVATE_WRITE')}return write(fd,...args)};`,
    `require('node:fs').linkSync=()=>{throw Object.assign(Error('PRIVATE_LINK'),{code:'ENOTSUP'})};`,
  ]){
    const r=f.run([],f.shim(body));assert.equal(r.status,1);assert.match(r.stderr,/SOURCE_OUTPUT_FAILED stage=source.output/);assert(!r.stderr.includes('PRIVATE'));assert(!fs.existsSync(f.out));
    assert(!fs.readdirSync(f.dir).some(n=>n.startsWith('.paisley-source-find-')));
  }
});
test('unknown stage replacement is retained; successful publish reports cleanup uncertainty',t=>{
  const f=fixture(t);
  const injection=f.shim(`const fs=require('node:fs'),mk=fs.mkdtempSync,stat=fs.lstatSync;let stage;fs.mkdtempSync=(...a)=>{stage=mk(...a);return stage};fs.lstatSync=(p,...a)=>{if(p===stage)throw Object.assign(Error('PRIVATE_STAGE'),{code:'EIO'});return stat(p,...a)};`);
  const r=f.run([],injection);assert.equal(r.status,1);assert.match(r.stderr,/SOURCE_OUTPUT_INCOMPLETE stage=source.cleanup/);assert(!r.stderr.includes('PRIVATE'));assert(!fs.existsSync(f.out));
  const stages=fs.readdirSync(f.dir).filter(n=>n.startsWith('.paisley-source-find-'));assert.equal(stages.length,1);assert.deepEqual(fs.readdirSync(path.join(f.dir,stages[0])),[]);
  fs.rmdirSync(path.join(f.dir,stages[0]));
  const cleanup=f.shim(`const fs=require('node:fs'),unlink=fs.unlinkSync;fs.unlinkSync=p=>{if(String(p).includes('.paisley-source-find-'))throw Error('PRIVATE_CLEANUP');return unlink(p)};`);
  const ok=f.run([],cleanup);assert.equal(ok.status,0,ok.stderr);assert.match(ok.stdout,/cleanup unconfirmed/);assert.equal(JSON.parse(fs.readFileSync(f.out)).data.complete,true);
});
test('prebuilt CLI works when native type stripping is disabled',t=>{
  const f=fixture(t),r=f.run([],['--no-strip-types']);assert.equal(r.status,0,r.stderr);
  assert.equal(JSON.parse(fs.readFileSync(f.out)).data.complete,true);
});
test('output preflight errors retain the specific stage without guessing a cause',t=>{
  const f=fixture(t),parent=path.join(f.dir,'not-directory');fs.writeFileSync(parent,'peer');
  const args=f.args.slice();args[args.indexOf('--out')+1]=path.join(parent,'new.json');
  const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});
  assert.equal(r.status,1);assert.match(r.stderr,/SOURCE_OUTPUT_FAILED stage=source.output/);
  assert(!r.stderr.includes(f.dir));assert.equal(fs.readFileSync(parent,'utf8'),'peer');
});
test('unknown module exceptions are not relabeled as Node or installation problems',t=>{
  const f=fixture(t),prefix=f.shim(`const Module=require('node:module'),load=Module._load;Module._load=function(id,...args){if(id==='./source-find.cjs')throw Error('PRIVATE_PROGRAMMING_ERROR');return load.call(this,id,...args)};`);
  const r=f.run([],prefix);assert.equal(r.status,1);assert.match(r.stderr,/COMMAND_FAILED stage=command/);assert(!r.stderr.includes('PRIVATE'));assert(!r.stderr.includes('SOURCE_RUNTIME_UNAVAILABLE'));assert(!fs.existsSync(f.out));
});
test('nonregular query paths fail without waiting for stream input',{skip:process.platform==='win32'},t=>{
  const f=fixture(t);fs.unlinkSync(f.file);
  const made=spawnSync('mkfifo',[f.file]);assert.equal(made.status,0);
  const r=f.run();assert.equal(r.status,1);assert.match(r.stderr,/SOURCE_QUERY_INVALID/);assert(!fs.existsSync(f.out));
});
test('publication confirmation loss never reports known absence or deletes the result',t=>{
  const f=fixture(t),prefix=f.shim(`const fs=require('node:fs'),link=fs.linkSync;fs.linkSync=(...args)=>{link(...args);throw Object.assign(Error('PRIVATE_ACK_LOSS'),{code:'EIO'})};`);
  const r=f.run([],prefix);assert.equal(r.status,1);assert.match(r.stderr,/SOURCE_OUTPUT_INCOMPLETE stage=source.cleanup/);
  assert.equal(JSON.parse(fs.readFileSync(f.out)).data.complete,true);assert(!r.stderr.includes('PRIVATE'));
});
test('public query examples and schema boundary cases match real CLI acceptance',t=>{
  const f=fixture(t),cases=require('./fixtures/source-find-queries.json');
  for(const item of cases){
    fs.writeFileSync(f.file,JSON.stringify(item.query));const r=f.run();
    assert.equal(r.status,item.valid?0:1,item.name+': '+r.stderr);
    assert.equal(fs.existsSync(f.out),item.valid,item.name);
    if(item.valid)fs.unlinkSync(f.out);
  }
});
