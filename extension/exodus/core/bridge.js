// =============================================
// Reimagined for Rhythia — Exodus player bridge (page world)
// =============================================
// Runs in the page's own JavaScript world (engines.js registers it with world MAIN) so it can
// reach Rhythia's map preview, which Exodus shows inside its map page. It only
// calls the preview's own functions: its speed change (any speed, not only the
// eight in its menu), its seek and its play button. Exodus asks through DOM
// events with JSON text and gets the preview's state back the same way. When
// Rhythia's code changes and a function cannot be found, it answers ok: false
// and Exodus hides the controls.

(function () {
  'use strict';

  const ASK = 'rhythiax:exodus-player';
  const TELL = 'rhythiax:exodus-player-state';

  // A component's name, also through React.memo and forwardRef wrappers.
  const nameOf = t => (t && (t.name || t.displayName || (t.type && t.type.name) || (t.render && t.render.name))) || '';

  const fiberOf = el => {
    const key = el && Object.keys(el).find(k => k.startsWith('__reactFiber$'));
    return key ? el[key] : null;
  };

  // The preview component that owns the player Exodus shows.
  function preview() {
    if (!document.documentElement.classList.contains('rhythiax-exodus-dock')) return null;
    let f = fiberOf(document.querySelector('[data-rhythiax-dock]'));
    while (f && nameOf(f.type) !== 'MapVisualizer') f = f.return;
    return f;
  }

  // Its playback hook keeps changeSpeed as a memoised callback: (speed) => { …ref.current = speed, setSpeed(speed) … }.
  const SPEED_SRC = /^\(?(\w+)\)?=>\{const \w+=\w+\.current\?\w+\(\):\w+\.current;\w+\.current=\1,\w+\(\1\)/;
  function changeSpeed(f) {
    for (let h = f.memoizedState; h; h = h.next) {
      const v = h.memoizedState;
      if (Array.isArray(v) && v.length === 2 && typeof v[0] === 'function' && Array.isArray(v[1]) && SPEED_SRC.test(String(v[0]))) return v[0];
    }
    return null;
  }

  // The control bar below the canvas: its props carry seek, play/pause and the current state.
  function controls(f) {
    const stack = [f.child];
    while (stack.length) {
      const c = stack.pop();
      if (!c) continue;
      if (/^PlaybackControls(Impl)?$/.test(nameOf(c.type))) return c.memoizedProps;
      stack.push(c.sibling, c.child);
    }
    return null;
  }

  function state(f) {
    const p = f && controls(f);
    return p ? { ok: Boolean(changeSpeed(f)), speed: p.speed, playing: Boolean(p.playing), ms: p.currentMs, duration: p.durationMs } : { ok: false };
  }

  document.addEventListener(ASK, e => {
    let req;
    try { req = JSON.parse(String(e.detail)); } catch (_) { return; }
    // Exodus always sends an object; anything else (null, a number) gets no answer.
    if (!req || typeof req !== 'object') return;
    const f = preview();
    let res = { ok: false };
    try {
      if (f && req.op === 'speed') {
        const v = Number(req.value), set = changeSpeed(f);
        if (set && v >= 0.25 && v <= 2) set(v);
      }
      if (f && req.op === 'seek') {
        const p = controls(f), ms = Number(req.value);
        if (p && Number.isFinite(ms)) { p.onSeek(Math.max(0, ms)); if (!p.playing && req.play) p.onTogglePlay(); }
      }
      res = state(f);
    } catch (_) { res = { ok: false }; }
    document.dispatchEvent(new CustomEvent(TELL, { detail: JSON.stringify({ id: req.id, ...res }) }));
  });
})();
