// Route facts shared by content bootstrap and page composition.
var RhythiaX = RhythiaX || {};

RhythiaX.PageRouteContext = {
  type(path = window.location.pathname) {
    // While Exodus shows the page (a score, a profile and its scores, the changelog) Classic stays out.
    if (/^\/score\/[^/]+\/?$/.test(path)) return RhythiaX.exodusShowing?.() ? 'exodus' : 'score-replay';
    if (/^\/player\/[^/]+\/scores(?:\/|$)/.test(path)) return RhythiaX.exodusShowing?.() ? 'exodus' : 'scores';
    if (/^\/player\/[^/]+\/?$/.test(path)) return RhythiaX.exodusShowing?.() ? 'exodus' : 'profile';
    if (/^\/maps(?:\/|$)/.test(path)) return 'maps';
    if (/^\/changelog(?:\/|$)/.test(path)) return RhythiaX.exodusShowing?.() ? 'exodus' : 'changelog';
    return 'unknown';
  },

  playerId(path = window.location.pathname) {
    return path.match(/^\/player\/([^/]+)/)?.[1] || '';
  },

  isInjectable(path = window.location.pathname) {
    const type = this.type(path);
    // A page Exodus draws itself needs nothing from Classic underneath it.
    return type !== 'unknown' && type !== 'maps' && type !== 'exodus';
  },
};
