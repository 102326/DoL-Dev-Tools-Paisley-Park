// Browser source carrier only. Node callers may serialize it; runtime validation remains in the original browser function.
interface BrowserSource {toString():string}
const {operation,preflight}:{operation:BrowserSource;preflight:BrowserSource}=require('./browser-abi/native-navigation-operation.cjs');
export = {operation,preflight};
