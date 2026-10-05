const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { expression, storageDiff } = require('../scripts/lib/inspectors.cjs');

function node(tag, children = [], attrs = []) {
  const item = { tagName: tag, children, parentElement: null, hidden: false, tabIndex: 0,
    scrollWidth: 20, scrollHeight: 20, clientWidth: 10, clientHeight: 10, scrollTop: 0, scrollLeft: 0,
    getBoundingClientRect: () => ({ x: 0, y: 0, width: 20, height: 20 }),
    hasAttribute: name => attrs.includes(name), getAttribute: name => name === 'role' && attrs.includes('role') ? 'button' : null,
    closest: () => null,
    get textContent() { throw Error('private text'); }, get innerHTML() { throw Error('private HTML'); },
    get value() { throw Error('private input'); }, get backgroundImage() { throw Error('private URL'); } };
  for (const child of children) child.parentElement = item;
  return item;
}
function dom(mode, scope = '.hud', root = node('SECTION', [node('BUTTON')]), colors = {}) {
  return vm.runInNewContext(expression(mode, scope), {
    document: { querySelectorAll: () => [root] },
    getComputedStyle: target => ({ display: 'block', visibility: 'visible', position: 'relative', zIndex: '1',
      opacity: '1', transform: 'none', filter: 'none', overflowX: 'auto', overflowY: 'auto',
      color: colors[target.tagName]?.color ?? 'rgb(0, 0, 0)',
      backgroundColor: colors[target.tagName]?.background ?? 'rgb(255, 255, 255)',
      get backgroundImage() { throw Error('private CSS URL'); } }),
  });
}

test('DOM inspectors stay bounded, report heuristic and unknown ownership, and omit private getters', () => {
  assert.throws(() => expression('ownership', 'x'.repeat(257)));
  const root = node('SECTION', Array.from({ length: 205 }, () => node('SPAN')));
  const owned = dom('ownership', '.hud', root);
  assert.equal(owned.nodes.length, 200);
  assert.equal(owned.truncated, true);
  assert.equal(owned.attribution, 'unknown without explicit integration');
  assert.equal(owned.nodes.every(item => item.owner === 'unknown'), true);
  const health = dom('selector-health', '.a.b.c.d:nth-child(2) + .x');
  assert.equal(health.count, 1);
  assert.equal(health.heuristicOnly, true);
  const ambiguous = vm.runInNewContext(expression('selector-health', '.hud'), {document:{querySelectorAll:()=>[root,root]}});
  assert.equal(ambiguous.count,2); assert.equal(ambiguous.unique,false);
  const missing = vm.runInNewContext(expression('selector-health', '.hud'), {document:{querySelectorAll:()=>[]}});
  assert.equal(missing.count,0); assert.equal(missing.unique,false);
  assert.ok(health.fragilityReasons.includes('sibling combinator'));
  assert.ok(health.fragilityReasons.includes('long class chain'));
  assert.equal(JSON.stringify(owned).includes('private'), false);
});

test('accessibility contrast is limited to simple colors; overlays, scroll and hitboxes remain descriptive', () => {
  const root = node('SECTION', [node('BUTTON', [], ['aria-label', 'role'])]);
  const access = dom('accessibility', '.hud', root);
  assert.equal(access.nodes[1].labelPresent, true);
  assert.equal(access.nodes[1].role, 'button');
  assert.equal(access.nodes[1].contrastRatio, 21);
  const unknown = dom('accessibility', '.hud', root, { BUTTON: { color: 'var(--text)' } });
  assert.equal(unknown.nodes[1].contrastRatio, null);
  const alpha = dom('accessibility', '.hud', root, {BUTTON:{background:'rgba(1, 1, 1, 0.5)'}});
  assert.equal(alpha.nodes[1].contrastRatio, null);
  const overlay = dom('overlays', '.hud', root);
  assert.equal(overlay.globalOrder, 'unknown');
  assert.ok(overlay.nodes[0].stackingContextReasons.includes('position and z-index'));
  const scroll = dom('scroll', '.hud', root);
  assert.equal(scroll.nodes[1].nestedScroll, true);
  const hitboxes = dom('hitboxes', '.hud', root);
  assert.equal(hitboxes.intersections.length, 1);
  assert.equal(hitboxes.intersections[0].a, '0');
});

const area = keys => ({ length: keys.length, key: i => keys[i],
  get getItem() { throw Error('private storage body'); } });
const context = indexedDB => ({ window: { localStorage: area(['public-key', 'x'.repeat(129)]), sessionStorage: area(['session-key']) },
  crypto: webcrypto, TextEncoder, indexedDB, Date, setTimeout, clearTimeout });

test('storage uses hashes and counts, with no IndexedDB open when enumeration is unavailable', async () => {
  let opened = false;
  const data = await vm.runInNewContext(expression('storage'), context({ open() { opened = true; } }));
  assert.equal(opened, false);
  assert.equal(data.local.count, 2);
  assert.equal(data.local.omitted, 1);
  assert.equal(data.local.keys[0].hash.length, 64);
  assert.equal(data.session.count, 1);
  assert.equal(data.indexedDB.status, 'unsupported');
  assert.equal(JSON.stringify(data).includes('public-key'), false);
  const after = structuredClone(data);
  after.local.count = 3;
  const complete = structuredClone(data); complete.local.omitted = 0;
  const completeAfter = structuredClone(complete);completeAfter.local.count=3;
  const changes = storageDiff(complete, completeAfter).changes;
  assert.equal(storageDiff(data, after).incomplete,true);
  assert.ok(changes.some(change => change.area === 'local' && change.kind === 'count'));
  const unsupported=structuredClone(complete);unsupported.local={status:'unsupported',count:null,keys:[],omitted:0};
  assert.deepEqual(storageDiff(complete,unsupported).changes.filter(c=>c.area==='local'),[{area:'local',kind:'unobserved'}]);
  after.local.keys.push({ hash: after.local.keys[0].hash });
  assert.throws(() => storageDiff(data, after), /Invalid storage metadata/);
  let now=0,lateOpen=false;
  const lateContext=context({databases:async()=>[{name:'db',version:1}],open(){lateOpen=true;throw Error('must not open after deadline')}});
  lateContext.window={localStorage:area([]),sessionStorage:area([])};
  lateContext.Date={now:()=>now};lateContext.crypto={subtle:{digest:async()=>{now=8001;return new ArrayBuffer(32)}}};
  const late=await vm.runInNewContext(expression('storage'),lateContext);
  assert.equal(lateOpen,false);assert.equal(late.indexedDB.status,'partial');
});

test('IndexedDB enumeration counts existing stores and aborts an upgrade race', async () => {
  let closed = false, readonly = false;
  const indexedDB = {
    databases: async () => [{ name: 'existing-db', version: 1 }],
    open() {
      const request = {};
      setTimeout(() => {
        request.result = { objectStoreNames: ['records'], close() { closed = true; },
          transaction(name, mode) {
            assert.equal(name, 'records'); readonly = mode === 'readonly';
            return { abort() {}, objectStore() { return { count() {
              const count = {};
              setTimeout(() => { count.result = 7; count.onsuccess(); }, 0);
              return count;
            } }; } };
          } };
        request.onsuccess();
      }, 0);
      return request;
    },
  };
  const data = await vm.runInNewContext(expression('storage'), context(indexedDB));
  assert.equal(readonly, true);
  assert.equal(closed, true);
  assert.equal(data.indexedDB.databases[0].stores[0].count, 7);
  assert.equal(JSON.stringify(data).includes('existing-db'), false);
  let aborted = false;
  const upgrade = { databases: async () => [{ name: 'raced-db', version: 1 }],
    open() {
      const request = {};
      setTimeout(() => request.onupgradeneeded({ target: { transaction: { abort() { aborted = true; } } } }), 0);
      return request;
    } };
  const raced = await vm.runInNewContext(expression('storage'), context(upgrade));
  assert.equal(aborted, true);
  assert.equal(raced.indexedDB.databases[0].status, 'changed-during-inspection');
});
