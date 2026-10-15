'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {install}=require('../scripts/lib/install-skill.cjs');
const {resolve}=require('../.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs');
const {spawnSync}=require('node:child_process');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley install 中文 '));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const source=path.join(root,'tools'),skill=path.join(source,'.agents/skills/dol-dev-tools-paisley-park');
 for(const dir of ['scripts','docs','.agents/skills/dol-dev-tools-paisley-park/scripts','.agents/skills/dol-dev-tools-paisley-park/agents'])fs.mkdirSync(path.join(source,dir),{recursive:true});
 fs.writeFileSync(path.join(source,'package.json'),JSON.stringify(require('../package.json')));fs.writeFileSync(path.join(source,'scripts/dol-dev.cjs'),'// fixture');fs.writeFileSync(path.join(source,'docs/DIAGNOSTICS.md'),'# Fixture');
 for(const file of ['SKILL.md','scripts/resolve.cjs','agents/openai.yaml'])fs.copyFileSync(path.join(__dirname,'../.agents/skills/dol-dev-tools-paisley-park',file),path.join(skill,file));
 return {root,source,skill,dest:path.join(root,'skills/dol-dev-tools-paisley-park')};
}
test('all required sources are preflighted before a final installation is created',t=>{
 const f=fixture(t);fs.unlinkSync(path.join(f.skill,'agents/openai.yaml'));
 assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_SOURCE_INCOMPLETE');assert.equal(fs.existsSync(f.dest),false);
});
test('staging identity read failures preserve the unrecorded directory and report incomplete cleanup',t=>{
 const f=fixture(t),mkdtemp=fs.mkdtempSync,lstat=fs.lstatSync,foreign=path.join(f.root,'foreign');fs.writeFileSync(foreign,'keep');
 const retained=[];
 for(const code of ['EIO','EACCES']){
  let stage,injected=false;
  fs.mkdtempSync=function(...args){stage=mkdtemp.apply(this,args);return stage};
  fs.lstatSync=function(file,...args){if(stage&&path.resolve(file)===stage&&!injected){injected=true;throw Object.assign(Error('PRIVATE_STAGE_PATH'),{code})}return lstat.call(this,file,...args)};
  try{assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_INSTALL_INCOMPLETE')}finally{fs.mkdtempSync=mkdtemp;fs.lstatSync=lstat}
  assert(injected);assert(fs.statSync(stage).isDirectory());assert.deepEqual(fs.readdirSync(stage),[]);retained.push(stage);
  assert(!fs.existsSync(f.dest));assert.equal(fs.readFileSync(foreign,'utf8'),'keep');
 }
 assert.equal(install(f.dest,f.source).status,'installed');
 for(const stage of retained)assert.deepEqual(fs.readdirSync(stage),[],'retry must preserve unrecorded staging directories');
});
test('legacy installations without a manifest retain location and explicit override behavior',t=>{
 const f=fixture(t);fs.mkdirSync(path.join(f.dest,'scripts'),{recursive:true});
 fs.writeFileSync(path.join(f.dest,'tool-location.json'),JSON.stringify({schemaVersion:1,toolRoot:f.source}));
 assert.equal(resolve(f.dest,{}).version,require('../package.json').version);
 fs.writeFileSync(path.join(f.dest,'tool-location.json'),JSON.stringify({schemaVersion:1,toolRoot:path.join(f.root,'missing')}));
 assert.throws(()=>resolve(f.dest,{}));assert.equal(resolve(f.dest,{DOL_DEV_TOOLS_HOME:f.source}).root,fs.realpathSync(f.source));
});
test('each staged write failure leaves no discoverable partial Skill and can be retried',t=>{
 const f=fixture(t),write=fs.writeFileSync;
 for(let failAt=1;failAt<=5;failAt++){
  let count=0;fs.writeFileSync=function(file,bytes,...args){if(++count===failAt){write.call(this,file,Buffer.from(bytes).subarray(0,5),...args);throw Object.assign(Error('PRIVATE_IO_PATH'),{code:'EIO'})}return write.call(this,file,bytes,...args)};
  try{assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_INSTALL_FAILED')}finally{fs.writeFileSync=write}
  assert.equal(fs.existsSync(f.dest),false);assert.deepEqual(fs.readdirSync(path.dirname(f.dest)),[]);
 }
 assert.equal(install(f.dest,f.source).status,'installed');assert.equal(resolve(f.dest,{}).version,require('../package.json').version);
});
test('exclusive final directory creation preserves a concurrent creator including an empty target',t=>{
 const f=fixture(t),mkdir=fs.mkdirSync;
 for(const withFile of [false,true]){
  let injected=false;fs.mkdirSync=function(file,...args){if(path.resolve(file)===f.dest&&!injected){injected=true;mkdir.call(this,file);if(withFile)fs.writeFileSync(path.join(file,'peer'),'peer-data')}return mkdir.call(this,file,...args)};
  try{assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_TARGET_EXISTS')}finally{fs.mkdirSync=mkdir}
  assert.deepEqual(fs.readdirSync(f.dest),withFile?['peer']:[]);if(withFile)assert.equal(fs.readFileSync(path.join(f.dest,'peer'),'utf8'),'peer-data');
  assert.equal(fs.readdirSync(path.dirname(f.dest)).filter(v=>v.startsWith('.dol-dev-tools-install-')).length,0);
  if(withFile)fs.unlinkSync(path.join(f.dest,'peer'));fs.rmdirSync(f.dest);
 }
});
test('publication failures roll back only owned files; interrupted partial installs are rejected and preserved',t=>{
 const f=fixture(t),link=fs.linkSync;
 for(let failAt=1;failAt<=5;failAt++){
  let count=0;fs.linkSync=function(...args){if(++count===failAt)throw Object.assign(Error('PRIVATE_LINK_FAILURE'),{code:'EACCES'});return link.apply(this,args)};
  try{assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_INSTALL_FAILED')}finally{fs.linkSync=link}
  assert.equal(fs.existsSync(f.dest),false);
 }
 fs.mkdirSync(path.join(f.dest,'scripts'),{recursive:true});fs.copyFileSync(path.join(f.skill,'scripts/resolve.cjs'),path.join(f.dest,'scripts/resolve.cjs'));
 fs.writeFileSync(path.join(f.dest,'install-manifest.json'),JSON.stringify({schemaVersion:1,files:{'SKILL.md':'0'.repeat(64),'scripts/resolve.cjs':'0'.repeat(64),'agents/openai.yaml':'0'.repeat(64),'tool-location.json':'0'.repeat(64)}}));
 assert.throws(()=>resolve(f.dest,{DOL_DEV_TOOLS_HOME:f.source}));assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_TARGET_EXISTS');assert.equal(fs.existsSync(path.join(f.dest,'scripts/resolve.cjs')),true);
});
test('foreign files arriving during publication are retained, never recursively deleted',t=>{
 const f=fixture(t),link=fs.linkSync;let injected=false;
 fs.linkSync=function(...args){if(!injected){injected=true;fs.writeFileSync(path.join(f.dest,'foreign'),'keep');throw Object.assign(Error('write refused'),{code:'EACCES'})}return link.apply(this,args)};
 try{assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_INSTALL_INCOMPLETE')}finally{fs.linkSync=link}
 assert.equal(fs.readFileSync(path.join(f.dest,'foreign'),'utf8'),'keep');assert(!fs.existsSync(path.join(f.dest,'SKILL.md')));
});
test('externally truncated published bytes survive rollback, including their staging hard link',t=>{
 const f=fixture(t),link=fs.linkSync;let count=0;
 fs.linkSync=function(...args){if(++count===3){fs.truncateSync(path.join(f.dest,'agents/openai.yaml'),5);throw Object.assign(Error('write failed'),{code:'EIO'})}return link.apply(this,args)};
 try{assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_INSTALL_INCOMPLETE')}finally{fs.linkSync=link}
 assert.equal(fs.statSync(path.join(f.dest,'agents/openai.yaml')).size,5);
 const stage=fs.readdirSync(path.dirname(f.dest)).find(v=>v.startsWith('.dol-dev-tools-install-'));assert(stage);
 assert(fs.readdirSync(path.join(path.dirname(f.dest),stage)).some(file=>fs.statSync(path.join(path.dirname(f.dest),stage,file)).ino===fs.statSync(path.join(f.dest,'agents/openai.yaml')).ino));
});
test('actual process interruption before the entry is published cannot expose a discoverable partial Skill',t=>{
 const f=fixture(t),installer=require.resolve('../scripts/lib/install-skill.cjs');
 const script=`const fs=require('node:fs'),path=require('node:path'),original=fs.linkSync;fs.linkSync=function(from,to){if(path.basename(to)==='SKILL.md')process.exit(77);return original.call(this,from,to)};require(${JSON.stringify(installer)}).install(${JSON.stringify(f.dest)},${JSON.stringify(f.source)});`;
 const result=spawnSync(process.execPath,['-e',script],{encoding:'utf8'});assert.equal(result.status,77,result.stderr);
 assert(!fs.existsSync(path.join(f.dest,'SKILL.md')));assert(fs.existsSync(path.join(f.dest,'install-manifest.json')));
 assert.throws(()=>resolve(f.dest,{DOL_DEV_TOOLS_HOME:f.source}));assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_TARGET_EXISTS');
 assert.equal(install(path.join(f.root,'retry/dol-dev-tools-paisley-park'),f.source).status,'installed');
});
test('file rollback uses consistent identities when path stats report a different device',t=>{
 const f=fixture(t),lstat=fs.lstatSync,link=fs.linkSync;
 fs.lstatSync=function(...args){const stat=lstat.apply(this,args);if(stat.isFile())stat.dev+=typeof stat.dev==='bigint'?1n:1;return stat};
 fs.linkSync=()=>{throw Object.assign(Error('controlled publication failure'),{code:'EIO'})};
 try{
  assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_INSTALL_FAILED');
  assert(!fs.existsSync(f.dest));assert.deepEqual(fs.readdirSync(path.dirname(f.dest)),[]);
  fs.linkSync=link;
  assert.equal(install(f.dest,f.source).stagingCleanup,'completed');
  assert.equal(resolve(f.dest,{}).version,require('../package.json').version);
 }finally{fs.lstatSync=lstat;fs.linkSync=link}
});

test('Windows exclusive file handles preserve incomplete cleanup and occupied existing installations',{skip:process.platform!=='win32'},async t=>{
 const f=fixture(t),link=fs.linkSync,{spawn}=require('node:child_process');let held,closed,count=0;
 function lock(file){
  const ready=path.join(f.root,'lock-ready-'+count);held=spawn(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-Command',
   "$ErrorActionPreference='Stop';$handle=[IO.File]::Open($env:PAISLEY_LOCK_FILE,'Open','ReadWrite','None');try{[IO.File]::WriteAllText($env:PAISLEY_LOCK_READY,'ready');[Console]::ReadLine()|Out-Null}finally{$handle.Dispose()}"],
   {env:{...process.env,PAISLEY_LOCK_FILE:file,PAISLEY_LOCK_READY:ready},stdio:['pipe','ignore','pipe'],windowsHide:true});
  closed=new Promise(resolve=>held.once('close',resolve));
  const deadline=Date.now()+10000;
  while(!fs.existsSync(ready)&&Date.now()<deadline)Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,25);
  assert(fs.existsSync(ready),'owned lock process must acknowledge acquisition');
  assert.throws(()=>fs.readFileSync(file),e=>['EBUSY','EACCES','EPERM'].includes(e.code));
 }
 async function unlock(){if(held){held.stdin.end('\n');const code=await closed;held=undefined;assert.equal(code,0)}}
 const published=path.join(f.dest,'agents/openai.yaml'),expected=fs.readFileSync(path.join(f.skill,'agents/openai.yaml'));
 fs.linkSync=function(...args){if(++count===3){lock(published);throw Object.assign(Error('controlled publication failure'),{code:'EIO'})}return link.apply(this,args)};
 try{
  assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_INSTALL_INCOMPLETE');
  assert(!fs.existsSync(path.join(f.dest,'SKILL.md')));
 }finally{fs.linkSync=link;await unlock()}
 assert.deepEqual(fs.readFileSync(published),expected);
 const stage=fs.readdirSync(path.dirname(f.dest)).find(v=>v.startsWith('.dol-dev-tools-install-'));assert(stage);
 assert(fs.readdirSync(path.join(path.dirname(f.dest),stage)).some(name=>fs.statSync(path.join(path.dirname(f.dest),stage,name)).ino===fs.statSync(published).ino));
 const retry=path.join(f.root,'retry/dol-dev-tools-paisley-park');assert.equal(install(retry,f.source).status,'installed');
 const entry=path.join(retry,'SKILL.md'),bytes=fs.readFileSync(entry);count++;
 try{lock(entry);assert.throws(()=>install(retry,f.source),e=>e.code==='SKILL_TARGET_EXISTS')}finally{await unlock()}
 assert.deepEqual(fs.readFileSync(entry),bytes);assert.equal(resolve(retry,{}).version,require('../package.json').version);
});

test('macOS permission failures are refused before discovery; directory rename can replace an empty peer',t=>{
 if(process.platform!=='darwin'||process.getuid?.()===0){t.skip('Requires unprivileged macOS filesystem');return}
 const f=fixture(t);fs.mkdirSync(path.dirname(f.dest));fs.chmodSync(path.dirname(f.dest),0o500);
 try{assert.throws(()=>install(f.dest,f.source),e=>e.code==='SKILL_INSTALL_FAILED')}finally{fs.chmodSync(path.dirname(f.dest),0o700)}
 assert(!fs.existsSync(f.dest));
 const staged=path.join(f.root,'rename-source'),peer=path.join(f.root,'rename-peer');fs.mkdirSync(staged);fs.mkdirSync(peer);fs.writeFileSync(path.join(staged,'marker'),'owned');
 fs.renameSync(staged,peer);assert.equal(fs.readFileSync(path.join(peer,'marker'),'utf8'),'owned');
});
