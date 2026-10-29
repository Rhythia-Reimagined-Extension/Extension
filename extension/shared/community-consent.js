// The online-history choice card, shown on Rhythia with either look until the player chooses.
// It is one card in the notification stack (shared/notices.js), which draws it in the look on screen.
// After a choice each look refreshes its own history views (CommunityConsentNotice.onChoice).
var RhythiaX = RhythiaX || {};

(function () {
  if (RhythiaX.CommunityConsentNotice || typeof document === 'undefined' || typeof window === 'undefined') return;
  if (!['https://rhythia.com', 'https://www.rhythia.com'].includes(window.location?.origin)) return;
  if (window.top && window.top !== window) return;
  if (typeof chrome === 'undefined' || !chrome?.runtime?.sendMessage || !chrome?.storage?.local) return;
  if (!RhythiaX.Notices) return;

  const ID = 'community-choice';
  let card = null, pending = false, busy = false;

  const listeners = [];
  function refreshHistory() {
    for (const fn of listeners) { try { fn(); } catch (_) {} }
  }

  function remove() {
    card?.close(); card = null;
  }

  async function choose(event, local) {
    if (!event.isTrusted || busy || !pending) return;
    busy = true;
    card.setBusy(true);
    card.setStatus('');
    try {
      const choice = local ? 'local-only' : 'hybrid-no-reports';
      const response = await chrome.runtime.sendMessage({ type: 'rhythiax-community-consent', choice });
      if (!response?.ok) throw new Error('Choice not saved. Try again.');
      pending = false;
      remove();
      refreshHistory();
    } catch (_) {
      card?.setStatus('Choice not saved. Try again.');
    } finally {
      busy = false;
      card?.setBusy(false);
    }
  }

  function mount() {
    if (!pending || card || !chrome.runtime?.id) return;
    card = RhythiaX.Notices.show({
      id: ID,
      label: 'Online history',
      title: 'Use online player history?',
      body: [
        "Loads shared player history from Shuriel's community service.",
        "Sends the public IDs of the players and maps you view, your Reimagined Search filters and an anonymous key for this installation to Shuriel's service (rhythia.shuriel.com). Your IP address is processed to deliver and protect the connection.",
        'Visit reports stay off unless you turn them on.',
      ],
      actions: [
        { text: 'Use online history', kind: 'primary', run: event => choose(event, false) },
        { text: 'Keep it local', run: event => choose(event, true) },
      ],
      link: { text: 'Privacy policy', href: 'https://shuriel.com/policies/reimagined/history/#privacy' },
    });
  }

  // The background answers once the stored data is checked and up to date, for either look. While it
  // cannot use that data (read-only), it would refuse every choice, so the card stays hidden.
  function dataReady() {
    return new Promise(resolve => chrome.runtime.sendMessage({ type: 'rhythiax-data-ready' }, reply => {
      resolve(!chrome.runtime.lastError && reply?.ok === true);
    }));
  }

  async function refresh() {
    try {
      if (!chrome.runtime?.id || !(await dataReady())) return;
      const result = await new Promise(resolve => chrome.storage.local.get('rhythiaxDataSettings', result => {
        resolve(chrome.runtime.lastError ? null : result);
      }));
      if (!result) return;
      const settings = result?.rhythiaxDataSettings || {};
      const wasPending = pending;
      // Without RhythiaX.Consent the choice counts as not made yet: the card shows, and nothing is sent.
      pending = RhythiaX.Consent?.given(settings) !== true;
      localOnly = !pending && settings.syncMode === 'local-only';
      if (!localOnly) { nudge?.close(); nudge = null; } else maybeNudge();
      if (pending) mount();
      else { remove(); if (wasPending) refreshHistory(); }
    } catch (_) { /* A failed read never enables community connections. */ }
  }

  // ─── Online history, offered again ───
  // A player who chose This device is told now and then what online history adds: a small card on the third
  // profile opened in a tab. After the first Not now it comes back in 14 days, then every 30 days, with a
  // Don't show again box; ticked, it stops, and so do the quiet lines under Classic's history (offerHidden).
  // It sends nothing; turning online history on is the same choice as the card above (Both, without visit reports).
  const NUDGE_KEY = 'rhythiaxOnlineNudge', NUDGE_ID = 'online-nudge', NUDGE_AFTER = 3;
  const NUDGE_REST = [14 * 864e5, 30 * 864e5];
  let localOnly = false, nudge = null, lastPath = '';
  // Counted for the tab (sessionStorage), so a full page load does not start it again.
  const COUNT_KEY = 'rhythiax_online_nudge_profiles';
  let profiles = (() => { try { return Number(sessionStorage.getItem(COUNT_KEY)) || 0; } catch (_) { return 0; } })();
  const nudgeState = () => new Promise(resolve => chrome.storage.local.get(NUDGE_KEY, r => resolve(chrome.runtime.lastError ? null : r?.[NUDGE_KEY] || {})));
  const offerHidden = async () => Boolean((await nudgeState())?.never);

  async function turnOn(event) {
    if (!event?.isTrusted || busy) return false;
    busy = true;
    try {
      const response = await chrome.runtime.sendMessage({ type: 'rhythiax-community-consent', choice: 'hybrid-no-reports' });
      if (!response?.ok) return false;
      nudge?.close(); nudge = null;
      refreshHistory();
      return true;
    } catch (_) {
      return false;
    } finally {
      busy = false;
    }
  }

  async function maybeNudge() {
    if (!localOnly || nudge || pending || profiles < NUDGE_AFTER) return;
    const state = await nudgeState();
    if (!state || state.never || Date.now() < (state.until || 0) || !localOnly || nudge) return;
    const again = (state.later || 0) > 0;
    nudge = RhythiaX.Notices.show({
      id: NUDGE_ID,
      label: 'Online history',
      title: 'See more of each player',
      body: ['History now comes from this browser only. With online history, profiles show the daily rank and RP history of the top 5,000 players, Near your rank, and 7 and 30 day changes on the leaderboard.', "It sends the public IDs of the players and maps you view, your Reimagined Search filters and an anonymous key to Shuriel's service (rhythia.shuriel.com)."],
      actions: [
        { text: 'Turn on', kind: 'primary', run: async event => { nudge?.setBusy(true); if (!(await turnOn(event))) { nudge?.setBusy(false); nudge?.setStatus('Not turned on. Try again.'); } } },
        { text: 'Not now', run: event => { if (!event.isTrusted) return; const later = (state.later || 0) + 1;
          chrome.storage.local.set({ [NUDGE_KEY]: { later, until: Date.now() + NUDGE_REST[again ? 1 : 0], never: nudge?.checked() === true } }); nudge?.close(); nudge = null; } },
      ],
      check: again ? { text: 'Don’t show again' } : null,
      link: { text: 'Privacy policy', href: 'https://shuriel.com/policies/reimagined/history/#privacy' },
    });
  }

  // Profiles opened in this tab, counted as the address changes (either look keeps Rhythia's address): on each
  // page load, and where the browser tells a content script of a new address (as core/shell.js listens).
  function watchProfiles() {
    const path = String(window.location?.pathname || '').replace(/\/scores\/?$/, '');
    if (path === lastPath) return;
    lastPath = path;
    if (/^\/player\/\d+\/?$/.test(path)) { profiles++; try { sessionStorage.setItem(COUNT_KEY, String(profiles)); } catch (_) {} maybeNudge(); }
  }
  window.navigation?.addEventListener?.('currententrychange', watchProfiles);
  window.addEventListener?.('popstate', watchProfiles);
  watchProfiles();

  RhythiaX.CommunityConsentNotice = { onChoice: fn => { listeners.push(fn); }, turnOn, offerHidden };
  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.rhythiaxDataSettings) refresh();
  });
  if (document.body) refresh();
  else document.addEventListener('DOMContentLoaded', refresh, { once: true });
})();
