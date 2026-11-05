'use strict';
window.syntheticCalls=0;
const widgetBody='\n<<set _synthetic to true>>\n';
function widgetFactory(){const widgetCode=widgetBody,widgetDefCtx={payload:[{contents:widgetCode}]};return function handler(){window.syntheticCalls++;return [widgetCode,widgetDefCtx.payload[0].contents]}}
function macroFactory(changed=false){const macroFunction=changed?function changedBusiness(){window.syntheticCalls++;return 8}:function syntheticBusiness(){window.syntheticCalls++;return 7};return function handler(){return macroFunction()}}
const handlers={syntheticwidget:widgetFactory(),syntheticmacro:macroFactory()};
let storyMode='normal';
window.SugarCube={Macro:{get:name=>({handler:handlers[name]})},Story:{getAllWidget:()=>{
 const item={title:'Synthetic Widgets',text:'<<widget "syntheticwidget">>'+(storyMode==='changed'?'changed':widgetBody)+'<</widget>>'};
 return storyMode==='duplicate'?[item,item]:[item];
}}};
window.contractFixture={setStory:mode=>{storyMode=mode},tamperMacro:()=>{handlers.syntheticmacro=macroFactory(true)}};
window.SugarCube.State={passage:'Synthetic Room',turns:0,variables:{money:100,worn:{head:{variable:'naked'}},wardrobe:{head:[]}}};
window.syntheticMoment=(()=>{const State=window.SugarCube.State;return function syntheticMoment(){return State.passage}})();
(()=>{const _active={variables:window.SugarCube.State.variables};window.SugarCube.State.active=_active;Object.defineProperty(window,'V',{get:()=>_active.variables,configurable:true,enumerable:false})})();
