// Score replay DOM adapter. Native controls are only queried through the site bridge.
var RhythiaX = RhythiaX || {};

RhythiaX.ScoreReplayPageAdapter = {
  queryAll(selector, context) { return RhythiaX.SiteDomBridge.queryAll(selector, context); },
};
