const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
const cli=path.resolve(__dirname,'../scripts/dol-dev.cjs');
const run=(args,extra=[])=>spawnSync(process.execPath,[...extra,cli,...args],{encoding:'utf8',windowsHide:true});
test('checkpoint field errors remain before output/device I/O and disclose only the fixed field',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-cli-error-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const file=path.join(root,'PRIVATE_FILE.json'),out=path.join(root,'out');
  fs.writeFileSync(file,JSON.stringify({schemaVersion:1,steps:[{type:'checkpoint',name:'PRIVATE_NAME',capture:['screenshot']}]}));
  const result=run(['journey','--file',file,'--serial','offline-device','--package','com.example.game','--out',out,'--plan']);
  assert.equal(result.status,1);assert.match(result.stderr,/UNSUPPORTED_CHECKPOINT_NAME stage=journey.validate.*field=name/);assert.equal(result.stderr.includes('PRIVATE'),false);assert.equal(result.stderr.includes(root),false);assert.equal(fs.existsSync(out),false);
  const invalid=run(['doctor','--PRIVATE_FLAG','PRIVATE_VALUE']);assert.equal(invalid.stderr.includes('PRIVATE'),false);
  assert.match(invalid.stderr,/INVALID_CLI_ARGUMENTS stage=cli.parse/);
});
test('unknown Session cancel failures expose stage without inventing a cause or leaking arbitrary errors',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-cli-error-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const shim=path.join(root,'shim.cjs'),goalFile=require.resolve('../scripts/lib/game-goal.cjs');
  fs.writeFileSync(shim,`require(${JSON.stringify(goalFile)}).session=async()=>{throw Object.assign(Error('PRIVATE_ERROR'),{code:'PRIVATE_CODE',cliOperation:'PRIVATE_STAGE',stack:'PRIVATE_STACK'})};`);
  const result=run(['game-session','--goal','PRIVATE_GOAL','--operation','cancel','--test-environment','yes'],['-r',shim]);
  assert.equal(result.status,1);assert.match(result.stderr,/COMMAND_FAILED stage=game-session.cancel/);assert.match(result.stderr,/cause unknown/);assert.equal(result.stderr.includes('PRIVATE'),false);
});
test('seconds help and validation match the controlled evidence boundary without device I/O',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-seconds-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const shim=path.join(root,'boundary.cjs');
  fs.writeFileSync(shim,`require(${JSON.stringify(require.resolve('../scripts/lib/evidence.cjs'))}).evidence=async options=>{console.log('BOUNDARY:'+JSON.stringify({profile:options.profile,logcatSeconds:options.logcatSeconds,recordSeconds:options.recordSeconds,deepSeconds:options.deepSeconds}));return {status:'complete',steps:[],completed:[]}};`);
  const common=['--serial','offline-device','--package','com.example.fixture','--out',path.join(root,'out')];
  for(const command of ['capture','perf']){
    const r=run([command,...common,'--seconds','PRIVATE_SECONDS'],['-r',shim]);
    assert.equal(r.status,1);assert.match(r.stderr,/CLI_OPTION_NOT_APPLICABLE stage=cli.validate.*field=seconds/);assert.match(r.stderr,/omit --seconds/);
    assert(!r.stderr.includes('PRIVATE'));assert(!r.stdout.includes('BOUNDARY'));assert(!fs.existsSync(path.join(root,'out')));
  }
  for(const [command,extra,expected] of [['logcat',[],{profile:'logcat',logcatSeconds:2}],['record',[],{profile:'record',recordSeconds:2}],['perf',['--deep','--sensitive','yes'],{profile:'deep',deepSeconds:2}]]){
    const r=run([command,...common,'--seconds','2',...extra],['-r',shim]);assert.equal(r.status,0,r.stderr);
    assert.deepEqual(JSON.parse(r.stdout.split('\n').find(v=>v.startsWith('BOUNDARY:')).slice(9)),expected);
  }
  const help=run(['--help']);assert.equal(help.status,0);
  for(const line of help.stdout.split('\n').filter(v=>/^  (?:capture|perf |logcat|record)/.test(v))){
    if(/^  capture|^  perf --serial/.test(line))assert(!line.includes('--seconds'));
  }
  assert.match(help.stdout,/logcat --serial.*\[--seconds N\]/);assert.match(help.stdout,/record --serial.*\[--seconds N\]/);
});
test('known installation input failures are actionable without disclosing the supplied path',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-install-errors-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const dest=path.join(root,'PRIVATE_PARENT','dol-dev-tools-paisley-park');fs.mkdirSync(dest,{recursive:true});fs.writeFileSync(path.join(dest,'sentinel'),'unchanged');
  const existing=run(['install-skill','--out',dest]);assert.equal(existing.status,1);assert.match(existing.stderr,/SKILL_TARGET_EXISTS stage=install.preflight.*field=out/);assert.match(existing.stderr,/new empty target/);assert(!existing.stderr.includes(root));assert(!existing.stderr.includes('PRIVATE'));
  assert.equal(fs.readFileSync(path.join(dest,'sentinel'),'utf8'),'unchanged');
  const invalid=run(['install-skill','--out',path.join(root,'PRIVATE_WRONG')]);assert.equal(invalid.status,1);assert.match(invalid.stderr,/INVALID_SKILL_TARGET stage=install.preflight.*field=out/);assert(!invalid.stderr.includes('PRIVATE'));
});
test('installation success reports file installation without guaranteeing host discovery',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-discovery-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const result=run(['install-skill','--out',path.join(root,'dol-dev-tools-paisley-park')]);assert.equal(result.status,0,result.stderr);
  assert(!result.stdout.includes('available on the next turn'));assert.match(result.stdout,/Host discovery is not verified/);assert.match(result.stdout,/SKILL_INSTALL.md/);
});
test('known timeouts do not claim device failure, cancellation or safe replay',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-timeout-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const shim=path.join(root,'timeout.cjs');fs.writeFileSync(shim,`require(${JSON.stringify(require.resolve('../scripts/lib/game-goal.cjs'))}).session=async()=>{throw Object.assign(Error('PRIVATE_TIMEOUT_PATH'),{code:'ETIMEDOUT'})};`);
  const result=run(['game-session','--goal','PRIVATE_GOAL','--operation','dispatch','--test-environment','yes'],['-r',shim]);
  assert.equal(result.status,1);assert.match(result.stderr,/ETIMEDOUT stage=command.timeout/);assert.match(result.stderr,/not proof of device failure/);assert.match(result.stderr,/Do not blindly replay/);assert(!result.stderr.includes('PRIVATE'));
});
test('offline version, help and Skill installation do not load Gameplay dependencies',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-no-runtime-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const shim=path.join(root,'no-runtime.cjs');
  fs.writeFileSync(shim,`const Module=require('node:module'),original=Module._load;Module._load=function(id,...args){if(id==='xstate'||id==='node:sqlite'||/game-runtime[.]cjs$/.test(id))throw Error('Unexpected Gameplay dependency');return original.call(this,id,...args)};`);
  for(const args of [['--version'],['--help'],['install-skill','--out',path.join(root,'dol-dev-tools-paisley-park')]]){
    const result=run(args,['-r',shim]);assert.equal(result.status,0,result.stderr);
  }
});
test('incomplete Skill sources and owned write failures expose fixed recovery advice only',t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-install-io-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const sourceShim=path.join(root,'source.cjs');
  fs.writeFileSync(sourceShim,`const fs=require('node:fs'),read=fs.readFileSync;fs.readFileSync=function(file,...args){if(typeof file==='string'&&file.replaceAll('\\\\','/').endsWith('/agents/openai.yaml'))throw Object.assign(Error('PRIVATE_SOURCE_PATH'),{code:'EACCES'});return read.call(this,file,...args)};`);
  const source=run(['install-skill','--out',path.join(root,'source/dol-dev-tools-paisley-park')],['-r',sourceShim]);
  assert.equal(source.status,1);assert.match(source.stderr,/SKILL_SOURCE_INCOMPLETE stage=install.preflight/);assert(!source.stderr.includes('PRIVATE'));assert(!fs.existsSync(path.join(root,'source')));
  const writeShim=path.join(root,'write.cjs');fs.writeFileSync(writeShim,`const fs=require('node:fs');fs.writeFileSync=()=>{throw Object.assign(Error('PRIVATE_WRITE_PATH'),{code:'EACCES'})};`);
  const failed=run(['install-skill','--out',path.join(root,'write/dol-dev-tools-paisley-park')],['-r',writeShim]);
  assert.equal(failed.status,1);assert.match(failed.stderr,/SKILL_INSTALL_FAILED stage=install.write/);assert.match(failed.stderr,/retry an unused target/);assert(!failed.stderr.includes('PRIVATE'));assert(!failed.stderr.includes(root));
});
