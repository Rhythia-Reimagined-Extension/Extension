// Profile native-DOM boundary. Site selectors remain behind SiteDomBridge.
var RhythiaX = RhythiaX || {};

RhythiaX.ProfilePageAdapter = {
  sidebar() { return RhythiaX.SiteDomBridge.query('.lg\\:col-span-3') || this.officialStats(); },
  content() { return RhythiaX.SiteDomBridge.query('.lg\\:col-span-9') || RhythiaX.SiteDomBridge.query('.mx-auto.max-w-\\[1120px\\], .space-y-4, #root'); },
  scoreCards() { return RhythiaX.SiteDomBridge.findScoreCards(); },
  officialStats() { return RhythiaX.SiteDomBridge.findOfficialStatsContainer(); },
  statisticsShell() { return RhythiaX.SiteDomBridge.findOfficialStatsContainer(); },
  headerRankArea() { return RhythiaX.SiteDomBridge.findHeaderRankArea(); },
  titleProgressionCard() { return RhythiaX.TitleProgression?.Service?.findNativeTitleCard?.(document); },
  playerId() { return RhythiaX.PageRouteContext.playerId(); },
};
