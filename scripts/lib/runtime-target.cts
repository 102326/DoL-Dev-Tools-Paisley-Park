declare namespace api {
  type Android = target.Android;
  type Chrome = target.Chrome;
  type Value = target.Value;
  type Document = target.Document;
}
declare namespace target {
  // Legacy optional selectors are passed through after the existing coercive regex checks.
  // Their runtime type remains unknown; consumers must validate before connecting.
  interface Android { serial:string; package:string; userId:string; targetId?:unknown; webviewSocket?:unknown; host?:never }
  interface Document { frameId:string; loaderId:string; url:string; uniqueContextId:string }
  interface Chrome { host:'chrome'; profileId:string; browserId:string; processId:number; endpoint:string; targetId:string; origin:string; document?:Document; profilePath?:string }
  type Value = Android | Chrome;
}
'use strict';
const {createHash}:typeof import('node:crypto')=require('node:crypto');
const text=(v: unknown,max=512): v is string=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const strict=(v: unknown,keys: readonly string[]): v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
function checkAndroidTarget(t:unknown):asserts t is target.Android {if(!strict(t,['serial','package','userId','targetId','webviewSocket'])||!text(t.serial,128)||!/^[\w.:-]+$/.test(t.serial)||!text(t.package,128)||!/^\w+(?:\.\w+)+$/.test(t.package)||!text(t.userId,10)||!/^(?:0|[1-9]\d*)$/.test(t.userId)||Number(t.userId)>2147483647||t.targetId!==undefined&&!/^[A-Za-z0-9._:-]{1,128}$/.test(t.targetId as string)||t.webviewSocket!==undefined&&!/^(?:browser_)?webview_devtools_remote_\d+$/.test(t.webviewSocket as string))throw Error('Explicit canonical target required');return}
function localAddress(value:unknown){
 try{const u=new URL(value as string);return u.protocol==='http:'&&u.hostname==='127.0.0.1'&&u.port!==''&&Number(u.port)>0&&u.username===''&&u.password===''&&value===u.origin}catch{return false}
}
function checkTarget(input:unknown):asserts input is target.Value {
 const t=input as Record<string,unknown>|null|undefined;
 if(t?.host!=='chrome'){checkAndroidTarget(t);return}
 const fields=['host','profileId','browserId','processId','endpoint','targetId','origin','document','profilePath'];
 if(!strict(t,fields)||Object.keys(t).length!==(fields.length-2+(t.document?1:0)+(t.profilePath?1:0))||!localAddress(t.endpoint)||!localAddress(t.origin)||
 !['profileId','browserId','targetId'].every(k=>typeof t[k]==='string')||
 !/^[a-f0-9]{64}$/.test(t.profileId as string)||!Number.isSafeInteger(t.processId)||(t.processId as number)<1||
 !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(t.browserId as string)||
 !/^[A-Za-z0-9._:-]{1,128}$/.test(t.targetId as string))throw Error('Explicit canonical Chrome target required');
 if(t.profilePath!==undefined){if(!text(t.profilePath,4096)||!require('node:path').isAbsolute(t.profilePath)||createHash('sha256').update(t.profilePath).digest('hex')!==t.profileId)throw Error('Chrome Profile identity mismatch')}
 if(t.document){const d=t.document;if(!strict(d,['frameId','loaderId','url','uniqueContextId'])||Object.keys(d).length!==4||!['frameId','loaderId','url','uniqueContextId'].every(k=>text(d[k],4096))||new URL(d.url as string).origin!==t.origin)throw Error('Invalid Chrome document binding')}
 return;
}
function target(input:unknown):target.Value {
 checkTarget(input);
 const value:unknown=JSON.parse(JSON.stringify(input));
 // Validate the actual returned identity, including any toJSON projection.
 checkTarget(value);
 return value;
}
// Preserve Android keys exactly. Chrome's conservative whole-profile lease
// prevents a new tab/browser incarnation escaping that profile's pending effects.
function key(t:target.Value){const value=target(t);return createHash('sha256').update(JSON.stringify(value.host==='chrome'?['chrome',value.profileId]:[value.serial,value.package,value.userId])).digest('hex')}
const api={target,key};
export = api;
