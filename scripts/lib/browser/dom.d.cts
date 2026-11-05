// Generated from dom.cts by TypeScript 6.0.2; source-lf-sha256=599a11c39718fdb66255860e9f0dd2ce669772065fad86fc48b1ea3dbc98d512
declare namespace browserDOM {
    interface Node {
        address: string;
        parent: string | null;
        tag: string;
        id: string;
        class: string[];
        data: string[];
        hidden: boolean;
        childCount: number;
    }
    interface Snapshot {
        schemaVersion: 1;
        source: 'DOM';
        nodes: Node[];
        truncated: boolean;
        truncationReasons: string[];
        limits: {
            maxNodes: number;
            maxDepth: number;
        };
        dataValues: string;
        textAndValues: string;
        viewport: {
            width: number;
            height: number;
        };
    }
}
declare function snapshot(scopeSelector: string): browserDOM.Snapshot;
declare const browserDOM: {
    snapshot: typeof snapshot;
};
export = browserDOM;
