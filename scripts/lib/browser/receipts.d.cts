// Generated from receipts.cts by TypeScript 6.0.2; source-lf-sha256=828db85372b487329510b414da600b643656609bf86d0e499532bc626845af65
declare namespace receiptProbe {
    interface Binding {
        provider?: unknown;
        contract?: unknown;
        contextNonce?: unknown;
        requestDigest?: unknown;
    }
    interface Terminal extends Binding {
        status?: unknown;
        attemptId?: unknown;
        outcome?: unknown;
        remoteClosed?: unknown;
        spent?: unknown;
        evidence?: unknown;
    }
    interface Namespace {
        version?: unknown;
        nonce?: unknown;
        records?: Record<string, Terminal | undefined>;
    }
    interface Effect {
        id: string;
        status?: unknown;
        executionBinding?: Binding;
        result?: {
            outcome?: unknown;
            spent?: unknown;
            evidence?: unknown;
        };
    }
    interface Outcome {
        attemptId: string;
        outcome: 'occurred';
        remoteClosed: true;
        spent: number;
        source: string;
        evidence?: unknown;
    }
    interface Retirement {
        available: boolean;
        retired: string[];
        remaining: number | null;
        capacity: 64;
    }
}
declare function initialize(name: string, nonce: string): string | null;
declare function read(name: string, effects: receiptProbe.Effect[]): receiptProbe.Outcome[];
declare function retire(name: string, effects: receiptProbe.Effect[]): receiptProbe.Retirement;
declare const receiptProbe: {
    initialize: typeof initialize;
    read: typeof read;
    retire: typeof retire;
};
export = receiptProbe;
