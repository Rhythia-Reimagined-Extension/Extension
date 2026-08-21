// =============================================
// Popup V3 — Native module + module-option controls
// =============================================
// Direct native replacement for the module-*/option-* ids that used to be
// driven through the retained hidden control surface.
// and the retained preset control. Writes the storage keys/shape
// (`rhythiaxModules` / `rhythiaxModuleOptions`)
// so background.js's backup
// scheduling (triggered indirectly through rhythiaxDataSettings, written by
// v3SyncDataCollectionSettings below) and shared/modules.js (the content
// script listening for 'rhythiax-module-settings'/'rhythiax-module-options')
// keep working completely unchanged.
//
// Debounce only controls when a drain begins. The background mutation owner
// serializes each batch, so edits arriving during a commit remain pending for
// the following batch instead of racing a local get()->set().

// Keep in sync with shared/modules.js RhythiaX.MODULE_DEFAULTS/
// MODULE_SETTING_DEFAULTS.
const V3_MODULES_KEY = 'rhythiaxModules';
const V3_MODULE_OPTIONS_KEY = 'rhythiaxModuleOptions';
const V3_MODULE_DEFAULTS = {
  advancedStats: true,
  scoreCards: true,
  titleProgression: true,
  statHistory: true,
  rankingHistory: true,
  playerCompare: true,
  easterEggs: true,
};
const V3_MODULE_OPTION_DEFAULTS = {
  advancedStats: { ratingProfile: true, tempoProfile: true, profileStyle: 'profile-surface', profileMetric: 'percentage' },
  scoreCards: { customCards: true, cardLayout: 'modern', playerView: 'list', watchReplay: true },
  titleProgression: { crownMode: '3d' },
  playerCompare: {},
  easterEggs: {},
};
const V3_MINIMAL_MODULES = {
  ...V3_MODULE_DEFAULTS,
  statHistory: false,
  rankingHistory: false,
  easterEggs: false,
};
const V3_MINIMAL_MODULE_OPTIONS = {
  advancedStats: { ratingProfile: false, tempoProfile: false, profileStyle: 'profile-surface', profileMetric: 'percentage' },
  scoreCards: { customCards: true, cardLayout: 'modern', playerView: 'list', watchReplay: false },
  titleProgression: { crownMode: '3d' },
  playerCompare: {},
  easterEggs: {},
};
function v3NotifyActiveTab(message) {
  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    const tab = tabs[0];
    if (tab?.id) chrome.tabs.sendMessage(tab.id, message).catch(() => {});
  });
}

// Keeps the data-collection
// flags (read by shared/data/data-repository.js) aligned with the module
// switches, and through the background-owned settings mutation keeps backup
// scheduling triggered by rhythiaxDataSettings changes
// working exactly as it did before.
function v3SyncDataCollectionSettings(modules) {
  return RhythiaX.StorageMutationBridge.dataSettingsPatch({
    collectStats: modules.statHistory !== false,
    collectRanking: modules.rankingHistory !== false,
    collectTitleProgression: modules.titleProgression !== false,
  });
}

// Fills in defaults for missing modules/options
function v3NormalizeModuleOptions(options) {
  return Object.keys(V3_MODULE_OPTION_DEFAULTS).reduce((all, name) => {
    const stored = options?.[name] || {};
    const cleanStored = { ...stored };
    if (name === 'scoreCards') delete cleanStored.downloadReplay;
    all[name] = {
      ...V3_MODULE_OPTION_DEFAULTS[name],
      ...(name === 'advancedStats' && stored.ratingProfile === undefined && stored.gradeBreakdown !== undefined
        ? { ratingProfile: stored.gradeBreakdown }
        : {}),
      ...cleanStored,
    };
    return all;
  }, {});
}

// ─── Modules (enable/disable) ─────────────────────────────────
let v3PendingModules = {};
let v3ModuleStatusMessage = 'Module settings updated';
let v3ModulesDraining = false;
let v3ModuleSaveFailures = 0;
const V3_MODULE_SAVE_RETRIES = 3;

async function v3RestoreStoredModules() {
  const stored = await chrome.storage.local.get(V3_MODULES_KEY);
  state.modules = { ...V3_MODULE_DEFAULTS, ...(stored[V3_MODULES_KEY] || {}) };
  render();
}

async function v3DrainModules() {
  if (v3ModulesDraining || !Object.keys(v3PendingModules).length) return;
  v3ModulesDraining = true;
  const changes = v3PendingModules;
  const message = v3ModuleStatusMessage;
  v3PendingModules = {};
  try {
    const saved = await RhythiaX.StorageMutationBridge.appSettingsPatch({ modules: changes });
    const normalized = { ...V3_MODULE_DEFAULTS, ...(saved[V3_MODULES_KEY] || {}) };
    state.modules = normalized;
    await v3SyncDataCollectionSettings(normalized);
    v3NotifyActiveTab({ type: 'rhythiax-module-settings', settings: normalized });
    v3ModuleSaveFailures = 0;
    setV3Status(message);
  } catch (error) {
    v3PendingModules = { ...changes, ...v3PendingModules };
    RhythiaX.captureError?.(error, 'Module settings save failed');
    v3ModuleSaveFailures++;
    if (v3ModuleSaveFailures >= V3_MODULE_SAVE_RETRIES) {
      v3PendingModules = {};
      try { await v3RestoreStoredModules(); } catch (_) { render(); }
      setV3Status('Module settings could not be saved. Saved values were reloaded.');
    }
  } finally {
    v3ModulesDraining = false;
    if (Object.keys(v3PendingModules).length) setTimeout(v3DrainModules, 250 * v3ModuleSaveFailures);
  }
}

const v3FlushModules = RhythiaX.debounce(v3DrainModules, 250);

// Direct native replacement for the module toggle control.
function setV3ModuleEnabled(moduleId, enabled) {
  if (!(moduleId in V3_MODULE_DEFAULTS)) return;
  state.modules[moduleId] = enabled;
  v3PendingModules[moduleId] = enabled;
  v3ModuleStatusMessage = Object.keys(v3PendingModules).length > 1
    ? 'Module settings updated'
    : `${enabled ? 'Enabled' : 'Disabled'}: ${moduleId}`;
  v3FlushModules();
}

// ─── Module options ─────────────────────────────────
let v3PendingModuleOptions = {};
let v3OptionStatusMessage = 'Module settings updated';
let v3ModuleOptionsDraining = false;
let v3ModuleOptionSaveFailures = 0;

async function v3RestoreStoredModuleOptions() {
  const stored = await chrome.storage.local.get(V3_MODULE_OPTIONS_KEY);
  state.moduleOptions = v3NormalizeModuleOptions(stored[V3_MODULE_OPTIONS_KEY]);
  render();
}

async function v3DrainModuleOptions() {
  if (v3ModuleOptionsDraining || !Object.keys(v3PendingModuleOptions).length) return;
  v3ModuleOptionsDraining = true;
  const changes = v3PendingModuleOptions;
  const message = v3OptionStatusMessage;
  v3PendingModuleOptions = {};
  try {
    const saved = await RhythiaX.StorageMutationBridge.appSettingsPatch({ moduleOptions: changes });
    const normalized = v3NormalizeModuleOptions(saved[V3_MODULE_OPTIONS_KEY]);
    state.moduleOptions = normalized;
    v3NotifyActiveTab({ type: 'rhythiax-module-options', options: normalized });
    v3ModuleOptionSaveFailures = 0;
    setV3Status(message);
  } catch (error) {
    v3PendingModuleOptions = { ...changes, ...v3PendingModuleOptions };
    RhythiaX.captureError?.(error, 'Module option save failed');
    v3ModuleOptionSaveFailures++;
    if (v3ModuleOptionSaveFailures >= V3_MODULE_SAVE_RETRIES) {
      v3PendingModuleOptions = {};
      try { await v3RestoreStoredModuleOptions(); } catch (_) { render(); }
      setV3Status('Module options could not be saved. Saved values were reloaded.');
    }
  } finally {
    v3ModuleOptionsDraining = false;
    if (Object.keys(v3PendingModuleOptions).length) setTimeout(v3DrainModuleOptions, 250 * v3ModuleOptionSaveFailures);
  }
}

const v3FlushModuleOptions = RhythiaX.debounce(v3DrainModuleOptions, 250);

// Direct native replacement for a module-option control.
// `checkControl()`/`choiceControl()`/`proxyControl()` in v3-markup-core.js
// now read option values straight from `state.moduleOptions` (instead of the
// hidden compatibility DOM), so every native option write also updates
// `state.moduleOptions` in memory (in addition to queuing the change for the
// debounced storage flush below) — otherwise the very next render() (which
// runs synchronously, well before the debounced storage round trip
// completes) would still show the old value.
function setV3ModuleOption(moduleId, optionId, value) {
  const defaults = V3_MODULE_OPTION_DEFAULTS[moduleId];
  if (!defaults || !(optionId in defaults)) return;
  state.moduleOptions[moduleId] = { ...(state.moduleOptions[moduleId] || {}), [optionId]: value };
  v3PendingModuleOptions[moduleId] = { ...(v3PendingModuleOptions[moduleId] || {}), [optionId]: value };
  v3OptionStatusMessage = moduleId === 'scoreCards' && optionId === 'cardLayout'
    ? `${value === 'legacy' ? 'Legacy' : 'Modern'} card design saved`
    : 'Module settings updated';
  v3FlushModuleOptions();
}

// Parses a real `option-<moduleId>-<optionId>` id back into its parts.
// Module/option names never contain dashes today, but matching against the
// known module keys (instead of a plain split) keeps this correct even if
// that changes.
function v3ParseModuleOptionId(id) {
  const moduleId = Object.keys(V3_MODULE_OPTION_DEFAULTS).find(name => id.startsWith(`option-${name}-`));
  if (!moduleId) return null;
  return { moduleId, optionId: id.slice(`option-${moduleId}-`.length) };
}

// Routes a v3-choice/v3-proxy control id to setV3ModuleOption() when it
// targets a module option. Returns false (and does nothing) for every other
// id, so callers can ignore unrecognized controls.
function applyV3ModuleOptionControl(id, value, checked) {
  const parsed = v3ParseModuleOptionId(id);
  if (!parsed) return false;
  const isBoolean = typeof V3_MODULE_OPTION_DEFAULTS[parsed.moduleId][parsed.optionId] === 'boolean';
  setV3ModuleOption(parsed.moduleId, parsed.optionId, isBoolean ? checked : value);
  return true;
}

// ─── Presets ─────────────────────────────────
// Direct native replacement for the retained preset path (which used to
// .click() the hidden `.preset[data-preset]` button). Replicates
// minimal/default overwrite both modules and options in one go; custom only updates status
// (module/option state stays whatever it already was — V3's preset()
// helper in v3-markup-core.js derives the "custom" label purely from
// state.modules, same as before).
function applyV3ModulePreset(preset) {
  if (preset !== 'minimal' && preset !== 'default') {
    setV3Status('Custom preset selected');
    return;
  }
  const modules = preset === 'minimal' ? V3_MINIMAL_MODULES : V3_MODULE_DEFAULTS;
  const options = preset === 'minimal' ? V3_MINIMAL_MODULE_OPTIONS : V3_MODULE_OPTION_DEFAULTS;
  Object.keys(modules).forEach(name => { state.modules[name] = modules[name]; });
  v3PendingModules = { ...modules };
  v3ModuleStatusMessage = preset === 'minimal' ? 'Minimal preset selected' : 'Default preset selected';
  v3PendingModuleOptions = JSON.parse(JSON.stringify(options));
  state.moduleOptions = JSON.parse(JSON.stringify(options));
  v3OptionStatusMessage = preset === 'minimal' ? 'Minimal options applied' : 'Default options applied';
  v3FlushModules();
  v3FlushModuleOptions();
  render();
}

// ─── Reset to defaults ─────────────────────────────────
// applyV3ModulePreset('default') establishes the module defaults while
// saveDataSettings() resets data settings. The final user-visible status is
// "Default options applied", so no intermediate status is needed. This has
// the same net
// storage state (rhythiaxModules/rhythiaxModuleOptions
// all equal to *_DEFAULTS, exactly as if written twice) and the same final
// status message without duplicating storage writes.
// dataSettingsReplace(DATA_DEFAULT_SETTINGS) fully replaces
// (not merges) rhythiaxDataSettings — this also resets the whitelist,
// history retention/limits, and local backup schedule/enable state back to
// defaults (the confirm text "Saved history and
// profiles will be kept" refers to the collected history/profile records
// themselves, which this never touches — only settings governing them).
function resetV3Settings() {
  setV3Theme('reimagined');
  applyV3ModulePreset('default');
  return RhythiaX.StorageMutationBridge.dataSettingsReplace(RhythiaX.DATA_DEFAULT_SETTINGS).then(settings => {
    state.dataSettings = settings;
    render();
  });
}
