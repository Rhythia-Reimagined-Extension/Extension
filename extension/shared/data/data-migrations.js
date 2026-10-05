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

function isExtensionValid() {
  return typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);
}

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
  return {
    records,
    settings,
    appPreferences: {
      rhythiaxModules: all.rhythiaxModules,
      rhythiaxModuleOptions: all.rhythiaxModuleOptions,
      rhythiaxTheme: all.rhythiaxTheme,
      rhythiaxPopupSize: all.rhythiaxPopupSize,
      rhythiaxPopupSizeVersion: all.rhythiaxPopupSizeVersion,
    },
  };
}

function migrationValidateSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.records)) throw new Error('Migration produced an invalid record collection.');
  const ids = new Set();
  snapshot.records.forEach(item => {
    const id = String(item?.value?.profileId || item?.key?.slice(RhythiaX.DATA_STORAGE_ENTRY_PREFIX.length) || '').trim();
    if (!id || ids.has(id)) throw new Error('Migration produced a duplicate or empty profileId.');
    ids.add(id);
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
  });
  return true;
}

RhythiaX.validateDataStorageSnapshot = function (snapshot) {
  migrationValidateSnapshot(snapshot);
  return true;
};

RhythiaX.validateCurrentDataStorage = async function () {
  const all = await migrationStorageGet(null);
  migrationValidateSnapshot(migrationSnapshot(all));
  return true;
};

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

RhythiaX.runDataMigrations = async function () {
  if (RhythiaX.dataMigrationReady) return RhythiaX.dataMigrationReady;
  RhythiaX.dataMigrationReady = (async () => {
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
