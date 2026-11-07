// ============================================================================
// Reimagined for Rhythia — Score Card View (Modular Card Renderer & DOM Enhancer)
// ============================================================================

var RhythiaX = RhythiaX || {};

(function () {
  'use strict';

  /**
   * Creates a fully styled, interactive Score Card element from a score data object.
   * Uses the currently active layout variant (A to F).
   */
  function createCardFromScore(scoreData, rankIndex = null, tabType = '') {
    if (!scoreData) return null;

    const store = RhythiaX.ScoreCardStore;
    const variant = store?.getVariant?.() || 'variant_e';
    const templates = RhythiaX.ScoreCardTemplates || {};
    const renderer = (templates[variant] && templates[variant].render) ||
                     (templates.variant_e && templates.variant_e.render);

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
   * Puts the Scores hub on a player's scores page.
   */
  function enhance() {
    if (!RhythiaX.isModuleEnabled) return false;
    // Only a player's scores page gets Classic's cards: the Scores hub in place of Rhythia's list
    // (pages/scores/composition.js). On a profile the hub manages its cards itself; other pages, and pages Exodus
    // shows, keep Rhythia's rows.
    if (RhythiaX.PageRouteContext?.type?.() !== 'scores' || RhythiaX.ClassicIdle?.isSuspended?.()) return false;
    return RhythiaX.ScoresPage?.inject?.() === true;
  }

  /**
   * Score cards off: their open menus and toasts go.
   */
  function unenhance() {
    if (typeof document !== 'undefined') {
      document.querySelectorAll('.rhythiax-score-actions-menu, .rhythiax-sc-menu-popover').forEach(el => el.remove());
      document.querySelectorAll('.rhythiax-toast-container').forEach(el => el.remove());
    }
  }

  /**
   * Re-renders all enhanced cards when user switches variant in the popup.
   */
  function reRenderAllCards() {
    // While Exodus shows the page the cards wait; the page is built again when it is handed back.
    if (RhythiaX.ClassicIdle?.isSuspended?.()) return;
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
    enhance,
    unenhance,
    reRenderAllCards,
  };

  // enhanceScoreCards is what a live settings change calls (core/modules.js, applyLiveUpdates).
  RhythiaX.enhanceScoreCards = enhance;
})();
