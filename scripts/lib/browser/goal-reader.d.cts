// Generated from goal-reader.cts by TypeScript 6.0.2; source-lf-sha256=9a5c0354844b8663954406d6888bfcaa675044d8511da38d257814308a646515
declare namespace goalProbe {
    interface Goal {
        kind: unknown;
        passage?: unknown;
        slot?: unknown;
        variable?: unknown;
        colour?: unknown;
        modder?: unknown;
        accessoryColour?: unknown;
        baselineMoney?: unknown;
        baselineCount?: unknown;
        unitCost?: unknown;
        maxSpend?: unknown;
    }
}
declare function goalReader(goal: goalProbe.Goal): {
    status: string;
    satisfied: null;
    source: string;
    priceMatches?: undefined;
    money?: undefined;
    count?: undefined;
    spent?: undefined;
    quotedCost?: undefined;
    passage?: undefined;
} | {
    conditionsSatisfied?: boolean | undefined;
    turns?: unknown;
    receiptContext?: {} | null | undefined;
    owned?: {
        variant: unknown;
        count: number;
    }[] | undefined;
    ownedTruncated?: boolean | undefined;
    status: string;
    satisfied: boolean;
    source: string;
    wornMatches: boolean;
    passage: string;
    worn: {
        variable: unknown;
        colour: {} | null;
        modder: {} | null;
        accessoryColour: {} | null;
    };
    items: {
        variable: unknown;
        colour: unknown;
        modder: {} | null;
        accessoryColour: {} | null;
        name: unknown;
    }[];
    itemsTruncated: boolean;
    priceMatches?: undefined;
    money?: undefined;
    count?: undefined;
    spent?: undefined;
    quotedCost?: undefined;
} | {
    status: string;
    satisfied: boolean;
    priceMatches: boolean;
    source: string;
    money: unknown;
    count: number;
    spent: number;
    quotedCost: unknown;
    passage: string;
} | {
    status: string;
    satisfied: boolean;
    source: string;
    passage: string;
    priceMatches?: undefined;
    money?: undefined;
    count?: undefined;
    spent?: undefined;
    quotedCost?: undefined;
};
declare const goalProbe: {
    goalReader: typeof goalReader;
};
export = goalProbe;
