// =============================================
// Reimagined for Rhythia — Rhythia's player inside Exodus
// =============================================
// The map preview and the score replay stay Rhythia's: its page keeps running under Exodus,
// unseen, and only the player is shown, laid over a slot in the Exodus page (exodus/boot.css).
// A page asks for it through the shell (core/shell.js, ctx.dock); one slot is docked at a time.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusDock = (function () {
  'use strict';

  const html = document.documentElement;
  const DOCK = 'rhythiax-exodus-dock';
  let dockSlot = null, dockEl = null, dockFrame = 0, dockTimer = 0, dockAt = '';
  const queueDock = () => { if (!dockFrame) dockFrame = requestAnimationFrame(() => { dockFrame = 0; placeDock(); }); };
  const dockMo = new MutationObserver(queueDock);
  const dockRo = new ResizeObserver(queueDock);
  const findPlayer = () => document.querySelector('#root [aria-label="Playback position"]')?.closest('.rounded-xl') || null;
  function setDockEl(el) {
    if (el === dockEl) return;
    if (dockEl) { dockRo.unobserve(dockEl); dockEl.removeAttribute('data-rhythiax-dock'); }
    document.querySelectorAll('[data-rhythiax-dock-chain]').forEach(n => n.removeAttribute('data-rhythiax-dock-chain'));
    dockEl = el;
    if (!el) return;
    el.setAttribute('data-rhythiax-dock', '');
    for (let p = el.parentElement; p && p.id !== 'root'; p = p.parentElement) p.setAttribute('data-rhythiax-dock-chain', '');
    dockRo.observe(el);
  }
  function placeDock() {
    if (!dockSlot?.isConnected) return;
    setDockEl(findPlayer());
    dockSlot.classList.toggle('docked', Boolean(dockEl));
    if (!dockEl) return;
    const r = dockSlot.getBoundingClientRect(), at = `${r.left + scrollX}|${r.top + scrollY}|${r.width}`;
    if (at !== dockAt) {
      dockAt = at;
      html.style.setProperty('--rx-dock-x', `${r.left + scrollX}px`);
      html.style.setProperty('--rx-dock-y', `${r.top + scrollY}px`);
      html.style.setProperty('--rx-dock-w', `${r.width}px`);
    }
    const h = dockEl.offsetHeight;
    if (h && Math.abs(dockSlot.offsetHeight - h) > 1) dockSlot.style.height = `${h}px`;
  }
  // slot: the page's place for the player; appEl: the shell's <main id="app">, whose size moves the slot too.
  // Returns what the page keeps: release() when it leaves, refresh() after it redrew around the slot.
  function dock(slot, appEl) {
    undock();
    dockSlot = slot;
    html.classList.add(DOCK);
    dockMo.observe(document.getElementById('root') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    dockRo.observe(slot);
    dockRo.observe(appEl);
    addEventListener('resize', queueDock);
    // Layout can also shift without any size change Exodus can observe; a cheap check covers that.
    dockTimer = setInterval(queueDock, 400);
    placeDock();
    return { release: undock, refresh: queueDock };
  }
  function undock() {
    if (!dockSlot) return;
    dockMo.disconnect();
    dockRo.disconnect();
    removeEventListener('resize', queueDock);
    clearInterval(dockTimer);
    setDockEl(null);
    dockSlot = null;
    html.classList.remove(DOCK);
    dockAt = '';
    for (const k of ['x', 'y', 'w']) html.style.removeProperty(`--rx-dock-${k}`);
  }

  return { dock, undock };
})();
