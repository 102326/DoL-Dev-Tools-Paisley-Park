'use strict';
// Synthetic closure/descriptor ownership only; no game or business execution.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const root=path.resolve(process.env.PAISLEY_TOOL_ROOT||path.join(__dirname,'../../..'));
const pc=require(root+'/scripts/lib/pc-session.cjs'),{ChromeHost}=require(root+'/scripts/lib/chrome-host.cjs'),business=require(root+'/scripts/lib/game-native-business-bindings.cjs');
const [chrome,outArg]=process.argv.slice(2),out=path.resolve(outArg||'');let instance,client;const groups=[];
const report={schemaVersion:1,node:process.version,platform:process.platform,scope:'Real Chrome synthetic original-function and V descriptor ownership; no DoL/gameplay acceptance',checks:[]};
const hash=value=>createHash('sha256').update(value).digest('hex');
async function main(){
 if(!chrome||!outArg)throw Error('Usage: business-bindings-verify.cjs ABS_CHROME NEW_OUTPUT');fs.mkdirSync(out,{mode:0o700});
 const resources=path.join(out,'resources.json');fs.writeFileSync(resources,JSON.stringify({schemaVersion:1,resources:[{urlPath:'/fixture.js',file:path.join(__dirname,'fixture.js')}]}),{flag:'wx'});
 instance=await pc.start({file:path.join(__dirname,'fixture.html'),resources,chrome,port:'18780',mode:'headless',out:path.join(out,'instance')});client=await new ChromeHost(instance.record.target).open();
 const deadline=Date.now()+8000;while(!await client.evaluate('Boolean(window.syntheticMoment&&window.V)')){if(Date.now()>=deadline)throw Error('Fixture readiness unavailable');await new Promise(resolve=>setTimeout(resolve,25));}
 await assert.rejects(client.evaluate('window'),error=>error.code==='CDP_COMMAND_REJECTED');assert.equal(await client.evaluate('void window'),undefined);report.returnByValueControl='window rejected; void window accepted';
 const objectGroup='owned-business-fixture';groups.push(objectGroup);const state=(await client.send('Runtime.evaluate',{expression:'window.SugarCube.State',objectGroup,returnByValue:false})).result.objectId;
 const profile={widgets:{syntheticwidget:{sha256:hash('\n<<set _synthetic to true>>\n')}},functionMacros:{syntheticmacro:{sha256:hash('function syntheticBusiness(){window.syntheticCalls++;return 7}')}},functions:{updateMoment:{expr:'window.syntheticMoment',sha256:hash('function syntheticMoment(){return State.passage}')}}};
 const bound=await business.bind(client,{objectGroup,objects:{state}},profile,groups);assert.equal(bound.widgets,2);assert.equal(bound.functions,1);assert.equal(groups.length,3);report.checks.push('real widget function macro and captured State bind into the original caller-owned groups');
 const check=async()=>{const r=await client.send('Runtime.callFunctionOn',{objectId:bound.bundleId,returnByValue:true,functionDeclaration:'function(){return ('+business.checkBindings.toString()+')(this)??null}'});assert.equal(r.exceptionDetails,undefined);return r.result.value};
 assert.equal(await check(),null);report.checks.push('the unchanged source guard accepts the original active variables getter and functions');
 await client.evaluate('void (window.syntheticMoment=function changedMoment(){})');assert.equal(await check(),'native-clothing-functions-changed');await client.send('Runtime.callFunctionOn',{objectId:bound.bundleId,returnByValue:true,functionDeclaration:'function(){window.syntheticMoment=this.globals[0].value}'});assert.equal(await check(),null);report.checks.push('a replaced original global function is rejected without calling it');
 await client.evaluate('void Object.defineProperty(window,"V",{get:()=>null,configurable:true,enumerable:false})');assert.equal(await check(),'native-variables-owner-changed');await client.send('Runtime.callFunctionOn',{objectId:bound.bundleId,returnByValue:true,functionDeclaration:'function(){Object.defineProperty(window,"V",{get:this.getter,configurable:true,enumerable:false})}'});assert.equal(await check(),null);report.checks.push('a changed V descriptor is rejected and only the retained original getter restores ownership');
 await client.evaluate('window.contractFixture.tamperMacro()');assert.equal(await check(),'native-clothing-macro-changed');assert.equal(await client.evaluate('window.syntheticCalls'),0);report.checks.push('a changed registered macro refuses while no fixture business function has run');
 for(const group of [...groups].reverse())await client.send('Runtime.releaseObjectGroup',{objectGroup:group});groups.length=0;await assert.rejects(client.send('Runtime.getProperties',{objectId:bound.bundleId,ownProperties:true}));report.checks.push('caller releases all retained groups and the old bundle is no longer usable');report.status='passed';
}
main().catch(error=>{report.status='failed';report.failure=typeof error?.code==='string'&&/^[A-Z_]{1,64}$/.test(error.code)?error.code:'BUSINESS_BINDING_FIXTURE_FAILED';if(fs.existsSync(out))fs.writeFileSync(path.join(out,'failure-local.log'),String(error?.stack||error),{flag:'wx',mode:0o600});process.exitCode=1}).finally(async()=>{
 try{if(client)for(const objectGroup of [...groups].reverse())await client.send('Runtime.releaseObjectGroup',{objectGroup})}catch{report.groupCleanup='unconfirmed';process.exitCode=1}finally{client?.close()}
 try{await instance?.stop();report.cleanup=report.groupCleanup==='unconfirmed'?'unconfirmed':'confirmed'}catch{report.cleanup='unconfirmed';process.exitCode=1}
 if(outArg&&fs.existsSync(out))fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
});
