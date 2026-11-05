// Generated from timeline.cts by TypeScript 6.0.2; source-lf-sha256=b6622214554a5b5ba515d966646b437b175008e1b5a0eb3b49b0713f0cc49772
"use strict";
const { snapshot } = require('./browser/timeline.cjs');
function validate(scope, duration, flag) {
    if (typeof scope !== 'string' || !scope || scope.length > 256 ||
        !Number.isInteger(duration) || duration < 1 || duration > 10000 ||
        typeof flag !== 'boolean')
        throw new Error('Invalid timeline options');
}
const expression = (scope, duration, flag = false) => {
    validate(scope, duration, flag);
    return `(${snapshot.toString()})(${JSON.stringify(scope)}, ${duration}, ${flag})`;
};
async function collect(ctx) {
    const { scope, timelineMs, observerInstrumentation = false } = ctx.options;
    validate(scope, timelineMs, observerInstrumentation);
    if (!ctx.client || typeof ctx.client.evaluate !== 'function')
        throw new Error('CDP unavailable');
    const data = await ctx.client.evaluate(expression(scope, timelineMs, observerInstrumentation)); // Local view of external output.
    return { ...data, ...(data?.capabilities?.cleanupConflicts > 0 ? { collectorStatus: 'failed', reason: 'timeline-cleanup-conflict' } : {}) };
}
module.exports = { snapshot, expression, collect };
