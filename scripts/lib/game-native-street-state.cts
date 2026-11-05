// Browser source carrier only. Node callers may serialize it; runtime validation remains in the original browser function.
interface BrowserSource {toString():string}
const {checkStreet}:{checkStreet:BrowserSource}=require('./browser-abi/native-state-contracts.cjs');
export = {checkStreet};
