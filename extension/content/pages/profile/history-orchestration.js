// Profile history and backup-prompt orchestration; rendering remains in composition.
var RhythiaX = RhythiaX || {};

(function () {
  function removePrompt() {
    document.querySelector('.rhythiax-local-backup-prompt')?.remove();
  }

  function rememberPrompt(state) {
    try {
      chrome.storage.local.set({ [RhythiaX.DATA_BACKUP_PROMPT_KEY]: state }, () => {
        if (chrome.runtime?.lastError) RhythiaX.captureError(new Error(chrome.runtime.lastError.message), 'Backup prompt preference could not be saved');
      });
    } catch (error) {
      RhythiaX.captureError(error, 'Backup prompt preference could not be saved');
    }
    if (state === 'dismissed' && RhythiaX.StorageMutationBridge) {
      RhythiaX.StorageMutationBridge.dataSettingsPatch({ localBackupEnabled: false })
        .catch(() => {});
    }
    removePrompt();
  }

  function openBackupSettings() {
    rememberPrompt('settings');
    chrome.runtime.sendMessage({ type: 'rhythiax-open-backup-settings' }).catch(() => {});
  }

  RhythiaX.maybeShowLocalBackupPrompt = function (captureResult) {
    if (!captureResult?.record || document.querySelector('.rhythiax-local-backup-prompt')) return;
    try {
      chrome.storage.local.get({ [RhythiaX.DATA_BACKUP_PROMPT_KEY]: '' }, result => {
       if (chrome.runtime?.lastError) {
         RhythiaX.captureError(new Error(chrome.runtime.lastError.message), 'Backup prompt preference could not be loaded');
         return;
       }
       if (result[RhythiaX.DATA_BACKUP_PROMPT_KEY] || !document.body || document.querySelector('.rhythiax-local-backup-prompt')) return;
      const prompt = document.createElement('aside');
      prompt.className = 'rhythiax-local-backup-prompt';
      prompt.setAttribute('role', 'status');
      prompt.innerHTML = '<button class="rhythiax-local-backup-prompt__close" type="button" aria-label="Dismiss">&times;</button><div class="rhythiax-local-backup-prompt__mark" aria-hidden="true">+</div><div class="rhythiax-local-backup-prompt__body"><span class="rhythiax-local-backup-prompt__eyebrow">Local data protection</span><strong>Keep a recovery copy of your history</strong><p>Backup is a recommended feature that creates restore points in case of data issues. It helps prevent data loss and works quietly in the background.</p><div class="rhythiax-local-backup-prompt__actions"><button class="rhythiax-local-backup-prompt__primary" type="button">Enable local backup</button><button class="rhythiax-local-backup-prompt__link" type="button" data-backup-prompt-settings>Backup settings</button><button class="rhythiax-local-backup-prompt__link" type="button" data-backup-prompt-later>Not now</button></div></div>';
      prompt.querySelector('.rhythiax-local-backup-prompt__close')?.addEventListener('click', () => rememberPrompt('dismissed'));
      prompt.querySelector('.rhythiax-local-backup-prompt__primary')?.addEventListener('click', openBackupSettings);
      prompt.querySelector('[data-backup-prompt-settings]')?.addEventListener('click', openBackupSettings);
      prompt.querySelector('[data-backup-prompt-later]')?.addEventListener('click', () => rememberPrompt('dismissed'));
       document.body.appendChild(prompt);
      });
    } catch (error) {
      RhythiaX.captureError(error, 'Backup prompt preference could not be loaded');
    }
  };

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
    const player = RhythiaX.extractPlayerData();
    const capture = RhythiaX.recordProfileDataCapture?.(playerId, player, context.scoreSets, {
      source: 'api', visitId: `force-${playerId}-${Date.now()}`,
    });
    Promise.resolve(capture)
      .then(() => Promise.resolve(RhythiaX.applyProfileHistoryIndicators?.(playerId)))
      .then(() => sendResponse({ ok: true }))
      .catch(error => {
        RhythiaX.captureError(error, 'Forced profile history write failed');
        sendResponse({ ok: false, reason: 'The current profile could not be saved.' });
      });
    return true;
  });
})();
