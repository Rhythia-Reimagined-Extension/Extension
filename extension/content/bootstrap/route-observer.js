// SPA route observation and startup retain the former main.js timing contract.
var RhythiaX = RhythiaX || {};

RhythiaX.ContentBootstrap = (function () {
  let observer = null;
  let lastPath = window.location.pathname;
  let navigationTimer = null;
  let started = false;

  function stop() {
    if (RhythiaX.extensionContextInvalidated && !observer && !navigationTimer) return;
    RhythiaX.extensionContextInvalidated = true;
    if (navigationTimer) clearTimeout(navigationTimer);
    navigationTimer = null;
    observer?.disconnect();
    observer = null;
    RhythiaX.ContentLifecycle.clearTimers();
    RhythiaX.apiAbortController?.abort();
    RhythiaX.apiAbortController = null;
  }

  function handleNavigation() {
    const nextPath = window.location.pathname;
    if (nextPath === lastPath) return RhythiaX.loadTheme?.();
    RhythiaX.ContentLifecycle.handleNavigation();
    lastPath = nextPath;
  }

  function checkUrlChange() {
    if (window.location.pathname === lastPath) return;
    RhythiaX.log('URL changed:', lastPath, '->', window.location.pathname);
    if (navigationTimer) clearTimeout(navigationTimer);
    navigationTimer = setTimeout(() => {
      navigationTimer = null;
      if (window.location.pathname !== lastPath) handleNavigation();
    }, 120);
  }

  function startObserver() {
    observer?.disconnect();
    observer = new MutationObserver(() => {
      if (RhythiaX.extensionContextInvalidated) return stop();
      checkUrlChange();
      RhythiaX.ContentLifecycle.recover();
      if (RhythiaX.PageRouteContext.type() === 'maps') return;
      if (RhythiaX.PageRouteContext.type() === 'profile') {
        RhythiaX.injectProfileCrown?.();
        RhythiaX.injectProfileAvatarEffects?.();
      }
      if (!RhythiaX.injected) RhythiaX.ContentLifecycle.queueInject(100);
    });
    observer.observe(document.getElementById('root') || document.body, { childList: true, subtree: true });
  }

  function showBadge() {
    if (document.querySelector('.rhythiax-badge')) return;
    const badge = document.createElement('div');
    badge.className = 'rhythiax-badge';
    badge.style.cssText = 'position:fixed;bottom:8px;right:8px;z-index:99999;background:var(--rhythiax-accent-soft);color:var(--rhythiax-accent);font-size:10px;padding:2px 8px;border-radius:4px;font-family:monospace;pointer-events:none;border:1px solid color-mix(in srgb, var(--rhythiax-accent) 20%, transparent);';
    badge.textContent = chrome.runtime?.getManifest?.().name || 'Rhythia Reimagined';
    document.body.appendChild(badge);
  }

  function start() {
    if (started) return;
    started = true;
    RhythiaX.onExtensionContextInvalidated = stop;
    showBadge();
    window.addEventListener('popstate', handleNavigation);
    ['pushState', 'replaceState'].forEach(method => {
      const original = history[method];
      history[method] = function () {
        const result = original.apply(this, arguments);
        checkUrlChange();
        return result;
      };
    });
    startObserver();
    if (RhythiaX.PageRouteContext.type() !== 'maps') {
      RhythiaX.ContentLifecycle.scheduleRetries();
      RhythiaX.ContentLifecycle.startReadinessPoll();
    }
    window.addEventListener('load', () => {
      if (RhythiaX.PageRouteContext.type() !== 'maps' && !RhythiaX.injected) {
        RhythiaX.ContentLifecycle.scheduleRetries();
        RhythiaX.ContentLifecycle.startReadinessPoll();
      }
    }, { once: true });
  }

  return { start, stop };
})();

// Preserve the pre-DOM-ready invalidation handler installed by the old entrypoint.
RhythiaX.onExtensionContextInvalidated = () => RhythiaX.ContentBootstrap.stop();
