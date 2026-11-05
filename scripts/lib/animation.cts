import type {ExecFileOptions} from 'node:child_process';
declare namespace animation {
 interface Options {intervalMs?:number;maxFrames?:number}
 type Runner=(file:string,args:string[],settings:ExecFileOptions)=>Promise<{stdout:string|Buffer}>;
 interface Report {schemaVersion:number;incidentId:string;source:string;sourceSha256:string;capturedAt:string;durationSeconds:number;dimensions:number[];intervalMs:number;maxFrames:number;status:'failed'|'partial'|'complete';truncated:boolean;minimumExpectedFrames:number;frameTimeBasis:string;requiresPrivacyReview:boolean;artifacts:{filename:string;sha256:string;bytes:number;frameAtSeconds:number}[];reason?:string}
}
interface Probe {streams?:{width?:unknown;height?:unknown}[];format?:{duration?:unknown}}
const fs:typeof import('node:fs')=require('node:fs'),path:typeof import('node:path')=require('node:path'),{promisify}:typeof import('node:util')=require('node:util'),{execFile}:typeof import('node:child_process')=require('node:child_process'),{createHash,randomUUID}:typeof import('node:crypto')=require('node:crypto');
const hash=(value:string|Buffer)=>createHash('sha256').update(value).digest('hex');
function readVideo(file:string){
  const fd=fs.openSync(file,'r');
  try{const stat=fs.fstatSync(fd);if(!stat.isFile()||stat.size>128*1024*1024)throw Error('Invalid video size');const data=Buffer.alloc(stat.size);let offset=0;
    while(offset<data.length){const n=fs.readSync(fd,data,offset,data.length-offset,null);if(!n)throw Error('Video changed during read');offset+=n}
    if(fs.readSync(fd,Buffer.alloc(1),0,1,null))throw Error('Video grew during read');return data;
  }finally{fs.closeSync(fd)}
}
async function extract(input:string,out:string,options:animation.Options={},run:animation.Runner=promisify(execFile)):Promise<animation.Report>{
  const intervalMs=options.intervalMs??250,maxFrames=options.maxFrames??30;
  if(Object.keys(options).some(k=>!['intervalMs','maxFrames'].includes(k))||!Number.isInteger(intervalMs)||intervalMs<100||intervalMs>5000||!Number.isInteger(maxFrames)||maxFrames<1||maxFrames>30||!out)throw Error('Invalid animation options');
  const file=fs.realpathSync(input),stat=fs.statSync(file),ext=path.extname(file).toLowerCase();
  if(!stat.isFile()||stat.size>128*1024*1024||!['.mp4','.webm'].includes(ext))throw Error('Invalid local video');
  const source=readVideo(file);
  if(ext==='.mp4'&&(source.length<16||source.toString('ascii',4,8)!=='ftyp')||ext==='.webm'&&(source.length<4||!source.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))))throw Error('Invalid video signature');
  const settings={encoding:'utf8',timeout:5000,maxBuffer:65536,windowsHide:true};let metadata:Probe;
  try{const probe=await run(process.env.DOL_FFPROBE||'ffprobe',['-v','error','-protocol_whitelist','file,pipe','-select_streams','v:0','-show_entries','stream=width,height:format=duration','-of','json',file],settings);metadata=JSON.parse(probe.stdout as string) as Probe}catch(e){throw Error((e as {code?:unknown}|null|undefined)?.code==='ENOENT'?'Optional ffprobe unavailable':'Video metadata unavailable')}
  const width=metadata.streams?.[0]?.width as number,height=metadata.streams?.[0]?.height as number,duration=Number(metadata.format?.duration);
  if(!Number.isSafeInteger(width)||width<=0||!Number.isSafeInteger(height)||height<=0||width*height>8000000||!Number.isFinite(duration)||duration<=0||duration>30)throw Error('Unsupported video dimensions or duration');
  const output=path.resolve(out);fs.mkdirSync(output);
  const report:animation.Report={schemaVersion:1,incidentId:randomUUID(),source:'Animation frames',sourceSha256:hash(source),capturedAt:new Date().toISOString(),durationSeconds:duration,dimensions:[width,height],intervalMs,maxFrames,
    status:'failed',truncated:Math.ceil(duration*1000/intervalMs)>maxFrames,minimumExpectedFrames:Math.min(maxFrames,Math.floor(duration*1000/intervalMs)),frameTimeBasis:'theoretical fps sample index; exact source PTS not recovered',requiresPrivacyReview:true,artifacts:[]};
  let decodeError:string|undefined;
  try{
    try{await run(process.env.DOL_FFMPEG||'ffmpeg',['-nostdin','-n','-hide_banner','-loglevel','error','-protocol_whitelist','file,pipe','-threads','1','-i',file,'-map','0:v:0','-vf',`fps=1000/${intervalMs}`,'-frames:v',String(maxFrames),'-threads','1','-an','-sn','-dn','-map_metadata','-1','-f','image2',path.join(output,'frame-%03d.png')],{...settings,timeout:30000})}catch(e){decodeError=(e as {code?:unknown}|null|undefined)?.code==='ENOENT'?'Optional ffmpeg unavailable':'Frame extraction failed'}
    for(let i=1;i<=maxFrames;i++){
      const name=`frame-${String(i).padStart(3,'0')}.png`,frame=path.join(output,name);
      if(!fs.existsSync(frame))continue;
      try{
        if(path.dirname(fs.realpathSync(frame))!==fs.realpathSync(output)||!fs.statSync(frame).isFile()||fs.statSync(frame).size>64*1024*1024)throw Error();
        const png=fs.readFileSync(frame);
        if(png.length<24||!png.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))||png.readUInt32BE(16)!==width||png.readUInt32BE(20)!==height)throw Error();
        if(i!==report.artifacts.length+1)decodeError='Missing extracted frame';
        report.artifacts.push({filename:name,sha256:hash(png),bytes:png.length,frameAtSeconds:(i-1)*intervalMs/1000});
      }catch{decodeError='Invalid extracted frame'}
    }
    if(report.artifacts.length<report.minimumExpectedFrames&&!decodeError)decodeError='Fewer frames than duration requires';
    try{if(hash(readVideo(file))!==report.sourceSha256)throw Error()}catch{decodeError='Source changed or unavailable during extraction'}
    report.status=decodeError?(report.artifacts.length?'partial':'failed'):report.artifacts.length?'complete':'failed';
    if(decodeError||!report.artifacts.length)report.reason=decodeError||'No decoded frames';
  }finally{fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(report,null,2),{flag:'wx'})}
  return report;
}
const animation={extract};
export = animation;
