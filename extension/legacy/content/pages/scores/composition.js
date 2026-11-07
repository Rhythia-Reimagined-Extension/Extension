// =============================================
// Reimagined for Rhythia — A player's scores page
// =============================================
// Rhythia's page of a player's scores (/player/:id/scores) gets Classic's Scores hub (features/score-cards/
// service.js) in place of Rhythia's Top Scores list, drawn from the API's answer like the profile's: real
// weighted RP, dates, art, map types, Nearby, order and filters. Rhythia's Back button, its Lock/Spin/VR switch
// and its Weighted vs Awarded RP chart stay as they are; the switch picks the hub's mode.

var RhythiaX = RhythiaX || {};

RhythiaX.ScoresPage = (function () {
  'use strict';

  // The mode Rhythia's switch on this page shows (Lock is 'normal'), or null when the switch is not drawn yet.
  function pageMode() {
    const group = document.querySelector('[role="group"][aria-label="Score mode"]');
    const on = group?.querySelector('button[aria-pressed="true"]');
    if (!on) return null;
    const label = String(on.getAttribute('aria-label') || on.textContent || '').toLowerCase();
    return label.includes('spin') ? 'spin' : label.includes('vr') ? 'vr' : 'normal';
  }

  let asked = null;
  const enabled = () => RhythiaX.isModuleEnabled?.('scoreCards') !== false;

  // Rhythia's own Top Scores list on this page.
  function nativeList() {
    return [...document.querySelectorAll('h1, h2, h3, h4')].find(h => !h.closest('.rhythiax-scores-hub')
      && /^top scores$/i.test(h.textContent.trim())) || null;
  }

  // Scores off: the hub goes and Rhythia's own list shows again.
  function giveBack() {
    document.querySelector('.rhythiax-scores-hub')?.remove();
    document.querySelectorAll('.rhythiax-native-score-section-hidden').forEach(section => {
      section.classList.remove('rhythiax-native-score-section-hidden');
      section.style.removeProperty('display');
    });
  }

  // true once the hub is on the page; false to be tried again (the answer or Rhythia's list not there yet).
  function inject() {
    if (RhythiaX.PageRouteContext?.type?.() !== 'scores' || RhythiaX.ClassicIdle?.isSuspended?.()) return false;
    if (!enabled()) { giveBack(); return true; }
    const id = RhythiaX.PageRouteContext.playerId();
    if (!/^\d+$/.test(id)) return true;
    const sets = RhythiaX.getCachedPlayerScoreSets?.(id);
    if (!sets) {
      if (asked !== id) {
        asked = id;
        Promise.resolve(RhythiaX.fetchPlayerScoreSets?.(id)).then(answer => {
          if (asked === id) asked = null;
          if (answer && RhythiaX.PageRouteContext.playerId() === id) RhythiaX.ContentLifecycle?.queueInject?.(0);
        }, () => { if (asked === id) asked = null; });
      }
      return false;
    }
    if (!nativeList() && !document.querySelector('.rhythiax-scores-hub')) return false;
    return Boolean(RhythiaX.mountScoresHub?.(sets, { page: 'scores' }));
  }

  // After Rhythia redraws its page (a mode picked, its list loaded again): its list stays hidden, the hub stays.
  function refresh() {
    if (RhythiaX.PageRouteContext?.type?.() !== 'scores') return;
    if (!enabled()) { giveBack(); return; }
    if (!document.querySelector('.rhythiax-scores-hub')) { RhythiaX.injected = false; RhythiaX.ContentLifecycle?.queueInject?.(0); return; }
    RhythiaX.ScoreHubNative?.hideNativeScoreSections?.();
  }

  return { inject, refresh, pageMode };
})();
