// Offline design viewer. All operations below change only the local document.
(() => {
  const selector = document.querySelector('#state');
  const main = document.querySelector('main');
  const live = document.querySelector('#announcement');
  const heading = document.querySelector('h1');
  if (heading) heading.tabIndex = -1;
  let lastFocusedFrame = null;
  document.addEventListener('focusin', event => {
    if(event.target !== document.body) lastFocusedFrame = event.target.closest('.state');
  });
  function showState(announce) {
    if (!selector) return;
    const requested = location.hash.slice(1);
    const state = Array.from(selector.options).some(o => o.value === requested) ? requested : 'example';
    const losingFocus = document.activeElement?.closest('.state') || lastFocusedFrame;
    const openDialog = document.querySelector('dialog[open]');
    if(openDialog && openDialog.closest('.state').id !== state) openDialog.close();
    for (const frame of document.querySelectorAll('.state')) frame.hidden = frame.id !== state;
    selector.value = state;
    if (losingFocus && (losingFocus.hidden || losingFocus.id !== state)) heading.focus();
    if (announce) live.textContent = selector.selectedOptions[0].text + ' design fixture displayed.';
    scrollRegions();
  }
  selector?.addEventListener('change', () => {
    history.pushState(null, '', '#'+selector.value);
    showState(true);
  });
  window.addEventListener('hashchange', () => {
    if (location.hash !== '#main') showState(true);
  });
  document.querySelector('.skip')?.addEventListener('click', event => {
    event.preventDefault();
    main.focus();
  });
  function scrollRegions() {
    for (const container of document.querySelectorAll('.scroll')) {
      const overflow = container.clientWidth > 0 && container.scrollWidth > container.clientWidth;
      if (overflow) {
        container.tabIndex = 0;
        container.setAttribute('role','region');
        container.setAttribute('aria-label', (container.querySelector('table')?.getAttribute('aria-label') || 'Data table') + ', scroll horizontally');
      } else {
        container.removeAttribute('tabindex'); container.removeAttribute('role');container.removeAttribute('aria-label');
      }
    }
  }
  const sidebar=document.querySelector('.sidebar');
  const nav=sidebar.querySelector('nav'),directory=sidebar.querySelector('.directory');
  nav.id='workspace-links'; directory.id='directory-link';
  const trigger=document.createElement('button');
  trigger.className='nav-toggle'; trigger.type='button'; trigger.textContent='Workspace navigation';
  trigger.setAttribute('aria-controls','workspace-links directory-link');
  sidebar.prepend(trigger);
  const compact=matchMedia('(max-width:800px)');
  function setMenu(open) {
    if (!open && sidebar.contains(document.activeElement) && document.activeElement!==trigger) trigger.focus();
    nav.hidden=directory.hidden=!open;trigger.setAttribute('aria-expanded',String(open));
  }
  trigger.addEventListener('click',()=>setMenu(nav.hidden));
  compact.addEventListener('change',()=>setMenu(!compact.matches));
  setMenu(!compact.matches);
  sidebar.addEventListener('keydown',e=>{if(e.key==='Escape' && compact.matches && !nav.hidden){setMenu(false);trigger.focus();}});
  for(const dialog of document.querySelectorAll('dialog')){
    const opener=dialog.parentElement.querySelector('[data-open-dialog]');
    opener.addEventListener('click',()=>{dialog.showModal(); dialog.querySelector('[data-close-dialog]').focus();});
    dialog.querySelector('[data-close-dialog]').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('keydown',event=>{
      if(event.key==='Tab'){event.preventDefault();dialog.querySelector('[data-close-dialog]').focus();}
    });
    dialog.addEventListener('close',()=>{if(opener.closest('.state').hidden) heading.focus();else opener.focus();});
  }
  showState(false);
  window.addEventListener('resize',scrollRegions);
})();
