const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
for(const [moduleName,name,expected] of [
 ['generic-landing','navigationFlags','d52bd5cf6589b0eb2ea7d3d545364bc27a6231d77cdf491757a03a5e428cc360'],
 ['generic-landing','check','15bd2f4d3ef97f0a2c23ef39c6be8509bba22d186cd64e7bb48254731267a50a'],
 ['time','createMonitor','7f651b41eb47181b58d6d6c67913851b614b6256906fb74626b2772d7a56f8ab'],
 ['street-recovery','readClosed','daf94354e21d38dc700527f17facefd86a71ede09a87931b1821a553bc44ab5b'],
])test(`${moduleName}.${name} retains reviewed source`,()=>{
 const source=require(`../scripts/lib/game-native-${moduleName}.cjs`)[name].toString();
 assert.equal(createHash('sha256').update(source).digest('hex'),expected);
 assert.equal(source,require(`../scripts/lib/browser-abi/native-${moduleName}.cjs`)[name].toString());
});
