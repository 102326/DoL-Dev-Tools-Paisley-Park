const {test}=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm');
const {validLimit,withinSpend,combinedLimit}=require('../scripts/lib/game-spend.cjs');
const clothing=require('../scripts/lib/game-clothing-provider.cjs'),predicates=require('../scripts/lib/game-goal-reader.cjs');
const purchase={kind:'purchase-one',slot:'head',variable:'hairpin',colour:'black',accessoryColour:'white',baselineMoney:1000,baselineCount:0,unitCost:500};
test('explicit unlimited and finite parent/child limits combine without erasing zero or coercing values',()=>{
 for(const [parent,child,expected] of [[undefined,undefined,null],[null,null,null],[null,500,500],[undefined,0,0],[0,null,0],[600,500,500],[400,500,400]])assert.equal(combinedLimit(parent,child),expected);
 assert.equal(withinSpend(500,null),true);assert.equal(withinSpend(1,0),false);assert.equal(withinSpend(500,500),true);assert.equal(withinSpend(501,500),false);
 for(const value of [undefined,false,'0',-1,Infinity,NaN,100000001]){assert.equal(validLimit(value),false);assert.equal(withinSpend(0,value),false)}
 for(const value of [false,'0',-1,Infinity])assert.throws(()=>combinedLimit(null,value));
});
test('unlimited one-item Goals can discover and authorize a quote; finite child limits remain binding',()=>{
 const budget={timeoutMs:1000,maxActions:2,maxObservations:4,maxSpend:null},request={name:'buy',mode:'gameplay',goal:{...purchase,maxSpend:null},budget};
 assert.equal(predicates.validate(request).budget.maxSpend,null);assert.equal(clothing.validateGoal({...request.goal,description:'buy one'}),true);
 const state={status:'available',variable:'hairpin',colour:'black',accessoryColour:'white',modder:null,pattern:null,destination:'wardrobe',money:1000,count:0,cost:500,space:1,quantity:1};
 const choices=clothing.candidates({choices:[]},1,null,state,request.goal);assert.equal(choices.length,1);assert.equal(choices[0].cost,500);
 assert.equal(clothing.authorizeCostedControl({action:{type:'web-click',selector:'#buy-send-home > .buy-button > .buy-button-inner'},interpretation:{...state,operation:'buy-one'}},choices[0],request.goal),true);
 assert.equal(clothing.candidates({choices:[]},1,null,state,{...purchase,maxSpend:499}).length,0);
 const scene={passage:'Clothing Shop',variables:{money:500,wardrobe:{head:[{variable:'hairpin',colour:'black',accessory_colour:'white'}]}}};
 const read=g=>vm.runInNewContext(`(${predicates.goalReader.toString()})(goal)`,{goal:g,window:{SugarCube:{State:scene}},document:{querySelectorAll:()=>[{getAttribute:()=>scene.passage}]}});
 assert.equal(read(request.goal).satisfied,true);assert.equal(read({...purchase,maxSpend:499}).satisfied,false);assert.equal(read({...purchase,maxSpend:0}).satisfied,false);
});
