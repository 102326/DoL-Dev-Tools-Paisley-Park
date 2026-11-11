// Authoritative source; installed Skills run the standalone generated resolve.cjs.
import {lstatSync,statSync,realpathSync,readFileSync} from 'node:fs';
import {join,isAbsolute,resolve as absolute} from 'node:path';
import {createHash} from 'node:crypto';

const errors = {
  RESOLVER_INSTALLATION_INVALID: ['resolve.installation','Incomplete Skill installation','Verify all installed files and install-manifest.json; preserve the existing directory and install a complete Skill into a new target.'],
  RESOLVER_LOCATION_INVALID: ['resolve.location','Invalid Tools location','Review tool-location.json or set DOL_DEV_TOOLS_HOME to an explicitly verified absolute Tools root; no alternate directory was searched.'],
  RESOLVER_ROOT_INVALID: ['resolve.root','Explicit absolute Tools root required','Use an absolute Tools root in DOL_DEV_TOOLS_HOME or tool-location.json; supplied input omitted.'],
  RESOLVER_ROOT_UNAVAILABLE: ['resolve.root','Tools root unavailable','Check the explicitly selected directory, its documentation and permissions; no fallback root or download was used.'],
  RESOLVER_METADATA_INVALID: ['resolve.metadata','Invalid Tools root metadata','Check the complete package.json: DoL Dev Tools package identity, supported displayName and nonempty version.'],
  RESOLVER_ENTRY_INVALID: ['resolve.entry','Invalid Tools root entry','Check scripts/dol-dev.cjs is a regular file inside the resolved Tools root; do not use an entry redirected elsewhere.'],
} as const;
export type ResolverCode = keyof typeof errors;
export type ResolverStage = (typeof errors)[ResolverCode][0];
export interface Resolution {
  root:string; cli:string; name:'DoL Dev Tools'|'DoL Dev Tools: Paisley Park'|'DoL Dev Tools — Gold Experience（黄金体验）'|'DoL Dev Tools — Gold Experience'; version:string; docs:string;
  validation:'location only; not a code trust guarantee';
}
export interface ResolverEnvironment { readonly DOL_DEV_TOOLS_HOME?:string }
class ResolverError extends Error {
  readonly code:ResolverCode;
  readonly stage:ResolverStage;
  constructor(code:ResolverCode){super(errors[code][1]);this.code=code;this.stage=errors[code][0]}
}
function fail(code:ResolverCode):never{throw new ResolverError(code)}
const object=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==='object'&&!Array.isArray(value);
function json(file:string,max:number,code:ResolverCode):unknown {
  try{if(!statSync(file).isFile()||statSync(file).size>max)return fail(code);return JSON.parse(readFileSync(file,'utf8')) as unknown}
  catch{return fail(code)}
}
function verifyInstallation(skillDir:string,override:boolean):void {
  const file=join(skillDir,'install-manifest.json');
  try{if(!lstatSync(file).isFile())fail('RESOLVER_INSTALLATION_INVALID')}
  catch(error){if(object(error)&&error.code==='ENOENT')return;fail('RESOLVER_INSTALLATION_INVALID')}
  const record=json(file,8192,'RESOLVER_INSTALLATION_INVALID');
  const names=['SKILL.md','scripts/resolve.cjs','agents/openai.yaml','tool-location.json'] as const;
  if(!object(record)||record.schemaVersion!==1||!object(record.files)||Object.keys(record.files).length!==names.length)fail('RESOLVER_INSTALLATION_INVALID');
  const files=record.files;
  for(const name of names){
    const digest=files[name];
    if(typeof digest!=='string'||!/^[a-f0-9]{64}$/.test(digest))fail('RESOLVER_INSTALLATION_INVALID');
    try{
      const file=join(skillDir,name),stat=lstatSync(file);
      if(!stat.isFile()||stat.size>131072)fail('RESOLVER_INSTALLATION_INVALID');
      // Explicit relocation may supersede a stale location, never a missing payload file.
      if(!(override&&name==='tool-location.json')&&createHash('sha256').update(readFileSync(file)).digest('hex')!==digest)fail('RESOLVER_INSTALLATION_INVALID');
    }catch{fail('RESOLVER_INSTALLATION_INVALID')}
  }
}
export function validateRoot(candidate:unknown):Resolution {
  if(typeof candidate!=='string'||!isAbsolute(candidate))fail('RESOLVER_ROOT_INVALID');
  let root:string;try{root=realpathSync(candidate)}catch{return fail('RESOLVER_ROOT_UNAVAILABLE')}
  const metadata=json(join(root,'package.json'),65536,'RESOLVER_METADATA_INVALID');
  if(!object(metadata)||metadata.name!=='dol-dev-tools-paisley-park'||metadata.displayName!=='DoL Dev Tools'&&metadata.displayName!=='DoL Dev Tools: Paisley Park'&&metadata.displayName!=='DoL Dev Tools — Gold Experience（黄金体验）'&&metadata.displayName!=='DoL Dev Tools — Gold Experience'||
    typeof metadata.version!=='string'||!metadata.version.trim()||metadata.version.length>64)fail('RESOLVER_METADATA_INVALID');
  let cli:string;
  try{cli=realpathSync(join(root,'scripts/dol-dev.cjs'));if(cli!==join(root,'scripts/dol-dev.cjs')||!statSync(cli).isFile())fail('RESOLVER_ENTRY_INVALID')}
  catch{return fail('RESOLVER_ENTRY_INVALID')}
  try{if(!statSync(join(root,'docs/DIAGNOSTICS.md')).isFile())fail('RESOLVER_ROOT_UNAVAILABLE')}
  catch{return fail('RESOLVER_ROOT_UNAVAILABLE')}
  return {root,cli,name:metadata.displayName,version:metadata.version,docs:join(root,'docs'),validation:'location only; not a code trust guarantee'};
}
export function resolve(skillDir=absolute(__dirname,'..'),env:ResolverEnvironment=process.env):Resolution {
  let candidate:unknown=env.DOL_DEV_TOOLS_HOME;
  verifyInstallation(skillDir,!!candidate);
  if(!candidate){
    const location=join(skillDir,'tool-location.json');let present=true;
    try{lstatSync(location)}catch(error){if(object(error)&&error.code==='ENOENT')present=false;else fail('RESOLVER_LOCATION_INVALID')}
    if(present){const value=json(location,65536,'RESOLVER_LOCATION_INVALID');if(!object(value)||value.schemaVersion!==1||typeof value.toolRoot!=='string')fail('RESOLVER_LOCATION_INVALID');candidate=value.toolRoot}
    else candidate=absolute(skillDir,'../../..');
  }
  return validateRoot(candidate);
}
export function describeError(error:unknown):{code:ResolverCode;stage:ResolverStage;hint:string}|null {
  if(!(error instanceof ResolverError))return null;
  return {code:error.code,stage:error.stage,hint:errors[error.code][2]};
}
if(require.main===module){
  try{console.log(JSON.stringify(resolve(),null,2))}
  catch(error){const detail=describeError(error);console.error('DoL Dev Tools location unavailable. '+(detail?`[${detail.code} stage=${detail.stage}] ${detail.hint}`:'Cause unknown; supplied input and raw exception omitted. Check the verified Toolkit installation.'));process.exitCode=1}
}
