// Fixed pre-migration reader from bca03f72; synthetic differential test only.
function reader(goal){
  const state=window.SugarCube?.State,roots=document.querySelectorAll('#passages > .passage');
  if(roots.length!==1||roots[0].getAttribute('data-passage')!==state?.passage||typeof state?.passage!=='string'||state.passage.length>128)return {status:'unavailable',satisfied:null,source:'original game state/DOM agreement unavailable'};
  if(goal.kind==='reach-passage')return {status:'available',satisfied:state.passage===goal.passage,source:'original SugarCube Passage and current DOM',passage:state.passage};
  if(goal.kind==='native-knowledge'){
    const list=state.variables?.[goal.collection];
    if(!state.variables||!Object.prototype.hasOwnProperty.call(state.variables,goal.collection)||!Array.isArray(list)||list.length>512)return {status:'unavailable',satisfied:null,source:'original knowledge collection unavailable'};
    const known=Array.prototype.includes.call(list,goal.entry);
    return {status:'available',kind:'native-knowledge',satisfied:known&&(goal.passage===undefined||state.passage===goal.passage),
      source:'original SugarCube knowledge collection and current DOM',collection:goal.collection,entry:goal.entry,known,passage:state.passage};
  }
  const variables=state.variables,values=[];
  for(const condition of goal.conditions){
    if(!variables||!Object.prototype.hasOwnProperty.call(variables,condition.field)||!Number.isFinite(variables[condition.field]))
      return {status:'unavailable',satisfied:null,source:'original numeric state field unavailable'};
    values.push({field:condition.field,op:condition.op,expected:condition.value,actual:variables[condition.field]});
  }
  const matches=value=>value.op==='eq'?value.actual===value.expected:value.op==='lte'?value.actual<=value.expected:value.actual>=value.expected;
  return {status:'available',kind:'native-state',satisfied:(goal.passage===undefined||state.passage===goal.passage)&&values.every(matches),
    source:'original SugarCube numeric state fields and current DOM',passage:state.passage,conditionValues:values};
}

module.exports={reader};
