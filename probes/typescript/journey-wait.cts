function waitProbe(scope:string, condition:'exists'|'visible'|'hidden'|'absent') {
  const nodes = document.querySelectorAll<HTMLElement>(scope);
  if (condition === 'absent') return { satisfied: nodes.length === 0, matches: nodes.length };
  if (nodes.length !== 1) return { satisfied: false, matches: nodes.length };
  const n = nodes[0], rect = n.getBoundingClientRect(), style = getComputedStyle(n);
  const visible = n.isConnected && !n.hidden && rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
  return { satisfied: condition === 'exists' || (condition === 'visible' ? visible : !visible), matches: 1 };
}
const api={waitProbe};
export = api;
