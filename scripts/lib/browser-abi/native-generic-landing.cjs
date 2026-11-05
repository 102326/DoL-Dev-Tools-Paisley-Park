// Frozen source used by native execution and legacy binding contracts.
function navigationFlags(a,b){
  if(typeof a?.combat!=='boolean'||typeof b?.combat!=='boolean')return false;
  return JSON.stringify({...a,combat:false})===JSON.stringify({...b,combat:false});
}
function check(epoch,phase){
  const sc=window.SugarCube,s=sc?.State,p=sc?.Story?.get(epoch.destination),d=Object.getOwnPropertyDescriptor(window,'V');
  if(typeof window.DoLGameUI!=='undefined'||s!==epoch.state||!d||d.get!==epoch.getter||d.set!==undefined||window.V!==s.variables||
     sc.Macro.get('effects')?.handler!==epoch.handler||Function.prototype.toString.call(epoch.effects)!==epoch.effectsSource||
     p!==epoch.passage||p.text!==epoch.text||JSON.stringify(p.tags)!==epoch.tags)return 'native-navigation-source-epoch-changed';
  const roots=document.querySelectorAll('#passages > .passage');
  if(roots.length!==1||roots[0].getAttribute('data-passage')!==s.passage||roots[0].querySelector('.error')||!sc.Engine.isIdle())return 'native-navigation-scene-unavailable';
  if(phase==='before'&&s.passage!==epoch.before)return 'native-navigation-start-changed';
}
module.exports={navigationFlags,check};
