// Generated from integration-soft-wet.cts by TypeScript 6.0.2; source-lf-sha256=77a257a986327de8b88454a530c3368876dbc5c53bc456c75857657672007e7e
declare function probe(): {
    status: string;
    apiVersion?: undefined;
    runtimeSnapshotAvailable?: undefined;
    adapterProbeAvailable?: undefined;
    capabilities?: undefined;
    adapters?: undefined;
    surfaces?: undefined;
    recentEventCount?: undefined;
} | {
    status: string;
    apiVersion: number;
    runtimeSnapshotAvailable: boolean;
    adapterProbeAvailable: boolean;
    capabilities: {
        enabled: boolean;
        styleAdapters: boolean;
        surfaces: boolean;
        visualTier: unknown;
        glass: boolean;
        motion: boolean;
    };
    adapters: {
        index: number;
        match: unknown;
        status: unknown;
        reason: unknown;
        targetDetected: boolean;
        degraded: boolean;
        level: unknown;
        fingerprintDeclared: boolean;
        mapped: unknown[];
        mappings: {
            role: unknown;
            fallback: boolean;
            count: number | null;
            reason: unknown;
        }[];
    }[];
    surfaces: {
        kind: unknown;
        source: unknown;
    }[];
    recentEventCount: number | null;
};
declare const _default: {
    probe: typeof probe;
};
export = _default;
