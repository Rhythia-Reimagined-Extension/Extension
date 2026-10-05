if (typeof importScripts === 'function') importScripts(
  'shared/time.js',
  'shared/data/data-schema.js',
  'shared/data/data-migrations.js',
  'shared/data/data-repository.js',
  'core/bridges/storage-mutation-bridge.js',
  'core/data/storage-mutation-authority.js',
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

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
