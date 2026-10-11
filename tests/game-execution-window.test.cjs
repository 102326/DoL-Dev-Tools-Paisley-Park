'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
test('Gameplay Journey preserves scoped save execution window and shorter caller deadlines',async t=>{
  const base=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-window-'));t.after(()=>fs.rmSync(base,{recursive:true,force:true}));
  const scope={workspace:process.cwd(),serial:'fixture',package:'com.example.fixture',userId:'0',signingHash:'abc',intents:['navigation','save'],dataDomain:'app-user-data'};
  let captured;t.mock.method(require('../scripts/lib/journey.cjs'),'run',async(options,plan)=>{captured=plan.plan.timeoutMs;return {status:'failed',incidentId:'window-fixture',cleanup:[]}});
  const provider=require('../scripts/lib/game-dol-provider.cjs');
  for(const [authorization,timeoutMs,expected] of [[undefined,120000,30000],[scope,120000,120000],[scope,90000,90000],[scope,15000,15000],[{...scope,intents:['navigation']},120000,30000]]){
    const out=path.join(base,String(expected)+'-'+fs.readdirSync(base).length);fs.mkdirSync(out);
    await provider.act({out,serial:scope.serial,package:scope.package,authorization,timeoutMs,testEnvironment:true},{type:'web-click',selector:'#native'},'navigation');assert.equal(captured,expected);
  }
});
