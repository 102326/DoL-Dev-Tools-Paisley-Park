// Generated from environment.cts by TypeScript 6.0.2; source-lf-sha256=a1dff8100fbb7c8124d443699b8d3b6afc729c5d2421202f0742c6272c4bbd07
declare namespace environmentProbe {
    interface Mod {
        name: string;
        version: string | null;
        reportedIndex: number;
        enabled: null;
        loadOrder: null;
    }
    interface Snapshot {
        gameVersion: string | null;
        gameVersionSources: {
            startConfig: string | null;
            gameVersionMod: string | null;
        };
        loaderVersion: string | null;
        viewport: {
            width: number;
            height: number;
            devicePixelRatio: number;
        };
        capabilities: {
            modList: boolean;
            performanceObserver: boolean;
            mutationObserver: boolean;
            indexedDB: boolean;
        };
        mods: {
            status: 'unavailable' | 'available' | 'failed';
            items: Mod[];
            truncated: boolean;
            unreadable: number;
            scope: string;
            orderBasis: string;
        };
    }
}
declare function snapshot(): environmentProbe.Snapshot;
declare const environmentProbe: {
    snapshot: typeof snapshot;
};
export = environmentProbe;
