'use strict';
// Owned-browser startup adapted from the MIT ACT4 host, fixed history 52a8893.
const fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process'),{createHash}=require('node:crypto');
const {targets}=require('./cdp.cjs'),{ChromeHost}=require('./chrome-host.cjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
function fail(code){return Object.assign(Error(code),{code})}
async function launch(options){
 if(!options.out||!path.isAbsolute(options.executable||'')||!fs.statSync(options.executable).isFile()||!['visible','headless'].includes(options.mode))throw fail('PC_LAUNCH_INVALID');
 const url=new URL(options.url);if(url.protocol!=='http:'||url.hostname!=='127.0.0.1'||!url.port||url.username||url.password||url.hash)throw fail('PC_LAUNCH_INVALID');
 const output=path.resolve(options.out);fs.mkdirSync(output,{mode:0o700});
 let profile=path.join(output,'browser-profile');
 if(options.resume){
  const old=options.resume;
  if(old.resourceDigest!==options.resourceDigest||old.target.origin!==url.origin)throw fail('PC_RESUME_IDENTITY_CHANGED');
  try{process.kill(old.target.processId,0);throw fail('PC_PROFILE_IN_USE')}catch(e){if(e.code!=='ESRCH')throw e}
  let live=false;try{await targets(old.target.endpoint,500);live=true}catch{}if(live)throw fail('PC_PROFILE_IN_USE');
  profile=fs.realpathSync(old.profilePath);
 }else fs.mkdirSync(profile,{mode:0o700});
 profile=fs.realpathSync(profile);
 const logs=[];let browser,host,closed=false;
 async function stop(){if(!browser||closed)return;let timer;const end=new Promise(resolve=>browser.once('close',resolve));try{browser.kill();await Promise.race([end,new Promise(resolve=>{timer=setTimeout(resolve,5000)})]);if(!closed)throw fail('PC_STOP_UNCONFIRMED')}finally{clearTimeout(timer)}}
 try{
  for(const name of ['chrome-stdout.log','chrome-stderr.log'])logs.push(fs.openSync(path.join(output,name),'wx',0o600));
  browser=spawn(options.executable,[...(options.mode==='headless'?['--headless=new']:[]),'--enable-automation','--no-first-run','--no-default-browser-check','--disable-extensions','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,url.href],{windowsHide:options.mode==='headless',stdio:['ignore',...logs]});
  logs.forEach(fd=>fs.closeSync(fd));logs.length=0;
  let failed=false;browser.on('error',()=>{failed=true});browser.once('close',()=>{closed=true});
  fs.writeFileSync(path.join(output,'launch.json'),JSON.stringify({processId:browser.pid,profilePath:profile,executable:options.executable,resourceDigest:options.resourceDigest,scope:'Owned launch; preserve on unconfirmed termination'}),{flag:'wx',mode:0o600});
  const active=path.join(profile,'DevToolsActivePort');let endpoint,socket;
  const deadline=Date.now()+15000;
  while(Date.now()<deadline&&!failed&&!closed){
   if(fs.existsSync(active)){
    const [port,websocket]=fs.readFileSync(active,'utf8').trim().split(/\r?\n/);
    if(/^\d{1,5}$/.test(port)&&Number(port)>0&&Number(port)<=65535&&websocket?.startsWith('/devtools/browser/')&&websocket!=='/devtools/browser/'+options.resume?.target.browserId){endpoint='http://127.0.0.1:'+port;socket=websocket;break}
   }
   await pause(50);
  }
  if(!endpoint||failed||closed)throw fail('PC_LAUNCH_FAILED');
  let pages=[];
  while(Date.now()<deadline&&!closed){pages=(await targets(endpoint,3000)).filter(p=>p.type==='page'&&p.url===url.href);if(pages.length===1)break;await pause(50)}
  if(pages.length!==1||closed)throw fail('PC_TARGET_UNAVAILABLE');
  const target={host:'chrome',profileId:createHash('sha256').update(profile).digest('hex'),browserId:socket.slice('/devtools/browser/'.length),processId:browser.pid,endpoint,targetId:pages[0].id,origin:url.origin,profilePath:profile};
  host=await new ChromeHost(target).open();
  const record={format:'paisley-owned-chrome',version:1,executable:options.executable,profilePath:profile,mode:options.mode,createdAt:new Date().toISOString(),browserVersion:await host.verifyBrowser(),resourceDigest:options.resourceDigest,target:{...target,document:host.binding}};
  const hostFile=path.join(output,'host.json');fs.writeFileSync(hostFile,JSON.stringify(record,null,2),{flag:'wx',mode:0o600});
  return {record,hostFile,browser,stop};
 }catch(e){host?.close();await stop();throw e}finally{logs.forEach(fd=>fs.closeSync(fd));host?.close()}
}
module.exports={launch};
