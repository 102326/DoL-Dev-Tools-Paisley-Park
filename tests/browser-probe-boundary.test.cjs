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
test('all six Inspector modes and private storage metadata match their frozen pre-TS implementation',async()=>{
 const old=require('./fixtures/typed-probe-baseline/inspectors.cjs'),now=require('../scripts/lib/inspectors.cjs');
 const child=element(),root=element([child]);child.parentElement=root;root.parentElement=null;
 for(const item of [root,child])Object.assign(item,{hidden:false,disabled:false,tabIndex:0,scrollWidth:40,scrollHeight:40,clientWidth:20,clientHeight:20,scrollTop:0,scrollLeft:0,getAttribute:()=>null,closest:()=>null,contains:other=>other===child});
 const context={document:{querySelectorAll:()=>[root],elementFromPoint:()=>child},getComputedStyle:()=>({display:'block',visibility:'visible',position:'relative',zIndex:'1',opacity:'1',transform:'none',filter:'none',overflowX:'auto',overflowY:'auto',color:'rgb(0, 0, 0)',backgroundColor:'rgb(255, 255, 255)',pointerEvents:'auto'}),innerWidth:800,innerHeight:600};
 for(const mode of now.domModes)assert.deepEqual(plain(vm.runInNewContext(now.expression(mode,'main'),context)),plain(vm.runInNewContext(old.expression(mode,'main'),context)),mode);
 function storageContext(){return {crypto:require('node:crypto').webcrypto,TextEncoder,Uint8Array,setTimeout,clearTimeout,indexedDB:{databases:async()=>[]},window:{localStorage:{length:2,key:i=>'synthetic-key-'+i,getItem(){throw Error('private value read')}}}}}
 const a=await vm.runInNewContext(old.expression('storage'),storageContext()),b=await vm.runInNewContext(now.expression('storage'),storageContext());
 assert.deepEqual(plain(b),plain(a));assert.deepEqual(plain(now.storageDiff(a,b)),plain(old.storageDiff(a,b)));
 assert.deepEqual(Reflect.ownKeys(now),Reflect.ownKeys(old));
});
