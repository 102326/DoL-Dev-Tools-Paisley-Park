const {test}=require('node:test'),assert=require('node:assert/strict');
const {ownership,resumeOwnership}=require('../examples/android-native/verify-webview.cjs');
test('WebView-only recipe binds the retained native installation and actual business release',()=>{
 const id='11111111-1111-4111-8111-111111111111',pkg='org.doldevtools.validation.lyra051213';
 const native={incidentId:id,status:'complete',source:'Target-owned offline Lyra native validation copy',targetPackage:pkg,
  phases:[{name:'apk-update-v2',status:'complete',identity:{versionCode:51202,uid:'12345',apkSha256:'d546a14f609a6d3235464550b100be16e790ec5c892d119d29ede150f549e66e'}}],
  sentinel:{filename:'dol-dev-tools-native-'+id+'.txt',sha256:'a'.repeat(64),status:'preserved-after-update'}};
 const business={incidentId:'22222222-2222-4222-8222-222222222222',status:'complete',source:'Reviewed DoLGameUI releases in target-owned main game',targetPackage:pkg,nativeIncidentId:id,
  phases:[{name:'update-business-mod',status:'complete',observed:{from:'IndexDB',runtimeVersion:'2.1.0',scriptSha256:'9a1543e0b0f564a66a452fb78378c8a1d4217d12193ad09b061919e7564aac7d',styleSha256:'19441abe5690e2e4253544d2091ca5415d6ce42b0f7934c51e17efa8325f83dd'}}]};
 assert.equal(ownership(native,business).uid,'12345');
 for(const mutate of [n=>n.incidentId={},n=>n.sentinel.filename='../real-save',n=>n.phases[0].identity.uid='12345;input tap 1 1',n=>n.phases[0].identity.apkSha256='0'.repeat(64),n=>n.status='partial']){
  const input=structuredClone(native);mutate(input);assert.throws(()=>ownership(input,business));
 }
 for(const mutate of [b=>b.nativeIncidentId='33333333-3333-4333-8333-333333333333',b=>b.phases[0].observed.from='Embedded',b=>b.phases[0].observed.scriptSha256='0'.repeat(64)]){
  const input=structuredClone(business);mutate(input);assert.throws(()=>ownership(native,input));
 }
 const owned=ownership(native,business),previous={status:'partial',incidentId:'33333333-3333-4333-8333-333333333333',source:'Target-owned offline Lyra WebView-only recipe',targetPackage:pkg,nativeIncidentId:id,businessIncidentId:business.incidentId,
  build:{apkSha256:'78e14d8d4f78464a6525108b74f0ae5308d7b382226aecf4205c2bb8e77be5fe',probeSourceSha256:'4fa06e60c6923a17d40d12d21a3b66f8aa6bab137bd9a51b533ad41d36cd0990',certificateSha256:'efdbb6da72670f631293b17d9b197b0db9aa1457e4c14d36c0d2ad3b07cbb02f'},before:{versionCode:51203},phases:[{name:'update-owned-probe-v3',status:'complete'}]};
 assert.equal(resumeOwnership(owned,previous),previous.build.apkSha256);
 for(const invalid of [null,false,0,{}])assert.throws(()=>resumeOwnership(owned,invalid));
 for(const mutate of [p=>p.build.apkSha256='0'.repeat(64),p=>p.phases[0].status='dispatched',p=>p.businessIncidentId='44444444-4444-4444-8444-444444444444',p=>p.incidentId={}]){
  const input=structuredClone(previous);mutate(input);assert.throws(()=>resumeOwnership(owned,input));
 }
});
