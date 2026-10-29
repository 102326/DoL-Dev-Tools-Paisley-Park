const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const env = require('../scripts/lib/environment.cjs');
const { evidence } = require('../scripts/lib/evidence.cjs');
function runtime(utils) {
  return JSON.parse(JSON.stringify(vm.runInNewContext(`(${env.snapshot.toString()})()`, {
    window: { modUtils: utils, StartConfig: { version: '0.5.12.13' }, get V() { throw Error('private game state'); } },
    innerWidth: 800, innerHeight: 600, devicePixelRatio: 2,
  })));
}
const utils = { version: () => '2.101.1', getModListNameNoAlias: () => ['Example'],
  getMod: () => ({ version: '1.2.3', get bootJson() { throw Error('whole metadata must not be read'); } }) };

test('version discovery does not query missing names and keeps actual dependency errors observable',async()=>{
  for(const reader of ['environment','versions']){
    for(const mode of ['missing','present','dependency-error','no-list','invalid-list']){
      const calls=[],logs=[];
      const loader={getModListNameNoAlias:()=>mode==='invalid-list'?null:mode==='missing'?[]:['GameVersion'],getMod:name=>{
        calls.push(name);
        if(mode==='missing'||mode==='no-list'||mode==='invalid-list'){logs.push('missing-name');return null}
        if(mode==='dependency-error'){logs.push('actual-dependency-error');throw Error('PRIVATE_DEPENDENCY')}
        return {version:'1.2.3'};
      }};
      if(mode==='no-list')delete loader.getModListNameNoAlias;
      const window={modUtils:loader},globals={window,innerWidth:800,innerHeight:600,devicePixelRatio:1};
      const value=reader==='environment'?vm.runInNewContext(`(${env.snapshot.toString()})()`,globals):await require('../scripts/lib/collectors.cjs').versions({client:{evaluate:source=>vm.runInNewContext(source,globals)}});
      if(['missing','no-list','invalid-list'].includes(mode)){assert.deepEqual(calls,[]);assert.deepEqual(logs,[]);assert.equal(value.gameVersionSources.gameVersionMod,null)}
      if(mode==='present'){assert.equal(value.gameVersionSources.gameVersionMod,'1.2.3');assert.equal(calls.length,reader==='environment'?2:1)}
      if(mode==='dependency-error'){assert(logs.includes('actual-dependency-error'));assert.equal(value.gameVersionSources.gameVersionMod,null)}
    }
  }
});
test('version observations retain separate sources and preserve legacy Environment contracts', async()=>{
  const result=runtime({...utils,getMod:name=>name==='GameVersion'?null:{version:'1.2.3'}});
  assert.equal(result.gameVersion,'0.5.12.13');assert.deepEqual(result.gameVersionSources,{startConfig:'0.5.12.13',gameVersionMod:null});
  const observed=await require('../scripts/lib/collectors.cjs').versions({client:{evaluate:expression=>vm.runInNewContext(expression,{window:{StartConfig:{version:'0.5.12.13'},modUtils:{getMod:()=>null}}})}});
  assert.equal(observed.gameVersion,null);assert.equal(observed.gameVersionSources.startConfig,'0.5.12.13');assert.equal(observed.gameVersionSources.gameVersionMod,null);
  const old=data();delete old.runtime.gameVersionSources;assert.doesNotThrow(()=>env.contract(old));
  const current=data();current.runtime=result;assert.equal(env.contract(current).fields['runtime.gameVersionSources.startConfig'],'0.5.12.13');
  current.runtime.gameVersionSources.startConfig={secret:'PRIVATE'};assert.throws(()=>env.contract(current),/Invalid environment field/);
});
function data() { return { schemaVersion: 1, source: 'Environment', device: { androidVersion: '16', model: 'test' },
  app: { package: 'com.example.app', versionName: '1.0', versionCode: '1', foregroundMatches: true },
  provider: env.provider('Current WebView package (name, version): (com.google.android.webview, 154.0.0.0)'),
  webview: { product: 'Chrome/154.0.0.0', protocolVersion: '1.3', jsVersion: '1.0' }, runtime: runtime(utils) }; }
test('environment reads only public metadata and reports unknown inventory/order accurately', () => {
  const result = runtime(utils);
  assert.deepEqual(result.mods.items, [{ name: 'Example', version: '1.2.3', reportedIndex: 0, enabled: null, loadOrder: null }]);
  assert.equal(runtime(null).mods.status, 'unavailable');
  assert.equal(runtime({ ...utils, getModListNameNoAlias() { throw Error('private exception'); } }).mods.status, 'failed');
  const many = runtime({ ...utils, getModListNameNoAlias: () => Array.from({ length: 301 },(_,i)=>'Mod'+i) });
  assert.equal(many.mods.items.length, 300); assert.equal(many.mods.truncated, true);
  assert.equal(env.provider('unknown system dump').collectorStatus, 'unsupported');
  const a = data(), b = structuredClone(a); b.runtime.viewport.width = 900; b.runtime.mods.items[0].version = '2.0';
  const changes = env.diff({ data: a },b).changes;
  assert.ok(changes.some(c=>c.field==='runtime.viewport.width'));
  assert.ok(changes.some(c=>c.mod==='Example' && c.fields.includes('version')));
  b.runtime.gameVersion = { account: 'secret' };
  assert.throws(()=>env.diff(a,b),/Invalid environment field/);
  b.runtime.gameVersion = '0.5'; b.runtime.mods.items.push(b.runtime.mods.items[0]);
  assert.throws(()=>env.contract(b),/Invalid mod metadata/);
});
test('environment profile avoids screenshot/performance and requested CSS failure preserves other evidence', async t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(),'dol-environment-')); t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const calls=[];
  const methods={
    device: async c=>{c.deviceReady=true;return data().device}, app: async c=>{c.appPid='123';return data().app},
    provider: async()=>data().provider, forward: async c=>{c.endpoint='http://localhost:1';return {verified:true}},
    cdp: async c=>{c.client={evaluate:async()=>data().runtime,close(){}};return {connected:true}},
    webview: async()=>data().webview, versions: async()=>({gameVersion:'0.5',loaderVersion:'2.0'}),
    screenshot: async()=>{calls.push('screenshot');return {binary:Buffer.from('fixture'),extension:'png'}},
    gfx: async()=>{calls.push('performance');return {}},mem:async()=>({}),
    css: async()=>{throw Error('private error')},dom:async()=>({schemaVersion:1,nodes:[]}),
    consoleSummary:async()=>({}),networkSummary:async()=>({}),
  };
  const base={serial:'offline-device',package:'com.example.app',windowMs:0};
  const report=await evidence({...base,out:path.join(root,'env'),profile:'environment'},{collectors:methods});
  assert.equal(report.status,'complete');assert.deepEqual(calls,[]);
  const captured=JSON.parse(fs.readFileSync(path.join(root,'env/environment.json'),'utf8')).data;
  assert.doesNotThrow(()=>env.contract(captured));
  const partial=await evidence({...base,out:path.join(root,'css-failure'),css:true,environment:true,scope:'#passages'},{collectors:methods});
  assert.equal(partial.status,'partial');assert.ok(fs.existsSync(path.join(root,'css-failure/environment.json')));
  assert.equal(partial.steps.find(s=>s.name==='css-contract').errorContent,'omitted');
  await assert.rejects(evidence({...base,out:path.join(root,'invalid'),css:true}),/requires --scope/);
  assert.equal(fs.existsSync(path.join(root,'invalid')),false);
});

test('a real failed CDP collection step retains earlier artifacts and legacy reason with additive diagnostics',async t=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'paisley-cdp-partial-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  for(const [code,stage,message,reason] of [
    ['ETIMEDOUT','cdp.command','CDP evaluation timeout','CDP evaluation timeout'],
    ['ETIMEDOUT','cdp.discovery','CDP discovery timeout','timeout'],
    ['CDP_DISCOVERY_TIMEOUT','cdp.discovery','CDP discovery timeout','collector-error'],
    ['CDP_CONNECT_TIMEOUT','cdp.connect','CDP connection timeout','CDP connection timeout'],
  ]){
    const output=path.join(root,stage+'-'+code);
    const report=await evidence({serial:'owned-fixture',package:'com.example.fixture',out:output,profile:'environment',windowMs:0},
      {adb:()=>{throw Error('Device access forbidden')},collectors:{
        device:async ctx=>{ctx.deviceReady=true;return {model:'owned'}},app:async ctx=>{ctx.appPid='1';return {package:'com.example.fixture'}},
        provider:async()=>({status:'unsupported'}),forward:async ctx=>{ctx.endpoint='http://127.0.0.1:1';return {verified:true}},
        cdp:async()=>{throw Object.assign(Error(message),{code,cdpStage:stage,cdpMethod:'Page.getFrameTree'})},
      }});
    assert.equal(report.status,'partial');const failed=report.steps.find(s=>s.name==='cdp');assert.equal(failed.status,'failed');
    assert.equal(failed.reason,reason);assert.equal(failed.diagnostic.stage,stage);
    if(stage==='cdp.command')assert.equal(failed.diagnostic.method,'Page.getFrameTree');
    assert(report.steps.filter(s=>s.artifact).length>=2);
    for(const step of report.steps.filter(s=>s.artifact))assert(fs.existsSync(path.join(output,step.artifact.filename)));
  }
});
