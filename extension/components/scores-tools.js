// Backward-compatible scores-tools entry point. Implementation loads first.
var RhythiaX = RhythiaX || {};

RhythiaX.animateScoresCollapse = function (element, open, immediate, content) { return RhythiaX.ScoresToolsService.animate(element, open, immediate, content); };
RhythiaX.prepareScoresCollapsibles = function () { return RhythiaX.ScoresToolsService.prepare(); };
RhythiaX.applyConfiguredScoreView = function () { return RhythiaX.ScoresToolsService.configuredView(); };
RhythiaX.injectScoresTools = function (options) { return RhythiaX.ScoresToolsView.inject(options); };
RhythiaX.applyScoresToolbar = function () { return RhythiaX.ScoresToolsView.apply(); };
