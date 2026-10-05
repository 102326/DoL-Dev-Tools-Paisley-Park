// Target-owned fixture build. No arbitrary command or project execution DSL.
const fs=require('node:fs'),path=require('node:path');
fs.mkdirSync(path.join(__dirname,'dist'),{recursive:true});
fs.copyFileSync(path.join(__dirname,'index.html'),path.join(__dirname,'dist/index.html'));
