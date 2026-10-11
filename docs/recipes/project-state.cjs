'use strict';
// Authorized preparation, not a purchase witness. Invoke only through a scoped Recipe.
module.exports={schemaVersion:1,operations:[{
 id:'prepare-currency',label:'Prepare authorized test currency',intent:'experiment',
 read:inputs=>{
  if(!Number.isSafeInteger(inputs.amount)||inputs.amount<0||inputs.amount>1e12)throw Error('Invalid preparation amount');
  const state=window.SugarCube?.State;
  if(!Number.isSafeInteger(state?.variables?.money)||!Number.isSafeInteger(state.turns))throw Error('Original state unavailable');
  return {money:state.variables.money,passage:state.passage,turns:state.turns};
 },
 quote:()=>0,
 execute:inputs=>{window.SugarCube.State.variables.money=inputs.amount},
 outcome:(before,after,inputs)=>({occurred:after.money===inputs.amount&&after.passage===before.passage&&after.turns===before.turns,spent:0}),
}]};
