const {snapshot}:typeof import('./browser/timeline.cjs')=require('./browser/timeline.cjs');
interface Context {options:{scope:string;timelineMs:number;observerInstrumentation?:boolean};client?:{evaluate(expression:string):Promise<unknown>}}

function validate(scope:string, duration:number, flag:boolean) {
  if (typeof scope !== 'string' || !scope || scope.length > 256 ||
      !Number.isInteger(duration) || duration < 1 || duration > 10000 ||
      typeof flag !== 'boolean') throw new Error('Invalid timeline options');
}
const expression = (scope:string, duration:number, flag = false) => {
  validate(scope, duration, flag);
  return `(${snapshot.toString()})(${JSON.stringify(scope)}, ${duration}, ${flag})`;
};
async function collect(ctx:Context):Promise<Record<string,unknown>> {
  const { scope, timelineMs, observerInstrumentation = false } = ctx.options;
  validate(scope, timelineMs, observerInstrumentation);
  if (!ctx.client || typeof ctx.client.evaluate !== 'function') throw new Error('CDP unavailable');
  const data = await ctx.client.evaluate(expression(scope, timelineMs, observerInstrumentation)) as {capabilities?:{cleanupConflicts?:unknown}}; // Local view of external output.
  return { ...data, ...((data?.capabilities?.cleanupConflicts as number) > 0 ? {collectorStatus:'failed',reason:'timeline-cleanup-conflict'} : {}) };
}
export = { snapshot, expression, collect };
