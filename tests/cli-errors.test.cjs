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
