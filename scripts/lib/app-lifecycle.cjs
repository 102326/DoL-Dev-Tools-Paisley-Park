const {createHash}=require('node:crypto');
const {records}=require('./process-memory.cjs');
const hash=s=>createHash('sha256').update(s).digest('hex');
// Public ApplicationExitInfo constants; unknown future codes retain their numeric value.
const reasons=['UNKNOWN','EXIT_SELF','SIGNALED','LOW_MEMORY','CRASH','CRASH_NATIVE','ANR','INITIALIZATION_FAILURE','PERMISSION_CHANGE','EXCESSIVE_RESOURCE_USAGE','USER_REQUESTED','USER_STOPPED','DEPENDENCY_DIED','OTHER','FREEZER','PACKAGE_STATE_CHANGE','PACKAGE_UPDATED','MEMORY_LIMITER','ANOMALY'];
const integer=(n,min=0,max=2147483647)=>Number.isSafeInteger(n)&&n>=min&&n<=max;
function localTime(s){
 if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/.test(s))return false;
 const parsed=new Date(s.replace(' ','T')+'Z');return Number.isFinite(parsed.getTime())&&parsed.toISOString().slice(0,-1).replace('T',' ')===s;
}
function history(text,pkg,userId,packageUid){
 if(typeof pkg!=='string'||!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$/.test(pkg)||!integer(userId,0,99999)||!integer(packageUid))throw Error('Exit target unavailable');
 if(typeof text!=='string'||Buffer.byteLength(text)>1024*1024||!/^ACTIVITY MANAGER PROCESS EXIT INFO \(dumpsys activity exit-info\)\s*$/m.test(text))throw Error('Exit history format unavailable');
 const packages=[...text.matchAll(/^\s*package:\s*(\S+)\s*$/gm)];
 if(packages.length>1||packages.some(m=>m[1]!==pkg))throw Error('Exit package identity changed');
 const headers=[...text.matchAll(/^\s*ApplicationExitInfo #(\d+):\s*$/gm)];
 if(headers.length>1000||headers.length&&!packages.length)throw Error('Exit inventory unavailable');
 const entries=[],seen=new Set();let excluded=0;
 for(let i=0;i<headers.length;i++){
  const block=text.slice(headers[i].index,headers[i+1]?.index??text.length);
  const identity=block.match(/^\s*timestamp=([^\r\n]{23}) pid=(\d+) realUid=(\d+) packageUid=(\d+) definingUid=(\d+) user=(\d+)\s*$/m);
  const reason=block.match(/^\s*process=([A-Za-z0-9._:$-]{1,256}) reason=(\d+) \([^\r\n]*\) (?:subreason=\d+ \([^\r\n]*\) )?status=(-?\d+)\s*$/m);
  if(!identity||!reason||!localTime(identity[1]))throw Error('Exit entry format unavailable');
  const [pid,realUid,uid,definingUid,user]=identity.slice(2).map(Number),code=Number(reason[2]),status=Number(reason[3]);
  if(!integer(pid,1)||![realUid,uid,definingUid,user].every(n=>integer(n))||!integer(code,0,65535)||!integer(status,-2147483648))throw Error('Exit numeric metadata invalid');
  if(user!==userId){excluded++;continue}
  if(uid!==packageUid||reason[1]===pkg&&realUid!==uid)throw Error('Exit UID identity changed');
  const entry={deviceLocalTimestamp:identity[1],pid,realUid,packageUid:uid,userId:user,reasonCode:code,reason:reasons[code]??'UNRECOGNIZED',status,
   processNameHash:hash(reason[1]),role:reason[1]===pkg?'main':'associated; purpose unknown'};
  entry.exitId=hash(JSON.stringify(entry));if(seen.has(entry.exitId))throw Error('Duplicate exit identity');seen.add(entry.exitId);entries.push(entry);
 }
 return {status:'available',entries:entries.slice(0,32),totalReported:entries.length,otherUserExcluded:excluded,truncated:entries.length>32,
  limits:'system-retained history only; absence is not proof of no crash; local timestamps have no UTC offset; order is reported order'};
}
async function collect(ctx){
 const data={schemaVersion:1,source:'Android lifecycle',package:ctx.options.package,userId:null,packageUid:null,bootIdHash:null,mainPid:null,
  exitHistory:{status:'unsupported',entries:[],totalReported:null,otherUserExcluded:null,truncated:false},incomplete:true,
  limits:'PID observations do not prove process generation, Activity or WebView recreation; history is not an incident verdict',privacy:'no descriptions, traces, state bytes, raw process names or system dump retained'};
 const controller=new AbortController(),deadline=Date.now()+60000,timer=setTimeout(()=>controller.abort(),60000);
 const adb=async(...args)=>{
  if(controller.signal.aborted||Date.now()>=deadline)throw Error('Lifecycle deadline');
  const result=ctx.adb.execute?await ctx.adb.execute(args,{timeout:Math.min(10000,Math.max(1,deadline-Date.now())),signal:controller.signal}):await ctx.adb(...args);
  if(controller.signal.aborted||Date.now()>=deadline)throw Error('Lifecycle deadline');return result;
 };
 try{
  const user=(await adb('shell','am','get-current-user')).toString().trim();if(!/^\d{1,5}$/.test(user))throw Error('User unavailable');data.userId=Number(user);
  const uid=async()=>{
   const text=(await adb('shell','cmd','package','list','packages','-U','--user',user,ctx.options.package)).toString();
   const matches=[...text.matchAll(/^package:(\S+) uid:(\d+)\s*$/gm)].filter(m=>m[1]===ctx.options.package);
   if(matches.length!==1||!integer(Number(matches[0][2])))throw Error('Package UID unavailable');return Number(matches[0][2]);
  };
  data.packageUid=await uid();
  const main=async()=>{
   if((await adb('shell','pidof',ctx.options.package)).toString().trim()!==ctx.appPid)throw Error('App PID changed');
   const chosen=records((await adb('shell','dumpsys','activity','processes')).toString(),ctx.options.package).filter(p=>p.pid===ctx.appPid&&p.mainNameMatches&&p.userId===data.userId&&p.uid===data.packageUid&&p.hostingUid===data.packageUid&&!p.isolated);
   if(chosen.length!==1)throw Error('Main process user/UID unverified');
  };
  if(ctx.appPid){await main();data.mainPid=ctx.appPid}
  const boot=(await adb('shell','cat','/proc/sys/kernel/random/boot_id')).toString().trim();if(!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(boot))throw Error('Boot identity unavailable');data.bootIdHash=hash(boot.toLowerCase());
  data.exitHistory=history((await adb('shell','dumpsys','activity','exit-info',ctx.options.package)).toString(),ctx.options.package,data.userId,data.packageUid);
  if((await adb('shell','am','get-current-user')).toString().trim()!==user||await uid()!==data.packageUid||(await adb('shell','cat','/proc/sys/kernel/random/boot_id')).toString().trim().toLowerCase()!==boot.toLowerCase())throw Error('Target identity changed');
  if(ctx.appPid)await main();
  data.incomplete=data.exitHistory.truncated;
 }catch{data.mainPid=null;data.collectorStatus='failed';data.reason='lifecycle-identity-or-format-unavailable'}
 finally{clearTimeout(timer);controller.abort()}
 if(data.incomplete&&!data.collectorStatus)data.collectorStatus='failed';return data;
}
function contract(value){
 const d=value?.data??value,h=d?.exitHistory;
 if(!d||d.schemaVersion!==1||d.source!=='Android lifecycle'||typeof d.package!=='string'||!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+$/.test(d.package)||!integer(d.userId,0,99999)||!integer(d.packageUid)||!/^[a-f0-9]{64}$/.test(d.bootIdHash??'')||!(d.mainPid===null||typeof d.mainPid==='string'&&/^\d{1,10}$/.test(d.mainPid)&&integer(Number(d.mainPid),1))||typeof d.incomplete!=='boolean'||!h||h.status!=='available'||typeof h.truncated!=='boolean'||!integer(h.totalReported)||!integer(h.otherUserExcluded)||!Array.isArray(h.entries)||h.entries.length>32||h.totalReported<h.entries.length)throw Error('Invalid lifecycle snapshot');
 if(h.truncated!==(h.totalReported>32)||h.entries.length!==Math.min(h.totalReported,32))throw Error('Invalid lifecycle coverage');
 const seen=new Set(),entries=h.entries.map(e=>{
  if(!e||!localTime(e.deviceLocalTimestamp)||!integer(e.pid,1)||!integer(e.realUid)||e.packageUid!==d.packageUid||e.userId!==d.userId||!integer(e.reasonCode,0,65535)||e.reason!==(reasons[e.reasonCode]??'UNRECOGNIZED')||!integer(e.status,-2147483648)||!['main','associated; purpose unknown'].includes(e.role)||!/^[a-f0-9]{64}$/.test(e.processNameHash??''))throw Error('Invalid lifecycle entry');
  if(e.role==='main'?(e.realUid!==d.packageUid||e.processNameHash!==hash(d.package)):e.processNameHash===hash(d.package))throw Error('Invalid main exit identity');
  const entry={deviceLocalTimestamp:e.deviceLocalTimestamp,pid:e.pid,realUid:e.realUid,packageUid:e.packageUid,userId:e.userId,reasonCode:e.reasonCode,reason:e.reason,status:e.status,processNameHash:e.processNameHash,role:e.role};
  const id=hash(JSON.stringify(entry));if(e.exitId!==id||seen.has(id))throw Error('Invalid exit association');seen.add(id);return {...entry,exitId:id};
 });
 return {package:d.package,userId:d.userId,packageUid:d.packageUid,bootIdHash:d.bootIdHash,mainPid:d.mainPid,entries,incomplete:d.incomplete||h.truncated||!!d.collectorStatus};
}
function diff(before,after){
 const a=contract(before),b=contract(after);
 const sameTarget=a.package===b.package&&a.userId===b.userId&&a.packageUid===b.packageUid&&a.bootIdHash===b.bootIdHash;
 const old=new Set(a.entries.map(e=>e.exitId)),current=new Set(b.entries.map(e=>e.exitId));
 return {schemaVersion:1,source:'Android lifecycle comparison',incomplete:!sameTarget||a.incomplete||b.incomplete,
  targetComparable:sameTarget,pidChanged:sameTarget&&a.mainPid!==null&&b.mainPid!==null?a.mainPid!==b.mainPid:null,
  newlyReportedExits:sameTarget?b.entries.filter(e=>!old.has(e.exitId)).map(e=>({exitId:e.exitId,role:e.role,reasonCode:e.reasonCode,reason:e.reason})):[],
  noLongerReportedCount:sameTarget?a.entries.filter(e=>!current.has(e.exitId)).length:null,
  limits:'newly reported is not necessarily newly occurred; retention loss is not deletion; PID change does not prove cause or native instance recreation'};
}
module.exports={history,collect,contract,diff};
