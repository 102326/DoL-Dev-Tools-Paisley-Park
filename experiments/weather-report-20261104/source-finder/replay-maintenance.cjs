'use strict';
const path = require('node:path');
const assert = require('node:assert/strict');
const { findSource } = require('./dist/engine.js');
// Existing real maintenance investigations, not newly discovered bugs or fair A/B trials.
const root = path.resolve(__dirname,'../../../scripts/lib');
const tasks = [
  { name:'safe-game-version-query', clues:[{kind:'symbol',value:'getModListNameNoAlias'}], expected:['environment.cjs','collectors.cjs'], followup:'tests/environment.test.cjs' },
  { name:'hash-navigation-invalidates-holder', clues:[{kind:'event',value:'Page.navigatedWithinDocument'}], expected:['execution-context.cjs'], followup:'tests/execution-context.test.cjs' },
];
(async () => {
  const evidence = [];
  for (const task of tasks) {
    const result = await findSource({schemaVersion:1,root,clues:task.clues,limits:{maxResults:10}});
    assert.equal(result.complete,true);
    const actual = new Set(result.candidates.map(c=>c.file));
    for (const expected of task.expected) assert.ok(actual.has(expected),task.name + ': missing expected source');
    evidence.push({name:task.name,source:result.source,candidates:result.candidates.map(c=>({file:c.file,line:c.line,sha256:c.sha256,basis:c.basis})),followup:task.followup});
  }
  console.log(JSON.stringify({scope:'existing public tool-source maintenance replays, not game validation',tasks:evidence},null,2));
})().catch(e=>{ console.error(JSON.stringify({error:{code:e.code||'REPLAY_FAILED',stage:e.stage||'replay'}}));process.exitCode=1; });
