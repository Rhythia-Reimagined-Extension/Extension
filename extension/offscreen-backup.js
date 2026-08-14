// Rhythia X - Offscreen file writer

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'rhythiax-write-local-backup') return false;
  if (sender?.id !== chrome.runtime.id) {
    sendResponse({ ok: false, reason: 'unauthorized' });
    return false;
  }
  RhythiaX.writeLocalBackupPayload(message.payload)
    .then(result => sendResponse(result))
    .catch(error => sendResponse({ ok: false, reason: 'error', error: String(error?.message || error) }));
  return true;
});
