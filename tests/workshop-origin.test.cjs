const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),http=require('node:http');

test('Android Workshop refuses existing origin state and Cookie-bearing game requests',async t=>{
 const source=fs.readFileSync(path.join(__dirname,'../examples/workshop/verify-android-mod.cjs'),'utf8');
 // Exercise the actual fixture handler without running its device entry point.
 const start=source.indexOf(' server=http.createServer('),end=source.indexOf('\n await new Promise(',start);
 assert.ok(start>0&&end>start);
 const context={http,URL,url:'http://127.0.0.1:1/owned/game',preflightUrl:'http://127.0.0.1:1/owned/preflight',html:Buffer.from('OWNED-GAME'),cookieSeen:false};
 vm.runInNewContext(source.slice(start,end),context);
 const server=context.server;
 t.after(()=>new Promise(resolve=>{server.close(resolve);server.closeAllConnections()}));
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const endpoint='http://127.0.0.1:'+server.address().port;
 const preflight=await fetch(endpoint+'/owned/preflight');assert.equal(preflight.status,200);assert.equal((await preflight.text()).includes('OWNED-GAME'),false);
 const blocked=await fetch(endpoint+'/owned/game',{headers:{Cookie:'owned-test=1'}});assert.equal(blocked.status,409);assert.equal(await blocked.text(),'');
 const later=await fetch(endpoint+'/owned/game');assert.equal(later.status,409);assert.equal(await later.text(),'');
 const expression=source.match(/const empty=await evaluate\(`([\s\S]+?)`\);/)?.[1];assert.ok(expression);
 for(const existing of ['none','local','session','cookie','database','cache','serviceWorker']){
  const metadata={localStorage:{length:existing==='local'?1:0},sessionStorage:{length:existing==='session'?1:0},document:{cookie:existing==='cookie'?'owned-test=1':''},
   indexedDB:{databases:async()=>existing==='database'?[{}]:[]},caches:{keys:async()=>existing==='cache'?['owned-cache']:[]},navigator:{serviceWorker:{getRegistrations:async()=>existing==='serviceWorker'?[{}]:[]}}};
  assert.equal(await vm.runInNewContext(expression,metadata),existing==='none',existing);
 }
 await assert.rejects(vm.runInNewContext(expression,{indexedDB:{}}),/unsupported/);
});
