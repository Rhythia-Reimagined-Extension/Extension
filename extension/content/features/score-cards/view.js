// ============================================================================
// Rhythia Reimagined — Score Card View (Modular Card Renderer & DOM Enhancer)
// ============================================================================

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  /**
   * Creates a fully styled, interactive Score Card element from a score data object.
   * Uses the currently active layout variant (Variant A, B, or C).
   */
  function createCardFromScore(scoreData, rankIndex = null, tabType = '') {
    if (!scoreData) return null;

    const store = RhythiaX.ScoreCardStore;
    const variant = store?.getVariant?.() || 'variant_a';
    const templates = RhythiaX.ScoreCardTemplates || {};
    const renderer = (templates[variant] && templates[variant].render) ||
                     (templates.variant_a && templates.variant_a.render);

    if (!renderer) {
      console.error('[RhythiaX] No score card template renderer found for variant:', variant);
      return null;
    }

    const data = { ...scoreData };
    if (rankIndex != null && rankIndex >= 0) {
      data.rankIndex = rankIndex;
    }
    if (tabType === 'reign' || data.isReign) {
      data.isReign = true;
    }

    // Render modern card
    const cardEl = renderer(data, { rankIndex, tabType });
    if (!cardEl) return null;

    cardEl._rhythiaxScoreData = data;
    cardEl.setAttribute('data-rhythiax-enhanced', 'true');
    cardEl.setAttribute('data-rhythiax-variant', variant);
    if (tabType) cardEl.setAttribute('data-rhythiax-score-type', tabType);

    // Try transferring existing native actions button (e.g. from hidden native sections)
    if (RhythiaX.ScoreCardActions?.attachNativeActionsButton) {
      RhythiaX.ScoreCardActions.attachNativeActionsButton(cardEl, data);
    }

    // Attach actions menu popover handlers
    if (RhythiaX.ScoreCardActions?.attachActionHandlers) {
      RhythiaX.ScoreCardActions.attachActionHandlers(cardEl, data);
    }

    // Non-blocking async artwork & metadata resolution
    const mapHashOrId = data.beatmapHash || data.beatmapId || data.songId || data.hash;
    if (mapHashOrId && RhythiaX.ScoreCardPreviews?.resolveCardPreview) {
      RhythiaX.ScoreCardPreviews.resolveCardPreview(cardEl, mapHashOrId, data.speed || 1);
    }

    return cardEl;
  }

  /**
   * Redesigns a native score card found in the DOM.
   */
  function redesign(card, rankIndex = null, tabType = '') {
    if (!card || card.dataset?.rhythiaxEnhanced === 'true') return card;

    const parsed = RhythiaX.ScoreCardDomain?.parse?.(card);
    const scoreObj = parsed?.score || (RhythiaX.parseScoreCard ? RhythiaX.parseScoreCard(card) : {});
    if (RhythiaX.isScoreHydrated && !RhythiaX.isScoreHydrated(scoreObj)) {
      return card;
    }

    const mergedData = {
      ...scoreObj,
      songTitle: parsed?.songTitle || scoreObj.songTitle || '',
      songArtist: parsed?.songArtist || scoreObj.artist || '',
      mapper: parsed?.mapper || scoreObj.mapper || '',
      date: parsed?.date || scoreObj.absoluteDate || scoreObj.timeAgo || '',
      scoreHref: parsed?.scoreHref || '',
      mapHref: parsed?.mapHref || '',
      replayUrl: parsed?.replayUrl || '',
    };

    const newCard = createCardFromScore(mergedData, rankIndex, tabType);
    if (!newCard) return card;

    // Wrap / Replace native card contents while preserving original element
    card.dataset.rhythiaxEnhanced = 'true';
    card.classList.add('rhythiax-score-card', 'rhythiax-redesigned', 'rhythiax-card-enhanced-host');
    card.innerHTML = '';
    card.appendChild(newCard);
    card._rhythiaxEnhancedCard = newCard;

    return newCard;
  }

  /**
   * Enhances all native score cards currently on the page.
   */
  function enhance() {
    if (!RhythiaX.isModuleEnabled) return false;
    if (!RhythiaX.isModuleEnabled('scoreCards')) return true;
    if (RhythiaX.isModuleOptionEnabled?.('scoreCards', 'customCards') === false) return true;
    // On profile pages, ScoresHub manages all score cards cleanly in its own container.
    // In-place native redesign is ONLY for the global /scores leaderboard page.
    if (RhythiaX.PageRouteContext?.type?.() === 'profile') return;

    const cards = RhythiaX.findScoreCards ? RhythiaX.findScoreCards() : [];
    cards.forEach((card, idx) => {
      if (!card.dataset?.rhythiaxEnhanced) {
        redesign(card, idx + 1);
      }
    });
    // Skeletons can appear before their score data. Keep readiness retries until
    // every current card was rendered successfully; later cards use the observer.
    return cards.length > 0 && cards.every(card => card.dataset?.rhythiaxEnhanced === 'true');
  }

  /**
   * Restores native appearance if module is disabled.
   */
  function unenhance() {
    const hosts = document.querySelectorAll('.rhythiax-card-enhanced-host');
    hosts.forEach(host => {
      host.classList.remove('rhythiax-card-enhanced-host', 'rhythiax-score-card', 'rhythiax-redesigned');
      delete host.dataset.rhythiaxEnhanced;
      const inner = host.querySelector('.rhythiax-sc-card');
      if (inner) inner.remove();
    });
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.rhythiax-score-actions-menu, .rhythiax-sc-menu-popover').forEach(el => el.remove());
      document.querySelectorAll('.rhythiax-toast-container').forEach(el => el.remove());
    }
  }

  /**
   * Re-renders all enhanced cards when user switches variant in the popup.
   */
  function reRenderAllCards() {
    const cards = document.querySelectorAll('.rhythiax-sc-card');
    cards.forEach(card => {
      const data = card._rhythiaxScoreData;
      if (!data) return;

      const parent = card.parentElement;
      if (!parent) return;

      const rankIndex = data.rankIndex;
      const tabType = card.getAttribute('data-rhythiax-score-type') || '';
      const refreshed = createCardFromScore(data, rankIndex, tabType);
      if (refreshed) {
        parent.replaceChild(refreshed, card);
      }
    });
  }

  // Listen for variant change events
  if (typeof window !== 'undefined') {
    window.addEventListener('rhythiax:scorecard-variant-changed', () => {
      reRenderAllCards();
    });
  }

  RhythiaX.ScoreCardView = {
    createCardFromScore,
    redesign,
    enhance,
    unenhance,
    reRenderAllCards,
    findNativeActionsButton: (card, data) => RhythiaX.ScoreCardActions?.findNativeActionsButton?.(card, data),
    attachNativeActionsButton: (card, data) => RhythiaX.ScoreCardActions?.attachNativeActionsButton?.(card, data),
    syncNativeScoreActions: (hub) => RhythiaX.ScoreCardActions?.syncNativeScoreActions?.(hub),
    openScoreActionsMenu: (btn, card, data) => RhythiaX.ScoreCardActions?.openActionMenu?.(btn, card, data),
    closeScoreActionsMenu: () => RhythiaX.ScoreCardActions?.closeActiveMenu?.(),
    isScorePinned: (scoreId, card) => RhythiaX.ScoreCardActions?.isScorePinned?.(scoreId, card),
    toggleScorePin: (scoreId, card) => RhythiaX.ScoreCardActions?.toggleScorePin?.(scoreId, card),
    showScoreToast: (msg, type) => RhythiaX.ScoreCardStore?.showToast?.(msg, type),
  };

  // Backwards compatibility mappings for composition.js and route-observer.js
  RhythiaX.enhanceScoreCards = enhance;
  RhythiaX.unenhanceScoreCards = unenhance;
  RhythiaX.syncNativeScoreActions = (hub) => RhythiaX.ScoreCardActions?.syncNativeScoreActions?.(hub);
  RhythiaX.openScoreActionsMenu = (btn, card, data) => RhythiaX.ScoreCardActions?.openActionMenu?.(btn, card, data);
  RhythiaX.closeScoreActionsMenu = () => RhythiaX.ScoreCardActions?.closeActiveMenu?.();
  RhythiaX.isScorePinned = (scoreId, card) => RhythiaX.ScoreCardActions?.isScorePinned?.(scoreId, card);
  RhythiaX.toggleScorePin = (scoreId, card) => RhythiaX.ScoreCardActions?.toggleScorePin?.(scoreId, card);
})();
