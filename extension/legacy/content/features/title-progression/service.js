// =============================================
// Reimagined for Rhythia — Title Progression Service
// DOM mounting, native tab synchronization & lifecycle orchestration
// =============================================

var RhythiaX = RhythiaX || {};
RhythiaX.TitleProgression = RhythiaX.TitleProgression || {};

(function () {
  'use strict';

  const View = RhythiaX.TitleProgression.View;
  let activeState = {
    view: 'map', // 'map' or 'history'
    player: null,
    mountTarget: null
  };

  function findNativeTitleCard(root = document) {
    if (!root) return null;

    function resolveOuterCard(el) {
      if (!el) return null;
      let p = el.parentElement;
      while (p && p !== root && p !== document.body) {
        const cls = String(p.className || '');
        if (
          cls.includes('order-2') ||
          (cls.includes('overflow-hidden') && cls.includes('rounded-xl')) ||
          (cls.includes('rounded-xl') && cls.includes('border') && cls.includes('bg-surface'))
        ) {
          return p;
        }
        p = p.parentElement;
      }
      return null;
    }

    // 0. Since Rhythia's 2026-10 update the card starts folded behind "View progression" and fills its
    // content only once opened, so the toggle is all there is to find on a fresh page.
    const toggle = progressionToggle(root);
    if (toggle) {
      const outer = resolveOuterCard(toggle);
      if (outer) return outer;
    }

    // 1. Search for aria-label or role attribute
    const viewGroup = root.querySelector?.('[aria-label="Title progression view"], [aria-label*="Title progression" i]');
    if (viewGroup) {
      const outer = resolveOuterCard(viewGroup);
      if (outer) return outer;
    }

    // 2. Search leaf text nodes matching "Title progression"
    const candidates = Array.from(root.querySelectorAll?.('div, h2, h3, h4, span, p') || []);
    for (const el of candidates) {
      const text = (el.textContent || '').trim().toLowerCase();
      if (text === 'title progression') {
        const outer = resolveOuterCard(el);
        if (outer) return outer;
      }
    }

    return null;
  }

  // The "View progression" / "Hide progression" button of the folding card.
  function progressionToggle(root) {
    return Array.from(root?.querySelectorAll?.('button[aria-expanded]') || [])
      .find(b => /\bprogression\b/i.test(b.textContent || '')) || null;
  }

  // The folding part of the card: Rhythia hides it while folded and mounts its children when opened.
  // Our host goes inside it, so it folds with Rhythia's button and Rhythia's own content sits after it.
  function foldContent(cardElement) {
    const toggle = progressionToggle(cardElement);
    return toggle?.parentElement?.querySelector(':scope > div[data-state]') || null;
  }

  function getNativeElements(cardElement) {
    if (!cardElement) return { nativeHeader: null, nativeBody: null, progressBtn: null, historyBtn: null };

    const fold = foldContent(cardElement);
    if (fold) {
      const nativeBody = Array.from(fold.children).find(ch => !ch.classList.contains('rhythiax-title-progression-host')) || null;
      const group = nativeBody?.querySelector('[aria-label*="Title progression" i]');
      const nativeHeader = group?.closest('.justify-between') || null;
      nativeBody?.setAttribute('data-rhythiax-native-body', 'true');
      nativeHeader?.setAttribute('data-rhythiax-native-header', 'true');
      const buttons = Array.from(group?.querySelectorAll('button') || []);
      return {
        nativeHeader, nativeBody,
        progressBtn: buttons.find(b => (b.textContent || '').trim().toLowerCase() === 'progress') || null,
        historyBtn: buttons.find(b => (b.textContent || '').trim().toLowerCase() === 'history') || null,
      };
    }

    const host = cardElement.querySelector('.rhythiax-title-progression-host');
    let nativeHeader = cardElement.querySelector('[data-rhythiax-native-header="true"]');
    let nativeBody = cardElement.querySelector('[data-rhythiax-native-body="true"]');

    if (!nativeHeader || !nativeBody) {
      const directChildren = Array.from(cardElement.children).filter(ch => ch !== host);
      for (const ch of directChildren) {
        const text = (ch.textContent || '').toLowerCase();
        const hasButtons = ch.querySelector?.('button');
        if (!nativeHeader && (hasButtons || ch.className?.includes('justify-between') || (text.includes('progress') && text.includes('history')))) {
          nativeHeader = ch;
          nativeHeader.setAttribute('data-rhythiax-native-header', 'true');
        } else if (!nativeBody && ch !== nativeHeader) {
          nativeBody = ch;
          nativeBody.setAttribute('data-rhythiax-native-body', 'true');
        }
      }
    }

    const buttons = nativeHeader ? Array.from(nativeHeader.querySelectorAll('button')) : [];
    const progressBtn = buttons.find(b => (b.textContent || '').trim().toLowerCase() === 'progress') || null;
    const historyBtn = buttons.find(b => (b.textContent || '').trim().toLowerCase() === 'history') || null;

    return { nativeHeader, nativeBody, progressBtn, historyBtn };
  }

  // The card is drawn from the player alone (rp, globalRank, created_at); callers that still pass the
  // player's score sets as a third argument have it ignored.
  function mount(cardElement, playerData) {
    if (!cardElement) return false;
    const showProgression = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showProgression') : true;
    const showHistory = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showHistory') : true;
    const isModuleOn = RhythiaX.isModuleEnabled ? RhythiaX.isModuleEnabled('titleProgression') : true;

    if (!isModuleOn || (!showProgression && !showHistory)) {
      unmount(cardElement);
      return false;
    }

    activeState.player = playerData || activeState.player;
    activeState.mountTarget = cardElement;

    // Check if our host wrapper is already injected
    const fold = foldContent(cardElement);
    const box = fold || cardElement;
    let host = cardElement.querySelector('.rhythiax-title-progression-host');
    if (host && host.parentElement !== box) { host.remove(); host = null; }
    if (!host) {
      host = document.createElement('div');
      host.className = 'rhythiax-title-progression-host';
      box.insertBefore(host, box.firstChild);
    }
    watchFold(fold);

    // Render component markup inside host (both the bar and History); the same card is not drawn again. The
    // bar is drawn where it stood at the last visit in this browser and moves to now once it is seen (playBar).
    const id = currentId();
    const lastSeen = barMemory()[id] || null;
    const markup = View.buildTitleProgressionCard({ ...activeState.player, lastSeen }, activeState.view);
    const drawn = RhythiaX.setMarkup(host, markup);
    if (drawn) playBar(host, id);

    // Sync visibility of views and hide native siblings
    updateViewVisibility(cardElement, activeState.view);

    // Listeners belong to the drawn nodes, so only new nodes need them.
    if (drawn) {
      setupTabListeners(host, cardElement);
      setupTooltipListeners(host);
    }

    return true;
  }

  // ── The bar's movement ──
  // Where each player's bar stood when it last moved in this browser ({rp, rank, at}), for the 60 players seen last
  // (by at: player IDs are numeric keys, which JavaScript keeps in ascending order): the first look fills it from
  // nothing, a later one moves only by what changed (RP up or down, a title won or lost).
  const SEEN_KEY = 'rhythiax_classic_title_seen';
  function barMemory() {
    try { const all = JSON.parse(localStorage.getItem(SEEN_KEY) || '{}'); return all && typeof all === 'object' ? all : {}; } catch (_) { return {}; }
  }
  function rememberBar(id) {
    const p = activeState.player;
    if (!id || !p) return;
    try {
      const all = barMemory();
      all[id] = { rp: RhythiaX.TitleProgression.Domain.parseRp(p.rp), rank: RhythiaX.TitleProgression.Domain.parseRank(p.globalRank) || 0, at: Date.now() };
      const ids = Object.keys(all).sort((a, b) => (Number(all[a]?.at) || 0) - (Number(all[b]?.at) || 0));
      for (const old of ids.slice(0, Math.max(0, ids.length - 60))) delete all[old];
      localStorage.setItem(SEEN_KEY, JSON.stringify(all));
    } catch (_) {}
  }
  function currentId() {
    return String(RhythiaX.PageRouteContext?.playerId?.() || (typeof location === 'undefined' ? [] : location.pathname.match(/\/player\/(\d+)/) || [])[1] || '');
  }
  const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  // What #30 has, for players past 10,000 RP: one leaderboard page, which api.js keeps for ten minutes and shares
  // while it is on its way.
  function askP30(rp) {
    if (!(rp > 10000) || typeof RhythiaX.fetchLeaderboardPlaces !== 'function') return Promise.resolve(0);
    return RhythiaX.fetchLeaderboardPlaces([30]).then(rows => Number(rows?.[0]?.skill_points) || 0, () => 0);
  }
  const easeOut = u => 1 - Math.pow(1 - u, 4);
  const easeInOut = u => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2);
  let barObserver = null;
  // The track is drawn where the player stood at the last visit (from nothing on a first look) and, once it is
  // seen, moves to now: a first look fills it in a little over two seconds, a later one moves by the change and
  // shows the RP won or lost beside the RP for a few seconds. A title won by the rank alone (Grandmaster) comes at
  // the end of the move.
  function playBar(host, id) {
    barObserver?.disconnect(); barObserver = null;
    const el = host.querySelector?.('.rhythiax-track');
    if (!el) return;
    const T = View;
    const to = Number(el.dataset.rp) || 0, rank = Number(el.dataset.rank) || 0;
    const from = Number(el.dataset.fromRp) || 0, fromRank = Number(el.dataset.fromRank) || 0;
    const first = !(from > 0);
    T.paintTrack(el, from, fromRank);
    const p30 = askP30(to).then(v => {
      if (v > 10000 && el.isConnected && !el.dataset.p30) { el.dataset.p30 = String(v); T.words(el); }
      return v;
    });
    if (Math.abs(to - from) < 0.005 && fromRank === rank) {
      p30.then(() => { if (el.isConnected) T.paintTrack(el, to, rank); });
      rememberBar(id);
      return;
    }
    const go = () => {
      rememberBar(id);
      if (reducedMotion()) { p30.then(() => T.paintTrack(el, to, rank)); T.paintTrack(el, to, rank); return; }
      // Past 10,000 RP the way to the top 30 is measured by what #30 has: the move waits a moment for it.
      Promise.race([p30, new Promise(r => setTimeout(r, 1500))]).then(() => {
        if (!el.isConnected) return;
        if (!first) showGain(el, to - from);
        const span = Math.abs(to - from), ms = first ? 2200 : Math.round(900 + Math.min(1500, span * 6));
        const ease = first ? easeOut : easeInOut, t0 = performance.now();
        const step = now => {
          if (!el.isConnected) return;
          const u = Math.min(1, (now - t0) / ms);
          T.paintTrack(el, from + (to - from) * ease(u), u < 1 ? fromRank : rank);
          if (u < 1) requestAnimationFrame(step);
          else el.querySelector('.rhythiax-track-t30')?.classList.add('is-lit');
        };
        requestAnimationFrame(step);
      });
    };
    if (typeof IntersectionObserver !== 'function') { go(); return; }
    barObserver = new IntersectionObserver(entries => {
      if (!entries.some(e => e.isIntersecting)) return;
      barObserver.disconnect(); barObserver = null;
      if (el.isConnected) go();
    }, { threshold: 0.4 });
    barObserver.observe(el);
  }
  // The RP won or lost since the last visit, beside the RP: it slides in and folds away later.
  function showGain(el, n) {
    const g = el.querySelector('.rhythiax-track-gain'), a = Math.abs(n);
    if (!g || a < 0.005) return;
    g.textContent = `${n < 0 ? '−' : '+'}${a.toLocaleString('en-US', { maximumFractionDigits: a < 10 ? 2 : 0 })}`;
    g.classList.toggle('is-down', n < 0);
    g.classList.add('is-on');
    setTimeout(() => g.classList.remove('is-on'), 4200);
  }

  // Rhythia mounts its own content again each time the card is opened; when the player chose Rhythia's
  // view (our map or history switched off), it has to be shown and switched again.
  let foldObserver = null;
  function watchFold(fold) {
    if (foldObserver?.target === fold) return;
    foldObserver?.observer.disconnect();
    foldObserver = null;
    if (!fold || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(() => {
      const card = activeState.mountTarget;
      if (!card || !card.contains(fold)) return;
      const host = fold.querySelector(':scope > .rhythiax-title-progression-host');
      if (host?.classList.contains('rhythiax-show-native-body')) updateViewVisibility(card, activeState.view);
    });
    observer.observe(fold, { childList: true });
    foldObserver = { target: fold, observer };
  }

  function updateViewVisibility(cardElement, view) {
    if (!cardElement) return;
    const mapContainer = cardElement.querySelector('.rhythiax-title-map-container');
    const historyContainer = cardElement.querySelector('.rhythiax-title-history-container');
    const host = cardElement.querySelector('.rhythiax-title-progression-host');

    const showProgression = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showProgression') : true;
    const showHistory = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showHistory') : true;

    const { nativeHeader, nativeBody, progressBtn, historyBtn } = getNativeElements(cardElement);

    // Hide native header while our host is mounted
    if (nativeHeader) {
      nativeHeader.setAttribute('data-rhythiax-native-header', 'true');
      nativeHeader.setAttribute('data-rhythiax-native-hidden', 'true');
      nativeHeader.style.display = 'none';
    }

    if (view === 'map') {
      if (showProgression) {
        // Show Reimagined Adventure Map
        if (mapContainer) {
          mapContainer.style.display = 'block';
          mapContainer.classList?.remove?.('rhythiax-view-fade-in');
          if (typeof mapContainer.offsetWidth !== 'undefined') void mapContainer.offsetWidth;
          mapContainer.classList?.add?.('rhythiax-view-fade-in');
        }

        if (historyContainer) historyContainer.style.display = 'none';
        host?.classList?.remove?.('rhythiax-show-native-body');

        // Hide native siblings
        Array.from((host?.parentElement || cardElement).children).forEach(ch => {
          if (ch === host) return;
          ch.setAttribute('data-rhythiax-native-hidden', 'true');
          ch.style.display = 'none';
        });
      } else {
        // Fallback: Display native Rhythia progress bars
        if (mapContainer) mapContainer.style.display = 'none';
        if (historyContainer) historyContainer.style.display = 'none';
        host?.classList?.add?.('rhythiax-show-native-body');

        if (progressBtn) {
          try { progressBtn.click(); } catch (_) {}
        }
        if (nativeBody) {
          nativeBody.removeAttribute('data-rhythiax-native-hidden');
          nativeBody.style.display = '';
          nativeBody.classList?.remove?.('rhythiax-view-fade-in');
          if (typeof nativeBody.offsetWidth !== 'undefined') void nativeBody.offsetWidth;
          nativeBody.classList?.add?.('rhythiax-view-fade-in');
        }
      }
    } else if (view === 'history') {
      if (showHistory) {
        // Show Reimagined History Chart
        if (historyContainer) {
          historyContainer.style.display = 'block';
          historyContainer.classList?.remove?.('rhythiax-view-fade-in');
          if (typeof historyContainer.offsetWidth !== 'undefined') void historyContainer.offsetWidth;
          historyContainer.classList?.add?.('rhythiax-view-fade-in');
        }

        if (mapContainer) mapContainer.style.display = 'none';
        host?.classList?.remove?.('rhythiax-show-native-body');

        // Hide native siblings
        Array.from((host?.parentElement || cardElement).children).forEach(ch => {
          if (ch === host) return;
          ch.setAttribute('data-rhythiax-native-hidden', 'true');
          ch.style.display = 'none';
        });
      } else {
        // Fallback: Display native Rhythia history chart
        if (mapContainer) mapContainer.style.display = 'none';
        if (historyContainer) historyContainer.style.display = 'none';
        host?.classList?.add?.('rhythiax-show-native-body');

        if (historyBtn) {
          try { historyBtn.click(); } catch (_) {}
        }
        if (nativeBody) {
          nativeBody.removeAttribute('data-rhythiax-native-hidden');
          nativeBody.style.display = '';
          nativeBody.classList?.remove?.('rhythiax-view-fade-in');
          if (typeof nativeBody.offsetWidth !== 'undefined') void nativeBody.offsetWidth;
          nativeBody.classList?.add?.('rhythiax-view-fade-in');
        }
      }
    }
  }

  function setupTabListeners(component, cardElement) {
    const buttons = component.querySelectorAll('.rhythiax-pill-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const tab = btn.getAttribute('data-tab');
        if (tab === activeState.view) return;

        activeState.view = tab;

        // Update active class on buttons
        buttons.forEach(b => {
          const isActive = b.getAttribute('data-tab') === tab;
          b.classList.toggle('active', isActive);
          b.setAttribute('aria-pressed', String(isActive));
        });

        // Toggle visibility between Map and History
        updateViewVisibility(cardElement, tab);
      });
    });
  }

  function setupTooltipListeners(component) {
    const dots = component.querySelectorAll('.rhythiax-history-interactive-dot');
    dots.forEach(dot => {
      const tipId = dot.getAttribute('data-tip-id');
      if (!tipId) return;
      const tipEl = component.querySelector(`#${tipId}`);
      if (!tipEl) return;

      const positionTooltip = () => {
        const chart = dot.closest('.rhythiax-history-chart-area');
        if (!chart) return;
        const bounds = chart.getBoundingClientRect();
        const point = dot.getBoundingClientRect();
        const width = tipEl.offsetWidth;
        const height = tipEl.offsetHeight;
        const x = point.left + point.width / 2 - bounds.left;
        const y = point.top + point.height / 2 - bounds.top;
        tipEl.style.right = 'auto';
        tipEl.style.left = `${Math.max(8, Math.min(x - width / 2, bounds.width - width - 8))}px`;
        tipEl.style.top = `${Math.max(8, Math.min(y - height - 12 >= 8 ? y - height - 12 : y + 12, bounds.height - height - 8))}px`;
        tipEl.style.transform = 'none';
      };
      dot.addEventListener('focus', () => {
        positionTooltip();
        tipEl.classList.add('show');
      });
      dot.addEventListener('blur', () => tipEl.classList.remove('show'));

      dot.addEventListener('mouseenter', () => {
        dots.forEach(d => d.classList.remove('active'));
        component.querySelectorAll('.rhythiax-hist-tooltip-badge').forEach(b => b.classList.remove('show'));
        positionTooltip();
        dot.classList.add('active');
        tipEl.classList.add('show');
      });

      dot.addEventListener('mouseleave', () => {
        dot.classList.remove('active');
        tipEl.classList.remove('show');
      });

      dot.addEventListener('click', (e) => {
        e.stopPropagation();
        const isShown = tipEl.classList.contains('show');
        component.querySelectorAll('.rhythiax-hist-tooltip-badge').forEach(b => b.classList.remove('show'));
        dots.forEach(d => d.classList.remove('active'));
        if (!isShown) {
          positionTooltip();
          dot.classList.add('active');
          tipEl.classList.add('show');
        }
      });
    });
  }

  function update(playerData) {
    if (!activeState.mountTarget) return;
    activeState.player = playerData || activeState.player;
    mount(activeState.mountTarget, activeState.player);
  }

  function unmount(cardElement = activeState.mountTarget) {
    barObserver?.disconnect(); barObserver = null;
    if (!cardElement) return;

    // 1. Remove our host wrapper
    const host = cardElement.querySelector('.rhythiax-title-progression-host');
    if (host) host.remove();
    cardElement.querySelectorAll('[data-rhythiax-native-header], [data-rhythiax-native-body], [data-rhythiax-native-hidden]').forEach(el => {
      el.removeAttribute('data-rhythiax-native-header');
      el.removeAttribute('data-rhythiax-native-body');
      el.removeAttribute('data-rhythiax-native-hidden');
      el.style.removeProperty('display');
    });

    foldObserver?.observer.disconnect();
    foldObserver = null;

    // 2. Restore all direct children (and those of the folding part)
    const fold = foldContent(cardElement);
    [...cardElement.children, ...(fold ? fold.children : [])].forEach(ch => {
      ch.removeAttribute?.('data-rhythiax-native-header');
      ch.removeAttribute?.('data-rhythiax-native-body');
      ch.removeAttribute?.('data-rhythiax-native-hidden');
      ch.style.display = '';
      ch.style.removeProperty?.('display');
    });

    activeState.mountTarget = null;
    activeState.player = null;
    activeState.view = 'map';
  }

  function cleanup() {
    foldObserver?.observer.disconnect();
    foldObserver = null;
    if (activeState.mountTarget) {
      unmount(activeState.mountTarget);
    }
    // Also clear any detached or dangling hosts and unhide native siblings
    if (typeof document !== 'undefined') {
      document.querySelectorAll?.('.rhythiax-title-progression-host').forEach(h => {
        const parent = h.parentElement;
        h.remove();
        if (parent) {
          Array.from(parent.children).forEach(ch => {
            ch.removeAttribute?.('data-rhythiax-native-header');
            ch.removeAttribute?.('data-rhythiax-native-body');
            ch.removeAttribute?.('data-rhythiax-native-hidden');
            ch.style.display = '';
            ch.style.removeProperty?.('display');
          });
        }
      });
      document.querySelectorAll?.('[data-rhythiax-native-hidden="true"]').forEach(el => {
        el.removeAttribute('data-rhythiax-native-hidden');
        el.style.display = '';
        el.style.removeProperty?.('display');
      });
      document.querySelectorAll?.('[data-rhythiax-native-header="true"]').forEach(el => {
        el.removeAttribute('data-rhythiax-native-header');
        el.style.display = '';
        el.style.removeProperty?.('display');
      });
      document.querySelectorAll?.('[data-rhythiax-native-body="true"]').forEach(el => {
        el.removeAttribute('data-rhythiax-native-body');
        el.style.display = '';
        el.style.removeProperty?.('display');
      });
    }
    activeState.player = null;
    activeState.mountTarget = null;
    activeState.view = 'map';
  }

  // Export Service
  RhythiaX.TitleProgression.Service = {
    findNativeTitleCard,
    mount,
    unmount,
    update,
    cleanup
  };

})();
