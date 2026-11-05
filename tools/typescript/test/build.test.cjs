'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),{spawnSync}=require('node:child_process');
const actual=path.resolve(__dirname,'../../..'),compiler=process.env.PAISLEY_TSC||require.resolve('typescript/bin/tsc'),typeRoots=process.env.PAISLEY_TYPE_ROOTS||path.resolve(__dirname,'../node_modules/@types');
function fixture(t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-build-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const home=path.join(root,'tools/typescript');fs.mkdirSync(home,{recursive:true});
 for(const file of ['build.cjs','tsconfig.json','browser-tsconfig.json'])fs.copyFileSync(path.join(actual,'tools/typescript',file),path.join(home,file));
 const config=JSON.parse(fs.readFileSync(path.join(home,'tsconfig.json')));
 const nodeFiles=config.files.map(file=>path.resolve(home,file)),browserFiles=JSON.parse(fs.readFileSync(path.join(home,'browser-tsconfig.json'))).files.map(file=>path.resolve(home,file));
 const files=[...nodeFiles,...browserFiles],browserOutputs=browserFiles.flatMap(file=>['.cjs','.d.cts'].map(ext=>path.join(root,'scripts/lib/browser',path.basename(file,'.cts')+ext)));
 const outputs=[...browserOutputs,...nodeFiles.map(f=>f.slice(0,-4)+'.cjs'),path.join(root,'scripts/lib/source-find.mts')];
 for(const file of [...files,...outputs,path.join(root,'scripts/lib/owned-files.cjs')]){
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join(actual,path.relative(root,file)),file);
 }
 const run=(args=[],preload)=>spawnSync(process.execPath,[...(preload?['-r',preload]:[]),path.join(home,'build.cjs'),...args],{encoding:'utf8',env:{...process.env,PAISLEY_TSC:compiler,PAISLEY_TYPE_ROOTS:typeRoots}});
 return {root,home,files,browserFiles,nodeFiles,outputs,run};
}
test('complete Program check is read-only, accepts CRLF, and rejects code/type/compiled-view drift',t=>{
 const f=fixture(t),peer=path.join(f.home,'dist');fs.mkdirSync(peer);fs.writeFileSync(path.join(peer,'unknown.txt'),'peer');
 for(const file of [...f.files,...f.outputs])fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('\n','\r\n'));
 assert.equal(f.run().status,0);
 const output=f.outputs[0],changed=fs.readFileSync(output,'utf8')+'\n// drift\n';fs.writeFileSync(output,changed);
 const drift=f.run();assert.equal(drift.status,1);assert.match(drift.stderr,/SOURCE_BUILD_DRIFT/);assert.equal(fs.readFileSync(output,'utf8'),changed);
 const source=f.files[0],original=fs.readFileSync(source,'utf8');fs.writeFileSync(source,original+'\nconst bad: Code="RAW_EXCEPTION";\n');
 const failed=f.run(['--write-production']);assert.equal(failed.status,1);assert.match(failed.stderr,/TS2322/);assert.equal(fs.readFileSync(output,'utf8'),changed);
 fs.writeFileSync(source,original);const write=f.run(['--write-production']);assert.equal(write.status,0,write.stderr);assert.equal(f.run().status,0);
 fs.appendFileSync(f.outputs.at(-1),'\n// native comparison drift\n');assert.equal(f.run().status,1);
 assert.equal(fs.readFileSync(path.join(peer,'unknown.txt'),'utf8'),'peer');
});
test('failed staging and later publication leave the complete previous output set intact',t=>{
 const f=fixture(t);for(const file of f.outputs)fs.appendFileSync(file,'\n// intentional generated drift\n');
 if(process.platform!=='win32'){fs.chmodSync(f.outputs[0],0o755);fs.chmodSync(f.outputs[1],0o640)}
 const before=new Map(f.outputs.map(file=>[file,fs.readFileSync(file)]));
 const modes=new Map(f.outputs.map(file=>[file,fs.statSync(file).mode]));
 const partial=path.join(f.root,'partial.cjs');fs.writeFileSync(partial,`const fs=require('node:fs'),write=fs.writeFileSync,open=fs.openSync,fresh=new Set();fs.openSync=function(file,...args){const fd=open.call(this,file,...args);if(typeof file==='string'&&file.endsWith('new.cjs'))fresh.add(fd);return fd};fs.writeFileSync=function(fd,bytes,...args){if(fresh.has(fd)){fs.writeSync(fd,Buffer.from(bytes).subarray(0,9));throw Error('synthetic partial write')}return write.call(this,fd,bytes,...args)};`);
 assert.equal(f.run(['--write-production'],partial).status,1);for(const [file,bytes]of before)assert.deepEqual(fs.readFileSync(file),bytes);
 const rename=path.join(f.root,'rename.cjs');fs.writeFileSync(rename,`const fs=require('node:fs'),move=fs.renameSync;let n=0;fs.renameSync=function(from,to){if(from.endsWith('new.cjs')&&++n===2)throw Error('synthetic second rename');return move.call(this,from,to)};`);
 assert.equal(f.run(['--write-production'],rename).status,1);for(const [file,bytes]of before){assert.deepEqual(fs.readFileSync(file),bytes,'earlier publication must roll back');if(process.platform!=='win32')assert.equal(fs.statSync(file).mode,modes.get(file),'rollback preserves permissions')}
 assert.equal(f.run(['--write-production']).status,0);assert.equal(f.run().status,0);if(process.platform!=='win32')for(const [file,mode]of modes)assert.equal(fs.statSync(file).mode,mode,'publication preserves permissions');
});
test('rollback preserves an observed peer replacement and retains the original backup for recovery',t=>{
 const f=fixture(t);for(const file of f.outputs)fs.appendFileSync(file,'\n// drift\n');
 const first=f.outputs[0],before=fs.readFileSync(first),shim=path.join(f.root,'peer.cjs');
 fs.writeFileSync(shim,`const fs=require('node:fs'),move=fs.renameSync;let n=0;fs.renameSync=function(from,to){if(from.endsWith('new.cjs')&&++n===2){fs.writeFileSync(${JSON.stringify(first)},'peer replacement');throw Error('synthetic peer collision')}return move.call(this,from,to)};`);
 const result=f.run(['--write-production'],shim);assert.equal(result.status,1);assert.match(result.stderr,/TS_ROLLBACK_INCOMPLETE/);assert.equal(fs.readFileSync(first,'utf8'),'peer replacement');
 const stages=fs.readdirSync(path.dirname(first)).filter(n=>n.startsWith('.paisley-ts-'));
 assert.ok(stages.some(name=>{const backup=path.join(path.dirname(first),name,'previous.cjs');return fs.existsSync(backup)&&fs.readFileSync(backup).equals(before)}),'original runtime backup remains available');
});
test('a cooperating builder lock is exclusive and never swept by check or write',t=>{
 const f=fixture(t),lock=path.join(f.root,'.paisley-ts-build-lock');fs.mkdirSync(lock);fs.writeFileSync(path.join(lock,'owner.json'),'peer lock');
 assert.equal(f.run().status,0);const result=f.run(['--write-production']);assert.equal(result.status,1);assert.match(result.stderr,/TS_BUILD_BUSY/);
 assert.equal(fs.readFileSync(path.join(lock,'owner.json'),'utf8'),'peer lock');
});

test('browser and Node Programs reject accidental cross-host globals before publication',t=>{
 const f=fixture(t),before=new Map(f.outputs.map(file=>[file,fs.readFileSync(file)]));
 const browser=f.browserFiles[0],body=fs.readFileSync(browser,'utf8');
 fs.appendFileSync(browser,'\nconst leaked=process.pid;const buffer=Buffer.alloc(1);require("node:fs");\n');
 const rejected=f.run(['--write-production']);assert.equal(rejected.status,1);assert.match(rejected.stderr,/Cannot find name '(?:process|Buffer|require)'/);
 fs.writeFileSync(browser,body);fs.appendFileSync(f.nodeFiles[0],'\nconst leaked=document.title;\n');
 const wrongRealm=f.run(['--write-production']);assert.equal(wrongRealm.status,1);assert.match(wrongRealm.stderr,/Cannot find name 'document'/);
 for(const [file,bytes]of before)assert.deepEqual(fs.readFileSync(file),bytes);
});
