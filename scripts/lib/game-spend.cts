// null is an explicit unlimited contract; never let JS coerce it to zero.
const validLimit=(v:unknown):v is number|null=>v===null||Number.isSafeInteger(v)&&(v as number)>=0&&(v as number)<=100000000;
const withinSpend=(amount:unknown,limit:unknown)=>Number.isSafeInteger(amount)&&(amount as number)>=0&&(limit===null||validLimit(limit)&&(amount as number)<=limit);
function combinedLimit(parent:unknown,child:unknown):number|null{
  const a=parent===undefined?null:parent,b=child===undefined?null:child;
  if(!validLimit(a)||!validLimit(b))throw Error('Invalid spend limit');
  return a===null?b:b===null?a:Math.min(a,b);
}
const spend={validLimit,withinSpend,combinedLimit};
export = spend;
