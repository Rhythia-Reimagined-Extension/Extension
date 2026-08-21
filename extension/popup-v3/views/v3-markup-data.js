function selectedProfile() {
  return (state.profiles || []).find(profile => profile.id === state.profileId) || null;
}

// Keep the shared data-deletion confirmation intact while giving backup mutations
// their own clear, cancellable copy before the filesystem service is called.
const v3DataDeletionConfirmationMarkup = confirmationMarkup;
confirmationMarkup = function confirmationMarkup() {
  const pending = state.pendingAction;
  if (!pending || !['backup-forget', 'backup-delete'].includes(pending.action)) return v3DataDeletionConfirmationMarkup();
  const deleting = pending.action === 'backup-delete';
  const title = deleting ? 'Delete all local backup files?' : 'Forget backup folder access?';
  const description = deleting
    ? 'This removes the automatic, manual and recovery backup files, then clears this extension\'s access to the folder.'
    : 'This only clears this extension\'s access to the selected folder. Backup files stay in that folder.';
  if (pending.phase === 'select') {
    return `<div class="v3-modal-layer" role="presentation"><section class="v3-modal" role="dialog" aria-modal="true"><span class="v3-modal-kicker">Local backup</span><h3>${title}</h3><p>${description}</p><div class="v3-modal-warning"><strong>${deleting ? 'Backup files cannot be restored after deletion.' : 'You will need to choose this folder again before backups can run.'}</strong><span>Nothing changes until you review and confirm this action.</span></div><div class="v3-modal-actions"><button type="button" class="v3-secondary-button" data-v3-modal-close>Cancel</button><button type="button" class="v3-danger-button" data-v3-modal-review>Review ${deleting ? 'deletion' : 'folder access'}</button></div></section></div>`;
  }
  return `<div class="v3-modal-layer" role="presentation"><section class="v3-modal v3-modal-confirm" role="dialog" aria-modal="true"><span class="v3-modal-kicker">Final confirmation</span><h3>${title}</h3><p>${description}</p><div class="v3-modal-warning"><strong>${deleting ? 'All local backup files will be deleted.' : 'Folder access will be forgotten.'}</strong><span>This action cannot be undone.</span></div><div class="v3-modal-actions"><button type="button" class="v3-secondary-button" data-v3-modal-back>Back</button><button type="button" class="v3-danger-button" data-v3-modal-confirm>${deleting ? 'Delete backup files' : 'Forget folder access'}</button></div></section></div>`;
};

const v3CoreCheckControl = checkControl;
checkControl = function checkControl(id, label) {
  if (id === 'backup-open-day') return `<label class="v3-check-row"><input type="checkbox" data-v3-backup-open-day${state.backupIncludeOpenDay ? ' checked' : ''}><span>${label}</span></label>`;
  if (id === 'backup-app-settings') return `<label class="v3-check-row"><input type="checkbox" data-v3-backup-app-settings${state.backupIncludeAppSettings ? ' checked' : ''}><span>${label}</span></label>`;
  return v3CoreCheckControl(id, label);
};

function metricLabel(key) { return HISTORY_METRICS.find(([id]) => id === key)?.[1] || key; }
function metricValue(key, value) {
  if (value === null || value === undefined) return 'No value';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  if (key === 'avgAccuracy') return `${number.toFixed(2)}%`;
  if (key === 'mapsPerWeek') return number.toFixed(1);
  if (key === 'globalRank' || key === 'countryRank') return `#${number.toLocaleString('en-US')}`;
  return number.toLocaleString('en-US');
}
function metricDelta(key, current, previous) {
  if (current === null || current === undefined || previous === null || previous === undefined) return '';
  const delta = Number(current) - Number(previous);
  if (!Number.isFinite(delta) || delta === 0) return delta === 0 ? '=' : '';
  return `${delta > 0 ? '+' : ''}${key === 'avgAccuracy' ? delta.toFixed(2) + '%' : key === 'mapsPerWeek' ? delta.toFixed(1) : delta.toLocaleString('en-US')}`;
}
function recordPoints(record) {
  const open = record?.history?.openDay?.captures?.slice(-1).map(point => ({ ...point, kind: 'open' })) || [];
  const daily = Object.values(record?.history?.daily || {}).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return [...open, ...daily];
}

function profileHistoryTable(record) {
  const points = recordPoints(record);
  if (!points.length) return '<p class="v3-helper">No history records have been captured for this profile yet.</p>';
  const metric = state.profileMetric;
  return `<div class="v3-history-toolbar"><label class="v3-setting-row"><span>History metric</span><select data-v3-profile-metric>${HISTORY_METRICS.map(([key, label]) => `<option value="${key}"${metric === key ? ' selected' : ''}>${label}</option>`).join('')}</select></label><span>Daily records and current open-day state</span></div><div class="v3-profile-history-table"><div><span>Date</span><strong>${metricLabel(metric)}</strong><em>Change from prior record</em></div>${points.map((point, index) => { const current = point.metrics?.[metric]; const previous = points[index + 1]?.metrics?.[metric]; return `<div><span>${escapeHtml(point.date || 'No date')} | ${point.kind === 'open' ? 'Open' : 'Closed'}</span><strong>${metricValue(metric, current)}</strong><em>${escapeHtml(metricDelta(metric, current, previous) || 'No prior record')}</em></div>`; }).join('')}</div><p class="v3-helper">Choose a different metric to compare Weighted RP, Raw RP, AVG Accuracy and the other stored values day by day.</p>`;
}

function profileImportMarkup() {
  const pending = state.profileImport;
  if (!pending) return '';
  if (!pending.preview?.ok) return `<section class="v3-card v3-profile-import-card"><div class="v3-card-title"><strong>Import preview</strong><span>Import rejected</span></div><p class="v3-import-error">${escapeHtml((pending.preview?.errors || ['The file could not be imported.']).join(' '))}</p><div class="v3-button-row"><button type="button" class="v3-secondary-button" data-v3-action="cancel-profile-import">Close</button></div></section>`;
  const preview = pending.preview;
  const changed = preview.updated.length || preview.added.length;
  const status = changed ? 'New data is ready to merge' : 'No new data detected';
  return `<section class="v3-card v3-profile-import-card"><div class="v3-card-title"><strong>Import preview</strong><span>${status}</span></div><div class="v3-import-summary"><strong>${preview.dailyCount} daily records | ${preview.openCaptureCount} open captures</strong><span>${preview.updated.length ? 'Existing records will be updated only where the imported value is newer or more complete.' : 'The imported record does not add anything newer or more complete to this profile.'}</span></div><p class="v3-helper">This is a portable profile-data merge, not a replacement. Missing dates and same-day captures are added; existing data is preserved when it is better.</p><div class="v3-button-row"><button type="button" class="v3-primary-button" data-v3-action="confirm-profile-import"${changed ? '' : ' disabled'}>Merge into profile</button><button type="button" class="v3-secondary-button" data-v3-action="cancel-profile-import">Cancel</button></div></section>`;
}

function profileScreen() {
  const selected = selectedProfile();
  if (!selected) { state.route = 'data'; state.dataView = 'profiles'; return dataProfiles(); }
  const record = selected.record || {};
  const points = recordPoints(record);
  const latest = points[0]?.metrics || {};
  const bytes = JSON.stringify(record).length;
  const json = escapeHtml(JSON.stringify(record, null, 2));
   let panel = `<section class="v3-card"><div class="v3-card-title"><strong>Saved profile snapshot</strong><span>Last captured state</span></div><div class="history-summary"><div class="summary-card"><strong>${metricValue('weightedRp', latest.weightedRp)}</strong><span>Weighted RP</span></div><div class="summary-card"><strong>${metricValue('globalRank', latest.globalRank)}</strong><span>Global rank</span></div><div class="summary-card"><strong>${selected.closedDays}</strong><span>Closed days</span></div><div class="summary-card"><strong>${bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`}</strong><span>Local data</span></div></div><div class="v3-info-callout"><strong>Profile identity is kept</strong><span>Deleting selected profile data keeps ${escapeHtml(selected.name)}. Removing the profile deletes its identity and all associated records.</span></div><div class="v3-button-row v3-profile-json-actions"><button type="button" class="v3-secondary-button" data-v3-action="download-profile-json">Download portable JSON</button></div><p class="v3-helper">Use History &amp; Data → Import to add portable JSON to this profile or any other imported profile.</p></section>`;
  if (state.profileView === 'history') panel = `<section class="v3-card"><div class="v3-card-title"><strong>Player history</strong><span>Closed daily records</span></div>${profileHistoryTable(record)}</section>`;
   if (state.profileView === 'json') panel = `<section class="v3-card"><div class="v3-card-title"><strong>Canonical record JSON</strong><span>Read-only preview</span></div><pre class="v3-json-preview">${json}</pre><div class="v3-button-row v3-json-actions"><button type="button" class="v3-secondary-button" data-v3-action="copy-profile-json">Copy JSON</button></div><p class="v3-helper">Copy the canonical profile record for inspection or external use. Download and import actions are available in Overview.</p></section>`;
  if (state.profileView === 'edit') panel = `<section class="v3-card"><div class="v3-card-title"><strong>Edit canonical JSON</strong><span>Changes are local</span></div><textarea class="v3-json-editor" data-v3-profile-editor spellcheck="false">${json}</textarea><p class="v3-helper v3-profile-editor-error" data-v3-profile-editor-error></p><div class="v3-button-row"><button type="button" class="v3-primary-button" data-v3-action="save-profile-json">Save JSON changes</button><button type="button" class="v3-secondary-button" data-v3-profile-view="overview">Cancel</button></div></section>`;
  const tabs = [['overview', 'Overview'], ['history', 'History'], ['json', 'JSON preview'], ['edit', 'Edit JSON']];
   return `${heading(escapeHtml(selected.name), `Player #${escapeHtml(selected.id)} - saved profile data`, 'data')}<div class="v3-profile-tabs">${tabs.map(([key, label]) => `<button type="button" class="${state.profileView === key ? 'is-selected' : ''}" data-v3-profile-view="${key}">${label}</button>`).join('')}</div>${panel}${profileImportMarkup()}<section class="v3-card v3-danger-card"><div class="v3-card-title"><strong>Selected profile data</strong><span>Review before changing data</span></div><div class="v3-button-row"><button type="button" class="v3-secondary-button" data-v3-action="profile-delete">Delete selected profile data</button><button type="button" class="v3-danger-button" data-v3-action="profile-remove">Remove profile and all data</button></div><p class="v3-helper">The first action keeps the profile entry. The second removes the profile identity and every associated record.</p></section>`;
}

function dataOverview() {
  return `<section class="v3-card"><div class="v3-card-title"><strong>Storage overview</strong><span>Saved locally</span></div>${summaryMarkup()}<p class="v3-helper">Stats and Ranking share one open-day capture stream. Title Progression keeps its own latest state.</p></section><section class="v3-card"><div class="v3-card-title"><strong>Data actions</strong><span>Applies to all tracked profiles</span></div><div class="v3-action-grid"><button type="button" class="v3-secondary-button" data-v3-action="delete-selected">Delete selected data</button><button type="button" class="v3-danger-button" data-v3-action="delete-all">Delete all collected data</button></div><p class="v3-helper">These are global actions. To delete data from one player only, open that player in Profiles.</p></section>`;
}

function dataStorage() {
  return `<section class="v3-card"><div class="v3-card-title"><strong>Storage and cleanup</strong><span>Internal safeguards</span></div><div class="v3-storage-grid">${proxyControl('history-retention', 'Keep closed days', 'select', [['90', '90 days'], ['30', '30 days'], ['60', '60 days'], ['180', '180 days'], ['0', 'Never']])}<div class="v3-setting-pair">${proxyControl('history-max-storage', 'Max history cache (MB)', 'number')}${proxyControl('history-open-day-storage', 'Open-day limit (MB)', 'number')}</div><div class="v3-setting-pair">${proxyControl('history-snapshot-interval', 'Snapshot interval (minutes)', 'number')}${proxyControl('history-max-snapshots', 'Max snapshots / day', 'number')}</div></div><p class="v3-helper">Browser storage has the unlimitedStorage permission. The limits configured here are internal extension safeguards to keep memory and history lookups performant.</p><div class="v3-button-row" style="margin-top: 8px;"><button type="button" class="v3-secondary-button" data-v3-action="cleanup-orphaned-data">Repair &amp; clean orphaned data</button></div></section><section class="v3-card"><div class="v3-card-title"><strong>Title Progression data</strong><span>Stored separately</span></div><button type="button" class="v3-danger-button" data-v3-action="delete-title">Delete Title Progression data</button></section>`;
}

function backupRestoreMarkup() {
  const preview = state.backupRestorePreview;
  if (!preview) return '';
  if (!preview.ok) return `<section class="v3-card v3-danger-card"><div class="v3-card-title"><strong>Restore rejected</strong><span>Nothing changed</span></div><p class="v3-helper">${escapeHtml((preview.errors || ['The backup is invalid.']).join(' '))}</p><button type="button" class="v3-secondary-button" data-v3-action="backup-restore-cancel">Close</button></section>`;
  const profiles = preview.records || [];
  const selected = state.backupRestoreProfiles;
  const allSelected = !selected.length;
  const safetyCopyHint = state.backupRestoreSource === 'recovery'
    ? 'This is already a recovery point; no extra safety copy is created for it. Existing data is not changed by this preview.'
    : 'A full Recovery point will be created before this operation. Existing data is not changed by this preview.';
  return `<section class="v3-card v3-restore-card"><div class="v3-card-title"><strong>Restore preview</strong><span>${preview.profileCount || profiles.length} profile${(preview.profileCount || profiles.length) === 1 ? '' : 's'}</span></div><div class="v3-info-callout"><strong>Safety copy required</strong><span>${safetyCopyHint}</span></div><label class="v3-setting-row"><span>Mode</span><select data-v3-restore-mode><option value="merge"${state.backupRestoreMode === 'merge' ? ' selected' : ''}>Merge, keep newer data</option><option value="replace"${state.backupRestoreMode === 'replace' ? ' selected' : ''}>Replace selected scope</option></select></label><label class="v3-setting-row"><span>Profiles</span><select multiple size="3" data-v3-restore-profiles><option value=""${allSelected ? ' selected' : ''}>All profiles</option>${profiles.map(record => `<option value="${escapeHtml(record.profileId)}"${selected.includes(String(record.profileId)) ? ' selected' : ''}>${escapeHtml(record.identity?.username || `Player ${record.profileId}`)} (#${escapeHtml(record.profileId)})</option>`).join('')}</select></label><div class="v3-transfer-options"><label class="v3-check-row"><input type="checkbox" data-v3-restore-history${state.backupRestoreIncludeHistory ? ' checked' : ''}><span>Restore history</span></label><label class="v3-check-row"><input type="checkbox" data-v3-restore-title${state.backupRestoreIncludeTitle ? ' checked' : ''}><span>Restore Title Progression</span></label>${preview.settings ? '<label class="v3-check-row"><input type="checkbox" data-v3-restore-settings' + (state.backupRestoreIncludeSettings ? ' checked' : '') + '><span>Restore data settings (retention, whitelist, etc.)</span></label>' : ''}${preview.payload?.appSettings ? '<label class="v3-check-row"><input type="checkbox" data-v3-restore-app-settings' + (state.backupRestoreIncludeAppSettings ? ' checked' : '') + '><span>Restore app settings</span></label>' : ''}</div><div class="v3-setting-pair"><label class="v3-setting-row"><span>From date</span><input type="date" data-v3-restore-date-from value="${escapeHtml(state.backupRestoreDateFrom)}"></label><label class="v3-setting-row"><span>To date</span><input type="date" data-v3-restore-date-to value="${escapeHtml(state.backupRestoreDateTo)}"></label></div><div class="v3-button-row"><button type="button" class="v3-primary-button" data-v3-action="backup-restore-confirm">${state.backupRestoreMode === 'replace' ? 'Replace selected data' : 'Merge selected data'}</button><button type="button" class="v3-secondary-button" data-v3-action="backup-restore-cancel">Cancel</button></div></section>`;
}

function dataBackupScreen() {
  return dataBackup()
    .replace(/<button type="button" class="v3-secondary-button" data-v3-action="backup-restore">[^<]*<\/button>/, '<button type="button" class="v3-secondary-button" data-v3-action="backup-archive-open">Open manual archive</button>')
    .replace(/<button type="button" class="v3-secondary-button" data-v3-action="backup-recovery-restore">[^<]*<\/button>/, '');
}

function dataImportScreen() {
  const dateRange = state.backupRestorePreview?.ok
    ? `<label class="v3-setting-row"><span>Date range</span><select data-v3-import-date-range><option value="all"${state.backupRestoreDatePreset === 'all' ? ' selected' : ''}>From all dates</option><option value="week"${state.backupRestoreDatePreset === 'week' ? ' selected' : ''}>Last week</option><option value="two-weeks"${state.backupRestoreDatePreset === 'two-weeks' ? ' selected' : ''}>Last 2 weeks</option><option value="month"${state.backupRestoreDatePreset === 'month' ? ' selected' : ''}>Last month</option><option value="choose"${state.backupRestoreDatePreset === 'choose' ? ' selected' : ''}>Choose</option></select></label>`
    : '';
  const preview = backupRestoreMarkup()
    .replace(/Restore rejected/g, 'Import rejected')
    .replace(/Restore preview/g, 'Import preview')
    .replace(/Restore history/g, 'Import history')
    .replace(/Restore Title Progression/g, 'Import Title Progression')
    .replace(/Restore data settings/g, 'Import data settings')
    .replace(/Restore app settings/g, 'Import app settings')
    .replace(/data-v3-action="backup-restore-cancel"/g, 'data-v3-action="import-cancel"')
    .replace(/data-v3-action="backup-restore-confirm"/g, 'data-v3-action="import-confirm"')
    .replace(/>Restore</g, '>Import<');
  const positionedPreview = preview.replace('<div class="v3-setting-pair">', `${dateRange}<div class="v3-setting-pair">`);
  return `<section class="v3-card v3-import-start"><div class="v3-card-title"><strong>Import Data</strong><span>Preview before changing local data</span></div><p class="v3-helper">Choose the file type first. JSON is for portable profile data; Backup is for files created by Rhythia Reimagined. Nothing is changed until you confirm the preview.</p><div class="v3-import-choice-grid"><button type="button" class="v3-primary-button" data-v3-action="import-json"><strong>Upload JSON</strong><span>Portable profile and history export</span></button><button type="button" class="v3-secondary-button" data-v3-action="import-backup"><strong>Upload Backup</strong><span>Stable, manual or recovery backup file</span></button></div><div class="v3-button-row"><button type="button" class="v3-secondary-button" data-v3-action="import-recovery">Restore recovery point</button></div></section>${positionedPreview}`;
}

function backupBytesText(bytes) {
  const value = Number(bytes) || 0;
  return value < 1024 ? `${value} B` : value < 1024 * 1024 ? `${(value / 1024).toFixed(1)} KB` : `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function backupScheduleText(schedule) {
  return schedule === 'manual' ? 'Only when manual' : `Every ${schedule || '1'} day${schedule === '1' ? '' : 's'}`;
}

function archiveHistoryTable(record, metric) {
  const points = [
    ...(record?.history?.openDay?.captures || []).map(point => ({ ...point, kind: 'open' })),
    ...Object.values(record?.history?.daily || {}).sort((a, b) => String(b.date).localeCompare(String(a.date))),
  ];
  if (!points.length) return '<p class="v3-helper">This archived profile has no history points.</p>';
  return `<div class="v3-history-toolbar"><label class="v3-setting-row"><span>Archive metric</span><select data-v3-archive-metric>${HISTORY_METRICS.map(([key, label]) => `<option value="${key}"${metric === key ? ' selected' : ''}>${label}</option>`).join('')}</select></label><span>Read-only archive data</span></div><div class="v3-profile-history-table"><div><span>Date</span><strong>${metricLabel(metric)}</strong><em>State</em></div>${points.map(point => `<div><span>${escapeHtml(point.date || 'No date')} | ${point.kind === 'open' ? 'Open' : 'Closed'}</span><strong>${metricValue(metric, point.metrics?.[metric])}</strong><em>${point.status === 'complete' ? 'Complete' : 'Partial'}</em></div>`).join('')}</div>`;
}

function archiveScreen() {
  const archive = state.archive;
  const records = archive?.payload?.records || [];
  const selected = records.find(record => String(record.profileId) === String(state.profileId)) || records[0];
  const selectedId = selected?.profileId || '';
  if (selected && String(state.profileId) !== String(selectedId)) state.profileId = selectedId;
  return `${heading('Archive', `${escapeHtml(archive?.fileName || 'Backup')} | read-only`, 'data')}<div class="v3-archive-banner"><strong>Viewing archived data</strong><span>Nothing in the current local history will be changed.</span><button type="button" class="v3-back-button" data-v3-action="archive-back">Back to History &amp; Data</button></div><section class="v3-card"><div class="v3-card-title"><strong>Archived profiles</strong><span>${records.length} saved</span></div><label class="v3-setting-row"><span>Profile</span><select data-v3-archive-profile>${records.map(record => `<option value="${escapeHtml(record.profileId)}"${String(record.profileId) === String(selectedId) ? ' selected' : ''}>${escapeHtml(record.identity?.username || `Player ${record.profileId}`)} (#${escapeHtml(record.profileId)})</option>`).join('') || '<option value="">No profiles</option>'}</select></label></section>${selected ? `<section class="v3-card"><div class="v3-card-title"><strong>${escapeHtml(selected.identity?.username || `Player ${selected.profileId}`)}</strong><span>Full archived history</span></div>${archiveHistoryTable(selected, state.archive.metric || 'weightedRp')}</section>` : '<section class="v3-card"><p class="v3-helper">No profile is available in this archive.</p></section>'}${status()}`;
}

async function createV3ManualBackup() {
  const result = await RhythiaX.createManualLocalBackup({ includeOpenDay: state.backupIncludeOpenDay, includeAppSettings: state.backupIncludeAppSettings });
  setV3Status(result.ok ? `Manual backup created in Manual (${backupBytesText(result.bytes)})` : `Manual backup failed: ${result.reason || 'unknown error'}`);
  await refreshDataState();
}

async function viewV3AutomaticBackup(slot = 0) {
  const result = await readV3AutomaticBackupForUi(slot);
  if (!result) return;
  state.archive = { payload: result.payload, preview: result.preview, fileName: result.fileName, metric: 'weightedRp' };
  state.dataView = 'backup';
  render();
}

function chooseV3ArchiveFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    file.text().then(async raw => {
      const preview = await RhythiaX.getDataExportPreview(raw);
      if (!preview.ok) { setV3Status(`Archive rejected: ${(preview.errors || []).join(' ')}`); return; }
      state.archive = { payload: preview.payload, preview, fileName: file.name, metric: 'weightedRp' };
      state.dataView = 'backup';
      render();
    }).catch(error => setV3Status(error?.message || 'Archive could not be read'));
  }, { once: true });
  document.body.appendChild(input);
  input.click();
}

async function loadV3RecoveryPreview() {
  const result = await RhythiaX.readRecoveryBackup();
  if (!result.ok) { setV3Status(`Recovery point unavailable: ${result.reason || 'unknown error'}`); return; }
  state.backupRestoreRaw = result.raw;
  state.backupRestorePreview = result.preview;
  state.backupRestoreSource = 'recovery';
  resetV3ImportOptions('replace');
  render();
}

// Manual file restore: unlike the recovery point (always written by our own backup
// service, so its backupPolicy is trusted by construction), a user-picked file can be any
// valid data export - e.g. a single-profile "Download JSON" export. Only stable/manual/
// recovery-policy backups are accepted here.
function chooseV3BackupFileToRestore() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    file.text().then(async raw => {
      const preview = await RhythiaX.getDataExportPreview(raw);
       state.backupRestoreSource = 'backup';
       resetV3ImportOptions();
      if (preview.ok && !localBackupPolicyAccepted({ preview })) {
        state.backupRestoreRaw = '';
        state.backupRestorePreview = { ok: false, errors: ['This file is not a stable local backup.'] };
      } else {
        state.backupRestoreRaw = raw;
        state.backupRestorePreview = preview;
      }
      render();
    }).catch(error => {
      state.backupRestoreRaw = '';
      state.backupRestorePreview = { ok: false, errors: ['The backup file could not be read.'] };
       state.backupRestoreSource = 'backup';
       resetV3ImportOptions();
      render();
      RhythiaX.captureError(error, 'Local backup file preview failed');
    });
  }, { once: true });
  document.body.appendChild(input);
  input.click();
}

function resetV3ImportOptions(mode = 'merge') {
  state.backupRestoreMode = mode;
  state.backupRestoreProfiles = [];
  state.backupRestoreIncludeHistory = true;
  state.backupRestoreIncludeTitle = true;
  state.backupRestoreIncludeAppSettings = false;
  state.backupRestoreIncludeSettings = true;
  state.backupRestoreDatePreset = 'all';
  state.backupRestoreDateFrom = '';
  state.backupRestoreDateTo = '';
}

function chooseV3PortableFileToImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'application/json,.json';
  input.addEventListener('change', () => {
    const file = input.files?.[0];
    input.remove();
    if (!file) return;
    file.text().then(async raw => {
      state.backupRestoreRaw = raw;
      state.backupRestorePreview = await RhythiaX.getDataExportPreview(raw);
      state.backupRestoreSource = 'json';
      resetV3ImportOptions();
      render();
    }).catch(error => {
      state.backupRestoreRaw = '';
      state.backupRestorePreview = { ok: false, errors: ['The JSON file could not be read.'] };
      state.backupRestoreSource = 'json';
      resetV3ImportOptions();
      render();
      RhythiaX.captureError(error, 'Portable JSON import preview failed');
    });
  }, { once: true });
  document.body.appendChild(input);
  input.click();
}

function v3RestoreOptions() {
  const profileIds = [...(document.querySelector('[data-v3-restore-profiles]')?.selectedOptions || [])].map(option => option.value).filter(Boolean);
  return {
    mode: document.querySelector('[data-v3-restore-mode]')?.value || state.backupRestoreMode,
    profileIds,
    includeHistory: document.querySelector('[data-v3-restore-history]')?.checked !== false,
    includeTitleState: document.querySelector('[data-v3-restore-title]')?.checked !== false,
    includeAppSettings: document.querySelector('[data-v3-restore-app-settings]')?.checked === true,
    includeSettings: document.querySelector('[data-v3-restore-settings]')?.checked !== false,
    dateFrom: document.querySelector('[data-v3-restore-date-from]')?.value || '',
    dateTo: document.querySelector('[data-v3-restore-date-to]')?.value || '',
  };
}

// Single confirm path for both the manual-file and recovery-point restore screens.
// createRecovery stays source-dependent on purpose (D3): a manual file restore still gets
// its own safety recovery point before merging/replacing; restoring a recovery point does
// not recursively create another one. The internal RhythiaX.importDataExport
// settings save already applies the protected-field merge; do not add a
// second save here.
async function confirmV3BackupRestore() {
  if (!state.backupRestoreRaw || !state.backupRestorePreview?.ok) return;
  const isRecovery = state.backupRestoreSource === 'recovery';
  const isBackup = state.backupRestoreSource === 'backup';
  const hasBackupFolder = Boolean(state.backupState?.folderName && state.backupState?.status !== 'setup-required');
  const result = await RhythiaX.importDataExport(state.backupRestoreRaw, { ...v3RestoreOptions(), createRecovery: !isRecovery && hasBackupFolder, allowRepair: true });
  if (!result.ok) {
    if (!isRecovery) state.backupRestorePreview = result;
    render();
    setV3Status(isRecovery ? `Recovery restore failed: ${(result.errors || []).join(' ')}` : `${isBackup ? 'Backup' : 'JSON'} import rejected without changing storage`);
    return;
  }
  const replaced = result.mode === 'replace';
  setV3Status(isRecovery
    ? (replaced ? 'Recovery point restored (replaced)' : 'Recovery point restored (merged)')
    : isBackup
      ? (replaced ? 'Backup replaced safely' : 'Backup merged safely')
      : (replaced ? 'JSON import replaced the selected scope' : 'JSON import merged safely'));
  state.backupRestorePreview = null;
  state.backupRestoreRaw = '';
  state.backupRestoreSource = '';
  await refreshDataState();
}

function dataBackup() {
  return dataBackupRevisedMarkup().replace(
    'Automatic copies contain closed days only. Manual backups can include the current open day. A full recovery point is created before Merge or Replace.',
    'Automatic rolling copies contain closed days only. Manual backups can optionally include the current open day. A Recovery copy is written before a backup restore merges or replaces data.',
  );
}

function dataBackupRevisedMarkup() {
  const backup = state.backup || {};
  const settings = state.dataSettings || {};
  const schedule = settings.localBackupSchedule || (settings.localBackupIntervalDays ? String(settings.localBackupIntervalDays) : '1');
  const health = state.storageHealth || {};
  const statusText = health.readOnly ? 'Storage repair required' : settings.localBackupEnabled === false ? 'Automatic backup disabled' : backup.status === 'up-to-date' ? 'Backup system ready' : backup.status === 'permission-required' ? 'Folder access needed' : backup.status === 'unsupported' ? 'Browser support needed' : backup.status === 'error' ? 'Backup error' : 'Setup required';
  const automaticFiles = Array.isArray(backup.automaticFiles) ? backup.automaticFiles.length : 0;
  const copies = Number(settings.localBackupCopyCount || 2);
  return `<section class="v3-card"><div class="v3-card-title"><strong>Backup &amp; Recovery</strong><span>Offline protection</span></div><div class="v3-backup-status ${backup.status === 'up-to-date' ? 'is-enabled' : ''}"><span class="v3-status-dot"></span><div><strong>${statusText}</strong><span>${escapeHtml(backup.folderName || 'Choose a folder to keep data outside the extension.')}</span></div></div><p class="v3-helper">Automatic copies contain closed days only. Manual backups can include the current open day. A full recovery point is created before Merge or Replace.</p><div class="v3-backup-location"><span class="v3-folder-mark">${icon('data')}</span><div><span>Backup location</span><strong>${escapeHtml(backup.folderName || 'Not selected')}</strong></div><button type="button" class="v3-small-action" data-v3-action="backup-choose">Choose / reconnect</button></div>${backup.hasHandle ? '<div class="v3-button-row v3-backup-destructive-actions"><button type="button" class="v3-secondary-button" data-v3-action="backup-forget">Forget folder access</button><button type="button" class="v3-danger-button" data-v3-action="backup-delete">Delete backup files</button></div>' : ''}<div class="history-summary v3-backup-summary"><div class="summary-card"><strong>${automaticFiles}</strong><span>Automatic copies</span></div><div class="summary-card"><strong>${backupBytesText(backup.automaticBytes)}</strong><span>Automatic</span></div><div class="summary-card"><strong>${backupBytesText(backup.manualBytes)}</strong><span>Manual</span></div><div class="summary-card"><strong>${backupBytesText(backup.recoveryBytes)}</strong><span>Recovery</span></div></div></section><section class="v3-card"><div class="v3-card-title"><strong>Automatic backups</strong><span>Rolling copies</span></div>${checkControl('local-backup-enabled', 'Enable automatic backup schedule')}<label class="v3-setting-row"><span>Schedule</span><select data-v3-backup-schedule>${[['1', 'Every 1 day'], ['3', 'Every 3 days'], ['7', 'Every 7 days'], ['manual', 'Manual only']].map(([value, label]) => `<option value="${value}"${schedule === value ? ' selected' : ''}>${label}</option>`).join('')}</select></label><label class="v3-setting-row"><span>Copies to keep</span><select data-v3-backup-copies>${[1, 2, 3, 5].map(count => `<option value="${count}"${copies === count ? ' selected' : ''}>${count} ${count === 1 ? 'copy' : 'copies'}</option>`).join('')}</select></label><p class="v3-helper">Each new automatic backup becomes the latest copy and replaces the oldest retained copy. Open the latest copy to browse it.</p><div class="v3-button-row"><button type="button" class="v3-secondary-button" data-v3-action="backup-view">Open latest automatic copy</button><button type="button" class="v3-secondary-button" data-v3-action="backup-download">Download latest copy</button></div></section><section class="v3-card"><div class="v3-card-title"><strong>Manual backup &amp; restore</strong><span>On-demand recovery</span></div>${checkControl('backup-open-day', 'Include current open day in manual backup')}${checkControl('backup-app-settings', 'Include app settings in manual backup')}<div class="v3-button-row"><button type="button" class="v3-primary-button" data-v3-action="backup-create">Create manual backup</button><button type="button" class="v3-secondary-button" data-v3-action="backup-recovery-restore">Restore recovery point</button><button type="button" class="v3-secondary-button" data-v3-action="backup-restore">Restore backup file</button></div></section>`;
}

function exportProfileControl() {
  const options = (state.profiles || []).map(profile => `<option value="${escapeHtml(profile.id)}"${String(state.exportProfileId) === String(profile.id) ? ' selected' : ''}>${escapeHtml(profile.name)} (#${escapeHtml(profile.id)})</option>`).join('');
  return `<label class="v3-setting-row v3-export-profile"><span>Profile to export</span><select data-v3-export-profile>${options || '<option value="">No tracked profiles</option>'}</select></label>`;
}

function dataTransfer() {
  const pending = state.dataImport;
  const preview = pending?.preview;
  const importStatus = !preview ? 'No import file selected. Nothing changes until you confirm the preview.'
    : !preview.ok ? `Import rejected: ${(preview.errors || []).join(' ')}`
      : `${preview.profileCount} profile${preview.profileCount === 1 ? '' : 's'}, ${preview.dailyCount} daily record${preview.dailyCount === 1 ? '' : 's'}, ${preview.openCaptureCount} open capture${preview.openCaptureCount === 1 ? '' : 's'}. ${preview.conflicts.length} existing profile${preview.conflicts.length === 1 ? '' : 's'} will be merged; newer capturedAt wins. Review the selected profile before importing.`;
  const importControls = preview?.ok ? `<div class="v3-import-summary"><strong>${preview.profileCount} profile${preview.profileCount === 1 ? '' : 's'} ready to import</strong><span>${preview.conflicts.length ? 'Existing profiles will be merged; newer capturedAt wins.' : 'No existing profile conflicts detected.'}</span></div>${preview.records.length >= 2 ? `<label class="v3-setting-row"><span>Profiles</span><select data-v3-data-import-profile><option value="">All profiles</option>${preview.records.map(record => `<option value="${escapeHtml(record.profileId)}"${String(pending.profileId) === String(record.profileId) ? ' selected' : ''}>${escapeHtml(record.identity?.username || `Player ${record.profileId}`)} (#${escapeHtml(record.profileId)})</option>`).join('')}</select></label>` : ''}${preview.settings ? `<label class="v3-check-row"><input type="checkbox" data-v3-data-import-settings${pending.includeSettings ? ' checked' : ''}><span>Import collection settings</span></label>` : ''}<div class="v3-button-row"><button type="button" class="v3-primary-button" data-v3-action="confirm-data-import">Import JSON</button><button type="button" class="v3-secondary-button" data-v3-action="cancel-data-import">Cancel</button></div>` : '';
  return `<section class="v3-card"><div class="v3-card-title"><strong>Local JSON export</strong><span>Offline only</span></div>${proxyControl('data-export-scope', 'Export scope', 'select', [['all', 'All profiles and daily history'], ['profile', 'Selected profile'], ['daily', 'Daily history only'], ['open-day', 'Include open-day captures']])}${state.exportScope === 'profile' ? exportProfileControl() : ''}<div class="v3-transfer-options">${checkControl('data-export-open-day', 'Include open-day captures')}${checkControl('data-export-title-state', 'Include Title Progression state')}${checkControl('data-export-settings', 'Include collection settings')}${checkControl('data-export-diagnostics', 'Include diagnostics (last 5 attempts)')}</div><div class="v3-button-row"><button type="button" class="v3-primary-button" data-v3-action="export">Export JSON</button></div><p class="v3-helper">To add data from a JSON file or backup, use the Import tab.</p></section>`;
}

function dataProfiles() {
  const profiles = state.profiles || [];
  const query = state.profileQuery.trim().toLocaleLowerCase();
  const matchingProfiles = profiles.filter(profile => `${profile.name} ${profile.id}`.toLocaleLowerCase().includes(query));
  const rows = profiles.map(profile => {
    const searchText = `${profile.name} ${profile.id}`.toLocaleLowerCase();
    const hidden = query && !searchText.includes(query) ? ' hidden' : '';
    return `<div class="v3-profile-row" data-v3-profile-row data-profile-search="${escapeHtml(searchText)}"${hidden}><div><strong>${escapeHtml(profile.name)}</strong><span>Player #${escapeHtml(profile.id)} | ${profile.closedDays} closed days | ${profile.openCaptures} open captures</span></div><div class="v3-profile-actions"><button type="button" data-v3-whitelist-profile="${escapeHtml(profile.id)}">Whitelist</button><a href="https://www.rhythia.com/player/${encodeURIComponent(profile.id)}" target="_blank" rel="noreferrer">Profile</a><button type="button" data-v3-profile="${escapeHtml(profile.id)}">Manage</button></div></div>`;
  }).join('');
  const emptyText = profiles.length ? 'No tracked profile matches that name or ID.' : 'No profiles have been tracked yet. Open a Rhythia profile to start saving history.';
  return `<section class="v3-card"><div class="v3-card-title"><strong>Tracked profiles</strong><span>${profiles.length} saved</span></div><label class="v3-profile-search"><span>Find by name or player ID</span><input type="search" data-v3-profile-search value="${escapeHtml(state.profileQuery)}" placeholder="Start typing a name or ID" autocomplete="off"><small class="v3-search-hint">Results update as you type.</small></label><div data-v3-profile-search-empty${matchingProfiles.length ? ' hidden' : ''} class="v3-helper">${emptyText}</div>${rows}</section><section class="v3-card"><div class="v3-card-title"><strong>Manage Whitelist</strong><span>Protected from cleanup</span></div><div class="v3-whitelist-add"><input type="text" data-v3-whitelist-input placeholder="Player ID, profile URL or nickname"><button type="button" class="v3-secondary-button" data-v3-action="whitelist-add">Add</button></div><p class="v3-helper">Protected profiles stay available during retention and size cleanup.</p><div class="v3-whitelist-list">${(state.dataSettings?.whitelist || []).map(entry => `<span>${escapeHtml(entry.username || entry.id || 'Nickname match')}</span>`).join('') || '<small>No protected profiles yet.</small>'}</div></section>`;
}

function dataScreen() {
  if (state.archive) return archiveScreen();
  const panels = {
    overview: dataOverview,
    storage: dataStorage,
    backup: dataBackupScreen,
    transfer: () => dataTransfer()
      .replace('Local JSON export', 'Portable JSON transfer')
      .replace('Offline only', 'Move or keep profile data')
      .replace('Export JSON', 'Export portable JSON')
      .replace('To add data from a JSON file or backup, use the Import tab.', 'JSON export is for portable profile/data transfer. Backups are managed separately.'),
    import: dataImportScreen,
    profiles: dataProfiles,
  };
  return `${heading('History & Data', 'Review, protect and remove saved profile data.', 'overview')}${dataNav()}${panels[state.dataView]()}${status()}`;
}
