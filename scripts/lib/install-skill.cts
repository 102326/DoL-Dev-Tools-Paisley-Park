const fs:typeof import('node:fs')=require('node:fs'),path:typeof import('node:path')=require('node:path'),{createHash}:typeof import('node:crypto')=require('node:crypto');
const {validateRoot,resolve}:typeof import('../../.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs')=require('../../.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs');
const sha=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const coded=(code:string)=>Object.assign(Error(code),{code});
const {owned}:typeof import('./owned-files.cjs')=require('./owned-files.cjs');
function install(out:unknown,toolRoot=path.resolve(__dirname,'../..')){
 const tools=validateRoot(toolRoot);if(typeof out!=='string'||!out.trim())throw Object.assign(Error('New Skill directory required'),{code:'INVALID_SKILL_TARGET'});const dest=path.resolve(out);
 if(path.basename(dest)!=='dol-dev-tools-paisley-park')throw Object.assign(Error('Invalid Skill directory name'),{code:'INVALID_SKILL_TARGET'});
 try{fs.lstatSync(dest);throw Object.assign(Error('Existing installation preserved'),{code:'SKILL_TARGET_EXISTS'})}catch(error){if((error as {code?:unknown}|null|undefined)?.code!=='ENOENT')throw error}
 let payload:Record<string,Buffer>;
 try{
  const source=path.join(tools.root,'.agents/skills/dol-dev-tools-paisley-park');
  const read=(file:string,limit:number)=>{const bytes=fs.readFileSync(path.join(source,file));if(!bytes.length||bytes.length>limit)throw coded('SKILL_SOURCE_INCOMPLETE');return bytes};
  const skill=read('SKILL.md',131072).toString('utf8'),resolver=read('scripts/resolve.cjs',32768),agent=read('agents/openai.yaml',8192);
  const installed=skill.replace(/\]\(\.\.\/\.\.\/\.\.\/docs\/([A-Za-z0-9_.-]+\.md)(#[^\s)<>]+)?\)/g,(_match:string,file:string,anchor:string|undefined)=>'](<'+path.join(tools.docs,file).replaceAll('\\','/')+(anchor||'')+'>)');
  payload={'SKILL.md':Buffer.from(installed),'scripts/resolve.cjs':resolver,'agents/openai.yaml':agent,'tool-location.json':Buffer.from(JSON.stringify({schemaVersion:1,toolRoot:tools.root},null,2))};
 }catch{throw coded('SKILL_SOURCE_INCOMPLETE')}
 const manifest=Buffer.from(JSON.stringify({schemaVersion:1,files:Object.fromEntries(Object.entries(payload).map(([name,bytes])=>[name,sha(bytes)]))},null,2));
 const staging=owned(),final=owned();let stage:string|undefined,stageRecorded=false,claimed=false;
 try{
  fs.mkdirSync(path.dirname(dest),{recursive:true});
  stage=fs.mkdtempSync(path.join(path.dirname(dest),'.dol-dev-tools-install-'));staging.adopt(stage);stageRecorded=true;
  const entries:[string,Buffer][]=[['install-manifest.json',manifest],...Object.entries(payload)],staged=new Map<string,string>();
  for(const [i,[name,bytes]] of entries.entries()){const file=path.join(stage,'entry-'+i+'.data');staging.write(file,bytes);if(!fs.readFileSync(file).equals(bytes))throw coded('SKILL_INSTALL_FAILED');staged.set(name,file)}
  // Directory rename can overwrite an empty peer on POSIX. Claim with exclusive mkdir instead.
  try{final.mkdir(dest);claimed=true}catch(error){if((error as {code?:unknown}|null|undefined)?.code==='EEXIST')throw coded('SKILL_TARGET_EXISTS');throw error}
  final.mkdir(path.join(dest,'scripts'));final.mkdir(path.join(dest,'agents'));
  // Publish the entry last with an exclusive same-filesystem link, never a partly written SKILL.md.
  for(const name of ['install-manifest.json','agents/openai.yaml','tool-location.json','scripts/resolve.cjs','SKILL.md']){
   final.link(staged.get(name)!,path.join(dest,name),name==='install-manifest.json'?manifest:payload[name]);
  }
  resolve(dest,{});
  const stageRemoved=staging.cleanup();
  return {status:'installed',skillDir:dest,toolsRoot:tools.root,skillSha256:sha(payload['SKILL.md']),locationMustBeReverified:true,stagingCleanup:stageRemoved?'completed':'retained-unknown'};
 }catch(error){
  // A created staging directory without a recorded identity must be preserved.
  const targetClean=claimed?final.cleanup():true,stageClean=(!stage||stageRecorded)&&staging.cleanup();
  if(!targetClean||!stageClean)throw coded('SKILL_INSTALL_INCOMPLETE');
  if((error as {code?:unknown}|null|undefined)?.code==='SKILL_TARGET_EXISTS')throw error;
  try{fs.lstatSync(dest);if(!claimed)throw coded('SKILL_INSTALL_INCOMPLETE')}catch(check){if((check as {code?:unknown}|null|undefined)?.code!=='ENOENT')throw check}
  throw coded('SKILL_INSTALL_FAILED');
 }
}
const api={install};
export = api;
