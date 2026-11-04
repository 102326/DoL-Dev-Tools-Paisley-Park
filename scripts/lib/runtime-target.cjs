'use strict';
const {createHash}=require('node:crypto');
const text=(v,max=512)=>typeof v==='string'&&v.length>0&&v.length<=max&&!/[\u0000-\u001f]/.test(v);
const strict=(v,keys)=>v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).every(k=>keys.includes(k));
const copy=v=>JSON.parse(JSON.stringify(v));
function androidTarget(t){if(!strict(t,['serial','package','userId','targetId','webviewSocket'])||!text(t.serial,128)||!/^[\w.:-]+$/.test(t.serial)||!text(t.package,128)||!/^\w+(?:\.\w+)+$/.test(t.package)||!text(t.userId,10)||!/^(?:0|[1-9]\d*)$/.test(t.userId)||Number(t.userId)>2147483647||t.targetId!==undefined&&!/^[A-Za-z0-9._:-]{1,128}$/.test(t.targetId)||t.webviewSocket!==undefined&&!/^(?:browser_)?webview_devtools_remote_\d+$/.test(t.webviewSocket))throw Error('Explicit canonical target required');return copy(t)}
function localAddress(value){
 try{const u=new URL(value);return u.protocol==='http:'&&u.hostname==='127.0.0.1'&&u.port!==''&&Number(u.port)>0&&u.username===''&&u.password===''&&value===u.origin}catch{return false}
}
function target(t){
 if(t?.host!=='chrome')return androidTarget(t);
 const fields=['host','profileId','browserId','processId','endpoint','targetId','origin','document','profilePath'];
 if(!strict(t,fields)||Object.keys(t).length!==(fields.length-2+(t.document?1:0)+(t.profilePath?1:0))||!localAddress(t.endpoint)||!localAddress(t.origin)||
 !['profileId','browserId','targetId'].every(k=>typeof t[k]==='string')||
 !/^[a-f0-9]{64}$/.test(t.profileId)||!Number.isSafeInteger(t.processId)||t.processId<1||
 !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/.test(t.browserId)||
 !/^[A-Za-z0-9._:-]{1,128}$/.test(t.targetId))throw Error('Explicit canonical Chrome target required');
 if(t.profilePath!==undefined){if(!text(t.profilePath,4096)||!require('node:path').isAbsolute(t.profilePath)||createHash('sha256').update(t.profilePath).digest('hex')!==t.profileId)throw Error('Chrome Profile identity mismatch')}
 if(t.document){const d=t.document;if(!strict(d,['frameId','loaderId','url','uniqueContextId'])||Object.keys(d).length!==4||!['frameId','loaderId','url','uniqueContextId'].every(k=>text(d[k],4096))||new URL(d.url).origin!==t.origin)throw Error('Invalid Chrome document binding')}
 return copy(t);
}
// Preserve Android keys exactly. Chrome's conservative whole-profile lease
// prevents a new tab/browser incarnation escaping that profile's pending effects.
function key(t){target(t);return createHash('sha256').update(JSON.stringify(t.host==='chrome'?['chrome',t.profileId]:[t.serial,t.package,t.userId])).digest('hex')}
module.exports={target,key};
