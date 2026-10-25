if (typeof importScripts === 'function') importScripts(
  'shared/consent.js',
  'shared/data/data-schema.js',
  'shared/data/data-migrations.js',
  'shared/data/data-repository.js',
  'background/storage-mutation-authority.js',
  'engines.js',
  'background/vps-access.js',
);

const RHYTHIAX_COMPARE_SESSION_KEY = 'rhythiaxComparePlayersSession';
const storageMutationAuthority = RhythiaX.createStorageMutationAuthority({
  local: chrome.storage.local,
  isReadOnly: () => RhythiaX.dataStorageReadOnly === true,
});

function isInternalPage(sender, page) {
  return sender?.id === chrome.runtime.id && sender?.url === chrome.runtime.getURL(page);
}

function isRhythiaContentScript(sender) {
  if (sender?.id !== chrome.runtime.id || sender?.frameId !== 0 || !Number.isInteger(sender?.tab?.id)) return false;
  try {
    const origin = new URL(sender.url).origin;
    return ['https://rhythia.com', 'https://www.rhythia.com'].includes(origin)
      && (!sender.origin || sender.origin === origin);
  } catch (_) { return false; }
}

// Keys no part of the extension reads any more, removed on every install or update: the 1.2.x master switch
// (rhythiaxMasterActive) and the pinned scores kept before 1.2.0 (rhythiax_pinned_scores, in local and sync
// storage; pins belong to Rhythia since then). Classic removes the copy in Rhythia's localStorage itself, which
// the background cannot reach.
const RETIRED_KEYS = { local: ['rhythiaxMasterActive', 'rhythiax_pinned_scores'], sync: ['rhythiax_pinned_scores'] };
function removeRetiredKeys() {
  for (const [area, keys] of Object.entries(RETIRED_KEYS)) {
    try { Promise.resolve(chrome.storage[area]?.remove(keys)).catch(() => {}); } catch (_) {}
  }
}

// History and saved copies past their limits go even when no tab uses them, at most once a day
// (background/storage-mutation-authority.js sweepRetention); it waits for the data check and skips read-only data.
function sweepRetention() {
  Promise.resolve(storageMutationAuthority.sweepRetention()).catch(error => {
    console.warn('RhythiaX: retention sweep failed:', error);
  });
}

chrome.runtime.onInstalled?.addListener(() => {
  Promise.resolve(RhythiaX.runDataMigrations?.()).catch(err => {
    console.warn('RhythiaX: Migration onInstalled failed:', err);
  });
  removeRetiredKeys();
  sweepRetention();
});

chrome.runtime.onStartup?.addListener(() => {
  Promise.resolve(RhythiaX.runDataMigrations?.()).catch(() => {});
  sweepRetention();
});

Promise.resolve(RhythiaX.runDataMigrations?.()).catch(() => {});
sweepRetention();

RhythiaX.Engines.start();

// Release notes: the changelog.md packaged with this version, and the online copy. Loaded from a folder
// (a development install) the local file is all there is, so drafts can be previewed before publishing.
// The online copy comes from the history server (tools/publish-changelog.js), only once the player has allowed
// connections to it: Local Only, or no choice yet, means no request to rhythia.shuriel.com, so the packaged copy.
// A view waits at most RELEASES_WAIT_MS for the online copy, then gets the packaged notes alone; a copy that
// comes later is kept for the next open. After a failed or late answer the online copy is not asked for again
// for RELEASES_RETRY_MS, so an outage does not hold every open, and a request still on its way is given up
// after RELEASES_GIVE_UP_MS.
const RELEASES_ONLINE = 'https://rhythia.shuriel.com/api/changelog';
const RELEASES_KEEP_MS = 5 * 60 * 1000;
const RELEASES_WAIT_MS = 2500;
const RELEASES_RETRY_MS = 60 * 1000;
const RELEASES_GIVE_UP_MS = 20 * 1000;
let releasesOnline = null;
let releasesAsking = null;
function askReleasesOnline() {
  if (releasesAsking) return releasesAsking;
  const stop = new AbortController();
  const timer = setTimeout(() => stop.abort(), RELEASES_GIVE_UP_MS);
  // The server sends max-age and an ETag, so the browser's own cache keeps repeat opens off the network.
  releasesAsking = fetch(RELEASES_ONLINE, { signal: stop.signal })
    .then(r => (r.ok ? r.text() : null)).catch(() => null)
    .then(text => {
      clearTimeout(timer);
      releasesAsking = null;
      releasesOnline = { text, until: Date.now() + (text ? RELEASES_KEEP_MS : RELEASES_RETRY_MS) };
      return text;
    });
  return releasesAsking;
}
async function releaseNotes() {
  const local = await fetch(chrome.runtime.getURL('changelog.md')).then(r => r.text());
  let dev = false;
  try { dev = (await chrome.management.getSelf()).installType === 'development'; } catch (_) {}
  if (dev) return { dev, local, online: null };
  const { rhythiaxDataSettings: ds } = await chrome.storage.local.get('rhythiaxDataSettings');
  if (RhythiaX.Consent?.historyAllowed(ds) !== true) return { dev, local, online: null };
  if (!releasesOnline || Date.now() >= releasesOnline.until) {
    const late = {};
    let wait;
    const text = await Promise.race([askReleasesOnline(), new Promise(resolve => { wait = setTimeout(resolve, RELEASES_WAIT_MS, late); })]);
    clearTimeout(wait);
    if (text === late) releasesOnline = { text: null, until: Date.now() + RELEASES_RETRY_MS };
  }
  return { dev, local, online: releasesOnline.text };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // This extension's release notes for both changelogs (shared/releases.js).
  if (message?.type === 'rhythiax-releases') {
    if (sender?.id !== chrome.runtime.id) return false;
    releaseNotes().then(sendResponse, error => sendResponse({ local: '', error: String(error?.message || error) }));
    return true;
  }
  // Player history from the history server, sent from here with this installation's key
  // (background/vps-access.js), so the key never reaches the page.
  if (message?.type === 'rhythiax-vps-history') {
    if (!isRhythiaContentScript(sender)) return false;
    RhythiaX.VpsAccess.historyFetch(message)
      .then(sendResponse, error => sendResponse({ error: String(error?.message || error) }));
    return true;
  }
  // Exodus does not take this page: Legacy runs in the tab instead (engines.js).
  if (message?.type === 'rhythiax-page-free') {
    if (!isRhythiaContentScript(sender)) return false;
    RhythiaX.Engines.inject(sender.tab.id, 'legacy')
      .then(added => sendResponse({ ok: true, added }))
      .catch(error => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }
  // Classic's theme editor shows a theme on the dark or white stylesheet this tab may not have yet.
  if (message?.type === 'rhythiax-theme-css') {
    if (!isRhythiaContentScript(sender)) return false;
    RhythiaX.Engines.addThemeToTab(sender.tab.id, message.theme === 'white' ? 'white' : 'dark')
      .then(added => sendResponse({ ok: true, added }), () => sendResponse({ ok: false }));
    return true;
  }
  if (message?.type === 'rhythiax-community-consent') {
    if (!isInternalPage(sender, 'popup/popup.html') && !isRhythiaContentScript(sender)) {
      sendResponse({ ok: false, error: 'Community choices require the extension popup or its Rhythia notification.' });
      return false;
    }
    storageMutationAuthority.communityConsent(message.choice)
      .then(value => sendResponse({ ok: true, value }))
      .catch(error => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }
  if (message?.type === 'rhythiax-data-ready') {
    if (sender?.id !== chrome.runtime.id) {
      sendResponse({ ok: false, error: 'Data readiness requests must originate from this extension.' });
      return false;
    }
    // Read-only storage still lets the popup open: it locks only the history settings, and offers Repair
    // when the cause is damaged history (repairable).
    const readOnlyAnswer = error => {
      const health = RhythiaX.getDataStorageHealth?.();
      return health?.readOnly
        ? { ok: false, readOnly: true, repairable: health.repairable === true, error: health.error || error || 'Local data validation failed.' }
        : null;
    };
    Promise.resolve(RhythiaX.runDataMigrations?.())
      .then(() => sendResponse(readOnlyAnswer() || { ok: true }))
      .catch(error => sendResponse(readOnlyAnswer(String(error?.message || error)) || { ok: false, error: String(error?.message || error) }));
    return true;
  }
  // The popup's Repair: damaged history entries are set aside and the rest is used again (shared/data/data-migrations.js).
  if (message?.type === 'rhythiax-data-repair') {
    if (!isInternalPage(sender, 'popup/popup.html')) {
      sendResponse({ ok: false, error: 'Data repair requests must come from the extension popup.' });
      return false;
    }
    Promise.resolve()
      .then(() => RhythiaX.repairDataStorage())
      .then(result => sendResponse({ ok: true, quarantined: result?.quarantined || 0 }))
      .catch(error => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }
  if (message?.type === 'rhythiax-storage-mutation') {
    if (sender?.id !== chrome.runtime.id) {
      sendResponse({ ok: false, error: 'Storage mutation requests must originate from this extension.' });
      return false;
    }
    // Classic's history records are saved only by Classic in a Rhythia tab; the popup never writes them.
    if (message.operation === 'data-records-commit' && !isRhythiaContentScript(sender)) {
      sendResponse({ ok: false, error: 'History records can be saved only from a Rhythia tab.' });
      return false;
    }
    storageMutationAuthority.dispatch(message)
      .then(value => sendResponse({ ok: true, value }))
      .catch(error => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }
  if (message?.type === 'rhythiax-compare-list-get') {
    const sessionStore = chrome.storage?.session || (typeof browser !== 'undefined' ? browser.storage?.session : null);
    if (!sessionStore) {
      sendResponse({ ok: true, list: [] });
      return true;
    }
    sessionStore.get({ [RHYTHIAX_COMPARE_SESSION_KEY]: [] }, result => {
      const list = Array.isArray(result?.[RHYTHIAX_COMPARE_SESSION_KEY])
        ? result[RHYTHIAX_COMPARE_SESSION_KEY]
        : [];
      sendResponse({ ok: true, list });
    });
    return true;
  }
  if (message?.type === 'rhythiax-compare-list-set') {
    const sessionStore = chrome.storage?.session || (typeof browser !== 'undefined' ? browser.storage?.session : null);
    if (!sessionStore) {
      sendResponse({ ok: false, error: 'Session storage unavailable' });
      return true;
    }
    const list = (Array.isArray(message.list) ? message.list : [])
      .map(item => ({ id: String(item?.id || '').trim(), username: String(item?.username || 'Unknown player').trim() }))
      .filter(item => item.id)
      .slice(-4);
    sessionStore.set({ [RHYTHIAX_COMPARE_SESSION_KEY]: list }, () => {
      const err = chrome?.runtime?.lastError || (typeof browser !== 'undefined' ? browser.runtime?.lastError : null);
      sendResponse({ ok: !err });
    });
    return true;
  }
  return false;
});
