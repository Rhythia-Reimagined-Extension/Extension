// Backup payload construction and stable-content fingerprinting.
function backupPayloadStableSettings(settings) {
  const source = RhythiaX.normalizeDataSettings(settings);
  return {
    retentionDays: source.retentionDays, maxStorageMb: source.maxStorageMb, openDayMaxMb: source.openDayMaxMb,
    snapshotIntervalMinutes: source.snapshotIntervalMinutes, maxSnapshotsPerDay: source.maxSnapshotsPerDay,
    inlineStatsReference: source.inlineStatsReference, inlineRankingReference: source.inlineRankingReference,
    historyGrouping: source.historyGrouping, historyDisplayMode: source.historyDisplayMode,
    collectStats: source.collectStats, collectRanking: source.collectRanking,
    collectTitleProgression: source.collectTitleProgression, whitelist: source.whitelist,
  };
}

function backupPayloadCreate(records, settings, options = {}) {
  const now = Number(options.now) || Date.now();
  const payload = RhythiaX.createDataExport(records, {
    scope: options.scope || 'all', includeOpenDay: options.includeOpenDay === true,
    includeTitleState: options.includeTitleState !== false, includeDiagnostics: false, includeSettings: true,
    settings: backupPayloadStableSettings(settings), appSettings: options.appSettings || null,
    now,
  });
  if (payload.settings) {
    delete payload.settings.localBackupEnabled;
    delete payload.settings.localBackupSchedule;
    delete payload.settings.localBackupCopyCount;
    delete payload.settings.localBackupIncludeAppSettings;
    delete payload.settings.localBackupIntervalDays;
  }
  payload.backupVersion = RhythiaX.DATA_BACKUP_VERSION;
  payload.backupPolicy = options.backupPolicy || 'stable-only';
  payload.backupKind = options.backupKind || 'automatic';
  payload.createdByAppVersion = backupPolicyAppVersion();
  payload.exportedAt = now;
  return payload;
}

function backupPayloadCreateStable(records, settings, now = Date.now()) {
  const preparedRecords = (Array.isArray(records) ? records : []).map(record => {
    const cloned = RhythiaX.cloneDataValue ? RhythiaX.cloneDataValue(record) : JSON.parse(JSON.stringify(record));
    if (RhythiaX.rollRecordOpenDay) RhythiaX.rollRecordOpenDay(cloned, now);
    return cloned;
  });
  const payload = backupPayloadCreate(preparedRecords, settings, { now, includeOpenDay: false, backupPolicy: 'stable-only', backupKind: 'automatic' });
  payload.scope.includeOpenDay = false;
  payload.scope.includeSettings = true;
  payload.records = payload.records.map(record => ({
    ...record,
    history: { openDay: null, daily: record.history.daily },
    collection: { status: 'complete', source: 'import', lastAttemptAt: null, lastSuccessAt: null, missing: [], diagnostics: [] },
  }));
  return payload;
}

function backupPayloadCreateManual(records, settings, options = {}) {
  const now = Number(options.now) || Date.now();
  const preparedRecords = (Array.isArray(records) ? records : []).map(record => {
    const cloned = RhythiaX.cloneDataValue ? RhythiaX.cloneDataValue(record) : JSON.parse(JSON.stringify(record));
    if (RhythiaX.rollRecordOpenDay) RhythiaX.rollRecordOpenDay(cloned, now);
    return cloned;
  });
  const payload = backupPayloadCreate(preparedRecords, settings, { ...options, now, backupPolicy: 'manual', backupKind: 'manual' });
  if (!options.includeAppSettings) delete payload.appSettings;
  return payload;
}

function backupPayloadCreateRecovery(records, settings, appSettings, now = Date.now()) {
  const preparedRecords = (Array.isArray(records) ? records : []).map(record => {
    const cloned = RhythiaX.cloneDataValue ? RhythiaX.cloneDataValue(record) : JSON.parse(JSON.stringify(record));
    if (RhythiaX.rollRecordOpenDay) RhythiaX.rollRecordOpenDay(cloned, now);
    return cloned;
  });
  return backupPayloadCreate(preparedRecords, settings, { now, includeOpenDay: true, includeAppSettings: true, appSettings, backupPolicy: 'recovery', backupKind: 'recovery' });
}

function backupPayloadFingerprint(payload) {
  return JSON.stringify({ schemaVersion: payload.schemaVersion, records: payload.records || [], settings: payload.settings || null, appSettings: payload.appSettings || null });
}
