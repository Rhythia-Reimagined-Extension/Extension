function closeV3Modal() {
  state.pendingAction = null;
  render();
}

screen.addEventListener('click', event => {
  if (event.target.closest('[data-v3-modal-close]')) { closeV3Modal(); return; }
  if (event.target.closest('[data-v3-modal-review]')) { if (state.pendingAction) state.pendingAction.phase = 'confirm'; render(); return; }
  if (event.target.closest('[data-v3-modal-back]')) { if (state.pendingAction) state.pendingAction.phase = 'select'; render(); return; }
   if (event.target.closest('[data-v3-modal-confirm]')) { executePendingAction().catch(error => { state.pendingAction = null; render(); setV3Status(error?.message || 'The data action failed.'); }); return; }
  const route = event.target.closest('[data-v3-route]');
  if (route) return setRoute(route.dataset.v3Route);
   const configure = event.target.closest('[data-v3-configure]');
   if (configure) return setRoute(`module:${configure.dataset.v3Configure}`);
   const choice = event.target.closest('[data-v3-choice]');
   if (choice) {
      if (applyV3ModuleOptionControl(choice.dataset.v3Choice, choice.dataset.v3Value)) { render(); return; }
      return;
   }
  const theme = event.target.closest('[data-v3-theme]');
  if (theme) { setV3Theme(theme.dataset.v3Theme); return; }
  const size = event.target.closest('[data-v3-size]');
  if (size) { setV3PopupSize(size.dataset.v3Size); return; }
  const presetButton = event.target.closest('[data-v3-preset]');
  if (presetButton) { applyV3ModulePreset(presetButton.dataset.v3Preset); return; }
  if (event.target.closest('[data-v3-reset]')) { if (window.confirm('Reset popup settings to defaults? Saved history and profiles will be kept.')) resetV3Settings().catch(error => setV3Status(error?.message || 'Settings reset failed.')); return; }
  const dataView = event.target.closest('[data-v3-data-view]');
  if (dataView) { state.dataView = dataView.dataset.v3DataView; render(); return; }
    const profile = event.target.closest('[data-v3-profile]');
     if (profile) { ++state.profileImportSelectionGeneration; state.profileId = profile.dataset.v3Profile; state.profileView = 'overview'; state.profileImport = null; state.route = 'profile-detail'; render(); return; }
    const whitelistProfile = event.target.closest('[data-v3-whitelist-profile]');
    if (whitelistProfile) {
      const input = screen.querySelector('[data-v3-whitelist-input]');
      if (input) {
        input.value = whitelistProfile.dataset.v3WhitelistProfile;
        addWhitelistEntryV3().catch(() => setV3Status('Whitelist update failed'));
      }
      return;
    }
    const whitelistRemove = event.target.closest('[data-v3-whitelist-remove]');
    if (whitelistRemove) { removeWhitelistEntryV3(whitelistRemove.dataset.v3WhitelistRemove).catch(() => setV3Status('Whitelist update failed')); return; }
   const profileView = event.target.closest('[data-v3-profile-view]');
   if (profileView) { state.profileView = profileView.dataset.v3ProfileView; render(); return; }
   const action = event.target.closest('[data-v3-action]')?.dataset.v3Action;
   if (!action) return;
    if (action === 'profiles' || action === 'delete-selected') return openDataSelection('delete-selected', 'global-selected');
   if (action === 'delete-all') return openDataSelection('delete-all', 'global-all');
   if (action === 'delete-title') return openDataSelection('delete-title', 'global-selected', { statHistory: false, rankingHistory: false, openDay: false, titleProgression: true });
    if (action === 'profile-delete') return openDataSelection('profile-delete', 'profile');
    if (action === 'profile-remove') return openDataSelection('profile-remove', 'remove');
     if (action === 'save-profile-json') return saveProfileJson();
    if (action === 'copy-profile-json') return copyProfileJson();
    if (action === 'download-profile-json') return downloadProfileJson();
    if (action === 'backup-choose' || action === 'backup-open') { chooseV3LocalBackupFolder().catch(error => setV3Status(error?.message || 'Local backup setup was not completed')); return; }
    if (action === 'backup-create') { createV3ManualBackup().catch(error => setV3Status(error?.message || 'Manual backup failed')); return; }
    if (action === 'backup-view') { viewV3AutomaticBackup(0).catch(error => setV3Status(error?.message || 'The local backup could not be read')); return; }
    if (action === 'backup-download') { downloadV3LocalBackupCopy().catch(error => setV3Status(error?.message || 'The backup copy could not be prepared')); return; }
    if (action === 'backup-view-current') { viewV3AutomaticBackup(0).catch(error => setV3Status(error?.message || 'Backup could not be opened')); return; }
    if (action === 'backup-view-previous') { viewV3AutomaticBackup(1).catch(error => setV3Status(error?.message || 'Backup could not be opened')); return; }
    if (action === 'backup-archive-open') { chooseV3ArchiveFile(); return; }
    if (action === 'archive-back' || action === 'archive-exit') { state.archive = null; state.dataView = 'backup'; render(); return; }
     if (action === 'import-recovery') { loadV3RecoveryPreview().catch(error => setV3Status(error?.message || 'Recovery point could not be opened')); return; }
     if (action === 'import-json') { chooseV3PortableFileToImport(); return; }
     if (action === 'import-backup') { chooseV3BackupFileToRestore(); return; }
     if (action === 'import-cancel') { state.backupRestorePreview = null; state.backupRestoreRaw = ''; state.backupRestoreSource = ''; render(); return; }
     if (action === 'import-confirm') { confirmV3BackupRestore().catch(error => setV3Status(error?.message || 'Import failed')); return; }
    if (action === 'export') { exportV3Data(); return; }
    if (action === 'import') { chooseV3DataImport(); return; }
     if (action === 'cancel-data-import') { ++state.dataImportSelectionGeneration; state.dataImport = null; render(); return; }
     if (action === 'confirm-data-import') { confirmV3DataImport(); return; }
    if (action === 'backup-forget' || action === 'backup-delete') { openV3BackupConfirmation(action); return; }
    if (action === 'whitelist-add') { addWhitelistEntryV3().catch(() => setV3Status('Whitelist update failed')); }
});

 screen.addEventListener('change', event => {
  const exportScope = event.target.closest('[data-v3-proxy="data-export-scope"]');
  if (exportScope) { state.exportScope = exportScope.value; render(); return; }
   const exportProfile = event.target.closest('[data-v3-export-profile]');
   if (exportProfile) { state.exportProfileId = exportProfile.value; return; }
   const archiveProfile = event.target.closest('[data-v3-archive-profile]');
   if (archiveProfile) { state.profileId = archiveProfile.value; render(); return; }
   const archiveMetric = event.target.closest('[data-v3-archive-metric]');
   if (archiveMetric) { state.archive.metric = archiveMetric.value; render(); return; }
  const deleteChoice = event.target.closest('[data-v3-delete-choice]');
  if (deleteChoice) { state.deleteChoices[deleteChoice.dataset.v3DeleteChoice] = deleteChoice.checked; render(); return; }
  const deleteProfiles = event.target.closest('[data-v3-delete-profiles]');
  if (deleteProfiles) { state.deleteWholeProfiles = deleteProfiles.checked; render(); return; }
  const metric = event.target.closest('[data-v3-profile-metric]');
  if (metric) { state.profileMetric = metric.value; render(); return; }
  });

screen.addEventListener('input', event => {
  const search = event.target.closest('[data-v3-profile-search]');
  if (!search) return;
  state.profileQuery = search.value;
  const query = state.profileQuery.trim().toLocaleLowerCase();
  let visible = 0;
  screen.querySelectorAll('[data-v3-profile-row]').forEach(row => {
    const match = !query || String(row.dataset.profileSearch || '').includes(query);
    row.hidden = !match;
    if (match) visible++;
  });
  const empty = screen.querySelector('[data-v3-profile-search-empty]');
  if (empty) {
    empty.hidden = visible > 0;
    if (!visible && state.profiles.length) empty.textContent = 'No tracked profile matches that name or ID.';
  }
});
 screen.addEventListener('change', event => {
   const moduleToggle = event.target.closest('[data-v3-module-toggle]');
   if (moduleToggle) { setV3ModuleEnabled(moduleToggle.dataset.v3ModuleToggle, moduleToggle.checked); render(); return; }
   const backupSchedule = event.target.closest('[data-v3-backup-schedule]');
   if (backupSchedule) {
     const value = backupSchedule.value;
       RhythiaX.StorageMutationBridge.dataSettingsPatch({ localBackupSchedule: value, localBackupIntervalDays: value === 'manual' ? 0 : Number(value) }).then(settings => { state.dataSettings = settings; render(); }).catch(error => setV3Status(error?.message || 'Backup schedule could not be saved'));
     return;
   }
   const backupCopies = event.target.closest('[data-v3-backup-copies]');
   if (backupCopies) {
      RhythiaX.StorageMutationBridge.dataSettingsPatch({ localBackupCopyCount: Number(backupCopies.value) }).then(settings => { state.dataSettings = settings; render(); }).catch(error => setV3Status(error?.message || 'Backup copy count could not be saved'));
     return;
   }
   const restoreMode = event.target.closest('[data-v3-restore-mode]');
   if (restoreMode) { state.backupRestoreMode = restoreMode.value; return; }
   const restoreProfiles = event.target.closest('[data-v3-restore-profiles]');
   if (restoreProfiles) { state.backupRestoreProfiles = [...restoreProfiles.selectedOptions].map(option => option.value).filter(Boolean); return; }
   const restoreHistory = event.target.closest('[data-v3-restore-history]');
   if (restoreHistory) { state.backupRestoreIncludeHistory = restoreHistory.checked; return; }
   const restoreTitle = event.target.closest('[data-v3-restore-title]');
   if (restoreTitle) { state.backupRestoreIncludeTitle = restoreTitle.checked; return; }
   const restoreAppSettings = event.target.closest('[data-v3-restore-app-settings]');
   if (restoreAppSettings) { state.backupRestoreIncludeAppSettings = restoreAppSettings.checked; return; }
    const restoreSettings = event.target.closest('[data-v3-restore-settings]');
    if (restoreSettings) { state.backupRestoreIncludeSettings = restoreSettings.checked; return; }
    const importDateRange = event.target.closest('[data-v3-import-date-range]');
    if (importDateRange) {
      const preset = importDateRange.value;
      const today = new Date();
      const formatDate = date => date.toISOString().slice(0, 10);
      const daysAgo = days => { const date = new Date(today); date.setDate(date.getDate() - days); return formatDate(date); };
      state.backupRestoreDatePreset = preset;
      state.backupRestoreDateFrom = preset === 'week' ? daysAgo(6) : preset === 'two-weeks' ? daysAgo(13) : preset === 'month' ? daysAgo(29) : '';
      state.backupRestoreDateTo = preset === 'choose' ? '' : preset === 'all' ? '' : formatDate(today);
      render();
      return;
    }
    const restoreFrom = event.target.closest('[data-v3-restore-date-from]');
    if (restoreFrom) { state.backupRestoreDatePreset = 'choose'; state.backupRestoreDateFrom = restoreFrom.value; return; }
     const restoreTo = event.target.closest('[data-v3-restore-date-to]');
     if (restoreTo) { state.backupRestoreDatePreset = 'choose'; state.backupRestoreDateTo = restoreTo.value; return; }
    const dataImportProfile = event.target.closest('[data-v3-data-import-profile]');
    if (dataImportProfile && state.dataImport) { state.dataImport.profileId = dataImportProfile.value; return; }
    const dataImportSettings = event.target.closest('[data-v3-data-import-settings]');
    if (dataImportSettings && state.dataImport) { state.dataImport.includeSettings = dataImportSettings.checked; return; }
   const proxy = event.target.closest('[data-v3-proxy]');
   if (proxy) {
     const historyHandler = V3_HISTORY_SETTINGS_HANDLERS[proxy.dataset.v3Proxy];
     if (proxy.dataset.v3Proxy === 'debugLogs') setV3DebugLogging(proxy.checked);
     else if (V3_EXPORT_CHECKBOX_STATE_KEYS[proxy.dataset.v3Proxy]) { state[V3_EXPORT_CHECKBOX_STATE_KEYS[proxy.dataset.v3Proxy]] = proxy.checked; render(); }
      else if (proxy.dataset.v3Proxy === 'local-backup-enabled') {
        const enabled = proxy.checked;
        if (enabled) enableV3LocalBackupFromToggle().catch(error => setV3Status(error?.message || 'Local backup setting could not be saved'));
        else saveV3HistorySettings({ localBackupEnabled: false }, 'Local backup disabled').catch(error => setV3Status(error?.message || 'Local backup setting could not be saved'));
     }
     else if (historyHandler) {
       const { patch, message } = historyHandler(proxy.value);
       saveV3HistorySettings(patch, message).catch(error => setV3Status(error?.message || 'Data collection settings could not be saved'));
     }
     else if (applyV3ModuleOptionControl(proxy.dataset.v3Proxy, proxy.value, proxy.checked)) { render(); }
      else return;
  }
   const openDay = event.target.closest('[data-v3-backup-open-day]');
   if (openDay) { state.backupIncludeOpenDay = openDay.checked; return; }
   const appSettings = event.target.closest('[data-v3-backup-app-settings]');
   if (appSettings) { state.backupIncludeAppSettings = appSettings.checked; return; }
 });

nav.addEventListener('click', event => { const button = event.target.closest('[data-v3-route]'); if (button) setRoute(button.dataset.v3Route); });
document.addEventListener('keydown', event => {
  const modal = screen.querySelector('[role="dialog"]');
  if (!modal) return;
  if (event.key === 'Escape') { event.preventDefault(); closeV3Modal(); return; }
  if (event.key !== 'Tab') return;
  const focusable = [...modal.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]')];
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
document.querySelector('#tools-trigger')?.addEventListener('click', event => { event.preventDefault(); setRoute('about'); });
document.querySelector('.popup-footer')?.addEventListener('click', event => { const button = event.target.closest('[data-v3-route]'); if (button) setRoute(button.dataset.v3Route); });
document.querySelector('#debugLogs-visible')?.addEventListener('change', event => {
  setV3DebugLogging(event.target.checked);
});
function openV3BackupSettings() { state.dataView = 'backup'; setRoute('data'); }
window.addEventListener('rhythiax-backup-settings-request', openV3BackupSettings);
window.addEventListener('rhythiax-backup-restore-preview', event => {
  state.backupRestorePreview = event.detail || null;
  state.backupRestoreRaw = '';
  if (state.route === 'data') render();
});
