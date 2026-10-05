// Deployment is confined to this isolated fixture's serving directory.
const fs=require('node:fs'),path=require('node:path');
fs.mkdirSync(path.join(__dirname,'deployed'),{recursive:true});
fs.copyFileSync(path.join(__dirname,'dist/index.html'),path.join(__dirname,'deployed/index.html'));
