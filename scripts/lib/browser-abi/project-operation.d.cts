/** Browser-only function: Node consumers may serialize it but must not invoke it. */
declare const operation: { readonly name: string; readonly length: number; toString(): string };
declare const browserABI: { readonly operation: typeof operation };
export = browserABI;
