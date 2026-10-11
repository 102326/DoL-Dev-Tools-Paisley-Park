'use strict';
// null is an explicit unlimited contract; never let JS coerce it to zero.
const validLimit=v=>v===null||Number.isSafeInteger(v)&&v>=0&&v<=100000000;
const withinSpend=(amount,limit)=>Number.isSafeInteger(amount)&&amount>=0&&(limit===null||validLimit(limit)&&amount<=limit);
function combinedLimit(parent,child){
  const a=parent===undefined?null:parent,b=child===undefined?null:child;
  if(!validLimit(a)||!validLimit(b))throw Error('Invalid spend limit');
  return a===null?b:b===null?a:Math.min(a,b);
}
module.exports={validLimit,withinSpend,combinedLimit};
