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
 for(const urlPath of ['/../secret.js','/assets/../secret.js','/index.html','/secret.txt','//bad.js','/bad%2f.js','/%2e%2e/secret.js','/bad%ff.js']){
  fs.writeFileSync(manifest,JSON.stringify({schemaVersion:1,resources:[{urlPath,file:path.join(root,'app.js')}]}));
  assert.throws(()=>load(html,manifest),{code:'PC_RESOURCES_INVALID'});
 }
});
test('HTTP accepts only the selected authority and files, closes its own port',async t=>{
 const root=fixture(t),manifest=path.join(root,'manifest.json');fs.writeFileSync(manifest,JSON.stringify({schemaVersion:1,resources:[{urlPath:'/assets/虚构 file.js',file:path.join(root,'app.js')}]}));const bundle=load(path.join(root,'page.html'),manifest);
 const allocator=net.createServer();await new Promise(r=>allocator.listen(0,'127.0.0.1',r));const port=allocator.address().port;await new Promise(r=>allocator.close(r));
 const instance=await serve(bundle,port);try{
  const first=instance.startupProgress();assert.equal(Object.isFrozen(first),true);assert.equal(first.requests,0);
  assert.equal((await fetch(instance.url,{headers:{Cookie:'synthetic-private-cookie'}})).status,200);
  assert.equal((await fetch(instance.url,{method:'HEAD'})).status,200);
  assert.equal(instance.startupProgress().mainGetRequests,1);assert.equal(instance.startupProgress().mainResponsesFinished,1);assert.equal(first.requests,0);
  assert.equal(await (await fetch(new URL('/assets/虚构%20file.js',instance.url))).text(),'window.ready=true');
  assert.equal((await fetch(new URL('/private.txt',instance.url))).status,404);
  assert.equal((await fetch(instance.url,{method:'POST'})).status,403);
  const http=require('node:http');const status=await new Promise((resolve,reject)=>{http.get(instance.url,{headers:{Host:'example.invalid'}},r=>{r.resume();resolve(r.statusCode)}).on('error',reject)});assert.equal(status,403);
  const progress=instance.startupProgress();assert.equal(progress.requests,6);assert.equal(progress.mainGetRequests,1);assert.equal(progress.mainResponsesFinished,1);assert.equal(progress.mainResponsesClosedEarly,0);assert.equal(progress.truncated,false);assert.equal(JSON.stringify(progress).includes('cookie'),false);
  // The parser's normal clientError handling must still close malformed HTTP with 400.
  const malformed=await new Promise((resolve,reject)=>{const socket=net.createConnection({host:'127.0.0.1',port});let text='';socket.setTimeout(2000,()=>{socket.destroy();reject(Error('Malformed request did not close'))});socket.on('data',bytes=>{text+=bytes.toString()});socket.once('end',()=>resolve(text));socket.once('error',reject);socket.once('connect',()=>socket.write('GET / HTTP/1.1\r\nBroken header\r\n\r\n'))});assert.match(malformed,/^HTTP\/1\.1 400/);assert.equal(instance.startupProgress().requests,6);
  await assert.rejects(serve(bundle,port),{code:'EADDRINUSE'});
 }finally{await instance.close()}
 await assert.rejects(fetch(instance.url));
});
test('existing Android target keys remain identical and Chrome binding has a separate profile key',()=>{
 const {key}=require('../scripts/lib/runtime-target.cjs'),{createHash}=require('node:crypto');
 const android={serial:'synthetic-device',package:'org.example.fixture',userId:'0'};
 assert.equal(key(android),createHash('sha256').update(JSON.stringify([android.serial,android.package,android.userId])).digest('hex'));
});

test('compiled game HTML can exceed 64 MiB; HTML and auxiliary resources keep distinct hard bounds',t=>{
 const root=fixture(t),html=path.join(root,'page.html'),manifest=path.join(root,'large.json');
 const resize=(file,bytes)=>{const fd=fs.openSync(file,'w');try{fs.ftruncateSync(fd,bytes)}finally{fs.closeSync(fd)}};
 resize(html,64*1024*1024+1);
 assert.equal(load(html).inventory[0].bytes,64*1024*1024+1);
 resize(html,128*1024*1024+1);
 assert.throws(()=>load(html),{code:'PC_RESOURCES_INVALID'});
 resize(html,1);const resource=path.join(root,'large.js');resize(resource,64*1024*1024+1);
 fs.writeFileSync(manifest,JSON.stringify({schemaVersion:1,resources:[{urlPath:'/large.js',file:resource}]}));
 assert.throws(()=>load(html,manifest),{code:'PC_RESOURCES_INVALID'});
});
