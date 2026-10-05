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
