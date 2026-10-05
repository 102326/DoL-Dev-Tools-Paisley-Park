// Owned, temporary layout fixture. No game objects, storage, listeners or global CSS.
function deploy(id) {
  const size = 20;
  if (!/^dol-dev-workshop-[a-f0-9-]{36}$/.test(id)) throw Error('Invalid fixture identity');
  let root = document.getElementById(id);
  if (root && root.getAttribute('data-dol-dev-owned') !== id) throw Error('Fixture identity conflict');
  if (!root) {
    root = document.createElement('div'); root.id = id; root.setAttribute('data-dol-dev-owned', id);
    root.setAttribute('aria-hidden', 'true');
    Object.assign(root.style, {position:'fixed',left:'8px',top:'8px',width:'80px',height:'80px',pointerEvents:'none',zIndex:'2147483647'});
    const marker = document.createElement('div'); marker.setAttribute('data-dol-dev-owned', id);
    root.appendChild(marker); document.body.appendChild(root);
  }
  const marker = root.firstElementChild;
  if (root.children.length !== 1 || marker.getAttribute('data-dol-dev-owned') !== id) throw Error('Fixture contents conflict');
  Object.assign(marker.style, {width:size+'px',height:size+'px',background:'#2676ad',border:'0',padding:'0',margin:'0',boxSizing:'border-box',display:'block'});
  const rect = marker.getBoundingClientRect();
  return {width:rect.width,height:rect.height,scope:id,content:'owned fixture only'};
}
