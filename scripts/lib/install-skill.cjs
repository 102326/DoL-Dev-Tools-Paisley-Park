const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {validateRoot,resolve}=require('../../.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs');
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const coded=code=>Object.assign(Error(code),{code});
// Windows Node 22 path and descriptor stats can disagree on dev; compare descriptor identities for files.
function fileStat(file){const fd=fs.openSync(file,'r');try{return fs.fstatSync(fd,{bigint:true})}finally{fs.closeSync(fd)}}
// Track actual inodes. Never recursively remove a possibly shared/replaced directory.
function owned(){
 const files=new Map(),dirs=new Map();
 const same=(a,b)=>a.dev===b.dev&&a.ino===b.ino;
 return {
  mkdir(dir){fs.mkdirSync(dir,{mode:0o700});dirs.set(dir,fs.lstatSync(dir,{bigint:true}))},
  adopt(dir){dirs.set(dir,fs.lstatSync(dir,{bigint:true}))},
  write(file,bytes){const fd=fs.openSync(file,'wx',0o600),item={stat:fs.fstatSync(fd,{bigint:true}),bytes:Buffer.from(bytes),partial:true};files.set(file,item);try{fs.writeFileSync(fd,bytes);item.partial=false}finally{fs.closeSync(fd)}},
  link(source,file,bytes){fs.linkSync(source,file);files.set(file,{stat:fileStat(file),bytes:Buffer.from(bytes)})},
  cleanup(){let complete=true;
   for(const [dir,stat] of dirs)try{const current=fs.lstatSync(dir,{bigint:true});if(!current.isDirectory()||!same(current,stat))return false}catch(error){if(error.code!=='ENOENT')return false}
   for(const [file,item] of [...files].reverse())try{if(!fs.lstatSync(file).isFile()||!same(fileStat(file),item.stat)){complete=false;continue}const data=fs.readFileSync(file);if(!data.equals(item.bytes)&&!(item.partial&&data.length<=item.bytes.length&&data.equals(item.bytes.subarray(0,data.length)))){complete=false;continue}fs.unlinkSync(file)}catch(error){if(error.code!=='ENOENT')complete=false}
   for(const [dir,stat] of [...dirs].reverse())try{const current=fs.lstatSync(dir,{bigint:true});if(!current.isDirectory()||!same(current,stat)){complete=false;continue}fs.rmdirSync(dir)}catch(error){if(error.code!=='ENOENT')complete=false}
   return complete;
  }
 };
}
function install(out,toolRoot=path.resolve(__dirname,'../..')){
 const tools=validateRoot(toolRoot);if(typeof out!=='string'||!out.trim())throw Object.assign(Error('New Skill directory required'),{code:'INVALID_SKILL_TARGET'});const dest=path.resolve(out);
 if(path.basename(dest)!=='dol-dev-tools-paisley-park')throw Object.assign(Error('Invalid Skill directory name'),{code:'INVALID_SKILL_TARGET'});
 try{fs.lstatSync(dest);throw Object.assign(Error('Existing installation preserved'),{code:'SKILL_TARGET_EXISTS'})}catch(error){if(error.code!=='ENOENT')throw error}
 let payload;
 try{
  const source=path.join(tools.root,'.agents/skills/dol-dev-tools-paisley-park');
  const read=(file,limit)=>{const bytes=fs.readFileSync(path.join(source,file));if(!bytes.length||bytes.length>limit)throw coded('SKILL_SOURCE_INCOMPLETE');return bytes};
  const skill=read('SKILL.md',131072).toString('utf8'),resolver=read('scripts/resolve.cjs',32768),agent=read('agents/openai.yaml',8192);
  const installed=skill.replace(/\]\(\.\.\/\.\.\/\.\.\/docs\/([A-Za-z0-9_.-]+\.md)(#[^\s)<>]+)?\)/g,(_,file,anchor)=>'](<'+path.join(tools.docs,file).replaceAll('\\','/')+(anchor||'')+'>)');
  payload={'SKILL.md':Buffer.from(installed),'scripts/resolve.cjs':resolver,'agents/openai.yaml':agent,'tool-location.json':Buffer.from(JSON.stringify({schemaVersion:1,toolRoot:tools.root},null,2))};
 }catch{throw coded('SKILL_SOURCE_INCOMPLETE')}
 const manifest=Buffer.from(JSON.stringify({schemaVersion:1,files:Object.fromEntries(Object.entries(payload).map(([name,bytes])=>[name,sha(bytes)]))},null,2));
 const staging=owned(),final=owned();let stage,stageRecorded=false,claimed=false;
 try{
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  stage=fs.mkdtempSync(path.join(path.dirname(dest),'.dol-dev-tools-install-'));staging.adopt(stage);stageRecorded=true;
  const entries=[['install-manifest.json',manifest],...Object.entries(payload)],staged=new Map();
  for(const [i,[name,bytes]] of entries.entries()){const file=path.join(stage,'entry-'+i+'.data');staging.write(file,bytes);if(!fs.readFileSync(file).equals(bytes))throw coded('SKILL_INSTALL_FAILED');staged.set(name,file)}
  // Directory rename can overwrite an empty peer on POSIX. Claim with exclusive mkdir instead.
  try{final.mkdir(dest);claimed=true}catch(error){if(error.code==='EEXIST')throw coded('SKILL_TARGET_EXISTS');throw error}
  final.mkdir(path.join(dest,'scripts'));final.mkdir(path.join(dest,'agents'));
  // Publish the entry last with an exclusive same-filesystem link, never a partly written SKILL.md.
  for(const name of ['install-manifest.json','agents/openai.yaml','tool-location.json','scripts/resolve.cjs','SKILL.md']){
   final.link(staged.get(name),path.join(dest,name),name==='install-manifest.json'?manifest:payload[name]);
  }
  resolve(dest,{});
  const stageRemoved=staging.cleanup();
  return {status:'installed',skillDir:dest,toolsRoot:tools.root,skillSha256:sha(payload['SKILL.md']),locationMustBeReverified:true,stagingCleanup:stageRemoved?'completed':'retained-unknown'};
 }catch(error){
  // A created staging directory without a recorded identity must be preserved.
  const targetClean=claimed?final.cleanup():true,stageClean=(!stage||stageRecorded)&&staging.cleanup();
  if(!targetClean||!stageClean)throw coded('SKILL_INSTALL_INCOMPLETE');
  if(error.code==='SKILL_TARGET_EXISTS')throw error;
  try{fs.lstatSync(dest);if(!claimed)throw coded('SKILL_INSTALL_INCOMPLETE')}catch(check){if(check.code!=='ENOENT')throw check}
  throw coded('SKILL_INSTALL_FAILED');
 }
}
module.exports={install};
