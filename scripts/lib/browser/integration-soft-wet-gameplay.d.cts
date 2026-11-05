// Generated from integration-soft-wet-gameplay.cts by TypeScript 6.0.2; source-lf-sha256=aebeda0237392e9f227f30fc60cc23122e78f455e594bd232dbe29487f3c6fad
interface Request {
    operation: string;
    variable?: unknown;
    colour?: unknown;
    modder?: unknown;
    accessoryColour?: unknown;
}
declare function reader(request: Request): {
    status: string;
    reason: string;
    source: string;
} | {
    status: string;
    source: string;
    uiVersion: string | undefined;
    selector: string;
    index: number | null;
    operation: string;
    slot: string;
};
declare const _default: {
    reader: typeof reader;
};
export = _default;
