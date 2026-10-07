'use strict';
const fs=require('node:fs'),path=require('node:path');
const {Runtime}=require('./runtime.cjs'),{Receiver}=require('./fixture.cjs');
function read(file){if(fs.statSync(file).size>65536)throw Error('Oversized input');return JSON.parse(fs.readFileSync(file,'utf8'))}
async function main(){
  const [command,directory,id,file,crash]=process.argv.slice(2);
  if(!['start','request','propose','dispatch','observe','resume','cancel','status'].includes(command)||!directory)throw Error('Usage: cli.cjs start|request|propose|dispatch|observe|resume|cancel|status ISOLATED_DIR [SESSION_ID] [JSON_FILE] [CRASH_POINT]');
  const root=path.resolve(directory);fs.mkdirSync(root,{recursive:true});
  const runtime=new Runtime(path.join(root,'sessions.sqlite'),{leaseMs:120000}),receiver=new Receiver(path.join(root,'receiver.sqlite'));
  try{
    let result;
    if(command==='start'){
      const s=runtime.start({serial:'fixture-device',package:'com.example.fixture',userId:'0'},{mode:'gameplay',goal:{description:'Reach the fixture shop autonomously',location:'Shop'},budget:{timeoutMs:600000,maxActions:12,maxObservations:48,maxReplans:32,maxSpend:100}});
      result=runtime.observe(s.id,receiver.observe());
    }else if(command==='request')result=runtime.status(id).decision;
    else if(command==='propose')result=runtime.propose(id,read(file));
    else if(command==='dispatch'){
      const e=runtime.prepare(id);if(crash==='before-mark')process.exit(79);
      result=e?await runtime.dispatch(e.id,effect=>receiver.dispatch(effect),{fault:point=>{if(point===crash)process.exit(79)}}):runtime.status(id);
    }else if(command==='observe')result=runtime.observe(id,receiver.observe(),receiver.receipts(runtime.status(id).openEffects));
    else if(command==='resume')result=runtime.resume(id);
    else if(command==='cancel')result=runtime.stop(id);
    else result=runtime.status(id);
    console.log(JSON.stringify({experimental:true,fixtureOnly:true,result},null,2));
  }finally{receiver.close();runtime.close()}
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
