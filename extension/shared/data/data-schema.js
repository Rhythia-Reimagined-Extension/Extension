// =============================================
// Rhythia X - Canonical local data schema
// =============================================

var RhythiaX = RhythiaX || {};

RhythiaX.DATA_SCHEMA_VERSION = 4;
RhythiaX.DATA_STORAGE_ENTRY_PREFIX = 'rhythiaxData:entry:';
RhythiaX.DATA_SETTINGS_KEY = 'rhythiaxDataSettings';
RhythiaX.COMMUNITY_CONSENT_VERSION = 1;

RhythiaX.DATA_DEFAULT_SETTINGS = {
  retentionDays: 90,
  maxStorageMb: 25,
  openDayMaxMb: 5,
  snapshotIntervalMinutes: 15,
  maxSnapshotsPerDay: 48,
  inlineStatsReference: 'firstSnapshotToday',
  inlineRankingReference: 'previousDayClose',
  historyGrouping: 'weekly',
  historyDisplayMode: 'latestOpenAndClosed',
  collectStats: true,
  collectRanking: true,
  syncMode: 'hybrid',
  telemetryEnabled: true,
  communityConsentVersion: 0,
};

RhythiaX.DATA_METRIC_KEYS = [
  'weightedRp',
  'rawRp',
  'avgAccuracy',
  'fcCount',
  'playCount',
  'squaresHit',
  'mapsPerWeek',
  'globalRank',
  'countryRank',
  'rhythmPoints',
];
RhythiaX.DATA_NON_NEGATIVE_METRICS = new Set(RhythiaX.DATA_METRIC_KEYS);

RhythiaX.DATA_SNAPSHOT_STATUSES = ['partial', 'complete'];
RhythiaX.DATA_SNAPSHOT_SOURCES = ['dom', 'api', 'merged', 'profile', 'import'];
RhythiaX.DATA_REFERENCE_MODES = ['firstSnapshotToday', 'previousCapture', 'previousDayClose'];
RhythiaX.DATA_HISTORY_DISPLAY_MODES = ['latestOpenAndClosed', 'closedOnly', 'allSnapshots', 'firstSnapshotAndClosed'];

function dataClone(value) {
  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return null;
  }
}

RhythiaX.cloneDataValue = dataClone;

function dataFiniteNumber(value) {
  if (value === undefined || value === null || String(value).trim() === '' || String(value).trim() === '—') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function dataNormalizeMetricValue(key, value) {
  const parsed = dataFiniteNumber(value);
  if (parsed === null) return null;
  if (RhythiaX.DATA_NON_NEGATIVE_METRICS.has(key) && parsed < 0) return null;
  if (key !== 'avgAccuracy') return parsed;
  const normalized = parsed > 100 && parsed <= 10000 ? parsed / 100 : parsed;
  return normalized >= 0 && normalized <= 100 ? normalized : null;
}

RhythiaX.normalizeDataMetricValue = dataNormalizeMetricValue;

function dataTimestamp(value, fallback = null) {
  const timestamp = Number(value);
  return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : fallback;
}

function dataDateKey(value) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const timestamp = dataTimestamp(value);
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? '' : RhythiaX.localDateKey(date);
}

RhythiaX.normalizeDataSettings = function (settings) {
  const source = settings && typeof settings === 'object' ? settings : {};
  const syncOptions = ['cloud-only', 'hybrid', 'local-only'];
  const requestedInterval = Number(source.snapshotIntervalMinutes);
  const requestedSnapshotLimit = Number(source.maxSnapshotsPerDay);
  const requestedOpenDayMb = Number(source.openDayMaxMb);
  return {
    retentionDays: 90,
    syncMode: syncOptions.includes(source.syncMode) ? source.syncMode : 'hybrid',
    telemetryEnabled: source.telemetryEnabled !== false,
    communityConsentVersion: source.communityConsentVersion === RhythiaX.COMMUNITY_CONSENT_VERSION
      ? RhythiaX.COMMUNITY_CONSENT_VERSION : 0,
    maxStorageMb: 25,
    openDayMaxMb: Number.isFinite(requestedOpenDayMb) ? Math.min(50, Math.max(1, Math.round(requestedOpenDayMb))) : 5,
    snapshotIntervalMinutes: Number.isFinite(requestedInterval) ? Math.min(1440, Math.max(0, Math.round(requestedInterval))) : 15,
    maxSnapshotsPerDay: Number.isFinite(requestedSnapshotLimit) ? Math.min(10000, Math.max(1, Math.round(requestedSnapshotLimit))) : 48,
    inlineStatsReference: RhythiaX.DATA_REFERENCE_MODES.includes(source.inlineStatsReference)
      ? source.inlineStatsReference
      : 'firstSnapshotToday',
    inlineRankingReference: RhythiaX.DATA_REFERENCE_MODES.includes(source.inlineRankingReference)
      ? source.inlineRankingReference
      : 'previousDayClose',
    historyGrouping: ['daily', 'weekly', 'monthly'].includes(source.historyGrouping)
      ? source.historyGrouping
      : 'daily',
    historyDisplayMode: RhythiaX.DATA_HISTORY_DISPLAY_MODES.includes(source.historyDisplayMode)
      ? source.historyDisplayMode
      : 'latestOpenAndClosed',
    collectStats: source.collectStats !== false,
    collectRanking: source.collectRanking !== false,
  };
};

function emptyMetrics() {
  return RhythiaX.DATA_METRIC_KEYS.reduce((metrics, key) => {
    metrics[key] = null;
    return metrics;
  }, {});
}

function normalizeSnapshot(snapshot, fallbackDate) {
  if (!snapshot || typeof snapshot !== 'object') return null;
  const capturedAt = dataTimestamp(snapshot.capturedAt);
  const date = dataDateKey(snapshot.date) || dataDateKey(capturedAt) || fallbackDate;
  if (!capturedAt || !date) return null;
  const metrics = emptyMetrics();
  RhythiaX.DATA_METRIC_KEYS.forEach(key => {
    if (Object.prototype.hasOwnProperty.call(snapshot.metrics || {}, key)) {
        metrics[key] = dataNormalizeMetricValue(key, snapshot.metrics[key]);
      } else if (Object.prototype.hasOwnProperty.call(snapshot, key)) {
        metrics[key] = dataNormalizeMetricValue(key, snapshot[key]);
      }
  });
  const requestedStatus = RhythiaX.DATA_SNAPSHOT_STATUSES.includes(snapshot.status) ? snapshot.status : 'partial';
  const source = RhythiaX.DATA_SNAPSHOT_SOURCES.includes(snapshot.source) ? snapshot.source : 'import';
  const invalidMetrics = RhythiaX.DATA_METRIC_KEYS.filter(key => {
    const rawValue = snapshot.metrics && Object.prototype.hasOwnProperty.call(snapshot.metrics, key)
      ? snapshot.metrics[key]
      : snapshot[key];
      return rawValue !== undefined && rawValue !== null && rawValue !== '' && rawValue !== '—'
      && dataNormalizeMetricValue(key, rawValue) === null;
  });
  const missing = Array.isArray(snapshot.missing)
    ? [...new Set([
      ...snapshot.missing.filter(key => RhythiaX.DATA_METRIC_KEYS.includes(key)),
      ...invalidMetrics,
    ])]
    : RhythiaX.DATA_METRIC_KEYS.filter(key => metrics[key] === null);
  const status = requestedStatus === 'complete' && missing.length === 0 ? 'complete' : 'partial';
  return {
    id: String(snapshot.id || `${capturedAt}:${date}`),
    visitId: String(snapshot.visitId || ''),
    kind: snapshot.kind === 'daily' ? 'daily' : 'capture',
    date,
    capturedAt,
    status,
    source,
    missing,
    metrics,
  };
}

function normalizeOpenDay(openDay) {
  if (!openDay || typeof openDay !== 'object') return null;
  const date = dataDateKey(openDay.date);
  if (!date) return null;
  const captures = (Array.isArray(openDay.captures) ? openDay.captures : [])
    .map(snapshot => normalizeSnapshot(snapshot, date))
    .filter(snapshot => snapshot && snapshot.date === date)
    .sort((left, right) => left.capturedAt - right.capturedAt);
  return {
    date,
    captures,
    lastUpdatedAt: dataTimestamp(openDay.lastUpdatedAt, captures[captures.length - 1]?.capturedAt || null),
  };
}

function normalizeDailyHistory(daily) {
  if (!daily || typeof daily !== 'object') return {};
  return Object.entries(daily).reduce((result, [date, snapshot]) => {
    const normalized = normalizeSnapshot(snapshot, dataDateKey(date));
    if (!normalized || normalized.date !== date) return result;
    normalized.kind = 'daily';
    result[date] = normalized;
    return result;
  }, {});
}

function rollRecordOpenDay(record, referenceDateOrNow = Date.now()) {
  if (!record || typeof record !== 'object' || !record.history || !record.history.openDay) return false;
  const today = typeof referenceDateOrNow === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(referenceDateOrNow)
    ? referenceDateOrNow
    : dataDateKey(referenceDateOrNow);
  const openDay = record.history.openDay;
  if (!openDay || !openDay.date) return false;
  if (today && openDay.date >= today) return false;
  const captures = Array.isArray(openDay.captures) ? openDay.captures : [];
  const latest = captures.length > 0 ? captures[captures.length - 1] : null;
  if (latest) {
    const dailySnapshot = normalizeSnapshot({
      ...dataClone(latest),
      id: `${openDay.date}:daily`,
      kind: 'daily',
      date: openDay.date,
    }, openDay.date);
    if (dailySnapshot) {
      dailySnapshot.kind = 'daily';
      record.history.daily = record.history.daily || {};
      record.history.daily[openDay.date] = dailySnapshot;
    }
  }
  record.history.openDay = null;
  return true;
}

RhythiaX.rollRecordOpenDay = rollRecordOpenDay;

function normalizeCollection(collection) {
  const source = collection && typeof collection === 'object' ? collection : {};
  const status = ['empty', 'partial', 'complete', 'error'].includes(source.status) ? source.status : 'empty';
  const diagnostics = Array.isArray(source.diagnostics)
    ? source.diagnostics.map(item => {
      if (!item || typeof item !== 'object') return null;
      const timestamp = dataTimestamp(item.timestamp || item.capturedAt || item.at, Date.now());
      return {
        timestamp,
        source: String(item.source || '').slice(0, 32),
        status: String(item.status || '').slice(0, 32),
        reason: String(item.reason || '').slice(0, 120),
        missing: Array.isArray(item.missing)
          ? [...new Set(item.missing.filter(key => RhythiaX.DATA_METRIC_KEYS.includes(key)))].slice(0, 20)
          : [],
        code: String(item.code || '').slice(0, 64),
      };
    }).filter(Boolean).slice(-5)
    : [];
  return {
    status,
    source: RhythiaX.DATA_SNAPSHOT_SOURCES.includes(source.source) ? source.source : null,
    lastAttemptAt: dataTimestamp(source.lastAttemptAt),
    lastSuccessAt: dataTimestamp(source.lastSuccessAt),
    missing: Array.isArray(source.missing)
      ? [...new Set(source.missing.filter(key => RhythiaX.DATA_METRIC_KEYS.includes(key)))]
      : [],
    diagnostics,
  };
}

RhythiaX.normalizeDataSnapshot = normalizeSnapshot;

RhythiaX.createDataRecord = function (profileId, identity = {}, now = Date.now()) {
  const capturedAt = dataTimestamp(now, Date.now());
  return {
    schemaVersion: RhythiaX.DATA_SCHEMA_VERSION,
    profileId: String(profileId || ''),
    identity: {
      username: String(identity.username || '').trim(),
      country: String(identity.country || identity.countryCode || '').trim(),
    },
    updatedAt: capturedAt,
    collection: normalizeCollection(),
    history: {
      openDay: null,
      daily: {},
    },
  };
};

RhythiaX.normalizeDataRecord = function (record, profileId) {
  const source = record && typeof record === 'object' ? dataClone(record) || {} : {};
  const id = String(source.profileId || profileId || '').trim();
  const identity = source.identity && typeof source.identity === 'object' ? source.identity : {};
  const history = source.history && typeof source.history === 'object' ? source.history : {};
  const normalized = {
    schemaVersion: RhythiaX.DATA_SCHEMA_VERSION,
    profileId: id,
    identity: {
      username: String(identity.username || '').trim(),
      country: String(identity.country || identity.countryCode || '').trim(),
    },
    updatedAt: dataTimestamp(source.updatedAt, Date.now()),
    collection: normalizeCollection(source.collection),
    history: {
      openDay: normalizeOpenDay(history.openDay),
      daily: normalizeDailyHistory(history.daily),
    },
  };
  return normalized;
};

RhythiaX.cloneDataValue = dataClone;
