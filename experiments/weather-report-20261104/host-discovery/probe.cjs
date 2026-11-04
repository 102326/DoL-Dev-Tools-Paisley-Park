// Optional host verification only: no thread/start, turn/start, model call or global Skill install.
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const readline=require('node:readline');
const assert=require('node:assert/strict');
const {spawn,spawnSync}=require('node:child_process');
const crypto=require('node:crypto');
const codex=process.env.PAISLEY_CODEX_BIN||'codex';
const archive=process.argv[2];
if(!archive||!fs.statSync(archive).isFile())throw Error('Provide reviewed local package ZIP');
const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'paisley-host-')));
const children=new Set();
const expectedName='dol-dev-tools-paisley-park';
let tools,project,skillFile;
const sentMethods=[],hostExits=[];
function run(exe,args,cwd){const r=spawnSync(exe,args,{cwd,encoding:'utf8',timeout:20000,maxBuffer:2*1024*1024});if(r.status!==0)throw Error('HOST_SETUP_FAILED');return r.stdout;}
function start(){
 const child=spawn(codex,['app-server','--listen','stdio://','-c','analytics.enabled=false'],{cwd:project,stdio:['pipe','pipe','pipe']});
 children.add(child);
 const closed=new Promise(resolve=>child.once('close',(code,signal)=>{children.delete(child);const exit={code,signal};hostExits.push(exit);resolve(exit)}));
 let id=0,bytes=0,failed=false,stderrBytes=0;const pending=new Map();
 child.stderr.on('data',chunk=>{if(process.env.PAISLEY_HOST_LOG&&stderrBytes<65536)fs.appendFileSync(process.env.PAISLEY_HOST_LOG,chunk,{mode:0o600});stderrBytes+=chunk.length;if(stderrBytes>65536)child.kill('SIGTERM')});
 const lines=readline.createInterface({input:child.stdout});
 function stop(){failed=true;for(const waiter of pending.values()){clearTimeout(waiter.timer);waiter.reject(Error('HOST_CLOSED'))}pending.clear()}
 child.on('error',stop);child.on('close',stop);child.stdin.on('error',stop);
 lines.on('line',line=>{
  bytes+=Buffer.byteLength(line);if(bytes>4*1024*1024||line.length>2*1024*1024){stop();child.kill('SIGTERM');return}
  let msg;try{msg=JSON.parse(line)}catch{stop();child.kill('SIGTERM');return}
  if(msg.id!==undefined&&pending.has(msg.id)){
   const waiter=pending.get(msg.id);pending.delete(msg.id);clearTimeout(waiter.timer);
   if(msg.error)waiter.reject(Error('HOST_PROTOCOL_ERROR'));else waiter.resolve(msg.result);
  }
 });
 return {
  async rpc(method,params){
   if(failed)throw Error('HOST_CLOSED');sentMethods.push(method);const current=++id;
   return new Promise((resolve,reject)=>{const timer=setTimeout(()=>{pending.delete(current);reject(Error('HOST_TIMEOUT'))},15000);pending.set(current,{resolve,reject,timer});child.stdin.write(JSON.stringify({id:current,method,params})+'\n')});
  },
  notify(method){child.stdin.write(JSON.stringify({method})+'\n')},
  async close(){child.stdin.end();let timer;try{const exit=await Promise.race([closed,new Promise((_,reject)=>{timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('HOST_TERMINATION_UNCONFIRMED'))},5000)})]);if(exit.code!==0||exit.signal!==null)throw Error('HOST_SHUTDOWN_FAILED')}finally{clearTimeout(timer);lines.close()}},
 };
}
async function initialize(host){await host.rpc('initialize',{clientInfo:{name:'paisley_validation',version:'0.1.0'}});host.notify('initialized')}
function inspect(value){
 const entry=value.data?.find(x=>path.resolve(x.cwd)===project);assert(entry,'missing project');
 const matches=entry.skills.filter(x=>path.resolve(x.path)===skillFile);
 const ownErrors=entry.errors.filter(x=>path.resolve(x.path).startsWith(path.dirname(skillFile)+path.sep)||path.resolve(x.path)===skillFile);
 assert.equal(ownErrors.length,0,'installed Skill parse errors');
 return {matches,otherErrorCount:entry.errors.length-ownErrors.length};
}
(async()=>{
 run('python3',['-c','import sys,zipfile;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',path.resolve(archive),root]);
 tools=path.join(root,'Paisley');assert(fs.existsSync(path.join(tools,'package.json')));
 project=path.join(root,'project');fs.mkdirSync(project);run('git',['init','-q'],project);
 const skillDir=path.join(project,'.agents/skills',expectedName);skillFile=path.join(skillDir,'SKILL.md');
 const version=run(codex,['--version'],project).trim().split('\n').at(-1);
 const first=start();let before,after;
 try{
  await initialize(first);
  before=inspect(await first.rpc('skills/list',{cwds:[project],forceReload:true}));assert.equal(before.matches.length,0);
  run(process.execPath,[path.join(tools,'scripts/dol-dev.cjs'),'install-skill','--out',skillDir],project);
  after=inspect(await first.rpc('skills/list',{cwds:[project],forceReload:true}));assert.equal(after.matches.length,1);
  assert.equal(after.matches[0].name,expectedName);assert.equal(after.matches[0].scope,'repo');assert.equal(after.matches[0].enabled,true);
 }finally{await first.close()}
 const second=start();let cold;
 try{await initialize(second);cold=inspect(await second.rpc('skills/list',{cwds:[project],forceReload:true}));assert.equal(cold.matches.length,1);assert.equal(cold.matches[0].enabled,true)}finally{await second.close()}
 const resolved=JSON.parse(run(process.execPath,[path.join(path.dirname(skillFile),'scripts/resolve.cjs')],project));
 assert.equal(path.resolve(resolved.root),tools);
 console.log(JSON.stringify({codexVersion:version,archiveSha256:crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),beforeProjectMatch:0,afterForceReloadMatch:1,afterProcessRestartMatch:1,scope:after.matches[0].scope,enabled:true,interfaceDisplayName:after.matches[0].interface?.displayName??null,resolvedToolsMatchesPackage:true,globalSkillInstallRequested:false,modelTurnsStarted:sentMethods.filter(m=>m==='turn/start').length,requestMethods:[...new Set(sentMethods)],hostExits,unrelatedSkillErrors:after.otherErrorCount,scopeLimit:'separate Codex app-server processes; no live Desktop session reload'},null,2));
})().catch(error=>{if(process.env.PAISLEY_HOST_LOG)fs.appendFileSync(process.env.PAISLEY_HOST_LOG,String(error.stack||error),{mode:0o600});console.error('HOST_DISCOVERY_FAILED: inspect local protocol/environment; raw metadata omitted.');process.exitCode=1}).finally(()=>{
 if(children.size){for(const child of children)child.kill('SIGKILL');console.error('Host close unconfirmed; owned fixture directory retained.');process.exitCode=1}
 else fs.rmSync(root,{recursive:true,force:true});
});
