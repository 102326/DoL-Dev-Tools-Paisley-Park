'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { findSource, parseRequest } = require('../scripts/lib/source-find.cjs');
const tree = {
  'map/rooms.twee': ':: TrainingRoom [room]\nEnter TrainingRoom\n<<routeMenu>>\n',
  'time/clock.js': 'function advanceClock() { return 1; }\n',
  'wardrobe/controls.twee': ':: wardrobe [widget]\n<<widget "outfitMenu">>\n虚构衣柜 [a+b]\n<</widget>>\n',
  'settings/menu.css': '#settings-panel { color: blue; }\n',
  'events/actions.js': 'document.addEventListener("practice:done", advanceClock);\n',
};
async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'weather-source-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  for (const [file, content] of Object.entries(tree)) {
    await fs.mkdir(path.dirname(path.join(root,file)), {recursive:true});
    await fs.writeFile(path.join(root,file), content);
  }
  return root;
}
const req = (root, kind, value, extra = {}) => ({ schemaVersion:1, root, clues:[{kind,value}], ...extra });
test('literal search covers distinct synthetic areas, reports definitions and exact Unicode location', async t => {
  const root = await fixture(t);
  for (const [kind, value, file] of [
    ['passage','TrainingRoom','map/rooms.twee'], ['symbol','advanceClock','time/clock.js'],
    ['widget','outfitMenu','wardrobe/controls.twee'], ['selector','#settings-panel','settings/menu.css'],
    ['event','practice:done','events/actions.js'], ['text','虚构衣柜 [a+b]','wardrobe/controls.twee'],
    ['path','settings/','settings/menu.css'],
  ]) {
    const r = await findSource(req(root,kind,value));
    assert.equal(r.complete,true);
    assert.equal(r.candidates[0].file,file);
    assert.match(r.candidates[0].sha256,/^[a-f0-9]{64}$/);
  }
  const r = await findSource(req(root,'passage','TrainingRoom'));
  assert.equal(r.candidates[0].basis[0].role,'definition');
  assert.equal(r.candidates[0].line,1);
  assert.equal(r.candidates[1].basis[0].role,'reference');
  assert.equal((await findSource(req(root,'text','[a+b]'))).candidates.length,1);
});
test('request boundary rejects malformed limits, fields and potentially huge inputs before filesystem', () => {
  for (const request of [req('/no-file','text','x',{extra:1}),req('/no-file','text','x',{limits:{maxBytes:NaN}}),
    req('/no-file','regex','.*'),req('relative','text','x'),req('/no-file','text','x'.repeat(513)),
    req('/no-file','text','x',{revision:'-bad'}),req('/no-file','text','x',{limits:{contextLines:4}})]) {
    assert.throws(() => parseRequest(request),{code:'SOURCE_REQUEST_INVALID',stage:'request'});
  }
});
test('bounds distinguish partial from no matches, preserve ambiguity and exclude private/symlink files', async t => {
  const root = await fixture(t);
  await fs.mkdir(path.join(root,'profiles'));
  await fs.writeFile(path.join(root,'profiles','private.js'),'secret-marker');
  await fs.writeFile(path.join(root,'.env'),'secret-marker');
  await fs.symlink(path.join(root,'events'),path.join(root,'linked-events'),'junction');
  assert.deepEqual((await findSource(req(root,'text','practice:done'))).candidates.map(c => c.file),['events/actions.js']);
  assert.equal((await findSource(req(root,'text','secret-marker'))).candidates.length,0);
  const r = await findSource(req(root,'text','not present',{limits:{maxFiles:1}}));
  assert.equal(r.complete,false);
  assert.ok(r.partialReasons.includes('max-files'));
  assert.equal(r.outcome,'partial');
  const hit = await findSource(req(root,'text','advanceClock',{limits:{maxResults:1}}));
  assert.equal(hit.candidates.length,1);
  assert.ok(hit.partialReasons.includes('max-results'));
  assert.equal((await findSource(req(root,'text','not present'))).outcome,'none');
});
test('fixed Git revision never reads changed working bytes or traverses a tracked symlink', async t => {
  const root = await fixture(t);
  const git = (...args) => execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  git('init','-q'); git('add','.');
  git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');
  const sha = git('rev-parse','HEAD');
  await fs.writeFile(path.join(root,'map/rooms.twee'),':: ChangedRoom\n');
  const current = await findSource(req(root,'passage','ChangedRoom'));
  assert.equal(current.source.dirty,true);
  assert.equal(current.source.mode,'worktree');
  const pinned = await findSource(req(root,'passage','TrainingRoom',{revision:sha}));
  assert.equal(pinned.source.commit,sha);
  assert.equal(pinned.source.mode,'revision');
  assert.equal(pinned.candidates[0].line,1);
  await assert.rejects(findSource(req(root,'text','x',{revision:'nonexistent'})),{code:'SOURCE_REVISION_UNAVAILABLE'});
  const subdir = path.join(root,'map');
  await assert.rejects(findSource(req(subdir,'text','x',{revision:sha})),{code:'SOURCE_REVISION_UNAVAILABLE'});
});
test('cancellation and source errors use finite sanitized diagnostics', async t => {
  const root = await fixture(t);
  const controller = new AbortController(); controller.abort();
  await assert.rejects(findSource(req(root,'text','x'),controller.signal),{code:'SOURCE_CANCELLED',stage:'search'});
  await assert.rejects(findSource(req(path.join(root,'private-missing'),'text','x')),e =>
    e.code === 'SOURCE_ROOT_UNAVAILABLE' && !e.message.includes(root));
});
test('commit identity is independent of local Git replace refs', async t => {
  const root = await fixture(t);
  const git = (...args) => execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  git('init','-q'); git('add','.');
  git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','original');
  const original = git('rev-parse','HEAD');
  await fs.writeFile(path.join(root,'map/rooms.twee'),':: ReplacementRoom\n');
  git('add','.'); git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','replacement');
  git('replace',original,git('rev-parse','HEAD'));
  const result = await findSource(req(root,'passage','TrainingRoom',{revision:original}));
  assert.equal(result.source.commit,original);
  assert.equal(result.complete,true);
  assert.equal(result.candidates[0]?.file,'map/rooms.twee');
});
test('unsupported encoding cannot certify complete no-match; attempted files consume budget', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root,'utf16.js'),Buffer.from('needle','utf16le'));
  const result = await findSource(req(root,'text','needle'));
  assert.equal(result.complete,false);
  assert.ok(result.partialReasons.includes('binary-or-unsupported-encoding'));
  const limited = await findSource(req(root,'text','x',{limits:{maxFiles:1,maxBytes:1}}));
  assert.equal(limited.stats.filesAttempted,1);
  assert.ok(limited.partialReasons.includes('max-files'));
});
test('ignored source files are not advertised as clean commit bytes', async t => {
  const root = await fixture(t);
  const git = (...args) => execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
  await fs.writeFile(path.join(root,'.gitignore'),'ignored.js\n');
  git('init','-q'); git('add','.'); git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');
  await fs.writeFile(path.join(root,'ignored.js'),'const ignoredOnly = 1;\n');
  const result = await findSource(req(root,'symbol','ignoredOnly'));
  assert.equal(result.candidates[0].file,'ignored.js');
  assert.equal(result.source.dirty,true);
});
test('in-flight abort and elapsed deadline terminate large searches with distinct diagnostics', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root,'large.js'),'const value = 1;\n'.repeat(100000));
  await assert.rejects(findSource(req(root,'text','absent',{limits:{timeoutMs:1}})),{code:'SOURCE_TIMEOUT',stage:'search'});
  const controller = new AbortController();
  const pending = findSource(req(root,'text','absent'),controller.signal);
  setImmediate(() => controller.abort());
  await assert.rejects(pending,{code:'SOURCE_CANCELLED',stage:'search'});
});
test('an abort delivered by the final directory read cannot become complete no-match', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'weather-empty-'));
  t.after(() => fs.rm(root,{recursive:true,force:true}));
  const controller = new AbortController(), original = fs.readdir, real = await fs.realpath(root);
  fs.readdir = async (...args) => {
    const value = await original(...args);
    if (args[0] === real) controller.abort();
    return value;
  };
  require('node:module').syncBuiltinESMExports();
  try { await assert.rejects(findSource(req(root,'text','x'),controller.signal),{code:'SOURCE_CANCELLED'}); assert.equal(controller.signal.aborted,true); }
  finally { fs.readdir = original; require('node:module').syncBuiltinESMExports(); }
});
test('a long final line cannot report success after its elapsed search budget', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(),'weather-longline-'));
  t.after(() => fs.rm(root,{recursive:true,force:true}));
  await fs.writeFile(path.join(root,'long.js'),'x'.repeat(8*1024*1024-1)+'Z');
  const request = req(root,'text','Z',{limits:{timeoutMs:100}});
  request.clues = Array.from({length:8},()=>({kind:'text',value:'Z'}));
  const started = performance.now();
  let result;
  try { result = await findSource(request); }
  catch (error) { assert.equal(error.code,'SOURCE_TIMEOUT'); return; }
  assert.equal(result.candidates.length,1);
  assert.ok(performance.now()-started < 120,'over-budget synchronous work must not return success');
});
test('literal lookup includes native TS modules and stylesheet sources',async t=>{
  const root=await fixture(t);
  for(const extension of ['mts','cts','tsx','jsx','scss','sass','less']){
    await fs.writeFile(path.join(root,'new.'+extension),'typedScene_marker');
    const result=await findSource(req(root,'text','typedScene_marker'));
    assert.ok(result.candidates.some(c=>c.file==='new.'+extension),extension);
  }
});

test('long-line context shows the earliest Unicode match and identifies omitted text', async t => {
  const root = await fixture(t);
  await fs.writeFile(path.join(root,'long.js'), '😀'.repeat(1001) + 'needle' + '尾'.repeat(300) + '\nshort needle\n');
  const result = await findSource(req(root,'text','needle',{limits:{contextLines:1}}));
  const hit = result.candidates.find(c => c.file === 'long.js' && c.line === 1);
  assert.equal(hit.column,1002);
  assert.ok(hit.context[0].text.includes('needle'));
  assert.ok(hit.context[0].text.startsWith('…'));
  assert.ok(hit.context[0].text.endsWith('…'));
  assert.equal(hit.context[0].truncated,true);
  assert.ok(hit.context[0].column > 1);
  assert.equal(hit.context[0].column + Array.from(hit.context[0].text.slice(1).split('needle')[0]).length, hit.column);
  assert.ok(Array.from(hit.context[0].text).length <= 240);
  assert.deepEqual(hit.context[1],{line:2,column:1,text:'short needle',truncated:false});
  const combined = req(root,'path','long.js',{limits:{contextLines:0}});
  combined.clues.push({kind:'text',value:'needle'});
  const mixed = (await findSource(combined)).candidates.find(c => c.file === 'long.js' && c.line === 1);
  assert.equal(mixed.column,1); // Preserve path-match candidate coordinates.
  assert.ok(mixed.context[0].text.includes('needle'));
  await fs.writeFile(path.join(root,'end.js'),'x'.repeat(300)+'needle');
  const endHit = (await findSource(req(root,'text','needle'))).candidates.find(c => c.file === 'end.js');
  assert.ok(endHit.context[0].text.startsWith('…'));
  assert.ok(endHit.context[0].text.endsWith('needle'));
  assert.equal(endHit.context[0].truncated,true);
  const longClue = '界'.repeat(512);
  await fs.writeFile(path.join(root,'clue.js'),'x'.repeat(300) + longClue);
  const longHit = (await findSource(req(root,'text',longClue))).candidates.find(c => c.file === 'clue.js');
  assert.equal(longHit.column,301);
  assert.ok(longHit.context[0].text.includes('界'));
  assert.ok(!longHit.context[0].text.includes(longClue));
  assert.equal(longHit.context[0].truncated,true);
});
