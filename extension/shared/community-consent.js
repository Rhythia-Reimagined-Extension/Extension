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
        "Each request to rhythia.shuriel.com sends the viewed player's public ID and an anonymous key for this installation. The service and Cloudflare process your IP address to deliver and protect the connection.",
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
      if (pending) mount();
      else { remove(); if (wasPending) refreshHistory(); }
    } catch (_) { /* A failed read never enables community connections. */ }
  }

  RhythiaX.CommunityConsentNotice = { onChoice: fn => { listeners.push(fn); } };
  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.rhythiaxDataSettings) refresh();
  });
  if (document.body) refresh();
  else document.addEventListener('DOMContentLoaded', refresh, { once: true });
})();
