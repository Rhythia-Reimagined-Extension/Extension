// Backward-compatible player comparison entry point. Implementation loads first.
var RhythiaX = RhythiaX || {};

RhythiaX.injectPlayerCompare = function (player) {
  if ((RhythiaX.isMasterActive && !RhythiaX.isMasterActive()) || (RhythiaX.isModuleEnabled && !RhythiaX.isModuleEnabled('playerCompare'))) {
    RhythiaX.CompareView?.cleanup?.();
    document.querySelectorAll('.rhythiax-compare-profile-button, .rhythiax-compare-tray, .rhythiax-compare-modal').forEach(el => el.remove());
    return;
  }
  if (RhythiaX.CompareView?.updatePlayer && player) {
    RhythiaX.CompareView.updatePlayer(player);
  }
  return RhythiaX.CompareView?.inject(player);
};
