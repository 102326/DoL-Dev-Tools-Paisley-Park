const test=require('node:test'),assert=require('node:assert/strict'),{runInNewContext}=require('node:vm');
const {check,finish}=require('../scripts/lib/game-native-render-tasks.cjs');
function fixture(){
  const tasks=Array.from({length:5},()=>Object.create(null)),timers=new Set([1,2]);
  const fn=task=>{delete tasks[0][task];timers.clear()},key='#timed-timers-cleanup';tasks[0][key]=fn;
  const clearTimeout=()=>{},clearInterval=()=>{},window={clearTimeout,clearInterval};
  const review={tasks,rows:[{key,fn,timers,ids:[1,2],source:fn.toString()}],clearTimeout,clearInterval,
    check(phase){return runInNewContext(`(${check.toString()}).call(review,phase)`,{window,review,phase,Set})}};
  return {review,window,timers,clear(){fn(key)}};
}
test('original Engine cleanup must remove registered tasks and clear their actual retained timer sets',()=>{
  const f=fixture();assert.equal(f.review.check('before'),undefined);
  assert.notEqual(f.review.check('after'),undefined);assert.throws(()=>finish.call(f.review));
  f.clear();assert.equal(f.review.check('after'),undefined);
  assert.deepEqual(finish.call(f.review),{kind:'native-render-cleanup',tasks:1,timersBefore:2,timersAfter:0,registriesEmpty:true});
});
test('task deletion alone, timer drift, source replacement, extra tasks and owner changes cannot certify cleanup',()=>{
  for(const change of [f=>{f.timers.add(3)},f=>{f.review.tasks[0]['#timed-timers-cleanup']=()=>{}},
    f=>{f.review.tasks[4].other=()=>{}},f=>{f.window.clearTimeout=()=>{}},f=>{f.timers.clear=()=>{}}]){
    const f=fixture();change(f);assert.notEqual(f.review.check('before'),undefined);
  }
  const f=fixture();delete f.review.tasks[0]['#timed-timers-cleanup'];assert.notEqual(f.review.check('after'),undefined);
  assert.throws(()=>finish.call(f.review));
});
