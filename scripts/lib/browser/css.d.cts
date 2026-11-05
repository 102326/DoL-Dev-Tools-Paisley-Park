// Generated from css.cts by TypeScript 6.0.2; source-lf-sha256=0affceacf5eb6b5580682c6ee3e1ed97115bf31d7919e6d9aecefd7fa8dd6d64
declare namespace browserCSS {
    interface Node {
        address: string;
        parent: string | null;
        tag: string;
        id: string;
        class: string[];
        childCount: number;
        style: Partial<Record<string, string>>;
        rect: Record<'x' | 'y' | 'width' | 'height', number>;
    }
    interface Snapshot {
        schemaVersion: 1;
        source: 'CSS';
        nodes: Node[];
        truncated: boolean;
        limits: {
            maxNodes: number;
            maxDepth: number;
        };
        textAndValues: string;
    }
}
declare function snapshot(scopeSelector: string, allowedProperties?: readonly string[]): browserCSS.Snapshot;
declare const browserCSS: {
    snapshot: typeof snapshot;
    properties: readonly string[];
};
export = browserCSS;
