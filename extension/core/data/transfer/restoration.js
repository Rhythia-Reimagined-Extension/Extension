// Preview and restore orchestration; repository and backup contracts stay external.
(function () {
  var RhythiaX = self.RhythiaX = self.RhythiaX || {};
  function scopedRecord(record, options = {}) {
    const next = RhythiaX.normalizeDataRecord(record, record?.profileId);
    if (options.includeTitleState === false) next.titleProgression.last = null;
    if (options.includeHistory === false) { next.history = { openDay: null, daily: {} }; return next; }
    const from = String(options.dateFrom || '').trim(); const to = String(options.dateTo || '').trim();
    if (from || to) {
      next.history.daily = Object.fromEntries(Object.entries(next.history.daily || {}).filter(([date]) => (!from || date >= from) && (!to || date <= to)));
      if (next.history.openDay && ((from && next.history.openDay.date < from) || (to && next.history.openDay.date > to))) next.history.openDay = null;
    }
    return next;
  }
  function importedDataSettings(settings) {
    const deviceLocal = ['localBackupEnabled', 'localBackupSchedule', 'localBackupCopyCount', 'localBackupIncludeAppSettings', 'localBackupIntervalDays'];
    const allowed = Object.keys(RhythiaX.DATA_DEFAULT_SETTINGS || {});
    return Object.keys(settings || {}).reduce((patch, key) => {
      if (allowed.includes(key) && !deviceLocal.includes(key)) patch[key] = settings[key];
      return patch;
    }, {});
  }
  async function saveAppSettings(appSettings) {
    if (!appSettings || typeof appSettings !== 'object') return;
    const keyMap = {
      rhythiaxModules: 'modules',
      rhythiaxModuleOptions: 'moduleOptions',
      rhythiaxTheme: 'theme',
      rhythiaxPopupSize: 'popupSize',
      rhythiaxPopupSizeVersion: 'popupSizeVersion',
    };
    const settings = Object.keys(keyMap).reduce((values, key) => {
      if (appSettings[key] !== undefined) values[keyMap[key]] = appSettings[key];
      return values;
    }, {});
    if (!Object.keys(settings).length) return;
    await RhythiaX.StorageMutationBridge.appSettingsReplace(settings);
  }
  RhythiaX.DataTransferRestoration = {
    async getPreview(input) {
      let prepared = input;
      if (typeof input === 'string') { try { prepared = JSON.parse(input); } catch (_) { /* validator reports invalid JSON */ } }
      if (prepared && (Number(prepared.schemaVersion) < Number(RhythiaX.DATA_SCHEMA_VERSION) || Number(prepared.exportVersion) < Number(RhythiaX.DATA_EXPORT_VERSION)) && typeof RhythiaX.migrateDataExportPayload === 'function') {
        try { prepared = await RhythiaX.migrateDataExportPayload(prepared); } catch (error) { return { ok: false, errors: [String(error?.message || error)], records: [], conflicts: [] }; }
      }
      const validation = RhythiaX.DataTransferValidation.validateExport(prepared);
      if (!validation.ok) return validation;
      const existing = await RhythiaX.listDataRecords(); const existingById = new Map(existing.map(record => [record.profileId, record]));
      const conflicts = validation.records.filter(record => existingById.has(record.profileId)).map(record => record.profileId);
      const merge = RhythiaX.DataTransferConflictPolicy.mergeRecords(existing, validation.records);
      return { ...validation, conflicts, added: merge.added, updated: merge.updated, profileCount: validation.records.length, dailyCount: validation.records.reduce((sum, record) => sum + Object.keys(record.history.daily).length, 0), openCaptureCount: validation.records.reduce((sum, record) => sum + (record.history.openDay?.captures.length || 0), 0) };
    },
    async importExport(input, options = {}) {
      const preview = await this.getPreview(input);
      if (!preview.ok) return preview;
      const repairRequested = options.allowRepair === true && RhythiaX.getDataStorageHealth?.().readOnly === true;
      if (repairRequested && (options.mode !== 'replace' || options.profileIds?.length || options.includeHistory === false || options.includeTitleState === false || options.dateFrom || options.dateTo)) return { ...preview, ok: false, errors: ['Repair requires a full Replace restore of every profile, history, and Title Progression state.'] };
      let records = options.profileIds?.length ? preview.records.filter(record => options.profileIds.includes(record.profileId)) : preview.records;
      records = records.map(record => scopedRecord(record, options));
      const existing = await RhythiaX.listDataRecords();
      if (options.createRecovery === true && typeof RhythiaX.createRecoveryBackup === 'function') {
        try { const recovery = await RhythiaX.createRecoveryBackup(); if (!recovery.ok) return { ...preview, ok: false, errors: [`Restore safety backup was not created: ${recovery.reason || 'unknown error'}.`] }; }
        catch (error) { return { ...preview, ok: false, errors: [`Restore safety backup was not created: ${String(error?.message || error)}.`] }; }
      }
      let merge;
      if (options.mode === 'replace') {
        const selectedIds = new Set(records.map(record => String(record.profileId))); const imported = new Map(records.map(record => [String(record.profileId), record]));
        const replaced = existing.map(record => {
          const incoming = imported.get(String(record.profileId)); if (!incoming) return record;
          const selected = scopedRecord(incoming, options); const current = RhythiaX.normalizeDataRecord(record, record.profileId);
          if (options.includeHistory === false) selected.history = current.history;
          if (options.includeHistory === false && options.includeTitleState === false) return current;
          if ((options.dateFrom || options.dateTo) && options.includeHistory !== false) { selected.history.daily = { ...current.history.daily, ...selected.history.daily }; if (!selected.history.openDay && current.history.openDay && ((options.dateFrom && current.history.openDay.date < options.dateFrom) || (options.dateTo && current.history.openDay.date > options.dateTo))) selected.history.openDay = current.history.openDay; }
          if (options.includeTitleState === false) selected.titleProgression.last = current.titleProgression.last;
          return RhythiaX.normalizeDataRecord(selected, current.profileId);
        });
        const additions = records.filter(record => !existing.some(item => String(item.profileId) === String(record.profileId)));
        merge = { records: [...replaced, ...additions], added: additions.map(record => record.profileId), updated: [...selectedIds] };
      } else merge = RhythiaX.DataTransferConflictPolicy.mergeRecords(existing, records);
      const settingsIncluded = options.includeSettings === true && preview.settings; const importedIds = new Set(records.map(record => record.profileId));
      const toSave = merge.records.filter(record => importedIds.has(record.profileId));
      const restore = async () => {
         const savedIds = [];
         try {
           if (repairRequested) await RhythiaX.clearDataRecords({ allowRepair: true });
           for (const record of toSave) { await RhythiaX.saveDataRecord(record, { allowRepair: repairRequested }); savedIds.push(record.profileId); }
           let settings = null;
           if (settingsIncluded) settings = await RhythiaX.StorageMutationBridge.dataSettingsPatch(importedDataSettings(preview.settings));
           if (options.includeAppSettings === true) await saveAppSettings(preview.payload?.appSettings);
           if (repairRequested) { await RhythiaX.validateCurrentDataStorage?.(); await RhythiaX.markDataStorageHealthy?.(); }
           return { ...preview, imported: records.length, saved: importedIds.size, settings, mode: options.mode || 'merge' };
         } catch (error) {
           try {
             if (repairRequested) for (const record of existing) await RhythiaX.saveDataRecord(record, { allowRepair: true });
             else for (const profileId of savedIds) {
               const previous = existing.find(record => record.profileId === profileId);
               if (previous) await RhythiaX.saveDataRecord(previous);
               else await RhythiaX.removeDataRecord(profileId);
             }
           } catch (_) { /* The recovery backup remains the final fallback if rollback also fails. */ }
           return { ...preview, ok: false, errors: [`Restore failed without completing: ${String(error?.message || error)}`] };
         }
      };
      return RhythiaX.dataCanonicalWrite ? RhythiaX.dataCanonicalWrite(restore) : restore();
    },
  };
}());
