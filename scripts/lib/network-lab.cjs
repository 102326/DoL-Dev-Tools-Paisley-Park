const fs=require('node:fs'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto');
const {connect}=require('./cdp.cjs'),{events}=require('./collectors.cjs');
const hash=value=>createHash('sha256').update(value).digest('hex');
function conditions(value){
  const keys=['offline','latency','downloadThroughput','uploadThroughput','blockedURLs'];
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==keys.length||keys.some(k=>!Object.hasOwn(value,k))||typeof value.offline!=='boolean'||!Number.isInteger(value.latency)||value.latency<0||value.latency>10000||['downloadThroughput','uploadThroughput'].some(k=>!Number.isInteger(value[k])||value[k]!==-1&&value[k]<1||value[k]>100000000)||!Array.isArray(value.blockedURLs)||value.blockedURLs.length>20||value.blockedURLs.some(s=>typeof s!=='string'||!s||s.length>256||/[\x00-\x20@]/.test(s)))throw Error('Invalid network conditions');
  return {...value,blockedURLs:[...value.blockedURLs]};
}
function validate(input){
  if(!input||input.schemaVersion!==1||Object.keys(input).some(k=>!['schemaVersion','baseline','scenario','milliseconds'].includes(k))||!Number.isInteger(input.milliseconds)||input.milliseconds<1||input.milliseconds>10000)throw Error('Invalid network experiment');
  const baseline=conditions(input.baseline),scenario=conditions(input.scenario);
  // A short-lived session cannot preserve somebody else's custom settings after detach.
  if(baseline.offline||baseline.latency!==0||baseline.downloadThroughput!==-1||baseline.uploadThroughput!==-1||baseline.blockedURLs.length)throw Error('Requires explicitly declared neutral baseline');
  return {schemaVersion:1,baseline,scenario,milliseconds:input.milliseconds};
}
function read(file){if(fs.statSync(file).size>65536)throw Error('Network plan too large');const raw=fs.readFileSync(file);return {plan:validate(JSON.parse(raw)),sha256:hash(raw)}}
const summary=c=>({...c,blockedURLs:c.blockedURLs.map(hash)});
async function run(options,loaded,overrides={}){
  const plan=validate(loaded.plan);
  if(!options.out||typeof loaded.sha256!=='string'||!/^[a-f0-9]{64}$/.test(loaded.sha256)||!options.plan&&(!options.endpoint||options.testEnvironment!==true||options.exclusiveNetwork!==true))throw Error('Explicit test environment, exclusive network settings and output required');
  const output=path.resolve(options.out);fs.mkdirSync(output);
  const report={schemaVersion:1,incidentId:randomUUID(),source:'Bounded CDP network experiment',planSha256:loaded.sha256,captureStart:new Date().toISOString(),status:'failed',milliseconds:plan.milliseconds,baseline:summary(plan.baseline),scenario:summary(plan.scenario),cleanup:[],
    stateOwnership:'caller declares no other client changing this target network settings; concurrent-session isolation unproven',restoration:'declared neutral baseline; original state was not read',appAssociation:'caller-specified endpoint; unverified',remoteCancellationGuaranteed:false};
  if(options.plan){report.status='planned';report.captureEnd=new Date().toISOString();fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(report,null,2),{flag:'wx'});return report}
  const save=()=>{fs.writeFileSync(path.join(output,'manifest.pending'),JSON.stringify(report,null,2),{flag:'wx'});fs.renameSync(path.join(output,'manifest.pending'),path.join(output,'manifest.json'))};
  report.experimentalState='not dispatched';save();
  const capture=events();let client,dispatched=false;
  async function apply(c,restore=false){
    const {blockedURLs,...network}=c;
    if(!restore){dispatched=true;report.experimentalState='changes may have occurred; restore unconfirmed';report.cleanup=[{command:'Network.emulateNetworkConditions',status:'unknown',reason:'restore-not-yet-performed'},{command:'Network.setBlockedURLs',status:'unknown',reason:'restore-not-yet-performed'}];save()}
    await client.send('Network.emulateNetworkConditions',network);
    await client.send('Network.setBlockedURLs',{urls:blockedURLs});
  }
  try{
    client=await (overrides.connect||connect)(options.endpoint,1500,capture.onEvent,options.targetId||null);
    await client.send('Network.enable');await apply(plan.scenario);
    await (overrides.pause|| (ms=>new Promise(resolve=>setTimeout(resolve,ms))))(plan.milliseconds);
    if(client.isOpen&&!client.isOpen())throw Error('Original session lost');
    report.status='complete';
  }catch{report.reason=dispatched?'experiment-failed; remote changes may have occurred':'network-session-unavailable'}
  finally{
    capture.stop();report.network=capture.snapshot().network;report.omitted=capture.snapshot().omittedNetwork;
    if(dispatched){
      report.cleanup=[];
      // Keep the original raw session and its command timeout; no replacement session or aborted Journey proxy.
      const {blockedURLs,...network}=plan.baseline;
      for(const [method,params] of [['Network.emulateNetworkConditions',network],['Network.setBlockedURLs',{urls:blockedURLs}]]){
        try{await client.send(method,params);report.cleanup.push({command:method,status:'acknowledged',baseline:'declared; persistence after detach unverified'})}
        catch{report.cleanup.push({command:method,status:'unknown',reason:'original-session-restore-unconfirmed'})}
      }
    }
    try{client?.close()}catch{report.cleanup.push({status:'unknown',reason:'session-close-unconfirmed'})}
    if(report.cleanup.some(c=>c.status==='unknown')&&report.status==='complete')report.status='partial';
    report.experimentalState=dispatched?'see original-session cleanup; detach persistence unverified':'not dispatched';
    report.captureEnd=new Date().toISOString();save();
  }
  return report;
}
module.exports={read,validate,run};
