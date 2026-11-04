const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {owned}=require('../scripts/lib/owned-files.cjs');
test('descriptor identity failure closes its handle and retains unclaimed bytes',t=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-owned-'));
  t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
  const tracker=owned();tracker.adopt(dir);
  const open=fs.openSync,stat=fs.fstatSync;let descriptor;
  fs.openSync=(...args)=>{descriptor=open(...args);return descriptor};
  fs.fstatSync=()=>{throw Object.assign(Error('synthetic identity failure'),{code:'EIO'})};
  try {assert.throws(()=>tracker.write(path.join(dir,'unclaimed'),Buffer.from('bytes')),{code:'EIO'});}
  finally {fs.openSync=open;fs.fstatSync=stat;}
  assert.throws(()=>stat(descriptor),{code:'EBADF'});
  assert.equal(tracker.cleanup(),false);assert.equal(fs.readFileSync(path.join(dir,'unclaimed')).length,0);
});
