// Fixture adapter only; execution/control is the shared production core.
const core=require('../../scripts/lib/game-runtime.cjs');
const {provider}=require('./fixture.cjs');
class Runtime extends core.Runtime { constructor(file,options={}) { super(file,{...options,provider}); } }
module.exports={...core,Runtime};
