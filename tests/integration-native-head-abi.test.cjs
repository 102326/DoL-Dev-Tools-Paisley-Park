const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createHash}=require('node:crypto');
const {operation}=require('../integrations/soft-and-wet/browser-abi/native-head-operation.cjs');
const native=require('../integrations/soft-and-wet/native-head.cjs');

test('native head operation preserves the persisted receipt source digest',()=>{
  const source=operation.toString();
  assert.equal(createHash('sha256').update(source).digest('hex'),'869f169045af7569892b6214cd2d238fe4cf03df71aa76b39381d8f6f425ad7c');
  assert.equal(native.operation.toString(),source);
});
