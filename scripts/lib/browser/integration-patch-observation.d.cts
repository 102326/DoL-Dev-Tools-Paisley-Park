// Generated from integration-patch-observation.cts by TypeScript 6.0.2; source-lf-sha256=d0089b8d294e79d5da049b58691898e2053731766fee54606042f1fdd36e82b1
declare function probe(): {
    status: string;
    reason?: undefined;
    source?: undefined;
    record?: undefined;
} | {
    status: string;
    reason: string;
    source?: undefined;
    record?: undefined;
} | {
    status: string;
    source: string;
    record: {
        schemaVersion?: unknown;
        document?: {
            timeOrigin?: unknown;
            nonce?: unknown;
        };
        observation?: {
            schemaVersion?: unknown;
            identity?: {
                documentId?: unknown;
            };
            events?: unknown;
        } | null;
    };
    reason?: undefined;
};
declare const _default: {
    probe: typeof probe;
};
export = _default;
