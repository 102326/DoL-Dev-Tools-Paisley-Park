'use strict';
// Source-sensitive original native event reader. Preserve LF.
function clickReader(node,allowShopPropagationStops=false){
  const events=window.jQuery?._data?.(node,'events')?.click;
  if(!Array.isArray(events)||events.length<1)return null;
  if(events.length===1)return events[0].handler;
  const stop='function (e) {\n\t\t\te.stopPropagation();\n\t\t}';
  if(!allowShopPropagationStops||window.SugarCube?.State?.passage!=='Clothing Shop'||
     !node.closest('#clothes-list')||events.length>3||events[0].namespace!=='aria-clickable.macros'||
     events.slice(1).some(e=>e.namespace!==''||e.selector!=null||typeof e.handler!=='function'||Function.prototype.toString.call(e.handler)!==stop))return null;
  return events[0].handler;
}

module.exports={clickReader};
