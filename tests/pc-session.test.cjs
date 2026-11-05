'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{createHash}=require('node:crypto');
const {record}=require('../scripts/lib/pc-session.cjs');
test('owned record validates actual JSON identity field types without coercion',t=>{
 const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'paisley-record-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const profile=path.join(root,'profile');fs.mkdirSync(profile);const file=path.join(root,'host.json');
 const good={format:'paisley-owned-chrome',version:1,profilePath:profile,executable:process.execPath,resourceDigest:'a'.repeat(64),target:{host:'chrome',profileId:createHash('sha256').update(profile).digest('hex'),browserId:'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',processId:process.pid,endpoint:'http://127.0.0.1:9222',targetId:'fixture',origin:'http://127.0.0.1:8000',profilePath:profile,document:{frameId:'frame',loaderId:'loader',url:'http://127.0.0.1:8000/index.html',uniqueContextId:'context'}}};
 for(const bad of [{...good,resourceDigest:[good.resourceDigest]},null,{...good,profilePath:[profile]},{...good,executable:[process.execPath]}]){
  fs.writeFileSync(file,JSON.stringify(bad));assert.throws(()=>record(file),{code:'PC_INPUT_INVALID'});
 }
 fs.writeFileSync(file,JSON.stringify(good));assert.deepEqual(record(file),good);
});
