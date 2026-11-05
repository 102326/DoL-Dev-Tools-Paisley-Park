// Generated from recorder.cts by TypeScript 6.0.2; source-lf-sha256=e895727ee25234e170db722e77c7a2afa5f2904b4d5116f05d76ef846cf48bb4
interface RecordEntry {
    order: number;
    atMs: number;
    kind: string;
    address: string;
    tag: string;
    replayable: boolean;
    reason: string | null;
}
declare function snapshot(scopeSelector: string, durationMs: number): Promise<{
    schemaVersion: number;
    source: string;
    durationMs: number;
    records: RecordEntry[];
    dropped: number;
    truncated: boolean;
    cleanupConflicts: number;
    inputContent: string;
    nativeActions: string;
}>;
declare const _default: {
    snapshot: typeof snapshot;
};
export = _default;
