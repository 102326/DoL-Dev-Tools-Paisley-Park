'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const compiled = require('../../../scripts/lib/source-find.cjs');
(async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(),'weather-native-'));
  try {
    // Generated native comparison view vs authoritative CTS output; no second implementation.
    const source = await fs.readFile(path.resolve(__dirname,'../../../scripts/lib/source-find.cts'));
    const native = require('../../../scripts/lib/source-find.mts');
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
    console.log(JSON.stringify({node:process.version,sourceSha256:createHash('sha256').update(source).digest('hex'),mode:'generated native MTS view of authoritative CTS vs prebuilt CommonJS',equalQueries:5,invalidAndCancelledEqual:true,typeCheckingAtRuntime:false}));
  } finally { await fs.rm(dir,{recursive:true,force:true}); }
})().catch(e=>{console.error(JSON.stringify({error:e.code||'NATIVE_PROBE_FAILED'}));process.exitCode=1;});
