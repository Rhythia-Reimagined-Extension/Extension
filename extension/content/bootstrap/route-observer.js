// SPA route observation and startup retain the former main.js timing contract.
var RhythiaX = RhythiaX || {};

RhythiaX.ContentBootstrap = (function () {
  let observer = null;
  let lastPath = window.location.pathname;
  let navigationTimer = null;
  let started = false;
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
      if (RhythiaX.isMasterActive && !RhythiaX.isMasterActive()) return;
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
        RhythiaX.injectProfileCrown?.();
        RhythiaX.injectProfileAvatarEffects?.();
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
      if (RhythiaX.isModuleEnabled?.('playerCompare') === false || (RhythiaX.isMasterActive && !RhythiaX.isMasterActive())) {
        RhythiaX.CompareView?.cleanup?.();
        document.querySelectorAll('.rhythiax-compare-profile-button, .rhythiax-compare-tray, .rhythiax-compare-modal').forEach(btn => btn.remove());
      } else if (!document.querySelector('.rhythiax-compare-profile-button')) {
        const context = RhythiaX.profileHistoryContext;
        if (context?.playerId === RhythiaX.PageRouteContext.playerId()) {
          RhythiaX.injectPlayerCompare?.(context.player);
        }
      }
    }
    if (RhythiaX.PageRouteContext.type() !== 'profile' && (RhythiaX.isModuleEnabled?.('playerCompare') === false || (RhythiaX.isMasterActive && !RhythiaX.isMasterActive()))) {
      RhythiaX.CompareView?.cleanup?.();
      document.querySelectorAll('.rhythiax-compare-tray, .rhythiax-compare-modal').forEach(el => el.remove());
    }
    if (RhythiaX.PageRouteContext.type() === 'scores') {
      if (RhythiaX.isModuleEnabled?.('scoreCards') && RhythiaX.isModuleOptionEnabled?.('scoreCards', 'customCards')) {
        if (needsScores) {
          RhythiaX.enhanceScoreCards?.();
          RhythiaX.applyScoreFilter?.();
        }
      } else {
        RhythiaX.ScoreCardView?.unenhance?.();
      }
    }
    if (!RhythiaX.injected) RhythiaX.ContentLifecycle.queueInject(100);
  }

  function startObserver() {
    clearMutationBatch();
    observer?.disconnect();
    const initialPlayerMatch = typeof window !== 'undefined' ? window.location.pathname.match(/\/player\/(\d+)/) : null;
    if (initialPlayerMatch?.[1]) {
      RhythiaX.prefetchPlayerData?.(initialPlayerMatch[1]);
    }
    observer = new MutationObserver(records => {
      if (RhythiaX.extensionContextInvalidated) return stop();
      checkUrlChange();
      queueMutations(records);
    });
    // Observe the parent too: React may replace #root during SPA recovery.
    observer.observe(document.body || document.getElementById('root'), {
      childList: true, subtree: true, characterData: true,
      attributes: true, attributeFilter: ['href'],
    });
  }

  function deactivate() {
    clearMutationBatch();
    document.documentElement.dataset.rhythiaxMasterActive = 'false';
    observer?.disconnect();
    observer = null;
    if (navigationTimer) clearTimeout(navigationTimer);
    navigationTimer = null;
    RhythiaX.ContentLifecycle.clearTimers();
    RhythiaX.ChangelogPageComposition?.stop?.();
    RhythiaX.apiAbortController?.abort();
    RhythiaX.apiAbortController = null;
    RhythiaX.injected = false;
    RhythiaX.CompareView?.cleanup?.();

    // 1. Unmount Title Progression and restore native progression cards/headers
    const titleCard = RhythiaX.ProfilePageAdapter?.titleProgressionCard?.() || RhythiaX.TitleProgression?.Service?.findNativeTitleCard?.(document);
    if (titleCard) RhythiaX.TitleProgression?.Service?.unmount?.(titleCard);
    RhythiaX.TitleProgression?.Service?.cleanup?.();
    document.querySelectorAll('.rhythiax-title-progression-host').forEach(el => el.remove());
    document.querySelectorAll('[data-rhythiax-native-hidden="true"]').forEach(el => {
      el.removeAttribute('data-rhythiax-native-hidden');
      el.style.display = '';
      el.style.removeProperty?.('display');
    });
    document.querySelectorAll('[data-rhythiax-native-header="true"]').forEach(el => {
      el.removeAttribute('data-rhythiax-native-header');
      el.style.display = '';
      el.style.removeProperty?.('display');
    });

    // 2. Unenhance score cards back to native look
    RhythiaX.ScoreCardView?.unenhance?.();

    // 3. Clear stale elements
    RhythiaX.cleanupStaleElements?.(false);

    // 4. Remove all injected containers and badges
    document.querySelectorAll(
      '.rhythiax-injected-stats-section, .rhythiax-profile-box, .rhythiax-reimagined-stats-body, ' +
      '.rhythiax-score-replay-fullscreen-button, [data-rhythiax-changelog-tab], ' +
      '.rhythiax-compare-profile-button, .rhythiax-compare-tray, .rhythiax-compare-modal, ' +
      '.rhythiax-creator-badge, .rhythiax-profile-crown, .rhythiax-profile-avatar-effect'
    ).forEach(el => el.remove());
    document.querySelectorAll('.rhythiax-profile-avatar-effect-host').forEach(el => el.classList.remove('rhythiax-profile-avatar-effect-host'));

    // 5. Restore native stats body
    document.querySelectorAll('.rhythiax-native-stats-body').forEach(el => {
      while (el.firstChild) el.parentElement?.insertBefore(el.firstChild, el);
      el.remove();
    });

    // 6. Remove theme & page attributes
    document.documentElement.removeAttribute('data-rhythiax-theme');
    document.body?.removeAttribute('data-rhythiax-theme');
    document.documentElement.removeAttribute('data-rhythiax-page');
    document.body?.removeAttribute('data-rhythiax-page');
  }

  function activate() {
    document.documentElement.dataset.rhythiaxMasterActive = 'true';
    if (started) {
      RhythiaX.loadTheme?.();
      startObserver();
      if (RhythiaX.PageRouteContext.type() !== 'maps') {
        RhythiaX.ContentLifecycle.scheduleRetries();
        RhythiaX.ContentLifecycle.startReadinessPoll();
      }
    } else {
      start();
    }
  }

  function start() {
    if (started) return;
    started = true;
    RhythiaX.onExtensionContextInvalidated = stop;
    window.addEventListener('popstate', handleNavigation);
    ['pushState', 'replaceState'].forEach(method => {
      const original = history[method];
      history[method] = function () {
        const result = original.apply(this, arguments);
        checkUrlChange();
        return result;
      };
    });
    if (RhythiaX.isMasterActive && !RhythiaX.isMasterActive()) return;
    startObserver();
    if (RhythiaX.PageRouteContext.type() !== 'maps') {
      RhythiaX.ContentLifecycle.scheduleRetries();
      RhythiaX.ContentLifecycle.startReadinessPoll();
    }
    window.addEventListener('load', () => {
      if (RhythiaX.isMasterActive && !RhythiaX.isMasterActive()) return;
      if (RhythiaX.PageRouteContext.type() !== 'maps' && !RhythiaX.injected) {
        RhythiaX.ContentLifecycle.scheduleRetries();
        RhythiaX.ContentLifecycle.startReadinessPoll();
      }
    }, { once: true });
  }

  return { start, stop, activate, deactivate };
})();

// Preserve the pre-DOM-ready invalidation handler installed by the old entrypoint.
RhythiaX.onExtensionContextInvalidated = () => RhythiaX.ContentBootstrap.stop();
