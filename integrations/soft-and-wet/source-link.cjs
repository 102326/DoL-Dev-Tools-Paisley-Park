'use strict';
// Project Recipe: local source applicability, never Gameplay permission or truth.
const fs=require('node:fs'),path=require('node:path'),{createHash}=require('node:crypto'),{execFileSync}=require('node:child_process');
const sha=v=>createHash('sha256').update(v).digest('hex'),digest=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v),revision=v=>typeof v==='string'&&/^[a-f0-9]{40}$/.test(v);
function relative(file){if(typeof file!=='string'||file.length>256||file.includes('\\')||file.includes(':')||/[\u0000-\u001f\u007f]/.test(file)||path.posix.isAbsolute(file)||file.split('/').some(s=>!s||s==='.'||s==='..'||s.toLowerCase()==='.git'||s.toLowerCase().startsWith('.env'))||/\.(pem|key|p12)$/i.test(file))throw Error('Invalid relative source path');return file}
function contained(root,file){const full=fs.realpathSync(path.join(root,relative(file))),rel=path.relative(root,full);if(rel==='..'||rel.startsWith('..'+path.sep)||path.isAbsolute(rel))throw Error('Source path outside authorized root');relative(rel.split(path.sep).join('/'));return full}
function resolveSource(root,index,clue){
 const result={format:'dol-ui-source-link',version:1,status:'unknown',reasons:[],ordinaryDebug:'unaffected',loadedArtifactIdentity:'not-attested',eventSource:'Lab memory callbacks; production handlers not verified'};
 const valid=index?.format==='dol-ui-source-index'&&index.version===1&&index.componentId==='shop.toolbar'&&index.role==='toolbar'&&revision(index.snapshot?.revision)&&typeof index.snapshot.dirty==='boolean'&&digest(index.snapshot.digest)&&Array.isArray(index.snapshot.files)&&index.snapshot.files.length>0&&index.snapshot.files.length<=24;
 if(!valid){result.reasons=['index-format'];return result}
 const files=index.snapshot.files;if(files.some(f=>!f||!digest(f.sha256))||new Set(files.map(f=>f.path)).size!==files.length||sha(JSON.stringify(files))!==index.snapshot.digest){result.reasons=['index-digest'];return result}
 for(const f of files)relative(f.path);
 const candidates=index.candidates,callbacks=index.callbacks;
 if(!candidates||!Array.isArray(candidates.source)||!Array.isArray(candidates.styles)||!candidates.source.length||candidates.source.length+candidates.styles.length>24||!Array.isArray(callbacks)||callbacks.length>8)throw Error('Invalid source candidates');
 const covered=new Set(files.map(f=>f.path));
 for(const f of [...candidates.source,...candidates.styles,...callbacks.flatMap(c=>[c.production,c.lab])])if(!covered.has(relative(f)))throw Error('Candidate not in covered inputs');
 if(callbacks.some(c=>typeof c.name!=='string'||!/^[a-zA-Z][a-zA-Z0-9]{0,63}$/.test(c.name)))throw Error('Invalid callback names');
 if(clue?.format!=='dol-ui-source-clue'||clue.version!==1||clue.componentId!==index.componentId||clue.role!=='toolbar'||typeof clue.instanceId!=='string'||!/^[a-zA-Z0-9._-]{1,64}$/.test(clue.instanceId)||clue.runtime?.kind!=='vite-dev-server'||index.runtime?.kind!=='vite-dev-server'||!revision(clue.runtime.revision)||!digest(clue.runtime.inputDigest)){result.reasons=['component-or-runtime-clue'];return result}
 root=fs.realpathSync(root);result.componentId=index.componentId;result.instanceId=clue.instanceId;
 result.snapshot={revision:index.snapshot.revision,dirty:index.snapshot.dirty,inputDigest:index.snapshot.digest,coverage:files.map(f=>f.path)};
 result.candidates={source:candidates.source,styles:candidates.styles};result.callbacks=callbacks.map(({name,production,lab})=>({name,production,lab}));result.styles='Candidates only; obtain matched rules/computed style for property attribution';
 const mismatched=[];let total=0;
 for(const f of files){let full;try{full=contained(root,f.path)}catch(error){if(error.code==='ENOENT'){mismatched.push(f.path);continue}throw error}const stat=fs.statSync(full);total+=stat.size;if(!stat.isFile()||stat.size>512*1024||total>4*1024*1024)throw Error('Source input bounds exceeded');if(sha(fs.readFileSync(full))!==f.sha256)mismatched.push(f.path)}
 if(mismatched.length){result.reasons.push('covered-inputs-changed');result.changedInputs=mismatched}
 let currentRevision;try{currentRevision=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','ignore']}).trim()}catch{result.status=mismatched.length?'stale':'partial';result.reasons.push('git-revision-unavailable');return result}
 if(currentRevision!==index.snapshot.revision)result.reasons.push('source-revision-changed');
 if(clue.runtime.revision!==index.snapshot.revision||clue.runtime.inputDigest!==index.snapshot.digest)result.reasons.push('runtime-clue-stale');
 result.status=result.reasons.length?'stale':'matched';return result;
}
function read(file){if(fs.statSync(file).size>64*1024)throw Error('Source metadata bound exceeded');const raw=fs.readFileSync(file);if(raw.length>64*1024)throw Error('Source metadata bound exceeded');return JSON.parse(raw)}
if(require.main===module){try{
 const args=process.argv.slice(2),o={};for(let i=0;i<args.length;i+=2){const k=args[i];if(!['--root','--index','--clue','--out'].includes(k)||!args[i+1]||o[k])throw Error('Invalid source-link arguments');o[k]=args[i+1]}
 if(Object.keys(o).length!==4)throw Error('Use --root UI_ROOT --index INDEX_JSON --clue CLUE_JSON --out NEW_JSON');
 const result=resolveSource(o['--root'],read(o['--index']),read(o['--clue']));fs.writeFileSync(path.resolve(o['--out']),JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log('UI Source Link '+result.status+'; local input scope only, Debug remains available.');
}catch{console.error('[SOURCE_LINK_INVALID] Check explicit metadata, authorized root and new output; raw content omitted.');process.exitCode=1}}
else module.exports={resolveSource};
