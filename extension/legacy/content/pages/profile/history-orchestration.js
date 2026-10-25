// Profile history orchestration; rendering remains in composition.
var RhythiaX = RhythiaX || {};

(function () {

  if (typeof chrome === 'undefined' || !chrome?.runtime?.onMessage?.addListener) return;
  chrome.runtime.onMessage.addListener((message) => {
    const playerId = RhythiaX.PageRouteContext.type() === 'profile'
      ? RhythiaX.PageRouteContext.playerId()
      : '';
    if (message?.type === 'rhythiax-history-settings') {
      if (playerId) Promise.resolve(RhythiaX.applyProfileHistoryIndicators?.(playerId))
        .catch(() => {});
      return;
    }
  });
})();
