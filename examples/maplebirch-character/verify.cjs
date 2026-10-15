'use strict';
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const {createHash} = require('node:crypto'), {createRequire} = require('node:module'), {execFileSync} = require('node:child_process');
assert.equal(process.argv.length, 6, 'Usage: node verify.cjs REVIEWED_MAPLE_ROOT TYPESCRIPT_JS DEPENDENCY_ROOT NEW_OUT');
const [root, compiler, dependencies, out] = process.argv.slice(2).map(p => path.resolve(p));
assert.ok(!fs.existsSync(out), 'Output must not exist');
const head = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], {encoding: 'utf8', windowsHide: true}).trim();
assert.equal(head, '4b4b6e26e934d2e848058f21dfa1df0f71cc455d');
const sourceFile = path.join(root, 'src/modules/Character.ts'), objectFile = path.join(root, 'src/utils/object.ts');
execFileSync('git', ['-C', root, 'diff', '--exit-code', 'HEAD', '--', sourceFile, objectFile], {windowsHide: true});
const ts = require(compiler), external = createRequire(path.join(dependencies, 'package.json'));
const lodash = external('lodash'), hash = text => createHash('sha256').update(text).digest('hex');
const source = fs.readFileSync(sourceFile, 'utf8'), objectSource = fs.readFileSync(objectFile, 'utf8');
const ast = ts.createSourceFile(sourceFile, source, ts.ScriptTarget.Latest, true);
const owner = ast.statements.find(n => ts.isClassDeclaration(n) && n.name?.text === 'Character'); assert.ok(owner);
const method = name => {
  const found = owner.members.filter(n => ts.isMethodDeclaration(n) && n.body && n.name.getText(ast) === name);
  assert.equal(found.length, 1); return found[0].getText(ast);
};
const guarded = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === 'guarded'); assert.ok(guarded);
const pieces = {patchCanvasModel: method('patchCanvasModel'), use: method('use'), guarded: guarded.getText(ast)};
const transpile = input => ts.transpileModule(input, {compilerOptions: {target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.CommonJS, esModuleInterop: true}}).outputText;
const moduleObject = {exports: {}};
// Reviewed upstream code has ordinary Node permissions; the loader adapter only supplies lodash.
new Function('require', 'module', 'exports', transpile(objectSource))(name => {
  assert.equal(name, '../host/ModLoader'); return {__esModule: true, default: {getLodash: () => lodash}};
}, moduleObject, moduleObject.exports);
const {clone, mergeFn} = moduleObject.exports;
assert.equal(typeof clone, 'function'); assert.equal(typeof mergeFn, 'function');
const Character = new Function('clone', 'mergeFn', transpile(`${pieces.guarded}
class OwnedCharacter {
 constructor(){this.layers=[];this.pet={modelName:'owned-pet',capture(){},use(){}};this.process=()=>{};}
 ${pieces.use}
 ${pieces.patchCanvasModel}
}
return OwnedCharacter;`))(clone, mergeFn);

const report = {status: 'running', source: {head, characterSha256: hash(source), objectSha256: hash(objectSource),
  methods: Object.fromEntries(Object.entries(pieces).map(([name, body]) => [name, hash(body)]))},
  environment: {node: process.version, typescript: ts.version, lodash: external('lodash/package.json').version},
  scope: 'Pinned actual Character methods and object helpers; synthetic native model/cache. Not a framework build, renderer, image or device validation.', cases: []};
fs.mkdirSync(out);
try {
  const originalSrc = () => 'owned-original', replacement = () => 'owned-consumer', later = () => 'owned-later';
  const originalShow = () => true, options = name => ({name, width: 1, height: 1, layers: {mouth: {srcfn: originalSrc, showfn: originalShow}}});
  const cache = new Map();
  class NativeModel {
    constructor(opts) { Object.assign(this, opts); this.layerList = Object.values(this.layers); this.preprocess = () => {}; this.postprocess = () => {}; }
    static create(id) { return cache.get(id); }
  }
  const cached = new NativeModel(options('main')); cache.set('owned-cache', cached);
  const character = new Character(); assert.equal(character.use({mouth: {srcfn: replacement}}), character);
  const originalOptions = options('main'), Patched = character.patchCanvasModel(NativeModel), fresh = new Patched(originalOptions);
  assert.equal(fresh.layers.mouth.srcfn, replacement); assert.equal(fresh.layers.mouth.showfn, originalShow);
  report.cases.push({name: 'fresh-model-adopts-selected-layer-field', status: 'passed'});
  const reused = Patched.create('owned-cache'); assert.equal(reused, cached); assert.equal(reused.layers.mouth.srcfn, originalSrc);
  report.cases.push({name: 'cached-existing-layer-not-retroactively-replaced', status: 'passed'});
  character.use({badge: {srcfn: replacement}}); assert.equal(Patched.create('owned-cache'), cached);
  assert.equal(cached.layers.badge.srcfn, replacement); assert.ok(cached.layerList.includes(cached.layers.badge));
  assert.equal(cached.layers.mouth.srcfn, originalSrc);
  report.cases.push({name: 'late-missing-layer-is-added-to-cached-model', status: 'passed'});
  character.use({mouth: {srcfn: later}}); const newest = new Patched(options('main'));
  assert.equal(newest.layers.mouth.srcfn, later); assert.equal(newest.layers.mouth.showfn, originalShow);
  report.cases.push({name: 'later-registration-wins-on-new-model', status: 'passed'});
  const other = new Patched(options('other')); assert.equal(other.layers.mouth.srcfn, originalSrc); assert.equal(other.layers.badge, undefined);
  report.cases.push({name: 'default-main-target-does-not-change-other-model', status: 'passed'});
  assert.equal(originalOptions.layers.mouth.srcfn, originalSrc);
  report.status = 'passed';
} catch (error) { report.status = 'failed'; report.error = error.message; process.exitCode = 1; }
finally { fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2), {flag: 'wx'});
  console.log(JSON.stringify({out, status: report.status, cases: report.cases})); }
