const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto');
const {validateRoot}=require('../../.agents/skills/dol-dev-tools-paisley-park/scripts/resolve.cjs');
function install(out,toolRoot=path.resolve(__dirname,'../..')){
 const tools=validateRoot(toolRoot);if(typeof out!=='string'||!out.trim())throw Error('New Skill directory required');const dest=path.resolve(out);
 if(path.basename(dest)!=='dol-dev-tools-paisley-park'||fs.existsSync(dest))throw Error('New dol-dev-tools-paisley-park Skill directory required; existing installation preserved');
 const source=path.join(tools.root,'.agents/skills/dol-dev-tools-paisley-park'),skill=fs.readFileSync(path.join(source,'SKILL.md'),'utf8'),resolver=fs.readFileSync(path.join(source,'scripts/resolve.cjs'));
 // Generated local links point to the same canonical Tools docs; no second runtime or manual copy.
 const installed=skill.replace(/\]\(\.\.\/\.\.\/\.\.\/docs\/([A-Za-z0-9_.-]+\.md)\)/g,(_,file)=>'](<'+path.join(tools.docs,file).replaceAll('\\','/')+'>)');
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.mkdirSync(dest);fs.mkdirSync(path.join(dest,'scripts'));
 fs.writeFileSync(path.join(dest,'SKILL.md'),installed,{flag:'wx'});fs.writeFileSync(path.join(dest,'scripts/resolve.cjs'),resolver,{flag:'wx'});
 fs.mkdirSync(path.join(dest,'agents'));fs.copyFileSync(path.join(source,'agents/openai.yaml'),path.join(dest,'agents/openai.yaml'),fs.constants.COPYFILE_EXCL);
 fs.writeFileSync(path.join(dest,'tool-location.json'),JSON.stringify({schemaVersion:1,toolRoot:tools.root},null,2),{flag:'wx'});
 return {status:'installed',skillDir:dest,toolsRoot:tools.root,skillSha256:createHash('sha256').update(installed).digest('hex'),locationMustBeReverified:true};
}
module.exports={install};
