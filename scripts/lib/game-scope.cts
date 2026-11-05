import type target from './runtime-target.cjs';
import type semanticAPI from './game-semantic.cjs';
declare namespace authorization {
 type Intent=semanticAPI.Intent|'debug'|'data-reset';
 interface Android {host?:never;workspace:string;serial:string;package:string;userId:string;signingHash:string;intents:Intent[];dataDomain:'app-user-data'}
 interface Chrome {host:'chrome';workspace:string;profileId:string;origin:string;intents:(semanticAPI.Intent|'debug')[];dataDomain:'chrome-origin-storage'}
 type Value=Android|Chrome;
 interface Options {serial?:unknown;package?:unknown;projectIntent?:unknown}
}
// Host-granted task scope. Data here records authority; it cannot grant it.
const path:typeof import('node:path')=require('node:path'),semantic:typeof import('./game-semantic.cjs')=require('./game-semantic.cjs');
const keys=(v:unknown,allowed:readonly string[]):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
function scope(raw:unknown):raw is authorization.Value{
 const s=raw as Record<string,unknown>|null|undefined;
 if(s?.host==='chrome')return keys(s,['host','workspace','profileId','origin','intents','dataDomain'])&&typeof s.workspace==='string'&&path.isAbsolute(s.workspace)&&typeof s.profileId==='string'&&/^[a-f0-9]{64}$/.test(s.profileId)&&typeof s.origin==='string'&&
  (()=>{try{const u=new URL(s.origin as string);return u.protocol==='http:'&&u.hostname==='127.0.0.1'&&!!u.port&&u.origin===s.origin}catch{return false}})()&&
  s.dataDomain==='chrome-origin-storage'&&Array.isArray(s.intents)&&s.intents.length<=32&&new Set(s.intents).size===s.intents.length&&(s.intents as unknown[]).every(i=>semantic.intents.includes(i as semanticAPI.Intent)||i==='debug');
 return keys(s,['workspace','serial','package','userId','signingHash','intents','dataDomain'])&&typeof s.workspace==='string'&&path.isAbsolute(s.workspace)&&
  typeof s.serial==='string'&&/^[\w.:-]{1,128}$/.test(s.serial)&&typeof s.package==='string'&&/^[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)+$/.test(s.package)&&typeof s.userId==='string'&&/^(0|[1-9]\d*)$/.test(s.userId)&&
  typeof s.signingHash==='string'&&/^[a-f0-9]{1,16}$/.test(s.signingHash)&&s.dataDomain==='app-user-data'&&Array.isArray(s.intents)&&s.intents.length<=32&&
  new Set(s.intents).size===s.intents.length&&(s.intents as unknown[]).every(i=>semantic.intents.includes(i as semanticAPI.Intent)||['debug','data-reset'].includes(i as string));
}
function assertSessionTarget(s:unknown,target:target.Value){
 if(!scope(s)||(target.host==='chrome'?s.host!=='chrome'||s.profileId!==target.profileId||s.origin!==target.origin:s.host==='chrome'||(['serial','package','userId'] as const).some(k=>s[k]!==target[k])))throw Object.assign(Error('Session authorization target mismatch'),{code:'PROJECT_SCOPE_TARGET_CHANGED'});
}
function assertTarget(options:authorization.Options,g:{scope?:unknown},userId:unknown,packageInfo:string){
 const s=g.scope;if(!scope(s)||s.host==='chrome')throw Error('Invalid host-granted authorization scope');if(options.serial!==s.serial||options.package!==s.package||userId!==s.userId)throw Object.assign(Error('Project authorization target mismatch'),{code:'PROJECT_SCOPE_TARGET_CHANGED'});
 if(options.projectIntent!==undefined&&!s.intents.includes(options.projectIntent as authorization.Intent))throw Object.assign(Error('Project operation outside authorized scope'),{code:'PROJECT_SCOPE_INTENT_CHANGED'});
 const block=packageInfo.split(`Package [${options.package}]`)[1]?.split(/\n\s*Package \[/)[0];
 const signing=block?.match(/signatures=PackageSignatures\{[^\r\n]*?signatures:\[([a-f0-9]+)\]/)?.[1];
 if(signing!==s.signingHash)throw Object.assign(Error('Project signing identity changed'),{code:'PROJECT_SCOPE_SIGNER_CHANGED'});
}
const authorization={validate:scope,assertTarget,assertSessionTarget};
export = authorization;
