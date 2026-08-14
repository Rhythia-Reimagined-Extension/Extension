function setRoute(route) {
  if (route !== 'data') state.archive = null;
  if (route === 'overview' || route === 'about' || route === 'data' || route === 'profile-detail' || CATEGORIES[route]) { state.route = route; render(); }
  else if (route.startsWith('module:') && MODULES[route.slice(7)]) { state.route = route; render(); }
}

function applyDeleteChoices(record, choices) {
  const statKeys = ['weightedRp', 'rawRp', 'avgAccuracy', 'fcCount', 'playCount', 'squaresHit', 'mapsPerWeek'];
  const rankKeys = ['globalRank', 'countryRank', 'rhythmPoints'];
  const strip = point => {
    if (!point) return point;
    point.metrics = { ...(point.metrics || {}) };
    const keys = [...(choices.statHistory ? statKeys : []), ...(choices.rankingHistory ? rankKeys : [])];
    keys.forEach(key => { point.metrics[key] = null; });
    point.missing = [...new Set([...(point.missing || []), ...keys])];
    return point;
  };
  if (choices.statHistory && choices.rankingHistory) record.history.daily = {};
  else record.history.daily = Object.fromEntries(Object.entries(record.history.daily || {}).map(([date, point]) => [date, strip(point)]));
  if (choices.openDay) record.history.openDay = null;
  else if (record.history.openDay) record.history.openDay.captures = (record.history.openDay.captures || []).map(strip);
  if (choices.titleProgression) record.titleProgression = { last: null };
  return record;
}

async function executePendingAction() {
  const pending = state.pendingAction;
  state.pendingAction = null;
  if (!pending) return;
  if (pending.action === 'backup-forget' || pending.action === 'backup-delete') {
    try {
      if (pending.action === 'backup-forget') await forgetV3LocalBackupFolder();
      else await deleteV3LocalBackup();
    } catch (error) {
      setV3Status(error?.message || (pending.action === 'backup-forget' ? 'Local backup folder access could not be forgotten' : 'Local backup could not be deleted'));
      RhythiaX.captureError?.(error, pending.action === 'backup-forget' ? 'Local backup folder access removal failed' : 'Local backup deletion failed');
    }
    render();
    return;
  }
  const choices = pending.scope === 'global-all' || pending.scope === 'remove'
    ? { statHistory: true, rankingHistory: true, openDay: true, titleProgression: true }
    : state.deleteChoices;
  if (pending.action === 'profile-remove') {
    if (state.profileId) await RhythiaX.removeDataRecord(state.profileId);
  } else if (pending.action === 'delete-all' || pending.action === 'delete-selected' || pending.action === 'delete-title' || pending.action === 'profile-delete') {
    const records = await RhythiaX.listDataRecords();
    const targets = pending.scope === 'profile' ? records.filter(record => String(record.profileId) === String(state.profileId)) : records;
    if (pending.scope === 'global-all' && state.deleteWholeProfiles) await Promise.all(targets.map(record => RhythiaX.removeDataRecord(record.profileId)));
    else await Promise.all(targets.map(record => RhythiaX.saveDataRecord(applyDeleteChoices(record, { ...choices, titleProgression: pending.action === 'delete-title' || choices.titleProgression }))));
  }
  if (pending.action === 'profile-remove' || pending.action === 'profile-delete') { state.route = 'data'; state.dataView = 'profiles'; if (pending.action === 'profile-remove') state.profileId = ''; }
  await refreshDataState();
  render();
}

function openV3BackupConfirmation(action) {
  state.modalReturnFocus = document.activeElement;
  state.pendingAction = { action, phase: 'select' };
  render();
}

async function refreshDataState() {
  try {
    if (window.RhythiaX?.getDataSettings) state.dataSettings = await RhythiaX.getDataSettings();
    if (window.RhythiaX?.getDataStorageHealth) state.storageHealth = RhythiaX.getDataStorageHealth();
    if (window.RhythiaX?.getDataHistorySummary) state.summary = await RhythiaX.getDataHistorySummary();
    if (window.RhythiaX?.listDataRecords) {
      const records = await RhythiaX.listDataRecords();
      state.profiles = records.map(record => ({ record, id: record.profileId, name: record.identity?.username || `Player ${record.profileId}`, closedDays: Object.keys(record.history?.daily || {}).length, openCaptures: record.history?.openDay?.captures?.length || 0 }));
    }
    if (window.RhythiaX?.getLocalBackupStatus) state.backup = await RhythiaX.getLocalBackupStatus();
    if (state.route === 'data') render();
  } catch (_) { /* The controller still provides its normal fallback status. */ }
}

function setV3Status(message) {
  state.status = message;
  const target = screen.querySelector('#v3-status');
  if (target) target.textContent = message;
}

function localBackupPolicyAccepted(result) {
  return ['stable-only', 'manual', 'recovery'].includes(result?.preview?.payload?.backupPolicy);
}

function localBackupReadFailureStatus(reason) {
  return reason === 'permission-required'
    ? 'Backup folder access is required again'
    : reason === 'not-found'
      ? 'No backup file exists yet. Create a backup first.'
      : reason === 'invalid'
        ? 'The local backup file is invalid'
        : 'No local backup file found';
}

async function chooseV3LocalBackupFolder() {
  const result = await RhythiaX.chooseLocalBackupFolder();
  if (result.ok) setV3Status('Local backup enabled and created');
  else if (result.configured) setV3Status(result.reason === 'permission-required'
    ? 'Backup folder was selected, but access is required again to create the first copy'
    : 'Backup folder was selected, but the first automatic backup was not created');
  else if (result.reason !== 'cancelled') setV3Status(result.reason === 'unsupported'
    ? 'Local folder backup is not supported in this browser'
    : result.reason === 'permission-required'
      ? 'Backup folder access is required'
    : 'Local backup setup was not completed');
  await refreshDataState();
}

async function enableV3LocalBackupFromToggle() {
  const wasEnabled = state.dataSettings?.localBackupEnabled === true;
  // Start the chooser in this change event so the browser preserves user activation.
  const settingsSave = RhythiaX.StorageMutationBridge.dataSettingsPatch({ localBackupEnabled: true });
  const folderChoice = RhythiaX.chooseLocalBackupFolder();
  try {
    state.dataSettings = await settingsSave;
    const result = await folderChoice;
    if (result.ok) {
      setV3Status('Local backup enabled and created');
    } else {
      state.dataSettings = await RhythiaX.StorageMutationBridge.dataSettingsPatch({ localBackupEnabled: wasEnabled });
      if (result.reason !== 'cancelled') setV3Status(result.reason === 'unsupported' ? 'Local folder backup is not supported in this browser' : 'Local backup setup was not completed');
    }
    await refreshDataState();
  } catch (error) {
    try { await folderChoice; } catch (_) { /* chooser failure is reported by the settings failure below */ }
    state.dataSettings = await RhythiaX.StorageMutationBridge.dataSettingsPatch({ localBackupEnabled: wasEnabled });
    await refreshDataState();
    throw error;
  }
}

async function readV3AutomaticBackupForUi(slot = 0) {
  const result = await RhythiaX.readAutomaticBackup(slot);
  if (!result.ok) {
    setV3Status(localBackupReadFailureStatus(result.reason));
    return null;
  }
  if (!localBackupPolicyAccepted(result)) {
    setV3Status('The local file is not a valid stable backup');
    return null;
  }
  return result;
}

async function downloadV3LocalBackupCopy() {
  try {
    const result = await readV3AutomaticBackupForUi(0);
    if (!result) return;
    const blob = new Blob([JSON.stringify(result.payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rhythia-reimagined-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setV3Status('Backup copy prepared locally');
  } catch (error) {
    setV3Status('The backup copy could not be prepared');
    RhythiaX.captureError(error, 'Local backup download failed');
  }
}

async function forgetV3LocalBackupFolder() {
  await RhythiaX.forgetLocalBackupFolder();
  await refreshDataState();
  setV3Status('Local backup folder access forgotten');
}

async function deleteV3LocalBackup() {
  await RhythiaX.deleteLocalBackup();
  await refreshDataState();
  setV3Status('Local backup deleted');
}

// The background owner merges this intent with its latest committed settings and returns
// the normalized commit, so popup state never supplies a stale replacement snapshot.
async function saveV3HistorySettings(patch, message) {
  const next = await RhythiaX.StorageMutationBridge.dataSettingsPatch(patch);
  state.dataSettings = next;
  v3NotifyActiveTab({ type: 'rhythiax-history-settings', settings: next });
  render();
  setV3Status(message || 'Data collection settings updated');
}

// Per-id patch builders for the 9 `history-*` proxy controls (v3-markup-core.js
// V3_HISTORY_PROXY_STATE_KEYS), used by the `[data-v3-proxy]` `change` listener in
// v3-events.js. An invalid number (not finite, or failing the >0/>=0 check)
// keeps the current state.dataSettings value instead of falling through to the
// schema default.
const V3_HISTORY_SETTINGS_HANDLERS = {
  'history-retention': value => ({ patch: { retentionDays: Number(value) }, message: 'Automatic cleanup updated' }),
  'history-max-storage': value => {
    const parsed = Number(value);
    const maxStorageMb = Number.isFinite(parsed) && parsed > 0 ? parsed : (state.dataSettings || {}).maxStorageMb;
    return { patch: { maxStorageMb }, message: 'History size limit updated' };
  },
  'history-open-day-storage': value => {
    const parsed = Number(value);
    const openDayMaxMb = Number.isFinite(parsed) && parsed > 0 ? parsed : (state.dataSettings || {}).openDayMaxMb;
    return { patch: { openDayMaxMb }, message: 'Open-day size limit updated' };
  },
  'history-snapshot-interval': value => {
    const parsed = Number(value);
    const snapshotIntervalMinutes = Number.isFinite(parsed) && parsed >= 0 ? parsed : (state.dataSettings || {}).snapshotIntervalMinutes;
    return { patch: { snapshotIntervalMinutes }, message: 'Snapshot interval updated' };
  },
  'history-max-snapshots': value => {
    const parsed = Number(value);
    const maxSnapshotsPerDay = Number.isFinite(parsed) && parsed > 0 ? parsed : (state.dataSettings || {}).maxSnapshotsPerDay;
    return { patch: { maxSnapshotsPerDay }, message: 'Daily snapshot limit updated' };
  },
  'history-inline-stats': value => ({ patch: { inlineStatsReference: value }, message: 'Stats card progress updated' }),
  'history-inline-ranking': value => ({ patch: { inlineRankingReference: value }, message: 'Ranking card progress updated' }),
  'history-display-mode': value => ({ patch: { historyDisplayMode: value }, message: 'History display updated' }),
  'history-grouping': value => ({ patch: { historyGrouping: value }, message: 'Expanded history grouping updated' }),
};

function whitelistInputIdentity(rawValue) {
  const raw = String(rawValue || '').trim();
  const urlMatch = raw.match(/\/player\/([^/?#]+)/i);
  let id = '';
  if (urlMatch) {
    try { id = decodeURIComponent(urlMatch[1]); } catch (_) { id = ''; }
  } else if (/^\d+$/.test(raw)) {
    id = raw;
  }
  const known = (state.profiles || []).find(profile => (
    (id && String(profile.id) === id)
    || String(profile.name || '').trim().toLocaleLowerCase() === raw.toLocaleLowerCase()
  ));
  return {
    id: String(known?.id || id || '').trim(),
    username: String(known?.name || (id ? '' : raw)).trim(),
  };
}

async function addWhitelistEntryV3() {
  const input = screen.querySelector('[data-v3-whitelist-input]');
  const raw = input?.value.trim();
  if (!raw) {
    setV3Status('Enter a player ID, profile URL or tracked nickname');
    return;
  }
  const entry = whitelistInputIdentity(raw);
  state.dataSettings = await RhythiaX.StorageMutationBridge.dataSettingsWhitelistAdd({ ...entry, addedAt: Date.now() });
  v3NotifyActiveTab({ type: 'rhythiax-history-settings', settings: state.dataSettings });
  if (input) input.value = '';
  render();
  setV3Status('Profile added to whitelist');
}

async function removeWhitelistEntryV3(index) {
  const entry = state.dataSettings?.whitelist?.[Number(index)];
  if (!entry) return;
  if (!confirm(`Remove ${entry.username || entry.id || 'this profile'} from the whitelist?\n\nThis action is irreversible. Are you sure you want to continue?`)) return;
  state.dataSettings = await RhythiaX.StorageMutationBridge.dataSettingsWhitelistRemove(entry);
  v3NotifyActiveTab({ type: 'rhythiax-history-settings', settings: state.dataSettings });
  render();
  setV3Status('Profile removed from whitelist');
}

function profileExportPayload(profile) {
  return RhythiaX.createDataExport([profile.record], {
    scope: 'profile',
    profileIds: [profile.id],
    includeOpenDay: true,
    includeTitleState: true,
    includeDiagnostics: true,
  });
}

function profileJsonText(profile) {
  return JSON.stringify(profile.record, null, 2);
}

function copyProfileJson() {
  const profile = selectedProfile();
  if (!profile) return;
  const text = profileJsonText(profile);
  const fallback = () => {
    const area = document.createElement('textarea');
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const copied = document.execCommand('copy');
    area.remove();
    setV3Status(copied ? 'Profile JSON copied to clipboard' : 'Clipboard access was denied');
  };
  if (!navigator.clipboard?.writeText) return fallback();
  navigator.clipboard.writeText(text).then(() => setV3Status('Profile JSON copied to clipboard')).catch(fallback);
}

function downloadProfileJson() {
  const profile = selectedProfile();
  if (!profile) return;
  const payload = profileExportPayload(profile);
  const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = `rhythiaRI-profile-${profile.id}-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setV3Status('Profile JSON downloaded');
}

// The four "Include ..." checkboxes rendered by checkControl('data-export-open-day', ...) /
// 'data-export-title-state' / 'data-export-settings' / 'data-export-diagnostics' in
// dataTransfer() (v3-markup-data.js) are natively backed by state.export* fields
// (V3_EXPORT_CHECKBOX_STATE_KEYS in v3-markup-core.js, set by the `input` listener in
// v3-events.js) as of Etap 3b Grupa 4 Sub-krok B - no compatibility adapter involved anywhere in this
// path anymore, on read or on write.
function v3ExportCheckbox(id) {
  return state[V3_EXPORT_CHECKBOX_STATE_KEYS[id]] === true;
}

// Exporting without an explicit profile uses the most recently updated tracked
// profile, matching the prior fallback behavior.
function v3MostRecentlyUpdatedProfileId() {
  const profiles = state.profiles || [];
  if (!profiles.length) return '';
  return profiles.reduce((newest, profile) => (
    (profile.record?.updatedAt || 0) > (newest.record?.updatedAt || 0) ? profile : newest
  ), profiles[0]).id;
}

// Builds the export through RhythiaX.createDataExport(...), the same API
// profileExportPayload() above already uses for the single-profile "Download JSON" export, and
// downloads it the same way (Blob + <a download>) the rest of this file already uses for
// downloadProfileJson()/downloadV3LocalBackupCopy() use. The object URL is
// revoked synchronously after link.click() without a setTimeout.
async function exportV3Data() {
  const scope = state.exportScope || 'all';
  const profileId = state.exportProfileId || v3MostRecentlyUpdatedProfileId();
  if (scope === 'profile' && !profileId) {
    setV3Status('Select a profile before exporting');
    return;
  }
  const records = (state.profiles || []).map(profile => profile.record);
  const payload = RhythiaX.createDataExport(records, {
    scope,
    profileIds: profileId ? [profileId] : [],
    includeOpenDay: v3ExportCheckbox('data-export-open-day') || scope === 'open-day',
    includeTitleState: v3ExportCheckbox('data-export-title-state'),
    includeSettings: v3ExportCheckbox('data-export-settings'),
    includeDiagnostics: v3ExportCheckbox('data-export-diagnostics'),
    settings: state.dataSettings,
  });
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `rhythiax-data-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  setV3Status(`Exported ${payload.records.length} profile${payload.records.length === 1 ? '' : 's'} locally`);
}

async function previewV3DataImport(file, generation) {
  const raw = await file.text();
  if (generation !== state.dataImportSelectionGeneration) return;
  const preview = await RhythiaX.getDataExportPreview(raw);
  if (generation !== state.dataImportSelectionGeneration) return;
  state.dataImport = { raw, preview, profileId: '', includeSettings: false, generation };
  render();
}

function chooseV3DataImport() {
  const generation = ++state.dataImportSelectionGeneration;
  state.dataImport = null;
  render();
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.hidden = true;
  const removeInput = () => input.remove();
  input.addEventListener('cancel', removeInput, { once: true });
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    removeInput();
    if (!file) return;
    previewV3DataImport(file, generation).catch(error => {
      if (generation !== state.dataImportSelectionGeneration) return;
      state.dataImport = { raw: '', preview: { ok: false, errors: ['The import file could not be read.'] }, profileId: '', includeSettings: false, generation };
      render();
      RhythiaX.captureError(error, 'Canonical data import preview failed');
    });
  }, { once: true });
  document.body.appendChild(input);
  input.click();
}

async function confirmV3DataImport() {
  const pending = state.dataImport;
  if (!pending?.preview?.ok) return;
  const generation = pending.generation;
  try {
    const result = await RhythiaX.importDataExport(pending.raw, {
      profileIds: pending.profileId ? [pending.profileId] : [],
      includeSettings: pending.includeSettings === true,
    });
    if (generation !== state.dataImportSelectionGeneration || state.dataImport?.generation !== generation) return;
    if (!result.ok) {
      state.dataImport = { ...pending, preview: result };
      render();
      setV3Status('Import rejected without changing storage');
      return;
    }
    await refreshDataState();
    if (generation !== state.dataImportSelectionGeneration || state.dataImport?.generation !== generation) return;
    state.dataImport = null;
    render();
    setV3Status(`Imported ${result.imported} profile${result.imported === 1 ? '' : 's'} offline`);
  } catch (error) {
    if (generation !== state.dataImportSelectionGeneration || state.dataImport?.generation !== generation) return;
    setV3Status('Import failed without changing the previewed data');
    RhythiaX.captureError(error, 'Canonical data import failed');
  }
}

function profileImportInput(raw) {
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.type === RhythiaX.DATA_EXPORT_TYPE) return raw;
    if (parsed?.profileId && parsed?.history) {
      return JSON.stringify({
        type: RhythiaX.DATA_EXPORT_TYPE,
        exportVersion: RhythiaX.DATA_EXPORT_VERSION,
        schemaVersion: RhythiaX.DATA_SCHEMA_VERSION,
        exportedAt: Date.now(),
        source: 'local',
        scope: { type: 'profile', profileIds: [parsed.profileId], includeOpenDay: true, includeTitleState: true, includeDiagnostics: false, includeSettings: false },
        records: [parsed],
      });
    }
  } catch (_) {
    return raw;
  }
  return raw;
}

async function previewProfileImport(file, generation, targetProfileId) {
  const raw = profileImportInput(await file.text());
  if (generation !== state.profileImportSelectionGeneration || String(state.profileId) !== String(targetProfileId)) return;
  let preview = await RhythiaX.getDataExportPreview(raw);
  if (generation !== state.profileImportSelectionGeneration || String(state.profileId) !== String(targetProfileId)) return;
  if (preview.ok) {
    const selected = (state.profiles || []).find(profile => String(profile.id) === String(targetProfileId));
    if (!selected) return;
    const records = preview.records.filter(record => String(record.profileId) === String(targetProfileId));
    if (!records.length) {
      preview = { ...preview, ok: false, errors: [`This file does not contain profile #${targetProfileId}.`] };
    } else {
      const merge = RhythiaX.mergeDataExportRecords([selected.record], records);
      const changed = merge.updated.length > 0 || merge.added.length > 0;
      preview = {
        ...preview,
        records,
        profileCount: 1,
        conflicts: [selected.id],
        added: [],
        updated: changed ? [selected.id] : [],
        dailyCount: records.reduce((sum, record) => sum + Object.keys(record.history.daily || {}).length, 0),
        openCaptureCount: records.reduce((sum, record) => sum + (record.history.openDay?.captures.length || 0), 0),
      };
    }
  }
  if (generation !== state.profileImportSelectionGeneration || String(state.profileId) !== String(targetProfileId)) return;
  state.profileImport = { raw, preview, targetProfileId, generation };
  render();
}

function chooseProfileImport() {
  const targetProfileId = state.profileId;
  if (!targetProfileId) return;
  const generation = ++state.profileImportSelectionGeneration;
  state.profileImport = null;
  render();
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  const removeInput = () => input.remove();
  input.addEventListener('cancel', removeInput, { once: true });
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    removeInput();
    if (file) previewProfileImport(file, generation, targetProfileId).catch(error => {
      if (generation !== state.profileImportSelectionGeneration || String(state.profileId) !== String(targetProfileId)) return;
      state.profileImport = { preview: { ok: false, errors: [error?.message || 'The file could not be read.'] }, targetProfileId, generation };
      render();
      RhythiaX.captureError(error, 'Profile data import preview failed');
    });
  }, { once: true });
  document.body.appendChild(input);
  input.click();
}

async function confirmProfileImport() {
  const pending = state.profileImport;
  if (!pending?.preview?.ok || !pending.preview.updated.length || String(pending.targetProfileId) !== String(state.profileId)) return;
  const generation = pending.generation;
  try {
    const result = await RhythiaX.importDataExport(pending.raw, { profileIds: [pending.targetProfileId], includeSettings: false });
    if (generation !== state.profileImportSelectionGeneration || state.profileImport?.generation !== generation || String(state.profileId) !== String(pending.targetProfileId)) return;
    if (!result.ok) {
      state.profileImport = { ...pending, preview: result };
      render();
      return;
    }
    await refreshDataState();
    if (generation !== state.profileImportSelectionGeneration || state.profileImport?.generation !== generation || String(state.profileId) !== String(pending.targetProfileId)) return;
    state.profileImport = null;
    state.profileView = 'json';
    render();
    setV3Status(`Merged ${pending.preview.dailyCount} daily records and ${pending.preview.openCaptureCount} open captures into the profile`);
  } catch (error) {
    if (generation !== state.profileImportSelectionGeneration || state.profileImport?.generation !== generation || String(state.profileId) !== String(pending.targetProfileId)) return;
    setV3Status(error?.message || 'The profile import failed.');
    RhythiaX.captureError(error, 'Profile data import failed');
  }
}

async function saveProfileJson() {
  const selected = selectedProfile();
  const editor = screen.querySelector('[data-v3-profile-editor]');
  const errorTarget = screen.querySelector('[data-v3-profile-editor-error]');
  if (!selected || !editor) return;
  let parsed;
  try { parsed = JSON.parse(editor.value); } catch (_) { if (errorTarget) errorTarget.textContent = 'The JSON is not valid.'; return; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) { if (errorTarget) errorTarget.textContent = 'The record must be a JSON object.'; return; }
  if (String(parsed.profileId || '') !== String(selected.id)) { if (errorTarget) errorTarget.textContent = 'profileId cannot be changed.'; return; }
  const identityErrors = RhythiaX.validateDataRecordIdentity?.(selected.record, parsed) || [];
  if (identityErrors.length) { if (errorTarget) errorTarget.textContent = identityErrors.join(' '); return; }
  const validation = RhythiaX.validateDataExport?.({ type: RhythiaX.DATA_EXPORT_TYPE, exportVersion: RhythiaX.DATA_EXPORT_VERSION, schemaVersion: RhythiaX.DATA_SCHEMA_VERSION, source: 'local', records: [parsed] });
  if (validation && !validation.ok) { if (errorTarget) errorTarget.textContent = validation.errors.join(' '); return; }
   try {
     await RhythiaX.saveDataRecord(validation?.records?.[0] || parsed);
     state.profileView = 'overview';
     await refreshDataState();
     render();
     setV3Status('Canonical record updated locally');
   } catch (error) {
     if (errorTarget) errorTarget.textContent = error?.message || 'The record could not be saved.';
   }
}
