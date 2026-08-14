// =============================================
// Rhythia X - Canonical local data repository
// =============================================

var RhythiaX = RhythiaX || {};

function dataStorageGet(keys) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(keys, result => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve(result || {});
    });
  });
}

function dataStorageSet(values) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(values, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

function dataStorageRemove(keys) {
  if (!keys.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(keys, () => {
      const error = chrome.runtime.lastError;
      if (error) reject(new Error(error.message));
      else resolve();
    });
  });
}

// Storage is deliberately never reset on install or update. A migration may
// write a new schema, but it must leave the old namespace available until the
// new snapshot has passed validation.
RhythiaX.dataRepositoryReady = typeof RhythiaX.runDataMigrations === 'function'
  ? RhythiaX.runDataMigrations()
  : Promise.resolve();
RhythiaX.dataCanonicalWrite = function (task) {
  const queue = RhythiaX.dataCanonicalWriteQueue || RhythiaX.dataRepositoryReady;
  const next = queue.then(task, task);
  RhythiaX.dataCanonicalWriteQueue = next.catch(() => {});
  return next;
};

function dataEntryKey(profileId) {
  return `${RhythiaX.DATA_STORAGE_ENTRY_PREFIX}${String(profileId || '').trim()}`;
}

RhythiaX.getDataSettings = async function () {
  await RhythiaX.dataRepositoryReady;
  const result = await dataStorageGet({ [RhythiaX.DATA_SETTINGS_KEY]: RhythiaX.DATA_DEFAULT_SETTINGS });
  return RhythiaX.normalizeDataSettings(result[RhythiaX.DATA_SETTINGS_KEY]);
};

RhythiaX.saveDataSettings = async function (settings, options = {}) {
  await RhythiaX.dataRepositoryReady;
  if (RhythiaX.dataStorageReadOnly && options.allowRepair !== true) throw new Error('Local data is read-only until a verified backup restore repairs the storage.');
  const normalized = RhythiaX.normalizeDataSettings(settings);
  await dataStorageSet({ [RhythiaX.DATA_SETTINGS_KEY]: normalized });
  return normalized;
};

RhythiaX.getDataRecord = async function (profileId) {
  await RhythiaX.dataRepositoryReady;
  const id = String(profileId || '').trim();
  if (!id) return null;
  const result = await dataStorageGet(dataEntryKey(id));
  const record = result[dataEntryKey(id)];
  return record ? RhythiaX.normalizeDataRecord(record, id) : null;
};

RhythiaX.saveDataRecord = async function (record, options = {}) {
  await RhythiaX.dataRepositoryReady;
  if (RhythiaX.dataStorageReadOnly && options.allowRepair !== true) throw new Error('Local data is read-only until a verified backup restore repairs the storage.');
  const normalized = RhythiaX.normalizeDataRecord(record, record?.profileId);
  if (!normalized.profileId) throw new Error('Cannot save data without profileId.');
  normalized.updatedAt = Date.now();
  await dataStorageSet({ [dataEntryKey(normalized.profileId)]: normalized });
  return normalized;
};

RhythiaX.removeDataRecord = async function (profileId, options = {}) {
  await RhythiaX.dataRepositoryReady;
  if (RhythiaX.dataStorageReadOnly && options.allowRepair !== true) throw new Error('Local data is read-only until a verified backup restore repairs the storage.');
  const id = String(profileId || '').trim();
  if (!id) return;
  await dataStorageRemove([dataEntryKey(id)]);
};

RhythiaX.listDataRecords = async function () {
  await RhythiaX.dataRepositoryReady;
  const all = await dataStorageGet(null);
  return Object.entries(all)
    .filter(([key, value]) => key.startsWith(RhythiaX.DATA_STORAGE_ENTRY_PREFIX) && value && typeof value === 'object')
    .map(([key, value]) => RhythiaX.normalizeDataRecord(value, key.slice(RhythiaX.DATA_STORAGE_ENTRY_PREFIX.length)))
    .filter(record => record.profileId);
};

RhythiaX.clearDataRecords = async function (options = {}) {
  await RhythiaX.dataRepositoryReady;
  if (RhythiaX.dataStorageReadOnly && options.allowRepair !== true) throw new Error('Local data is read-only until a verified backup restore repairs the storage.');
  const all = await dataStorageGet(null);
  const keys = Object.keys(all).filter(key => key.startsWith(RhythiaX.DATA_STORAGE_ENTRY_PREFIX));
  await dataStorageRemove(keys);
};
