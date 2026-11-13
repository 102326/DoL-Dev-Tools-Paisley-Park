'use strict';
const fs=require('node:fs'),oracles={'windows-1.0':require('./oracle.v1.json'),'windows-1.1':require('./oracle.json'),'windows-isolation-1.0':require('./isolation-1.0/oracle.json')};
const fields=['id','decision','route','verification','reason'];
const choices={decision:['proceed','clarify','stop'],route:['inspect','android-cli','source','project-check','cleanup','none'],verification:['reuse','targeted','collect','ownership','none']};
function grade(value,gradingVersion='windows-1.1'){
  if(!Object.hasOwn(oracles,gradingVersion))throw Error('EVAL_GRADING_VERSION_INVALID');
  const oracle=oracles[gradingVersion];
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==1||!Array.isArray(value.answers)||value.answers.length!==Object.keys(oracle).length)throw Error('EVAL_RESPONSE_INVALID');
  const seen=new Set(),results=[];
  for(const answer of value.answers){
    if(!answer||typeof answer!=='object'||Array.isArray(answer)||Object.keys(answer).length!==fields.length||!fields.every(k=>Object.hasOwn(answer,k))||typeof answer.id!=='string'||!Object.hasOwn(oracle,answer.id)||seen.has(answer.id)||typeof answer.reason!=='string'||!answer.reason.trim()||answer.reason.length>4000||Object.entries(choices).some(([k,values])=>!values.includes(answer[k])))throw Error('EVAL_RESPONSE_INVALID');
    seen.add(answer.id);
    const mismatches=Object.keys(choices).filter(k=>!oracle[answer.id][k].includes(answer[k]));
    results.push({id:answer.id,passed:mismatches.length===0,mismatches});
  }
  return {gradingVersion,scope:'accepted-label agreement only; reasons need semantic review; not execution or device proof',passed:results.filter(r=>r.passed).length,total:results.length,results};
}
function trace(raw){
  const events=raw.split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
  let completed=0,failed=0,toolCalls=0,toolFailures=0,fileChanges=0,oracleRead=false,configurationWarnings=0,itemErrors=0;
  for(const e of events){
    if(!e||typeof e.type!=='string')throw Error('EVAL_TRACE_INVALID');
    if(e.type==='turn.completed')completed++;
    if(e.type==='turn.failed'||e.type==='error')failed++;
    if(e.type==='item.completed'&&e.item?.type==='error'){
      itemErrors++;
      if(typeof e.item.message==='string'&&e.item.message.startsWith('Codex is ignoring 1 unrecognized configuration setting.')&&e.item.message.endsWith('`computer_use.windows.always_allowed_app_ids` is ignored.'))configurationWarnings++;
      else failed++;
    }
    if(e.type==='item.completed'&&e.item?.type==='file_change')fileChanges++;
    if(e.type==='item.completed'&&['command_execution','mcp_tool_call','web_search'].includes(e.item?.type)){
      toolCalls++;
      if(e.item.status==='failed'||e.item.error||e.item.type==='command_execution'&&e.item.exit_code!==undefined&&e.item.exit_code!==0)toolFailures++;
      if(typeof e.item.command==='string'&&/oracle\.json|grade\.cjs/.test(e.item.command))oracleRead=true;
    }
  }
  return {completedTurns:completed,failures:failed,toolCalls,toolFailures,fileChanges,oracleRead,itemErrors,configurationWarnings,comparisonEligible:completed===1&&failed===0&&toolFailures===0&&fileChanges===0&&!oracleRead};
}
if(require.main===module){
  try{
    const file=process.argv[2];if(!file||fs.statSync(file).size>262144)throw Error('EVAL_RESPONSE_INVALID');
    console.log(JSON.stringify(grade(JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')),process.argv[3]),null,2));
  }catch{console.error('EVAL_RESPONSE_INVALID: review the retained response; no result certified.');process.exitCode=1}
}
module.exports={grade,trace};
