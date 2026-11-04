'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const history=path.resolve(process.argv[2]||''),out=path.resolve(process.argv[3]||'');
const executable=process.env.DOL_TUSK_CHROME,origin=process.env.ACT4_LAB_ORIGIN||'http://127.0.0.1:18764';
const {launch}=require(history+'/scripts/lib/chrome-launch.cjs'),{ChromeHost}=require(history+'/scripts/lib/chrome-host.cjs'),{connect}=require(history+'/scripts/lib/cdp.cjs');
const {bindOwned}=require('./bind-owned.cjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
let record,admin,host,created=false;const clients=[],report={format:'act4-pc-lab-v1',status:'running',startedAt:new Date().toISOString(),node:process.version,platform:process.platform,historyCommit:require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:history,encoding:'utf8'}).trim(),checks:[]};
function save(){fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2))}
function check(name,details={}){report.checks.push({name,status:'passed',...details});save()}
async function read(h=host){const s=await h.evaluate('window.act4Lab.read()'),dom=await h.evaluate(`({scene:document.querySelector('#scene').textContent,count:Number(document.querySelector('#count').textContent)})`);assert.deepEqual(dom,{scene:s.state.scene,count:s.state.count});return s}
async function click(selector,h=host){return h.evaluate(`document.querySelector(${JSON.stringify(selector)}).click()`)}
async function until(fn){for(let n=0;n<80;n++){try{const v=await fn();if(v)return v}catch{}await pause(50)}throw Error('Expected fixture state unavailable')}
async function main(){
 if(!executable||!process.argv[2]||!process.argv[3])throw Error('history root, new output, installed DOL_TUSK_CHROME required');fs.mkdirSync(out,{recursive:false});created=true;
 report.fixtureSha256=crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'fixture.html'))).digest('hex');save();
 const url=origin+'/?case=act4';
 const launched=await launch({executable,url,out:path.join(out,'owned-browser')});record=JSON.parse(fs.readFileSync(launched.hostFile));report.chrome=record.browserVersion;save();
 host=await new ChromeHost(record.target).open();clients.push(host);admin=await connect(record.target.endpoint,5000,()=>{},record.target.targetId);clients.push(admin);
 await click('#workshop');await click('#add');await click('#save');await click('#reset');assert.equal((await read()).state.count,0);await click('#load');assert.deepEqual((await read()).state,{scene:'workshop',count:1,revision:2});
 check('original host: same flow as Codex UI, DOM and state agree',{final:{scene:'workshop',count:1,revision:2}});
 const decoy=(await admin.send('Target.createTarget',{url:origin+'/?case=decoy'})).targetId;
 const decoyAdmin=await connect(record.target.endpoint,5000,()=>{},decoy);clients.push(decoyAdmin);await until(()=>decoyAdmin.evaluate('Boolean(window.act4Lab)'));
 await click('#add');assert.equal((await read()).state.count,2);assert.equal((await decoyAdmin.evaluate('window.act4Lab.read()')).state.count,0);
 check('original host: exact existing target among same-title tabs',{selected:record.target.targetId,decoy});
 host.close();await assert.rejects(host.evaluate('window.act4Lab.read()'),/disconnected/);await host.open();assert.equal((await read()).state.count,2);check('original host: explicit reconnect to unchanged document');
 await assert.rejects(launch({executable,url:'file:///neutral-fixture.html',out:path.join(out,'rejected-file')}),/loopback fixture URL/);
 await assert.rejects(launch({executable,url:'https://example.invalid',out:path.join(out,'rejected-https')}),/loopback fixture URL/);check('original launcher: file and HTTPS rejected before Chrome starts',{restriction:'application contract; not browser policy verdict'});
 const oldDoc=host.binding,oldFixtureDoc=(await read()).documentId;await admin.send('Page.reload');await until(async()=>{const s=await admin.evaluate('window.act4Lab.read()');return s.documentId&&s.documentId!==oldFixtureDoc&&s.state.count===0});
 await assert.rejects(host.evaluate('window.act4Lab.read()'),/document changed/);host.close();await assert.rejects(host.open(),/document changed/);check('original host: same-URL reload refuses stale binding',{oldLoader:oldDoc.loaderId});
 // Only now exercise the new explicit-binding helper. Original files stay intact.
 ({host}=await bindOwned(history,record,{targetId:record.target.targetId,url}));clients.push(host);await click('#load');assert.equal((await read()).state.count,1);check('prototype: explicit fresh binding plus reviewed saved-state read after reload');
 const cliHost=path.join(out,'explicit-host.json'),bindArgs=[path.join(__dirname,'bind-owned.cjs'),history,launched.hostFile,record.target.targetId,url,cliHost],exec=require('node:child_process').execFileSync;
 exec(process.execPath,bindArgs,{stdio:'pipe',timeout:15000});const savedHost=fs.readFileSync(cliHost);require(history+'/scripts/lib/host-options.cjs').cli({host:'chrome','host-file':cliHost});
 assert.throws(()=>exec(process.execPath,bindArgs,{stdio:'pipe',timeout:15000}));assert.deepEqual(fs.readFileSync(cliHost),savedHost);check('prototype CLI: exclusive fresh host record accepted by original formal host parser');
 const duplicate=(await admin.send('Target.createTarget',{url})).targetId;
 await assert.rejects(bindOwned(history,record,{url}),/unique target/);
 const selected=await bindOwned(history,record,{targetId:record.target.targetId,url});selected.host.close();
 check('prototype: duplicate exact URLs refuse guessing; explicit target ID succeeds',{duplicate});
 const newTab=await bindOwned(history,record,{targetId:decoy,url:origin+'/?case=decoy'});clients.push(newTab.host);await click('#workshop',newTab.host);await click('#add',newTab.host);assert.equal((await read(newTab.host)).state.count,1);assert.equal((await read()).state.count,1);check('prototype: attach pre-existing tab with separate test-data key');
 const newUrl=origin+'/?case=act4&page=other';await admin.send('Page.navigate',{url:newUrl});await until(()=>admin.evaluate('location.href==='+JSON.stringify(newUrl)+'&&Boolean(window.act4Lab)'));
 await assert.rejects(host.evaluate('window.act4Lab.read()'),/document changed/);host.close();
 ({host}=await bindOwned(history,record,{targetId:record.target.targetId,url:newUrl}));clients.push(host);await click('#load');assert.equal((await read()).state.count,1);check('prototype: navigation requires explicit URL and fresh document binding');
 await assert.rejects(bindOwned(history,record,{targetId:record.target.targetId,url}),/unique target/);check('prototype: stale requested URL refuses binding');
 host.close();await assert.rejects(click('#add'),/disconnected/);await host.open();assert.equal((await read()).state.count,1);check('interruption before dispatch: disconnected host causes zero effect');
 const attempt=crypto.randomUUID();await host.evaluate(`document.querySelector('#add').dataset.attempt=${JSON.stringify(attempt)}`);
 const pending=host.evaluate(`(()=>{document.querySelector('#add').click();return new Promise(r=>setTimeout(()=>r('ack'),4000))})()`).then(()=>({ack:true}),e=>({error:e.message}));
 await until(async()=>{const s=await admin.evaluate('window.act4Lab.read()');return s.receipts[attempt]&&s.state.count===2});host.close();const uncertain=await pending;assert.equal(uncertain.ack,undefined);await host.open();const witnessed=await read();assert.equal(witnessed.state.count,2);assert.equal(witnessed.receipts[attempt].count,2);
 check('interruption after effect before ack: no replay; reconnect reads original terminal',{transportResult:uncertain,attempt,receipt:witnessed.receipts[attempt]});
 await click('#add');assert.equal((await read()).state.count,2);check('fixture-specific attempt ID: repeat rejected by original handler',{notGenericExactlyOnce:true});
 await host.evaluate(`delete document.querySelector('#add').dataset.attempt`);await click('#add');await click('#add');assert.equal((await read()).state.count,4);check('ordinary repeated clicks execute twice: browser transport has no business deduplication');
 await click('#save');const beforeReload=await read();await admin.send('Page.reload');await until(()=>admin.evaluate('Boolean(window.act4Lab)&&document.querySelector(\'#count\').textContent===\'0\''));await assert.rejects(host.evaluate('window.act4Lab.read()'),/document changed/);host.close();
 ({host}=await bindOwned(history,record,{targetId:record.target.targetId,url:newUrl}));clients.push(host);await click('#load');const loaded=await read();assert.equal(loaded.state.count,4);assert.deepEqual(loaded.receipts[attempt],beforeReload.receipts[attempt]);assert.notEqual(loaded.documentId,loaded.receipts[attempt].documentId);check('fixture persistence: original receipt survives saved-state reload',{notRealGameContinuity:true});
 const queuedAt=Date.now();await click('#delayed');host.close();await pause(900);await host.open();const firstRead=await read();
 const timing={firstReadAfterMs:Date.now()-queuedAt,firstCount:firstRead.state.count,visibility:await host.evaluate('document.visibilityState')};
 // A browser timer specifies a minimum delay, not a wall-clock completion SLA.
 // Read the same queued work to its terminal state; never repeat the click.
 await until(async()=>((await read()).state.count===5));timing.terminalAfterMs=Date.now()-queuedAt;
 check('disconnect does not cancel queued remote work: observe before further action',timing);
 const screenshot=await host.send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(out,'fixture.png'),Buffer.from(screenshot.data,'base64'));
 await admin.send('Target.closeTarget',{targetId:record.target.targetId});host.close();await assert.rejects(new ChromeHost(record.target).open(),/page identity changed/);
 await assert.rejects(bindOwned(history,record,{targetId:record.target.targetId,url:newUrl}),/unique target/);check('closed selected tab never adopts same-title or same-URL replacement');
 report.status='complete';
}
main().catch(e=>{report.status='failed';report.failure={message:e.message,stack:e.stack};process.exitCode=1}).finally(()=>{clients.forEach(c=>c.close());if(record)try{process.kill(record.target.processId)}catch{}report.endedAt=new Date().toISOString();if(created)save();console.log(JSON.stringify({status:report.status,checks:report.checks.length,failure:report.failure?.message,out}))});
