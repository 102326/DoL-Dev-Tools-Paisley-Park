const {createHash}=require('node:crypto'),{memory}=require('./performance.cjs');
const hash=s=>createHash('sha256').update(s).digest('hex');
function records(text,packageName){
 if(typeof text!=='string'||Buffer.byteLength(text)>2*1024*1024)throw Error('Process records unavailable');
 const headers=[...text.matchAll(/^\s*\*APP\* UID (\d{1,9}) ProcessRecord\{[^\r\n}]* (\d{1,8}):([^/\r\n]{1,256})\/[^\r\n}]*\}/gm)];
 if(!headers.length||headers.length>2000)throw Error('Process records unavailable');
 const result=[],seen=new Set();
 for(let i=0;i<headers.length;i++){
  const h=headers[i],block=text.slice(h.index,headers[i+1]?.index??text.length),list=block.match(/^\s*packageList=\{([^}\r\n]{0,4096})\}/m);
  if(!list||!list[1].split(',').map(s=>s.trim()).includes(packageName))continue;
  const pid=h[2],uid=Number(h[1]),user=block.match(/^\s*user #(\d{1,5}) uid=(\d{1,9})(?: ISOLATED uid=(\d{1,9}))?\b/m);if(!Number(pid)||seen.has(pid)||!user||Number(user[3]??user[2])!==uid)throw Error('Process identity ambiguous');seen.add(pid);
  result.push({pid,uid,hostingUid:Number(user[2]),isolated:user[3]!==undefined,userId:Number(user[1]),nameHash:hash(h[3]),rawName:h[3],association:'exact ActivityManager packageList membership',mainNameMatches:h[3]===packageName});
 }
 return result;
}
async function collect(ctx){
 const result={schemaVersion:1,source:'Associated process memory',processes:[],truncated:false,rendererRole:'not inferred; package membership is not JS renderer ownership',identityBasis:'ActivityManager before/after and meminfo PID/name; process generation not proven',sampleOrder:'sequential; memory values are not simultaneous'};
 const controller=new AbortController(),deadline=Date.now()+60000,timer=setTimeout(()=>controller.abort(),60000);
 const adb=async(...args)=>{if(controller.signal.aborted||Date.now()>=deadline)throw Error('Deadline');const raw=ctx.adb.execute?await ctx.adb.execute(args,{timeout:Math.min(10000,Math.max(1,deadline-Date.now())),signal:controller.signal}):await ctx.adb(...args);if(controller.signal.aborted||Date.now()>=deadline)throw Error('Deadline');return raw.toString()};
 try{
  if((await adb('shell','pidof',ctx.options.package)).trim()!==ctx.appPid)throw Error('App process changed');
  const reported=records(await adb('shell','dumpsys','activity','processes'),ctx.options.package),main=reported.find(p=>p.pid===ctx.appPid&&p.mainNameMatches);
  if(!main)throw Error('Verified main process missing');
  const before=reported.filter(p=>p.userId===main.userId);result.selectedUserId=main.userId;result.otherUserAssociatedExcluded=reported.length-before.length;
  result.totalAssociatedReported=before.length;result.truncated=before.length>8;
  const chosen=before.filter(p=>p.pid===ctx.appPid).concat(before.filter(p=>p.pid!==ctx.appPid)).slice(0,8);
  for(const process of chosen){
   const {rawName,...safe}=process,entry={...safe,role:process.pid===ctx.appPid?'verified App PID':'associated process; purpose unverified',capturedAt:new Date().toISOString(),status:'unsupported'};result.processes.push(entry);
   try{const raw=await adb('shell','dumpsys','meminfo',process.pid);if(Buffer.byteLength(raw)>2*1024*1024)throw Error('Meminfo too large');const header=raw.match(/\*\* MEMINFO in pid (\d+) \[([^\]\r\n]+)\] \*\*/);if(!header||header[1]!==process.pid||header[2]!==rawName)throw Error('Meminfo identity changed');entry.memory=memory(raw);entry.status='observed'}catch{if(controller.signal.aborted||Date.now()>=deadline)throw Error('Deadline')}
  }
  const after=records(await adb('shell','dumpsys','activity','processes'),ctx.options.package),mainUnchanged=(await adb('shell','pidof',ctx.options.package)).trim()===ctx.appPid;
  for(const entry of result.processes){const current=after.find(p=>p.pid===entry.pid);if(!mainUnchanged||!current||current.nameHash!==entry.nameHash||current.uid!==entry.uid||current.userId!==entry.userId||current.hostingUid!==entry.hostingUid||current.isolated!==entry.isolated){entry.status='unknown';delete entry.memory;entry.reason='identity-or-association-changed'}else if(entry.status==='observed')entry.status='available'}
  if(result.truncated||result.processes.some(p=>p.status!=='available')){result.collectorStatus='failed';result.reason='associated-process-sampling-incomplete'}
 }catch{
  for(const entry of result.processes){if(entry.status==='observed'){entry.status='unknown';delete entry.memory}}
  result.collectorStatus='failed';result.reason='associated-process-sampling-stopped; identity, format or deadline unavailable';
 }finally{clearTimeout(timer);controller.abort()}
 result.captureEnd=new Date().toISOString();return result;
}
module.exports={records,collect};
