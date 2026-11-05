'use strict';
// Synthetic receipt records only. This driver does not execute business actions.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{randomUUID}=require('node:crypto');
const root=path.resolve(process.env.PAISLEY_TOOL_ROOT||path.join(__dirname,'../../..'));
const pc=require(root+'/scripts/lib/pc-session.cjs'),{ChromeHost}=require(root+'/scripts/lib/chrome-host.cjs'),receipts=require(root+'/scripts/lib/game-receipts.cjs');
const [chrome,outArg]=process.argv.slice(2),out=path.resolve(outArg||'');let instance,client;
const report={schemaVersion:1,node:process.version,platform:process.platform,scope:'Real Chrome synthetic page receipt protocol; no game operation or real Ledger acceptance',checks:[]};
async function main(){
 if(!chrome||!outArg)throw Error('Usage: receipt-verify.cjs ABS_CHROME NEW_OUTPUT');fs.mkdirSync(out,{mode:0o700});
 const resources=path.join(out,'resources.json');fs.writeFileSync(resources,JSON.stringify({schemaVersion:1,resources:[{urlPath:'/fixture.js',file:path.join(__dirname,'fixture.js')}]}),{flag:'wx'});
 instance=await pc.start({file:path.join(__dirname,'fixture.html'),resources,chrome,port:'18779',mode:'headless',out:path.join(out,'instance')});client=await new ChromeHost(instance.record.target).open();
 const deadline=Date.now()+8000;while(!await client.evaluate('Boolean(window.contractFixture)')){if(Date.now()>=deadline)throw Error('Fixture readiness unavailable');await new Promise(resolve=>setTimeout(resolve,25));}
 const name=JSON.stringify(receipts.namespace),missingBinding={provider:'native-dol',contract:'synthetic-v1',contextNonce:randomUUID(),requestDigest:'a'.repeat(64)};
 assert.deepEqual(await receipts.recover(client,[{id:randomUUID(),status:'dispatching',executionBinding:missingBinding}]),[]);assert.equal(await client.evaluate('Object.hasOwn(window,'+name+')'),false);report.checks.push('recovery on an absent namespace does not create instrumentation');
 const nonce=await receipts.context(client);assert.equal(await receipts.context(client),nonce);assert.equal(await client.evaluate('Object.isFrozen(window['+name+'])&&Object.getPrototypeOf(window['+name+'].records)===null'),true);report.checks.push('explicit context creates one frozen namespace with its original nonce');
 const binding={provider:'native-dol',contract:'synthetic-v1',contextNonce:nonce,requestDigest:'a'.repeat(64)},pending=randomUUID();
 const effects=Array.from({length:63},(_,i)=>({id:randomUUID(),status:'settled',executionBinding:i===0?Object.assign(Object.create({toJSON:()=>({})}),binding):binding,result:{outcome:'occurred',remoteClosed:true,spent:0,evidence:{synthetic:i}}}));
 const rows=effects.map(e=>[e.id,{...binding,attemptId:e.id,status:'terminal',...e.result}]);rows.push([pending,{...binding,attemptId:pending,status:'started'}]);
 await client.evaluate('Object.assign(window['+name+'].records,Object.fromEntries('+JSON.stringify(rows)+'))');assert.equal(await client.evaluate('Object.keys(window['+name+'].records).length'),64);
 const recovered=await receipts.recover(client,effects.map(e=>({...e,status:'acknowledged'})));assert.equal(recovered.length,63);assert.deepEqual(new Set(recovered.map(r=>r.attemptId)),new Set(effects.map(e=>e.id)));report.checks.push('all selected original terminals recover at the 64-record boundary including a toJSON DTO');
 let unexpectedProbe=false;await assert.rejects(receipts.cleanup({evaluate:async()=>{unexpectedProbe=true;throw Error('Unresolved receipt must not reach the page')}},[{id:pending,status:'dispatching',executionBinding:binding}]),/requires recovery/);assert.equal(unexpectedProbe,false);report.checks.push('pending records refuse retirement before any page query');
 const retired=await receipts.cleanup(client,effects);assert.equal(retired.retired.length,63);assert.equal(retired.remaining,1);assert.equal(await client.evaluate('Object.keys(window['+name+'].records).length'),1);report.checks.push('committed terminal cleanup removes its actual records while preserving the pending slot');
 const repeated=await receipts.cleanup(client,effects);assert.equal(repeated.retired.length,63);assert.equal(repeated.remaining,1);report.checks.push('repeating already committed retirement is bounded and leaves the pending record');
 const final={id:randomUUID(),status:'settled',executionBinding:binding,result:{outcome:'occurred',remoteClosed:true,spent:0}};
 await client.evaluate('window['+name+'].records['+JSON.stringify(final.id)+']='+JSON.stringify({...binding,attemptId:final.id,status:'terminal',...final.result}));
 await assert.rejects(receipts.cleanup({evaluate:async expression=>{await client.evaluate(expression);throw Error('Synthetic lost cleanup ACK')}},[final]));
 const retry=await receipts.cleanup(client,[final]);assert.deepEqual(retry.retired,[final.id]);assert.equal(retry.remaining,1);assert.equal(await client.evaluate('window['+name+'].records['+JSON.stringify(pending)+'].status'),'started');report.checks.push('lost cleanup ACK can reconcile the same committed terminal without deleting pending evidence');
 assert.equal(await client.evaluate('window.syntheticCalls'),0);report.checks.push('receipt maintenance never invokes fixture business functions');report.status='passed';
}
main().catch(error=>{report.status='failed';report.failure=typeof error?.code==='string'&&/^[A-Z_]{1,64}$/.test(error.code)?error.code:'RECEIPT_FIXTURE_FAILED';if(fs.existsSync(out))fs.writeFileSync(path.join(out,'failure-local.log'),String(error?.stack||error),{flag:'wx',mode:0o600});process.exitCode=1}).finally(async()=>{
 client?.close();try{await instance?.stop();report.cleanup='confirmed'}catch{report.cleanup='unconfirmed';process.exitCode=1}
 if(outArg&&fs.existsSync(out))fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
});
