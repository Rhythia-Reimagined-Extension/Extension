// =============================================
// Rhythia X — Application state
// =============================================

var RhythiaX = RhythiaX || {};

// ─── State ───────────────────────────────────
RhythiaX.activeGrades = null; // null = show all, Set = filtered to specific grade(s)
RhythiaX.activeSpeed = null; // null = show all, string = filtered to this speed key (e.g. '1.45')
RhythiaX.injected = false;
RhythiaX.extensionContextInvalidated = false;
RhythiaX.navigationToken = 0;
RhythiaX.apiAbortController = null;

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'rhythiax-debug-logs') RhythiaX.setDebugLogging?.(message.enabled);
  if (message?.type === 'rhythiax-developer-mode') RhythiaX.setDeveloperMode?.(message.enabled);
});
