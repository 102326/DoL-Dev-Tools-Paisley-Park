const {test}=require('node:test'),assert=require('node:assert/strict'),{collect,project}=require('../scripts/lib/native-layout.cjs');
test('native layout is explicit, bounded, neutral and projects no native text or private resource names',async()=>{
 const nodes=[{class:'android.widget.Button',resourceId:'com.example:id/private',text:'PRIVATE_TEXT',contentDesc:'PRIVATE_DESCRIPTION',bounds:'[0,0][100,40]',interactions:['clickable','PRIVATE_ACTION'],state:['focused'],extra:'PRIVATE_EXTRA'}];
 const projected=project(nodes);assert.equal(projected.nodes[0].textPresent,true);assert.equal(JSON.stringify(projected).includes('PRIVATE'),false);assert.deepEqual(projected.nodes[0].bounds,[0,0,100,40]);assert.equal(project(Array(201).fill(nodes[0])).truncated,true);assert.throws(()=>project({nodes}));
 let calls=0;await assert.rejects(collect({options:{serial:'selected'}} ,async()=>{calls++}));assert.equal(calls,0);
 const result=await collect({options:{serial:'selected',allowHelper:true}},async(exe,args,settings)=>{calls++;assert.ok(args.includes('--no-metrics'));assert.ok(args.includes('--flat'));assert.ok(args.includes('--device=selected'));assert.equal(settings.timeout,15000);return{stdout:JSON.stringify(nodes)}});assert.equal(result.nodes.length,1);
 const unsupported=await collect({options:{serial:'selected',allowHelper:true}},async()=>{throw Error('PRIVATE_STDERR')});assert.equal(unsupported.collectorStatus,'unsupported');assert.equal(JSON.stringify(unsupported).includes('PRIVATE'),false);
});
