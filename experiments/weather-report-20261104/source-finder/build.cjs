'use strict';
const path=require('node:path');
require('./typed-build.cjs').build({sourceFile:path.resolve(__dirname,'../../../scripts/lib/source-find.mts'),runtimeFile:path.resolve(__dirname,'../../../scripts/lib/source-find.cjs'),distDir:path.join(__dirname,'dist'),esm:true});
