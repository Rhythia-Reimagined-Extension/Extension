// Backward-compatible statistics entry point. Implementation loads first.
var RhythiaX = RhythiaX || {};

const officialStatsSnapshots = new Map();

function snapshotOfficialStats() {
  const container = RhythiaX.findOfficialStatsContainer();
  const space = container?.querySelector('.space-y-3');
  if (space && !officialStatsSnapshots.has(space)) {
    officialStatsSnapshots.set(space, Array.from(space.children, child => child.cloneNode(true)));
  }
}

// StatisticsView adapts site-owned rows in place. Keep an exact pre-injection
// copy so route cleanup can restore native labels, classes, and child markup.
RhythiaX.cleanupOfficialStats = function () {
  officialStatsSnapshots.forEach((children, space) => {
    if (!space.isConnected) return;
    space.replaceChildren(...children.map(child => child.cloneNode(true)));
  });
  officialStatsSnapshots.clear();
};

RhythiaX.buildStatsPanel = function (player, scores, playerRp, pageType, ratingScores, options) { snapshotOfficialStats(); return RhythiaX.StatisticsView.buildPanel(player, scores, playerRp, pageType, ratingScores, options); };
RhythiaX.injectDeferredStatsProfiles = function (scores, ratingScores, pageType) { return RhythiaX.StatisticsView.deferredProfiles(scores, ratingScores, pageType); };
