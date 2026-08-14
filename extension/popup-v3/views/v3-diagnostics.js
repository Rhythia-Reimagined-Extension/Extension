// =============================================
// Popup V3 — Native diagnostics controls
// =============================================
// Keep the storage key and active-tab message unchanged so content-script
// logging behavior remains compatible.
// `checkControl('debugLogs', ...)` in v3-markup-core.js now reads
// `state.debugLogs` directly, so this also updates that in-memory value
// immediately, before the storage write
// resolves, so the next render() never shows the stale value.

const V3_DEBUG_LOGS_KEY = 'rhythiaxDebugLogs';

function setV3DebugLogging(enabled) {
  const value = enabled === true;
  state.debugLogs = value;
  chrome.storage.local.set({ [V3_DEBUG_LOGS_KEY]: value });
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (tab?.id) chrome.tabs.sendMessage(tab.id, { type: 'rhythiax-debug-logs', enabled: value }).catch(() => {});
  });
  setV3Status(`Debug logging ${value ? 'enabled' : 'disabled'}`);
}
