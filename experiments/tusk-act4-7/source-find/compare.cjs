'use strict';
// Neutral, local-only comparison. Both module paths must be reviewed executable code.
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const cp = require('node:child_process'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
async function compare() {
  if (process.argv.length !== 4) throw Error('EXPECTED_TWO_REVIEWED_MODULES');
  const modules = process.argv.slice(2).map(file=>path.resolve(file));
  const hashes = await Promise.all(modules.map(async file=>createHash('sha256').update(await fs.readFile(file)).digest('hex')));
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'paisley-source-compare-'));
  const original = cp.execFile;
  let calls = 0;
  try {
    await Promise.all(Array.from({length:512},(_,i)=>fs.writeFile(path.join(root,String(i).padStart(4,'0')+'.twee'),`:: SyntheticRoom${i}\n<<widget "neutralWidget${i}">>Neutral scene ${i}<</widget>>\n`)));
    const env = Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.toUpperCase().startsWith('GIT_')));
    const git = (...args)=>cp.execFileSync('git',['-C',root,...args],{env,encoding:'utf8'}).trim();
    git('init','-q'); git('add','.'); git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','neutral fixture');
    const request = {schemaVersion:1,root,revision:git('rev-parse','HEAD'),clues:[{kind:'widget',value:'neutralWidget511'}]};
    cp.execFile = function(...args) { if (args[0] === 'git') calls++; return original.apply(this,args); };
    async function run(module,timeoutMs) {
      calls=0; const start=performance.now();
      const data = await require(module).findSource({...request,limits:{timeoutMs}});
      return {data,summary:{ms:performance.now()-start,gitCalls:calls,files:data.stats.filesRead,candidates:data.candidates.length,complete:data.complete}};
    }
    const before=await run(modules[0],60000), after=await run(modules[1],60000), defaultBudget=await run(modules[1],10000);
    assert.deepEqual(after.data,before.data); assert.deepEqual(defaultBudget.data,after.data);
    assert.equal(after.data.complete,true); assert.equal(after.data.stats.filesRead,512);
    assert.equal(after.data.candidates.length,1); assert.equal(after.data.candidates[0].file,'0511.twee');
    console.log(JSON.stringify({syntheticFiles:512,beforeModuleSha256:hashes[0],afterModuleSha256:hashes[1],before:before.summary,after:after.summary,defaultBudget:defaultBudget.summary,identicalResults:true},null,2));
  } finally { cp.execFile=original; await fs.rm(root,{recursive:true,force:true}); }
}
compare().catch(error=>{console.error(['SOURCE_TIMEOUT','SOURCE_CANCELLED'].includes(error.code)?error.code:'SOURCE_COMPARISON_FAILED');process.exitCode=1;});
