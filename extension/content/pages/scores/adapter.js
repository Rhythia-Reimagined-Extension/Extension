// Scores native-DOM boundary. The bridge preserves shared DOM provider replacement.
var RhythiaX = RhythiaX || {};

RhythiaX.ScoresPageAdapter = {
  scoreCards() { return RhythiaX.SiteDomBridge.findScoreCards(); },
  profileCards() { return RhythiaX.SiteDomBridge.queryAll('.rounded-xl.border'); },
  playerId() { return RhythiaX.PageRouteContext.playerId(); },
};
