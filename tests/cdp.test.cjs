const assert=require('node:assert/strict');
const {test}=require('node:test');
const {connect}=require('../scripts/lib/cdp.cjs');

test('CDP timeouts identify discovery, connection and command without replay or input disclosure',async()=>{
  const oldFetch=global.fetch,oldSocket=global.WebSocket;
  let opened=false,sends=0,closed=0;
  try{
    global.fetch=async()=>{throw new DOMException('PRIVATE_ENDPOINT','TimeoutError')};
    await assert.rejects(connect('http://127.0.0.1',5),e=>e.code==='CDP_DISCOVERY_TIMEOUT'&&e.cdpStage==='cdp.discovery'&&!e.message.includes('PRIVATE'));
    global.fetch=async()=>{throw Object.assign(Error('PRIVATE_NETWORK_TIMEOUT'),{code:'ETIMEDOUT'})};
    await assert.rejects(connect('http://127.0.0.1',5),e=>e.code==='ETIMEDOUT'&&e.cdpStage==='cdp.discovery'&&!e.message.includes('PRIVATE'));
    global.fetch=async()=>({ok:true,json:async()=>[{type:'page',id:'owned',webSocketDebuggerUrl:'ws://127.0.0.1/owned'}]});
    global.WebSocket=class {constructor(){if(opened)queueMicrotask(()=>this.onopen())}send(){sends++}close(){closed++}};
    await assert.rejects(connect('http://127.0.0.1',5,()=>{},'owned'),e=>e.code==='CDP_CONNECT_TIMEOUT'&&e.cdpStage==='cdp.connect');
    assert.equal(closed,1);assert.equal(sends,0);
    opened=true;
    const client=await connect('http://127.0.0.1',5,()=>{},'owned');
    try{
      await assert.rejects(client.send('Page.getFrameTree',{private:'PRIVATE_INPUT'}),e=>e.code==='ETIMEDOUT'&&e.cdpStage==='cdp.command'&&e.cdpMethod==='Page.getFrameTree'&&e.message==='CDP evaluation timeout'&&e.notDispatched!==true);
      await assert.rejects(client.send('PRIVATE_METHOD'),e=>e.code==='ETIMEDOUT'&&e.cdpMethod===undefined&&!e.message.includes('PRIVATE'));
      assert.equal(sends,2);
    }finally{client.close()}
  }finally{global.fetch=oldFetch;global.WebSocket=oldSocket}
});

test('CDP missing and ambiguous selection are distinct and never open a socket',async()=>{
  const oldFetch=global.fetch,oldSocket=global.WebSocket;let sockets=0,rows=[];
  try{
    global.fetch=async()=>({ok:true,json:async()=>rows});
    global.WebSocket=class {constructor(){sockets++}};
    await assert.rejects(connect('http://127.0.0.1',5,()=>{},'owned'),e=>e.code==='CDP_TARGET_MISSING');
    rows=[{type:'page',id:'owned'},{type:'page',id:'owned'}];
    await assert.rejects(connect('http://127.0.0.1',5,()=>{},'owned'),e=>e.code==='CDP_TARGET_AMBIGUOUS');
    assert.equal(sockets,0);
  }finally{global.fetch=oldFetch;global.WebSocket=oldSocket}
});

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
    reply=request=>JSON.stringify({id:request.id,result:{padding:'x'.repeat(4*1024*1024+64)}});
    const properties=await client.send('Runtime.getProperties',{objectId:'scope'}, {maxResponseBytes:8*1024*1024});
    assert.equal(properties.padding.length,4*1024*1024+64);
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
    await assert.rejects(client.send('Runtime.callFunctionOn',{}, {maxResponseBytes:8*1024*1024}),error=>error.code==='CDP_INVALID_RESPONSE_LIMIT');
    await assert.rejects(client.send('Runtime.getProperties',{}, {maxResponseBytes:16*1024*1024+1}),error=>error.code==='CDP_INVALID_RESPONSE_LIMIT');
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
    reply=null;
    const largeProperties=client.send('Runtime.getProperties',{objectId:'scope'},{maxResponseBytes:8*1024*1024});
    const defaultRequest=client.send('Runtime.evaluate',{expression:'1'});
    socket.onmessage({data:JSON.stringify({id:2,result:{padding:'x'.repeat(4*1024*1024+64)}})});
    await assert.rejects(defaultRequest,error=>error.code==='CDP_RESPONSE_TOO_LARGE');
    await assert.rejects(largeProperties,error=>error.code==='CDP_RESPONSE_TOO_LARGE');
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
