if (typeof importScripts === 'function') importScripts(
  'shared/time.js',
  'shared/data/data-schema.js',
  'shared/data/data-migrations.js',
  'shared/data/data-repository.js',
  'shared/data/storage-mutation-bridge.js',
  'shared/data/storage-mutation-authority.js',
  'engines.js',
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

chrome.runtime.onInstalled?.addListener(() => {
  Promise.resolve(RhythiaX.runDataMigrations?.()).catch(err => {
    console.warn('RhythiaX: Migration onInstalled failed:', err);
  });
});

chrome.runtime.onStartup?.addListener(() => {
  Promise.resolve(RhythiaX.runDataMigrations?.()).catch(() => {});
});

Promise.resolve(RhythiaX.runDataMigrations?.()).catch(() => {});

RhythiaX.Engines.start();

// Release notes: the changelog.md packaged with this version, and the online copy. Loaded from a folder
// (a development install) the local file is all there is, so drafts can be previewed before publishing.
// The online copy comes from the history server (tools/publish-changelog.js), only once the player has allowed
// connections to it: Local Only, or no choice yet, means no request to rhythia.shuriel.com, so the packaged copy.
const RELEASES_ONLINE = 'https://rhythia.shuriel.com/api/changelog';
const RELEASES_KEEP_MS = 5 * 60 * 1000;
let releasesOnline = null;
async function releaseNotes() {
  const local = await fetch(chrome.runtime.getURL('changelog.md')).then(r => r.text());
  let dev = false;
  try { dev = (await chrome.management.getSelf()).installType === 'development'; } catch (_) {}
  if (dev) return { dev, local, online: null };
  const { rhythiaxDataSettings: ds } = await chrome.storage.local.get('rhythiaxDataSettings');
  if (ds?.communityConsentVersion !== 1 || !['cloud-only', 'hybrid'].includes(ds?.syncMode)) return { dev, local, online: null };
  if (!releasesOnline || Date.now() - releasesOnline.at > RELEASES_KEEP_MS) {
    // The server sends max-age and an ETag, so the browser's own cache keeps repeat opens off the network.
    const text = await fetch(RELEASES_ONLINE)
      .then(r => (r.ok ? r.text() : null)).catch(() => null);
    releasesOnline = { at: text ? Date.now() : 0, text };
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
  // Exodus does not take this page: Legacy runs in the tab instead (engines.js).
  if (message?.type === 'rhythiax-page-free') {
    if (!isRhythiaContentScript(sender)) return false;
    RhythiaX.Engines.inject(sender.tab.id, 'legacy')
      .then(added => sendResponse({ ok: true, added }))
      .catch(error => sendResponse({ ok: false, error: String(error?.message || error) }));
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
    Promise.resolve(RhythiaX.runDataMigrations?.())
      .then(() => {
        const health = RhythiaX.getDataStorageHealth?.();
        sendResponse(health?.readOnly
          ? { ok: false, error: health.error || 'Local data validation failed.' }
          : { ok: true });
      })
      .catch(error => sendResponse({ ok: false, error: String(error?.message || error) }));
    return true;
  }
  if (message?.type === 'rhythiax-storage-mutation') {
    if (sender?.id !== chrome.runtime.id) {
      sendResponse({ ok: false, error: 'Storage mutation requests must originate from this extension.' });
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
