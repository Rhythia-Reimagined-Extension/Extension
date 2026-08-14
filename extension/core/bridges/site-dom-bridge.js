// RhythiaX native-site DOM boundary. Selector ownership remains in shared/dom.js.
var RhythiaX = RhythiaX || {};

RhythiaX.SiteDomBridge = {
  query(...args) {
    return RhythiaX.qs(...args);
  },
  queryAll(...args) {
    return RhythiaX.qsa(...args);
  },
  findScoreCards(...args) {
    return RhythiaX.findScoreCards(...args);
  },
  findReplayLink(...args) {
    return RhythiaX.findReplayLink(...args);
  },
  findExpandedPanel(...args) {
    return RhythiaX.findExpandedPanel(...args);
  },
  findOfficialStatsContainer(...args) {
    return RhythiaX.findOfficialStatsContainer(...args);
  },
};
