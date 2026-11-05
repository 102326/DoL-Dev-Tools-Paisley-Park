// Generated from integration-native-head-state.cts by TypeScript 6.0.2; source-lf-sha256=1f0ff4492f806e8fdc1f185f044c99f17d3aedf853abe0495a6f840d66508fbf
interface Request {
    operation: string;
}
interface Mapping {
    status: string;
    uiVersion?: string;
    index: number;
}
declare function stateReader(request: Request, interpret: (request: Request) => Mapping, slots: string[]): {
    status: string;
    reason: string;
} | {
    before: any;
    nativeListSelector: string;
    status: string;
    uiVersion?: string;
    index: number;
};
declare const _default: {
    stateReader: typeof stateReader;
};
export = _default;
