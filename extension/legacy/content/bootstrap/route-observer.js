// SPA route observation and startup. Injection is retried on Rhythia's own DOM changes, never on a timer.
var RhythiaX = RhythiaX || {};

RhythiaX.ContentBootstrap = (function () {
  let observer = null;
  let lastPath = window.location.pathname;
  let navigationTimer = null;
  let started = false;
  // True while Exodus shows the page (RhythiaX.ClassicIdle): Classic follows no route and builds nothing.
  let suspended = false;
  let mutationTimer = null;
  let scoresChanged = false;
  const SCORE_SELECTOR = 'div.relative.py-2:not(.rhythiax-redesigned), ' +
    'div.relative.overflow-hidden.rounded-lg.border:not(.rhythiax-redesigned), ' +
    '.score-card:not(.rhythiax-redesigned), ' +
    '[class*="rounded-lg"][class*="border"]:has(a[href*="/score/"]):not(.rhythiax-redesigned)';
  const OWN_CONTENT_SELECTOR = '.rhythiax-scores-hub, .rhythiax-pinned-scores-section, ' +
    '[data-rhythiax-enhanced="true"]:not(.rhythiax-card-enhanced-host)';

  function clearMutationBatch() {
    if (mutationTimer) clearTimeout(mutationTimer);
    mutationTimer = null;
    scoresChanged = false;
  }

  function elementFor(node) {
    return node?.nodeType === 1 ? node : node?.parentElement;
  }

  function isOwnContent(node) {
    return Boolean(elementFor(node)?.closest?.(OWN_CONTENT_SELECTOR));
  }

  function affectsScores(record) {
    const target = elementFor(record.target);
    // Hydration can update text/href inside a skeleton without adding a card.
    if (target?.closest?.(SCORE_SELECTOR)) return true;
    return [...(record.addedNodes || [])].some(node => {
      const element = elementFor(node);
      return !isOwnContent(node) && (element?.matches?.(SCORE_SELECTOR) || element?.querySelector?.(SCORE_SELECTOR));
    });
  }

  function queueMutations(records) {
    const watchScores = RhythiaX.PageRouteContext.type() === 'scores';
    let nativeChange = false;
    for (const record of records) {
      if (isOwnContent(record.target)) continue;
      // An inserted extension subtree needs no second enhancement pass.
      if (record.type === 'childList' && !record.removedNodes?.length
        && record.addedNodes?.length && [...record.addedNodes].every(isOwnContent)) continue;
      nativeChange = true;
      if (watchScores && !scoresChanged && affectsScores(record)) scoresChanged = true;
    }
    if (!nativeChange || mutationTimer) return;
    const path = window.location.pathname;
    const search = window.location.search;
    mutationTimer = setTimeout(() => {
      mutationTimer = null;
      const needsScores = scoresChanged;
      scoresChanged = false;
      if (RhythiaX.extensionContextInvalidated) return stop();
      if (path !== window.location.pathname || search !== window.location.search || navigationTimer) return;
      processMutations(needsScores);
    }, 50);
  }

  function stop() {
    if (RhythiaX.extensionContextInvalidated && !observer && !navigationTimer && !mutationTimer) return;
    clearMutationBatch();
    RhythiaX.extensionContextInvalidated = true;
    if (navigationTimer) clearTimeout(navigationTimer);
    navigationTimer = null;
    observer?.disconnect();
    observer = null;
    RhythiaX.ContentLifecycle.clearTimers();
    RhythiaX.ChangelogPageComposition?.stop?.();
    RhythiaX.apiAbortController?.abort();
    RhythiaX.apiAbortController = null;
  }

  let lastSearch = typeof window !== 'undefined' ? window.location.search : '';

  function handleNavigation() {
    clearMutationBatch();
    const nextPath = window.location.pathname;
    RhythiaX.ContentLifecycle.handleNavigation();
    lastPath = nextPath;
    lastSearch = window.location.search;
  }

  function checkUrlChange() {
    const currentPath = window.location.pathname;
    const currentSearch = window.location.search;
    if (currentPath === lastPath && currentSearch === lastSearch) return;
    clearMutationBatch();
    const pathChanged = currentPath !== lastPath;
    const searchChanged = currentSearch !== lastSearch;
    lastPath = currentPath;
    lastSearch = currentSearch;
    if (pathChanged) {
      RhythiaX.profileHistoryContext = null;
      const playerMatch = currentPath.match(/\/player\/(\d+)/);
      if (playerMatch?.[1]) {
        RhythiaX.prefetchPlayerData?.(playerMatch[1]);
      }
    }
    if (navigationTimer) clearTimeout(navigationTimer);
    navigationTimer = setTimeout(() => {
      navigationTimer = null;
      if (pathChanged || (searchChanged && RhythiaX.PageRouteContext.type() === 'profile')) {
        handleNavigation();
      } else if (searchChanged) {
        if (RhythiaX.PageRouteContext.type() === 'changelog') {
          RhythiaX.injectChangelog?.();
        }
      }
    }, 40);
  }

  function processMutations(needsScores) {
    if (document.documentElement?.dataset.rhythiaxSettingsReady !== 'true') return;
    RhythiaX.ContentLifecycle.recover();
    if (RhythiaX.PageRouteContext.type() === 'maps') return;
    if (RhythiaX.PageRouteContext.type() === 'profile') {
      RhythiaX.injectProfileCreatorBadge?.();
      if (RhythiaX.isModuleEnabled?.('scoreCards')) {
        RhythiaX.ScoreCardService?.updateScoresHubVisibility?.();
        if (RhythiaX.profileHistoryContext?.scoreSets) {
          const hub = document.querySelector('.rhythiax-scores-hub');
          const col = RhythiaX.ScoreCardService?.getProfileColumn?.();
          const hubNeedsMount = !hub || !hub.isConnected || (col && hub.parentElement !== col);
          if (hubNeedsMount) {
            RhythiaX.mountScoresHub?.(RhythiaX.profileHistoryContext.scoreSets);
          }
        }
      } else {
        RhythiaX.ScoreCardView?.unenhance?.();
      }
      if (RhythiaX.isModuleEnabled?.('playerCompare') === false) {
        RhythiaX.CompareView?.cleanup?.();
        document.querySelectorAll('.rhythiax-compare-profile-button, .rhythiax-compare-tray, .rhythiax-compare-modal').forEach(btn => btn.remove());
      } else if (!document.querySelector('.rhythiax-compare-profile-button')) {
        const context = RhythiaX.profileHistoryContext;
        if (context?.playerId === RhythiaX.PageRouteContext.playerId()) {
          RhythiaX.injectPlayerCompare?.(context.player);
        }
      }
    }
    if (RhythiaX.PageRouteContext.type() !== 'profile' && RhythiaX.isModuleEnabled?.('playerCompare') === false) {
      RhythiaX.CompareView?.cleanup?.();
      document.querySelectorAll('.rhythiax-compare-tray, .rhythiax-compare-modal').forEach(el => el.remove());
    }
    if (RhythiaX.PageRouteContext.type() === 'scores') {
      if (RhythiaX.isModuleEnabled?.('scoreCards') && RhythiaX.isModuleOptionEnabled?.('scoreCards', 'customCards')) {
        if (needsScores) {
          RhythiaX.enhanceScoreCards?.();
        }
      } else {
        RhythiaX.ScoreCardView?.unenhance?.();
      }
    }
    if (!RhythiaX.injected) RhythiaX.ContentLifecycle.queueInject(100);
  }

  // A move Exodus makes, or Rhythia's page changing under Exodus, is not Classic's to follow.
  const idle = () => suspended || RhythiaX.exodusShowing?.() === true;

  function startObserver() {
    clearMutationBatch();
    observer?.disconnect();
    const initialPlayerMatch = typeof window !== 'undefined' ? window.location.pathname.match(/\/player\/(\d+)/) : null;
    if (initialPlayerMatch?.[1]) {
      RhythiaX.prefetchPlayerData?.(initialPlayerMatch[1]);
    }
    observer = new MutationObserver(records => {
      if (RhythiaX.extensionContextInvalidated) return stop();
      // Under Exodus, Rhythia's page keeps rendering unseen; there is nothing to follow or enhance in it.
      if (idle()) return;
      checkUrlChange();
      queueMutations(records);
    });
    // Observe the parent too: React may replace #root during SPA recovery.
    observer.observe(document.body || document.getElementById('root'), {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['href'],
    });
  }

  // Exodus takes the page by setting html.rhythiax-exodus and gives it back by removing the class (Rhythia's
  // own page, or Exodus switched off).
  let exodusWatch = null;
  function watchExodus() {
    if (exodusWatch || typeof MutationObserver === 'undefined') return;
    exodusWatch = new MutationObserver(() => {
      if (RhythiaX.extensionContextInvalidated) return;
      if (RhythiaX.exodusShowing?.()) suspend(); else resume();
    });
    exodusWatch.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
  }

  // Exodus took the page: everything Classic was doing stops. Its parts stop their own work through
  // RhythiaX.ClassicIdle (legacy/core/state.js); the theme and the page attributes stay with legacy/core/theme.js.
  function suspend() {
    if (suspended) return;
    suspended = true;
    clearMutationBatch();
    if (navigationTimer) clearTimeout(navigationTimer);
    navigationTimer = null;
    observer?.disconnect();
    observer = null;
    RhythiaX.ContentLifecycle.clearTimers();
    RhythiaX.apiAbortController?.abort();
    RhythiaX.apiAbortController = null;
    // Should Exodus leave the page to one Classic does not build, Rhythia's score list and Statistics body
    // must not stay hidden (styles/bridge/anti-flicker.css). resume() takes these marks off again.
    const marks = document.documentElement?.dataset;
    if (marks) {
      marks.rhythiaxScoresReleased = 'true';
      marks.rhythiaxStatsReleased = 'true';
    }
    RhythiaX.ClassicIdle?.set?.(true);
  }

  // Exodus gave the page back: Classic builds it as on a fresh visit, with one reset. A profile load hides and
  // gives back Rhythia's sections itself (pages/profile/composition.js).
  function resume() {
    if (!suspended) return;
    suspended = false;
    const marks = document.documentElement?.dataset;
    if (marks) {
      delete marks.rhythiaxScoresReleased;
      delete marks.rhythiaxStatsReleased;
    }
    if (navigationTimer) clearTimeout(navigationTimer);
    navigationTimer = null;
    lastPath = window.location.pathname;
    lastSearch = window.location.search;
    RhythiaX.ClassicIdle?.set?.(false);
    startObserver();
    resumeNavigated = true;
    setTimeout(() => { resumeNavigated = false; }, 0);
    handleNavigation();
  }

  // Set from a hand-back's build until the next task. Back or Forward from an Exodus page hands the page back
  // inside the same popstate (Exodus' listener runs first and removes the class), so the resume has already
  // built the page that popstate leads to.
  let resumeNavigated = false;

  // Back and forward. Exodus tells Rhythia's router about its own moves with a popstate it dispatches itself;
  // Classic follows only the browser's, and none while Exodus shows the page.
  function onPopState(event) {
    if (event?.isTrusted === false || idle() || resumeNavigated) return;
    handleNavigation();
  }

  function start() {
    if (started) return;
    started = true;
    RhythiaX.onExtensionContextInvalidated = stop;
    window.addEventListener('popstate', onPopState);
    ['pushState', 'replaceState'].forEach(method => {
      const original = history[method];
      history[method] = function () {
        const result = original.apply(this, arguments);
        // Exodus moves through history as well; while it shows the page, Classic does not follow.
        if (!idle()) checkUrlChange();
        return result;
      };
    });
    watchExodus();
    // Classic added to a tab where Exodus already shows the page waits until the page is handed back.
    if (RhythiaX.exodusShowing?.()) return suspend();
    startObserver();
    if (RhythiaX.PageRouteContext.type() !== 'maps') RhythiaX.ContentLifecycle.wake();
  }

  // The module settings arrived (core/modules.js). <html> is not watched, so try once more here.
  function settingsReady() {
    if (!observer || suspended || RhythiaX.extensionContextInvalidated) return;
    if (RhythiaX.PageRouteContext.type() !== 'maps') RhythiaX.ContentLifecycle.wake();
  }

  return { start, stop, suspend, resume, settingsReady };
})();

// Preserve the pre-DOM-ready invalidation handler installed by the old entrypoint.
RhythiaX.onExtensionContextInvalidated = () => RhythiaX.ContentBootstrap.stop();
