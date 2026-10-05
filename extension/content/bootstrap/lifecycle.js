// Injection lifecycle; route detection and SPA observation are separate providers.
var RhythiaX = RhythiaX || {};

RhythiaX.ContentLifecycle = (function () {
  const RETRY_DELAYS = [0, 250, 500, 1000, 2000, 4000, 8000, 15000, 30000, 60000];
  let retryTimer = null;
  let readinessPoll = null;
  let retryGeneration = 0;

  const invalidated = error => RhythiaX.isExtensionContextInvalidated?.(error)
    || /extension context invalidated|context invalidated/i.test(String(error?.message || error));

  function clearTimers() {
    retryGeneration++;
    if (retryTimer) clearTimeout(retryTimer);
    if (readinessPoll) clearInterval(readinessPoll);
    retryTimer = null;
    readinessPoll = null;
  }

  function inject() {
    if (RhythiaX.extensionContextInvalidated) return false;
    if (RhythiaX.isMasterActive && !RhythiaX.isMasterActive()) return false;
    if (document.documentElement?.dataset.rhythiaxSettingsReady !== 'true') return false;
    const pageType = RhythiaX.PageRouteContext.type();
    if (!RhythiaX.PageRouteContext.isInjectable()) return false;
    try {
      if (pageType === 'profile') {
        RhythiaX.injectProfileCrown?.();
        RhythiaX.injectProfileCreatorBadge?.();
      }
      if (pageType === 'score-replay') return RhythiaX.injectScoreReplay?.() || false;
      if (pageType === 'changelog') return RhythiaX.injectChangelog?.() || false;
      if (pageType === 'scores') {
        const ready = RhythiaX.enhanceScoreCards?.() === true;
        RhythiaX.applyScoreFilter?.();
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
    if (pageType === 'scores') {
      if (RhythiaX.isModuleEnabled?.('scoreCards') === false
        || RhythiaX.isModuleOptionEnabled?.('scoreCards', 'customCards') === false) return true;
      return Boolean(document.querySelector('.rhythiax-redesigned, .rhythiax-score-card, .rhythiax-scores-hub'));
    }
    if (RhythiaX.isModuleEnabled?.('advancedStats') === false) return true;
    // A surviving Scores Hub or title card does not mean the native statistics
    // subtree survived the SPA render as well.
    if (pageType === 'profile') return Boolean(document.querySelector('.rhythiax-stats-panel, .rhythiax-stats-tabs, .rhythiax-reimagined-stats-body, .rhythiax-injected-stats-section, .rhythiax-profile-box, .rhythiax-injected-grade-row'));
    return false;
  }

  function recover() {
    if (String(RhythiaX.profileRequestContext?.playerId || '') === String(RhythiaX.PageRouteContext.playerId?.() || '')
      && RhythiaX.profileRequestContext?.navigationToken === RhythiaX.navigationToken) return;
    if (RhythiaX.extensionContextInvalidated || !RhythiaX.injected || hasInjectedContent()) return;
    RhythiaX.log('Injected content was removed; scheduling a fresh injection');
    RhythiaX.clearLoadingState();
    RhythiaX.injected = false;
    scheduleRetries();
    startReadinessPoll();
  }

  function startReadinessPoll() {
    if (readinessPoll) clearInterval(readinessPoll);
    const deadline = Date.now() + 120000;
    readinessPoll = setInterval(() => {
      if (RhythiaX.extensionContextInvalidated) return RhythiaX.ContentBootstrap?.stop();
      if (RhythiaX.injected || Date.now() >= deadline) {
        clearInterval(readinessPoll);
        readinessPoll = null;
        return;
      }
      inject();
    }, 500);
  }

  function queueInject(delay) {
    if (retryTimer) return;
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (!RhythiaX.extensionContextInvalidated && !RhythiaX.injected) inject();
    }, delay);
  }

  function scheduleRetries() {
    const generation = ++retryGeneration;
    RETRY_DELAYS.forEach(delay => setTimeout(() => {
      if (!RhythiaX.extensionContextInvalidated && generation === retryGeneration && !RhythiaX.injected) inject();
    }, delay));
  }

  function handleNavigation() {
    if (RhythiaX.extensionContextInvalidated) return;
    RhythiaX.navigationToken++;
    RhythiaX.profileHistoryContext = null;
    RhythiaX.profileRequestContext = null;
    RhythiaX.loadTheme?.();
    RhythiaX.apiAbortController?.abort();
    RhythiaX.apiAbortController = null;
    RhythiaX.CompareLoader?.reset();
    RhythiaX.cleanupScoreReplay?.();
    RhythiaX.cleanupChangelog?.();
    RhythiaX.clearLoadingState();
    retryGeneration++;
    RhythiaX.injected = false;
    RhythiaX.profileCrownRollPath = null;
    RhythiaX.profileCrownEnabled = false;
    RhythiaX.profileAvatarEffectRollPath = null;
    RhythiaX.profileAvatarEffectEnabled = false;
    RhythiaX.activeGrades = null;
    RhythiaX.activeSpeed = null;
    RhythiaX.cleanupStaleElements();
    if (RhythiaX.PageRouteContext.type() === 'maps') return;
    const nextPlayerId = typeof window !== 'undefined' ? window.location.pathname.match(/\/player\/(\d+)/)?.[1] : null;
    if (nextPlayerId) {
      RhythiaX.prefetchPlayerData?.(nextPlayerId);
    }
    scheduleRetries();
    startReadinessPoll();
  }

  return { clearTimers, inject, recover, startReadinessPoll, queueInject, scheduleRetries, handleNavigation };
})();
