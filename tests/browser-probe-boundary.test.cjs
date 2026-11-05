'use strict';
// Frozen project-owned pre-TS inputs from 2a83b35; no game or third-party content.
const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const current={dom:require('../scripts/lib/dom.cjs'),css:require('../scripts/lib/css.cjs')};
const legacy={dom:require('./fixtures/typed-probe-baseline/dom.cjs'),css:require('./fixtures/typed-probe-baseline/css.cjs')};
function element(children=[],classes=['panel'],id='fixture'){
 return {tagName:'DIV',id,classList:classes,attributes:[{name:'data-fixture'}],children,hasAttribute:()=>false,getBoundingClientRect:()=>({x:0,y:1,width:20,height:30}),get textContent(){throw Error('private text')},get value(){throw Error('private value')},get innerHTML(){throw Error('private HTML')}};
}
const plain=value=>JSON.parse(JSON.stringify(value));
function execute(module,root,values={}){
 return vm.runInNewContext(module.expression('main'),{document:{querySelectorAll:()=>[root]},getComputedStyle:()=>({getPropertyValue:key=>values[key]||''}),innerWidth:800,innerHeight:600},{timeout:1000});
}
test('DOM-only compiled probes preserve frozen pre-TS observations without Node globals',()=>{
 let deep=element();for(let i=0;i<10;i++)deep=element([deep]);
 const scenarios=[element(),element([element(),element()]),element([],Array.from({length:34},(_,i)=>'class'+i)),element([],'x'.repeat(130).split(''),'id'.repeat(80)),element(Array.from({length:510},()=>element())),deep];
 for(const kind of ['dom','css'])for(const root of scenarios){
  const before=execute(legacy[kind],root,{'background-image':'url(https://private.invalid/path)','color':'x'.repeat(300)}),after=execute(current[kind],root,{'background-image':'url(https://private.invalid/path)','color':'x'.repeat(300)});
  assert.deepEqual(plain(after),plain(before),kind);assert.deepEqual(plain(current[kind].diff(before,after)),plain(legacy[kind].diff(before,after)));
 }
 // The normal page context deliberately has no process, Buffer, require or module.
 assert.throws(()=>vm.runInNewContext('process.pid',{}),{name:'ReferenceError'});
});
test('Node facades retain original CommonJS exports and CSS default property identity',()=>{
 for(const kind of ['dom','css'])assert.deepEqual(Reflect.ownKeys(current[kind]),Reflect.ownKeys(legacy[kind]));
 assert.equal(current.css.snapshot,require('../scripts/lib/browser/css.cjs').snapshot);
 assert.equal(current.css.properties,require('../scripts/lib/browser/css.cjs').properties);
 assert.equal(Object.isFrozen(current.css.properties),true);
 assert.equal(current.dom.snapshot,require('../scripts/lib/browser/dom.cjs').snapshot);
});
