'use strict';
const path = require('node:path');
const fs = require('node:fs');
const {createHash} = require('node:crypto');
// A failed checker must not leave a stale experiment artifact. Tracked runtime stays intact.
fs.rmSync(path.join(__dirname,'dist'),{recursive:true,force:true});
const compiler = process.env.PAISLEY_TSC || require.resolve('typescript/bin/tsc');
const compilerRoot = path.resolve(path.dirname(compiler),'..');
if (require(path.join(compilerRoot,'package.json')).version !== '6.0.2') throw Error('Expected TypeScript 6.0.2');
const ts = require(path.join(compilerRoot,'lib/typescript.js'));
const typeRoots = process.env.PAISLEY_TYPE_ROOTS || path.join(__dirname,'node_modules/@types');
const sourceFile = path.resolve(__dirname,'../../../scripts/lib/source-find.mts');
const runtimeFile = path.resolve(__dirname,'../../../scripts/lib/source-find.cjs');
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
  const emit = module => ts.transpileModule(source,{fileName:'source-find.ts',compilerOptions:{target:ts.ScriptTarget.ES2022,module,newLine:ts.NewLineKind.LineFeed}}).outputText;
  const generated = `// Generated from source-find.mts by TypeScript 6.0.2; source-lf-sha256=${createHash('sha256').update(source).digest('hex')}\n` + emit(ts.ModuleKind.CommonJS);
  if(process.argv.length>3 || process.argv[2] && !['--write-production','--check'].includes(process.argv[2])) throw Error('Use --check or --write-production');
  const writing = process.argv[2]==='--write-production';
  if(!writing && (!fs.existsSync(runtimeFile)||lf(fs.readFileSync(runtimeFile,'utf8'))!==generated)){
    console.error('SOURCE_BUILD_DRIFT: regenerate with build.cjs --write-production; runtime was not changed.');process.exitCode=1;
  } else {
    // Prepare fallible experiment output first. Publish the tracked runtime last.
    fs.mkdirSync(path.join(__dirname,'dist'));
    fs.writeFileSync(path.join(__dirname,'dist/source-find.mjs'),emit(ts.ModuleKind.ES2022));
    if(writing){
      const {owned}=require('../../../scripts/lib/owned-files.cjs');
      const stage=fs.mkdtempSync(path.join(path.dirname(runtimeFile),'.source-find-build-'));
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
    console.log('PASS: strict types and tracked CommonJS runtime match authoritative TS');
  }
}
