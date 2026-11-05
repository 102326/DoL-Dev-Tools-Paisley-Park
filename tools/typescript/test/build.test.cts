import type {TestContext} from 'node:test';
'use strict';
const {test}:typeof import('node:test')=require('node:test'),assert:typeof import('node:assert/strict')=require('node:assert/strict'),fs:typeof import('node:fs')=require('node:fs'),path:typeof import('node:path')=require('node:path'),os:typeof import('node:os')=require('node:os'),{spawnSync,spawn}:typeof import('node:child_process')=require('node:child_process'),{createHash}:typeof import('node:crypto')=require('node:crypto');
const actual=path.resolve(__dirname,'../../..'),compiler=process.env.PAISLEY_TSC||require.resolve('typescript/bin/tsc'),typeRoots=process.env.PAISLEY_TYPE_ROOTS||path.resolve(__dirname,'../node_modules/@types');
function fixture(t:TestContext){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-build-'));t.after(()=>{assert.equal(path.dirname(root),path.resolve(os.tmpdir()));assert.ok(path.basename(root).startsWith('paisley-build-'));fs.rmSync(root,{recursive:true,force:true})});
 const home=path.join(root,'tools/typescript');fs.mkdirSync(home,{recursive:true});
 // The isolated Program resolves the same installed compiler declarations without installing dependencies.
 fs.mkdirSync(path.join(home,'node_modules'));
 fs.symlinkSync(path.resolve(path.dirname(compiler),'..'),path.join(home,'node_modules/typescript'),process.platform==='win32'?'junction':'dir');
 fs.mkdirSync(path.join(root,'node_modules'));
 fs.symlinkSync(path.join(actual,'node_modules/xstate'),path.join(root,'node_modules/xstate'),process.platform==='win32'?'junction':'dir');
 for(const file of ['build.cjs','tsconfig.json','browser-tsconfig.json'])fs.copyFileSync(path.join(actual,'tools/typescript',file),path.join(home,file));
 const abiSource=path.join(actual,'scripts/lib/browser-abi'),abiTarget=path.join(root,'scripts/lib/browser-abi');
 fs.mkdirSync(abiTarget,{recursive:true});
 for(const file of fs.readdirSync(abiSource).filter(file=>file.endsWith('.d.cts')))fs.copyFileSync(path.join(abiSource,file),path.join(abiTarget,file));
 const config=JSON.parse(fs.readFileSync(path.join(home,'tsconfig.json')) as unknown as string) as {files:string[]};
 const nodeFiles=config.files.map(file=>path.resolve(home,file)),browserFiles=(JSON.parse(fs.readFileSync(path.join(home,'browser-tsconfig.json')) as unknown as string) as {files:string[]}).files.map(file=>path.resolve(home,file));
 const files=[...nodeFiles,...browserFiles],browserOutputs=browserFiles.flatMap(file=>['.cjs','.d.cts'].map(ext=>path.join(root,'scripts/lib/browser',path.basename(file,'.cts')+ext)));
 const outputs=[...browserOutputs,...nodeFiles.map(f=>f.slice(0,-4)+'.cjs'),path.join(root,'scripts/lib/source-find.mts')];
 for(const file of [...files,...outputs,path.join(root,'scripts/lib/owned-files.cjs')]){
  fs.mkdirSync(path.dirname(file),{recursive:true});fs.copyFileSync(path.join(actual,path.relative(root,file)),file);
 }
 const run=(args:string[]=[],preload?:string)=>spawnSync(process.execPath,[...(preload?['-r',preload]:[]),path.join(home,'build.cjs'),...args],{encoding:'utf8',env:{...process.env,PAISLEY_TSC:compiler,PAISLEY_TYPE_ROOTS:typeRoots}});
 return {root,home,files,browserFiles,nodeFiles,outputs,run};
}

async function windowsReadHandle(file:string,sharing:'None'|'Read'){
 const shell=path.join(process.env.ProgramFiles||'C:\\Program Files','PowerShell/7/pwsh.exe');
 assert.ok(fs.existsSync(shell),'PowerShell 7 is required for the Windows file-sharing regression');
 const script=`$ErrorActionPreference='Stop'
$share=[Enum]::Parse([IO.FileShare],$env:PAISLEY_TEST_FILE_SHARE)
$stream=[IO.File]::Open($env:PAISLEY_TEST_LOCK_FILE,[IO.FileMode]::Open,[IO.FileAccess]::Read,$share)
try {
 $hash=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($stream)).ToLowerInvariant()
 $stream.Position=0
 [Console]::Out.WriteLine((@{pid=$PID;sharing=$env:PAISLEY_TEST_FILE_SHARE;sha256=$hash;length=$stream.Length}|ConvertTo-Json -Compress))
 [Console]::Out.Flush()
 [Console]::In.ReadLine()|Out-Null
} finally {$stream.Dispose()}`;
 const child=spawn(shell,['-NoLogo','-NoProfile','-NonInteractive','-Command',script],{windowsHide:true,env:{...process.env,PAISLEY_TEST_LOCK_FILE:file,PAISLEY_TEST_FILE_SHARE:sharing}});
 let stdout='',stderr='',resolveReady:(v:string)=>void=()=>{},rejectReady:(e:Error)=>void=()=>{};
 const ready=new Promise<string>((resolve,reject)=>{resolveReady=resolve;rejectReady=reject});
 child.stdout.setEncoding('utf8');child.stderr.setEncoding('utf8');
 child.stdout.on('data',(text:string)=>{stdout+=text;if(stdout.includes('\n'))resolveReady(stdout.split('\n')[0])});
 child.stderr.on('data',(text:string)=>{stderr+=text});
 child.stdin.on('error',error=>rejectReady(error));child.on('error',error=>rejectReady(error));
 const closed=new Promise<{code:number|null;signal:NodeJS.Signals|null}>(resolve=>child.once('close',(code,signal)=>{rejectReady(Error('File holder exited before ready: '+stderr));resolve({code,signal})}));
 const release=async()=>{
  child.stdin.end();let timeout:ReturnType<typeof setTimeout>|undefined;
  try{const result=await Promise.race([closed,new Promise<never>((_,reject)=>{timeout=setTimeout(()=>reject(Error('Owned file holder did not exit')),10000)})]);assert.equal(result.code,0,stderr);assert.equal(result.signal,null)}
  catch(error){child.kill('SIGKILL');await closed;throw error}finally{clearTimeout(timeout)}
 };
 const timer=setTimeout(()=>rejectReady(Error('No confirmed Windows file handle: '+stderr)),10000);
 try{const metadata=JSON.parse(await ready) as {pid:number;sharing:string;sha256:string;length:number};assert.equal(metadata.sharing,sharing);assert.ok(Number.isInteger(metadata.pid)&&metadata.pid>0);return {metadata,release}}
 catch(error){try{await release()}catch(cleanup){throw new AggregateError([error,cleanup],'File holder setup and cleanup failed')}throw error}finally{clearTimeout(timer)}
}

test('real Windows sharing locks refuse reads or publication and roll back earlier CJS before recovery',{skip:process.platform!=='win32'},async t=>{
 const f=fixture(t),first=f.outputs[0],second=f.outputs[2],hash=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
 const clean=new Map(f.outputs.map(file=>[file,fs.readFileSync(file)]));
 for(const file of [first,second])fs.appendFileSync(file,'\n// deliberate generated drift for native file-sharing test\n');
 const before=new Map(f.outputs.map(file=>[file,fs.readFileSync(file)])),peer=path.join(f.home,'dist/peer.txt');
 fs.mkdirSync(path.dirname(peer));fs.writeFileSync(peer,'peer data');
 const intact=()=>{for(const [file,bytes]of before)assert.deepEqual(fs.readFileSync(file),bytes,file);assert.equal(fs.readFileSync(peer,'utf8'),'peer data');assert.equal(fs.existsSync(path.join(f.root,'.paisley-ts-build-lock')),false)};
 const none=await windowsReadHandle(first,'None');let denied:ReturnType<typeof f.run>;
 try{assert.equal(none.metadata.sha256,hash(before.get(first)!));denied=f.run(['--write-production']);assert.equal(denied.status,1);assert.match(denied.stderr,/EACCES|EPERM|EBUSY/)}finally{await none.release()}
 intact();t.diagnostic(JSON.stringify({phase:'native-read-refusal',holder:none.metadata,exit:denied!.status,stderr:denied!.stderr.trim(),allPreviousBytesIntact:true,holderClosed:true}));const inodeBefore=fs.statSync(first,{bigint:true}).ino.toString();
 const read=await windowsReadHandle(second,'Read');let rename:ReturnType<typeof f.run>;
 try{assert.equal(read.metadata.sha256,hash(before.get(second)!));assert.deepEqual(fs.readFileSync(second),before.get(second));rename=f.run(['--write-production']);assert.equal(rename.status,1);assert.match(rename.stderr,/(?:EACCES|EPERM|EBUSY).*rename/);assert.doesNotMatch(rename.stderr,/TS_ROLLBACK_INCOMPLETE/);intact()}finally{await read.release()}
 intact();const inodeAfter=fs.statSync(first,{bigint:true}).ino.toString();
 assert.notEqual(inodeAfter,inodeBefore,'earlier CJS was actually replaced and rolled back, not merely rejected before publication');
 t.diagnostic(JSON.stringify({phase:'native-rename-refusal',holder:read.metadata,exit:rename!.status,stderr:rename!.stderr.trim(),earlierCjsInodeBefore:inodeBefore,earlierCjsInodeAfter:inodeAfter,allPreviousBytesIntact:true,holderClosed:true}));
 const recovered=f.run(['--write-production']);assert.equal(recovered.status,0,recovered.stderr);assert.equal(f.run().status,0);
 // Successful publication emits LF; failures above must preserve the exact old bytes.
 for(const [file,bytes]of clean)assert.equal(fs.readFileSync(file,'utf8').replaceAll('\r\n','\n'),bytes.toString('utf8').replaceAll('\r\n','\n'));
 assert.equal(fs.readFileSync(peer,'utf8'),'peer data');
 t.diagnostic(JSON.stringify({kind:'real-windows-file-sharing',outputsChecked:before.size,none:{pid:none.metadata.pid,error:denied!.stderr.trim(),oldOutputsIntact:true},read:{pid:read.metadata.pid,error:rename!.stderr.trim(),readPermitted:true,earlierCjsInodeBefore:inodeBefore,earlierCjsInodeAfter:inodeAfter,rollbackBytesMatch:true},recoveryExit:recovered.status,finalCheckExit:0,peerPreserved:true,holdersClosed:true}));
});
test('complete Program check is read-only, accepts CRLF, and rejects code/type/compiled-view drift',t=>{
 const f=fixture(t),peer=path.join(f.home,'dist');fs.mkdirSync(peer);fs.writeFileSync(path.join(peer,'unknown.txt'),'peer');
 for(const file of [...f.files,...f.outputs])fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('\r\n','\n').replaceAll('\n','\r\n'));
 assert.equal(f.run().status,0);
 const output=f.outputs[0],changed=fs.readFileSync(output,'utf8')+'\n// drift\n';fs.writeFileSync(output,changed);
 const drift=f.run();assert.equal(drift.status,1);assert.match(drift.stderr,/SOURCE_BUILD_DRIFT/);assert.equal(fs.readFileSync(output,'utf8'),changed);
 const source=f.files[0],original=fs.readFileSync(source,'utf8');fs.writeFileSync(source,original+'\nconst bad: Code="RAW_EXCEPTION";\n');
 const failed=f.run(['--write-production']);assert.equal(failed.status,1);assert.match(failed.stderr,/TS2322/);assert.equal(fs.readFileSync(output,'utf8'),changed);
 fs.writeFileSync(source,original);const write=f.run(['--write-production']);assert.equal(write.status,0,write.stderr);assert.equal(f.run().status,0);
 fs.appendFileSync(f.outputs.at(-1)!,'\n// native comparison drift\n');assert.equal(f.run().status,1);
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

export {};
