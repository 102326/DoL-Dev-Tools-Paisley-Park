'use strict';
// Pure observations of self-authored fixture state; no game engine or business action.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.env.PAISLEY_TOOL_ROOT||path.join(__dirname,'../../..'));
const pc=require(root+'/scripts/lib/pc-session.cjs'),{ChromeHost}=require(root+'/scripts/lib/chrome-host.cjs'),predicates=require(root+'/scripts/lib/game-goal-reader.cjs');
const [chrome,outArg]=process.argv.slice(2),out=path.resolve(outArg||'');let instance,client;
const report={schemaVersion:1,node:process.version,platform:process.platform,scope:'Real Chrome DOM and self-authored original-state stand-in; no DoL engine or gameplay acceptance',checks:[]};
const request=goal=>predicates.validate({name:'synthetic',mode:'gameplay',goal,budget:{timeoutMs:1000,maxActions:1,maxObservations:1,maxSpend:10}}).goal;
async function main(){
 if(!chrome||!outArg)throw Error('Usage: goal-proof-verify.cjs ABS_CHROME NEW_OUTPUT');fs.mkdirSync(out,{mode:0o700});
 const resources=path.join(out,'resources.json');fs.writeFileSync(resources,JSON.stringify({schemaVersion:1,resources:[{urlPath:'/fixture.js',file:path.join(__dirname,'fixture.js')}]}),{flag:'wx'});
 instance=await pc.start({file:path.join(__dirname,'fixture.html'),resources,chrome,port:'18778',mode:'headless',out:path.join(out,'instance')});client=await new ChromeHost(instance.record.target).open();
 const deadline=Date.now()+8000;while(!await client.evaluate('Boolean(window.SugarCube?.State&&document.querySelector("#passages > .passage"))')){if(Date.now()>=deadline)throw Error('Fixture readiness unavailable');await new Promise(resolve=>setTimeout(resolve,25));}
 const observe=goal=>client.evaluate('('+predicates.goalReader.toString()+')('+JSON.stringify(goal)+')');
 const reach=request({kind:'reach-passage',passage:'Synthetic Room'});assert.equal((await observe(reach)).satisfied,true);report.checks.push('reach proof agrees with real DOM and the selected fixture state');
 await client.evaluate('document.querySelector("#passages > .passage").setAttribute("data-passage","different")');assert.equal((await observe(reach)).status,'unavailable');await client.evaluate('document.querySelector("#passages > .passage").setAttribute("data-passage","Synthetic Room")');report.checks.push('DOM and original-state mismatch refuses an available proof');
 const item={variable:'hairpin',colour:'black',accessory_colour:'white',modder:null};
 await client.evaluate('Object.assign(window.SugarCube.State.variables,{worn:{head:'+JSON.stringify(item)+'},wardrobe:{head:['+JSON.stringify(item)+']}})');
 assert.equal((await observe(request({kind:'equip-matching',slot:'head',colour:'black'}))).satisfied,true);report.checks.push('matching equipment reads actual fixture worn and inventory fields');
 const purchase=request({kind:'purchase-one',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'white',baselineMoney:100,baselineCount:0,unitCost:10,maxSpend:10});assert.equal((await observe(purchase)).satisfied,false);
 await client.evaluate('window.SugarCube.State.variables.money=90');const bought=await observe(purchase);assert.equal(bought.satisfied,true);assert.equal(bought.spent,10);assert.equal(bought.priceMatches,true);assert.equal(bought.count,1);report.checks.push('purchase proof requires actual positive spend and one exact variant');
 await client.evaluate('window.SugarCube.State.variables.money=80');assert.equal((await observe(purchase)).satisfied,false);report.checks.push('spend beyond the explicit bound cannot satisfy the purchase proof');
 const combined=request({kind:'purchase-and-equip',slot:'head',colour:'black'}),proof=await observe(combined);assert.equal(proof.conditionsSatisfied,true);assert.equal(proof.satisfied,false);assert.equal(predicates.purchaseSatisfied({goalProof:proof},combined,{effects:[],spent:10,budget:{maxSpend:10},reserved:0}),false);report.checks.push('matching browser state alone cannot complete purchase-and-equip without its settled receipt');
 await client.evaluate('document.querySelector("#passages").append(document.querySelector("#passages > .passage").cloneNode(true))');assert.equal((await observe(reach)).status,'unavailable');report.checks.push('ambiguous Passage roots refuse an available proof');
 assert.equal(await client.evaluate('window.syntheticCalls'),0);report.checks.push('all observations leave fixture business call counters untouched');report.status='passed';
}
main().catch(error=>{report.status='failed';report.failure=typeof error?.code==='string'&&/^[A-Z_]{1,64}$/.test(error.code)?error.code:'GOAL_PROOF_FIXTURE_FAILED';if(fs.existsSync(out))fs.writeFileSync(path.join(out,'failure-local.log'),String(error?.stack||error),{flag:'wx',mode:0o600});process.exitCode=1}).finally(async()=>{
 client?.close();try{await instance?.stop();report.cleanup='confirmed'}catch{report.cleanup='unconfirmed';process.exitCode=1}
 if(outArg&&fs.existsSync(out))fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
});
