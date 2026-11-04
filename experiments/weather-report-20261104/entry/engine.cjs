// Explicit experiment choice, never an arbitrary executable/module path from a request.
const path = require('node:path');
const mode = process.env.PAISLEY_SOURCE_ENGINE || 'compiled';
if (!['native','compiled'].includes(mode)) throw Error('Unsupported source engine mode');
const file = path.resolve(__dirname,mode==='native'?'../../../scripts/lib/source-find.mts':'../../../scripts/lib/source-find.cjs');
module.exports = { ...require(file), file, mode };
