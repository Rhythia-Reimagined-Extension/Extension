// Consume the background request natively after the initial V3 surface exists.
// Legacy uses the same remove-on-truthy protocol; failed reads/removes do not open the screen.
function consumeV3BackupSettingsRequest(result) {
  if (!result[RhythiaX.DATA_BACKUP_OPEN_SETTINGS_KEY]) return;
  chrome.storage.local.remove(RhythiaX.DATA_BACKUP_OPEN_SETTINGS_KEY, () => {
    if (chrome.runtime.lastError) return;
    openV3BackupSettings();
  });
}

RhythiaX.PopupV3.start = function () {
// Seed with real defaults synchronously (matching state.modules above) so
// the render() call at the very end of this function — which runs before
// the async chrome.storage.local.get() below resolves — never shows
// undefined module-option values.
state.moduleOptions = JSON.parse(JSON.stringify(V3_MODULE_OPTION_DEFAULTS));
chrome.storage.local.get(['rhythiaxModules', 'rhythiaxModuleOptions', 'rhythiaxDebugLogs', 'rhythiaxTheme', 'rhythiaxPopupSize', 'rhythiaxPopupSizeVersion', RhythiaX.DATA_BACKUP_OPEN_SETTINGS_KEY], result => {
  state.modules = { ...DEFAULT_MODULES, ...(result.rhythiaxModules || {}) };
  state.moduleOptions = v3NormalizeModuleOptions(result.rhythiaxModuleOptions);
  state.debugLogs = result.rhythiaxDebugLogs === true;
  state.theme = result.rhythiaxTheme?.preset === 'rhythia-reimagined' ? 'reimagined' : (result.rhythiaxTheme?.preset || state.theme);
  // Migrate the old small -> default/large
  // storage format the first time V3 sees a stale version stamp.
  const storedVersion = Number(result.rhythiaxPopupSizeVersion || 0);
  if (storedVersion < V3_POPUP_SIZE_VERSION) {
    const migratedSize = storedVersion >= 2 && result.rhythiaxPopupSize
      ? (result.rhythiaxPopupSize === 'small' ? 'default' : 'large')
      : 'default';
    chrome.storage.local.set({ [V3_POPUP_SIZE_KEY]: migratedSize, [V3_POPUP_SIZE_VERSION_KEY]: V3_POPUP_SIZE_VERSION });
    state.size = migratedSize;
  } else {
    state.size = result.rhythiaxPopupSize === 'large' ? 'large' : 'default';
  }
  v3ApplyPopupSizeVars(state.size);
  render();
  refreshDataState();
  consumeV3BackupSettingsRequest(result);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.rhythiaxDataSettings) {
    state.dataSettings = changes.rhythiaxDataSettings.newValue || state.dataSettings;
    if (state.route === 'data') render();
  }
  if (changes.rhythiaxModules) state.modules = { ...DEFAULT_MODULES, ...(changes.rhythiaxModules.newValue || {}) };
  if (changes.rhythiaxModuleOptions) state.moduleOptions = v3NormalizeModuleOptions(changes.rhythiaxModuleOptions.newValue);
  if (changes.rhythiaxDebugLogs) state.debugLogs = changes.rhythiaxDebugLogs.newValue === true;
  if (changes.rhythiaxTheme) state.theme = changes.rhythiaxTheme.newValue?.preset === 'rhythia-reimagined' ? 'reimagined' : (changes.rhythiaxTheme.newValue?.preset || state.theme);
  if (changes.rhythiaxPopupSize) { state.size = changes.rhythiaxPopupSize.newValue === 'large' ? 'large' : 'default'; v3ApplyPopupSizeVars(state.size); }
  if (changes.rhythiaxModules || changes.rhythiaxModuleOptions || changes.rhythiaxDebugLogs || changes.rhythiaxTheme || changes.rhythiaxPopupSize) { render(); refreshDataState(); }
});
render();
};
