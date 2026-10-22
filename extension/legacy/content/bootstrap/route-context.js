// Route facts shared by content bootstrap and page composition.
var RhythiaX = RhythiaX || {};

RhythiaX.PageRouteContext = {
  type(path = window.location.pathname) {
    if (/^\/score\/[^/]+\/?$/.test(path)) return RhythiaX.Exodus?.owns?.() ? 'exodus' : 'score-replay';
    // Exodus renders these pages itself (a score, a profile and its scores); the 1.2.x pipeline stays out.
    if (/^\/player\/[^/]+\/scores(?:\/|$)/.test(path)) return RhythiaX.Exodus?.owns?.() ? 'exodus' : 'scores';
    if (/^\/player\/[^/]+\/?$/.test(path)) return RhythiaX.Exodus?.owns?.() ? 'exodus' : 'profile';
    if (/^\/maps(?:\/|$)/.test(path)) return 'maps';
    if (/^\/changelog(?:\/|$)/.test(path)) return RhythiaX.Exodus?.owns?.() ? 'exodus' : 'changelog';
    return 'unknown';
  },

  playerId(path = window.location.pathname) {
    return path.match(/^\/player\/([^/]+)/)?.[1] || '';
  },

  isInjectable(path = window.location.pathname) {
    const type = this.type(path);
    // A page Exodus draws itself needs nothing from the 1.2.x pipeline underneath it.
    return type !== 'unknown' && type !== 'maps' && type !== 'exodus';
  },
};
