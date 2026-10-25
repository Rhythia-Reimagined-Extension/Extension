var RhythiaX = RhythiaX || {};

RhythiaX.DATA_STORAGE_META_KEY = 'rhythiaxDataStorageMeta';
RhythiaX.DATA_MIGRATION_STATE_KEY = 'rhythiaxDataMigrationState';
RhythiaX.DATA_MIGRATION_LOCK_KEY = 'rhythiaxDataMigrationLock';
RhythiaX.DATA_QUARANTINE_PREFIX = 'rhythiaxDataQuarantine:';

const LEGACY_BACKUP_STORAGE_KEYS = [
  'rhythiaxDataBackupState',
  'rhythiaxDataBackupPrompt',
  'rhythiaxDataBackupOpenSettings',
];

const DATA_MIGRATION_LEASE_MS = 30000;
const DATA_MIGRATION_WAIT_MS = 60;

// isExtensionValid() comes from data-schema.js, loaded before this file.
function migrationStorageGet(keys) {
  return new Promise((resolve, reject) => {
    if (!isExtensionValid()) return resolve({});
    try {
      chrome.storage.local.get(keys, result => {
        const error = chrome.runtime?.lastError;
        if (error) {
          if (/Extension context invalidated/i.test(error.message)) return resolve({});
          reject(new Error(error.message));
        } else {
          resolve(result || {});
        }
      });
    } catch (err) {
      if (/Extension context invalidated/i.test(err?.message)) return resolve({});
      reject(err);
    }
  });
}

function migrationStorageSet(values) {
  return new Promise((resolve, reject) => {
    if (!isExtensionValid()) return resolve();
    try {
      chrome.storage.local.set(values, () => {
        const error = chrome.runtime?.lastError;
        if (error) {
          if (/Extension context invalidated/i.test(error.message)) return resolve();
          reject(new Error(error.message));
        } else {
          resolve();
        }
      });
    } catch (err) {
      if (/Extension context invalidated/i.test(err?.message)) return resolve();
      reject(err);
    }
  });
}

function migrationStorageRemove(keys) {
  if (!keys.length) return Promise.resolve();
  return new Promise((resolve, reject) => {
    if (!isExtensionValid()) return resolve();
    try {
      chrome.storage.local.remove(keys, () => {
        const error = chrome.runtime?.lastError;
        if (error) {
          if (/Extension context invalidated/i.test(error.message)) return resolve();
          reject(new Error(error.message));
        } else {
          resolve();
        }
      });
    } catch (err) {
      if (/Extension context invalidated/i.test(err?.message)) return resolve();
      reject(err);
    }
  });
}

async function migrationRemoveLegacyBackupState(all) {
  const keys = LEGACY_BACKUP_STORAGE_KEYS.filter(key => Object.prototype.hasOwnProperty.call(all, key));
  if (!keys.length) return;
  try {
    await migrationStorageRemove(keys);
  } catch (error) {
    console.warn('RhythiaX: Could not remove obsolete backup state:', error);
  }
}

// Preferences an older version left without a control, put right after a successful check. 1.1 kept the data
// settings collectStats and collectRanking equal to its module switches statHistory and rankingHistory. Since
// 1.2 only those switches have a control ("Rank and stat history" in the popup, which sets both), and the capture
// follows them (legacy/core/data/data-history.js). A kind 1.1 did not collect turns its switch off, unless the
// switch holds a choice of its own, and collect* go back to true. A stored scoreCards.customCards false has had no
// control since 1.2: it kept Classic's score cards off while the popup showed them on. Returns the values to
// write, or null when nothing is left to change, so a second run changes nothing.
function migrationPreferenceUpdates(stored) {
  const values = {};
  const settings = stored[RhythiaX.DATA_SETTINGS_KEY];
  if (settings && typeof settings === 'object' && (settings.collectStats === false || settings.collectRanking === false)) {
    const modules = stored.rhythiaxModules && typeof stored.rhythiaxModules === 'object' ? stored.rhythiaxModules : {};
    const next = { ...modules };
    if (settings.collectStats === false && typeof modules.statHistory !== 'boolean') next.statHistory = false;
    if (settings.collectRanking === false && typeof modules.rankingHistory !== 'boolean') next.rankingHistory = false;
    if (next.statHistory !== modules.statHistory || next.rankingHistory !== modules.rankingHistory) values.rhythiaxModules = next;
    values[RhythiaX.DATA_SETTINGS_KEY] = { ...settings, collectStats: true, collectRanking: true };
  }
  const options = stored.rhythiaxModuleOptions;
  if (options && typeof options === 'object' && options.scoreCards?.customCards === false) {
    const scoreCards = { ...options.scoreCards };
    delete scoreCards.customCards;
    values.rhythiaxModuleOptions = { ...options, scoreCards };
  }
  return Object.keys(values).length ? values : null;
}

// Runs while this context holds the migration lock, on a fresh read of the keys it changes. A failed write is
// only reported: the stored values stay as they were, and the next version update tries again.
async function migrationUpgradePreferences() {
  try {
    const updates = migrationPreferenceUpdates(await migrationStorageGet([RhythiaX.DATA_SETTINGS_KEY, 'rhythiaxModules', 'rhythiaxModuleOptions']));
    if (updates) await migrationStorageSet(updates);
  } catch (error) {
    console.warn('RhythiaX: Could not update preferences from an older version:', error);
  }
}

// The same, from a context that does not hold the lock yet. A lock held elsewhere belongs to an update, a repair or
// this same step in another context, and each of them runs this step before it lets go.
async function migrationUpgradePreferencesLocked(all) {
  if (!migrationPreferenceUpdates(all)) return;
  let owner = null;
  try {
    owner = await migrationAcquireLock();
  } catch (error) {
    console.warn('RhythiaX: Could not update preferences from an older version:', error);
  }
  if (!owner) return;
  try {
    await migrationUpgradePreferences();
  } finally {
    await migrationReleaseLock(owner).catch(() => {});
  }
}

function migrationAppVersion() {
  try { return String(chrome.runtime.getManifest?.().version || 'unknown'); } catch (_) { return 'unknown'; }
}

function migrationOwner() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

async function migrationAcquireLock() {
  const owner = migrationOwner();
  const now = Date.now();
  const existing = await migrationStorageGet(RhythiaX.DATA_MIGRATION_LOCK_KEY);
  const lock = existing[RhythiaX.DATA_MIGRATION_LOCK_KEY];
  if (lock?.owner && Number(lock.expiresAt) > now && lock.owner !== owner) return null;
  await migrationStorageSet({
    [RhythiaX.DATA_MIGRATION_LOCK_KEY]: { owner, startedAt: now, expiresAt: now + DATA_MIGRATION_LEASE_MS },
  });
  const claimed = await migrationStorageGet(RhythiaX.DATA_MIGRATION_LOCK_KEY);
  return claimed[RhythiaX.DATA_MIGRATION_LOCK_KEY]?.owner === owner ? owner : null;
}

async function migrationReleaseLock(owner) {
  const result = await migrationStorageGet(RhythiaX.DATA_MIGRATION_LOCK_KEY);
  if (result[RhythiaX.DATA_MIGRATION_LOCK_KEY]?.owner === owner) {
    await migrationStorageRemove([RhythiaX.DATA_MIGRATION_LOCK_KEY]);
  }
}

function migrationRecordKey(profileId) {
  return `${RhythiaX.DATA_STORAGE_ENTRY_PREFIX}${String(profileId || '').trim()}`;
}

function migrationSnapshot(all) {
  let settings = all[RhythiaX.DATA_SETTINGS_KEY] || null;
  if (typeof all.rhythiax_telemetry_enabled === 'boolean' && settings?.telemetryEnabled === undefined) {
    settings = { ...(settings || {}), telemetryEnabled: all.rhythiax_telemetry_enabled };
  }
  const records = Object.entries(all)
    .filter(([key]) => key.startsWith(RhythiaX.DATA_STORAGE_ENTRY_PREFIX))
    .map(([key, value]) => ({ key, value: RhythiaX.cloneDataValue(value) || value }));
  return { records, settings };
}

function migrationRecordId(item) {
  return String(item?.value?.profileId || item?.key?.slice(RhythiaX.DATA_STORAGE_ENTRY_PREFIX.length) || '').trim();
}

// One stored history entry ({ key, value }) whose profile id is id: throws when its shape is damaged.
function migrationValidateRecord(item, id) {
  const raw = item.value;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)
    || String(raw.profileId || id) !== id || item.key !== migrationRecordKey(id)) throw new Error(`Migration produced an invalid profile record: ${id}`);
  if (!raw.history || typeof raw.history !== 'object' || Array.isArray(raw.history)) throw new Error(`Migration found a damaged history container for profile ${id}.`);
  const history = raw.history;
  if (!history.daily || typeof history.daily !== 'object' || Array.isArray(history.daily)) throw new Error(`Migration found a damaged daily history container for profile ${id}.`);
  const daily = history.daily;
  Object.entries(daily).forEach(([date, snapshotPoint]) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !snapshotPoint
      || !Number.isFinite(Number(snapshotPoint.capturedAt)) || Number(snapshotPoint.capturedAt) <= 0 || snapshotPoint.date !== date) {
      throw new Error(`Migration produced an invalid daily snapshot for profile ${id}.`);
    }
  });
  if (history.openDay !== null && history.openDay !== undefined) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(history.openDay.date || '')) || !Array.isArray(history.openDay.captures)) {
      throw new Error(`Migration produced an invalid open-day record for profile ${id}.`);
    }
    history.openDay.captures.forEach(capture => {
      if (!capture || typeof capture !== 'object' || Array.isArray(capture)
        || !Number.isFinite(Number(capture.capturedAt)) || Number(capture.capturedAt) <= 0 || capture.date !== history.openDay.date) {
        throw new Error(`Migration produced an invalid open-day capture for profile ${id}.`);
      }
    });
  }
  const normalized = RhythiaX.normalizeDataRecord(raw, id);
  if (!normalized.profileId || normalized.profileId !== id) throw new Error(`Migration produced an invalid profile record: ${id}`);
}

function migrationValidateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.records)) throw new Error('Migration produced an invalid record collection.');
  const ids = new Set();
  snapshot.records.forEach(item => {
    const id = migrationRecordId(item);
    if (!id || ids.has(id)) throw new Error('Migration produced a duplicate or empty profileId.');
    ids.add(id);
    migrationValidateRecord(item, id);
  });
  return true;
}

function migrationRegistry() {
  return RhythiaX.DATA_SCHEMA_MIGRATIONS || {};
}

RhythiaX.registerDataMigration = function (fromVersion, toVersion, migrate) {
  const from = Number(fromVersion);
  const to = Number(toVersion);
  if (!Number.isInteger(from) || !Number.isInteger(to) || to !== from + 1 || typeof migrate !== 'function') {
    throw new Error('A data migration must move exactly one schema version forward.');
  }
  RhythiaX.DATA_SCHEMA_MIGRATIONS = RhythiaX.DATA_SCHEMA_MIGRATIONS || {};
  RhythiaX.DATA_SCHEMA_MIGRATIONS[from] = { from, to, migrate };
};

async function migrationApplySteps(snapshot, fromVersion, toVersion) {
  let current = Number(fromVersion);
  let next = snapshot;
  while (current < toVersion) {
    const step = migrationRegistry()[current];
    if (!step || step.to !== current + 1) throw new Error(`No offline migration exists for schema v${current} to v${current + 1}.`);
    next = await step.migrate(next);
    migrationValidateSnapshot(next);
    current = step.to;
  }
  return next;
}

async function migrationCommitSnapshot(snapshot, schemaVersion) {
  const values = {};
  snapshot.records.forEach(item => {
    const id = String(item.value.profileId || '').trim();
    values[migrationRecordKey(id)] = item.value;
  });
  if (snapshot.settings) values[RhythiaX.DATA_SETTINGS_KEY] = snapshot.settings;
  // Schema migrations do not change app preferences. Rewriting the captured
  // values here could overwrite a newer popup choice made during migration.
  values[RhythiaX.DATA_STORAGE_META_KEY] = {
    schemaVersion,
    appVersion: migrationAppVersion(),
    status: 'ready',
    updatedAt: Date.now(),
  };
  await migrationStorageSet(values);
}

async function migrationWaitForOwner() {
  await new Promise(resolve => setTimeout(resolve, DATA_MIGRATION_WAIT_MS));
  return migrationStorageGet(RhythiaX.DATA_STORAGE_META_KEY);
}

RhythiaX.getDataStorageMeta = async function () {
  const result = await migrationStorageGet(RhythiaX.DATA_STORAGE_META_KEY);
  return result[RhythiaX.DATA_STORAGE_META_KEY] || null;
};

RhythiaX.getDataStorageHealth = function () {
  return {
    readOnly: RhythiaX.dataStorageReadOnly === true,
    // A check or an update that failed on stored history can be repaired (RhythiaX.repairDataStorage);
    // a schema newer than this version cannot.
    repairable: RhythiaX.dataStorageReadOnly === true && Boolean(RhythiaX.dataMigrationError),
    error: RhythiaX.dataMigrationError ? String(RhythiaX.dataMigrationError.message || RhythiaX.dataMigrationError) : '',
  };
};

RhythiaX.markDataStorageHealthy = async function () {
  RhythiaX.dataStorageReadOnly = false;
  RhythiaX.dataMigrationError = null;
  await migrationStorageSet({
    [RhythiaX.DATA_STORAGE_META_KEY]: { schemaVersion: RhythiaX.DATA_SCHEMA_VERSION, appVersion: migrationAppVersion(), status: 'ready', repairedAt: Date.now(), updatedAt: Date.now() },
    [RhythiaX.DATA_MIGRATION_STATE_KEY]: { status: 'repaired', completedAt: Date.now() },
  });
};

// The popup's Repair, run in the background (rhythiax-data-repair in background.js). Every history entry that
// fails the check above moves to rhythiaxDataQuarantine:<its key>, which nothing shows and Clear history
// removes, and the rest of the history is used again. Storage is marked ready only once no damaged entry is
// left, or the next version update would lock it again. Open Classic tabs follow through the listener below.
RhythiaX.repairDataStorage = async function () {
  const currentVersion = Number(RhythiaX.DATA_SCHEMA_VERSION) || 1;
  const owner = await migrationAcquireLock();
  if (!owner) throw new Error('Local data is being updated. Try again in a moment.');
  const quarantined = [];
  let storedVersion;
  try {
    const all = await migrationStorageGet(null);
    storedVersion = Number(all[RhythiaX.DATA_STORAGE_META_KEY]?.schemaVersion || 0);
    if (!Number.isInteger(storedVersion) || storedVersion < 0 || storedVersion > currentVersion) {
      throw new Error('Stored data uses a schema this version does not know, so it cannot be repaired here.');
    }
    const moved = {};
    const ids = new Set();
    for (const item of migrationSnapshot(all).records) {
      const id = migrationRecordId(item);
      try {
        if (!id || ids.has(id)) throw new Error('Migration produced a duplicate or empty profileId.');
        migrationValidateRecord(item, id);
        ids.add(id);
      } catch (error) {
        moved[`${RhythiaX.DATA_QUARANTINE_PREFIX}${item.key}`] = {
          key: item.key, value: all[item.key], error: String(error?.message || error).slice(0, 240), movedAt: Date.now(),
        };
        quarantined.push(item.key);
      }
    }
    // The copies are written before the entries go, so nothing is lost if the second step fails.
    if (quarantined.length) {
      await migrationStorageSet(moved);
      await migrationStorageRemove(quarantined);
    }
    migrationValidateSnapshot(migrationSnapshot(await migrationStorageGet(null)));
    if (storedVersion === currentVersion) {
      await RhythiaX.markDataStorageHealthy();
      await migrationUpgradePreferences();
    }
  } finally {
    await migrationReleaseLock(owner);
  }
  // At the current schema the next readiness check reads the ready meta. An update that stopped at a
  // damaged entry runs again on the rest.
  RhythiaX.dataMigrationReady = null;
  if (storedVersion !== currentVersion) {
    RhythiaX.dataStorageReadOnly = false;
    RhythiaX.dataMigrationError = null;
    await RhythiaX.runDataMigrations();
    if (RhythiaX.dataStorageReadOnly) throw RhythiaX.dataMigrationError || new Error('Local data could not be repaired.');
  }
  return { quarantined: quarantined.length };
};

// Another context marked storage ready for this version (a repair, or an update that finished). A context that
// found it damaged when it started, such as an open Classic tab, then saves history again without a reload.
if (typeof chrome !== 'undefined') chrome.storage?.onChanged?.addListener((changes, area) => {
  const meta = area === 'local' ? changes[RhythiaX.DATA_STORAGE_META_KEY]?.newValue : null;
  if (!RhythiaX.dataStorageReadOnly || meta?.status !== 'ready' || meta.appVersion !== migrationAppVersion()
    || Number(meta.schemaVersion) !== (Number(RhythiaX.DATA_SCHEMA_VERSION) || 1)) return;
  RhythiaX.dataStorageReadOnly = false;
  RhythiaX.dataMigrationError = null;
});

RhythiaX.runDataMigrations = async function () {
  if (RhythiaX.dataMigrationReady) return RhythiaX.dataMigrationReady;
  RhythiaX.dataMigrationReady = (async () => {
    // Already checked for this version: only the small meta key is read. Reading and validating
    // all of storage (up to the history limit) on every service-worker wake-up and every tab
    // made the popup wait; the full check runs once per release, and whenever the meta is not ready.
    const quick = (await migrationStorageGet(RhythiaX.DATA_STORAGE_META_KEY))[RhythiaX.DATA_STORAGE_META_KEY] || {};
    if (Number(quick.schemaVersion) === (Number(RhythiaX.DATA_SCHEMA_VERSION) || 1) && quick.status === 'ready' && quick.appVersion === migrationAppVersion()) return quick;
    let all = await migrationStorageGet(null);
    let storedMeta = all[RhythiaX.DATA_STORAGE_META_KEY] || {};
    const currentVersion = Number(RhythiaX.DATA_SCHEMA_VERSION) || 1;
    let storedVersion = Number(storedMeta.schemaVersion || 0);
    if (!Number.isInteger(storedVersion) || storedVersion < 0) {
      RhythiaX.dataStorageReadOnly = true;
      throw new Error('Stored data schema version is invalid.');
    }
    if (storedVersion > currentVersion) {
      RhythiaX.dataStorageReadOnly = true;
      throw new Error(`Stored data schema v${storedVersion} is newer than this application supports (v${currentVersion}).`);
    }
    if (storedVersion === currentVersion && storedMeta.status !== 'failed') {
      try {
        migrationValidateSnapshot(migrationSnapshot(all));
      } catch (error) {
        RhythiaX.dataStorageReadOnly = true;
        RhythiaX.dataMigrationError = error;
        await migrationStorageSet({
          [RhythiaX.DATA_STORAGE_META_KEY]: { ...storedMeta, schemaVersion: currentVersion, status: 'failed', appVersion: migrationAppVersion(), updatedAt: Date.now(), error: String(error?.message || error).slice(0, 240) },
        });
        return storedMeta;
      }
      if (storedMeta.appVersion !== migrationAppVersion()) {
        await migrationStorageSet({
          [RhythiaX.DATA_STORAGE_META_KEY]: { ...storedMeta, schemaVersion: currentVersion, appVersion: migrationAppVersion(), status: 'ready', updatedAt: Date.now() },
        });
      }
      await migrationRemoveLegacyBackupState(all);
      await migrationUpgradePreferencesLocked(all);
      return storedMeta;
    }
    const owner = await migrationAcquireLock();
    if (!owner) {
      await migrationWaitForOwner();
      RhythiaX.dataMigrationReady = null;
      return RhythiaX.runDataMigrations();
    }
    try {
      // Another context may have completed an upgrade while this owner waited.
      // Read again after acquiring the lease instead of committing stale data.
      all = await migrationStorageGet(null);
      storedMeta = all[RhythiaX.DATA_STORAGE_META_KEY] || {};
      storedVersion = Number(storedMeta.schemaVersion || 0);
      if (!Number.isInteger(storedVersion) || storedVersion < 0 || storedVersion > currentVersion) {
        throw new Error('Stored data schema changed to an unsupported version.');
      }
      if (storedVersion === currentVersion && storedMeta.status === 'ready') {
        migrationValidateSnapshot(migrationSnapshot(all));
        await migrationRemoveLegacyBackupState(all);
        await migrationUpgradePreferences();
        return storedMeta;
      }
      const migrationStarted = Date.now();
      await migrationStorageSet({
        [RhythiaX.DATA_MIGRATION_STATE_KEY]: { status: 'running', fromVersion: storedVersion, toVersion: currentVersion, owner, startedAt: migrationStarted },
        [RhythiaX.DATA_STORAGE_META_KEY]: { ...storedMeta, schemaVersion: storedVersion, status: 'migrating', appVersion: migrationAppVersion(), updatedAt: migrationStarted },
      });
      const snapshot = migrationSnapshot(all);
      const sourceVersion = storedVersion || 1;
      migrationValidateSnapshot(snapshot);
      const migrated = sourceVersion === currentVersion
        ? snapshot
        : await migrationApplySteps(snapshot, sourceVersion, currentVersion);
      migrationValidateSnapshot(migrated);
      await migrationCommitSnapshot(migrated, currentVersion);
      await migrationRemoveLegacyBackupState(all);
      await migrationUpgradePreferences();
      await migrationStorageSet({
        [RhythiaX.DATA_MIGRATION_STATE_KEY]: { status: 'complete', fromVersion: sourceVersion, toVersion: currentVersion, completedAt: Date.now() },
      });
      return RhythiaX.getDataStorageMeta();
    } catch (error) {
      RhythiaX.dataStorageReadOnly = true;
      RhythiaX.dataMigrationError = error;
      await migrationStorageSet({
        [RhythiaX.DATA_MIGRATION_STATE_KEY]: { status: 'failed', fromVersion: storedVersion, toVersion: currentVersion, failedAt: Date.now(), error: String(error?.message || error).slice(0, 240) },
        [RhythiaX.DATA_STORAGE_META_KEY]: { ...storedMeta, schemaVersion: storedVersion, status: 'failed', appVersion: migrationAppVersion(), updatedAt: Date.now() },
      });
      return RhythiaX.getDataStorageMeta();
    } finally {
      await migrationReleaseLock(owner);
    }
  })();
  return RhythiaX.dataMigrationReady;
};

// Preserve 1.1.x records while updating the storage schema.
RhythiaX.registerDataMigration(1, 2, async function (snapshot) {
  const nextRecords = (snapshot.records || []).map(item => {
    const record = RhythiaX.cloneDataValue(item.value) || item.value;
    if (record && typeof record === 'object') {
      record.schemaVersion = 2;
    }
    const id = String(record?.profileId || item.key?.slice(RhythiaX.DATA_STORAGE_ENTRY_PREFIX.length) || '').trim();
    return {
      key: item.key,
      value: { ...RhythiaX.normalizeDataRecord(record, id), schemaVersion: 2 },
    };
  });

  // Normalize legacy settings to the fixed retention policy; keep privacy choices.
  const settings = snapshot.settings ? { ...snapshot.settings } : null;

  return {
    ...snapshot,
    records: nextRecords,
    settings: settings ? RhythiaX.normalizeDataSettings(settings) : null,
  };
});

RhythiaX.registerDataMigration(2, 3, async function (snapshot) {
  return {
    ...snapshot,
    records: snapshot.records.map(item => ({
      key: item.key,
      value: RhythiaX.normalizeDataRecord(item.value, item.value?.profileId || item.key?.slice(RhythiaX.DATA_STORAGE_ENTRY_PREFIX.length)),
    })),
    settings: snapshot.settings ? RhythiaX.normalizeDataSettings(snapshot.settings) : null,
  };
});

// Upgrade both released 1.1.x data and unreleased schema-3 development data.
// History is preserved here; maintenance applies the limits during site use.
RhythiaX.registerDataMigration(3, 4, async function (snapshot) {
  return {
    ...snapshot,
    records: snapshot.records.map(item => ({
      key: item.key,
      value: RhythiaX.normalizeDataRecord(item.value, item.value?.profileId),
    })),
    settings: snapshot.settings ? RhythiaX.normalizeDataSettings(snapshot.settings) : null,
  };
});
