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
      if (!response?.ok) throw new Error('Your choice could not be saved. Please try again.');
      pending = false;
      remove();
      refreshHistory();
    } catch (_) {
      card?.setStatus('Your choice could not be saved. Please try again.');
    } finally {
      busy = false;
      card?.setBusy(false);
    }
  }

  function mount() {
    if (!pending || card || RhythiaX.extensionContextInvalidated) return;
    card = RhythiaX.Notices.show({
      id: ID,
      label: 'Online history',
      title: 'Use online player history?',
      body: [
        "Load shared player history from Shuriel's community service.",
        "Requests include the viewed player's public ID. The service and Cloudflare process your IP address to deliver and protect the connection.",
        'Visit reports are optional and stay off.',
      ],
      actions: [
        { text: 'Use online history', kind: 'primary', run: event => choose(event, false) },
        { text: 'Keep it local', run: event => choose(event, true) },
      ],
      link: { text: 'Privacy policy', href: 'https://shuriel.com/policies/reimagined/history/#privacy' },
    });
  }

  async function refresh() {
    try {
      await RhythiaX.dataRepositoryReady;
      if (RhythiaX.dataStorageReadOnly || RhythiaX.extensionContextInvalidated) return;
      const result = await new Promise(resolve => chrome.storage.local.get('rhythiaxDataSettings', result => {
        resolve(chrome.runtime.lastError ? null : result);
      }));
      if (!result) return;
      const settings = result?.rhythiaxDataSettings || {};
      const wasPending = pending;
      pending = settings.communityConsentVersion !== 1;
      if (pending) mount();
      else { remove(); if (wasPending) refreshHistory(); }
    } catch (_) { /* A failed read never enables community connections. */ }
  }

  RhythiaX.CommunityConsentNotice = { refresh, onChoice: fn => { listeners.push(fn); } };
  chrome.storage.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.rhythiaxDataSettings) refresh();
  });
  if (document.body) refresh();
  else document.addEventListener('DOMContentLoaded', refresh, { once: true });
})();
