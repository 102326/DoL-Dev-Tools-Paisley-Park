// Generated from inspectors.cts by TypeScript 6.0.2; source-lf-sha256=0a6ff0fe65482ee460bb4bfba82713a943e5385e9344807cb73cca07d714b925
declare namespace browserInspectors {
    type Mode = 'selector-health' | 'accessibility' | 'overlays' | 'scroll' | 'ownership' | 'hitboxes';
    type Status = 'available' | 'partial' | 'unsupported' | 'timeout' | 'changed-during-inspection';
    type Box = Record<'x' | 'y' | 'width' | 'height', number>;
    interface Entry {
        address: string;
        parent: string | null;
        tag: string;
        rect: Box;
        tabIndex?: number | null;
        scrollWidth?: number;
        scrollHeight?: number;
        clientWidth?: number;
        clientHeight?: number;
        overflowX?: string;
        overflowY?: string;
        [key: string]: unknown;
    }
    interface Metadata {
        schemaVersion: number;
        source: string;
        nodes: Entry[];
        truncated: boolean;
        limits: {
            maxNodes: number;
            maxDepth: number;
        };
        content: string;
        [key: string]: unknown;
    }
    interface StorageSection {
        status: Status;
        count: number | null;
        keys: {
            hash: string;
        }[];
        omitted: number;
    }
    interface Store {
        nameHash: string;
        count: number | null;
        status: Status;
    }
    interface Database {
        nameHash: string;
        version: number;
        status: Status;
        stores: Store[];
        omitted: number;
    }
    interface IndexedSection {
        status: Status;
        databases: Database[];
        omitted: number;
    }
    interface StorageResult {
        schemaVersion: number;
        source: string;
        local: StorageSection | null;
        session: StorageSection | null;
        indexedDB: IndexedSection | null;
        content: string;
    }
}
declare function inspect(mode: browserInspectors.Mode, scope: string | undefined): browserInspectors.Metadata | {
    schemaVersion: number;
    source: string;
    count: number;
    unique: boolean;
    heuristicOnly: boolean;
    fragilityReasons: string[];
};
declare function storage(): Promise<browserInspectors.StorageResult>;
declare const browserInspectors: {
    inspect: typeof inspect;
    storage: typeof storage;
};
export = browserInspectors;
