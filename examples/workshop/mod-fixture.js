(() => {
  const size = 20;
  const id = 'dol-dev-tools-packaged-workshop';
  function mount() {
    if (document.getElementById(id)) throw Error('Workshop fixture collision');
    const root = document.createElement('div'), button = document.createElement('button');
    root.id = id;
    root.setAttribute('aria-hidden', 'true');
    root.style.cssText = 'position:fixed;left:8px;top:8px;width:80px;height:80px;pointer-events:none;';
    button.style.cssText = `width:${size}px;height:${size}px;padding:0;border:0;pointer-events:none;`;
    button.tabIndex = -1;
    root.append(button);
    document.body.append(root);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
