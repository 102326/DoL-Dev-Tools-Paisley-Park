import type cdp from './cdp.cjs';
declare namespace business {
 type Client=Pick<cdp.Client,'send'>;
 interface Macro {sha256:string;handlerSha256?:string;captures?:Record<string,string>}
 interface FunctionSpec {expr:string;sha256:string;captures?:Record<string,string>}
 interface Profile {widgets:Record<string,Macro>;functionMacros:Record<string,Macro>;functions:Record<string,FunctionSpec>&{updateMoment:FunctionSpec}}
 interface Held {objectGroup:string;objects:{state:unknown}}
 interface Retained {name:string;source:string;objectId:unknown;objectGroup:string;definitionId?:unknown;functionId?:unknown}
 interface Binding {bundleId:unknown;widgets:number;functions:number}
 type SourceFunction=(bindings:unknown)=>unknown;
}
interface RemoteView {exceptionDetails?:unknown;result?:{type?:unknown;objectId?:unknown}}
const {checkBindings}:{checkBindings:business.SourceFunction}=require('./browser-abi/native-business-bindings.cjs');
// Shared binding of reviewed original business functions; callers own cleanup and Outcome.
const {createHash}:typeof import('node:crypto')=require('node:crypto'),contracts:typeof import('./game-contract.cjs')=require('./game-contract.cjs');
const {functionSource,captured,member,sameObject}=contracts;
const sha=(s:string)=>createHash('sha256').update(s).digest('hex');


async function bind(client:business.Client,held:business.Held,profile:business.Profile,groups:string[]):Promise<business.Binding>{
    const widgets:business.Retained[]=[],functions:{name:string;expr:string;objectId:unknown;source:string}[]=[],closures:{objectId:unknown;source:string}[]=[];
    const retainCaptured=async(id:unknown,captures:Record<string,string>|undefined)=>{for(const [name,hash] of Object.entries(captures||{})){
      let fn=id;for(const key of name.split('.'))fn=await captured(client,fn,key,'function',{maxResponseBytes:8*1024*1024});
      const source=await functionSource(client,fn);if(sha(source)!==hash)throw Error('Native clothing captured function differs');closures.push({objectId:fn,source});
    }};
    for(const [name,p]of Object.entries(profile.widgets)){
      const w=await contracts.attestWidget(client,name,p.sha256,{retain:true,handlerSha256:p.handlerSha256});groups.push(w.objectGroup);widgets.push(w);
    }
    for(const [name,p]of Object.entries(profile.functionMacros)){
      const w=await contracts.attestFunctionMacro(client,name,p.sha256,{retain:true,handlerSha256:p.handlerSha256});groups.push(w.objectGroup);widgets.push(w);
      await retainCaptured(w.functionId,p.captures);
    }
    for(const [name,p]of Object.entries(profile.functions)){
      const r=await client.send('Runtime.evaluate',{expression:p.expr,objectGroup:held.objectGroup,returnByValue:false,silent:true}) as RemoteView;
      if(r.exceptionDetails||r.result?.type!=='function'||!r.result.objectId)throw Error('Native clothing function unavailable: '+name);
      const source=await functionSource(client,r.result.objectId);if(sha(source)!==p.sha256)throw Error('Native clothing function differs: '+name);
      functions.push({name,expr:p.expr,objectId:r.result.objectId,source});await retainCaptured(r.result.objectId,p.captures);
    }
    const moment=functions.find(r=>r.name==='updateMoment')!,momentState=await captured(client,moment.objectId,'State','object',{maxResponseBytes:8*1024*1024});
    if(!await sameObject(client,momentState,held.objects.state))throw Error('Native original moment State differs');
    const getter=await member(client,held.objects.state,'Object.getOwnPropertyDescriptor(window,"V")?.get',held.objectGroup);
    if(await functionSource(client,getter)!=='()=>_active.variables')throw Error('Native variables getter differs');
    const active=await captured(client,getter,'_active','object',{maxResponseBytes:8*1024*1024});
    if(!await sameObject(client,active,await member(client,held.objects.state,'this.active',held.objectGroup)))throw Error('Native active variables owner differs');
    const refs=[...widgets.flatMap(w=>[{objectId:w.objectId},...(w.definitionId?[{objectId:w.definitionId}]:[]),...(w.functionId?[{objectId:w.functionId}]:[])]),...functions.map(f=>({objectId:f.objectId})),...closures.map(f=>({objectId:f.objectId})),{objectId:getter},{objectId:active}];
    const raw=await client.send('Runtime.callFunctionOn',{objectId:held.objects.state,objectGroup:held.objectGroup,returnByValue:false,arguments:refs,functionDeclaration:`function(){
      const refs=Array.from(arguments);let i=0;
      const macros=${JSON.stringify(widgets.map(w=>({name:w.name,body:w.definitionId?w.source:null,functionSource:w.functionId?w.source:null})))}.map(row=>({...row,handler:refs[i++],...(row.body===null?{fn:refs[i++]}:{definition:refs[i++]})}));
      const globals=${JSON.stringify(functions.map(({name,expr,source})=>({name,expr,source})))}.map(row=>({...row,value:refs[i++]}));
      const captures=${JSON.stringify(closures.map(({source})=>({source})))}.map(row=>({...row,value:refs[i++]}));
      return Object.freeze({state:this,macros,globals,captures,getter:refs[i++],active:refs[i++]});
    }`}) as RemoteView;
    if(raw.exceptionDetails||!raw.result?.objectId)throw Error('Native clothing source bundle unavailable');
    return {bundleId:raw.result.objectId,widgets:widgets.length,functions:functions.length};
}
const business={bind,checkBindings};
export = business;
