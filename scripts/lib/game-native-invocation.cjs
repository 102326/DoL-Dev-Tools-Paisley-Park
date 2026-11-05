// Generated from game-native-invocation.cts by TypeScript 6.0.2; source-lf-sha256=d8205b0c57ccc82b9a3aeca37c93186ff8c5f100708cb6954431dbfee358e193
"use strict";
const { member, functionSource } = require('./game-contract.cjs');
async function bind(client, receiverId) {
    let callableId;
    try {
        callableId = await member(client, receiverId, `(()=>{if(!(this instanceof HTMLElement))return null;for(let p=this,i=0;p&&i<16;p=Object.getPrototypeOf(p),i++){const d=Object.getOwnPropertyDescriptor(p,'click');if(d)return Object.hasOwn(d,'value')&&typeof d.value==='function'?d.value:null}return null})()`);
        if (await functionSource(client, callableId) !== 'function click() { [native code] }')
            throw Error('Unreviewed native click callable');
        return { receiverId, callableId };
    }
    catch (error) {
        if (callableId)
            try {
                await client.send('Runtime.releaseObject', { objectId: callableId });
            }
            catch (cleanup) {
                throw Object.assign(new AggregateError([error, cleanup], 'Native invocation binding cleanup failed'), { code: 'NATIVE_INVOCATION_CLEANUP_FAILED' });
            }
        throw error;
    }
}
const invocation = { bind };
module.exports = invocation;
