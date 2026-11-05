const {test}=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
for(const [file,asset,name,expected] of [
 ['game-native-radio','native-radio','inspect','a896b8db0fada1c4b8c467a5614658fa0c9f9645748367fe1790e11995bb3ee5'],
 ['game-native-radio','native-radio','operation','c70999b2f7df46d8fd1f8dda1bd22ea3e3fa6e80d65e5a1128f5bea7d4eef24b'],
 ['game-shop-menu-native','native-shop-menu','branch','f329699a1eed6ddb2d05c1b63745bf31c7d303636367a40e70f86128a6585c66'],
 ['game-shop-menu-native','native-shop-menu','reader','2b649634fa2ba5ddd69e8cbf7f0ca24c4099f2656c7bfb1b4f285135a1e39ea8'],
])test(`${file}.${name} preserves contract source`,()=>{
 const source=require(`../scripts/lib/${file}.cjs`)[name].toString();
 assert.equal(createHash('sha256').update(source).digest('hex'),expected);
 assert.equal(source,require(`../scripts/lib/browser-abi/${asset}.cjs`)[name].toString());
});
