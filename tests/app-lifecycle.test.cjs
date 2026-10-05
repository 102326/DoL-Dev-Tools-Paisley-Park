const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const lifecycle=require('../scripts/lib/app-lifecycle.cjs'),{evidence}=require('../scripts/lib/evidence.cjs'),journey=require('../scripts/lib/journey.cjs');
const pkg='com.example.game',boot='123e4567-e89b-42d3-a456-426614174000';
const entry=(pid=123,reason=5,user=0,uid=10331,name=pkg)=>`ApplicationExitInfo #${pid}:\n timestamp=2026-10-05 23:20:54.170 pid=${pid} realUid=${uid} packageUid=${uid} definingUid=${uid} user=${user}\n process=${name} reason=${reason} (PRIVATE_LABEL) subreason=0 (UNKNOWN) status=5\n description=PRIVATE_BODY reason=4\n trace=PRIVATE_PATH\n state=PRIVATE_BYTES\n`;
const dump=body=>`ACTIVITY MANAGER PROCESS EXIT INFO (dumpsys activity exit-info)\n package: ${pkg}\n${body}`;
function adbFixture({changedBoot=false,changedPid=false,foreignMain=false}={}){
 let boots=0,pids=0;const calls=[];
 const adb=async(...args)=>{calls.push(args);const command=args.join(' ');let value='';
  if(command==='get-state')value='device';
  else if(command.includes('ro.product.model'))value='test';
  else if(command.includes('ro.build.version.release'))value='17';
  else if(command.includes('date +%s'))value='1790000000';
  else if(command.startsWith('shell dumpsys package'))value='versionName=1.0 versionCode=1';
  else if(command.startsWith('shell pidof'))value=changedPid&&++pids>1?'456':'123';
  else if(command==='shell am get-current-user')value='0';
  else if(command.startsWith('shell cmd package list packages'))value=`package:${pkg}.extra uid:20000\npackage:${pkg} uid:10331`;
  else if(command==='shell cat /proc/sys/kernel/random/boot_id')value=changedBoot&&++boots>1?boot.replace('000','001'):boot;
  else if(command.startsWith('shell dumpsys activity exit-info'))value=dump(entry());
  else if(command==='shell dumpsys activity processes')value=` *APP* UID ${foreignMain?1010331:10331} ProcessRecord{abc 123:${pkg}/u0a1}\n user #${foreignMain?10:0} uid=${foreignMain?1010331:10331}\n packageList={${pkg}}\n`;
  return Buffer.from(value);
 };return {adb,calls};
}
test('exit history isolates package/user, limits retained metadata and never copies descriptions',()=>{
 const h=lifecycle.history(dump(entry()+entry(124,99)+entry(125,6,10,10010331)),pkg,0,10331);
 assert.equal(h.entries.length,2);assert.equal(h.otherUserExcluded,1);assert.equal(h.entries[0].reason,'CRASH_NATIVE');assert.equal(h.entries[1].reason,'UNRECOGNIZED');assert.equal(JSON.stringify(h).includes('PRIVATE'),false);
 assert.throws(()=>lifecycle.history(dump(entry(123,5,0,20000)),pkg,0,10331),/UID/);
 assert.throws(()=>lifecycle.history(dump(entry()+entry()),pkg,0,10331),/Duplicate/);
 assert.throws(()=>lifecycle.history(dump(entry()).replace('2026-10-05','2026-02-31'),pkg,0,10331),/format/);
 assert.throws(()=>lifecycle.history(dump(entry()).replace(`package: ${pkg}`,`package: ${pkg}.extra`),pkg,0,10331),/identity/);
 assert.throws(()=>lifecycle.history('Unsupported command',pkg,0,10331),/format/);
 assert.equal(lifecycle.history('ACTIVITY MANAGER PROCESS EXIT INFO (dumpsys activity exit-info)\n',pkg,0,10331).entries.length,0);
 const truncated=lifecycle.history(dump(Array.from({length:33},(_,i)=>entry(i+1)).join('')),pkg,0,10331);assert.equal(truncated.entries.length,32);assert.equal(truncated.truncated,true);
});
test('lifecycle identity changes remain incomplete and comparisons bind the same boot/target',async()=>{
 const base={appPid:'123',options:{package:pkg}};
 const good=await lifecycle.collect({...base,adb:adbFixture().adb});assert.equal(good.incomplete,false);lifecycle.contract(good);
 for(const setting of [{changedBoot:true},{changedPid:true},{foreignMain:true}]){const result=await lifecycle.collect({...base,adb:adbFixture(setting).adb});assert.equal(result.incomplete,true);assert.equal(result.collectorStatus,'failed');assert.equal(result.mainPid,null)}
 const next={...good,mainPid:'456',exitHistory:lifecycle.history(dump(entry()+entry(456,10)),pkg,0,10331)};
 const diff=lifecycle.diff(good,next);assert.equal(diff.pidChanged,true);assert.equal(diff.newlyReportedExits.length,1);assert.equal(diff.newlyReportedExits[0].reason,'USER_REQUESTED');assert.equal(JSON.stringify(diff).includes(pkg),false);
 const foreign=lifecycle.diff(good,{...next,bootIdHash:'a'.repeat(64)});assert.equal(foreign.incomplete,true);assert.equal(foreign.pidChanged,null);assert.equal(foreign.newlyReportedExits.length,0);
 assert.throws(()=>lifecycle.contract({...good,exitHistory:{...good.exitHistory,totalReported:100}}),/coverage/);
 assert.throws(()=>lifecycle.contract({...good,exitHistory:{...good.exitHistory,entries:[{...good.exitHistory.entries[0],reasonCode:6}]}}),/entry|association/);
});
test('lifecycle profile and Journey checkpoint need no CDP, screenshot or mutation',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dol-lifecycle-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const f=adbFixture(),options={serial:'offline-device',package:pkg,out:path.join(root,'evidence'),windowMs:0,profile:'lifecycle'};
 const result=await evidence(options,{adb:f.adb});assert.equal(result.status,'complete');assert.deepEqual(result.steps.map(s=>s.name),['device','app','app-lifecycle']);
 const plan={plan:{schemaVersion:1,steps:[{type:'checkpoint',capture:['app-lifecycle']}]},sha256:'a'.repeat(64)};
 const run=await journey.run({...options,out:path.join(root,'journey'),testEnvironment:true},plan,{adb:f.adb});assert.equal(run.status,'complete');
 assert.equal(f.calls.some(a=>a[0]==='forward'||a.includes('screencap')||a.includes('input')||a.includes('force-stop')),false);
 const {main}=require('../scripts/dol-dev.cjs'),before=path.join(root,'evidence/app-lifecycle.json'),out=path.join(root,'diff.json');
 await main(['app-lifecycle-diff','--before',before,'--after',before,'--out',out]);assert.equal(JSON.parse(fs.readFileSync(out)).data.incomplete,false);
 await assert.rejects(main(['app-lifecycle-diff','--before',before,'--after',before,'--out',out]),{code:'EEXIST'});
 const injected=path.join(root,'injected.json'),safe=path.join(root,'safe.json');const body=JSON.parse(fs.readFileSync(before));body.incidentId={note:'PRIVATE_BODY'};fs.writeFileSync(injected,JSON.stringify(body));
 await main(['app-lifecycle-diff','--before',injected,'--after',before,'--out',safe]);const safeBody=fs.readFileSync(safe,'utf8');assert.equal(safeBody.includes('PRIVATE_BODY'),false);assert.equal(JSON.parse(safeBody).data.inputIncidents[0],null);
});
