declare namespace nativeProbe {interface Goal {kind:unknown;passage?:unknown;collection:string;entry:unknown;conditions:{field:string;op:unknown;value:number}[]}}
interface GameWindow {SugarCube?:{State?:{passage?:unknown;variables?:Record<string,unknown>}}}
function reader(goal:nativeProbe.Goal){
  const state=(window as unknown as GameWindow).SugarCube?.State,roots=document.querySelectorAll('#passages > .passage');
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
  const matches=(value:{op:unknown;actual:unknown;expected:number})=>value.op==='eq'?value.actual===value.expected:value.op==='lte'?(value.actual as number)<=value.expected:(value.actual as number)>=value.expected;
  return {status:'available',kind:'native-state',satisfied:(goal.passage===undefined||state.passage===goal.passage)&&values.every(matches),
    source:'original SugarCube numeric state fields and current DOM',passage:state.passage,conditionValues:values};
}
const nativeProbe={reader};
export = nativeProbe;
