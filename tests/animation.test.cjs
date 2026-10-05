const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {extract}=require('../scripts/lib/animation.cjs');
test('animation uses bounded offline tools, validates frames and preserves failed extraction',async t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'dol-animation-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const video=path.join(root,'source.mp4'),header=Buffer.alloc(16);header.write('ftyp',4);fs.writeFileSync(video,header);const calls=[];
 const run=async(exe,args,opts)=>{calls.push({args,opts});if(args.includes('-of'))return{stdout:JSON.stringify({streams:[{width:2,height:2}],format:{duration:'1',secret:'PRIVATE'}})};
 const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(2,16);png.writeUInt32BE(2,20);fs.writeFileSync(args.at(-1).replace('%03d','001'),png);throw Error('private stderr')};
 const report=await extract(video,path.join(root,'frames'),{intervalMs:100,maxFrames:3},run);assert.equal(report.status,'partial');assert.equal(report.artifacts.length,1);assert.equal(report.truncated,true);assert.equal(JSON.stringify(report).includes('PRIVATE'),false);assert.equal(JSON.stringify(report).includes(root),false);assert.ok(calls.every(c=>c.args.includes('file,pipe')&&c.opts.windowsHide));assert.equal(calls[1].opts.timeout,30000);assert.ok(calls[1].args.includes('-nostdin'));
 await assert.rejects(extract(video,path.join(root,'frames'),{},run),{code:'EEXIST'});
 await assert.rejects(extract(video,path.join(root,'missing'),{},async()=>{throw Object.assign(Error(),{code:'ENOENT'})}),/ffprobe unavailable/);assert.equal(fs.existsSync(path.join(root,'missing')),false);
 await assert.rejects(extract(video,path.join(root,'invalid'),{},async()=>({stdout:JSON.stringify({streams:[{width:2,height:2}],format:{duration:31}})})),/duration/);
 const changed=await extract(video,path.join(root,'changed'),{maxFrames:1},async(exe,args)=>{if(args.includes('-of'))return{stdout:JSON.stringify({streams:[{width:2,height:2}],format:{duration:1}})};const png=Buffer.alloc(24);Buffer.from([137,80,78,71,13,10,26,10]).copy(png);png.writeUInt32BE(2,16);png.writeUInt32BE(2,20);fs.writeFileSync(args.at(-1).replace('%03d','001'),png);fs.appendFileSync(video,'changed');return{stdout:''}});assert.equal(changed.status,'partial');assert.match(changed.reason,/Source changed/);
});
