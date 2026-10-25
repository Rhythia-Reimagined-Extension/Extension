// Profile native-DOM boundary. Site selectors remain behind SiteDomBridge.
var RhythiaX = RhythiaX || {};

RhythiaX.ProfilePageAdapter = {
  officialStats() { return RhythiaX.SiteDomBridge.findOfficialStatsContainer(); },
  headerRankArea() { return RhythiaX.SiteDomBridge.findHeaderRankArea(); },
  titleProgressionCard() { return RhythiaX.TitleProgression?.Service?.findNativeTitleCard?.(document); },
  playerId() { return RhythiaX.PageRouteContext.playerId(); },
};
