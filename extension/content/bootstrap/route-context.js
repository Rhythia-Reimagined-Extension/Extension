// Route facts shared by content bootstrap and page composition.
var RhythiaX = RhythiaX || {};

RhythiaX.PageRouteContext = {
  type(path = window.location.pathname) {
    if (/^\/score\/[^/]+\/?$/.test(path)) return 'score-replay';
    if (/^\/player\/[^/]+\/?$/.test(path)) return 'profile';
    if (/^\/maps(?:\/|$)/.test(path)) return 'maps';
    return 'unknown';
  },

  playerId(path = window.location.pathname) {
    return path.match(/^\/player\/([^/]+)\/?$/)?.[1] || '';
  },

  isInjectable(path = window.location.pathname) {
    const type = this.type(path);
    return type !== 'unknown' && type !== 'maps';
  },
};
