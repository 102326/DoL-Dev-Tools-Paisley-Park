import type targetTypes from './runtime-target.cjs';
declare namespace hostOptions {
 interface Record {target:targetTypes.Chrome}
 interface Options {host?:unknown;chromeRecord?:unknown;[key:string]:unknown}
}
'use strict';
const records=new WeakSet<object>();
function chrome(options:hostOptions.Options,{gameplay=false}={}):hostOptions.Record {
  if (options.host !== 'chrome' || (!options['host-file']&&!records.has(options.chromeRecord as object)) || options.serial !== undefined || options.package !== undefined ||
      options.userId !== undefined || options.expectedUserId !== undefined || options['target-id'] !== undefined || options.targetId !== undefined || options['webview-socket'] !== undefined || options.webviewSocket !== undefined || options['authorization-file'] !== undefined || !gameplay&&options.authorization !== undefined || !gameplay&&options.store !== undefined)
    throw Object.assign(Error('Chrome requires its owned host file and no Android target options'),{code:'PC_INPUT_INVALID'});
  const record=records.has(options.chromeRecord as object)?options.chromeRecord as hostOptions.Record:(require('./pc-session.cjs') as typeof import('./pc-session.cjs')).record(options['host-file'] as string);
  if(gameplay&&options.authorization!==undefined)require('./game-scope.cjs').assertSessionTarget(options.authorization,record.target);
  records.add(record);return record;
}
function fromTarget(value:unknown){
  const target=(require('./runtime-target.cjs') as typeof import('./runtime-target.cjs')).target(value);
  if(target.host!=='chrome')return {...target,expectedUserId:target.userId};
  if(!target.document||!target.profilePath||require('node:fs').realpathSync(target.profilePath)!==target.profilePath)throw Error('Original owned Chrome document required');
  const record={target};records.add(record);return {host:'chrome',chromeRecord:record};
}
function publicIdentity(t:targetTypes.Chrome){const hash=(v:unknown)=>require('node:crypto').createHash('sha256').update(JSON.stringify(v) as string).digest('hex');return {host:'chrome',profileId:t.profileId,browserId:t.browserId,processId:t.processId,targetId:t.targetId,originHash:hash(t.origin),documentHash:hash(t.document),identityNotSaveProof:true}}
const hostOptions={chrome,fromTarget,publicIdentity};
export = hostOptions;
