// =============================================
// Reimagined for Rhythia — online history consent
// =============================================
// The one rule for what the player allowed, asked by Exodus, Classic, the popup and the background.
// ds is the stored rhythiaxDataSettings object (or nothing). A choice counts only when it was made on
// this VERSION of the community notice (communityConsentVersion). Then Cloud + Local (hybrid) and Cloud
// Only allow requests to the history server (rhythia.shuriel.com), and profile visit reports also need
// the player's own switch for them (telemetryEnabled). Callers fail closed when this file is missing:
// RhythiaX.Consent?.historyAllowed(ds) === true. The background asks again before every history
// request, so a tab cannot reach the history server on a decision of its own.
// shared/data/data-schema.js keeps RhythiaX.COMMUNITY_CONSENT_VERSION for the stored settings; it must
// equal VERSION. No DOM and no chrome.* here: this runs in the background, the popup, either look and tests.

var RhythiaX = RhythiaX || {};

// Both looks can share a tab (Classic added to a page Exodus does not take): defined only once.
RhythiaX.Consent = RhythiaX.Consent || (function () {
  'use strict';

  const VERSION = 1;
  const ONLINE = ['cloud-only', 'hybrid'];

  // The player answered the current community notice.
  const given = ds => ds?.communityConsentVersion === VERSION;
  // Online history (Cloud + Local or Cloud Only) was chosen on that notice.
  const historyAllowed = ds => given(ds) && ONLINE.includes(ds?.syncMode);
  // Online history, and profile visit reports turned on.
  const reportsAllowed = ds => historyAllowed(ds) && ds?.telemetryEnabled === true;

  return { VERSION, given, historyAllowed, reportsAllowed };
})();
