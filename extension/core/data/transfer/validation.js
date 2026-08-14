// Import validation and normalization form the untrusted-data boundary.
(function () {
  var RhythiaX = self.RhythiaX = self.RhythiaX || {};
  const forbiddenKey = /(^|_|-)(token|cookie|session|authorization|password|secret|request|headers?|body|credential|credentials|auth|api[_-]?key|jwt|raw(?:error)?|private)(_|-|$)/i;
  const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
  const MAX_IMPORT_RECORDS = 1000;
  const MAX_IMPORT_DAILY_PER_RECORD = 10000;
  const MAX_IMPORT_OPEN_CAPTURES_PER_RECORD = 5000;
  const MAX_IMPORT_SNAPSHOTS = 100000;
  function hasForbiddenKey(value, path = '$', depth = 0) {
    if (depth > 24) return `${path} exceeds the maximum nesting depth`;
    if (!value || typeof value !== 'object') return null;
    for (const [key, child] of Object.entries(value)) {
      if (forbiddenKey.test(key)) return `${path}.${key}`;
      const found = hasForbiddenKey(child, `${path}.${key}`, depth + 1);
      if (found) return found;
    }
    return null;
  }
  RhythiaX.DataTransferValidation = {
    validateExport(input) {
      let payload = input;
      if (typeof input === 'string') {
        if (input.length > MAX_IMPORT_BYTES) return { ok: false, errors: ['The import file is too large.'], records: [], conflicts: [] };
        try { payload = JSON.parse(input); } catch (_) { return { ok: false, errors: ['The file is not valid JSON.'], records: [], conflicts: [] }; }
      }
      if (!RhythiaX.DataTransferSerialization.object(payload)) return { ok: false, errors: ['The export must be a JSON object.'], records: [], conflicts: [] };
      if (Array.isArray(payload.records) && payload.records.length > MAX_IMPORT_RECORDS) return { ok: false, errors: ['The export contains too many records.'], records: [], conflicts: [] };
      const forbiddenPath = hasForbiddenKey(payload);
      if (forbiddenPath) return { ok: false, errors: [`Sensitive field is not allowed: ${forbiddenPath}`], records: [], conflicts: [] };
      const errors = [];
      if (payload.type !== RhythiaX.DATA_EXPORT_TYPE) errors.push('Unsupported export type.');
      if (Number(payload.schemaVersion) !== RhythiaX.DATA_SCHEMA_VERSION) errors.push('Unsupported schemaVersion.');
      if (Number(payload.exportVersion) !== RhythiaX.DATA_EXPORT_VERSION) errors.push('Unsupported exportVersion.');
      if (payload.source !== 'local') errors.push('Only local exports can be imported.');
      if (Object.prototype.hasOwnProperty.call(payload, 'backupVersion')) {
        const supportedVersions = RhythiaX.DATA_BACKUP_SUPPORTED_VERSIONS || [RhythiaX.DATA_BACKUP_VERSION];
        if (!supportedVersions.includes(Number(payload.backupVersion))) errors.push('Unsupported backupVersion.');
        if (!['stable-only', 'manual', 'recovery'].includes(payload.backupPolicy)) errors.push('Unsupported backupPolicy.');
        if (payload.backupPolicy === 'stable-only' && payload.scope?.includeOpenDay !== false) errors.push('Stable backups cannot include open-day data.');
        if (payload.scope?.includeDiagnostics !== false) errors.push('Backups cannot include diagnostics.');
      }
      if (!Array.isArray(payload.records)) errors.push('The export records must be an array.');
      else if (payload.records.length > MAX_IMPORT_RECORDS) errors.push('The export contains too many records.');
      if (errors.length) return { ok: false, errors, records: [], conflicts: [] };
      const records = []; let snapshotCount = 0;
      payload.records.forEach((record, index) => {
        if (!RhythiaX.DataTransferSerialization.object(record)) { errors.push(`Record ${index + 1} must be an object.`); return; }
        const profileId = String(record.profileId || '').trim();
        if (Number(record.schemaVersion) !== RhythiaX.DATA_SCHEMA_VERSION) { errors.push(`Record ${index + 1} has an unsupported schemaVersion.`); return; }
        const validateSnapshot = (snapshot, label) => {
          if (!RhythiaX.DataTransferSerialization.object(snapshot)) { errors.push(`${label} must be an object.`); return; }
          if (!Number.isFinite(Number(snapshot.capturedAt)) || Number(snapshot.capturedAt) <= 0) errors.push(`${label} has an invalid capturedAt.`);
          if (snapshot.status !== undefined && !RhythiaX.DATA_SNAPSHOT_STATUSES.includes(snapshot.status)) errors.push(`${label} has an invalid status.`);
          if (snapshot.source !== undefined && !RhythiaX.DATA_SNAPSHOT_SOURCES.includes(snapshot.source)) errors.push(`${label} has an invalid source.`);
          const metrics = snapshot.metrics && typeof snapshot.metrics === 'object' ? snapshot.metrics : {};
          RhythiaX.DATA_METRIC_KEYS.forEach(key => {
            const value = Object.prototype.hasOwnProperty.call(metrics, key) ? metrics[key] : snapshot[key];
            if (value !== undefined && value !== null && value !== '' && value !== '—' && !Number.isFinite(Number(value))) errors.push(`${label}.${key} must be a number or null.`);
            if (value !== undefined && value !== null && value !== '' && value !== '—' && RhythiaX.DATA_NON_NEGATIVE_METRICS.has(key) && Number(value) < 0) errors.push(`${label}.${key} cannot be negative.`);
          });
        };
        const rawHistory = record.history && typeof record.history === 'object' ? record.history : {};
        const rawDaily = rawHistory.daily && typeof rawHistory.daily === 'object' ? rawHistory.daily : {};
        if (Object.keys(rawDaily).length > MAX_IMPORT_DAILY_PER_RECORD) { errors.push(`Record ${index + 1} contains too many daily snapshots.`); return; }
        const openCaptures = Array.isArray(rawHistory.openDay?.captures) ? rawHistory.openDay.captures : [];
        if (openCaptures.length > MAX_IMPORT_OPEN_CAPTURES_PER_RECORD) { errors.push(`Record ${index + 1} contains too many open-day captures.`); return; }
        snapshotCount += Object.keys(rawDaily).length + openCaptures.length;
        if (snapshotCount > MAX_IMPORT_SNAPSHOTS) { errors.push('The export contains too many snapshots.'); return; }
        Object.entries(rawDaily).forEach(([date, snapshot]) => { if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || snapshot?.date !== date) errors.push(`Record ${index + 1} has an invalid daily date.`); validateSnapshot(snapshot, `Record ${index + 1} daily ${date}`); });
        if (rawHistory.openDay !== undefined && rawHistory.openDay !== null) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(String(rawHistory.openDay.date || ''))) errors.push(`Record ${index + 1} has an invalid open-day date.`);
          openCaptures.forEach((snapshot, captureIndex) => { validateSnapshot(snapshot, `Record ${index + 1} open capture ${captureIndex + 1}`); if (snapshot?.date !== rawHistory.openDay.date) errors.push(`Record ${index + 1} has an open capture date mismatch.`); });
        }
        if (record.titleProgression?.last) {
          const title = record.titleProgression.last;
          if (!Number.isFinite(Number(title.capturedAt)) || Number(title.capturedAt) <= 0) errors.push(`Record ${index + 1} has an invalid title capturedAt.`);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(String(title.date || ''))) errors.push(`Record ${index + 1} has an invalid title date.`);
          ['rp', 'globalRank'].forEach(key => { if (title[key] !== undefined && title[key] !== null && title[key] !== '' && !Number.isFinite(Number(title[key]))) errors.push(`Record ${index + 1} title ${key} must be a number or null.`); });
        }
        const normalized = RhythiaX.normalizeDataRecord(record, profileId);
        if (!profileId || !normalized.profileId) { errors.push(`Record ${index + 1} has no profileId.`); return; }
        if (normalized.profileId !== profileId) { errors.push(`Record ${index + 1} has an invalid profileId.`); return; }
        records.push(normalized);
      });
      return { ok: errors.length === 0, errors, records, settings: payload.settings || null, payload };
    },
  };
}());
