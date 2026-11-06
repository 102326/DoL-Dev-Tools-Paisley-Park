// Generated from diagnostics.cts by TypeScript 6.0.2; source-lf-sha256=e3a685fae5a1f5e1709fa26210b3a18526eb6dea391947a30d1ce9588e932505
"use strict";
// Public diagnostic metadata is finite; page messages, input and paths never pass through.
const methods = new Set(['Runtime.evaluate', 'Runtime.callFunctionOn', 'Runtime.getProperties', 'Runtime.enable',
    'DOM.getDocument', 'DOM.querySelector', 'DOM.getDetachedDomNodes', 'CSS.getComputedStyleForNode',
    'Page.getFrameTree', 'Page.getNavigationHistory', 'Page.navigate', 'Page.reload', 'Page.captureScreenshot', 'Network.enable']);
const cdpStages = ['cdp.discovery', 'cdp.connect', 'cdp.command'];
const fields = ['action', 'type', 'selector', 'value', 'x', 'y', 'degrees'];
const initialDocumentReasons = new Set(['initial-empty-document', 'initial-url-mismatch', 'initial-context-unavailable', 'initial-loader-unavailable']);
const entries = {
    PC_DOCUMENT_CHANGED: ['pc.document', 'The original document binding is invalid. Preserve pending effects; a fresh binding is for new work, not settlement or automatic replay.'],
    PC_TARGET_UNAVAILABLE: ['pc.target', 'The exact owned page is unavailable. Inspect pc-pages; no replacement page was adopted.'],
    PC_BROWSER_METADATA_INVALID: ['pc.browser', 'The original browser identity response is malformed. Inspect the owned endpoint; this does not prove a device fault or process change. No other browser was adopted.'],
    PC_BROWSER_UNAVAILABLE: ['pc.browser', 'The original owned browser is unavailable. Inspect its local instance records; no other browser was adopted.'],
    PC_BROWSER_IDENTITY_CHANGED: ['pc.browser', 'The live browser, endpoint or Profile differs from the original record. Preserve original execution evidence; do not retarget.'],
    PC_ACTION_UNSUPPORTED: ['pc.action', 'Use reviewed Web actions for Chrome; native Android actions require their explicit Android target.'],
    PC_CLEANUP_UNCONFIRMED: ['pc.cleanup', 'Owned instance cleanup was not fully confirmed. Retain its Profile and local records, including startup-failure.json when present; inspect this instance before reusing it. Do not assume its browser or HTTP listener is closed. No automatic cleanup retry or operation replay.'],
    PROJECT_SCOPE_TARGET_CHANGED: ['gameplay.authority', 'The original authorized target/data domain does not match. Keep the original Session and unresolved effects; supplied identity omitted.'],
    PROJECT_SCOPE_INTENT_CHANGED: ['gameplay.authority', 'The requested operation is outside the recorded authority. Review the task scope; no automatic expansion or retry.'],
    SOURCE_REQUEST_INVALID: ['source.request', 'Use schemaVersion 1, bounded literal clues and limits. Supply an absolute --root; query files omit root/revision. See docs/GAME_SOURCE.md.'],
    SOURCE_QUERY_INVALID: ['source.query', 'Provide a readable regular UTF-8 JSON query file at most 65536 bytes; no output was published. See schemas/source-find-query-v1.schema.json.'],
    SOURCE_ROOT_UNAVAILABLE: ['source.identity', 'Check the reviewed source directory and permissions. No game download or alternate root was selected.'],
    SOURCE_REVISION_UNAVAILABLE: ['source.identity', 'Use the repository root and a locally available reviewed Git ref. No checkout, fetch or fallback revision was used.'],
    SOURCE_READ_FAILED: ['source.search', 'The selected source could not be read reliably. Inspect access and local source availability; cause unknown.'],
    SOURCE_CANCELLED: ['source.search', 'Source search was cancelled before a result was published. No source or gameplay was modified.'],
    SOURCE_TIMEOUT: ['source.search', 'Read-only search exceeded its elapsed budget; this does not diagnose a device. Narrow clues/root or review limits before a new local query.'],
    SOURCE_RUNTIME_UNAVAILABLE: ['source.runtime', 'This command requires Node 26+ and the complete prebuilt scripts/lib/source-find.cjs file. No TypeScript compiler or runtime loader is needed or installed automatically.'],
    SOURCE_OUTPUT_EXISTS: ['source.output', 'Existing output preserved. Choose a new local output filename; do not delete unknown data to retry.'],
    SOURCE_OUTPUT_TOO_LARGE: ['source.output', 'Result exceeds the output budget. Narrow the query or reduce maxResults/contextLines; no output was published.'],
    SOURCE_OUTPUT_FAILED: ['source.output', 'Result publication failed. Check the existing parent directory, permissions and same-filesystem hard-link support. No overwrite/copy fallback was performed. Inspect the selected output before retrying.'],
    SOURCE_OUTPUT_INCOMPLETE: ['source.cleanup', 'Result publication or owned temporary cleanup could not be confirmed; an output may already exist. Preserve unknown leftovers; inspect the selected parent before retrying a new output name.'],
    ANDROID_DOCUMENT_URL_UNAVAILABLE: ['context.identity', 'The complete document URL could not be verified. Check the original peer capabilities and binding; do not weaken identity checks or replay an uncertain operation.'],
    CDP_TARGET_MISSING: ['cdp.target', 'The selected page is absent. Check the original target identity; do not select another page by title.'],
    CDP_TARGET_AMBIGUOUS: ['cdp.target', 'Page selection is ambiguous. Inspect the target inventory and bind the reviewed target ID.'],
    CDP_CONNECTION_CLOSED: ['cdp.transport', 'The transport closed. Check the original target and pending execution evidence. Do not blindly replay an operation.'],
    CDP_COMMAND_REJECTED: ['cdp.command', 'The protocol rejected the command. Check supported capabilities and the original target; raw protocol content omitted.'],
    ACTION_INVALID: ['action.validate', 'Use a supported Action object with only its documented fields.'],
    ACTION_FIELD_MISSING: ['action.validate', 'Provide the required field using the Action format in docs/ACTIONS.md.'],
    ACTION_FIELD_INVALID: ['action.validate', 'Check the documented field type and range; supplied data omitted.'],
    ACTION_LENGTH_EXCEEDED: ['action.validate', 'Reduce the field to its documented limit; do not split and replay a possible side effect automatically.'],
    ACTION_INPUT_UNSUPPORTED: ['action.validate', 'Use supported native input characters or the reviewed web-input route; supplied data omitted.'],
};
/** @type {Record<string,string>} */
const rejections = {
    missing: 'The page reported no matching node. Independently inspect the selector and current document before a new reviewed action.',
    ambiguous: 'The page reported multiple matching nodes. Narrow the selector using current identity and ownership evidence.',
    unavailable: 'The page reported an availability guard rejection. Inspect connected, disabled, inert and visible state; do not force a click.',
    'unsupported-type': 'The page reported an unsupported web-input control. Inspect its actual type and use a reviewed original entry point.',
    'focus-unconfirmed': 'The page did not confirm focus. Inspect the current control and document before continuing.',
};
function cdpTimeout(stage, method) {
    const message = stage === 'cdp.discovery' ? 'CDP discovery timeout' : stage === 'cdp.connect' ? 'CDP connection timeout'
        : 'CDP evaluation timeout'; // Legacy message/manifest reason; new metadata identifies the actual command.
    const code = stage === 'cdp.discovery' ? 'CDP_DISCOVERY_TIMEOUT' : stage === 'cdp.connect' ? 'CDP_CONNECT_TIMEOUT' : 'ETIMEDOUT';
    return Object.assign(new Error(message), { code, cdpStage: stage,
        ...(methods.has(method) ? { cdpMethod: method } : {}) });
}
function describe(error) {
    // Read an unknown metadata view; every exported field is still checked below.
    const metadata = error;
    const code = metadata?.code;
    const phase = typeof metadata?.cdpStage === 'string' ? metadata.cdpStage : '';
    const method = typeof metadata?.cdpMethod === 'string' ? metadata.cdpMethod : '';
    const field = typeof metadata?.actionField === 'string' ? metadata.actionField : '';
    const reason = typeof metadata?.actionReason === 'string' ? metadata.actionReason : '';
    const initialReason = typeof metadata?.pcDocumentReason === 'string' && initialDocumentReasons.has(metadata.pcDocumentReason) ? metadata.pcDocumentReason : undefined;
    let stage, hint;
    if (code === 'CDP_DISCOVERY_TIMEOUT' || code === 'CDP_CONNECT_TIMEOUT' || code === 'ETIMEDOUT' && cdpStages.includes(phase)) {
        stage = code === 'CDP_DISCOVERY_TIMEOUT' ? 'cdp.discovery' : code === 'CDP_CONNECT_TIMEOUT' ? 'cdp.connect' : phase;
        hint = 'The CDP phase timed out; this is not proof of device failure or remote cancellation. Check the original target and execution evidence. Do not blindly replay an operation that may have been dispatched.';
    }
    else if (code === 'WEB_ACTION_REJECTED') {
        stage = 'action.result';
        hint = Object.hasOwn(rejections, reason) ? rejections[reason] : 'The web action was not confirmed; the rejection cause is unknown.';
        hint += ' This diagnostic does not prove zero side effects or settle a Gameplay effect.';
    }
    else if (code === 'PC_DOCUMENT_CHANGED' && initialReason) {
        stage = 'pc.document';
        hint = 'The requested initial document binding is not ready on the selected target; no binding was created. For pc-start, inspect startup-failure.json when available, together with the owned HTTP/Chrome records. The cause is unknown; no alternate target or automatic action retry was attempted. Preserve any historical pending effects.';
    }
    else if (knownCode(code))
        [stage, hint] = entries[code];
    else
        return null;
    return { code, stage, ...(code === 'ETIMEDOUT' && stage === 'cdp.command' && methods.has(method) ? { method } : {}),
        ...(stage === 'action.validate' && fields.includes(field) ? { field } : {}),
        ...(code === 'WEB_ACTION_REJECTED' ? { source: 'page-reported' } : {}),
        ...(code === 'WEB_ACTION_REJECTED' && Object.hasOwn(rejections, reason) ? { reason } : {}),
        ...(code === 'PC_DOCUMENT_CHANGED' && initialReason ? { reason: initialReason } : {}), hint };
}
function knownCode(code) { return typeof code === 'string' && Object.hasOwn(entries, code); }
function pcCleanup(errors) { return Object.assign(new AggregateError(errors, 'Owned PC cleanup unconfirmed', { cause: errors[0] }), { code: 'PC_CLEANUP_UNCONFIRMED' }); }
const diagnostics = { describe, cdpTimeout, pcCleanup };
module.exports = diagnostics;
