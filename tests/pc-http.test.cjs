'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path'),net=require('node:net');
const {load,serve}=require('../scripts/lib/pc-http.cjs');
function fixture(t){const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-pc-http-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));fs.writeFileSync(path.join(root,'page.html'),'<script src="assets/app.js"></script>');fs.writeFileSync(path.join(root,'app.js'),'window.ready=true');fs.writeFileSync(path.join(root,'private.txt'),'not served');return root}
test('selected HTTP resources are snapshotted; private siblings and invalid manifests are excluded',t=>{
 const root=fixture(t),html=path.join(root,'page.html'),manifest=path.join(root,'resources.json');
 fs.writeFileSync(manifest,JSON.stringify({schemaVersion:1,resources:[{urlPath:'/assets/app.js',file:path.join(root,'app.js')}]}));
 const bundle=load(html,manifest);assert.equal(bundle.files.size,2);assert.match(bundle.digest,/^[a-f0-9]{64}$/);
 fs.writeFileSync(path.join(root,'app.js'),'changed');assert.equal(bundle.files.get('/assets/app.js').bytes.toString(),'window.ready=true');
 for(const urlPath of ['/../secret.js','/assets/../secret.js','/index.html','/secret.txt','//bad.js','/bad%2e.js']){
  fs.writeFileSync(manifest,JSON.stringify({schemaVersion:1,resources:[{urlPath,file:path.join(root,'app.js')}]}));
  assert.throws(()=>load(html,manifest),{code:'PC_RESOURCES_INVALID'});
 }
});
test('HTTP accepts only the selected authority and files, closes its own port',async t=>{
 const root=fixture(t),bundle=load(path.join(root,'page.html'));
 const allocator=net.createServer();await new Promise(r=>allocator.listen(0,'127.0.0.1',r));const port=allocator.address().port;await new Promise(r=>allocator.close(r));
 const instance=await serve(bundle,port);try{
  assert.equal((await fetch(instance.url)).status,200);
  assert.equal((await fetch(new URL('/private.txt',instance.url))).status,404);
  assert.equal((await fetch(instance.url,{method:'POST'})).status,403);
  const http=require('node:http');const status=await new Promise((resolve,reject)=>{http.get(instance.url,{headers:{Host:'example.invalid'}},r=>{r.resume();resolve(r.statusCode)}).on('error',reject)});assert.equal(status,403);
  await assert.rejects(serve(bundle,port),{code:'EADDRINUSE'});
 }finally{await instance.close()}
 await assert.rejects(fetch(instance.url));
});
test('existing Android target keys remain identical and Chrome binding has a separate profile key',()=>{
 const {key}=require('../scripts/lib/runtime-target.cjs'),{createHash}=require('node:crypto');
 const android={serial:'synthetic-device',package:'org.example.fixture',userId:'0'};
 assert.equal(key(android),createHash('sha256').update(JSON.stringify([android.serial,android.package,android.userId])).digest('hex'));
});
