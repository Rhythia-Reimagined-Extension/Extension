// Export serialization: emits only normalized canonical records.
(function () {
  var RhythiaX = self.RhythiaX = self.RhythiaX || {};

  RhythiaX.DataTransferSerialization = {
    clone(value) { return RhythiaX.cloneDataValue(value); },
    object(value) { return value && typeof value === 'object' && !Array.isArray(value); },
    diagnostic(diagnostic) {
      if (!this.object(diagnostic)) return null;
      const timestamp = Number(diagnostic.timestamp || diagnostic.capturedAt || diagnostic.at);
      return {
        timestamp: Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now(),
        source: String(diagnostic.source || '').slice(0, 32), status: String(diagnostic.status || '').slice(0, 32),
        reason: String(diagnostic.reason || '').slice(0, 120),
        missing: Array.isArray(diagnostic.missing) ? [...new Set(diagnostic.missing.filter(key => RhythiaX.DATA_METRIC_KEYS.includes(key)))].slice(0, 20) : [],
        code: String(diagnostic.code || '').slice(0, 64),
      };
    },
    safeRecord(record, options = {}) {
      const cloned = this.clone(record);
      const referenceNow = Number(options.now) || Date.now();
      if (RhythiaX.rollRecordOpenDay) RhythiaX.rollRecordOpenDay(cloned, referenceNow);
      const normalized = RhythiaX.normalizeDataRecord(cloned, cloned?.profileId);
      if (!normalized.profileId) return null;
      if (!options.includeOpenDay) normalized.history.openDay = null;
      if (!options.includeTitleState) normalized.titleProgression.last = null;
      normalized.collection.diagnostics = options.includeDiagnostics
        ? normalized.collection.diagnostics.map(item => this.diagnostic(item)).filter(Boolean).slice(-5) : [];
      return normalized;
    },
    createExport(records, options = {}) {
      const scope = options.scope || 'all';
      const selectedIds = new Set((options.profileIds || []).map(id => String(id)));
      const includeOpenDay = options.includeOpenDay === true || scope === 'open-day';
      const includeTitleState = options.includeTitleState !== false && scope !== 'daily';
      const includeDiagnostics = options.includeDiagnostics === true;
      const exportTime = Number(options.now) || Date.now();
      const sourceRecords = (Array.isArray(records) ? records : [])
        .filter(record => scope !== 'profile' || selectedIds.has(String(record.profileId)))
        .map(record => this.safeRecord(record, { includeOpenDay, includeTitleState, includeDiagnostics, now: exportTime })).filter(Boolean);
      if (scope === 'daily') sourceRecords.forEach(record => {
        if (RhythiaX.rollRecordOpenDay) RhythiaX.rollRecordOpenDay(record, exportTime);
        record.history.openDay = null;
        record.titleProgression.last = null;
      });
      const payload = {
        type: RhythiaX.DATA_EXPORT_TYPE, exportVersion: RhythiaX.DATA_EXPORT_VERSION, schemaVersion: RhythiaX.DATA_SCHEMA_VERSION,
        exportedAt: exportTime, source: 'local',
        scope: { type: scope, profileIds: sourceRecords.map(record => record.profileId), includeOpenDay, includeTitleState, includeDiagnostics, includeSettings: options.includeSettings === true },
        records: sourceRecords,
      };
      if (options.includeSettings === true && options.settings) payload.settings = RhythiaX.normalizeDataSettings(options.settings);
      if (options.appSettings && typeof options.appSettings === 'object') payload.appSettings = this.clone(options.appSettings);
      return payload;
    },
  };
}());
