// Generated from integration-native-head-recovery.cts by TypeScript 6.0.2; source-lf-sha256=ed7ef31e7657fa55828e91b3848927848a61c190a64a76c95400fc466b41aac9
interface Item {
    variable?: unknown;
    [key: string]: unknown;
}
interface Before {
    inventory: Item[];
    worn: Item;
    item: Item;
    turns: unknown;
    time: unknown;
    money: unknown;
}
interface Expected {
    attemptId: string;
    binding: {
        provider: unknown;
        contract: unknown;
        contextNonce: unknown;
        requestDigest: unknown;
        [key: string]: unknown;
    };
}
interface Indices {
    namespace: string;
    context: number;
    bridge: number;
    action: number;
    index: number;
    errorMessages: unknown[];
}
declare function closedRecoveryReader(this: unknown, expected: Expected, before: Before, observedInputs: unknown[], indices: Indices): {
    ok: boolean;
    proof?: undefined;
} | {
    ok: boolean;
    proof: {
        receiptStatus: string;
        passage: string;
        wornVariable: unknown;
        inventoryLength: number;
        money: unknown;
        timeStamp: unknown;
        turns: unknown;
        modelRefreshed: boolean;
        bridgeRestored: boolean;
        uiEnabled: boolean;
    };
};
declare const _default: {
    closedRecoveryReader: typeof closedRecoveryReader;
};
export = _default;
