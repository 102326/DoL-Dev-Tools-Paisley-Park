'use strict';
const path = require('node:path');
const fs = require('node:fs');
const {createHash} = require('node:crypto');
// Developer-only shared generation; production consumers load the checked-in CJS.
function build({sourceFile,runtimeFile,distDir=null,esm=false,args=process.argv.slice(2)}) {
// Keep the existing source-finder experiment output contract. The standalone
// Skill resolver has no disposable output directory: --check is read-only.
if(distDir)fs.rmSync(distDir,{recursive:true,force:true});
const compiler = process.env.PAISLEY_TSC || require.resolve('typescript/bin/tsc');
const compilerRoot = path.resolve(path.dirname(compiler),'..');
if (require(path.join(compilerRoot,'package.json')).version !== '6.0.2') throw Error('Expected TypeScript 6.0.2');
const ts = require(path.join(compilerRoot,'lib/typescript.js'));
const typeRoots = process.env.PAISLEY_TYPE_ROOTS || path.join(__dirname,'node_modules/@types');
const lf = text => text.replace(/\r\n/g,'\n');
const source = lf(fs.readFileSync(sourceFile,'utf8'));
const options = {strict:true,noEmit:true,noEmitOnError:true,erasableSyntaxOnly:true,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.Node16,
  moduleResolution:ts.ModuleResolutionKind.Node16,types:['node'],typeRoots:[typeRoots]};
const host = ts.createCompilerHost(options),read = host.readFile;
host.readFile = file => path.resolve(file) === sourceFile ? source : read(file);
const diagnostics = ts.getPreEmitDiagnostics(ts.createProgram([sourceFile],options,host));
if(diagnostics.length){
  console.error(ts.formatDiagnosticsWithColorAndContext(diagnostics,{getCurrentDirectory:()=>process.cwd(),getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));
  process.exitCode=1;
} else {
  const emit = module => ts.transpileModule(source,{fileName:path.basename(sourceFile).replace(/\.mts$/,'.ts'),compilerOptions:{target:ts.ScriptTarget.ES2022,module,newLine:ts.NewLineKind.LineFeed}}).outputText;
  const generated = `// Generated from ${path.basename(sourceFile)} by TypeScript 6.0.2; source-lf-sha256=${createHash('sha256').update(source).digest('hex')}\n` + emit(ts.ModuleKind.CommonJS);
  if(args.length>1 || args[0] && !['--write-production','--check'].includes(args[0])) throw Error('Use --check or --write-production');
  const writing = args[0]==='--write-production';
  if(!writing && (!fs.existsSync(runtimeFile)||lf(fs.readFileSync(runtimeFile,'utf8'))!==generated)){
    console.error('SOURCE_BUILD_DRIFT: '+path.basename(sourceFile)+'; regenerate with '+(esm?'build.cjs':'build-resolver.cjs')+' --write-production; runtime was not changed.');process.exitCode=1;
  } else {
    // Prepare fallible experiment output first. Publish the tracked runtime last.
    if(distDir){fs.mkdirSync(distDir);fs.writeFileSync(path.join(distDir,esm?'source-find.mjs':path.basename(runtimeFile)),esm?emit(ts.ModuleKind.ES2022):generated)}
    if(writing){
      const {owned}=require('../../../scripts/lib/owned-files.cjs');
      const stage=fs.mkdtempSync(path.join(path.dirname(runtimeFile),'.'+path.basename(runtimeFile)+'-build-'));
      const tracker=owned();let recorded=false;
      try{
        tracker.adopt(stage);recorded=true;
        const staged=path.join(stage,'runtime.cjs');tracker.write(staged,generated);
        if(fs.readFileSync(staged,'utf8')!==generated)throw Error('Generated staging verification failed');
        fs.renameSync(staged,runtimeFile); // Intentional atomic replacement of this generated file only.
      }finally{
        if(!recorded||!tracker.cleanup())console.error('SOURCE_BUILD_CLEANUP_UNKNOWN: preserve unconfirmed temporary files.');
      }
    }
    console.log('PASS: strict types and tracked CommonJS runtime match '+path.basename(sourceFile));
  }
}

}
module.exports={build};
