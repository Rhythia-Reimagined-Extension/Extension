// RhythiaX API boundary. Existing API providers retain all business logic.
var RhythiaX = RhythiaX || {};

RhythiaX.RhythiaApiBridge = {
  fetchPlayerScoreSets(...args) {
    return RhythiaX.fetchPlayerScoreSets(...args);
  },
  fetchUserProfile(...args) {
    return RhythiaX.fetchUserProfile(...args);
  },
};
