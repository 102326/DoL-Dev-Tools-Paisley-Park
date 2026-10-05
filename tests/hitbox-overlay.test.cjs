const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {expression}=require('../scripts/lib/inspectors.cjs'),{render}=require('../scripts/lib/hitbox-overlay.cjs');
test('hitbox center observation and SVG remain structural, bounded and free of imported content',()=>{
 const button={tagName:'BUTTON',disabled:false,hidden:false,children:[],getAttribute:()=>null,getBoundingClientRect:()=>({x:1,y:2,width:20,height:20})};
 const document={querySelectorAll:()=>[button],elementFromPoint:()=>({unrelated:true})};
 const data=vm.runInNewContext(expression('hitboxes','#fixture'),{document,getComputedStyle:()=>({display:'block',visibility:'visible',pointerEvents:'auto'}),innerWidth:100,innerHeight:100});
 assert.equal(data.nodes[0].semanticControl,true);assert.equal(data.nodes[0].centerHitWithinNode,false);
 data.privateContent='<script>PRIVATE_FIXTURE</script>';const svg=render(data);assert.ok(svg.includes('small'));assert.ok(svg.includes('center miss'));assert.equal(svg.includes('PRIVATE_FIXTURE'),false);assert.equal(svg.includes('<script'),false);
 assert.throws(()=>render({...data,nodes:[{...data.nodes[0],address:'"><script>'}]}));assert.throws(()=>render({...data,nodes:[{...data.nodes[0],rect:{x:0,y:0,width:-1,height:1}}]}));
 document.elementFromPoint=()=>button;assert.equal(vm.runInNewContext(expression('hitboxes','#fixture'),{document,getComputedStyle:()=>({}),innerWidth:100,innerHeight:100}).nodes[0].centerHitWithinNode,true);
});
