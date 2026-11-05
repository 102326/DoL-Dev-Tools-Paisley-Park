// Generated from game-dol-provider.cts by TypeScript 6.0.2; source-lf-sha256=6491f1b5d5ee228abcbf4608bd366112d4a977e9ce87bdcd92b096528f127d89
interface ControlView {
    safe?: unknown;
    requiresQuote?: unknown;
    reason?: unknown;
    scrollEligible?: unknown;
    actionable?: unknown;
}
declare function reader(): {
    passage: unknown;
    matches: boolean;
    blocked: boolean;
    links: number;
    entryActionable: boolean;
    turns: unknown;
    time: unknown;
    location: unknown;
};
declare function gameplayReader(controlProbe?: ((node: unknown) => ControlView)): {
    source: string;
    passage: string | null;
    location: string | null;
    domAgrees: boolean;
    turns: {} | null;
    time: {} | null;
    surface: string;
    narrative: string;
    narrativeTruncated: boolean;
    choices: Record<string, unknown>[];
    choicesTruncated: boolean;
    candidateControls: number;
    scannedControls: number;
    stateReadable: boolean;
    privacy: string;
};
declare function controlReader(rawNode: unknown): {
    passage: string | null;
    domAgrees: boolean;
    turns: unknown;
    time: unknown;
    safe: boolean;
    requiresQuote: boolean;
    scrollEligible: boolean;
    reason: string | null;
    actionable: boolean;
};
declare const _default: {
    reader: typeof reader;
    gameplayReader: typeof gameplayReader;
    controlReader: typeof controlReader;
};
export = _default;
