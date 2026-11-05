// Generated from native-goal.cts by TypeScript 6.0.2; source-lf-sha256=6f435c02e344f2d05e10fbdda1554fc54f81924e1237a5d8385403344f694504
declare namespace nativeProbe {
    interface Goal {
        kind: unknown;
        passage?: unknown;
        collection: string;
        entry: unknown;
        conditions: {
            field: string;
            op: unknown;
            value: number;
        }[];
    }
}
declare function reader(goal: nativeProbe.Goal): {
    status: string;
    satisfied: null;
    source: string;
    passage?: undefined;
    kind?: undefined;
    collection?: undefined;
    entry?: undefined;
    known?: undefined;
    conditionValues?: undefined;
} | {
    status: string;
    satisfied: boolean;
    source: string;
    passage: string;
    kind?: undefined;
    collection?: undefined;
    entry?: undefined;
    known?: undefined;
    conditionValues?: undefined;
} | {
    status: string;
    kind: string;
    satisfied: boolean;
    source: string;
    collection: string;
    entry: unknown;
    known: boolean;
    passage: string;
    conditionValues?: undefined;
} | {
    status: string;
    kind: string;
    satisfied: boolean;
    source: string;
    passage: string;
    conditionValues: {
        field: string;
        op: unknown;
        expected: number;
        actual: unknown;
    }[];
    collection?: undefined;
    entry?: undefined;
    known?: undefined;
};
declare const nativeProbe: {
    reader: typeof reader;
};
export = nativeProbe;
