// Browser source carrier only. Node callers may serialize it; runtime validation remains in the original browser function.
interface BrowserSource {toString():string}
const {checkHall}:{checkHall:BrowserSource}=require('./browser-abi/native-state-contracts.cjs');
export = {checkHall};
