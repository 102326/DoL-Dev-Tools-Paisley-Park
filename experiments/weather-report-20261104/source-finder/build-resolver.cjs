'use strict';
const path=require('node:path');
const skill=path.resolve(__dirname,'../../../.agents/skills/dol-dev-tools-paisley-park/scripts');
require('./typed-build.cjs').build({sourceFile:path.join(skill,'resolve.cts'),runtimeFile:path.join(skill,'resolve.cjs')});
