'use strict';
// Developer bootstrap only. Consumers run the checked-in CommonJS artifacts.
const fs=require('node:fs'),path=require('node:path'),{createHash,randomUUID}=require('node:crypto');
const {owned}=require('../../scripts/lib/owned-files.cjs');
const root=path.resolve(__dirname,'../..'),lf=value=>value.replace(/\r\n/g,'\n');
function snapshot(file){
 try{const stat=fs.lstatSync(file,{bigint:true});if(!stat.isFile())throw Error('TS_OUTPUT_NOT_REGULAR');return {stat,bytes:fs.readFileSync(file)}}
 catch(error){if(error.code==='ENOENT')return null;throw error}
}
function same(file,before){
 const now=snapshot(file);
 return before===null?now===null:now!==null&&now.stat.dev===before.stat.dev&&now.stat.ino===before.stat.ino&&now.stat.mode===before.stat.mode&&now.bytes.equals(before.bytes);
}
function publish(outputs,sources){
 // Exclusive mkdir coordinates cooperating builders, not arbitrary editors.
 const lock=owned(),lockPath=path.join(root,'.paisley-ts-build-lock');
 try{lock.mkdir(lockPath)}catch(error){if(error.code==='EEXIST')throw Error('TS_BUILD_BUSY: existing lock preserved; inspect its owner before retrying.');throw error}
 try{
 lock.write(path.join(lockPath,'owner.json'),JSON.stringify({pid:process.pid,nonce:randomUUID()}));
 for(const [file,source]of sources)if(lf(fs.readFileSync(file,'utf8'))!==source)throw Error('TS_INPUT_CHANGED');
 const tracker=owned(),stages=[],published=[];let retain=false;
 try{
  // Stage and read back the complete set before changing any runtime file.
  for(const [file,bytes]of outputs){
   const previous=snapshot(file),dir=fs.mkdtempSync(path.join(path.dirname(file),'.paisley-ts-'));
   tracker.adopt(dir);
   const fresh=path.join(dir,'new.cjs'),backup=path.join(dir,'previous.cjs');
   tracker.write(fresh,bytes);if(previous)tracker.write(backup,previous.bytes);
   const mode=previous?Number(previous.stat.mode&0o7777n):0o644;
   fs.chmodSync(fresh,mode);if(previous)fs.chmodSync(backup,mode);
   if(!fs.readFileSync(fresh).equals(bytes))throw Error('TS_STAGING_INVALID');
   stages.push({file,bytes,previous,fresh,backup,installed:snapshot(fresh)});
  }
  for(const item of stages){
   if(!same(item.file,item.previous))throw Error('TS_OUTPUT_CHANGED');
   fs.renameSync(item.fresh,item.file);
   published.push(item);
   if(!same(item.file,item.installed))throw Error('TS_PUBLICATION_INVALID');
  }
 }catch(error){
  let complete=true;
  for(const item of published.reverse()){
   try{
    // Refuse observed peer changes. Check+rename is not a filesystem CAS.
    if(!item.installed||!same(item.file,item.installed)){complete=false;continue}
    if(item.previous)fs.renameSync(item.backup,item.file);else fs.unlinkSync(item.file);
   }catch{complete=false}
  }
  if(!complete){retain=true;console.error('TS_ROLLBACK_INCOMPLETE: preserve unconfirmed outputs and staging.');return false}
  throw error;
 }finally{
  // Individual renames are atomic; a multi-file build is not a power-loss transaction.
  if(!retain&&!tracker.cleanup())console.error('TS_CLEANUP_UNKNOWN: preserve unconfirmed staging.');
 }
 return true;
 }finally{if(!lock.cleanup())console.error('TS_LOCK_CLEANUP_UNKNOWN: preserve the unconfirmed build lock.');}
}
function build(args=process.argv.slice(2)){
 if(args.length>1||args[0]&&!['--check','--write-production'].includes(args[0]))throw Error('Use --check or --write-production');
 const compiler=process.env.PAISLEY_TSC||require.resolve('typescript/bin/tsc');
 const compilerRoot=path.resolve(path.dirname(compiler),'..');
 if(require(path.join(compilerRoot,'package.json')).version!=='6.0.2')throw Error('TS_COMPILER_VERSION: expected TypeScript 6.0.2');
 const ts=require(path.join(compilerRoot,'lib/typescript.js'));
 const sources=new Map(),generated=new Map();
 const projects=[];
 for(const [name,browser]of [['browser-tsconfig.json',true],['tsconfig.json',false]]){
  const config=ts.readConfigFile(path.join(__dirname,name),file=>lf(fs.readFileSync(file,'utf8')));
  if(config.error)throw Error('TS_CONFIG_INVALID');
  const parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,__dirname);
  if(parsed.errors.length||!parsed.options.strict||!parsed.options.noEmitOnError)throw Error('TS_CONFIG_INVALID');
  if(browser&&(parsed.options.types?.length!==0||!parsed.options.declaration))throw Error('TS_BROWSER_CONFIG_INVALID');
  const files=parsed.fileNames.map(file=>path.resolve(file));
  for(const file of files){
   const relative=path.relative(root,file);
   if(relative.startsWith('..')||path.isAbsolute(relative)||!file.endsWith('.cts')||!fs.lstatSync(file).isFile()||sources.has(file))throw Error('TS_INPUT_INVALID');
   if(browser&&path.dirname(file)!==path.join(root,'probes/typescript'))throw Error('TS_BROWSER_INPUT_INVALID');
   sources.set(file,lf(fs.readFileSync(file,'utf8')));
  }
  projects.push({browser,parsed,files});
 }
 if(!sources.size)throw Error('TS_INPUT_INVALID');
 // Browser functions use DOM-only globals. Node consumes their emitted declarations,
 // never the browser source Program or DOM ambient globals.
 for(const {browser,parsed,files}of projects){
  const options={...parsed.options,noEmit:false,rootDir:root,outDir:path.join(__dirname,'.virtual-output'),
   ...(!browser&&process.env.PAISLEY_TYPE_ROOTS?{typeRoots:[process.env.PAISLEY_TYPE_ROOTS]}:{})};
  const host=ts.createCompilerHost(options),read=host.readFile,exists=host.fileExists;
  host.readFile=file=>sources.get(path.resolve(file))??generated.get(path.resolve(file))?.toString('utf8')??read(file);
  host.fileExists=file=>generated.has(path.resolve(file))||exists(file);
  const program=ts.createProgram(files,options,host);
  const diagnostics=ts.getPreEmitDiagnostics(program);
  if(diagnostics.length){console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>root,getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));return false}
  const before=generated.size;
  const emission=program.emit(undefined,(_file,text,_bom,_error,inputs)=>{
   const declaration=_file.endsWith('.d.cts');
   if(inputs?.length!==1||!files.includes(path.resolve(inputs[0].fileName))||!(declaration&&browser||_file.endsWith('.cjs')))throw Error('TS_OUTPUT_UNEXPECTED');
   const source=path.resolve(inputs[0].fileName),stem=browser?path.join(root,'scripts/lib/browser',path.basename(source,'.cts')):source.slice(0,-4),file=stem+(declaration?'.d.cts':'.cjs');
   if(generated.has(file))throw Error('TS_OUTPUT_DUPLICATE');
   const header=`// Generated from ${path.basename(source)} by TypeScript 6.0.2; source-lf-sha256=${createHash('sha256').update(sources.get(source)).digest('hex')}\n`;
   generated.set(file,Buffer.from(header+lf(text)));
  });
  if(emission.emitSkipped||emission.diagnostics.length||generated.size-before!==files.length*(browser?2:1))throw Error('TS_EMIT_INCOMPLETE');
 }
 // Keep the opt-in native-TS comparison input, never a second authoritative source.
 const finder=path.join(root,'scripts/lib/source-find.cts');
 if(sources.has(finder))generated.set(finder.slice(0,-4)+'.mts',Buffer.from('// Generated native comparison view from source-find.cts; edit the CTS source.\n'+sources.get(finder)));
 if(args[0]==='--write-production'){
  const changed=new Map([...generated].filter(([file,bytes])=>{const old=snapshot(file);return !old||lf(old.bytes.toString('utf8'))!==bytes.toString('utf8')}));
  if(!publish(changed,sources))return false;
 }else{
  const changed=[...generated].filter(([file,bytes])=>{const old=snapshot(file);return !old||lf(old.bytes.toString('utf8'))!==bytes.toString('utf8')});
  if(changed.length){console.error('SOURCE_BUILD_DRIFT: '+changed.map(([file])=>path.relative(root,file)).join(', ')+'; run tools/typescript/build.cjs --write-production. Runtime files were not changed.');return false}
 }
 console.log(`PASS: ${projects[1].files.length} strict Node modules, ${projects[0].files.length} DOM-only browser modules and their ${generated.size} artifacts match the complete Program emission.`);return true;
}
if(require.main===module){try{if(!build())process.exitCode=1}catch(error){console.error(error.message);process.exitCode=1}}
module.exports={build};
