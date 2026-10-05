// Profile history orchestration; rendering remains in composition.
var RhythiaX = RhythiaX || {};

(function () {

  if (typeof chrome === 'undefined' || !chrome?.runtime?.onMessage?.addListener) return;
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const playerId = RhythiaX.PageRouteContext.type() === 'profile'
      ? RhythiaX.PageRouteContext.playerId()
      : '';
    if (message?.type === 'rhythiax-history-settings') {
      if (playerId) Promise.resolve(RhythiaX.applyProfileHistoryIndicators?.(playerId))
        .then(() => RhythiaX.refreshOpenStatHistories?.())
        .catch(() => {});
      return;
    }
    if (message?.type !== 'rhythiax-force-save-history') return;
    const context = RhythiaX.profileHistoryContext;
    if (!playerId || !context || context.playerId !== playerId || !context.scoreSets?.scores?.length) {
      sendResponse({ ok: false, reason: 'Open a loaded profile before forcing a save.' });
      return;
    }
    const player = context.player;
    const capture = RhythiaX.recordProfileDataCapture?.(playerId, player, context.scoreSets, {
      source: 'api', visitId: `force-${playerId}-${Date.now()}`,
      verifiedProfile: true,
      isCurrentProfile: () => RhythiaX.profileHistoryContext === context
        && RhythiaX.PageRouteContext.playerId() === playerId,
    });
    Promise.resolve(capture)
      .then(result => {
        if (result?.reason === 'cloud-only') {
          sendResponse({ ok: false, reason: 'Cloud Only does not save local profile history.' });
          return null;
        }
        return Promise.resolve(RhythiaX.applyProfileHistoryIndicators?.(playerId))
          .then(() => sendResponse({ ok: true }));
      })
      .catch(error => {
        RhythiaX.captureError(error, 'Forced profile history write failed');
        sendResponse({ ok: false, reason: 'The current profile could not be saved.' });
      });
    return true;
  });
})();
