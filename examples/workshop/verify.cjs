// Explicit integration check; npm test does not launch a browser or edit a project.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),{promisify}=require('node:util'),{execFile,spawn}=require('node:child_process'),{randomUUID,createHash}=require('node:crypto');
const {connect,targets}=require('../../scripts/lib/cdp.cjs'),dom=require('../../scripts/lib/dom.cjs'),css=require('../../scripts/lib/css.cjs'),inspectors=require('../../scripts/lib/inspectors.cjs'),{redact}=require('../../scripts/lib/privacy.cjs'),{compare,report:issueReport}=require('../../scripts/lib/evidence-tools.cjs');
const execute=promisify(execFile),sha=v=>createHash('sha256').update(v).digest('hex'),pause=ms=>new Promise(r=>setTimeout(r,ms));
const out=process.argv[2]&&path.resolve(process.argv[2]),browserFile=process.env.DOL_WORKSHOP_BROWSER||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
let server,browser,client,record;
async function main(){
 if(!out||!fs.statSync(browserFile).isFile())throw Error('New output and existing Chromium browser required');
 fs.mkdirSync(out);const project=path.join(out,'project');fs.mkdirSync(project);
 for(const file of ['index.html','build.cjs','deploy.cjs'])fs.copyFileSync(path.join(__dirname,file),path.join(project,file));
 record={schemaVersion:1,source:'Controlled Workshop verification',incidentId:randomUUID(),captureStart:new Date().toISOString(),status:'failed',target:'owned localhost browser fixture',androidAppDeployment:'not performed',phases:[]};
 const save=()=>fs.writeFileSync(path.join(out,'workshop.json'),JSON.stringify(record,null,2));save();
 async function buildDeploy(label){
  const phase={label,startedAt:new Date().toISOString(),sourceSha256:sha(fs.readFileSync(path.join(project,'index.html'))),status:'unknown'};record.phases.push(phase);save();
  await execute(process.execPath,['build.cjs'],{cwd:project,timeout:10000,maxBuffer:65536,windowsHide:true});phase.buildSha256=sha(fs.readFileSync(path.join(project,'dist/index.html')));
  await execute(process.execPath,['deploy.cjs'],{cwd:project,timeout:10000,maxBuffer:65536,windowsHide:true});phase.deployedSha256=sha(fs.readFileSync(path.join(project,'deployed/index.html')));
  if(phase.sourceSha256!==phase.buildSha256||phase.buildSha256!==phase.deployedSha256)throw Error('Fixture provenance mismatch');phase.status='complete';phase.endedAt=new Date().toISOString();save();
 }
 await buildDeploy('baseline');
 server=http.createServer((req,res)=>{if(req.url!=='/'){res.statusCode=404;res.end();return}res.setHeader('Content-Type','text/html; charset=utf-8');res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(path.join(project,'deployed/index.html')))});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve)});
 const profile=path.join(out,'browser-profile');fs.mkdirSync(profile);
 browser=spawn(browserFile,['--headless=new','--no-first-run','--disable-extensions','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=0','--user-data-dir='+profile,'http://127.0.0.1:'+server.address().port],{windowsHide:true,stdio:'ignore'});
 let spawnError=false;browser.on('error',()=>{spawnError=true});const active=path.join(profile,'DevToolsActivePort');
 for(let i=0;i<100&&!fs.existsSync(active)&&!spawnError;i++)await pause(100);
 if(spawnError||!fs.existsSync(active))throw Error('Owned browser startup unavailable');
 const port=fs.readFileSync(active,'utf8').split('\n')[0];if(!/^\d+$/.test(port))throw Error('Invalid browser port');const endpoint='http://127.0.0.1:'+port;
 // Only the owned fixture target is eligible; startup observation may wait, actions are never retried.
 let page;for(let i=0;i<50;i++){page=(await targets(endpoint)).filter(p=>p.type==='page'&&p.title==='DoL Dev Tools: Paisley Park Workshop Fixture');if(page.length===1)break;await pause(100)}
 if(page?.length!==1)throw Error('Fixture page unavailable');client=await connect(endpoint,5000,()=>{},page[0].id);
 async function capture(label){
  const dir=path.join(out,label);fs.mkdirSync(dir);const m={schemaVersion:1,incidentId:randomUUID(),toolVersion:require('../../package.json').version,profile:'evidence',captureStart:new Date().toISOString(),status:'failed',steps:[],integrations:[],privacy:{requiresManualReview:true,content:'owned fixture only'},appAssociation:'controlled browser fixture; no Android App'};
  const put=async(name,collect)=>{const step={name,source:'Controlled fixture '+name,required:true,status:'failed',captureStart:new Date().toISOString()};m.steps.push(step);try{const data=await collect(),body=JSON.stringify({schemaVersion:1,incidentId:m.incidentId,source:step.source,capturedAt:new Date().toISOString(),data:redact(data)},null,2),filename=name+'.json';fs.writeFileSync(path.join(dir,filename),body,{flag:'wx'});step.status='completed';step.artifact={filename,sha256:sha(body)};return data}finally{step.captureEnd=new Date().toISOString()}};
  try{
   const scopeHash=sha('#fixture');
   await put('dom-contract',async()=>({...dom.contract(await client.evaluate(dom.expression('#fixture'))),scopeHash}));const style=await put('css-contract',async()=>({...css.contract(await client.evaluate(css.expression('#fixture'))),scopeHash}));await put('hitboxes',()=>client.evaluate(inspectors.expression('hitboxes','#fixture')));
   const imageStep={name:'screenshot',source:'Controlled fixture screenshot',required:true,status:'failed',captureStart:new Date().toISOString()};m.steps.push(imageStep);
   const image=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false}),png=Buffer.from(image.data,'base64');if(png.length>8*1024*1024||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))throw Error('Fixture screenshot unavailable');
   fs.writeFileSync(path.join(dir,'screenshot.png'),png,{flag:'wx'});imageStep.status='completed';imageStep.captureEnd=new Date().toISOString();imageStep.artifact={filename:'screenshot.png',sha256:sha(png),requiresPrivacyReview:true};
   const button=style.nodes.filter(n=>n.tag==='button');if(button.length!==1)throw Error('Fixture button not unique');m.status='complete';return {incidentId:m.incidentId,width:button[0].rect.width,height:button[0].rect.height};
  }finally{if(m.status==='failed'&&m.steps.some(s=>s.status==='completed'))m.status='partial';m.captureEnd=new Date().toISOString();fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify(m,null,2),{flag:'wx'})}
 }
 record.before=await capture('before');save();if(record.before.width!==20||record.before.height!==20)throw Error('Baseline fixture mismatch');
 const sourceFile=path.join(project,'index.html'),source=fs.readFileSync(sourceFile,'utf8');if(!source.includes('width:20px; height:20px;'))throw Error('Expected implicated source unavailable');
 fs.writeFileSync(sourceFile,source.replace('width:20px; height:20px;','width:48px; height:48px;'));
 await buildDeploy('scoped-fix');await client.send('Page.reload',{ignoreCache:true});
 let ready=false;for(let i=0;i<50;i++){try{ready=await client.evaluate('(()=>{const n=document.querySelector("#fixture button");return !!n&&n.getBoundingClientRect().width===48})()');if(ready)break}catch{}await pause(100)}if(!ready)throw Error('Reload verification unavailable');
 record.after=await capture('after');save();if(record.after.width!==48||record.after.height!==48)throw Error('Fixed fixture mismatch');
 const comparison=compare(path.join(out,'before'),path.join(out,'after'),path.join(out,'comparison'));if(comparison.status!=='complete'||!comparison.comparisons.some(c=>c.step==='css-contract'&&c.changes?.length))throw Error('Evidence comparison missing');
 issueReport(path.join(out,'after'),path.join(out,'issue'));record.status='complete';record.captureEnd=new Date().toISOString();save();console.log('Workshop complete: source/build/deploy SHA matched; fixture 20x20 -> 48x48; before/after evidence preserved.');
}
main().catch(()=>{if(record){record.status=record.before?'partial':'failed';record.reason='workshop-verification-failed; no automatic retry';record.captureEnd=new Date().toISOString();fs.writeFileSync(path.join(out,'workshop.json'),JSON.stringify(record,null,2))}console.error('Workshop verification failed; inspect retained local evidence.');process.exitCode=1}).finally(async()=>{await client?.send('Browser.close').catch(()=>{});client?.close();browser?.kill();server?.close()});
