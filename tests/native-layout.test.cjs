const {test}=require('node:test'),assert=require('node:assert/strict'),{collect,project}=require('../scripts/lib/native-layout.cjs');
test('native layout is explicit, bounded, neutral and projects no native text or private resource names',async()=>{
 const nodes=[{class:'android.widget.Button',resourceId:'com.example:id/private',text:'PRIVATE_TEXT',contentDesc:'PRIVATE_DESCRIPTION',bounds:'[0,0][100,40]',interactions:['clickable','PRIVATE_ACTION'],state:['focused'],extra:'PRIVATE_EXTRA'}];
 const projected=project(nodes);assert.equal(projected.nodes[0].textPresent,true);assert.equal(JSON.stringify(projected).includes('PRIVATE'),false);assert.deepEqual(projected.nodes[0].bounds,[0,0,100,40]);assert.equal(project(Array(201).fill(nodes[0])).truncated,true);assert.throws(()=>project({nodes}));
 let calls=0;await assert.rejects(collect({options:{serial:'selected'}} ,async()=>{calls++}));assert.equal(calls,0);
 const result=await collect({options:{serial:'selected',allowHelper:true}},async(exe,args,settings)=>{calls++;assert.ok(args.includes('--no-metrics'));assert.ok(args.includes('--flat'));assert.ok(args.includes('--device=selected'));assert.equal(settings.timeout,15000);return{stdout:JSON.stringify(nodes)}});assert.equal(result.nodes.length,1);
});
test('missing CLI is unsupported; actual process and output failures remain failed without leaking private output',async()=>{
 const ctx={options:{serial:'selected',allowHelper:true}};
 for(const [error,status,reason,extra] of [
  [{code:'ENOENT'},'unsupported','android-cli-unavailable',{}],
  [{code:'EPERM'},'failed','native-layout-process-permission-denied',{}],
  [{code:'EACCES'},'failed','native-layout-process-permission-denied',{}],
  [{code:'ERR_CHILD_PROCESS_STDIO_MAXBUFFER',killed:true},'failed','native-layout-output-limit',{}],
  [{killed:true,signal:'SIGTERM'},'failed','native-layout-process-terminated',{signal:'SIGTERM'}],
  [{code:1},'failed','native-layout-execution-failed',{exitCode:1}],
  [{},'failed','native-layout-execution-failed',{exitCode:null}],
 ]){
  const result=await collect(ctx,async()=>{throw Object.assign(Error('PRIVATE_ERROR'),error,{stdout:'PRIVATE_STDOUT',stderr:'PRIVATE_STDERR'})});
  assert.equal(result.collectorStatus,status);assert.equal(result.reason,reason);for(const [key,value] of Object.entries(extra))assert.equal(result[key],value);assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
 }
 for(const [stdout,reason] of [['PRIVATE_INVALID_JSON','native-layout-invalid-json'],['{}','native-layout-invalid-data'],['[null]','native-layout-invalid-data']]){
  const result=await collect(ctx,async()=>({stdout}));assert.equal(result.collectorStatus,'failed');assert.equal(result.reason,reason);assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
 }
});
