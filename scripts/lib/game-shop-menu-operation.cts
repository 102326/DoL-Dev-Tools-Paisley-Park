// Browser source carrier only. Node callers may serialize it; runtime validation remains in the original browser function.
interface BrowserSource {toString():string}
const {preflight,operation}:{preflight:BrowserSource;operation:BrowserSource}=require('./browser-abi/native-shop-menu-operation.cjs');
export = {preflight,operation};
