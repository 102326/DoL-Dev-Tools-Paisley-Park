'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync,spawnSync}=require('node:child_process');
const [source,patched,typescript]=process.argv.slice(2);
assert.ok(source&&patched&&typescript,'Provide original ZIP, patched ZIP and an existing TypeScript module path');
const python=process.env.DOL_PYTHON || (process.platform==='win32'?'python':'python3');
const files=JSON.parse(execFileSync(python,[path.join(__dirname,'verify.py'),path.resolve(source),path.resolve(patched)],{encoding:'utf8',maxBuffer:4*1024*1024,env:{...process.env,PYTHONUTF8:'1'}}));
const ts=require(path.resolve(typescript));
function expressions(text){
 const tree=ts.createSourceFile('consumer.js',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS),found=[];
 assert.equal(tree.parseDiagnostics.length,0);new vm.Script(text);
 const targets=new Set(['simpleMod','maplebirchMod','hasSimpleFramework']);
 const visit=node=>{if(ts.isVariableDeclaration(node)&&targets.has(node.name.getText(tree))&&node.initializer&&node.initializer.getText(tree).includes('getAnyModByNameNoAlias'))found.push({name:node.name.getText(tree),text:node.initializer.getText(tree)});ts.forEachChild(node,visit)};
 visit(tree);return found;
}
let checks=0,originalMissingErrors=0;
for(const file of files){
 const old=expressions(file.before),next=expressions(file.after);assert.equal(old.length,next.length);
 for(let i=0;i<old.length;i++){
  assert.equal(old[i].name,next[i].name);
  for(const names of [['maplebirch'],['Simple Frameworks'],['maplebirch','Simple Frameworks'],[]]){
   const mods=new Map(names.map(name=>[name,{name}]));
   const run=text=>{const errors=[],calls=[];const utils={getModListNameNoAlias:()=>[...mods.keys()],getAnyModByNameNoAlias(name){calls.push(name);if(!mods.has(name))errors.push('missing '+name);return mods.get(name)}};const console={error:value=>errors.push(value)};const result=vm.runInNewContext(text,{window:{modUtils:utils},console});console.error('unrelated error');return {result,errors,calls}};
   const before=run(old[i].text),after=run(next[i].text);
   assert.equal(after.result,before.result,'Preserve the original strict-name consumer decision');
   assert.deepEqual(after.errors,['unrelated error'],'Only avoid the missing optional lookup; keep unrelated errors');
   originalMissingErrors+=before.errors.length-1;
   assert.ok(after.calls.every(name=>mods.has(name)));
   checks++;
  }
 }
}
assert.equal(checks,16);assert.ok(originalMissingErrors>0,'Original production expressions must reproduce missing optional lookup errors');
const tempRoot=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(tempRoot,'paisley-ce-guard-'));
try{
 const invalid=path.join(dir,'unreviewed.zip'),out=path.join(dir,'output.zip'),patch=path.join(__dirname,'patch.py');fs.writeFileSync(invalid,'unreviewed input');
 const refused=spawnSync(python,[patch,invalid,out],{encoding:'utf8'});assert.notEqual(refused.status,0);assert.match(refused.stderr,/SHA-256/);assert.equal(fs.existsSync(out),false);
 const preservedBytes=fs.readFileSync(patched);
 const preserved=spawnSync(python,[patch,path.resolve(source),path.resolve(patched)],{encoding:'utf8'});assert.notEqual(preserved.status,0);assert.match(preserved.stderr,/already exists/);
 assert.ok(fs.readFileSync(patched).equals(preservedBytes));
}finally{const resolved=fs.realpathSync(dir);assert.equal(path.dirname(resolved),tempRoot);assert.ok(path.basename(resolved).startsWith('paisley-ce-guard-'));fs.rmSync(resolved,{recursive:true})}
console.log(JSON.stringify({status:'passed',reviewedInputAndCompleteOutputBytesVerified:true,changedMembers:files.length,productionExpressionScenarios:checks,originalMissingErrors,manifestAndLicensePreserved:true,otherMembersUnchanged:true,unreviewedInputRefused:true,existingOutputPreserved:true,scope:'Actual consumer expressions with a strict-name registry substitute; not a real Simple Framework runtime or full CE business test'}));
