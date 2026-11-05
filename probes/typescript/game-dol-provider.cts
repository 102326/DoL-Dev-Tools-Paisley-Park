// Local views describe page property access, not validation of external state.
interface GameWindow {SugarCube?:{State?:{passage?:unknown;turns?:unknown;variables?:{timeStamp?:unknown;location?:unknown;combat?:unknown}}}}
interface ControlView {safe?:unknown;requiresQuote?:unknown;reason?:unknown;scrollEligible?:unknown;actionable?:unknown}
function reader() {
  const state = (window as unknown as GameWindow).SugarCube?.State;
  const roots = document.querySelectorAll('#passages > .passage');
  const known = ['Bedroom', 'Wardrobe'];
  const passage = known.includes(state?.passage as string) ? state!.passage : 'unknown';
  const matches = roots.length === 1 && roots[0].getAttribute('data-passage') === state?.passage;
  const blocked = document.documentElement.classList.contains('ui-open') ||
    [...document.querySelectorAll('.dgu-surface, [aria-modal="true"]')].some(n => {
      const s = getComputedStyle(n), r = n.getBoundingClientRect();
      return n.isConnected && r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility === 'visible';
    });
  const links = document.querySelectorAll('#passages > .passage a.link-internal[data-passage="Wardrobe"]');
  let entryActionable = false;
  if (links.length === 1) {
    const node = links[0], r = node.getBoundingClientRect(), style = getComputedStyle(node);
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    if (node instanceof HTMLElement && node.isConnected && !node.matches(':disabled, [aria-disabled="true"]') && !node.closest('[inert]') &&
        r.width > 0 && r.height > 0 && x >= 0 && y >= 0 && x < innerWidth && y < innerHeight &&
        style.display !== 'none' && style.visibility === 'visible' && style.opacity !== '0' && style.pointerEvents !== 'none') {
      const hit = document.elementFromPoint(x, y); entryActionable = !!hit && (hit === node || node.contains(hit));
    }
  }
  const turns = Number.isSafeInteger(state?.turns) ? state!.turns : null;
  const time = Number.isFinite(state?.variables?.timeStamp) ? state!.variables!.timeStamp : null;
  return { passage, matches, blocked, links: links.length, entryActionable, turns, time,
    location: ['home', 'school', 'town'].includes(state?.variables?.location as string) ? state!.variables!.location : 'unknown' };
}
function gameplayReader(controlProbe?:((node:unknown)=>ControlView)) {
  const state = (window as unknown as GameWindow).SugarCube?.State, roots = document.querySelectorAll('#passages > .passage');
  const bounded = (value:unknown) => typeof value === 'string' && value.length <= 128 && !/[\u0000-\u001f]/.test(value) ? value : null;
  const passage = bounded(state?.passage), location = bounded(state?.variables?.location);
  const domAgrees = roots.length === 1 && roots[0].getAttribute('data-passage') === passage && passage !== null;
  const dialog = document.documentElement.classList.contains('ui-open') ? document.querySelector('#ui-dialog-body') : null;
  const surfaces = [...document.querySelectorAll('.dgu-surface, [aria-modal="true"]')].filter(n => {
    const r = n.getBoundingClientRect(), s = getComputedStyle(n);
    return n.isConnected && r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility === 'visible';
  });
  const scope = dialog || (surfaces.length === 1 ? surfaces[0] : roots[0]);
  const nodes = scope ? scope.querySelectorAll('a.link-internal, button, [role="button"], label:has(> input.macro-radiobutton[type="radio"])') : [];
  const choices:Record<string,unknown>[] = [];
  // Explicit private Gameplay context, excluding forms/save lists and never input values.
  let narrative='',narrativeTruncated=false;
  if(scope&&document.createTreeWalker){
    const walker=document.createTreeWalker(scope,4);let n,scannedText=0,visibleText=0;
    while((n=walker.nextNode())){
      // SugarCube emits hundreds of whitespace nodes while evaluating widgets.
      // Keep traversal bounded without charging those against readable context.
      if(++scannedText>4096){narrativeTruncated=true;break}
      const parent=n.parentElement;
      if(!parent||parent.closest('script,style,form,input,textarea,select,#saves,.saveList,.dgs-host,[data-save-slot]'))continue;
      const style=getComputedStyle(parent);if(style.display==='none'||style.visibility==='hidden'||style.opacity==='0')continue;
      const part=(n.textContent||'').replace(/[\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim();if(!part)continue;
      if(++visibleText>256){narrativeTruncated=true;break}
      const joined=(narrative?narrative+' ': '')+part;
      if(joined.length>2048){narrative=joined.slice(0,2048);narrativeTruncated=true;break}narrative=joined;
    }
  }
  function selectorFor(node:Element){
    const parts:string[]=[];let n:Element|null=node;
    while(n&&n!==document.documentElement&&parts.length<16){
      const tag=n.tagName?.toLowerCase(),parent:Element|null=n.parentElement;if(!/^[a-z][a-z0-9-]*$/.test(tag||'')||!parent)return null;
      const index=Array.prototype.indexOf.call(parent.children,n);if(index<0)return null;parts.unshift(tag+':nth-child('+(index+1)+')');n=parent;
    }
    if(n!==document.documentElement)return null;const selector='html > '+parts.join(' > ');
    return selector.length<=256&&document.querySelectorAll(selector).length===1?selector:null;
  }
  // Do not read passage body, input contents, save objects, inventory or credentials.
  let scanned = 0;
  for (let i = 0; i < Math.min(nodes.length, 512) && choices.length < 64; i++) {
    scanned++;
    const node = nodes[i], r = node.getBoundingClientRect(), style = getComputedStyle(node);
    if(node.tagName==='LABEL'&&(state?.variables?.combat!==1||node.querySelectorAll('input').length!==1||node.querySelector('select,textarea')||node.closest('form')))continue;
    if (!node.isConnected || r.width <= 0 || r.height <= 0 || style.display === 'none' || style.visibility !== 'visible' || style.opacity === '0') continue;
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementFromPoint(x, y) : null;
    const rawLabel = node.getAttribute('aria-label') || node.textContent || '';
    const control=controlProbe?.(node);
    choices.push({ index: i, selector:selectorFor(node),safe:control?.safe===true,requiresQuote:control?.requiresQuote===true,riskReason:control?.reason??null,tag: node.tagName.toLowerCase(), label: rawLabel.trim().slice(0, 160), labelTruncated: rawLabel.trim().length > 160,
      destination: bounded(node.getAttribute('data-passage')),
      linkDestinationKind: node.getAttribute('href') ? node.getAttribute('href')!.startsWith('#') ? 'fragment' : 'requires-review' : 'not-present',
      credentialForm: !!node.closest('form')?.querySelector('input[type="password"]'),
      scrollEligible: control?.scrollEligible===true,
      centerActionable: control ? control.actionable===true : node.isConnected && !node.matches(':disabled, [aria-disabled="true"]') && !node.closest('[inert]') &&
        r.width > 0 && r.height > 0 && style.display !== 'none' && style.visibility === 'visible' && style.opacity !== '0' &&
        style.pointerEvents !== 'none' && !!hit && (hit === node || node.contains(hit)) });
  }
  return { source: 'original game state and current visible control metadata; choices require Agent interpretation', passage, location, domAgrees, turns:state?.turns??null,time:state?.variables?.timeStamp??null,
    surface: dialog ? 'sugarcube-dialog' : surfaces.length === 1 ? 'overlay' : surfaces.length > 1 ? 'ambiguous-overlays' : 'passage',
    narrative,narrativeTruncated,choices, choicesTruncated: scanned < nodes.length, candidateControls: nodes.length, scannedControls: scanned,
    stateReadable: Number.isSafeInteger(state?.turns) && Number.isFinite(state?.variables?.timeStamp),
    privacy: 'private bounded visible gameplay context and labels; no save body, input value or inventory' };
}
function controlReader(rawNode:unknown) {
  const node=rawNode as Element;
  const state = (window as unknown as GameWindow).SugarCube?.State, roots = document.querySelectorAll('#passages > .passage');
  const label = (node.getAttribute('aria-label') || node.textContent || '').trim().slice(0, 256);
  const href = node.getAttribute('href');
  const saveContext = !!node.closest('#saves, .dgs-host, .dgs-shell, .dgs-layout, .saveList, [data-save-slot]');
  const saveRead = node.matches('.dgs-load, .loadButton, .load, .dgs-item:not(.dgs-empty-slot), .ui-close') || /^(读取|加载|Load|取消|Cancel|关闭|Close)$/i.test(label);
  const destructive = node.matches('.deleteButton, .saveButton, .dgs-delete, [data-action="delete-save"], [data-action="overwrite-save"]') ||
    /(?:删除|覆盖|清空|Delete|Overwrite).{0,20}(?:存档|Save)|(?:存档|Save).{0,20}(?:删除|覆盖|清空|Delete|Overwrite)/i.test(label) || saveContext && !saveRead;
  const external = !!href && !href.startsWith('#') && !/^javascript:void\(0\);?$/.test(href);
  const credentials = !!node.closest('form')?.querySelector('input[type="password"]');
  const requiresQuote=!!node.closest('#buy-send-home,#buy-and-wear,.buy-button,[data-action="buy"],[data-action="sell"]');
  const gameControl = !!node.closest('#passages, #ui-dialog, #ui-bar, .dgu-surface');
  const r = node.getBoundingClientRect(), style = getComputedStyle(node), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const hit = x >= 0 && y >= 0 && x < innerWidth && y < innerHeight ? document.elementFromPoint(x, y) : null;
  const dialogOpen=document.documentElement.classList.contains('ui-open');
  const dialog = dialogOpen ? document.querySelector('#ui-dialog-body') : null;
  const surfaces = [...document.querySelectorAll('.dgu-surface, [aria-modal="true"]')].filter(n => {
    const rect=n.getBoundingClientRect(), s=getComputedStyle(n);
    return n.isConnected && rect.width>0 && rect.height>0 && s.display!=='none' && s.visibility==='visible';
  });
  const scope=dialogOpen ? dialog : surfaces.length===1 ? surfaces[0] : surfaces.length===0 ? roots[0] : null;
  let ancestorsVisible=true;
  for(let ancestor:Element|null=node;ancestor;ancestor=ancestor.parentElement){
    const s=getComputedStyle(ancestor);
    if(s.display==='none'||s.visibility!=='visible'||s.opacity==='0'||s.pointerEvents==='none'){ancestorsVisible=false;break}
  }
  const scrollEligible=node.isConnected && roots.length===1 && scope?.contains(node)===true &&
    !node.matches(':disabled, [aria-disabled="true"]') && !node.closest('[inert]') && ancestorsVisible &&
    Number.isFinite(x) && Number.isFinite(y) && r.width>0 && r.height>0 &&
    (x<0||y<0||x>=innerWidth||y>=innerHeight);
  return { passage: typeof state?.passage === 'string' && state.passage.length <= 128 ? state!.passage : null,
    domAgrees: roots.length === 1 && roots[0].getAttribute('data-passage') === state?.passage,
    turns: Number.isSafeInteger(state?.turns) ? state!.turns : null, time: Number.isFinite(state?.variables?.timeStamp) ? state!.variables!.timeStamp : null,
    safe: gameControl && !destructive && !external && !credentials,requiresQuote,scrollEligible,
    reason: destructive ? 'save-write-or-destruction' : external ? 'external-system' : credentials ? 'credentials' : !gameControl ? 'unverified-game-control' : null,
    actionable: node.isConnected && roots.length===1 && scope?.contains(node)===true && ancestorsVisible && !node.matches(':disabled, [aria-disabled="true"]') && !node.closest('[inert]') && r.width > 0 && r.height > 0 &&
      style.display !== 'none' && style.visibility === 'visible' && style.opacity !== '0' && style.pointerEvents !== 'none' && !!hit && (hit === node || node.contains(hit)) };
}
export = {reader,gameplayReader,controlReader};
