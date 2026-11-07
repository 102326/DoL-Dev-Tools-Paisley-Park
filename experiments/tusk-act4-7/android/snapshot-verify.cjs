'use strict';
// Explicitly selected neutral probe only; never installs, launches or controls an App.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict');
const {performance}=require('node:perf_hooks');
const [serial,directory]=process.argv.slice(2),pkg='org.paisleypark.tuskprobe',uri=`content://${pkg}.snapshot/current`;
assert.match(serial||'',/^[\w.:-]{1,128}$/);assert.ok(directory&&path.isAbsolute(directory));
assert.ok(process.env.ANDROID_SNAPSHOT_SDK&&path.isAbsolute(process.env.ANDROID_SNAPSHOT_SDK),'Explicit installed Android SDK required');
assert.equal(fs.existsSync(directory),false,'Use a new output directory');fs.mkdirSync(directory,{recursive:true});
const adb=process.env.DOL_ADB||'adb',calls=[],report={scope:'own neutral Kotlin probe only',rounds:[],checks:[]};
function run(args){const at=performance.now(),r=cp.spawnSync(adb,['-s',serial,...args],{encoding:'utf8',windowsHide:true,timeout:15000,maxBuffer:2*1024*1024});const result={args,status:r.status,error:r.error?.code??null,stdout:r.stdout||'',stderr:r.stderr||'',durationMs:performance.now()-at};calls.push(result);return result;}
function successful(args){const r=run(args);assert.equal(r.status,0,JSON.stringify(r));assert.equal(r.error,null);return r;}
function query(count=1){const r=successful(['shell','content','query','--user','0','--uri',`'${uri}?count=${count}'`]);const rows=[...r.stdout.matchAll(/^Row:\s*\d+\s+snapshot=(\{.*\})\s*$/gm)].map(m=>JSON.parse(m[1]));assert.equal(rows.length,count,r.stdout+r.stderr);return{rows,durationMs:r.durationMs,bytes:Buffer.byteLength(r.stdout)};}
const view=s=>Object.fromEntries(['schemaVersion','source','package','uid','pid','process','available','phase','activity','count','revision'].map(k=>[k,s[k]]));
function active(s){assert.equal(s.schemaVersion,1);assert.equal(s.source,'self-app-native');assert.equal(s.package,pkg);assert.equal(s.available,true);assert.equal(s.phase,'resumed');assert.match(s.process,/^[a-f0-9-]{36}$/);assert.match(s.activity,/^[a-f0-9-]{36}$/);assert.ok(Number.isSafeInteger(s.count)&&s.count>=0);assert.ok(Number.isSafeInteger(s.revision));}
function foreground(){const r=successful(['shell','dumpsys','window','displays']);assert.match(r.stdout,new RegExp('mCurrentFocus=.*'+pkg.replaceAll('.','\\.')));}
function rejection(args){const r=run(args);assert.equal(r.error,null);assert.match(r.stdout+r.stderr,/Unsupported|unsupported|Read only/);assert.doesNotMatch(r.stdout,/^Row:/m);}
try{
  assert.equal(successful(['shell','am','get-current-user']).stdout.trim(),'0');foreground();
  const baseline=query().rows[0];active(baseline);report.baseline=baseline;
  for(const suffix of ['?count=0','?count=17','?count=1&count=2','?unknown=1'])rejection(['shell','content','query','--user','0','--uri',`'${uri}${suffix}'`]);
  rejection(['shell','content','query','--user','0','--uri',`'${uri}/unknown'`]);
  rejection(['shell','content','query','--user','0','--uri',uri,'--projection','snapshot']);
  rejection(['shell','content','delete','--user','0','--uri',uri]);
  assert.deepEqual(view(query().rows[0]),view(baseline));report.checks.push('seven invalid/mutable requests refused; own state unchanged');
  const max=query(16);for(const s of max.rows)assert.deepEqual(view(s),view(baseline));report.checks.push('bounded sixteen-row read passed');
  for(let round=0;round<3;round++){
    foreground();const single=query();assert.deepEqual(view(single.rows[0]),view(baseline));
    const serialQueries=[];for(let i=0;i<5;i++){const q=query();assert.deepEqual(view(q.rows[0]),view(baseline));serialQueries.push(q.durationMs);}
    const batch=query(5);for(const s of batch.rows)assert.deepEqual(view(s),view(baseline));
    foreground();const layoutFile=path.join(directory,`layout-${round}.json`),start=performance.now();
    const layout=cp.spawnSync(process.env.ANDROID_CLI||'android',['--sdk='+process.env.ANDROID_SNAPSHOT_SDK,'layout','--device='+serial,'--flat','--full','-o',layoutFile],{encoding:'utf8',windowsHide:true,timeout:30000});
    const uiMs=performance.now()-start;calls.push({tool:'official Android CLI',status:layout.status,stdout:layout.stdout,stderr:layout.stderr,durationMs:uiMs});assert.equal(layout.status,0,layout.stderr);
    const raw=fs.readFileSync(layoutFile,'utf8'),windows=JSON.parse(raw),own=windows.filter(w=>w.active&&w.focused&&w['window-title']==='Tusk Activity Probe');assert.equal(own.length,1);
    const text=own[0].content.map(n=>n.text||'').find(s=>s.includes(`process=${baseline.process}`));assert.ok(text);assert.ok(text.includes(`activity=${baseline.activity}`));assert.match(text,new RegExp(`count=${baseline.count}(?:\\n|$)`));
    assert.deepEqual(view(query().rows[0]),view(baseline));
    report.rounds.push({singleMs:single.durationMs,fiveIndividualMs:serialQueries.reduce((a,b)=>a+b,0),fiveIndividualSamplesMs:serialQueries,fiveBatchMs:batch.durationMs,batchBytes:batch.bytes,uiLayoutMs:uiMs,uiLayoutBytes:Buffer.byteLength(raw)});
  }
  report.status='passed';report.checks.push('native snapshot and displayed process/activity/count agree','no state changes during timings');
}catch(error){report.status='failed';report.error={message:error.message,stack:error.stack};process.exitCode=1;}
finally{
  report.cleanup={deviceFilesCreated:false};
  fs.writeFileSync(path.join(directory,'calls.json'),JSON.stringify(calls,null,2));fs.writeFileSync(path.join(directory,'validation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,rounds:report.rounds,checks:report.checks,error:report.error?.message}));
}
