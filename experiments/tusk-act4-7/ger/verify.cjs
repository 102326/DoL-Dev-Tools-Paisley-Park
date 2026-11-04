'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{spawn,execFile}=require('node:child_process'),{promisify}=require('node:util');
const root=path.resolve(process.env.PAISLEY_TOOL_ROOT||path.join(__dirname,'../../..')),cli=path.join(root,'scripts/dol-dev.cjs');
const pc=require(root+'/scripts/lib/pc-session.cjs'),{connect}=require(root+'/scripts/lib/cdp.cjs');
const runFile=promisify(execFile),pause=ms=>new Promise(r=>setTimeout(r,ms));
const [chrome,outArg]=process.argv.slice(2),out=path.resolve(outArg||'');let seq=0,child;const instances=[],clients=[];
const result={schemaVersion:1,node:process.version,platform:process.platform,scope:'Synthetic original state and production Recipe/GER; no game acceptance',checks:[]};
async function run(args,allowFailure=false){try{const r=await runFile(process.execPath,[cli,...args],{timeout:30000,maxBuffer:2*1024*1024});return JSON.parse(r.stdout)}catch(e){if(!allowFailure){fs.writeFileSync(path.join(out,'failure-stderr.log'),String(e.stderr||''));throw e}return e.stdout?.trim()?JSON.parse(e.stdout):null}}
function file(name,data){const p=path.join(out,name+'.json');fs.writeFileSync(p,JSON.stringify(data),{flag:'wx'});return p}
async function until(fn){const end=Date.now()+15000;while(Date.now()<end){try{const value=await fn();if(value)return value}catch{}await pause(50)}throw Error('Expected same-attempt fixture state unavailable')}
function check(name){result.checks.push(name)}
const args=(goal,op)=>['game-session','--goal',goal,'--operation',op,'--test-environment','yes'];
async function main(){
 if(!chrome||!outArg)throw Error('Usage: verify.cjs ABS_CHROME NEW_OUTPUT');fs.mkdirSync(out,{mode:0o700});
 const fixture=path.join(__dirname,'fixture.html'),resources=file('resources',{schemaVersion:1,resources:[{urlPath:'/fixture.js',file:path.join(__dirname,'fixture.js')}]}),store=path.join(out,'shared.sqlite');
 const recipe=path.join(out,'reviewed-recipe.cjs');fs.writeFileSync(recipe,`module.exports={schemaVersion:1,operations:[{id:'create-token',label:'Create fictional token',intent:'buy',
 read:()=>({...window.gerFixture.read(),price:Number(document.querySelector('#buy').dataset.price)}),quote:before=>before.price,
 execute:async()=>{document.querySelector('#buy').click();if(window.ackDelay)await new Promise(r=>setTimeout(r,window.ackDelay))},
 outcome:(before,after)=>({occurred:after.tokens===before.tokens+1&&after.money===before.money-before.price,spent:before.money-after.money})}]}`);
 async function setup(name,port){
  const instance=await pc.start({file:fixture,resources,chrome,port:String(port),mode:'headless',out:path.join(out,name+'-instance')});instances.push(instance);
  const r=instance.record,admin=await connect(r.target.endpoint,5000,()=>{},r.target.targetId);clients.push(admin);await until(()=>admin.evaluate('Boolean(window.gerFixture)'));
  const request=file(name+'-request',{name:'neutral-token',mode:'gameplay',goal:{kind:'project-experiment',recipe,scope:{host:'chrome',workspace:out,profileId:r.target.profileId,origin:r.target.origin,intents:['buy'],dataDomain:'chrome-origin-storage'},predicate:{kind:'native-state',conditions:[{field:'money',op:'eq',value:90}]}},budget:{timeoutMs:300000,maxActions:4,maxObservations:24,maxSpend:10}});
  const goal=path.join(out,name+'-goal');let state=await run(['game-goal-start','--host','chrome','--host-file',instance.hostFile,'--store',store,'--file',request,'--out',goal,'--test-environment','yes']);
  return {instance,r,admin,request,goal,state};
 }
 async function propose(s){const d=s.state.decision,a=d.scene.choices.find(c=>c.capability.provider==='project-experiment');assert.ok(a);const proposal=file('proposal-'+(++seq),{...Object.fromEntries(['protocol','requestId','sessionId','bindingGeneration','epoch','revision','planRevision','memoryRevision'].map(k=>[k,d[k]])),actionRef:a.ref,reason:'One reviewed synthetic purchase',plan:[],beliefs:[]});s.state=await run([...args(s.goal,'propose'),'--file',proposal])}
 const a=await setup('normal',18771);await propose(a);a.state=await run(args(a.goal,'dispatch'));assert.equal(a.state.status,'completed');assert.equal(a.state.pending,false);assert.equal(a.state.budget.spent,10);assert.equal((await a.admin.evaluate('window.gerFixture.read()')).calls,1);check('formal CLI Chrome Goal/Decision/propose/dispatch/Outcome settles one effect and real spend');
 const runtime=require(root+'/scripts/lib/game-goal.cjs').open(store);try{const s=runtime.status(a.state.goalId);assert.equal(s.target.host,'chrome');assert.equal(s.nativeIdentity,undefined);assert.equal(s.resourceGeneration,undefined)}finally{runtime.close()}check('Chrome Session uses its original document, without Android resource identity');
 const b=await setup('drift',18772);await propose(b);await b.admin.evaluate('document.querySelector("#buy").dataset.price="12"');await run(args(b.goal,'dispatch'),true);assert.equal((await b.admin.evaluate('window.gerFixture.read()')).calls,0);const rejected=await run(args(b.goal,'status'));assert.equal(rejected.pending,false);assert.equal(rejected.budget.spent,0);check('changed independent state/quote refuses before purchase without zero-effect pending');
 const {ChromeHost}=require(root+'/scripts/lib/chrome-host.cjs'),held=await new ChromeHost(b.r.target).open();
 try{
  const object=(await held.send('Runtime.evaluate',{expression:'(()=>{const marker={value:7};return function ownClosure(){return marker.value}})()',objectGroup:'ger-methods',returnByValue:false})).result.objectId;
  assert.equal((await held.send('Runtime.callFunctionOn',{objectId:object,functionDeclaration:'function(){return this()}',returnByValue:true})).result.value,7);
  const props=await held.send('Runtime.getProperties',{objectId:object,ownProperties:true});const scopes=props.internalProperties.find(p=>p.name==='[[Scopes]]').value.objectId;
  assert.ok((await held.send('Runtime.getProperties',{objectId:scopes,ownProperties:true})).result.length);
  const node=(await held.send('Runtime.evaluate',{expression:'document.querySelector("#buy")',returnByValue:false})).result.objectId;
  await held.send('DOM.scrollIntoViewIfNeeded',{objectId:node});
  for(const params of [{objectId:'unowned'},{objectId:node,executionContextId:1}])await assert.rejects(held.send('Runtime.callFunctionOn',{...params,functionDeclaration:'function(){this.click()}'}));
  await assert.rejects(held.send('DOM.scrollIntoViewIfNeeded',{nodeId:1}));
  await held.send('Runtime.releaseObjectGroup',{objectGroup:'ger-methods'});await held.send('Runtime.releaseObject',{objectId:object});
  check('bound CDP objects support closures/properties/call/scroll and owned cleanup; foreign IDs and context overrides refuse');
  const preflight=held.assertBound.bind(held);let raced=false;held.assertBound=async()=>{await preflight();if(!raced){raced=true;await b.admin.evaluate('history.pushState(null,"","#interleaved")')}};
  await assert.rejects(held.send('Runtime.callFunctionOn',{objectId:node,functionDeclaration:'function(){this.click()}',returnByValue:true}));
  assert.equal((await b.admin.evaluate('window.gerFixture.read()')).calls,0);await b.admin.evaluate('history.replaceState(null,"","/index.html")');held.assertBound=preflight;
  await assert.rejects(held.evaluate('true'));check('callFunctionOn checks URL in the same JS turn and detected URL ABA cannot revive an old holder');
 }finally{held.close()}
 async function interrupted(name,port){const s=await setup(name,port);await propose(s);await s.admin.evaluate('window.ackDelay=2000');const log=fs.openSync(path.join(out,name+'-dispatch.log'),'wx',0o600);child=spawn(process.execPath,[cli,...args(s.goal,'dispatch')],{stdio:['ignore',log,log]});fs.closeSync(log);const ended=new Promise(r=>child.once('close',r));await until(async()=>(await s.admin.evaluate('window.gerFixture.read()')).calls===1);child.kill('SIGKILL');await ended;child=null;s.state=await run(args(s.goal,'status'));assert.equal(s.state.pending,true);assert.equal(s.state.budget.reserved,10);return s}
 const c=await interrupted('lost-ack',18773);await run(args(c.goal,'dispatch'),true);assert.equal((await c.admin.evaluate('window.gerFixture.read()')).calls,1);await until(()=>c.admin.evaluate('Object.values(window.__paisleyParkGameplayReceiptsV1.records).some(r=>r.status==="terminal")'));c.state=await run(args(c.goal,'resume'));assert.equal(c.state.pending,false);assert.equal(c.state.status,'completed');assert.equal(c.state.budget.spent,10);assert.equal((await c.admin.evaluate('window.gerFixture.read()')).calls,1);check('SIGKILL after effect preserves SQLite pending; original terminal resumes without re-buy');
 const d=await interrupted('reload',18774);const old=await d.admin.evaluate('window.gerFixture.read().documentId');await d.admin.send('Page.reload');await until(async()=>{const id=await d.admin.evaluate('window.gerFixture.read().documentId');return id&&id!==old});await run(args(d.goal,'resume'),true);const pending=await run(args(d.goal,'status'));assert.equal(pending.pending,true);assert.equal((await d.admin.evaluate('window.gerFixture.read()')).calls,0);await run(args(d.goal,'cancel'));check('reload refuses old Session and keeps original unresolved effect');
 const newHost=path.join(out,'new-document.json');await pc.bind(d.instance.hostFile,d.r.target.targetId,d.instance.url,newHost);
 const fresh=await run(['game-goal-start','--host','chrome','--host-file',newHost,'--store',store,'--file',d.request,'--out',path.join(out,'new-goal'),'--test-environment','yes']);assert.equal(fresh.pending,true);assert.equal(fresh.pendingEffects.items[0].owner,'other-session');assert.equal((await d.admin.evaluate('window.gerFixture.read()')).calls,0);check('explicit new document/Session shares Profile pending fence, without replay or receipt substitution');
 const ev=path.join(out,'evidence');const text=await runFile(process.execPath,[cli,'evidence','--host','chrome','--host-file',a.instance.hostFile,'--out',ev,'--scope','#passages','--css','yes','--storage','yes','--environment','yes','--web-performance','yes','--window-ms','100'],{timeout:30000});assert.ok(text.stdout);const manifest=JSON.parse(fs.readFileSync(path.join(ev,'manifest.json')));assert.equal(manifest.status,'complete');assert.equal(manifest.target.profileId,a.r.target.profileId);assert.match(manifest.target.documentHash,/^[a-f0-9]{64}$/);check('standard Evidence CLI captures Chrome Web data with owned document identity');
 await runFile(process.execPath,[cli,'evidence-compare','--before',ev,'--after',ev,'--out',path.join(out,'compare')],{timeout:30000}).catch(e=>assert.equal(e.code,1));
 const incomplete=JSON.parse(fs.readFileSync(path.join(out,'compare/compare.json')));assert.equal(incomplete.status,'partial');check('missing loader metadata remains unknown in real Chrome Evidence Compare');
 // Explicit synthetic public loader metadata tests the complete consumer path; no game/loader source is loaded.
 await a.admin.evaluate('window.modUtils={version:"synthetic-1",getModListNameNoAlias:()=>[],getMod:()=>null}');
 const environment=path.join(out,'complete-environment');await runFile(process.execPath,[cli,'environment','--host','chrome','--host-file',a.instance.hostFile,'--out',environment,'--window-ms','0'],{timeout:30000});
 const reference=path.join(out,'reference');await runFile(process.execPath,[cli,'known-good','--from',environment,'--out',reference,'--snapshots','environment'],{timeout:30000});
 for(const [name,before,after]of [['forward',reference,environment],['reverse',environment,reference]])await runFile(process.execPath,[cli,'evidence-compare','--before',before,'--after',after,'--out',path.join(out,name)],{timeout:30000});
 check('standard Chrome environment supports Known Good and comparison in both directions with complete synthetic metadata');
 const partial=path.join(out,'unsupported');await runFile(process.execPath,[cli,'evidence','--host','chrome','--host-file',a.instance.hostFile,'--out',partial,'--lifecycle','yes','--integration','soft-and-wet','--window-ms','0'],{timeout:30000}).catch(e=>{assert.equal(e.code,1)});
 const partialManifest=JSON.parse(fs.readFileSync(path.join(partial,'manifest.json')));assert.equal(partialManifest.status,'partial');assert.ok(partialManifest.unsupported.includes('app-lifecycle'));check('standard Evidence Compare reads Chrome; Android-only and optional Integration do not fabricate support');
 result.status='passed';
}
main().catch(e=>{result.status='failed';result.failure=e.message;process.exitCode=1}).finally(async()=>{child?.kill('SIGKILL');clients.forEach(c=>c.close());for(const i of instances)try{await i.stop()}catch{result.cleanup='unconfirmed';process.exitCode=1}if(outArg&&fs.existsSync(out))fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result))});
