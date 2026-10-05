const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {spawnSync}=require('node:child_process');
test('business recipe rejects injected receipt identifiers before creating output or reaching ADB',()=>{
 const root=fs.realpathSync(os.tmpdir()),dir=fs.mkdtempSync(path.join(root,'dol-native-receipt-'));
 const id='11111111-1111-4111-8111-111111111111';
 const base={incidentId:id,status:'complete',source:'Target-owned offline Lyra native validation copy',targetPackage:'org.doldevtools.validation.lyra051213',
  afterUpdate:{versionCode:51202},phases:[],sentinel:{status:'preserved-after-update',filename:'dol-dev-tools-native-'+id+'.txt',sha256:'a'.repeat(64)}};
 try{
  for(const [index,patch] of [{incidentId:{privateBody:'must not leak'}},{sentinel:{...base.sentinel,filename:'x; am force-stop another.app'}},
    {sentinel:{...base.sentinel,filename:'../../private'}},{source:'unknown'}].entries()){
   const receipt=path.join(dir,index+'.json'),out=path.join(dir,'out-'+index);fs.writeFileSync(receipt,JSON.stringify({...base,...patch}));
   const result=spawnSync(process.execPath,[path.resolve(__dirname,'../examples/android-native/verify-business-mod.cjs'),'test-device',receipt,'before','after',out,'--test-environment=yes'],
    {encoding:'utf8',timeout:5000,windowsHide:true,env:{...process.env,DOL_ADB:path.join(dir,'absent-adb')}});
   assert.equal(result.status,1);assert.equal(fs.existsSync(out),false);assert.doesNotMatch(result.stdout+result.stderr,/must not leak|force-stop another|\.\.\/private/);
  }
 }finally{const resolved=fs.realpathSync(dir);assert.equal(path.dirname(resolved),root);assert.ok(path.basename(resolved).startsWith('dol-native-receipt-'));fs.rmSync(resolved,{recursive:true,force:true})}
});
