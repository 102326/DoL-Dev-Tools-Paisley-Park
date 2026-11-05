import type journeyAPI from './journey.cjs';
import type evidenceAPI from './evidence.cjs';
declare namespace matrix {
 interface Preconditions {androidVersion?:string;appVersion?:string;requiredMods?:string[]}
 interface Case {name:string;serial:string;package:string;journey:journeyAPI.Plan;preconditions?:Preconditions}
 interface Options {out:string;plan?:boolean;testEnvironment?:boolean}
 interface Loaded {cases:unknown;sha256:string}
 interface Overrides {evidence?:typeof evidenceAPI.evidence;journey?:typeof journeyAPI.run}
 interface Entry {name:string;status:journeyAPI.Report['status']|'skipped';preconditions:string;reason?:string;incidentId?:string;directory?:string}
 interface Report {schemaVersion:number;source:string;incidentId:string;matrixSha256:string;captureStart:string;status:'planned'|'failed'|'complete'|'partial';cases:Entry[];automaticCompatibilityVerdict:string;configurationSwitches:string;deviceSimulation:string;captureEnd?:string}
}
const fs=require('node:fs'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto');
const journey:typeof import('./journey.cjs')=require('./journey.cjs');
const hash=(raw:string|Buffer)=>createHash('sha256').update(raw).digest('hex');
function validate(raw:unknown):matrix.Case[]{
  const input=raw as {schemaVersion?:unknown;cases?:unknown}|null|undefined;
  if(!input||input.schemaVersion!==1||Object.keys(input).some(k=>!['schemaVersion','cases'].includes(k))||!Array.isArray(input.cases)||input.cases.length<1||input.cases.length>12)throw Error('Invalid matrix');
  const names=new Set();
  const cases=(input.cases as unknown[]).map(raw=>{
    const item=raw as matrix.Case|null|undefined;
    if(!item||Object.keys(item).some(k=>!['name','serial','package','journey','preconditions'].includes(k))||typeof item.name!=='string'||!/^[a-z0-9][a-z0-9-]{0,63}$/.test(item.name)||names.has(item.name)||typeof item.serial!=='string'||!/^[\w.:-]{1,128}$/.test(item.serial)||typeof item.package!=='string'||!/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(item.package))throw Error('Invalid matrix case');
    if(/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/i.test(item.name))throw Error('Reserved matrix name');
    names.add(item.name);const plan=journey.validate(item.journey);
    if(item.preconditions!==undefined&&(!item.preconditions||Object.keys(item.preconditions).some(k=>!['androidVersion','appVersion','requiredMods'].includes(k))||['androidVersion','appVersion'].some(k=>(item.preconditions as Record<string,unknown>)[k]!==undefined&&(typeof (item.preconditions as Record<string,unknown>)[k]!=='string'||!/^[-0-9A-Za-z._()+]{1,64}$/.test((item.preconditions as Record<string,string>)[k])))||item.preconditions.requiredMods!==undefined&&(!Array.isArray(item.preconditions.requiredMods)||item.preconditions.requiredMods.length>100||item.preconditions.requiredMods.some(n=>typeof n!=='string'||!n||n.length>128||/[\x00-\x1f/\\]/.test(n)))))throw Error('Invalid matrix preconditions');
    return {...item,journey:plan};
  });
  if(cases.some(c=>names.has(c.name+'-environment')))throw Error('Matrix output names overlap');
  return cases;
}
function read(filename:string){
  if(fs.statSync(filename).size>65536)throw Error('Matrix too large');
  const raw=fs.readFileSync(filename,'utf8');return {cases:validate(JSON.parse(raw)),sha256:hash(raw)};
}
async function run(options:matrix.Options,loaded:matrix.Loaded,overrides:matrix.Overrides={}):Promise<matrix.Report>{
  if(!options.out||!loaded?.cases||typeof loaded.sha256!=='string'||!/^[a-f0-9]{64}$/.test(loaded.sha256)||!options.plan&&options.testEnvironment!==true)throw Error('Explicit test environment and valid source hash required');
  const cases=validate({schemaVersion:1,cases:loaded.cases});
  const output=path.resolve(options.out);fs.mkdirSync(output);
  const report:matrix.Report={schemaVersion:1,source:'Selected Journey matrix',incidentId:randomUUID(),matrixSha256:loaded.sha256,captureStart:new Date().toISOString(),status:options.plan?'planned':'failed',cases:[],
    automaticCompatibilityVerdict:'not-inferred',configurationSwitches:'only the reviewed journeys; no ModLoader/private state toggles',deviceSimulation:'not inferred from case labels'};
  const save=()=>{fs.writeFileSync(path.join(output,'manifest.pending'),JSON.stringify(report,null,2),{flag:'wx'});fs.renameSync(path.join(output,'manifest.pending'),path.join(output,'manifest.json'))};
  save();let stopped=false;
  try{for(const item of cases){
    const entry:matrix.Entry={name:item.name,status:'skipped',preconditions:options.plan?'not evaluated':'not requested'};report.cases.push(entry);save();
    if(stopped){entry.reason='earlier-case-incomplete';save();continue}
    try{
      if(!options.plan&&item.preconditions){
        // Reuse public environment facts without taking ownership of another Mod's configuration.
        const evidence:typeof evidenceAPI.evidence=overrides.evidence||require('./evidence.cjs').evidence;
        const facts=await evidence({serial:item.serial,package:item.package,out:path.join(output,item.name+'-environment'),profile:'environment',windowMs:0});
        if(facts.status!=='complete')throw Error('Preconditions unavailable');
        const data=JSON.parse(fs.readFileSync(path.join(output,item.name+'-environment','environment.json'),'utf8')).data as {device:{androidVersion?:unknown};app:{versionName?:unknown};runtime:{mods:{items?:unknown}}};
        const expected=item.preconditions;
        if(expected.androidVersion!==undefined&&data.device.androidVersion!==expected.androidVersion||expected.appVersion!==undefined&&data.app.versionName!==expected.appVersion||expected.requiredMods&&(!Array.isArray(data.runtime.mods.items)||expected.requiredMods.some(n=>!(data.runtime.mods.items as {name?:unknown}[]).some(m=>m.name===n))))throw Error('Preconditions mismatch');
        entry.preconditions='matched public facts; reported mods do not prove enabled/execution order';
      }
      const result=await (overrides.journey||journey.run)({serial:item.serial,package:item.package,out:path.join(output,item.name),plan:!!options.plan,testEnvironment:options.testEnvironment}, {plan:item.journey,sha256:hash(JSON.stringify(item.journey))});
      entry.status=result.status;entry.incidentId=result.incidentId;entry.directory=item.name;
      if(!['complete','planned'].includes(result.status))stopped=true;
    }catch{entry.status='failed';entry.reason='case-or-precondition-failed';stopped=true}
    save();
  }}finally{report.captureEnd=new Date().toISOString();const success=options.plan?'planned':'complete';report.status=report.cases.every(c=>c.status===success)?success:report.cases.some(c=>c.status===success)?'partial':'failed';save()}
  return report;
}
const matrix={read,run,validate};
export = matrix;
