// Profile native-DOM boundary. Site selectors remain behind SiteDomBridge.
var RhythiaX = RhythiaX || {};

RhythiaX.ProfilePageAdapter = {
  sidebar() { return RhythiaX.SiteDomBridge.query('.lg\\:col-span-3'); },
  content() { return RhythiaX.SiteDomBridge.query('.lg\\:col-span-9'); },
  scoreCards() { return RhythiaX.SiteDomBridge.findScoreCards(); },
  officialStats() { return RhythiaX.SiteDomBridge.findOfficialStatsContainer(); },
  playerId() { return RhythiaX.PageRouteContext.playerId(); },
};
