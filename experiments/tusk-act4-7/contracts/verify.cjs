'use strict';
// Real CDP closure/property attestation with original synthetic content only.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(process.env.PAISLEY_TOOL_ROOT||path.join(__dirname,'../../..'));
const pc=require(root+'/scripts/lib/pc-session.cjs'),{ChromeHost}=require(root+'/scripts/lib/chrome-host.cjs'),contracts=require(root+'/scripts/lib/game-contract.cjs');
const [chrome,outArg]=process.argv.slice(2),out=path.resolve(outArg||'');
const report={schemaVersion:1,node:process.version,platform:process.platform,scope:'Real Chrome CDP with synthetic widget and function closures; no game',checks:[]};
const hash=value=>createHash('sha256').update(value).digest('hex');
const widgetBody='\n<<set _synthetic to true>>\n',macroSource='function syntheticBusiness(){window.syntheticCalls++;return 7}';
let instance,client;
async function main(){
 if(!chrome||!outArg)throw Error('Usage: verify.cjs ABS_CHROME NEW_OUTPUT');fs.mkdirSync(out,{mode:0o700});
 const resources=path.join(out,'resources.json');fs.writeFileSync(resources,JSON.stringify({schemaVersion:1,resources:[{urlPath:'/fixture.js',file:path.join(__dirname,'fixture.js')}]}),{flag:'wx'});
 instance=await pc.start({file:path.join(__dirname,'fixture.html'),resources,chrome,port:'18777',mode:'headless',out:path.join(out,'instance')});
 client=await new ChromeHost(instance.record.target).open();
 const readyDeadline=Date.now()+8000;while(!await client.evaluate('Boolean(window.contractFixture)')){if(Date.now()>=readyDeadline)throw Error('Fixture readiness unavailable');await new Promise(resolve=>setTimeout(resolve,25));}
 const plain=await contracts.attestWidget(client,'syntheticwidget',hash(widgetBody));
 assert.equal(plain.source,widgetBody);assert.equal(plain.passage,'Synthetic Widgets');assert.equal(plain.objectGroup,undefined);report.checks.push('real widget closure code definition payload and unique Story body agree');
 const retained=await contracts.attestWidget(client,'syntheticwidget',hash(widgetBody),{retain:true});
 assert.equal(typeof retained.definitionId,'string');assert.ok((await client.send('Runtime.getProperties',{objectId:retained.definitionId,ownProperties:true})).result.length);
 await client.send('Runtime.releaseObjectGroup',{objectGroup:retained.objectGroup});await assert.rejects(client.send('Runtime.getProperties',{objectId:retained.definitionId,ownProperties:true}));report.checks.push('retained original widget objects work until their owned group is released');
 const macro=await contracts.attestFunctionMacro(client,'syntheticmacro',hash(macroSource),{retain:true});assert.equal(macro.source,macroSource);assert.equal(typeof macro.functionId,'string');
 await client.send('Runtime.releaseObjectGroup',{objectGroup:macro.objectGroup});report.checks.push('real function macro attests its innermost captured business function');
 for(const mode of ['duplicate','changed']){await client.evaluate('window.contractFixture.setStory('+JSON.stringify(mode)+')');await assert.rejects(contracts.attestWidget(client,'syntheticwidget',hash(widgetBody)),/Story source mismatch/);report.checks.push(mode+' Story body refuses attestation');}
 await client.evaluate('window.contractFixture.tamperMacro()');await assert.rejects(contracts.attestFunctionMacro(client,'syntheticmacro',hash(macroSource)),/source hash mismatch/);report.checks.push('changed captured function refuses the reviewed source hash');
 assert.equal(await client.evaluate('window.syntheticCalls'),0);report.checks.push('attestation never invokes the widget or business function');report.status='passed';
}
main().catch(error=>{report.status='failed';report.failure=typeof error?.code==='string'&&/^[A-Z_]{1,64}$/.test(error.code)?error.code:'CONTRACT_FIXTURE_FAILED';if(fs.existsSync(out))fs.writeFileSync(path.join(out,'failure-local.log'),String(error?.stack||error),{flag:'wx',mode:0o600});process.exitCode=1}).finally(async()=>{
 client?.close();try{await instance?.stop();report.cleanup='confirmed'}catch{report.cleanup='unconfirmed';process.exitCode=1}
 if(outArg&&fs.existsSync(out))fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
});
