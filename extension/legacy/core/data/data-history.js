// =============================================
// Reimagined for Rhythia — Open-day and daily history engine
// =============================================

var RhythiaX = RhythiaX || {};

function dataHistoryClone(value) {
  return RhythiaX.cloneDataValue ? RhythiaX.cloneDataValue(value) : JSON.parse(JSON.stringify(value));
}

function dataHistoryBytes(value) {
  const serialized = JSON.stringify(value || {});
  if (typeof Blob === 'function') return new Blob([serialized]).size;
  return serialized.length;
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
    record.history.openDay = { date: today, captures: [], lastUpdatedAt: null };
    return true;
  }
  if (record.history.openDay.date === today) return false;
  dataHistoryCloseOpenDay(record);
  record.history.openDay = { date: today, captures: [], lastUpdatedAt: null };
  return true;
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

// Drops daily entries and an open day from before the 90 days that are kept. True when anything went.
function dataHistoryPruneByAge(record, now) {
  const cutoff = new Date(now);
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - 89);
  const cutoffDate = RhythiaX.localDateKey(cutoff);
  const before = Object.keys(record.history.daily).length;
  record.history.daily = Object.fromEntries(Object.entries(record.history.daily).filter(([date]) => date >= cutoffDate));
  let changed = Object.keys(record.history.daily).length !== before;
  if (record.history.openDay?.date < cutoffDate) {
    record.history.openDay = null;
    changed = true;
  }
  return changed;
}

function dataHistoryOpenBytes(records) {
  return records.reduce((sum, record) => sum + dataHistoryBytes(record.history?.openDay), 0);
}

function dataHistoryOldestCapture(records) {
  return records
    .filter(record => (record.history?.openDay?.captures?.length || 0) > 0)
    .map(record => ({
      record,
      capture: record.history.openDay.captures[0],
    }))
    .sort((left, right) => (left.capture.capturedAt || 0) - (right.capture.capturedAt || 0))[0] || null;
}

// The removals below return how many bytes the stored JSON loses: the entry, plus the comma that went with
// it while another entry remains.
function dataHistoryShiftCapture(record) {
  const captures = record.history.openDay.captures;
  const bytes = dataHistoryBytes(captures[0]) + (captures.length > 1 ? 1 : 0);
  captures.shift();
  return bytes;
}

function dataHistoryDeleteDaily(record, date) {
  const daily = record.history.daily;
  // The key with its quotes (the JSON of the date string), its colon, then the entry.
  const bytes = dataHistoryBytes(date) + 1 + dataHistoryBytes(daily[date]) + (Object.keys(daily).length > 1 ? 1 : 0);
  delete daily[date];
  return bytes;
}

// Removes the oldest history until the open days fit openDayMaxMb and all records fit maxStorageMb: open-day
// captures oldest first, then daily entries oldest first, then open-day captures, then whole records least
// recently updated first. Sizes are measured once and reduced as entries go, so the work stays linear in the
// size of the history however much has to go. Records it changes are added to changed.
function dataHistoryEnforceLimits(records, settings, changed = new Set()) {
  const report = {
    removedDaily: 0,
    removedOpenCaptures: 0,
    storageOverflow: false,
    openDayOverflow: false,
  };
  const openLimit = settings.openDayMaxMb * 1024 * 1024;
  let openBytes = dataHistoryOpenBytes(records);
  while (openBytes > openLimit) {
    const candidate = dataHistoryOldestCapture(records);
    if (!candidate) {
      report.openDayOverflow = true;
      break;
    }
    openBytes -= dataHistoryShiftCapture(candidate.record);
    changed.add(candidate.record);
    report.removedOpenCaptures++;
  }

  const maxBytes = settings.maxStorageMb * 1024 * 1024;
  let total = dataHistoryBytes(records);
  if (total <= maxBytes) return report;
  const sizes = new Map(records.map(record => [record, dataHistoryBytes(record)]));
  const dailies = records
    .flatMap(record => Object.entries(record.history?.daily || {}).map(([date, snapshot]) => ({ record, date, snapshot })))
    .sort((left, right) => (left.snapshot.capturedAt || 0) - (right.snapshot.capturedAt || 0));
  let nextDaily = 0;
  while (total > maxBytes) {
    let record = null;
    let removed = 0;
    if (nextDaily < dailies.length) {
      const candidate = dailies[nextDaily++];
      record = candidate.record;
      removed = dataHistoryDeleteDaily(record, candidate.date);
      report.removedDaily++;
    } else {
      const captureCandidate = dataHistoryOldestCapture(records);
      if (captureCandidate) {
        record = captureCandidate.record;
        removed = dataHistoryShiftCapture(record);
        report.removedOpenCaptures++;
      }
    }
    if (record) {
      sizes.set(record, sizes.get(record) - removed);
      total -= removed;
      changed.add(record);
      continue;
    }
    const oldestRecord = records.slice().sort((a, b) => a.updatedAt - b.updatedAt)[0];
    if (oldestRecord) {
      total -= sizes.get(oldestRecord) + (records.length > 1 ? 1 : 0);
      records.splice(records.indexOf(oldestRecord), 1);
      continue;
    }
    report.storageOverflow = true;
    break;
  }
  return report;
}

// Saves the records in changed that are still kept and removes the listed records the limits dropped, in one
// commit through the background (RhythiaX.commitDataRecords; since: a Clear history mark, see there).
// Returns the records saved ([] in a tab the extension has left, which writes nothing), or null when another
// tab saved or removed one of them since the listing; then nothing was written.
async function dataHistorySaveChanges(records, listed, changed, since) {
  const put = records.filter(record => changed.has(record));
  const remove = listed.filter(record => !records.includes(record));
  const result = await RhythiaX.commitDataRecords({ put, remove, since });
  if (result?.conflict) return null;
  return result?.committed ? put : [];
}

// What a task below answers when its commit met a record another tab changed since it was read.
const DATA_HISTORY_CONFLICT = Symbol('history-conflict');
const DATA_HISTORY_ATTEMPTS = 3;

// Runs task on a fresh read (read: the listing of every record, by default) and, while another tab's save
// gets in between, reads again and runs it again: DATA_HISTORY_ATTEMPTS times in all, then it gives up.
async function dataHistoryWithFreshRecords(task, read = () => RhythiaX.listDataRecords()) {
  for (let attempt = 0; attempt < DATA_HISTORY_ATTEMPTS; attempt++) {
    const result = await task(await read());
    if (result !== DATA_HISTORY_CONFLICT) return result;
  }
  return { saved: false, reason: 'conflict' };
}

// Applies the age and size limits to every stored record and saves what changed. Returns the records as they
// are now, null while local data is read-only, or { saved: false, reason: 'conflict' }.
async function dataHistoryMaintainRecords(now) {
  if (RhythiaX.dataStorageReadOnly) return null;
  const settings = await RhythiaX.getDataSettings();
  return dataHistoryWithFreshRecords(async records => {
    const listed = records.slice();
    const changed = new Set(records.filter(record => dataHistoryPruneByAge(record, now)));
    dataHistoryEnforceLimits(records, settings, changed);
    return await dataHistorySaveChanges(records, listed, changed) ? records : DATA_HISTORY_CONFLICT;
  });
}

async function dataHistoryMaintain(now = Date.now()) {
  await dataHistoryMaintainRecords(now);
}

// The write queue hands its task the previous write's result, so the task takes no argument of its own.
RhythiaX.maintainDataHistory = () => dataHistoryWrite(() => dataHistoryMaintain());

function dataHistoryWrite(task) {
  return RhythiaX.dataCanonicalWrite(task);
}

// Repair only positively identified cross-profile captures. Three independent
// cumulative values must match a different player's record for the same day.
// The RP tolerance allows for the native header's integer display.
RhythiaX.removeForeignProfileCaptures = function (record, records) {
  const captures = record?.history?.openDay?.captures;
  if (!captures?.length) return 0;
  const foreign = records.filter(other => other.profileId !== record.profileId)
    .flatMap(other => [...(other.history?.openDay?.captures || []), ...Object.values(other.history?.daily || {})]);
  const matches = capture => foreign.some(other => {
    const a = capture.metrics, b = other.metrics;
    return capture.date === other.date && a && b
      && Number(a.playCount) > 0 && Number(a.squaresHit) > 0
      && Number(a.weightedRp) > 0 && Number(b.weightedRp) > 0
      && a.playCount === b.playCount && a.squaresHit === b.squaresHit
      && Math.abs(a.weightedRp - b.weightedRp) <= 1;
  });
  const invalid = new Set(captures.filter(matches));
  const visits = new Set([...invalid].map(capture => capture.visitId).filter(Boolean));
  // Recovery can start a second visit milliseconds after the bad DOM capture.
  // Its API counters are valid, but its DOM-derived accuracy is still tainted.
  // Keep those counters and clear only the positively associated accuracy.
  let sanitized = 0;
  for (const capture of captures) {
    if (invalid.has(capture) || visits.has(capture.visitId)) continue;
    if (!['api', 'merged'].includes(capture.source)) continue;
    if ([...invalid].some(bad => bad.metrics.avgAccuracy != null
      && capture.metrics.avgAccuracy === bad.metrics.avgAccuracy
      && capture.capturedAt >= bad.capturedAt && capture.capturedAt - bad.capturedAt <= 15000)) {
      capture.metrics.avgAccuracy = null;
      capture.missing = [...new Set([...(capture.missing || []), 'avgAccuracy'])];
      capture.status = 'partial';
      sanitized++;
    }
  }
  record.history.openDay.captures = captures.filter(capture => !invalid.has(capture) && !visits.has(capture.visitId));
  return captures.length - record.history.openDay.captures.length + sanitized;
};

RhythiaX.recordProfileDataCapture = function (profileId, player, scoreSets, options = {}) {
  if (!profileId || typeof RhythiaX.collectDataSnapshot !== 'function') return Promise.resolve(null);
  return dataHistoryWrite(async () => {
    if (options.isCurrentProfile && !options.isCurrentProfile()) return { saved: false, reason: 'stale-navigation' };
    if (player?.id != null && String(player.id) !== String(profileId)) return { saved: false, reason: 'profile-mismatch' };
    if (options.verifiedProfile && String(player?.userProfile?.id) !== String(profileId)) return { saved: false, reason: 'profile-mismatch' };
    const stored = await RhythiaX.getDataSettings();
    if (stored.syncMode === 'cloud-only') return { saved: false, reason: 'cloud-only' };
    // The module switches decide what is recorded: statHistory the statistics, rankingHistory the ranks. The
    // popup's "Rank and stat history" sets both, so with it off nothing is saved. The stored collectStats and
    // collectRanking (1.1, no control since) are replaced here; shared/data/data-migrations.js moved a 1.1
    // opt-out onto the switches.
    const settings = {
      ...stored,
      collectStats: RhythiaX.isModuleEnabled?.('statHistory') !== false,
      collectRanking: RhythiaX.isModuleEnabled?.('rankingHistory') !== false,
    };
    if (!settings.collectStats && !settings.collectRanking) return { saved: false, reason: 'collection-disabled' };
    const now = Number(options.capturedAt) || Date.now();
    // The page's numbers are read once. A Clear history from here on drops the capture (since), and each
    // attempt below starts from a fresh listing, so what another tab saved in between is kept.
    const since = RhythiaX.dataHistoryClearMark?.();
    const snapshot = RhythiaX.collectDataSnapshot({
      player,
      scoreSets,
      source: options.source || 'dom',
      visitId: options.visitId || '',
      capturedAt: now,
      settings,
    });
    const key = String(profileId);
    return dataHistoryWithFreshRecords(async records => {
      if (options.isCurrentProfile && !options.isCurrentProfile()) return { saved: false, reason: 'stale-navigation' };
      const listed = records.slice();
      // The age limit on every listed record; what it changes goes in the same commit as the capture.
      const touched = new Set(records.filter(item => dataHistoryPruneByAge(item, now)));
      let record = records.find(item => item.profileId === key);
      if (!record) {
        record = RhythiaX.createDataRecord(key, player, now);
        RhythiaX.registerDataRecord?.(record, records);
      }
      if (options.verifiedProfile) {
        const repaired = RhythiaX.removeForeignProfileCaptures(record, records);
        if (repaired) dataHistoryAppendDiagnostic(record, {
          timestamp: now, source: 'api', status: 'partial',
          reason: 'foreign-profile-captures-removed', code: 'profile-history-repaired', missing: [],
        });
      }
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
        if (latest && !changed) {
          // Nothing new to keep: the record notes the attempt, and the limits' changes are saved with it.
          const reason = elapsed < cooldownMs ? 'duplicate-within-cooldown' : 'duplicate-data';
          dataHistoryUpdateCollection(record, snapshot);
          dataHistoryAppendDiagnostic(record, {
            timestamp: now,
            source: snapshot.source,
            status: snapshot.status,
            reason,
            missing: snapshot.missing,
            code: 'capture-skipped',
          });
          record.updatedAt = now;
          touched.add(record);
          dataHistoryEnforceLimits(records, settings, touched);
          if (!await dataHistorySaveChanges(records, listed, touched, since)) return DATA_HISTORY_CONFLICT;
          return { saved: false, reason, snapshot: latest, record };
        }
        if (openDay.captures.length >= settings.maxSnapshotsPerDay) openDay.captures.shift();
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
      const changed = new Set([record, ...touched, ...records.filter(item => dataHistoryPruneByAge(item, now))]);
      const report = dataHistoryEnforceLimits(records, settings, changed);
      const savedRecords = await dataHistorySaveChanges(records, listed, changed, since);
      if (!savedRecords) return DATA_HISTORY_CONFLICT;
      return {
        saved: savedRecords.includes(record),
        snapshot,
        record,
        report,
        openDayCount: openDay.captures.length,
        openDayLimit: settings.maxSnapshotsPerDay,
      };
    });
  });
};

RhythiaX.recordProfileDataDiagnostic = function (profileId, details = {}) {
  if (!profileId) return Promise.resolve(null);
  return dataHistoryWrite(async () => {
    const settings = await RhythiaX.getDataSettings();
    if (settings.syncMode === 'cloud-only') return null;
    const timestamp = Number(details.timestamp) || Date.now();
    // Only this profile's record is read, again on each attempt.
    return dataHistoryWithFreshRecords(async record => {
      if (!record) return null;
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
      return await dataHistorySaveChanges([record], [record], new Set([record])) ? record : DATA_HISTORY_CONFLICT;
    }, () => RhythiaX.getDataRecord(profileId));
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


