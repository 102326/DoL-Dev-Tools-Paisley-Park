'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {connect}=require('../scripts/lib/cdp.cjs');
async function fixture(t){
 const saved={fetch:global.fetch,WebSocket:global.WebSocket};let socket,closed=0;const requests=[],events=[];
 t.after(()=>{global.fetch=saved.fetch;global.WebSocket=saved.WebSocket});
 global.fetch=async()=>({ok:true,json:async()=>[{type:'page',id:'owned',webSocketDebuggerUrl:'ws://127.0.0.1/owned'}]});
 global.WebSocket=class{constructor(){socket=this;queueMicrotask(()=>this.onopen())}send(text){requests.push(JSON.parse(text))}close(){closed++}};
 const client=await connect('http://127.0.0.1',1000,(method,params)=>events.push({method,params}),'owned');t.after(()=>client.close());
 return {client,requests,events,reply:packet=>socket.onmessage({data:JSON.stringify(packet)}),get closed(){return closed}};
}
test('unknown command replies and events retain values and settle only their original request',async t=>{
 const f=await fixture(t),pending=f.client.send('Fixture.read',{counter:1});
 f.reply({id:999,result:'unrelated'});assert.equal(f.client.isOpen(),true);
 f.reply({method:'Fixture.changed',params:{count:2}});assert.deepEqual(f.events,[{method:'Fixture.changed',params:{count:2}}]);
 f.reply({id:f.requests[0].id,result:{count:3}});assert.deepEqual(await pending,{count:3});assert.equal(f.requests.length,1);
 const evaluated=f.client.evaluate('({count:4})');f.reply({id:f.requests[1].id,result:{result:{value:{count:4}}}});assert.deepEqual(await evaluated,{count:4});
});
test('malformed reply closes all pending reads without replay',async t=>{
 const f=await fixture(t),a=f.client.send('Fixture.first'),b=f.client.send('Fixture.second');
 const failedA=assert.rejects(a,{code:'CDP_INVALID_RESPONSE'}),failedB=assert.rejects(b,{code:'CDP_INVALID_RESPONSE'});
 f.reply({id:f.requests[0].id});await Promise.all([failedA,failedB]);assert.equal(f.client.isOpen(),false);assert.equal(f.closed,1);assert.equal(f.requests.length,2);
});
test('response-limit rejection and unserializable input do not send or replay commands',async t=>{
 const f=await fixture(t);await assert.rejects(f.client.send('Runtime.evaluate',{}, {maxResponseBytes:8*1024*1024}),{code:'CDP_INVALID_RESPONSE_LIMIT'});
 const cyclic={};cyclic.self=cyclic;await assert.rejects(f.client.send('Fixture.read',cyclic),/CDP send failed/);assert.equal(f.requests.length,0);
 const valid=f.client.send('Runtime.getProperties',{}, {maxResponseBytes:8*1024*1024});f.reply({id:f.requests[0].id,result:{result:[]}});assert.deepEqual(await valid,{result:[]});assert.equal(f.requests.length,1);
});
test('protocol and page exceptions keep their distinct existing failure semantics',async t=>{
 const f=await fixture(t),rpc=f.client.send('Fixture.read');f.reply({id:f.requests[0].id,error:{code:-32000,message:'omitted fixture cause'}});
 await assert.rejects(rpc,error=>error.code==='CDP_COMMAND_REJECTED'&&error.protocolCode===-32000);
 const page=f.client.evaluate('throw 1');f.reply({id:f.requests[1].id,result:{exceptionDetails:{text:'synthetic page failure'}}});await assert.rejects(page,/synthetic page failure/);
 assert.equal(f.client.isOpen(),true);assert.equal(f.requests.length,2);
});
