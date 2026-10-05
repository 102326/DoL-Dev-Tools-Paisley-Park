const fs=require('node:fs'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto');
const {connect}=require('./cdp.cjs'),dom=require('./dom.cjs'),css=require('./css.cjs');
const {redact}=require('./privacy.cjs');
const hash=value=>createHash('sha256').update(value).digest('hex');
function validate(p){
 if(!p||p.schemaVersion!==1||Object.keys(p).some(k=>!['schemaVersion','baseline','scope','profiles'].includes(k))||p.baseline!=='none'||typeof p.scope!=='string'||!p.scope.trim()||p.scope.length>128||!Array.isArray(p.profiles)||p.profiles.length<1||p.profiles.length>6)throw Error('Invalid viewport plan');
 const seen=new Set();for(const c of p.profiles){if(!c||Object.keys(c).some(k=>!['name','width','height','deviceScaleFactor','mobile'].includes(k))||typeof c.name!=='string'||!/^[a-z0-9][a-z0-9-]{0,63}$/.test(c.name)||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(c.name)||seen.has(c.name)||[c.width,c.height].some(n=>!Number.isInteger(n)||n<240||n>2560)||!Number.isFinite(c.deviceScaleFactor)||c.deviceScaleFactor<0.5||c.deviceScaleFactor>3||c.width*c.height*c.deviceScaleFactor**2>8000000||typeof c.mobile!=='boolean')throw Error('Invalid viewport profile');seen.add(c.name)}return p;
}
function read(file){if(fs.statSync(file).size>65536)throw Error('Viewport plan too large');const raw=fs.readFileSync(file);return {plan:validate(JSON.parse(raw)),sha256:hash(raw)}}
function viewport(v){if(!v||[v.width,v.height,v.devicePixelRatio].some(n=>!Number.isFinite(n)||n<=0||n>16384))throw Error('Viewport unavailable');return {width:v.width,height:v.height,devicePixelRatio:v.devicePixelRatio}}
async function run(options,loaded,overrides={}){
 const plan=validate(loaded.plan);if(!options.out||typeof loaded.sha256!=='string'||!/^[a-f0-9]{64}$/.test(loaded.sha256)||!options.plan&&(!options.endpoint||options.testEnvironment!==true||options.exclusiveMetrics!==true))throw Error('Explicit test target and exclusive neutral metrics required');
 const output=path.resolve(options.out);fs.mkdirSync(output);const report={schemaVersion:1,incidentId:randomUUID(),source:'CDP viewport matrix',planSha256:loaded.sha256,captureStart:new Date().toISOString(),status:'failed',scopeHash:hash(plan.scope),profiles:[],cleanup:[],baseline:'caller declares no existing device metrics override',deviceEquivalence:'not inferred; browser metrics only',appAssociation:'caller-selected endpoint; unverified',automaticCompatibilityVerdict:'not-inferred'};
 const save=()=>{fs.writeFileSync(path.join(output,'manifest.pending'),JSON.stringify(report,null,2),{flag:'wx'});fs.renameSync(path.join(output,'manifest.pending'),path.join(output,'manifest.json'))};save();
 const json=(name,source,data)=>{const raw=JSON.stringify({schemaVersion:1,incidentId:report.incidentId,capturedAt:new Date().toISOString(),source,data:redact(data)},null,2);fs.writeFileSync(path.join(output,name),raw,{flag:'wx'});return {filename:name,sha256:hash(raw)}};
 if(options.plan){report.profiles=plan.profiles.map(c=>({...c,status:'planned'}));report.status='planned';report.captureEnd=new Date().toISOString();save();return report}
 let client,dispatched=false;const probe='({width:innerWidth,height:innerHeight,devicePixelRatio})';
 try{
  client=await (overrides.connect||connect)(options.endpoint,1500,()=>{},options.targetId||null);report.originalObservedViewport=viewport(await client.evaluate(probe));save();
  for(const p of plan.profiles){
   const entry={...p,status:'failed',artifacts:[]};report.profiles.push(entry);dispatched=true;report.cleanup=[{command:'Emulation.clearDeviceMetricsOverride',status:'unknown',reason:'restore-not-yet-performed'}];save();
   const {name,...metrics}=p;await client.send('Emulation.setDeviceMetricsOverride',metrics);
   entry.observedViewport=viewport(await client.evaluate(probe));entry.layoutWidthMatchesRequest=entry.observedViewport.width===p.width;
   entry.artifacts.push(json(name+'-dom.json','Viewport scoped DOM', {...dom.contract(await client.evaluate(dom.expression(plan.scope))),scopeHash:report.scopeHash}));
   entry.artifacts.push(json(name+'-css.json','Viewport scoped CSS', {...css.contract(await client.evaluate(css.expression(plan.scope))),scopeHash:report.scopeHash}));
   const image=await client.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
   if(typeof image.data!=='string'||image.data.length>12*1024*1024||!/^[A-Za-z0-9+/]*={0,2}$/.test(image.data))throw Error('Invalid screenshot');const png=Buffer.from(image.data,'base64');
   if(png.length<24||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||png.length>8*1024*1024||!png.readUInt32BE(16)||!png.readUInt32BE(20)||png.readUInt32BE(16)*png.readUInt32BE(20)>8000000)throw Error('Invalid screenshot');
   const filename=name+'.png';fs.writeFileSync(path.join(output,filename),png,{flag:'wx'});entry.artifacts.push({filename,sha256:hash(png),dimensions:[png.readUInt32BE(16),png.readUInt32BE(20)],requiresPrivacyReview:true});entry.status='complete';save();
  }
  report.status='complete';
 }catch{report.reason=dispatched?'viewport-collection-failed; remote changes may have occurred':'viewport-session-unavailable';report.status=report.profiles.some(p=>p.status==='complete'||p.artifacts.length)?'partial':'failed'}
 finally{
  if(dispatched){try{await client.send('Emulation.clearDeviceMetricsOverride');report.cleanup=[{command:'Emulation.clearDeviceMetricsOverride',status:'acknowledged',baseline:'declared neutral; original override was not read'}];report.afterClearObservedViewport=viewport(await client.evaluate(probe));report.observedViewportRestored=JSON.stringify(report.afterClearObservedViewport)===JSON.stringify(report.originalObservedViewport);if(!report.observedViewportRestored&&report.status==='complete')report.status='partial'}catch{report.cleanup=[{command:'Emulation.clearDeviceMetricsOverride',status:'unknown',reason:'original-session-restore-or-observation-unconfirmed'}];if(report.status==='complete')report.status='partial'}}
  try{client?.close()}catch{report.cleanup.push({status:'unknown',reason:'session-close-unconfirmed'});if(report.status==='complete')report.status='partial'}report.captureEnd=new Date().toISOString();save();
 }
 return report;
}
module.exports={validate,read,run};
