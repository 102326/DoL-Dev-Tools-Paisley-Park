'use strict';
const records=new WeakSet();
function chrome(options,{gameplay=false}={}) {
  if (options.host !== 'chrome' || (!options['host-file']&&!records.has(options.chromeRecord)) || options.serial !== undefined || options.package !== undefined ||
      options.userId !== undefined || options.expectedUserId !== undefined || options['target-id'] !== undefined || options.targetId !== undefined || options['webview-socket'] !== undefined || options.webviewSocket !== undefined || options['authorization-file'] !== undefined || !gameplay&&options.authorization !== undefined || !gameplay&&options.store !== undefined)
    throw Object.assign(Error('Chrome requires its owned host file and no Android target options'),{code:'PC_INPUT_INVALID'});
  const record=records.has(options.chromeRecord)?options.chromeRecord:require('./pc-session.cjs').record(options['host-file']);
  if(gameplay&&options.authorization!==undefined)require('./game-scope.cjs').assertSessionTarget(options.authorization,record.target);
  records.add(record);return record;
}
function fromTarget(value){
  const target=require('./runtime-target.cjs').target(value);
  if(target.host!=='chrome')return {...target,expectedUserId:target.userId};
  if(!target.document||!target.profilePath||require('node:fs').realpathSync(target.profilePath)!==target.profilePath)throw Error('Original owned Chrome document required');
  const record={target};records.add(record);return {host:'chrome',chromeRecord:record};
}
function publicIdentity(t){const hash=v=>require('node:crypto').createHash('sha256').update(JSON.stringify(v)).digest('hex');return {host:'chrome',profileId:t.profileId,browserId:t.browserId,processId:t.processId,targetId:t.targetId,originHash:hash(t.origin),documentHash:hash(t.document),identityNotSaveProof:true}}
module.exports={chrome,fromTarget,publicIdentity};
