'use strict';
function chrome(options) {
  if (options.host !== 'chrome' || !options['host-file'] || options.serial !== undefined || options.package !== undefined ||
      options.userId !== undefined || options.expectedUserId !== undefined || options['target-id'] !== undefined || options.targetId !== undefined || options['webview-socket'] !== undefined || options.webviewSocket !== undefined || options['authorization-file'] !== undefined || options.authorization !== undefined || options.store !== undefined)
    throw Object.assign(Error('Chrome requires its owned host file and no Android target options'),{code:'PC_INPUT_INVALID'});
  return require('./pc-session.cjs').record(options['host-file']);
}
module.exports={chrome};
