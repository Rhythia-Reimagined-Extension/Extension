// ============================================================================
// Rhythia Reimagined — Score Card Actions (Menu Popover & Score Actions)
// ============================================================================

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  let activeMenuEl = null;

  function closeActiveMenu() {
    if (activeMenuEl) {
      activeMenuEl.remove();
      activeMenuEl = null;
    }
  }

  // Close menu when clicking outside or pressing Escape
  if (typeof document !== 'undefined') {
    document.addEventListener('click', (e) => {
      if (activeMenuEl && !activeMenuEl.contains(e.target) && !e.target.closest('.rhythiax-sc-action-btn, .rhythiax-card-btn-native-actions')) {
        closeActiveMenu();
      }
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeActiveMenu();
    });
  }

  function findNativeActionsButton(card, scoreData) {
    if (card) {
      const direct = card.querySelector('button[aria-label="Score actions"], button[aria-haspopup="menu"]');
      if (direct && !direct.closest('.rhythiax-sc-top-controls, .rhythiax-sc-eclipse-right, .rhythiax-sc-ribbon-stats')) {
        return direct;
      }
    }
    const scoreId = String(scoreData?.scoreId || scoreData?.id || '');
    const replayUrl = String(scoreData?.replayUrl || '');

    // 1. Search by exact replayUrl
    if (replayUrl && typeof document !== 'undefined') {
      const replayLink = document.querySelector(`a[href="${replayUrl}"]`);
      if (replayLink) {
        const parentCard = replayLink.closest('.score-card, div.relative.overflow-hidden.rounded-lg.border, div.relative.py-2, .border-line, div');
        const btn = parentCard?.querySelector('button[aria-label="Score actions"], button[aria-haspopup="menu"]') || parentCard?.querySelector('button');
        if (btn) return btn;
      }
    }

    // 2. Search by scoreId in links
    if (scoreId && typeof document !== 'undefined') {
      const links = Array.from(document.querySelectorAll(`a[href*="${scoreId}"]`)).filter(a => !a.closest('.rhythiax-scores-hub'));
      for (const a of links) {
        const parentCard = a.closest('.score-card, div.relative.overflow-hidden.rounded-lg.border, div.relative.py-2, .border-line, div');
        const btn = parentCard?.querySelector('button[aria-label="Score actions"], button[aria-haspopup="menu"]') || parentCard?.querySelector('button');
        if (btn) return btn;
      }
    }

    return null;
  }

  function attachNativeActionsButton(cardEl, scoreData) {
    if (!cardEl) return null;
    const controls = cardEl.querySelector('.rhythiax-sc-top-controls, .rhythiax-sc-eclipse-right, .rhythiax-sc-ribbon-stats');
    if (!controls) return null;

    const nativeBtn = findNativeActionsButton(cardEl, scoreData);
    if (!nativeBtn) return null;
    if (nativeBtn.parentNode === controls) return nativeBtn;

    // Placeholder in native card so cleanup can restore it
    if (!nativeBtn._rhythiaxPlaceholder && nativeBtn.parentNode) {
      const placeholder = document.createComment
        ? document.createComment('rhythiax-native-actions-placeholder')
        : document.createTextNode('');
      nativeBtn.parentNode.insertBefore(placeholder, nativeBtn);
      nativeBtn._rhythiaxPlaceholder = placeholder;
    }

    nativeBtn.classList.add('rhythiax-sc-action-btn', 'rhythiax-card-btn', 'rhythiax-card-btn-native-actions');
    if (!nativeBtn.getAttribute('title')) {
      nativeBtn.setAttribute('title', 'Score actions');
    }

    // Remove synthetic fallback button if present
    const existing = controls.querySelectorAll('.rhythiax-card-btn-actions, .rhythiax-sc-action-btn:not(.rhythiax-card-btn-native-actions)');
    existing.forEach(b => {
      if (b !== nativeBtn) b.remove();
    });

    controls.appendChild(nativeBtn);
    attachActionHandlers(cardEl, scoreData, nativeBtn);
    return nativeBtn;
  }

  function syncNativeScoreActions(hub) {
    const container = hub || (typeof document !== 'undefined' ? document.querySelector('.rhythiax-scores-hub') : null);
    if (!container) return;
    const cards = container.querySelectorAll('.rhythiax-sc-card');
    cards.forEach(card => {
      const data = card._rhythiaxScoreData;
      if (data && !card.querySelector('.rhythiax-card-btn-native-actions[data-native-transferred="true"]')) {
        const attached = attachNativeActionsButton(card, data);
        if (attached) {
          attached.setAttribute('data-native-transferred', 'true');
        }
      }
    });
  }

  function attachActionHandlers(cardEl, scoreData, specificBtn = null) {
    if (!cardEl) return;
    const btn = specificBtn || cardEl.querySelector('.rhythiax-sc-action-btn, .rhythiax-card-btn-native-actions');
    if (!btn || btn._actionsAttached) return;
    btn._actionsAttached = true;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();

      if (activeMenuEl && activeMenuEl._anchorBtn === btn) {
        closeActiveMenu();
        return;
      }
      closeActiveMenu();
      openActionMenu(btn, cardEl, scoreData);
    });
  }

  function openActionMenu(anchorBtn, cardEl, scoreData) {
    const rawScore = scoreData?.score || scoreData || {};
    const scoreId = String(rawScore.scoreId || rawScore.id || scoreData?.scoreId || '');
    const scoreHref = scoreData?.scoreHref || rawScore.scoreHref || (scoreId ? `/score/${scoreId}` : '');
    const replayUrl = scoreData?.replayUrl || rawScore.replayUrl || '';
    const beatmapId = scoreData?.beatmapId || rawScore.beatmapId || null;
    const mapHref = scoreData?.mapHref || rawScore.mapHref || (beatmapId ? `/maps/${beatmapId}` : '');

    const isPinned = isScorePinned(scoreId, cardEl);

    const menu = document.createElement('div');
    menu.className = 'rhythiax-sc-menu-popover rhythiax-score-actions-menu';
    menu._anchorBtn = anchorBtn;

    const items = [];

    // 1. Pin / Unpin (Only on player's own profile)
    const isOwn = typeof RhythiaX.isOwnProfile === 'function' ? RhythiaX.isOwnProfile() : false;
    if (isOwn) {
      items.push({
        id: 'pin',
        className: 'rhythiax-score-menu-item-pin',
        label: isPinned ? 'Unpin Score' : 'Pin to Profile',
        icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v8M8 6h8M5 14h14M12 14v8"/></svg>`,
        action: async () => {
          if (RhythiaX.ScoreCardStore?.togglePin) {
            await RhythiaX.ScoreCardStore.togglePin(scoreData, !isScorePinned(scoreId, cardEl));
          }
        }
      });
    }

    // 2. View on Rhythia
    if (scoreId || scoreHref) {
      items.push({
        id: 'view',
        className: 'rhythiax-score-menu-item-view',
        href: scoreHref,
        label: 'View Score Details',
        icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></svg>`,
        action: () => {
          if (scoreHref) window.location.href = scoreHref;
        }
      });
    }

    // 3. View Map
    if (beatmapId || mapHref) {
      items.push({
        id: 'map',
        className: 'rhythiax-score-menu-item-map',
        href: mapHref,
        label: 'Open Beatmap Page',
        icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        action: () => {
          if (mapHref) window.location.href = mapHref;
        }
      });
    }

    // 4. Download Replay
    if (replayUrl) {
      items.push({
        id: 'replay',
        className: 'rhythiax-score-menu-item-download',
        href: replayUrl,
        label: 'Download Replay (.rhr)',
        icon: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>`,
        action: () => {
          window.open(replayUrl, '_blank');
        }
      });
    }

    items.forEach(item => {
      let row;
      if (item.href) {
        row = document.createElement('a');
        row.href = item.href;
        if (item.id === 'replay') {
          row.download = `score-replay-${scoreId || 'download'}.rhr`;
          row.target = '_blank';
          row.rel = 'noopener noreferrer';
        }
      } else {
        row = document.createElement('button');
        row.type = 'button';
      }
      row.className = `rhythiax-sc-menu-item rhythiax-score-menu-item ${item.className || ''}`;
      row.innerHTML = `<span class="rhythiax-sc-menu-icon">${item.icon}</span><span>${item.label}</span>`;
      row.addEventListener('click', (e) => {
        if (!item.href) {
          e.stopPropagation();
          e.preventDefault();
        }
        closeActiveMenu();
        if (item.action) item.action();
      });
      menu.appendChild(row);
    });

    document.body.appendChild(menu);
    activeMenuEl = menu;

    // Position popover relative to button
    if (anchorBtn.getBoundingClientRect) {
      const rect = anchorBtn.getBoundingClientRect();
      const menuWidth = 190;
      let top = rect.bottom + (window.scrollY || 0) + 6;
      let left = rect.right + (window.scrollX || 0) - menuWidth;

      if (left < 10) left = 10;
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
    }
  }

  function isScorePinned(scoreId, card) {
    if (card?.dataset?.rhythiaxIsPinned === 'true') return true;
    if (card?.dataset?.rhythiaxIsPinned === 'false') return false;
    if (card?.closest?.('.rhythiax-pinned-scores-section')) return true;
    return Boolean(RhythiaX.ScoreCardStore?.isPinned?.(scoreId));
  }

  async function toggleScorePin(scoreId, card) {
    const isP = isScorePinned(scoreId, card);
    if (RhythiaX.ScoreCardStore?.togglePin) {
      return await RhythiaX.ScoreCardStore.togglePin({ scoreId, id: scoreId }, !isP);
    }
    return !isP;
  }

  RhythiaX.ScoreCardActions = {
    attachActionHandlers,
    attachNativeActionsButton,
    findNativeActionsButton,
    syncNativeScoreActions,
    closeActiveMenu,
    closeScoreActionsMenu: closeActiveMenu,
    openActionMenu,
    openScoreActionsMenu: openActionMenu,
    isScorePinned,
    toggleScorePin,
  };

  RhythiaX.syncNativeScoreActions = syncNativeScoreActions;
  RhythiaX.openScoreActionsMenu = openActionMenu;
  RhythiaX.closeScoreActionsMenu = closeActiveMenu;
  RhythiaX.isScorePinned = isScorePinned;
  RhythiaX.toggleScorePin = toggleScorePin;
})();
