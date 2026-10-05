const {test}=require('node:test'),assert=require('node:assert/strict');
const integration=require('../integrations/examples/native-lifecycle.cjs');
test('optional native contract projects only instance metadata and rejects unsupported identities',()=>{
  const data={contractVersion:1,packageName:'org.example.test',versionCode:1,nativePid:42,
    processSession:'11111111-1111-4111-8111-111111111111',activityInstance:'22222222-2222-4222-8222-222222222222',
    webViewInstance:'33333333-3333-4333-8333-333333333333',activityIdentity:11,webViewIdentity:12,
    privateGameState:'omit me'};
  assert.equal(integration.redact({status:'available',data}).data.privateGameState,undefined);
  for(const patch of [{contractVersion:2},{nativePid:0},{webViewInstance:'same'},{activityIdentity:null}])
    assert.throws(()=>integration.redact({status:'available',data:{...data,...patch}}));
  assert.deepEqual(integration.redact({status:'unavailable',data}),{status:'unavailable'});
});
