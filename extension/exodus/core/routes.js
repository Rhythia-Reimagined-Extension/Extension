// =============================================
// Reimagined for Rhythia — Exodus routes
// =============================================
// Which page Exodus shows at an address, and which "Pages Exodus takes over" entry it belongs to. Nothing
// here keeps state or touches the page: each function reads the address it is given, or by default the one
// in the address bar (the query that /support depends on is always read from there). Used by core/shell.js.

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusRoutes = (function () {
  'use strict';

  const profileId = (path = location.pathname) => path.match(/^\/player\/(\d+)(?:\/scores)?\/?$/)?.[1] || '';
  const pageOf = (path = location.pathname) => (/\/scores\/?$/.test(path) ? 'scores' : 'profile');
  const HOME = 'home';
  const BOARD = 'board';
  const isBoard = (path = location.pathname) => /^\/leaderboards(?:\/[A-Za-z]{2})?\/?$/.test(path);
  // Views that load their own data: a score, a map, a clan, a collection ('s', 'm', 'c', 'k' + id) and the pages
  // 'maps', 'skins', 'clans', 'collections', 'collections-own', 'wiki', 'changelog' (all of its addresses) and 'support'.
  const viewKey = (path = location.pathname) => {
    const m = path.match(/^\/(score|maps|clans|collections)\/(\d+)\/?$/);
    if (m) return { score: 's', maps: 'm', clans: 'c', collections: 'k' }[m[1]] + m[2];
    if (/^\/collections\/own\/?$/.test(path)) return 'collections-own';
    // Paynet comes back to /support?paynet=…; Rhythia checks that payment itself.
    if (/^\/support\/?$/.test(path)) return new URLSearchParams(location.search).has('paynet') ? '' : 'support';
    if (/^\/changelog(?:\/(?:public|web)(?:\/\d{4}-\d{2}-\d{2})?)?\/?$/.test(path)) return 'changelog';
    return /^\/(maps|skins|clans|collections|wiki)\/?$/.test(path) ? path.replace(/\//g, '') : '';
  };
  // What Exodus shows at an address: a player (profile or scores), the home page, the leaderboards or a view.
  const routeKey = (path = location.pathname) => (profileId(path) ? 'p' + profileId(path) : path === '/' ? HOME : isBoard(path) ? BOARD : viewKey(path));
  // Which "Pages Exodus takes over" entry an address belongs to.
  const pageGroup = key => {
    if (!key) return '';
    if (key === HOME) return 'home';
    if (key === BOARD) return 'leaderboards';
    if (/^p\d/.test(key)) return 'profiles';
    if (/^[sm]\d/.test(key) || key === 'maps') return 'maps';
    if (/^c\d/.test(key) || key === 'clans') return 'clans';
    if (/^k\d/.test(key) || key.startsWith('collections')) return 'collections';
    return key;
  };

  return { profileId, pageOf, HOME, BOARD, isBoard, viewKey, routeKey, pageGroup };
})();
