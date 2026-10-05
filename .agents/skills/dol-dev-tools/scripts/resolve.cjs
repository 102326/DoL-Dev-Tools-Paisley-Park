const fs=require('node:fs'),path=require('node:path');
function validateRoot(candidate){
 if(typeof candidate!=='string'||!path.isAbsolute(candidate))throw Error('Explicit absolute Tools root required');
 const root=fs.realpathSync(candidate),file=path.join(root,'package.json');if(fs.statSync(file).size>65536)throw Error('Invalid Tools metadata');
 const metadata=JSON.parse(fs.readFileSync(file,'utf8')),cli=fs.realpathSync(path.join(root,'scripts/dol-dev.cjs'));
 if(metadata.name!=='dol-dev-tools'||typeof metadata.version!=='string'||metadata.version.length>64||cli!==path.join(root,'scripts/dol-dev.cjs'))throw Error('Invalid Tools root');
 if(!fs.statSync(path.join(root,'docs/DIAGNOSTICS.md')).isFile())throw Error('Tools documentation missing');
 return {root,cli,version:metadata.version,docs:path.join(root,'docs'),validation:'location only; not a code trust guarantee'};
}
function resolve(skillDir=path.resolve(__dirname,'..'),env=process.env){
 let candidate=env.DOL_DEV_TOOLS_HOME;
 if(!candidate){const location=path.join(skillDir,'tool-location.json');if(fs.existsSync(location)){if(fs.statSync(location).size>65536)throw Error('Invalid Tools location');const value=JSON.parse(fs.readFileSync(location,'utf8'));if(value.schemaVersion!==1||typeof value.toolRoot!=='string')throw Error('Invalid Tools location');candidate=value.toolRoot}else candidate=path.resolve(skillDir,'../../..')}
 return validateRoot(candidate);
}
if(require.main===module){try{console.log(JSON.stringify(resolve(),null,2))}catch{console.error('DoL Dev Tools location unavailable. Set DOL_DEV_TOOLS_HOME to the verified local toolkit or reinstall this Skill.');process.exitCode=1}}
module.exports={resolve,validateRoot};
