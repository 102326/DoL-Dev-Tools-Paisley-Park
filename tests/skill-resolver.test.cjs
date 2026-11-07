'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const resolver=require('../.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs');
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'skill-resolver-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const root=path.join(dir,'工具 with spaces'),skill=path.join(dir,'skill');fs.mkdirSync(path.join(root,'scripts'),{recursive:true});fs.mkdirSync(path.join(root,'docs'));fs.mkdirSync(skill);fs.writeFileSync(path.join(root,'scripts/dol-dev.cjs'),'// Synthetic entry, never executed\n');fs.writeFileSync(path.join(root,'docs/DIAGNOSTICS.md'),'fixture');fs.writeFileSync(path.join(root,'package.json'),JSON.stringify({name:'dol-dev-tools-paisley-park',displayName:'DoL Dev Tools',version:'fixture-1'}));return {dir,root,skill}}
test('Gold Experience display name resolves while historical names remain compatible',t=>{
 const f=fixture(t);
 for(const displayName of ['DoL Dev Tools — Gold Experience（黄金体验）','DoL Dev Tools','DoL Dev Tools: Paisley Park']){
  fs.writeFileSync(path.join(f.root,'package.json'),JSON.stringify({name:'dol-dev-tools-paisley-park',displayName,version:'7.0.0'}));
  assert.equal(resolver.validateRoot(f.root).name,displayName);
 }
 fs.writeFileSync(path.join(f.root,'package.json'),JSON.stringify({name:'unrelated-tools',displayName:'DoL Dev Tools — Gold Experience（黄金体验）',version:'7.0.0'}));
 assert.throws(()=>resolver.validateRoot(f.root),{code:'RESOLVER_METADATA_INVALID'});
});
test('metadata JSON is narrowed before use and incomplete identities are never usable roots',t=>{
 const f=fixture(t);assert.equal(resolver.validateRoot(f.root).version,'fixture-1');
 for(const value of [null,[],{},'PRIVATE_INPUT',{name:'dol-dev-tools-paisley-park',displayName:'DoL Dev Tools',version:''},{name:'dol-dev-tools-paisley-park',displayName:'DoL Dev Tools',version:'  '}]){
  fs.writeFileSync(path.join(f.root,'package.json'),JSON.stringify(value));
  assert.throws(()=>resolver.validateRoot(f.root),e=>e.code==='RESOLVER_METADATA_INVALID'&&e.stage==='resolve.metadata'&&!e.message.includes('PRIVATE_INPUT'));
 }
 fs.writeFileSync(path.join(f.root,'package.json'),'{malformed');assert.throws(()=>resolver.validateRoot(f.root),{code:'RESOLVER_METADATA_INVALID'});
});
test('root selection respects overrides, rejects bad records, and never falls back from a failed explicit selection',t=>{
 const f=fixture(t),location=path.join(f.skill,'tool-location.json');
 for(const value of [null,[],{schemaVersion:1,toolRoot:42},{schemaVersion:2,toolRoot:f.root}]){
  fs.writeFileSync(location,JSON.stringify(value));assert.throws(()=>resolver.resolve(f.skill,{}),{code:'RESOLVER_LOCATION_INVALID',stage:'resolve.location'});
  assert.equal(resolver.resolve(f.skill,{DOL_DEV_TOOLS_HOME:f.root}).root,fs.realpathSync(f.root));
 }
 fs.writeFileSync(location,JSON.stringify({schemaVersion:1,toolRoot:f.root}));
 assert.throws(()=>resolver.resolve(f.skill,{DOL_DEV_TOOLS_HOME:path.join(f.dir,'PRIVATE_MISSING')}),{code:'RESOLVER_ROOT_UNAVAILABLE'});
 assert.throws(()=>resolver.resolve(f.skill,{DOL_DEV_TOOLS_HOME:'PRIVATE_RELATIVE'}),{code:'RESOLVER_ROOT_INVALID'});
 assert.equal(resolver.resolve(f.skill,{}).root,fs.realpathSync(f.root));
});
test('installation integrity remains mandatory with a root override; entry is a regular unredirected file',t=>{
 const f=fixture(t);
 fs.writeFileSync(path.join(f.skill,'install-manifest.json'),'null');assert.throws(()=>resolver.resolve(f.skill,{DOL_DEV_TOOLS_HOME:f.root}),{code:'RESOLVER_INSTALLATION_INVALID'});
 fs.unlinkSync(path.join(f.skill,'install-manifest.json'));
 const cli=path.join(f.root,'scripts/dol-dev.cjs');fs.unlinkSync(cli);fs.mkdirSync(cli);
 assert.throws(()=>resolver.validateRoot(f.root),{code:'RESOLVER_ENTRY_INVALID'});
});
test('installed resolver runs standalone without type stripping and returns the compatible successful shape',t=>{
 const f=fixture(t),dest=path.join(f.dir,'project/.agents/skills/dol-dev-tools-paisley-park');
 const installed=require('../scripts/lib/install-skill.cjs').install(dest),entry=path.join(dest,'scripts/resolve.cjs');
 assert.deepEqual(fs.readdirSync(path.join(dest,'scripts')),['resolve.cjs']);
 const env={...process.env};delete env.DOL_DEV_TOOLS_HOME;
 const run=spawnSync(process.execPath,['--no-strip-types',entry],{encoding:'utf8',cwd:f.dir,env});assert.equal(run.status,0,run.stderr);
 const data=JSON.parse(run.stdout);assert.deepEqual(Object.keys(data).sort(),['cli','docs','name','root','validation','version']);assert.equal(data.root,installed.toolsRoot);
});
test('CLI failure has an actionable phase with no private input or raw exception',t=>{
 const f=fixture(t),entry=path.join(f.skill,'resolve.cjs');fs.copyFileSync(path.join(__dirname,'../.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs'),entry);
 const env={...process.env,DOL_DEV_TOOLS_HOME:path.join(f.dir,'PRIVATE_TOKEN_123')};
 const run=spawnSync(process.execPath,[entry],{encoding:'utf8',cwd:f.dir,env});assert.equal(run.status,1);assert.equal(run.stdout,'');
 assert.match(run.stderr,/RESOLVER_ROOT_UNAVAILABLE stage=resolve.root/);assert.ok(!run.stderr.includes(f.dir));assert.doesNotMatch(run.stderr,/PRIVATE_TOKEN|ENOENT| at /);
 assert.equal(resolver.describeError({code:'RESOLVER_ROOT_INVALID',message:'PRIVATE'}),null,'untrusted objects do not create public diagnostics');
});
