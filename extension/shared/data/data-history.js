// =============================================
// Rhythia X - Open-day and daily history engine
// =============================================

var RhythiaX = RhythiaX || {};

function dataHistoryClone(value) {
  return RhythiaX.cloneDataValue ? RhythiaX.cloneDataValue(value) : JSON.parse(JSON.stringify(value));
}

function dataHistoryToday(timestamp = Date.now()) {
  return RhythiaX.localDateKey(new Date(timestamp));
}

function dataHistoryBytes(value) {
  const serialized = JSON.stringify(value || {});
  if (typeof Blob === 'function') return new Blob([serialized]).size;
  return serialized.length;
}

function dataHistoryWhitelist(record, settings) {
  const id = String(record?.profileId || '').trim();
  const username = String(record?.identity?.username || '').trim().toLocaleLowerCase();
  return (settings.whitelist || []).some(entry => (
    (entry.id && String(entry.id) === id)
    || (entry.username && String(entry.username).trim().toLocaleLowerCase() === username)
  ));
}

function dataHistoryLatest(openDay) {
  return openDay?.captures?.[openDay.captures.length - 1] || null;
}

function dataHistoryPreviousDate(dateText) {
  return RhythiaX.previousDate ? RhythiaX.previousDate(dateText) : '';
}

function dataHistoryCloseOpenDay(record) {
  const openDay = record?.history?.openDay;
  const latest = dataHistoryLatest(openDay);
  if (!openDay || !latest) {
    if (record?.history) record.history.openDay = null;
    return false;
  }
  const daily = {
    ...dataHistoryClone(latest),
    id: `${openDay.date}:daily`,
    kind: 'daily',
    date: openDay.date,
  };
  record.history.daily = record.history.daily || {};
  record.history.daily[openDay.date] = daily;
  record.history.openDay = null;
  return true;
}

function dataHistoryEnsureCurrentDay(record, today) {
  if (!record.history.openDay) {
    record.history.openDay = { date: today, captures: [], limitOverride: null, lastUpdatedAt: null };
    return true;
  }
  if (record.history.openDay.date === today) return false;
  dataHistoryCloseOpenDay(record);
  record.history.openDay = { date: today, captures: [], limitOverride: null, lastUpdatedAt: null };
  return true;
}

function dataHistoryEffectiveLimit(openDay, settings) {
  const override = Number(openDay?.limitOverride);
  return Number.isFinite(override) && override > 0 ? override : settings.maxSnapshotsPerDay;
}

function dataHistoryAppendDiagnostic(record, details) {
  const diagnostic = {
    timestamp: Number(details.timestamp) || Date.now(),
    source: String(details.source || '').slice(0, 32),
    status: String(details.status || '').slice(0, 32),
    reason: String(details.reason || '').slice(0, 120),
    missing: Array.isArray(details.missing) ? details.missing : [],
    code: String(details.code || '').slice(0, 64),
  };
  record.collection = record.collection || {};
  record.collection.diagnostics = [...(record.collection.diagnostics || []), diagnostic].slice(-5);
}

function dataHistoryUpdateCollection(record, snapshot) {
  const previous = record.collection || {};
  record.collection = {
    ...previous,
    status: snapshot.status,
    source: snapshot.source,
    lastAttemptAt: snapshot.capturedAt,
    lastSuccessAt: snapshot.status === 'complete' ? snapshot.capturedAt : (previous.lastSuccessAt || null),
    missing: snapshot.missing || [],
  };
}

function dataHistoryPruneByAge(record, settings, now) {
  if (dataHistoryWhitelist(record, settings) || !settings.retentionDays) return 0;
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - settings.retentionDays);
  const cutoffDate = RhythiaX.localDateKey(cutoff);
  const before = Object.keys(record.history.daily).length;
  record.history.daily = Object.fromEntries(Object.entries(record.history.daily).filter(([date]) => date >= cutoffDate));
  if (record.history.openDay?.date < cutoffDate) record.history.openDay = null;
  return before - Object.keys(record.history.daily).length;
}

function dataHistoryOpenBytes(records) {
  return records.reduce((sum, record) => sum + dataHistoryBytes(record.history?.openDay), 0);
}

function dataHistoryOldestCapture(records, settings) {
  return records
    .filter(record => !dataHistoryWhitelist(record, settings))
    .filter(record => (record.history?.openDay?.captures?.length || 0) > 1)
    .map(record => ({
      record,
      capture: record.history.openDay.captures[0],
    }))
    .sort((left, right) => (left.capture.capturedAt || 0) - (right.capture.capturedAt || 0))[0] || null;
}

function dataHistoryOldestDaily(records, settings) {
  return records
    .filter(record => !dataHistoryWhitelist(record, settings))
    .flatMap(record => Object.values(record.history?.daily || {}).map(snapshot => ({ record, snapshot })))
    .sort((left, right) => (left.snapshot.capturedAt || 0) - (right.snapshot.capturedAt || 0))[0] || null;
}

function dataHistoryEnforceLimits(records, settings) {
  const report = {
    removedDaily: 0,
    removedOpenCaptures: 0,
    protectedOverflow: false,
    openDayOverflow: false,
  };
  let openAttempts = 0;
  const openLimit = settings.openDayMaxMb * 1024 * 1024;
  while (dataHistoryOpenBytes(records) > openLimit && openAttempts < 10000) {
    openAttempts++;
    const candidate = dataHistoryOldestCapture(records, settings);
    if (!candidate) {
      report.openDayOverflow = true;
      break;
    }
    candidate.record.history.openDay.captures.shift();
    report.removedOpenCaptures++;
  }

  let attempts = 0;
  const maxBytes = settings.maxStorageMb * 1024 * 1024;
  while (dataHistoryBytes(records) > maxBytes && attempts < 10000) {
    attempts++;
    const dailyCandidate = dataHistoryOldestDaily(records, settings);
    if (dailyCandidate) {
      delete dailyCandidate.record.history.daily[dailyCandidate.snapshot.date];
      report.removedDaily++;
      continue;
    }
    const captureCandidate = dataHistoryOldestCapture(records, settings);
    if (captureCandidate) {
      captureCandidate.record.history.openDay.captures.shift();
      report.removedOpenCaptures++;
      continue;
    }
    report.protectedOverflow = true;
    break;
  }
  return report;
}

function dataHistoryChangedIds(before, after) {
  return after.filter(record => JSON.stringify(before.get(record.profileId)) !== JSON.stringify(record));
}

function dataHistoryWrite(task) {
  return RhythiaX.dataCanonicalWrite(task);
}

RhythiaX.recordProfileDataCapture = function (profileId, player, scoreSets, options = {}) {
  if (!profileId || typeof RhythiaX.collectDataSnapshot !== 'function') return Promise.resolve(null);
  return dataHistoryWrite(async () => {
    const settings = await RhythiaX.getDataSettings();
    if (!settings.collectStats && !settings.collectRanking) return { saved: false, reason: 'collection-disabled' };
    const now = Number(options.capturedAt) || Date.now();
    const snapshot = RhythiaX.collectDataSnapshot({
      player,
      scoreSets,
      source: options.source || 'dom',
      visitId: options.visitId || '',
      capturedAt: now,
      settings,
    });
    const records = await RhythiaX.listDataRecords();
    const before = new Map(records.map(record => [record.profileId, dataHistoryClone(record)]));
    const key = String(profileId);
    let record = records.find(item => item.profileId === key);
    if (!record) record = RhythiaX.createDataRecord(key, player, now);
    record.identity = {
      username: String(player?.username || record.identity?.username || '').trim(),
      country: String(player?.country || player?.countryCode || record.identity?.country || '').trim(),
    };
    dataHistoryEnsureCurrentDay(record, snapshot.date);
    const openDay = record.history.openDay;
    const sameVisitIndex = snapshot.visitId
      ? openDay.captures.findIndex(item => item.visitId && item.visitId === snapshot.visitId)
      : -1;
    if (sameVisitIndex >= 0) {
      openDay.captures[sameVisitIndex] = RhythiaX.mergeDataSnapshots(openDay.captures[sameVisitIndex], snapshot);
      openDay.captures.sort((left, right) => left.capturedAt - right.capturedAt);
    } else {
      const latest = dataHistoryLatest(openDay);
      const elapsed = latest ? now - latest.capturedAt : Number.POSITIVE_INFINITY;
      const rawChanged = !latest || RhythiaX.dataSnapshotHasMetricChange(latest, snapshot);
      const changed = rawChanged && !(snapshot.status === 'partial' && latest?.status === 'complete' && elapsed < settings.snapshotIntervalMinutes * 60 * 1000);
      const cooldownMs = settings.snapshotIntervalMinutes * 60 * 1000;
      if (latest && !changed && elapsed < cooldownMs) {
        dataHistoryUpdateCollection(record, snapshot);
        dataHistoryAppendDiagnostic(record, {
          timestamp: now,
          source: snapshot.source,
          status: snapshot.status,
          reason: 'duplicate-within-cooldown',
          missing: snapshot.missing,
          code: 'capture-skipped',
        });
        record.updatedAt = now;
        records.splice(records.findIndex(item => item.profileId === key), 1, record);
        await RhythiaX.saveDataRecord(record);
        return { saved: false, reason: 'duplicate-within-cooldown', snapshot: latest, record };
      }
      if (latest && !changed) {
        dataHistoryUpdateCollection(record, snapshot);
        dataHistoryAppendDiagnostic(record, {
          timestamp: now,
          source: snapshot.source,
          status: snapshot.status,
          reason: 'duplicate-data',
          missing: snapshot.missing,
          code: 'capture-skipped',
        });
        record.updatedAt = now;
        records.splice(records.findIndex(item => item.profileId === key), 1, record);
        await RhythiaX.saveDataRecord(record);
        return { saved: false, reason: 'duplicate-data', snapshot: latest, record };
      }
      const limit = dataHistoryEffectiveLimit(openDay, settings);
      if (openDay.captures.length >= limit) openDay.captures.shift();
      openDay.captures.push(snapshot);
    }
    openDay.lastUpdatedAt = now;
    dataHistoryUpdateCollection(record, dataHistoryLatest(openDay));
    dataHistoryAppendDiagnostic(record, {
      timestamp: now,
      source: snapshot.source,
      status: snapshot.status,
      reason: sameVisitIndex >= 0 ? 'merged-visit' : 'saved',
      missing: snapshot.missing,
      code: snapshot.status === 'complete' ? 'capture-saved' : 'capture-partial',
    });
    record.updatedAt = now;
    const existingIndex = records.findIndex(item => item.profileId === key);
    if (existingIndex >= 0) records.splice(existingIndex, 1, record);
    else records.push(record);
    records.forEach(item => dataHistoryPruneByAge(item, settings, now));
    const report = dataHistoryEnforceLimits(records, settings);
    const changedRecords = dataHistoryChangedIds(before, records);
    await Promise.all(changedRecords.map(item => RhythiaX.saveDataRecord(item)));
    return {
      saved: changedRecords.some(item => item.profileId === key),
      snapshot,
      record,
      report,
      openDayCount: openDay.captures.length,
      openDayLimit: dataHistoryEffectiveLimit(openDay, settings),
    };
  });
};

RhythiaX.recordProfileDataDiagnostic = function (profileId, details = {}) {
  if (!profileId) return Promise.resolve(null);
  return dataHistoryWrite(async () => {
    const record = await RhythiaX.getDataRecord(profileId);
    if (!record) return null;
    const timestamp = Number(details.timestamp) || Date.now();
    dataHistoryAppendDiagnostic(record, {
      timestamp,
      source: details.source || 'api',
      status: details.status || 'error',
      reason: details.reason || 'collection-error',
      missing: details.missing || record.collection?.missing || [],
      code: details.code || 'collection-error',
    });
    record.collection = {
      ...record.collection,
      status: details.collectionStatus || (record.collection?.status === 'complete' ? 'partial' : record.collection?.status || 'partial'),
      lastAttemptAt: timestamp,
    };
    return RhythiaX.saveDataRecord(record);
  });
};

RhythiaX.setDataOpenDayLimitForToday = function (profileId, limit) {
  return dataHistoryWrite(async () => {
    const record = await RhythiaX.getDataRecord(profileId);
    if (!record?.history?.openDay || record.history.openDay.date !== dataHistoryToday()) return null;
    const normalizedLimit = Number(limit);
    if (!Number.isFinite(normalizedLimit) || normalizedLimit < 1) return record;
    record.history.openDay.limitOverride = Math.round(normalizedLimit);
    return RhythiaX.saveDataRecord(record);
  });
};

RhythiaX.getDataReferenceSnapshot = function (record, mode, currentSnapshot, metricKey) {
  const current = currentSnapshot || dataHistoryLatest(record?.history?.openDay);
  if (!current) return null;
  if (mode === 'firstSnapshotToday') {
    const captures = record?.history?.openDay?.captures || [];
    if (!metricKey) return captures[0] || null;
    const currentIndex = captures.findIndex(snapshot => snapshot.id === current.id);
    const earlier = currentIndex >= 0
      ? captures.slice(0, currentIndex)
      : captures.filter(snapshot => Number(snapshot.capturedAt) < Number(current.capturedAt));
    return earlier.find(snapshot => {
      const value = snapshot.metrics?.[metricKey];
      return value !== null && value !== undefined && Number.isFinite(Number(value));
    }) || null;
  }
  if (mode === 'previousCapture') {
    const captures = record?.history?.openDay?.captures || [];
    return captures.length > 1 ? captures[captures.length - 2] : null;
  }
  const previousDate = dataHistoryPreviousDate(current.date);
  return record?.history?.daily?.[previousDate] || null;
};

RhythiaX.getDataDailyHistory = function (record) {
  return Object.values(record?.history?.daily || {})
    .sort((left, right) => String(left.date).localeCompare(String(right.date)));
};

RhythiaX.closeDataRecordOpenDay = dataHistoryCloseOpenDay;
RhythiaX.closeOpenDay = dataHistoryCloseOpenDay;

RhythiaX.getDataHistorySummary = async function () {
  const settings = await RhythiaX.getDataSettings();
  const records = await RhythiaX.listDataRecords();
  const dailyCount = records.reduce((sum, record) => sum + Object.keys(record.history.daily || {}).length, 0);
  const openCaptureCount = records.reduce((sum, record) => sum + (record.history.openDay?.captures?.length || 0), 0);
  return {
    profileCount: records.length,
    dailyCount,
    openCaptureCount,
    bytes: dataHistoryBytes(records),
    openDayBytes: dataHistoryOpenBytes(records),
    settings,
    records,
  };
};
