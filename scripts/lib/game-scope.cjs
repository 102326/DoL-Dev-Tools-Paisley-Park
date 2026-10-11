'use strict';
// Host-granted task scope. Data here records authority; it cannot grant it.
const path=require('node:path'),semantic=require('./game-semantic.cjs');
const keys=(v,allowed)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>allowed.includes(k));
function scope(s){
 return keys(s,['workspace','serial','package','userId','signingHash','intents','dataDomain'])&&path.isAbsolute(s.workspace||'')&&
  /^[\w.:-]{1,128}$/.test(s.serial||'')&&/^[A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)+$/.test(s.package||'')&&/^(0|[1-9]\d*)$/.test(s.userId||'')&&
  /^[a-f0-9]{1,16}$/.test(s.signingHash||'')&&s.dataDomain==='app-user-data'&&Array.isArray(s.intents)&&s.intents.length<=32&&
  new Set(s.intents).size===s.intents.length&&s.intents.every(i=>semantic.intents.includes(i)||['debug','data-reset'].includes(i));
}
function assertTarget(options,g,userId,packageInfo){
 const s=g.scope;if(!scope(s))throw Error('Invalid host-granted authorization scope');if(options.serial!==s.serial||options.package!==s.package||userId!==s.userId)throw Object.assign(Error('Project authorization target mismatch'),{code:'PROJECT_SCOPE_TARGET_CHANGED'});
 if(options.projectIntent!==undefined&&!s.intents.includes(options.projectIntent))throw Object.assign(Error('Project operation outside authorized scope'),{code:'PROJECT_SCOPE_INTENT_CHANGED'});
 const block=packageInfo.split(`Package [${options.package}]`)[1]?.split(/\n\s*Package \[/)[0];
 const signing=block?.match(/signatures=PackageSignatures\{[^\r\n]*?signatures:\[([a-f0-9]+)\]/)?.[1];
 if(signing!==s.signingHash)throw Object.assign(Error('Project signing identity changed'),{code:'PROJECT_SCOPE_SIGNER_CHANGED'});
}
module.exports={validate:scope,assertTarget};
