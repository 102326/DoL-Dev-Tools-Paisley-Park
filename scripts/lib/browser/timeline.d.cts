// Generated from timeline.cts by TypeScript 6.0.2; source-lf-sha256=24ac9b148501ece1b857cca5c0c0a93e116e69ea52dac923f9ef4566d3c2f159
interface TimelineRecord {
    kind: string;
    [key: string]: unknown;
}
interface ObserverInstances {
    createdAndInstrumented: number;
    aliveAtEnd: number;
    notAliveAtEnd: number;
    instrumentationMayRetainInstances: boolean;
    basis: string;
}
interface Capabilities {
    mutation: string;
    performance: string;
    instrumentation: string;
    callbackTracking: string;
    existingObservers: string;
    cleanupConflicts: number;
    omittedInstances: number;
    observers: Record<string, string>;
    observerInstances?: ObserverInstances;
}
declare function snapshot(scopeSelector: string, durationMs: number, observerInstrumentation?: boolean): Promise<{
    schemaVersion: number;
    source: string;
    durationMs: number;
    records: TimelineRecord[] | null;
    dropped: number;
    truncated: boolean;
    capabilities: Capabilities;
    clock: {
        targetStartUnixMs: number | null;
        basis: string;
    };
}>;
declare const _default: {
    snapshot: typeof snapshot;
};
export = _default;
