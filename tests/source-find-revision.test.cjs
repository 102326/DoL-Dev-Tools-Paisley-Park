'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const cp = require('node:child_process');
const {createHash} = require('node:crypto');
const {pathToFileURL} = require('node:url');
const {findSource} = require('../scripts/lib/source-find.cjs');
async function fixture(t, files) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'source-revision-'));
  t.after(() => fs.rm(root,{recursive:true,force:true}));
  for (const [name,bytes] of Object.entries(files)) {
    await fs.mkdir(path.dirname(path.join(root,name)),{recursive:true});
    await fs.writeFile(path.join(root,name),bytes);
  }
  const git = (...args) => cp.execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
  git('init','-q'); git('add','.');
  git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','neutral fixture');
  return {root,git};
}
const request = (root,limits={}) => ({schemaVersion:1,root,revision:'HEAD',clues:[{kind:'text',value:'needle'}],limits});
test('local revision queries do not lazily fetch excluded or missing objects from a promisor remote',async t=>{
 for(const mode of ['excluded','missing-source','protocol-config-override'])await t.test(mode,async t=>{
  const remote=await fixture(t,{'a.js':'needle available','img/private.png':'excluded asset','profiles/private.js':'excluded private source',...(mode==='missing-source'?{'b.js':'needle missing'}:{})});
  remote.git('config','uploadpack.allowFilter','true');
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'source-promisor-'));
  t.after(()=>fs.rm(root,{recursive:true,force:true}));
  cp.execFileSync('git',['clone','--quiet','--filter=blob:none','--no-checkout','--no-local',pathToFileURL(remote.root).href,root]);
  const local=(...args)=>cp.execFileSync('git',['-C',root,...args],{encoding:'utf8'}).trim();
  local('config','protocol.file.allow','always');
  assert.equal(local('show','HEAD:a.js'),'needle available');
  const absent=remote.git('rev-parse','HEAD:img/private.png');
  const hasLocal=oid=>cp.spawnSync('git',['-C',root,'cat-file','-e',oid],{env:{...process.env,GIT_NO_LAZY_FETCH:'1',GIT_ALLOW_PROTOCOL:''},encoding:'utf8'}).status===0;
  assert.equal(hasLocal(absent),false);
  if(mode==='protocol-config-override'){
    const original=cp.execFile;
    t.mock.method(cp,'execFile',function(command,args,options,callback){return original.call(this,command,args,{...options,env:{...options.env,GIT_NO_LAZY_FETCH:'0'}},callback)});
  }
  let result;
  if(mode==='protocol-config-override')await assert.rejects(findSource(request(root)),{code:'SOURCE_REVISION_UNAVAILABLE'});
  else{result=await findSource(request(root));assert.equal(result.complete,mode!=='missing-source');assert.equal(result.candidates[0].file,'a.js')}
  assert.equal(hasLocal(absent),false,'an excluded asset must stay absent rather than being fetched during enumeration');
  if(mode==='missing-source'){
    assert.deepEqual(result.partialReasons,['file-unreadable']);assert.equal(result.stats.filesAttempted,2);assert.equal(result.stats.filesRead,1);
    assert.equal(hasLocal(remote.git('rev-parse','HEAD:b.js')),false);
  }
 });
});
function intercept(t, transform = bytes => bytes) {
  const original = cp.execFile, calls = [], inputs = [];
  t.mock.method(cp,'execFile',function(command,args,options,callback) {
    if (command !== 'git') return original.apply(this,arguments);
    calls.push(args);
    const batch = args.includes('--batch');
    const child = original.call(this,command,args,options,(error,stdout,stderr) => callback(error,batch && !error ? transform(stdout) : stdout,stderr));
    if (batch) {
      const end = child.stdin.end;
      child.stdin.end = function(data,...rest) { inputs.push(String(data)); return end.call(this,data,...rest); };
    }
    return child;
  });
  return {calls,inputs};
}
test('fixed revision scans many distinct blobs with bounded Git batches and preserves exact candidates',async t => {
  const files = Object.fromEntries(Array.from({length:160},(_,i)=>[String(i).padStart(3,'0')+'.twee',`😀 neutral ${i}\nneedle ${i}\n`]));
  files['profiles/private.js'] = 'private-only-marker';
  files['binary.js'] = Buffer.from([0,10,255]);
  files['invalid.js'] = Buffer.from([255]);
  files['same.js'] = files['000.twee'];
  const {root,git} = await fixture(t,files);
  const excluded = git('rev-parse','HEAD:profiles/private.js');
  // A tracked link is synthetic index metadata; no platform symlink privilege is needed.
  git('update-index','--add','--cacheinfo',`120000,${git('rev-parse','HEAD:000.twee')},linked.js`);
  git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','tracked link');
  await fs.writeFile(path.join(root,'000.twee'),'working tree differs');
  const {calls,inputs} = intercept(t);
  const result = await findSource(request(root,{maxResults:200}));
  assert.equal(result.stats.filesRead,163);
  assert.equal(result.stats.filesAttempted,163);
  assert.equal(result.candidates.length,161);
  assert.deepEqual(result.partialReasons,['binary-or-unsupported-encoding','unsupported-encoding']);
  for (const hit of result.candidates) {
    assert.equal(hit.sha256,createHash('sha256').update(files[hit.file]).digest('hex'));
    assert.equal(hit.line,2); assert.equal(hit.column,1);
  }
  assert.ok(calls.length <= 10,`expected bounded Git batches, observed ${calls.length} processes`);
  assert.ok(inputs.length >= 2 && inputs.length <= 3);
  const objects = inputs.join('').trim().split('\n');
  assert.ok(objects.every(oid=>/^[a-f0-9]{40,64}$/.test(oid)));
  assert.ok(!objects.includes(excluded));
  assert.equal(result.source.consistency,'git-objects');
});
test('revision batches obey byte and attempted-file limits including repeated blobs and oversized files',async t => {
  const {root,git} = await fixture(t,{'a.js':'oversized needle','b.js':'needle','c.js':'needle','d.js':'needle elsewhere'});
  const {inputs} = intercept(t);
  const result = await findSource(request(root,{maxFiles:3,maxBytes:12}));
  assert.deepEqual(result.partialReasons,['max-bytes','max-files']);
  assert.equal(result.stats.filesRead,2); assert.equal(result.stats.bytesRead,12);
  assert.equal(result.stats.filesAttempted,3);
  assert.deepEqual(result.candidates.map(c=>c.file),['b.js','c.js']);
  assert.deepEqual(inputs,[git('rev-parse','HEAD:b.js')+'\n']);
});
test('revision batches enforce their byte window while allowing a single larger eligible blob',async t => {
  const files={'a.js':'needle'+'x'.repeat(1024*1024),'b.js':'needle'+'b'.repeat(600000),'c.js':'needle'+'c'.repeat(600000)};
  const {root} = await fixture(t,files), {inputs} = intercept(t);
  const result = await findSource(request(root));
  assert.equal(result.complete,true); assert.equal(result.stats.filesRead,3);
  assert.equal(inputs.length,3);
  assert.equal(result.stats.bytesRead,Object.values(files).reduce((n,s)=>n+Buffer.byteLength(s),0));
});
test('invalid batch framing is partial unreadable evidence, never complete no-match',async t => {
  const {root} = await fixture(t,{'a.js':'needle\n'});
  const corruptions = [
    b=>b.subarray(0,b.length-1),
    b=>Buffer.from(b.toString().replace(' blob ',' tree ')),
    b=>Buffer.from(b.toString().replace(' blob 7',' blob 6')),
    b=>Buffer.from(b.toString().replace(/^[a-f0-9]/,'!')),
    b=>{const changed=Buffer.from(b);changed[0]|=128;return changed;},
    b=>Buffer.concat([b,Buffer.from('unexpected')]),
  ];
  for (const corrupt of corruptions) {
    const original = cp.execFile;
    intercept(t,corrupt);
    try {
      const result = await findSource(request(root));
      assert.equal(result.complete,false); assert.equal(result.outcome,'partial');
      assert.deepEqual(result.partialReasons,['file-unreadable']);
      assert.equal(result.stats.filesRead,0); assert.deepEqual(result.candidates,[]);
    } finally { cp.execFile=original; }
  }
});
test('a missing batch object does not hide another valid object',async t => {
  const {root,git} = await fixture(t,{'a.js':'needle first','b.js':'needle second'});
  const first = git('rev-parse','HEAD:a.js');
  intercept(t,bytes => {
    const end = bytes.indexOf(10)+1+Buffer.byteLength('needle first')+1;
    return Buffer.concat([Buffer.from(first+' missing\n'),bytes.subarray(end)]);
  });
  const result = await findSource(request(root));
  assert.equal(result.complete,false); assert.deepEqual(result.partialReasons,['file-unreadable']);
  assert.equal(result.stats.filesRead,1); assert.equal(result.candidates[0].file,'b.js');
});
test('cancelling an active batch terminates the search without returning prefetched candidates',async t => {
  const {root} = await fixture(t,{'a.js':'needle'}), controller = new AbortController();
  const original = cp.execFile;
  t.mock.method(cp,'execFile',function(command,args,...rest) {
    const child = original.call(this,command,args,...rest);
    if (args.includes('--batch')) setImmediate(()=>controller.abort());
    return child;
  });
  await assert.rejects(findSource(request(root),controller.signal),{code:'SOURCE_CANCELLED',stage:'search'});
});
test('batch stdin failure kills only the owned child and reports a partial read',async t => {
  const {root} = await fixture(t,{'a.js':'needle'}), original = cp.execFile;
  let killed = 0;
  t.mock.method(cp,'execFile',function(command,args,...rest) {
    const child = original.call(this,command,args,...rest);
    if (args.includes('--batch')) {
      const kill = child.kill;
      child.kill = function(...args) { killed++; return kill.apply(this,args); };
      child.stdin.end = function() { this.emit('error',new Error('PRIVATE_STDIN_FAILURE')); return this; };
    }
    return child;
  });
  const result = await findSource(request(root));
  assert.equal(killed,1); assert.equal(result.complete,false);
  assert.deepEqual(result.partialReasons,['file-unreadable']);
  assert.equal(result.stats.filesRead,0);
  assert.ok(!JSON.stringify(result).includes('PRIVATE_STDIN_FAILURE'));
});
test('a genuinely missing Git blob remains an attempted unreadable file, not a filtered complete no-match',async t => {
  const {root,git} = await fixture(t,{'a.js':'needle unavailable','b.js':'needle available'});
  const oid = git('rev-parse','HEAD:a.js');
  // Delete only a known loose object in this freshly created, owned synthetic repository.
  await fs.unlink(path.join(root,'.git','objects',oid.slice(0,2),oid.slice(2)));
  const result = await findSource(request(root));
  assert.equal(result.complete,false);
  assert.deepEqual(result.partialReasons,['file-unreadable']);
  assert.equal(result.stats.eligibleFiles,2); assert.equal(result.stats.filesAttempted,2);
  assert.equal(result.stats.filesRead,1); assert.equal(result.candidates[0].file,'b.js');
  const {inputs} = intercept(t);
  const limited = await findSource(request(root,{maxFiles:1}));
  assert.deepEqual(limited.partialReasons,['file-unreadable','max-files']);
  assert.equal(limited.stats.filesAttempted,1); assert.equal(limited.stats.filesRead,0);
  assert.deepEqual(inputs,[]);
});
