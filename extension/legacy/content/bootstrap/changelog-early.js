// Classic changelog, before Rhythia paints: marks <html> with the view the URL asks for, so
// anti-flicker.css can give the tabs their third column and hide the official notes of a
// ?view=reimagined page from the first frame. pages/changelog/composition.js keeps the mark
// in sync after that. Runs with either look; the CSS ignores it under Exodus.
(function () {
  'use strict';
  const root = document.documentElement;
  if (!/^\/changelog(?:\/|$)/.test(location.pathname)) return;
  root.dataset.rhythiaxChangelog = new URLSearchParams(location.search).get('view') === 'reimagined' ? 'reimagined' : 'official';
  // Classic adds its tab within a second or two; if it never does (Classic off), give the page back.
  setTimeout(() => {
    if (!document.querySelector('[data-rhythiax-changelog-tab]')) delete root.dataset.rhythiaxChangelog;
  }, 6000);
})();
