// Backup workflows compose policy, payload, handle, and file providers.
async function backupServiceRecordsAndSettings() {
  await RhythiaX.dataRepositoryReady;
  const [records, settings, appSettings] = await Promise.all([RhythiaX.listDataRecords(), RhythiaX.getDataSettings(), backupPolicyAppSettings()]);
  return { records, settings, appSettings };
}

async function backupServiceValidateWrittenPayload(payload) {
  const validation = await RhythiaX.prepareDataExport?.(payload) || RhythiaX.validateDataExport(payload);
  if (!validation?.ok || !Array.isArray(validation.records)) throw new Error('The backup payload failed validation.');
  return validation;
}

function backupServiceSummary(payload) {
  return {
    recordCount: payload.records.length,
    dailyCount: payload.records.reduce((sum, record) => sum + Object.keys(record.history.daily || {}).length, 0),
    titleCount: payload.records.filter(record => record.titleProgression?.last).length,
  };
}

async function backupServiceWriteAutomaticPayload(payload) {
  const validation = RhythiaX.validateDataExport?.(payload);
  if (!validation?.ok || payload?.backupPolicy !== 'stable-only') throw new Error('The local backup payload is not a valid automatic backup.');
  const rootHandle = await backupHandleGet();
  if (!rootHandle) return { ok: false, reason: 'setup-required' };
  const directories = await backupFileResolveDirectories(rootHandle, true, true);
  if (directories?.permissionRequired) return { ok: false, reason: 'permission-required' };
  const settings = await RhythiaX.getDataSettings();
  const state = await backupPolicyGetState();
  const rotated = await backupFileRotateAutomatic(directories, payload, state, settings.localBackupCopyCount);
  await backupServiceValidateWrittenPayload(JSON.parse((await backupFileRead(directories.automatic, rotated.files[0])).raw));
  const next = await backupPolicySaveState({
    status: 'up-to-date', folderName: directories.folderName, automaticFiles: rotated.files,
    lastAttemptAt: Date.now(), lastSuccessAt: Date.now(), lastFingerprint: backupPayloadFingerprint(payload), lastError: '',
    ...backupServiceSummary(payload), automaticBytes: rotated.bytes,
  });
  return { ok: true, bytes: rotated.bytes, folderName: directories.folderName, fileName: rotated.files[0], state: next };
}

async function backupServiceRunAutomatic(force = false) {
  const settings = await RhythiaX.getDataSettings();
  const state = await backupPolicyGetState();
  const schedule = settings.localBackupSchedule;
  if (!settings.localBackupEnabled || schedule === 'manual') return { ok: false, reason: 'manual-only' };
  const rootHandle = await backupHandleGet();
  if (!rootHandle) { await backupPolicySaveState({ status: 'setup-required' }); return { ok: false, reason: 'setup-required' }; }
  const now = Date.now();
  const due = !state.lastSuccessAt || now - Number(state.lastSuccessAt) >= (Number(schedule) || 1) * 24 * 60 * 60 * 1000;
  if (!force && !due) return { ok: true, skipped: true, reason: 'not-due', state };
  try {
    const directories = await backupFileResolveDirectories(rootHandle, true, true);
    if (directories?.permissionRequired) return { ok: false, reason: 'permission-required' };
    const { records, settings: currentSettings } = await backupServiceRecordsAndSettings();
    const payload = backupPayloadCreateStable(records, currentSettings, now);
    const fingerprint = backupPayloadFingerprint(payload);
    const automaticFiles = (await backupFileList(directories.automatic)).filter(file => backupPolicyIsAutomaticFile(file.name)).map(file => file.name);
    if (!force && state.lastFingerprint === fingerprint && automaticFiles.includes(backupPolicyAutomaticFileName(0))) {
      await backupPolicySaveState({ status: 'up-to-date', folderName: directories.folderName, lastAttemptAt: now, lastError: '' });
      return { ok: true, skipped: true, reason: 'unchanged', state: await backupPolicyGetState() };
    }
    const rotated = await backupFileRotateAutomatic(directories, payload, state, settings.localBackupCopyCount);
    await backupServiceValidateWrittenPayload(JSON.parse((await backupFileRead(directories.automatic, rotated.files[0])).raw));
    const next = await backupPolicySaveState({
      status: 'up-to-date', folderName: directories.folderName, automaticFiles: rotated.files,
      lastAttemptAt: now, lastSuccessAt: now, lastFingerprint: fingerprint, lastError: '',
      ...backupServiceSummary(payload), automaticBytes: rotated.bytes,
    });
    return { ok: true, written: true, state: next, payload };
  } catch (error) {
    await backupPolicySaveState({ status: 'error', lastAttemptAt: now, lastError: String(error?.message || error).slice(0, 180) });
    return { ok: false, reason: 'error', error };
  }
}

async function backupServiceCreateManual(options = {}) {
  const rootHandle = await backupHandleGet();
  if (!rootHandle) return { ok: false, reason: 'setup-required' };
  const directories = await backupFileResolveDirectories(rootHandle, true, true);
  if (directories?.permissionRequired) return { ok: false, reason: 'permission-required' };
  const { records, settings, appSettings } = await backupServiceRecordsAndSettings();
  const now = Date.now();
  const payload = backupPayloadCreateManual(records, settings, { now, includeOpenDay: options.includeOpenDay === true, includeAppSettings: options.includeAppSettings === true, appSettings });
  const fileName = backupPolicyManualFileName(now);
  const written = await backupFileWrite(directories.manual, fileName, payload);
  await backupServiceValidateWrittenPayload(JSON.parse((await backupFileRead(directories.manual, fileName)).raw));
  const state = await backupPolicyGetState();
  const files = [...(state.manualFiles || []), { fileName, createdAt: now, bytes: written.bytes }];
  const next = await backupPolicySaveState({ status: 'up-to-date', folderName: directories.folderName, manualFiles: files, manualBytes: files.reduce((sum, item) => sum + Number(item.bytes || 0), 0), lastError: '' });
  return { ok: true, fileName, bytes: written.bytes, state: next, payload };
}

async function backupServiceCreateRecovery() {
  const rootHandle = await backupHandleGet();
  if (!rootHandle) return { ok: false, reason: 'setup-required' };
  const directories = await backupFileResolveDirectories(rootHandle, true, true);
  if (directories?.permissionRequired) return { ok: false, reason: 'permission-required' };
  const data = await backupServiceRecordsAndSettings();
  const now = Date.now();
  const payload = backupPayloadCreateRecovery(data.records, data.settings, data.appSettings, now);
  const fileName = backupPolicyRecoveryFileName(now);
  const written = await backupFileWrite(directories.recovery, fileName, payload);
  await backupServiceValidateWrittenPayload(JSON.parse((await backupFileRead(directories.recovery, fileName)).raw));
  const state = await backupPolicyGetState();
  const files = [...await backupFileCleanupRecovery(directories, state, now), { fileName, createdAt: now, bytes: written.bytes }];
  const next = await backupPolicySaveState({ status: 'up-to-date', folderName: directories.folderName, recoveryFiles: files, recoveryBytes: files.reduce((sum, item) => sum + Number(item.bytes || 0), 0), lastError: '' });
  return { ok: true, fileName, bytes: written.bytes, state: next, payload };
}

async function backupServiceStatus() {
  let state = await backupPolicyGetState();
  let hasHandle = false;
  let status = state.status;
  try {
    const rootHandle = await backupHandleGet();
    hasHandle = Boolean(rootHandle);
    if (!rootHandle && status === 'up-to-date') status = 'setup-required';
    if (rootHandle) {
      const directories = await backupFileResolveDirectories(rootHandle, true, false);
      if (directories?.permissionRequired) {
        hasHandle = false;
        status = 'permission-required';
      } else if (directories) {
        const [automaticDisk, manualDisk, recoveryDisk] = await Promise.all([backupFileList(directories.automatic), backupFileList(directories.manual), backupFileList(directories.recovery)]);
        const activeRecovery = await backupFileCleanupRecovery(directories, state);
        const automaticFiles = automaticDisk.filter(file => backupPolicyIsAutomaticFile(file.name)).map(file => file.name);
        const manualFiles = manualDisk.map(file => ({ fileName: file.name, createdAt: file.modifiedAt, bytes: file.bytes }));
        const recoveryFiles = activeRecovery.length ? activeRecovery : recoveryDisk.filter(file => file.modifiedAt > Date.now() - RhythiaX.DATA_BACKUP_RECOVERY_TTL_MS).map(file => ({ fileName: file.name, createdAt: file.modifiedAt, bytes: file.bytes }));
        state = await backupPolicySaveState({ automaticFiles, manualFiles, recoveryFiles, automaticBytes: automaticDisk.reduce((sum, file) => sum + Number(file.bytes || 0), 0), manualBytes: manualFiles.reduce((sum, item) => sum + Number(item.bytes || 0), 0), recoveryBytes: recoveryFiles.reduce((sum, item) => sum + Number(item.bytes || 0), 0) });
      }
    }
  } catch (_) {
    hasHandle = false;
    if (status === 'up-to-date') status = 'error';
  }
  return { ...state, status, hasHandle, totalBytes: Number(state.automaticBytes || 0) + Number(state.manualBytes || 0) + Number(state.recoveryBytes || 0) };
}

async function backupServiceChooseFolder() {
  if (typeof window === 'undefined' || typeof window.showDirectoryPicker !== 'function') {
    await backupPolicySaveState({ status: 'unsupported', lastError: 'This browser does not support a local backup folder picker.' });
    return { ok: false, reason: 'unsupported' };
  }
  try {
    const rootHandle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'rhythiax-local-backup' });
    await backupHandleStore(rootHandle);
    const directories = await backupFileResolveDirectories(rootHandle, true, true);
    if (directories?.permissionRequired) {
      await backupPolicySaveState({ status: 'permission-required', lastError: 'Folder access is required to create local backups.' });
      return { ok: false, reason: 'permission-required', rootHandle };
    }
    await backupPolicySaveState({ status: 'ready', folderName: directories.folderName, lastError: '' });
    const settings = await RhythiaX.getDataSettings();
    const result = settings.localBackupSchedule === 'manual' ? { ok: true, rootHandle } : await backupServiceRunAutomatic(true);
    return { ok: result.ok, rootHandle, configured: true, result, reason: result.reason };
  } catch (error) {
    if (error?.name === 'AbortError') return { ok: false, reason: 'cancelled' };
    try {
      await backupPolicySaveState({ status: 'error', lastError: String(error?.message || error).slice(0, 180) });
    } catch (_) { /* preserve the setup result even when status storage is unavailable */ }
    return { ok: false, reason: 'error', error };
  }
}

async function backupServiceReadAutomatic(slot = 0) {
  const rootHandle = await backupHandleGet();
  if (!rootHandle) return { ok: false, reason: 'setup-required' };
  try {
    const directories = await backupFileResolveDirectories(rootHandle, true, true);
    if (directories?.permissionRequired) return { ok: false, reason: 'permission-required' };
    const files = (await backupFileList(directories.automatic)).filter(file => backupPolicyIsAutomaticFile(file.name)).map(file => file.name);
    const result = await backupFileRead(directories.automatic, files.includes(backupPolicyAutomaticFileName(slot)) ? backupPolicyAutomaticFileName(slot) : (files[slot] || backupPolicyAutomaticFileName(slot)));
    const preview = await RhythiaX.getDataExportPreview(result.raw);
    if (!preview.ok) return { ok: false, reason: 'invalid', error: preview.errors.join(' ') };
    return { ok: true, raw: result.raw, payload: preview.payload || JSON.parse(result.raw), preview, fileName: result.fileName, bytes: result.file.size, modifiedAt: result.file.lastModified };
  } catch (error) { return { ok: false, reason: error?.name === 'NotFoundError' ? 'not-found' : 'invalid', ...(error?.name === 'NotFoundError' ? {} : { error: String(error?.message || error) }) }; }
}

async function backupServiceReadRecovery() {
  const rootHandle = await backupHandleGet();
  if (!rootHandle) return { ok: false, reason: 'setup-required' };
  try {
    const directories = await backupFileResolveDirectories(rootHandle, true, true);
    if (directories?.permissionRequired) return { ok: false, reason: 'permission-required' };
    const item = (await backupPolicyGetState()).recoveryFiles?.at(-1);
    if (!item) return { ok: false, reason: 'not-found' };
    if (Number(item.createdAt) <= Date.now() - RhythiaX.DATA_BACKUP_RECOVERY_TTL_MS) return { ok: false, reason: 'expired' };
    const result = await backupFileRead(directories.recovery, item.fileName);
    const preview = await RhythiaX.getDataExportPreview(result.raw);
    if (!preview.ok) return { ok: false, reason: 'invalid', error: preview.errors.join(' ') };
    return { ok: true, raw: result.raw, payload: preview.payload || JSON.parse(result.raw), preview, fileName: item.fileName, bytes: result.file.size, modifiedAt: result.file.lastModified };
  } catch (error) { return { ok: false, reason: error?.name === 'NotFoundError' ? 'not-found' : 'invalid', ...(error?.name === 'NotFoundError' ? {} : { error: String(error?.message || error) }) }; }
}

async function backupServiceForgetFolder() {
  await backupHandleClear();
  return backupPolicySaveState({ status: 'setup-required', folderName: '', lastError: '' });
}

async function backupServiceDeleteAll() {
  const rootHandle = await backupHandleGet();
  if (rootHandle) {
    try {
      const directories = await backupFileResolveDirectories(rootHandle, false, true);
      if (!directories?.permissionRequired) {
        const [automatic, manual, recovery] = await Promise.all([backupFileList(directories.automatic), backupFileList(directories.manual), backupFileList(directories.recovery)]);
        await Promise.all([
          ...automatic.filter(file => backupPolicyIsAutomaticFile(file.name)).map(file => backupFileDelete(directories.automatic, file.name)),
          ...manual.filter(file => backupPolicyIsManualFile(file.name)).map(file => backupFileDelete(directories.manual, file.name)),
          ...recovery.filter(file => backupPolicyIsRecoveryFile(file.name)).map(file => backupFileDelete(directories.recovery, file.name)),
        ]);
      }
    } catch (error) { if (error?.name !== 'NotFoundError') throw error; }
  }
  await backupHandleClear();
  return backupPolicySaveState(backupPolicyDefaultState());
}
