'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const compiled = require('./dist/engine.js');
(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(),'weather-native-'));
  try {
    // Identical source bytes, only .mts selects ESM. No text rewriting or second implementation.
    const source = await fs.readFile(path.join(__dirname,'src/engine.ts'));
    const file = path.join(dir,'engine.mts'); await fs.writeFile(file,source);
    const native = await import(pathToFileURL(file));
    const root = path.join(dir,'source'); await fs.mkdir(root);
    await fs.writeFile(path.join(root,'room.twee'),':: PracticeRoom\n<<widget "sampleMenu">>\n#menu practice:done\n<</widget>>\n');
    for (const [kind,value] of [['passage','PracticeRoom'],['widget','sampleMenu'],['selector','#menu'],['event','practice:done'],['text','absent']]) {
      const request = {schemaVersion:1,root,clues:[{kind,value}]};
      assert.deepEqual(await native.findSource(request),await compiled.findSource(request));
    }
    for (const api of [native,compiled]) {
      assert.throws(()=>api.parseRequest({schemaVersion:2}),{code:'SOURCE_REQUEST_INVALID'});
      const controller = new AbortController(); controller.abort();
      await assert.rejects(api.findSource({schemaVersion:1,root,clues:[{kind:'text',value:'x'}]},controller.signal),{code:'SOURCE_CANCELLED'});
    }
    console.log(JSON.stringify({node:process.version,sourceSha256:createHash('sha256').update(source).digest('hex'),mode:'native .mts copy vs compiled CommonJS',equalQueries:5,invalidAndCancelledEqual:true,typeCheckingAtRuntime:false}));
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
})().catch(e=>{console.error(JSON.stringify({error:e.code||'NATIVE_PROBE_FAILED'}));process.exitCode=1;});
