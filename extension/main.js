// Backward-compatible content bootstrap entry point. Providers load first.
;(function () {
  'use strict';
  const start = () => {
    RhythiaX.ContentBootstrap.start();
    RhythiaX.ChangelogPageComposition?.start?.();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
