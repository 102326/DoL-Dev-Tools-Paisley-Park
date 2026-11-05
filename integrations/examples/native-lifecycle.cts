interface Context {client:{evaluate(expression:string):Promise<unknown>}}
// Optional read-only Contract 1. A target must deliberately implement this bridge.
// All-frame bridge access is not authentication. No bridge methods dispatch actions.
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
function redact(value:unknown) {
  const result=value as {status?:unknown;data?:Record<string,unknown>}|null;
  if (result?.status !== 'available') return {status:'unavailable'};
  const d = result.data;
  if (d?.contractVersion !== 1 || typeof d.packageName !== 'string' || !/^[A-Za-z][A-Za-z0-9_]*(?:\.[A-Za-z][A-Za-z0-9_]*)+$/.test(d.packageName) ||
      d.packageName.length > 200 || !['processSession','activityInstance','webViewInstance'].every(k=>typeof d[k]==='string'&&uuid.test(d[k] as string)) ||
      !['nativePid','versionCode'].every(k=>Number.isSafeInteger(d[k])&&(d[k] as number)>0&&(d[k] as number)<=2147483647) ||
      !['activityIdentity','webViewIdentity'].every(k=>Number.isSafeInteger(d[k])&&(d[k] as number)>=0&&(d[k] as number)<=2147483647)) throw Error('Invalid native lifecycle contract');
  return {status:'available',data:Object.fromEntries(['contractVersion','packageName','versionCode','processSession','nativePid',
    'activityInstance','activityIdentity','webViewInstance','webViewIdentity'].map(k=>[k,d[k]]))};
}
const api = {
  contractVersion:1,
  describe:()=>({name:'native-lifecycle-example',version:'1.0.0',capabilities:['native-instance-metadata']}),
  detect:(ctx:Context)=>ctx.client.evaluate(`(()=>{if(typeof globalThis.DoLNativeLifecycle?.snapshot!=='function')return 'unavailable';
    try{return JSON.parse(DoLNativeLifecycle.snapshot()).contractVersion===1?'available':'unsupported'}catch{return 'unsupported'}})()`),
  collect:(ctx:Context)=>ctx.client.evaluate(`(()=>{if(typeof globalThis.DoLNativeLifecycle?.snapshot!=='function')return {status:'unavailable'};
    const d=JSON.parse(DoLNativeLifecycle.snapshot());return {status:'available',data:Object.fromEntries(
      ['contractVersion','packageName','versionCode','processSession','nativePid','activityInstance','activityIdentity',
      'webViewInstance','webViewIdentity'].map(k=>[k,d[k]]))}})()`),
  redact,
};

export = api;
