// Changelog DOM adapter for extension-owned additions around native page markup.
var RhythiaX = RhythiaX || {};

RhythiaX.ChangelogPageAdapter = {
  query(selector, context) { return RhythiaX.SiteDomBridge.query(selector, context); },
  queryAll(selector, context) { return RhythiaX.SiteDomBridge.queryAll(selector, context); },
};
