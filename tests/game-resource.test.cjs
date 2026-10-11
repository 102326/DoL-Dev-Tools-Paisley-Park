'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {Runtime}=require('../scripts/lib/game-runtime.cjs'),resource=require('../scripts/lib/game-resource.cjs');
const target={serial:'resource-test',package:'com.example.fixture',userId:'0'};
const provider={validateGoal:g=>g.description==='Resource test',scene:v=>v,satisfied:()=>false};
const config={mode:'development',goal:{description:'Resource test'},budget:{timeoutMs:60000,maxActions:8,maxObservations:32,maxReplans:16}};
function fixture(t){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-resource-')),file=path.join(dir,'store.sqlite'),opened=[];
 const open=()=>{const r=new Runtime(file,{provider});opened.push(r);return r};
 t.after(()=>{for(const r of opened){try{r.close()}catch{}}fs.rmSync(dir,{recursive:true,force:true})});
 const authorization={workspace:dir,...target,signingHash:'a11ce',intents:['data-reset','debug','experiment'],dataDomain:'app-user-data'};
 let token=null,processes=true,inode='1:42',clears=0,clearResult='Success',secondary=false;
 const commands=[];
 const adb=async(...a)=>{const c=a.join(' ');commands.push(c);
  if(c==='get-state')return 'device';if(c==='shell am get-current-user')return '0';
  if(c.includes('dumpsys package'))return 'Package [com.example.fixture]\nversionCode=1\nsignatures=PackageSignatures{fixture signatures:[a11ce]}\nUser 0: installed=true';
  if(c.endsWith(' pwd'))return '/data/user/0/com.example.fixture';if(c.endsWith(' id -u'))return '10042';if(c.endsWith("stat -c %d:%i ."))return inode;
  if(c.includes('am force-stop')){processes=false;return ''}
  if(c==='shell ps -A -o UID,PID,NAME')return 'UID PID NAME\n'+(processes||secondary?'10042 91 com.example.fixture:worker':'0 1 init');
  if(c.includes('pm clear')){clears++;token=null;inode='1:'+(42+clears);return clearResult}
  if(c.includes('echo EMPTY'))return 'EMPTY';
  if(c.includes('printf %s')){token=c.match(/printf %s ([a-f0-9]{64})/)[1];return ''}
  if(c.includes('cat files/.paisley-data-generation')){if(!token)throw Error('No marker');return token}
  throw Error('Unexpected native command '+c);
 };
 return {dir,file,open,r:open(),authorization,adb,commands,get clears(){return clears},changeMarker(){token='f'.repeat(64)},secondary(){secondary=true},clearFailure(){clearResult='Failed'}};
}
function unresolved(r){const s=r.start(target,config),a={ref:'prep',kind:'experiment',cost:0,risk:'normal',selected:{test:true}};
 const d=r.observe(s.id,{choices:[a],revision:1}).decision;
 r.propose(s.id,{...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:a.ref,reason:'Test resource fencing',plan:[],beliefs:[]});
 const e=r.prepare(s.id);r.claimDispatch(e.id);return {s,e};
}
test('genuine native rebuild fences old sessions, retains Unknown and requires a fresh native proof in the same Store/TargetKey',async t=>{
 const f=fixture(t),{s,e}=unresolved(f.r),original=JSON.stringify(f.r.effect(e.id));
 assert.throws(()=>f.r.beginRebuild({kind:'inspection',target}),/Verified native/);
 const proof=await resource.rebuild(f.r,f.adb,target,f.authorization);assert.equal(f.clears,1);
 assert.equal(JSON.stringify(f.r.effect(e.id)),original);assert.equal(f.r.effects(s.targetKey)[0].id,e.id);
 assert.throws(()=>f.r.resume(s.id),/different App data/);assert.throws(()=>f.r.claimDispatch(e.id),/different App data/);
 assert.throws(()=>f.r.start(target,config),/Verified native/);assert.throws(()=>f.r.start(target,config,{resourceProof:JSON.parse(JSON.stringify(proof))}),/Verified native/);
 assert.throws(()=>f.r.db.prepare('UPDATE targets SET owner=?,until_ms=? WHERE k=?').run(s.id,Date.now()+60000,s.targetKey),/resource lease fence/);
 const r=f.open(),current=await resource.snapshot(f.adb,target,f.authorization,r.resource(s.targetKey));
 assert.equal(r.db.prepare('PRAGMA user_version').get().user_version,3);
 const next=r.start(target,config,{resourceProof:current});assert.equal(next.targetKey,s.targetKey);assert.equal(next.resourceGeneration,proof.id);
 const state=r.observe(next.id,{choices:[],revision:1});assert.equal(state.machine.value,'waitingDecision');assert.equal(state.openEffects.length,0);assert.equal(state.historicalOpenEffects[0].id,e.id);
 assert.throws(()=>r.observe(next.id,{choices:[],revision:2},[{attemptId:e.id,outcome:'not-occurred',remoteClosed:true,spent:0,source:'New state cannot settle old effect'}]),/target\/owner mismatch/);
 assert.equal(JSON.stringify(r.effect(e.id)),original);
 f.changeMarker();await assert.rejects(resource.snapshot(f.adb,target,f.authorization,r.resource(s.targetKey)),/generation changed/);
});
test('wrong scope refuses writes; surviving secondary writers and failed clear leave a durable fenced resource',async t=>{
 const f=fixture(t);await assert.rejects(resource.rebuild(f.r,f.adb,target,{...f.authorization,package:'com.other.app'}),/target mismatch/);assert.equal(f.clears,0);assert.ok(!f.commands.some(c=>c.includes('force-stop')));
 const {s}=unresolved(f.r);f.secondary();await assert.rejects(resource.rebuild(f.r,f.adb,target,f.authorization),/possible writer/);assert.equal(f.clears,0);assert.equal(f.r.resource(s.targetKey).status,'rebuilding');
 assert.throws(()=>f.open().resume(s.id),/different App data/);
 const g=fixture(t),old=g.r.start(target,config);g.clearFailure();await assert.rejects(resource.rebuild(g.r,g.adb,target,g.authorization),/did not confirm/);assert.equal(g.r.resource(old.targetKey).status,'rebuilding');assert.ok(!g.commands.some(c=>c.includes('printf %s')));
});
test('native verification interruption cannot be promoted by a JSON proof; retry performs a new clear and retains reset history',async t=>{
 const f=fixture(t),old=f.r.start(target,config);let stopped=false;
 await assert.rejects(resource.rebuild(f.r,f.adb,target,f.authorization,{record:r=>{if(r.phase==='clear-returned'){stopped=true;throw Error('Host interruption')}}}),/Host interruption/);
 assert.ok(stopped);assert.equal(f.clears,1);assert.equal(f.r.resource(old.targetKey).status,'rebuilding');
 assert.throws(()=>f.r.completeRebuild({kind:'rebuilt',target,id:'a'.repeat(64)}),/Verified native/);
 const p=await resource.rebuild(f.r,f.adb,target,f.authorization);assert.equal(f.clears,2);assert.equal(f.r.resource(old.targetKey).id,p.id);assert.equal(f.r.db.prepare('SELECT COUNT(*) AS n FROM resources').get().n,2);
});
test('scope applies to ordinary GER candidates and retains missing-scope historical semantics',t=>{
 const f=fixture(t),s=f.r.start(target,{...config,scope:{...f.authorization,intents:[]}}),a={ref:'debug',kind:'experiment',cost:0,risk:'normal',selected:{}};
 assert.deepEqual(f.r.observe(s.id,{choices:[a],revision:1}).decision.scene.choices,[]);
 const r=f.open();assert.deepEqual(r.load(s.id).config.scope.intents,[]);
});

test('actual Action CLI consumes the granted scope file before planning without touching Android',t=>{
 const f=fixture(t),scopeFile=path.join(f.dir,'scope.json'),actionFile=path.join(f.dir,'action.json'),out=path.join(f.dir,'plan');
 fs.writeFileSync(scopeFile,JSON.stringify(f.authorization));fs.writeFileSync(actionFile,JSON.stringify({type:'data-reset'}));
 const run=require('node:child_process').spawnSync(process.execPath,['scripts/dol-dev.cjs','action','--file',actionFile,'--serial',target.serial,'--package',target.package,'--out',out,'--authorization-file',scopeFile,'--store',f.file,'--plan'],{cwd:path.resolve(__dirname,'..'),encoding:'utf8',env:{...process.env,DOL_ADB:'nonexistent-adb-to-prove-no-device-access'}});
 assert.equal(run.status,0,run.stderr);assert.equal(JSON.parse(fs.readFileSync(path.join(out,'manifest.json'),'utf8')).status,'planned');
 assert.equal(f.r.db.prepare('PRAGMA user_version').get().user_version,2);
});

test('production Action data reset reaches the shared Runtime and persists native evidence',async t=>{
 const f=fixture(t),events=[],ctx={options:{...target,authorization:f.authorization,store:f.file},adb:f.adb,recordResource:r=>events.push(r),markSideEffect(){}};
 const result=await require('../scripts/lib/action.cjs').execute(ctx,{type:'data-reset'});
 assert.equal(result.status,'completed');assert.equal(f.clears,1);assert.deepEqual(events.map(e=>e.phase),['fenced','clear-returned','verified']);
 const k=require('node:crypto').createHash('sha256').update(JSON.stringify([target.serial,target.package,target.userId])).digest('hex');
 assert.equal(f.r.resource(k).id,result.resourceGeneration);
});

test('scoped Debug refuses an altered native generation before launch and shares the existing Store',async t=>{
 const f=fixture(t);await resource.rebuild(f.r,f.adb,target,f.authorization);f.changeMarker();
 const count=f.commands.length;
 await assert.rejects(require('../scripts/lib/action.cjs').execute({options:{...target,authorization:f.authorization,store:f.file},adb:f.adb},{type:'launch'}),/generation changed/);
 assert.ok(!f.commands.slice(count).some(c=>c.includes('resolve-activity')||c.includes('am start')));
});

test('Store open cannot downgrade a concurrent genuine schema-3 upgrade or erase its native lease fence',async t=>{
 for(const pauseAt of [1,2]){
 const f=fixture(t),old=unresolved(f.r);let inspection;
 const begin=f.r.beginRebuild.bind(f.r);
 f.r.beginRebuild=p=>{inspection=p;throw Error('Capture verified inspection before writes')};
 await assert.rejects(resource.rebuild(f.r,f.adb,target,f.authorization),/Capture verified/);f.r.beginRebuild=begin;
 const vm=require('node:vm'),{createRequire}=require('node:module'),{DatabaseSync}=require('node:sqlite');
 const sourceFile=path.resolve(__dirname,'../scripts/lib/game-runtime.cjs'),realRequire=createRequire(sourceFile);let interleaved=false,blocked=false,versionReads=0;
 class PausedDatabase{
  constructor(file){const db=new DatabaseSync(file);return new Proxy(db,{get(_target,name){
   if(name==='prepare')return sql=>{const st=db.prepare(sql);if(sql==='PRAGMA user_version')return {get(){const result=st.get();if(++versionReads===pauseAt){interleaved=true;try{begin(inspection)}catch(e){assert.match(e.message,/locked|busy/i);blocked=true}}return result}};return st};
   const value=db[name];return typeof value==='function'?value.bind(db):value;
  }})}
 }
 const module={exports:{}},req=name=>name==='node:sqlite'?{DatabaseSync:PausedDatabase}:realRequire(name);
 vm.runInNewContext('(function(require,module){'+fs.readFileSync(sourceFile,'utf8')+'\n})',{process,Buffer})(req,module);
 const opened=new module.exports.Runtime(f.file,{provider});
 try{
  assert.ok(interleaved);if(blocked)begin(inspection);
  assert.equal(opened.db.prepare('PRAGMA user_version').get().user_version,3,'ordinary open must not write stale schema 2 over schema 3');
  assert.equal(opened.resource(old.s.targetKey).generation,1);
  assert.throws(()=>f.r.resume(old.s.id),/different App data/);assert.equal(f.r.effect(old.e.id).status,'dispatching');
 }finally{opened.close()}
 const reopened=f.open();assert.equal(reopened.db.prepare('PRAGMA user_version').get().user_version,3);
 }
});
