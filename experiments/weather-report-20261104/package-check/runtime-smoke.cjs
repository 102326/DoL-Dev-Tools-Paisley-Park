// Independent archive prerequisite/SQLite check; never opens an existing Store or contacts a target.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process');
const crypto=require('node:crypto');
const archive=path.resolve(process.argv[2]||'');
if(!process.argv[2]||!fs.statSync(archive).isFile())throw Error('Provide reviewed local package ZIP');
const cache=path.resolve('artifacts/weather-report-20261104/npm-cache');
const npmCli=fs.realpathSync(process.env.PAISLEY_NPM_CLI||path.resolve(path.dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js'));
const work=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'paisley-runtime-package-')));
function run(args,cwd=work){const r=spawnSync(process.execPath,args,{cwd,encoding:'utf8',timeout:30000,maxBuffer:1024*1024});if(r.status!==0)throw Error('PACKAGE_RUNTIME_CHECK_FAILED');return r.stdout;}
try{
 const unzip=spawnSync('python3',['-c','import sys,zipfile;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',archive,work]);assert.equal(unzip.status,0);
 const tools=path.join(work,'Paisley');
 run(['--no-global-search-paths','-e',"try{require('xstate');process.exit(8)}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e}"],tools);
 const missing=spawnSync(process.execPath,['--no-global-search-paths','-e',"require('./scripts/lib/game-runtime.cjs')"],{cwd:tools,encoding:'utf8'});
 assert.equal(missing.status,1);assert.match(missing.stderr,/Cannot find module 'xstate'/);
 run([npmCli,'ci','--ignore-scripts','--no-audit','--no-fund','--offline','--cache',cache],tools);
 const code=`const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
 const root=process.cwd(),resolved=fs.realpathSync(require.resolve('xstate'));
 assert(resolved.startsWith(path.join(root,'node_modules')+path.sep));
 assert.equal(JSON.parse(fs.readFileSync('node_modules/xstate/package.json')).version,'5.33.2');
 const {Runtime}=require('./scripts/lib/game-runtime.cjs');
 const file=path.join(root,'owned-smoke','sessions.sqlite');
 const provider={validateGoal:g=>g.description==='Owned empty-store smoke',scene:s=>s,satisfied:()=>false};
 const create=()=>new Runtime(file,{provider});let runtime=create();let id,deadline;
 try{const s=runtime.start({serial:'fixture-device',package:'com.example.fixture',userId:'0'},
 {mode:'gameplay',goal:{description:'Owned empty-store smoke'},budget:{timeoutMs:60000,maxActions:1,maxObservations:1,maxReplans:1,maxSpend:0}});
 id=s.id;deadline=s.deadline;assert.equal(runtime.db.prepare('PRAGMA user_version').get().user_version,2);
 assert.equal(Object.values(runtime.db.prepare('PRAGMA integrity_check').get())[0],'ok');
 assert.equal(runtime.status(id).openEffects.length,0);
 }finally{runtime.close()}
 runtime=create();try{assert.equal(runtime.status(id).id,id);assert.equal(runtime.status(id).deadline,deadline);
 assert.equal(runtime.status(id).config.goal.description,'Owned empty-store smoke');
 assert.equal(runtime.db.prepare('SELECT count(*) n FROM effects').get().n,0)}finally{runtime.close()}
 console.log(JSON.stringify({xstateVersion:'5.33.2',dependencyResolvedInsidePackage:true,sqliteSchema:2,integrity:'ok',sessionReopened:true,openEffects:0,dispatched:0}));`;
 const result=JSON.parse(run(['--no-global-search-paths','--experimental-sqlite','-e',code],tools));
 console.log(JSON.stringify({node:process.version,archiveSha256:crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex'),missingDependencyRefused:true,offlineLockedInstall:true,...result},null,2));
}finally{fs.rmSync(work,{recursive:true,force:true})}
