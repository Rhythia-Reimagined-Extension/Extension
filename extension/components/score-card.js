// Backward-compatible score-card entry point. Implementation loads first.
var RhythiaX = RhythiaX || {};

RhythiaX.injectAbsoluteDates = function () { return RhythiaX.ScoreCardView.absoluteDates(); };
RhythiaX.redesignScoreCard = function (card, index) { return RhythiaX.ScoreCardView.redesign(card, index); };
RhythiaX.getProfileScoreType = function (card) { return RhythiaX.ScoreCardService.profileType(card); };
RhythiaX.installProfileScoreTabs = function () { return RhythiaX.ScoreCardService.installTabs(); };
RhythiaX.enhanceScoreCards = function () { return RhythiaX.ScoreCardView.enhance(); };
