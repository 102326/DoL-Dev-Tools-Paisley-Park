const assert=require('node:assert/strict');
const {test}=require('node:test');
const {connect}=require('../scripts/lib/cdp.cjs');

test('CDP transport bounds responses per request without leaking protocol bodies',async()=>{
  const oldFetch=global.fetch,oldSocket=global.WebSocket;
  let reply,socket,requests=0,eventCount=0;
  global.fetch=async()=>({ok:true,json:async()=>[{type:'page',title:'Degrees of Lewdity',webSocketDebuggerUrl:'ws://127.0.0.1/debug'}]});
  global.WebSocket=class{
    constructor(){socket=this;queueMicrotask(()=>this.onopen())}
    send(source){requests++;const request=JSON.parse(source);if(reply)queueMicrotask(()=>this.onmessage({data:reply(request)}))}
    close(){}
  };
  const open=()=>connect('http://127.0.0.1',20,()=>eventCount++);
  try{
    let client=await open();
    reply=()=>JSON.stringify({id:1,error:{code:-32000,message:'private response body'}});
    await assert.rejects(client.send('DOM.getDetachedDomNodes'),error=>error.code==='CDP_COMMAND_REJECTED'&&error.protocolCode===-32000&&!error.message.includes('private'));
    client.close();

    client=await open();
    reply=request=>JSON.stringify({id:request.id,result:{padding:'x'.repeat(4*1024*1024+64)}});
    await assert.rejects(client.send('DOM.getDetachedDomNodes'),error=>error.code==='CDP_RESPONSE_TOO_LARGE');
    client.close();

    client=await open();
    reply=request=>JSON.stringify({id:request.id,result:{padding:'x'.repeat(4*1024*1024+64)}});
    const large=await client.send('DOM.getDetachedDomNodes',{}, {maxResponseBytes:8*1024*1024});
    assert.equal(large.padding.length,4*1024*1024+64);
    client.close();

    client=await open();
    const unicode=JSON.stringify({id:1,result:{text:'界'.repeat(8)}});
    assert.ok(Buffer.byteLength(unicode,'utf8')>unicode.length);
    reply=()=>unicode;
    await assert.rejects(client.send('DOM.getDetachedDomNodes',{}, {maxResponseBytes:unicode.length}),error=>error.code==='CDP_RESPONSE_TOO_LARGE');
    client.close();

    client=await open();
    const beforeInvalid=requests;
    await assert.rejects(client.send('Runtime.evaluate',{}, {maxResponseBytes:8*1024*1024}),error=>error.code==='CDP_INVALID_RESPONSE_LIMIT');
    await assert.rejects(client.send('DOM.getDetachedDomNodes',{}, {maxResponseBytes:64*1024*1024+1}),error=>error.code==='CDP_INVALID_RESPONSE_LIMIT');
    await assert.rejects(client.send('DOM.getDetachedDomNodes',{}, {maxResponseBytes:8*1024*1024,extra:true}),error=>error.code==='CDP_INVALID_RESPONSE_LIMIT');
    assert.equal(requests,beforeInvalid);
    client.close();

    client=await open();
    reply=null;
    const pending=client.send('DOM.getDetachedDomNodes',{}, {maxResponseBytes:8*1024*1024});
    const largeEvent=JSON.stringify({method:'Runtime.consoleAPICalled',params:{padding:'x'.repeat(4*1024*1024+64)}});
    socket.onmessage({data:largeEvent});
    await assert.rejects(pending,error=>error.code==='CDP_RESPONSE_TOO_LARGE');
    assert.equal(eventCount,0);
    client.close();

    client=await open();
    reply=null;
    const otherPending=client.send('DOM.getDetachedDomNodes',{}, {maxResponseBytes:8*1024*1024});
    socket.onmessage({data:JSON.stringify({id:999,result:{padding:'x'.repeat(4*1024*1024+64)}})});
    await assert.rejects(otherPending,error=>error.code==='CDP_RESPONSE_TOO_LARGE');
    client.close();

    client=await open();
    reply=()=>'{';
    await assert.rejects(client.send('DOM.getDetachedDomNodes'),error=>error.code==='CDP_INVALID_RESPONSE');
    client.close();

    client=await open();
    reply=null;
    await assert.rejects(client.send('DOM.getDetachedDomNodes'),error=>error.code==='ETIMEDOUT');
    client.close();
  }finally{global.fetch=oldFetch;global.WebSocket=oldSocket}
});
