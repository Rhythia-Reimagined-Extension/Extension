// Rhythia X - MV3 background coordinator for local stable backups

importScripts(
  'shared/time.js',
  'shared/data/data-schema.js',
  'shared/data/data-migrations.js',
  'core/data/transfer/serialization.js',
  'core/data/transfer/validation.js',
  'core/data/transfer/conflict-policy.js',
  'core/data/transfer/restoration.js',
  'core/data/transfer/api.js',
  'shared/data/data-transfer.js',
  'core/data/backup/policy.js',
  'core/data/backup/payload.js',
  'core/data/backup/handle-store.js',
  'core/data/backup/file-writer.js',
  'core/data/backup/service.js',
  'core/data/backup/api.js',
  'shared/data/data-backup.js',
  'core/data/storage-mutation-authority.js',
);

const RHYTHIAX_DATA_PREFIX = 'rhythiaxData:entry:';
const RHYTHIAX_SETTINGS_KEY = 'rhythiaxDataSettings';
const RHYTHIAX_OFFSCREEN_URL = 'offscreen.html';
const RHYTHIAX_COMPARE_SESSION_KEY = 'rhythiaxComparePlayersSession';
const RHYTHIAX_BACKUP_ALARM = 'rhythiax-local-backup-check';
const RHYTHIAX_BACKUP_CHECK_MINUTES = 60;

let backupTimer = null;
let backupRunning = false;
const storageMutationAuthority = RhythiaX.createStorageMutationAuthority({
  local: chrome.storage.local,
  isReadOnly: () => RhythiaX.dataStorageReadOnly === true,
});
RhythiaX.backupStatePatch = patch => storageMutationAuthority.backupStatePatch(patch);

function backgroundStorageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, result => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(result || {});
    });
  });
}

async function backgroundStableRecords() {
  const all = await backgroundStorageGet(null);
  return Object.entries(all)
    .filter(([key, value]) => key.startsWith(RHYTHIAX_DATA_PREFIX) && value && typeof value === 'object')
    .map(([key, value]) => RhythiaX.normalizeDataRecord(value, key.slice(RHYTHIAX_DATA_PREFIX.length)))
    .filter(record => record?.profileId);
}

async function backgroundSettings() {
  const result = await backgroundStorageGet({ [RHYTHIAX_SETTINGS_KEY]: RhythiaX.DATA_DEFAULT_SETTINGS });
  return RhythiaX.normalizeDataSettings(result[RHYTHIAX_SETTINGS_KEY]);
}

async function hasBackupOffscreenDocument() {
  if (typeof chrome.runtime.getContexts === 'function') {
    const contexts = await chrome.runtime.getContexts({
      contextTypes: ['OFFSCREEN_DOCUMENT'],
      documentUrls: [chrome.runtime.getURL(RHYTHIAX_OFFSCREEN_URL)],
    });
    return contexts.length > 0;
  }
  if (typeof chrome.offscreen?.hasDocument === 'function') return chrome.offscreen.hasDocument();
  return false;
}

async function ensureBackupOffscreenDocument() {
  if (await hasBackupOffscreenDocument()) return;
  if (typeof chrome.offscreen?.createDocument !== 'function') {
    const error = new Error('This browser cannot create the document required for automatic local backups.');
    error.code = 'unsupported';
    throw error;
  }
  await chrome.offscreen.createDocument({
    url: RHYTHIAX_OFFSCREEN_URL,
    reasons: ['BLOBS'],
    justification: 'Write the user-approved local stable data backup file.',
  });
}

async function closeBackupOffscreenDocument() {
  if (typeof chrome.offscreen?.closeDocument !== 'function') return;
  try { await chrome.offscreen.closeDocument(); } catch (error) { /* already closed */ }
}

async function runBackupInOffscreen() {
  if (backupRunning) return;
  backupRunning = true;
  try {
    await RhythiaX.runDataMigrations?.();
    if (RhythiaX.getDataStorageHealth?.().readOnly) return;
    const settings = await backgroundSettings();
    if (!settings.localBackupEnabled || settings.localBackupSchedule === 'manual') return;
    const state = await RhythiaX.getLocalBackupStatus();
    if (!state.hasHandle) return;
    const now = Date.now();
    const intervalDays = Number(settings.localBackupSchedule) || 1;
    const due = !state.lastSuccessAt || now - Number(state.lastSuccessAt) >= intervalDays * 24 * 60 * 60 * 1000;
    if (!due) return;
    const payload = RhythiaX.createStableDataBackup(await backgroundStableRecords(), settings, now);
    const fingerprint = RhythiaX.getStableDataBackupFingerprint(payload);
    if (state.lastFingerprint === fingerprint && state.automaticFiles?.length) {
      await RhythiaX.saveLocalBackupState({ status: 'up-to-date', lastAttemptAt: now, lastSuccessAt: now, lastError: '' });
      return;
    }
    await ensureBackupOffscreenDocument();
    const response = await chrome.runtime.sendMessage({ type: 'rhythiax-write-local-backup', payload });
    if (!response?.ok) {
      await RhythiaX.saveLocalBackupState({
        status: response?.reason === 'permission-required' ? 'permission-required' : 'error',
        lastAttemptAt: now,
        lastError: response?.error || 'The local backup could not be updated.',
      });
      return;
    }
    await RhythiaX.saveLocalBackupState({
      status: 'up-to-date',
      folderName: response.folderName || state.folderName,
      fileName: response.fileName || '',
      lastAttemptAt: now,
      lastSuccessAt: now,
      lastFingerprint: fingerprint,
      lastError: '',
      recordCount: payload.records.length,
      dailyCount: payload.records.reduce((sum, record) => sum + Object.keys(record.history.daily || {}).length, 0),
      titleCount: payload.records.filter(record => record.titleProgression?.last).length,
      bytes: response.bytes || 0,
    });
  } catch (error) {
    try {
      await RhythiaX.saveLocalBackupState({
        status: error?.code === 'unsupported' ? 'unsupported' : 'error',
        lastAttemptAt: Date.now(),
        lastError: String(error?.message || error).slice(0, 180),
      });
    } catch (stateError) { /* best effort */ }
  } finally {
    await closeBackupOffscreenDocument();
    backupRunning = false;
  }
}

function scheduleBackup() {
  clearTimeout(backupTimer);
  backupTimer = setTimeout(() => runBackupInOffscreen(), 1200);
}

function ensureBackupAlarm() {
  if (!chrome.alarms) return;
  chrome.alarms.create(RHYTHIAX_BACKUP_ALARM, {
    delayInMinutes: RHYTHIAX_BACKUP_CHECK_MINUTES,
    periodInMinutes: RHYTHIAX_BACKUP_CHECK_MINUTES,
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local') return;
  const relevant = Object.keys(changes).some(key => key === RHYTHIAX_SETTINGS_KEY || key.startsWith(RHYTHIAX_DATA_PREFIX));
  if (relevant) scheduleBackup();
});

chrome.runtime.onStartup.addListener(() => {
  Promise.resolve(RhythiaX.runDataMigrations?.()).then(() => {
    if (!RhythiaX.getDataStorageHealth?.().readOnly) {
      ensureBackupAlarm();
      scheduleBackup();
    }
  }).catch(() => {});
});

Promise.resolve(RhythiaX.runDataMigrations?.()).then(() => {
  if (!RhythiaX.getDataStorageHealth?.().readOnly) {
    ensureBackupAlarm();
    scheduleBackup();
  }
}).catch(() => {});

chrome.alarms?.onAlarm.addListener(alarm => {
  if (alarm.name === RHYTHIAX_BACKUP_ALARM) runBackupInOffscreen();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
    chrome.storage.session.get({ [RHYTHIAX_COMPARE_SESSION_KEY]: [] }, result => {
      const list = Array.isArray(result?.[RHYTHIAX_COMPARE_SESSION_KEY])
        ? result[RHYTHIAX_COMPARE_SESSION_KEY]
        : [];
      sendResponse({ ok: true, list });
    });
    return true;
  }
  if (message?.type === 'rhythiax-compare-list-set') {
    const list = (Array.isArray(message.list) ? message.list : [])
      .map(item => ({ id: String(item?.id || '').trim(), username: String(item?.username || 'Unknown player').trim() }))
      .filter(item => item.id)
      .slice(-4);
    chrome.storage.session.set({ [RHYTHIAX_COMPARE_SESSION_KEY]: list }, () => sendResponse({ ok: !chrome.runtime.lastError }));
    return true;
  }
  if (message?.type === 'rhythiax-open-backup-settings') {
    chrome.storage.local.set({ [RhythiaX.DATA_BACKUP_OPEN_SETTINGS_KEY]: true }).then(async () => {
      if (typeof chrome.action?.openPopup === 'function') {
        try { await chrome.action.openPopup(); } catch (error) { /* user can open the action manually */ }
      }
      sendResponse({ ok: true });
    }).catch(() => sendResponse({ ok: false }));
    return true;
  }
  if (message?.type !== 'rhythiax-backup-now') return false;
  scheduleBackup();
  sendResponse({ ok: true });
  return false;
});

