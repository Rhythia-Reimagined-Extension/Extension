// Reimagined for Rhythia — Classic's start: the last file of its group (engines.js), so every part it
// starts has loaded. Starts the route observer (content/bootstrap/route-observer.js) and the changelog page.
;(function () {
  'use strict';
  const start = () => {
    RhythiaX.ContentBootstrap.start();
    RhythiaX.ChangelogPageComposition?.start?.();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
