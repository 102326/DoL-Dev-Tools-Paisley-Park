import type targetAPI from './runtime-target.cjs';
declare const provenance:unique symbol;
declare namespace resource {
 type Target=Pick<targetAPI.Android,'serial'|'package'|'userId'>;
 type Adb=(...args:string[])=>Promise<{toString():string}>;
 interface Facts {target:Target;signingHash:string;root:string;uid:string;inode:string}
 type Proof<T>=Readonly<T>&{readonly [provenance]:true};
 type Inspection=Proof<Facts&{kind:'inspection'}>;
 type Identity=Proof<Facts&{kind:'identity';id:string}>;
 type Current=Proof<Facts&{kind:'current';id:string;token:string}>;
 type Rebuilt=Proof<Facts&{kind:'rebuilt';id:string;token:string;attempt:string;clear:'Success';empty:'EMPTY';before:Facts;observedAt:string}>;
 interface Kinds {inspection:Inspection;identity:Identity;current:Current;rebuilt:Rebuilt}
 interface Runtime {beginRebuild(proof:Inspection):string;completeRebuild(proof:Rebuilt):unknown}
 type Event={phase:'fenced';attempt:string;before:Facts}|{phase:'clear-returned';attempt:string;clear:string}|{phase:'verified';proof:Rebuilt}|{phase:'failed';stage:string;code:string|number|null;stdout:string;stderr:string;reason:string};
}
interface ErrorView {code?:unknown;stdout?:unknown;stderr?:unknown;message?:unknown}
// Native facts, not a recipe flag, establish a rebuilt App data generation.
const {createHash,randomBytes}:typeof import('node:crypto')=require('node:crypto'),scope:typeof import('./game-scope.cjs')=require('./game-scope.cjs');
const verified=new WeakSet<object>(),hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v) as string).digest('hex');
const marker='files/.paisley-data-generation';
function nativeTarget(raw:unknown):resource.Target {
 const input=raw as Partial<resource.Target>|null|undefined,serial=input?.serial;
 if(typeof serial!=='string'||!/^[\w.:-]{1,128}$/.test(serial))throw Error('Explicit native identity target required');
 const packageName=input?.package;
 if(typeof packageName!=='string'||!/^\w+(?:\.\w+)+$/.test(packageName))throw Error('Explicit native identity target required');
 const userId=input?.userId;
 if(typeof userId!=='string'||!/^(0|[1-9]\d*)$/.test(userId))throw Error('Explicit native identity target required');
 return {serial,package:packageName,userId};
}
function proof<const T extends resource.Facts & {kind:keyof resource.Kinds}>(value:T):resource.Proof<T>{const p=Object.freeze(value);verified.add(p);return p as resource.Proof<T>}
function checked<K extends keyof resource.Kinds>(value:unknown,kind:K):resource.Kinds[K]{if(!verified.has(value as object)||(value as {kind?:unknown}).kind!==kind)throw Error('Verified native resource proof required');return value as resource.Kinds[K]}
async function inspect(adb:resource.Adb,rawTarget:unknown,authorization?:unknown,{readOnlyIdentity=false}:{readOnlyIdentity?:boolean}={}):Promise<resource.Facts>{
 if(authorization!==undefined||!readOnlyIdentity){if(!scope.validate(authorization))throw Error('Invalid resource authorization scope')}
 const target=nativeTarget(rawTarget);
 if((await adb('get-state')).toString().trim()!=='device')throw Error('Device unavailable');
 const userId=(await adb('shell','am','get-current-user')).toString().trim(),info=(await adb('shell','dumpsys','package',target.package)).toString();
 const block=info.split(`Package [${target.package}]`)[1]?.split(/\n\s*Package \[/)[0],signingHash=block?.match(/signatures=PackageSignatures\{[^\r\n]*?signatures:\[([a-f0-9]+)\]/)?.[1];
 if(authorization!==undefined)scope.assertTarget(target,{scope:authorization},userId,info);
 else if(!/^[a-f0-9]{1,16}$/.test(signingHash||'')||!new RegExp('User '+userId+':[^\\r\\n]*installed=true').test(block||''))throw Error('Native installation identity unavailable');
 if(target.userId!==userId)throw Error('Resource Android user changed');
 const run=(...args:string[])=>adb('shell','run-as',target.package,'--user',userId,...args);
 const root=(await run('pwd')).toString().trim(),uid=(await run('id','-u')).toString().trim(),inode=(await run('stat','-c','%d:%i','.')).toString().trim();
 if(root!==`/data/user/${userId}/${target.package}`||!/^\d+$/.test(uid)||!/^\d+:\d+$/.test(inode))throw Error('Native data root identity unavailable');
 return {target:{serial:target.serial,package:target.package,userId},signingHash:signingHash!,root,uid,inode};
}
async function identity(adb:resource.Adb,inputTarget:resource.Target,authorization?:unknown):Promise<resource.Identity>{
 const facts=await inspect(adb,inputTarget,authorization,{readOnlyIdentity:true}),target=facts.target;
 const token=(await adb('shell','run-as',target.package,'--user',target.userId,'sh','-c',`'if test -f ${marker}; then cat ${marker}; else printf ABSENT; fi'`)).toString().trim();
 if(token!=='ABSENT'&&!/^[a-f0-9]{64}$/.test(token))throw Error('Native marker identity unavailable');
 return proof({kind:'identity',id:hash({...facts,token:token==='ABSENT'?null:token}),...facts});
}
async function snapshot(adb:resource.Adb,inputTarget:resource.Target,authorization:unknown,expected:{id:string}):Promise<resource.Current>{
 const facts=await inspect(adb,inputTarget,authorization),target=facts.target;
 const token=(await adb('shell','run-as',target.package,'--user',target.userId,'cat',marker)).toString().trim();
 if(!/^[a-f0-9]{64}$/.test(token)||hash({...facts,token})!==expected.id)throw Error('Native data generation changed');
 return proof({kind:'current',id:expected.id,...facts,token});
}
async function rebuild(runtime:resource.Runtime,adb:resource.Adb,inputTarget:resource.Target,authorization:unknown,{record=()=>{}}:{record?:(event:resource.Event)=>void}={}):Promise<resource.Rebuilt>{
 if(!scope.validate(authorization)||authorization.host==='chrome'||!authorization.intents.includes('data-reset'))throw Error('App data reset is outside authorized scope');
 const before=await inspect(adb,inputTarget,authorization),target=nativeTarget(before.target),attempt=runtime.beginRebuild(proof({kind:'inspection',...before}));
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
 const run=(...args:string[])=>adb('shell','run-as',target.package,'--user',target.userId,...args);
 stage='empty-data';const empty=(await run('sh','-c',"'test ! -e files && test ! -e databases && test ! -e shared_prefs && test ! -e app_webview && echo EMPTY'")).toString().trim();
 if(empty!=='EMPTY')throw Error('Rebuilt App data is not observably empty');
 stage='native-marker';const token=randomBytes(32).toString('hex');
 await run('sh','-c',`'mkdir -p files && printf %s ${token} > ${marker}'`);
 const id=hash({...after,token}),current=await snapshot(adb,target,authorization,{id});
 await stopped();
 const result=proof({...current,kind:'rebuilt',attempt,clear,empty,before,observedAt:new Date().toISOString()});
 stage='store-registration';record({phase:'verified',proof:result});runtime.completeRebuild(result);return result;
 }catch(raw){const error=raw as ErrorView;record({phase:'failed',stage,code:typeof error.code==='string'||typeof error.code==='number'?error.code:null,stdout:String(error.stdout??'').slice(-4096),stderr:String(error.stderr??'').slice(-4096),reason:String(error.message).slice(0,512)});throw error}
}
const resource={inspect,identity,snapshot,rebuild,checked};
export = resource;
