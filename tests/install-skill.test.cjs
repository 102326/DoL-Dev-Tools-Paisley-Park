const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{execFileSync}=require('node:child_process');
const {install}=require('../scripts/lib/install-skill.cjs'),{resolve}=require('../.agents/skills/dol-dev-tools/scripts/resolve.cjs');
test('installed Skill resolves verified Tools outside its directory, preserves existing files and rejects stale location',t=>{
 const base=fs.mkdtempSync(path.join(os.tmpdir(),'dol-skill with spaces-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
 const dest=path.join(base,'global skills/dol-dev-tools'),result=install(dest),env={...process.env};delete env.DOL_DEV_TOOLS_HOME;
 const actual=JSON.parse(execFileSync(process.execPath,[path.join(dest,'scripts/resolve.cjs')],{env,encoding:'utf8'}));assert.equal(actual.root,result.toolsRoot);assert.equal(actual.version,require('../package.json').version);
 assert.equal(fs.existsSync(path.join(dest,'scripts/dol-dev.cjs')),false);const saved=fs.readFileSync(path.join(dest,'SKILL.md'),'utf8');assert.equal(saved.includes('../../../docs/'),false);assert.ok(saved.includes('docs/DIAGNOSTICS.md'));assert.throws(()=>install(dest));assert.equal(fs.readFileSync(path.join(dest,'SKILL.md'),'utf8'),saved);
 fs.writeFileSync(path.join(dest,'tool-location.json'),JSON.stringify({schemaVersion:1,toolRoot:path.join(base,'missing')}));assert.throws(()=>resolve(dest,{}));assert.equal(resolve(dest,{DOL_DEV_TOOLS_HOME:result.toolsRoot}).root,result.toolsRoot);
 const invalid=path.join(base,'bad/dol-dev-tools');assert.throws(()=>install(invalid,path.join(base,'missing')));assert.equal(fs.existsSync(invalid),false);
});
