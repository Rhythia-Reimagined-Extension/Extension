// =============================================
// Reimagined for Rhythia — Rhythia's sign-in session
// =============================================
// Who is signed in to Rhythia, read the same way by Exodus and Classic: the plain session key
// (rhythia_auth_session_v1), then the access token in Rhythia's own sign-in key
// (sb-<project>-auth-token). No other value stored on the site is ever sent as the session.
// token() returns '' when there is no session or no localStorage. Callers fail closed when this file
// is missing: RhythiaX.RhythiaSession?.token?.() || ''. No DOM and no chrome.* here.

var RhythiaX = RhythiaX || {};

// Both looks can share a tab (Classic added to a page Exodus does not take): defined only once.
RhythiaX.RhythiaSession = RhythiaX.RhythiaSession || (function () {
  'use strict';

  const SESSION_KEY = 'rhythia_auth_session_v1';
  const SIGN_IN_KEY = /^sb-.+-auth-token$/;

  function token() {
    if (typeof localStorage === 'undefined') return '';
    // 1. The plain session key
    try {
      const plain = localStorage.getItem(SESSION_KEY);
      if (plain && plain.trim()) return plain.trim();
    } catch (_) {}

    // 2. Rhythia's sign-in keys: { access_token }, { session: { access_token } } or [{ access_token }]
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key || !SIGN_IN_KEY.test(key)) continue;
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        const parsed = JSON.parse(raw);
        const access = parsed?.access_token || parsed?.session?.access_token || (Array.isArray(parsed) && parsed[0]?.access_token);
        if (typeof access === 'string' && access.length > 10) return access;
      }
    } catch (_) {}
    return '';
  }

  return { token };
})();
