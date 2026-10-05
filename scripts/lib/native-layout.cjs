const {promisify}=require('node:util'),{execFile}=require('node:child_process'),{createHash}=require('node:crypto');
const execute=promisify(execFile),hash=s=>createHash('sha256').update(s).digest('hex');
function project(input){
 if(!Array.isArray(input)||input.length>20000)throw Error('Invalid native layout');
 const nodes=input.slice(0,200).map((n,index)=>{
  if(!n||typeof n!=='object'||Array.isArray(n))throw Error('Invalid native node');
  const bool=(key)=>typeof n[key]==='boolean'?n[key]:null;
  const list=(key,allowed)=>Array.isArray(n[key])?n[key].filter(x=>allowed.includes(x)).slice(0,10):[];
  const b=typeof n.bounds==='string'?n.bounds.match(/^\[(-?\d{1,5}),(-?\d{1,5})\]\[(-?\d{1,5}),(-?\d{1,5})\]$/):null;
  let bounds=b?b.slice(1).map(Number):null;if(bounds&&(bounds.some(x=>Math.abs(x)>16384)||bounds[2]<bounds[0]||bounds[3]<bounds[1]))bounds=null;
  return {index,class:typeof n.class==='string'&&/^[A-Za-z_$][\w.$]{0,127}$/.test(n.class)?n.class:null,
    resourceIdHash:typeof n.resourceId==='string'&&n.resourceId.length<=256?hash(n.resourceId):null,
    textPresent:typeof n.text==='string'?n.text.length>0:null,contentDescriptionPresent:typeof n.contentDesc==='string'?n.contentDesc.length>0:null,bounds,
    interactions:list('interactions',['checkable','clickable','focusable','scrollable','long-clickable','password']),state:list('state',['checked','focused','selected']),offScreen:bool('off-screen')};
 });
 return {schemaVersion:1,source:'Native layout',nodes,totalReported:input.length,truncated:input.length>200,relationships:'flat; not reconstructed',content:'text/contentDesc omitted; resource id hashed',appAssociation:'current native windows on explicit device; may include system UI'};
}
async function collect(ctx,run=execute){
 if(ctx.options.allowHelper!==true)throw Error('Android layout helper side effects must be explicitly selected');
 const args=['--no-metrics',...(process.env.DOL_ANDROID_SDK?[`--sdk=${process.env.DOL_ANDROID_SDK}`]:[]),'layout',`--device=${ctx.options.serial}`,'--flat','--full','--no-idle'];
 try{const result=await run(process.env.DOL_ANDROID_CLI||'android',args,{encoding:'utf8',timeout:15000,maxBuffer:2*1024*1024,windowsHide:true});return project(JSON.parse(result.stdout))}
 catch(e){return {schemaVersion:1,source:'Native layout',collectorStatus:'unsupported',reason:e?.code==='ENOENT'?'android-cli-unavailable':'native-layout-unavailable',rawContent:'omitted'}}
}
module.exports={collect,project};
