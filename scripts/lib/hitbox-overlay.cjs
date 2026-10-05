const fs=require('node:fs');
function render(value,minimum=44){
 const data=value?.data??value;
 if(!Number.isInteger(minimum)||minimum<24||minimum>128||data?.schemaVersion!==1||data.source!=='hitboxes'||typeof data.truncated!=='boolean'||!Array.isArray(data.nodes)||!data.nodes.length||data.nodes.length>200)throw Error('Invalid hitbox overlay');
 const seen=new Set(),nodes=data.nodes.map(n=>{
  if(!n||typeof n.address!=='string'||!/^0(?:\/\d+){0,8}$/.test(n.address)||seen.has(n.address)||!n.rect||['x','y','width','height'].some(k=>!Number.isFinite(n.rect[k])||Math.abs(n.rect[k])>16384)||n.rect.width<0||n.rect.height<0||typeof n.semanticControl!=='boolean')throw Error('Invalid hitbox bounds');seen.add(n.address);
  return {address:n.address,rect:n.rect,semanticControl:n.semanticControl,centerHitWithinNode:n.centerHitWithinNode===true?true:n.centerHitWithinNode===false?false:null};
 });
 const left=Math.min(...nodes.map(n=>n.rect.x)),top=Math.min(...nodes.map(n=>n.rect.y)),right=Math.max(...nodes.map(n=>n.rect.x+n.rect.width)),bottom=Math.max(...nodes.map(n=>n.rect.y+n.rect.height));
 const width=Math.max(1,right-left),height=Math.max(1,bottom-top);
 const shapes=nodes.map(n=>{const b=n.rect,small=n.semanticControl&&(b.width<minimum||b.height<minimum),color=n.centerHitWithinNode===false?'#c62828':small?'#a85d00':'#146a98';return `<g><rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="none" stroke="${color}" stroke-width="1"/><text x="${b.x+2}" y="${b.y+12}" font-size="10" fill="${color}">${n.address}${small?' small':''}${n.centerHitWithinNode===false?' center miss':''}</text></g>`}).join('');
 // Only bounded numeric coordinates and validated structural addresses reach SVG; no imported text, script, href or image.
 return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="1024" height="${Math.min(2048,Math.max(1,Math.round(1024*height/width)))}"><title>Reported DOM bounds; CSS pixel size threshold ${minimum}; center test only; truncated ${data.truncated}; event handling and full click area unverified</title><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="#f5f8fb"/>${shapes}</svg>`;
}
function write(input,out,minimum){if(fs.statSync(input).size>1024*1024)throw Error('Hitbox input too large');const svg=render(JSON.parse(fs.readFileSync(input,'utf8')),minimum);fs.writeFileSync(out,svg,{flag:'wx'});return {nodesVisualized:true,output:'SVG',reportedBoundsOnly:true}}
module.exports={render,write};
