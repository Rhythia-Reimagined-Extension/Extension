// Classic, before Rhythia paints. Runs with either look; anti-flicker.css ignores these marks under Exodus.
// - Changelog: marks <html> with the view the URL asks for, so anti-flicker.css can give the tabs their third
//   column and hide the official notes of a ?view=reimagined page from the first frame.
//   pages/changelog/composition.js keeps the mark in sync after that.
// - Profile: anti-flicker.css hides Rhythia's score list and Statistics body from the first frame, for Classic's
//   Scores hub and Statistics panel. For a page opened on /player/, whatever Classic has not put in place
//   after the wait below is given back (data-rhythiax-scores-released, data-rhythiax-stats-released): Classic
//   off or not loaded, or a profile it could not build. pages/profile/composition.js sets and clears the
//   same marks for every profile Classic loads.
(function () {
  'use strict';
  const root = document.documentElement;
  // Classic adds its parts within a second or two; what is still missing after this is given back.
  const RELEASE_AFTER_MS = 6000;
  if (/^\/player\//.test(location.pathname)) {
    const openedOn = location.pathname;
    setTimeout(() => {
      // Moved to another page meanwhile: a Classic that has loaded (core/modules.js marks <html>) decides there itself.
      if (location.pathname !== openedOn && root.dataset.rhythiaxModulesReady === 'true') return;
      if (!document.querySelector('.rhythiax-scores-hub')) root.dataset.rhythiaxScoresReleased = 'true';
      if (!document.querySelector('.rhythiax-reimagined-stats-body')) root.dataset.rhythiaxStatsReleased = 'true';
    }, RELEASE_AFTER_MS);
    return;
  }
  if (!/^\/changelog(?:\/|$)/.test(location.pathname)) return;
  root.dataset.rhythiaxChangelog = new URLSearchParams(location.search).get('view') === 'reimagined' ? 'reimagined' : 'official';
  // If Classic's tab never appears (Classic off), give the page back.
  setTimeout(() => {
    if (!document.querySelector('[data-rhythiax-changelog-tab]')) delete root.dataset.rhythiaxChangelog;
  }, RELEASE_AFTER_MS);
})();
