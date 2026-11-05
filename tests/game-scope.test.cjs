const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
const scope=require('../scripts/lib/game-scope.cjs');
const android={workspace:path.resolve('synthetic-workspace'),serial:'synthetic-device',package:'com.example.fixture',userId:'0',signingHash:'a11ce',intents:['debug'],dataDomain:'app-user-data'};
const chrome={host:'chrome',workspace:android.workspace,profileId:'a'.repeat(64),origin:'http://127.0.0.1:8000',intents:['debug'],dataDomain:'chrome-origin-storage'};
test('authorization identity fields require primitive strings without coercion',()=>{
 assert.equal(scope.validate(android),true);assert.equal(scope.validate(chrome),true);
 for(const field of ['serial','package','userId','signingHash'])for(const value of [[android[field]],new String(android[field])])assert.equal(scope.validate({...android,[field]:value}),false);
 for(const value of [[chrome.profileId],new String(chrome.profileId)])assert.equal(scope.validate({...chrome,profileId:value}),false);
 for(const value of [null,undefined,0,'',false])assert.equal(scope.validate(value),false);
});
test('Android signing authorization refuses a Chrome scope before absent fields can compare equal',()=>{
 assert.throws(()=>scope.assertTarget({}, {scope:chrome},undefined,''),/authorization scope/);
 scope.assertTarget({serial:android.serial,package:android.package},{scope:android},'0','Package [com.example.fixture]\nsignatures=PackageSignatures{synthetic signatures:[a11ce]}');
 assert.throws(()=>scope.assertTarget({serial:android.serial,package:android.package},{scope:android},'1',''),{code:'PROJECT_SCOPE_TARGET_CHANGED'});
});
