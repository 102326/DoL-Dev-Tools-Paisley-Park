// Public diagnostic metadata is finite; page messages, input and paths never pass through.
/** @typedef {{code?:unknown,cdpStage?:unknown,cdpMethod?:unknown,actionReason?:unknown,actionField?:unknown}} ErrorMetadata */
/** @typedef {{code:string,stage:string,hint:string,method?:string,field?:string,reason?:string,source?:'page-reported'}} Diagnostic */
const methods = new Set(['Runtime.evaluate','Runtime.callFunctionOn','Runtime.getProperties','Runtime.enable',
  'DOM.getDocument','DOM.querySelector','DOM.getDetachedDomNodes','CSS.getComputedStyleForNode',
  'Page.getFrameTree','Page.getNavigationHistory','Page.navigate','Page.reload','Network.enable']);
const cdpStages = ['cdp.discovery','cdp.connect','cdp.command'];
const fields = ['action','type','selector','value','x','y','degrees'];
/** @type {Record<string,[string,string]>} */
const entries = {
  ANDROID_DOCUMENT_URL_UNAVAILABLE: ['context.identity','The complete document URL could not be verified. Check the original peer capabilities and binding; do not weaken identity checks or replay an uncertain operation.'],
  CDP_TARGET_MISSING: ['cdp.target','The selected page is absent. Check the original target identity; do not select another page by title.'],
  CDP_TARGET_AMBIGUOUS: ['cdp.target','Page selection is ambiguous. Inspect the target inventory and bind the reviewed target ID.'],
  CDP_CONNECTION_CLOSED: ['cdp.transport','The transport closed. Check the original target and pending execution evidence. Do not blindly replay an operation.'],
  CDP_COMMAND_REJECTED: ['cdp.command','The protocol rejected the command. Check supported capabilities and the original target; raw protocol content omitted.'],
  ACTION_INVALID: ['action.validate','Use a supported Action object with only its documented fields.'],
  ACTION_FIELD_MISSING: ['action.validate','Provide the required field using the Action format in docs/ACTIONS.md.'],
  ACTION_FIELD_INVALID: ['action.validate','Check the documented field type and range; supplied data omitted.'],
  ACTION_LENGTH_EXCEEDED: ['action.validate','Reduce the field to its documented limit; do not split and replay a possible side effect automatically.'],
  ACTION_INPUT_UNSUPPORTED: ['action.validate','Use supported native input characters or the reviewed web-input route; supplied data omitted.'],
};
/** @type {Record<string,string>} */
const rejections = {
  missing: 'The page reported no matching node. Independently inspect the selector and current document before a new reviewed action.',
  ambiguous: 'The page reported multiple matching nodes. Narrow the selector using current identity and ownership evidence.',
  unavailable: 'The page reported an availability guard rejection. Inspect connected, disabled, inert and visible state; do not force a click.',
  'unsupported-type': 'The page reported an unsupported web-input control. Inspect its actual type and use a reviewed original entry point.',
  'focus-unconfirmed': 'The page did not confirm focus. Inspect the current control and document before continuing.',
};
/** @param {'cdp.discovery'|'cdp.connect'|'cdp.command'} stage @param {string} [method] */
function cdpTimeout(stage, method) {
  const message = stage === 'cdp.discovery' ? 'CDP discovery timeout' : stage === 'cdp.connect' ? 'CDP connection timeout'
    : 'CDP evaluation timeout'; // Legacy message/manifest reason; new metadata identifies the actual command.
  const code = stage === 'cdp.discovery' ? 'CDP_DISCOVERY_TIMEOUT' : stage === 'cdp.connect' ? 'CDP_CONNECT_TIMEOUT' : 'ETIMEDOUT';
  return Object.assign(new Error(message), {code,cdpStage:stage,
    ...(methods.has(method) ? {cdpMethod:method} : {})});
}
/** @param {ErrorMetadata|null|undefined} error @returns {Diagnostic|null} */
function describe(error) {
  const code = error?.code;
  const phase = typeof error?.cdpStage === 'string' ? error.cdpStage : '';
  const method = typeof error?.cdpMethod === 'string' ? error.cdpMethod : '';
  const field = typeof error?.actionField === 'string' ? error.actionField : '';
  const reason = typeof error?.actionReason === 'string' ? error.actionReason : '';
  let stage, hint;
  if (code === 'CDP_DISCOVERY_TIMEOUT' || code === 'CDP_CONNECT_TIMEOUT' || code === 'ETIMEDOUT' && cdpStages.includes(phase)) {
    stage = code === 'CDP_DISCOVERY_TIMEOUT' ? 'cdp.discovery' : code === 'CDP_CONNECT_TIMEOUT' ? 'cdp.connect' : phase;
    hint = 'The CDP phase timed out; this is not proof of device failure or remote cancellation. Check the original target and execution evidence. Do not blindly replay an operation that may have been dispatched.';
  } else if (code === 'WEB_ACTION_REJECTED') {
    stage = 'action.result';
    hint = Object.hasOwn(rejections,reason) ? rejections[reason] : 'The web action was not confirmed; the rejection cause is unknown.';
    hint += ' This diagnostic does not prove zero side effects or settle a Gameplay effect.';
  } else if (typeof code === 'string' && Object.hasOwn(entries,code)) [stage,hint] = entries[code];
  else return null;
  return {code,stage,...(code === 'ETIMEDOUT' && stage === 'cdp.command' && methods.has(method) ? {method} : {}),
    ...(stage === 'action.validate' && fields.includes(field) ? {field} : {}),
    ...(code === 'WEB_ACTION_REJECTED' ? {source:'page-reported'} : {}),
    ...(code === 'WEB_ACTION_REJECTED' && Object.hasOwn(rejections,reason) ? {reason} : {}),hint};
}
module.exports = {describe,cdpTimeout};
