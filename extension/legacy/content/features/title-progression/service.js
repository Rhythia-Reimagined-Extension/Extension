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
    scoreSets: null,
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

  function mount(cardElement, playerData, scoreSets) {
    if (!cardElement) return false;
    const showProgression = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showProgression') : true;
    const showHistory = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showHistory') : true;
    const isModuleOn = RhythiaX.isModuleEnabled ? RhythiaX.isModuleEnabled('titleProgression') : true;

    if (!isModuleOn || (!showProgression && !showHistory)) {
      unmount(cardElement);
      return false;
    }

    activeState.player = playerData || activeState.player;
    activeState.scoreSets = scoreSets || activeState.scoreSets || RhythiaX.profileHistoryContext?.scoreSets || null;
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

    // Render component markup inside host (both Map and History)
    host.innerHTML = View.buildTitleProgressionCard(activeState.player, activeState.view, activeState.scoreSets);

    // Sync visibility of views and hide native siblings
    updateViewVisibility(cardElement, activeState.view);

    // Attach tab and tooltip listeners
    setupTabListeners(host, cardElement);
    setupTooltipListeners(host);

    return true;
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

  function update(playerData, scoreSets) {
    if (!activeState.mountTarget) return;
    activeState.player = playerData || activeState.player;
    activeState.scoreSets = scoreSets || activeState.scoreSets;
    mount(activeState.mountTarget, activeState.player, activeState.scoreSets);
  }

  function unmount(cardElement = activeState.mountTarget) {
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
