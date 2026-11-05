// Compatibility entry; the authoritative build lives in tools/typescript.
const path=require('node:path');
if(!process.env.PAISLEY_TSC){try{process.env.PAISLEY_TSC=require.resolve('typescript/bin/tsc')}catch{}}
if(!process.env.PAISLEY_TYPE_ROOTS&&process.env.PAISLEY_TSC)process.env.PAISLEY_TYPE_ROOTS=path.resolve(path.dirname(process.env.PAISLEY_TSC),'../../@types');
if(!require('../../../tools/typescript/build.cjs').build())process.exitCode=1;
