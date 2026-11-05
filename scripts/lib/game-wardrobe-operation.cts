// Browser source carrier only. Node callers may serialize it; runtime validation remains in the original browser function.
interface BrowserSource {toString():string}
const {operation}:{operation:BrowserSource}=require('./browser-abi/native-wardrobe-operation.cjs');
export = {operation};
