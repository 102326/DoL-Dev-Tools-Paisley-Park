const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const matrix=require('../scripts/lib/matrix.cjs');
test('selected matrix validates all cases before output, preserves failures and skips later cases',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'dol-matrix-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const item=name=>({name,serial:'selected-device',package:'com.example.game',journey:{schemaVersion:1,steps:[{type:'home'}]}});
  const file=path.join(root,'plan.json');fs.writeFileSync(file,JSON.stringify({schemaVersion:1,cases:[item('first'),item('second'),item('third')]}));
  const loaded=matrix.read(file);let calls=0;
  const result=await matrix.run({out:path.join(root,'run'),testEnvironment:true},loaded,{journey:async()=>({status:++calls===1?'complete':'partial',incidentId:'123e4567-e89b-42d3-a456-426614174000'})});
  assert.equal(calls,2);assert.equal(result.status,'partial');assert.deepEqual(result.cases.map(c=>c.status),['complete','partial','skipped']);assert.equal(JSON.stringify(result).includes('selected-device'),false);
  const plan=await matrix.run({out:path.join(root,'static'),plan:true},loaded);assert.equal(plan.status,'planned');assert.equal(plan.cases.every(c=>c.status==='planned'),true);
  const failedPlan=await matrix.run({out:path.join(root,'failed-static'),plan:true},loaded,{journey:async()=>{throw Error('output failure')}});assert.equal(failedPlan.status,'failed');assert.deepEqual(failedPlan.cases.map(c=>c.status),['failed','skipped','skipped']);
  assert.throws(()=>matrix.validate({schemaVersion:1,cases:[item('con')]}));assert.throws(()=>matrix.validate({schemaVersion:1,cases:[item('case'),item('case-environment')]}));
  fs.writeFileSync(file,JSON.stringify({schemaVersion:1,cases:[item('valid'),{...item('invalid'),journey:{schemaVersion:1,steps:[{type:'arbitrary'}]}}]}));assert.throws(()=>matrix.read(file));
  await assert.rejects(matrix.run({out:path.join(root,'unauthorized')},loaded));assert.equal(fs.existsSync(path.join(root,'unauthorized')),false);
});
