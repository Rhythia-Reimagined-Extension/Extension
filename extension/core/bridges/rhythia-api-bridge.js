// RhythiaX API boundary. Existing API providers retain all business logic.
var RhythiaX = RhythiaX || {};

RhythiaX.RhythiaApiBridge = {
  fetchPlayerScoreSets(...args) {
    return RhythiaX.fetchPlayerScoreSets(...args);
  },
  fetchPlayerScores(...args) {
    return RhythiaX.fetchPlayerScores(...args);
  },
  mergeWeightedRp(...args) {
    return RhythiaX.mergeWeightedRp(...args);
  },
  crossVerifyCardsWithApi(...args) {
    return RhythiaX.crossVerifyCardsWithApi(...args);
  },
};
