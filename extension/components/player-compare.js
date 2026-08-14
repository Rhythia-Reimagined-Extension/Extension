// Backward-compatible player comparison entry point. Implementation loads first.
var RhythiaX = RhythiaX || {};

RhythiaX.injectPlayerCompare = function (player) {
  return RhythiaX.CompareView?.inject(player);
};
