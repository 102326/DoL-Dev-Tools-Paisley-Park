// Generated from journey-wait.cts by TypeScript 6.0.2; source-lf-sha256=d0718159cafd48f0dbe9ed8d4301ef8bffc749cf723b50777e02b8a0509480aa
declare function waitProbe(scope: string, condition: 'exists' | 'visible' | 'hidden' | 'absent'): {
    satisfied: boolean;
    matches: number;
};
declare const api: {
    waitProbe: typeof waitProbe;
};
export = api;
