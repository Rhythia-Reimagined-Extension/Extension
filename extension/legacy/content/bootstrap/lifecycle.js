// Injection lifecycle; route detection and SPA observation are separate providers.
var RhythiaX = RhythiaX || {};

// Legacy builds when Rhythia's elements are there, with no timed retries: wake() tries once now, and
// the page observer (route-observer.js) tries again whenever Rhythia's own DOM changes.
RhythiaX.ContentLifecycle = (function () {
  let retryTimer = null;

  const invalidated = error => RhythiaX.isExtensionContextInvalidated?.(error)
    || /extension context invalidated|context invalidated/i.test(String(error?.message || error));

  function clearTimers() {
    if (retryTimer) clearTimeout(retryTimer);
    retryTimer = null;
  }

  function inject() {
    if (RhythiaX.extensionContextInvalidated) return false;
    if (document.documentElement?.dataset.rhythiaxSettingsReady !== 'true') return false;
    const pageType = RhythiaX.PageRouteContext.type();
    if (!RhythiaX.PageRouteContext.isInjectable()) return false;
    try {
      if (pageType === 'profile') {
        RhythiaX.injectProfileCreatorBadge?.();
      }
      if (pageType === 'score-replay') return RhythiaX.injectScoreReplay?.() || false;
      if (pageType === 'changelog') return RhythiaX.injectChangelog?.() || false;
      if (pageType === 'map-list') return RhythiaX.injectMapSearch?.() || false;
      if (pageType === 'scores') {
        const ready = RhythiaX.enhanceScoreCards?.() === true;
        RhythiaX.injected = ready;
        return ready;
      }
      return RhythiaX.injectProfile();
    } catch (error) {
      if (invalidated(error)) {
        RhythiaX.ContentBootstrap?.stop();
        return false;
      }
      RhythiaX.captureError(error, 'Injection attempt failed');
      return false;
    }
  }

  function hasInjectedContent() {
    const pageType = RhythiaX.PageRouteContext.type();
    if (pageType === 'score-replay') return Boolean(document.querySelector('.rhythiax-score-replay-fullscreen-button'));
    if (pageType === 'changelog') return Boolean(document.querySelector('[data-rhythiax-changelog-tab]'));
    if (pageType === 'map-list') return Boolean(document.querySelector('.rhythiax-msearch'));
    if (pageType === 'scores') {
      if (RhythiaX.isModuleEnabled?.('scoreCards') === false
        || RhythiaX.isModuleOptionEnabled?.('scoreCards', 'customCards') === false) return true;
      return Boolean(document.querySelector('.rhythiax-redesigned, .rhythiax-score-card, .rhythiax-scores-hub'));
    }
    if (RhythiaX.isModuleEnabled?.('advancedStats') === false) return true;
    // A surviving Scores Hub or title card does not mean the native statistics
    // subtree survived the SPA render as well.
    if (pageType === 'profile') return Boolean(document.querySelector('.rhythiax-stats-panel, .rhythiax-stats-tabs, .rhythiax-reimagined-stats-body'));
    return false;
  }

  function recover() {
    if (String(RhythiaX.profileRequestContext?.playerId || '') === String(RhythiaX.PageRouteContext.playerId?.() || '')
      && RhythiaX.profileRequestContext?.navigationToken === RhythiaX.navigationToken) return;
    if (RhythiaX.extensionContextInvalidated || !RhythiaX.injected || hasInjectedContent()) return;
    RhythiaX.log('Injected content was removed; scheduling a fresh injection');
    RhythiaX.injected = false;
    wake();
  }

  // Pages Legacy does not build on (the home page, the leaderboards, the maps ...) need no retries.
  const worthTrying = () => RhythiaX.PageRouteContext.isInjectable();

  function queueInject(delay) {
    if (retryTimer || !worthTrying()) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (!RhythiaX.extensionContextInvalidated && !RhythiaX.injected) inject();
    }, delay);
  }

  function wake() {
    if (RhythiaX.extensionContextInvalidated || RhythiaX.injected) return;
    queueInject(0);
  }

  function handleNavigation() {
    if (RhythiaX.extensionContextInvalidated) return;
    RhythiaX.navigationToken++;
    // Map art still loading for the page just left is given up now, not at this page's first art request.
    RhythiaX.beatmapPageSignal?.();
    RhythiaX.profileHistoryContext = null;
    RhythiaX.profileRequestContext = null;
    RhythiaX.loadTheme?.();
    RhythiaX.apiAbortController?.abort();
    RhythiaX.apiAbortController = null;
    RhythiaX.CompareLoader?.reset();
    RhythiaX.cleanupScoreReplay?.();
    RhythiaX.cleanupChangelog?.();
    RhythiaX.cleanupMapSearch?.();
    clearTimers();
    RhythiaX.injected = false;
    RhythiaX.cleanupStaleElements();
    if (RhythiaX.PageRouteContext.type() === 'maps') return;
    const nextPlayerId = typeof window !== 'undefined' ? window.location.pathname.match(/\/player\/(\d+)/)?.[1] : null;
    if (nextPlayerId) {
      RhythiaX.prefetchPlayerData?.(nextPlayerId);
    }
    wake();
  }

  return { clearTimers, inject, recover, queueInject, wake, handleNavigation };
})();
