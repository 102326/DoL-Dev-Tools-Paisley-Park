'use strict';
// Native facts, not a recipe flag, establish a rebuilt App data generation.
const {createHash,randomBytes}=require('node:crypto'),scope=require('./game-scope.cjs');
const verified=new WeakSet(),hash=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const marker='files/.paisley-data-generation';
function proof(value){const p=Object.freeze(value);verified.add(p);return p}
function checked(value,kind){if(!verified.has(value)||value.kind!==kind)throw Error('Verified native resource proof required');return value}
async function inspect(adb,target,authorization,{readOnlyIdentity=false}={}){
 if(authorization!==undefined||!readOnlyIdentity){if(!scope.validate(authorization))throw Error('Invalid resource authorization scope')}
 if(!/^[\w.:-]{1,128}$/.test(target?.serial||'')||!/^\w+(?:\.\w+)+$/.test(target?.package||'')||!/^(0|[1-9]\d*)$/.test(target?.userId||''))throw Error('Explicit native identity target required');
 if((await adb('get-state')).toString().trim()!=='device')throw Error('Device unavailable');
 const userId=(await adb('shell','am','get-current-user')).toString().trim(),info=(await adb('shell','dumpsys','package',target.package)).toString();
 const block=info.split(`Package [${target.package}]`)[1]?.split(/\n\s*Package \[/)[0],signingHash=block?.match(/signatures=PackageSignatures\{[^\r\n]*?signatures:\[([a-f0-9]+)\]/)?.[1];
 if(authorization!==undefined)scope.assertTarget(target,{scope:authorization},userId,info);
 else if(!/^[a-f0-9]{1,16}$/.test(signingHash||'')||!new RegExp('User '+userId+':[^\\r\\n]*installed=true').test(block||''))throw Error('Native installation identity unavailable');
 if(target.userId!==userId)throw Error('Resource Android user changed');
 const run=(...args)=>adb('shell','run-as',target.package,'--user',userId,...args);
 const root=(await run('pwd')).toString().trim(),uid=(await run('id','-u')).toString().trim(),inode=(await run('stat','-c','%d:%i','.')).toString().trim();
 if(root!==`/data/user/${userId}/${target.package}`||!/^\d+$/.test(uid)||!/^\d+:\d+$/.test(inode))throw Error('Native data root identity unavailable');
 return {target:{serial:target.serial,package:target.package,userId},signingHash,root,uid,inode};
}
async function identity(adb,target,authorization){
 const facts=await inspect(adb,target,authorization,{readOnlyIdentity:true});
 const token=(await adb('shell','run-as',target.package,'--user',target.userId,'sh','-c',`'if test -f ${marker}; then cat ${marker}; else printf ABSENT; fi'`)).toString().trim();
 if(token!=='ABSENT'&&!/^[a-f0-9]{64}$/.test(token))throw Error('Native marker identity unavailable');
 return proof({kind:'identity',id:hash({...facts,token:token==='ABSENT'?null:token}),...facts});
}
async function snapshot(adb,target,authorization,expected){
 const facts=await inspect(adb,target,authorization);
 const token=(await adb('shell','run-as',target.package,'--user',target.userId,'cat',marker)).toString().trim();
 if(!/^[a-f0-9]{64}$/.test(token)||hash({...facts,token})!==expected.id)throw Error('Native data generation changed');
 return proof({kind:'current',id:expected.id,...facts,token});
}
async function rebuild(runtime,adb,target,authorization,{record=()=>{}}={}){
 if(!scope.validate(authorization)||!authorization.intents.includes('data-reset'))throw Error('App data reset is outside authorized scope');
 const before=await inspect(adb,target,authorization),attempt=runtime.beginRebuild(proof({kind:'inspection',...before}));
 record({phase:'fenced',attempt,before});
 let stage='force-stop';try{
 await adb('shell','am','force-stop','--user',target.userId,target.package);
 // Check all processes under the App UID, including secondary processes.
 const stopped=async()=>{
  const ps=(await adb('shell','ps','-A','-o','UID,PID,NAME')).toString();
  if(!/^\s*UID\s+PID\s+NAME/m.test(ps))throw Error('Process observation unavailable');
  if(ps.split(/\r?\n/).some(line=>line.trim().split(/\s+/)[0]===before.uid))throw Error('App still has a possible writer');
 };
 stage='writers-and-identity';await stopped();const preClear=await inspect(adb,target,authorization);if(preClear.uid!==before.uid||preClear.inode!==before.inode)throw Error('Native root changed before clear');
 stage='native-clear';const clear=(await adb('shell','pm','clear','--user',target.userId,target.package)).toString().trim();
 record({phase:'clear-returned',attempt,clear});if(clear!=='Success')throw Error('App data clear did not confirm success');
 stage='post-clear-identity';await stopped();const after=await inspect(adb,target,authorization);if(after.uid!==before.uid)throw Error('App UID changed during clear');
 const run=(...args)=>adb('shell','run-as',target.package,'--user',target.userId,...args);
 stage='empty-data';const empty=(await run('sh','-c',"'test ! -e files && test ! -e databases && test ! -e shared_prefs && test ! -e app_webview && echo EMPTY'")).toString().trim();
 if(empty!=='EMPTY')throw Error('Rebuilt App data is not observably empty');
 stage='native-marker';const token=randomBytes(32).toString('hex');
 await run('sh','-c',`'mkdir -p files && printf %s ${token} > ${marker}'`);
 const id=hash({...after,token}),current=await snapshot(adb,target,authorization,{id});
 await stopped();
 const result=proof({...current,kind:'rebuilt',attempt,clear,empty,before,observedAt:new Date().toISOString()});
 stage='store-registration';record({phase:'verified',proof:result});runtime.completeRebuild(result);return result;
 }catch(error){record({phase:'failed',stage,code:typeof error.code==='string'||typeof error.code==='number'?error.code:null,stdout:String(error.stdout??'').slice(-4096),stderr:String(error.stderr??'').slice(-4096),reason:String(error.message).slice(0,512)});throw error}
}
module.exports={inspect,identity,snapshot,rebuild,checked};
