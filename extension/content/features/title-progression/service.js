// =============================================
// Rhythia Reimagined — Title Progression Service
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

  function getNativeElements(cardElement) {
    if (!cardElement) return { nativeHeader: null, nativeBody: null, progressBtn: null, historyBtn: null };

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
    let host = cardElement.querySelector('.rhythiax-title-progression-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'rhythiax-title-progression-host';
      cardElement.insertBefore(host, cardElement.firstChild);
    }

    // Render component markup inside host (both Map and History)
    host.innerHTML = View.buildTitleProgressionCard(activeState.player, activeState.view, activeState.scoreSets);

    // Sync visibility of views and hide native siblings
    updateViewVisibility(cardElement, activeState.view);

    // Attach tab and tooltip listeners
    setupTabListeners(host, cardElement);
    setupTooltipListeners(host);

    return true;
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
        Array.from(cardElement.children).forEach(ch => {
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
        Array.from(cardElement.children).forEach(ch => {
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

    // 2. Restore all direct children
    Array.from(cardElement.children).forEach(ch => {
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
