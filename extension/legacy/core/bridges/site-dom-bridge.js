// RhythiaX native-site DOM boundary. Selector ownership remains in legacy/core/dom.js.
var RhythiaX = RhythiaX || {};

RhythiaX.SiteDomBridge = {
  query(...args) {
    return RhythiaX.qs(...args);
  },
  queryAll(...args) {
    return RhythiaX.qsa(...args);
  },
  findOfficialStatsContainer(...args) {
    return RhythiaX.findOfficialStatsContainer(...args);
  },
  findHeaderRankArea(...args) {
    return RhythiaX.findHeaderRankArea(...args);
  },
};
