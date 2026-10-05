// ==========================================================================
// Rhythia Reimagined — Unified Popup v4 Controller
// ==========================================================================

(function () {
  'use strict';

  // ─── Default Configurations ───
  const DEFAULT_MODULES = {
    advancedStats: true,
    scoreCards: true,
    titleProgression: true,
    playerCompare: true,
    statHistory: true,
    rankingHistory: true,
    easterEggs: true,
  };

  const DEFAULT_MODULE_OPTIONS = {
    appearance: {
      theme: 'reimagined',
      size: 'default',
      dateFormat: 'yyyy-mm-dd',
    },
    scoreCards: {
      customCards: true,
      cardLayout: 'variant_a',
      playerView: 'list',
      cardBackgrounds: true,
      dateFormat: 'yyyy-mm-dd',
      showModIcons: true,
      showModText: false,
    },
    titleProgression: {
      showProgression: true,
      showHistory: true,
      crownMode: '3d',
    },
    advancedStats: {
      playstyleTab: true,
      scoutingSummary: true,
      performanceBreakdown: true,
      bestMaps: true,
    },
    playerCompare: {},
    easterEggs: {
      visuals: true,
      numbers: true,
    },
  };

  function normalizeScoreCardOptions(options = {}) {
    const labelsOnly = options.showModIcons === false && options.showModText !== false;
    return { ...DEFAULT_MODULE_OPTIONS.scoreCards, ...options, showModIcons: !labelsOnly, showModText: labelsOnly };
  }

  const DEFAULT_DATA_SETTINGS = {
    retentionDays: 90,
    maxStorageMb: 25,
    openDayMaxMb: 5,
    inlineRankingReference: 'previousDayClose',
    telemetryEnabled: true,
    syncMode: 'hybrid',
    communityConsentVersion: 0,
  };

  // State in memory
  let state = {
    theme: 'reimagined',
    size: 'default',
    modules: { ...DEFAULT_MODULES },
    moduleOptions: JSON.parse(JSON.stringify(DEFAULT_MODULE_OPTIONS)),
    dataSettings: { ...DEFAULT_DATA_SETTINGS },
  };

  // ─── DOM References ───
  const root = document.getElementById('popupRoot');
  root.inert = true;

  // Persist while the popup is still open; closing it cancels pending timers.
  function persistSetting(fn) {
    fn();
  }

  async function persistDataPatch(patch) {
    const response = await chrome.runtime.sendMessage({
      type: 'rhythiax-storage-mutation', operation: 'data-settings-patch', payload: { patch },
    });
    if (!response?.ok) throw new Error(response?.error || 'Data settings could not be saved.');
    if (response.value) state.dataSettings = { ...DEFAULT_DATA_SETTINGS, ...response.value };
    notifyActiveTabs({ type: 'rhythiax-data-settings', settings: state.dataSettings });
  }

  function saveDataChoice(patch) {
    persistDataPatch(patch).catch(async () => {
      alert('The setting could not be saved. Reopen the popup to retry.');
      await loadState();
    });
  }

  function hasCommunityConsent() {
    return state.dataSettings.communityConsentVersion === 1;
  }

  function openCommunityChoices() {
    document.getElementById('tabBtn-cloud')?.click();
    document.getElementById('syncModePillGroup')?.scrollIntoView?.({ block: 'nearest' });
  }

  async function chooseCommunity(event, mode) {
    if (!event.isTrusted) return;
    const buttons = Array.from(document.querySelectorAll('#syncModePillGroup .pill-btn'));
    if (buttons.some(button => button.disabled)) return;
    buttons.forEach(button => { button.disabled = true; });
    try {
      const choice = mode === 'local-only' ? 'local-only' : mode === 'cloud-only' ? 'cloud-no-reports' : 'hybrid-no-reports';
      const response = await chrome.runtime.sendMessage({ type: 'rhythiax-community-consent', choice });
      if (!response?.ok) throw new Error('Community settings could not be saved.');
      state.dataSettings = { ...DEFAULT_DATA_SETTINGS, ...response.value };
      applyStateToUI();
      notifyActiveTabs({ type: 'rhythiax-history-settings' });
    } catch (_) { alert('Your choice could not be saved. Please try again.'); }
    finally { buttons.forEach(button => { button.disabled = false; }); }
  }

  function notifyActiveTabs(message) {
    if (!chrome.tabs?.query) return;
    const sent = new Set();
    const send = tabs => {
      (tabs || []).forEach(tab => {
        if (tab?.id && !sent.has(tab.id)) {
          sent.add(tab.id);
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
      });
    };
    chrome.tabs.query({ url: ['*://*.rhythia.com/*', '*://rhythia.com/*'] }, send);
    chrome.tabs.query({ active: true }, send);
    chrome.tabs.query({ active: true, lastFocusedWindow: true }, send);
    chrome.tabs.query({ active: true, currentWindow: true }, send);
  }

  // ─── 1. Storage Loader & Synchronizer ───
  async function loadState() {
    root.inert = true;
    try {
      const ready = await chrome.runtime.sendMessage({ type: 'rhythiax-data-ready' });
      if (!ready?.ok) throw new Error(ready?.error || 'Local data is not ready. Reopen the popup to retry.');
      const result = await chrome.storage.local.get([
        'rhythiaxMasterActive',
        'rhythiaxTheme',
        'rhythiaxPopupSize',
        'rhythiaxModules',
        'rhythiaxModuleOptions',
        'rhythiaxDataSettings',
        'rhythiax_connection_logs',
      ]);

      if (result.rhythiaxMasterActive === false) {
        chrome.storage.local.set({ rhythiaxMasterActive: true });
        notifyActiveTabs({ type: 'rhythiax-master-toggle', active: true });
      }
      if (result.rhythiaxTheme) {
        state.theme = ['reimagined', 'dark', 'white'].includes(result.rhythiaxTheme) ? result.rhythiaxTheme : 'reimagined';
      }
      if (result.rhythiaxPopupSize) {
        state.size = ['default', 'large'].includes(result.rhythiaxPopupSize) ? result.rhythiaxPopupSize : 'default';
      }
      if (result.rhythiaxModules) {
        state.modules = { ...DEFAULT_MODULES, ...result.rhythiaxModules };
      }
      if (result.rhythiaxModuleOptions) {
        state.moduleOptions = {
          appearance: { ...DEFAULT_MODULE_OPTIONS.appearance, ...(result.rhythiaxModuleOptions.appearance || {}) },
          scoreCards: normalizeScoreCardOptions(result.rhythiaxModuleOptions.scoreCards),
          titleProgression: { ...DEFAULT_MODULE_OPTIONS.titleProgression, ...(result.rhythiaxModuleOptions.titleProgression || {}) },
          advancedStats: {
            ...DEFAULT_MODULE_OPTIONS.advancedStats,
            ...(result.rhythiaxModuleOptions.advancedStats || {}),
            performanceBreakdown: result.rhythiaxModuleOptions.advancedStats?.performanceBreakdown ?? result.rhythiaxModuleOptions.advancedStats?.performanceFilters ?? true,
            playstyleTab: result.rhythiaxModuleOptions.advancedStats?.playstyleTab ?? result.rhythiaxModuleOptions.advancedStats?.playstyleDeck ?? true,
          },
          playerCompare: { ...(result.rhythiaxModuleOptions.playerCompare || {}) },
          easterEggs: { ...DEFAULT_MODULE_OPTIONS.easterEggs, ...(result.rhythiaxModuleOptions.easterEggs || {}) },
        };
      }
      delete state.moduleOptions.advancedStats.performanceFilters;
      if (result.rhythiaxDataSettings) {
        state.dataSettings = { ...DEFAULT_DATA_SETTINGS, ...result.rhythiaxDataSettings };
      }

      applyStateToUI();
      const notice = document.getElementById('dataReadinessNotice');
      if (notice) notice.hidden = true;
      loadStorageStats();
      renderConnectionLogs(result.rhythiax_connection_logs || []);
      root.inert = false;
    } catch (err) {
      console.error('RhythiaX: Failed to load popup state:', err);
      const notice = document.getElementById('dataReadinessNotice');
      if (notice) {
        notice.hidden = false;
        notice.textContent = 'Your local data could not be prepared. Settings are locked to protect it. Reopen this popup to retry.';
      }
    }
  }

  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName && areaName !== 'local') return;
      if (changes.rhythiaxTheme?.newValue) {
        state.theme = changes.rhythiaxTheme.newValue;
      }
      if (changes.rhythiaxPopupSize?.newValue) {
        state.size = changes.rhythiaxPopupSize.newValue;
      }
      if (changes.rhythiaxModules?.newValue) {
        state.modules = { ...DEFAULT_MODULES, ...changes.rhythiaxModules.newValue };
      }
      if (changes.rhythiaxModuleOptions?.newValue) {
        state.moduleOptions = Object.fromEntries(Object.entries(DEFAULT_MODULE_OPTIONS).map(([name, defaults]) =>
          [name, name === 'scoreCards' ? normalizeScoreCardOptions(changes.rhythiaxModuleOptions.newValue[name]) : { ...defaults, ...changes.rhythiaxModuleOptions.newValue[name] }]));
      }
      if (changes.rhythiaxDataSettings?.newValue) {
        state.dataSettings = { ...DEFAULT_DATA_SETTINGS, ...changes.rhythiaxDataSettings.newValue };
      }
      const options = changes.rhythiaxModuleOptions?.newValue?.advancedStats;
      if (options) {
        state.moduleOptions.advancedStats.performanceBreakdown = options.performanceBreakdown ?? options.performanceFilters ?? true;
        delete state.moduleOptions.advancedStats.performanceFilters;
      }
      applyStateToUI();
    });
  }

  // ─── 2. Apply State to UI Elements ───
  function applyStateToUI() {
    // Body classes & Dimensions
    root.className = `theme-${state.theme} size-${state.size}`;

    // Theme & Size pills
    document.querySelectorAll('#themePillGroup .pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === state.theme);
    });
    document.querySelectorAll('#sizePillGroup .pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.size === state.size);
    });

    // Module toggles
    setCheckbox('mod-scoreCards', state.modules.scoreCards !== false);
    setCheckbox('mod-titleProgression', state.modules.titleProgression !== false);
    setCheckbox('mod-advancedStats', state.modules.advancedStats !== false);
    setCheckbox('mod-playerCompare', state.modules.playerCompare !== false);
    setCheckbox('mod-history', state.modules.statHistory !== false || state.modules.rankingHistory !== false);
    setCheckbox('mod-easterEggs', state.modules.easterEggs !== false);

    // Title progression options
    setCheckbox('opt-titleProgression-showProgression', state.moduleOptions.titleProgression?.showProgression !== false);
    setCheckbox('opt-titleProgression-showHistory', state.moduleOptions.titleProgression?.showHistory !== false);

    // Score cards options
    setCheckbox('opt-scoreCards-cardBackgrounds', state.moduleOptions.scoreCards.cardBackgrounds !== false);
    const labelsOnly = state.moduleOptions.scoreCards.showModIcons === false && state.moduleOptions.scoreCards.showModText !== false;
    setPillGroup('opt-scoreCards-modDisplay', labelsOnly ? 'labels' : 'icons');
    const currentLayout = state.moduleOptions.scoreCards.cardLayout;
    const normLayout = (currentLayout === 'variant_b' || currentLayout === 'eclipse') ? 'variant_b'
      : ((currentLayout === 'variant_c' || currentLayout === 'ribbon') ? 'variant_c' : 'variant_a');
    setPillGroup('opt-scoreCards-cardLayout', normLayout);
    setPillGroup('opt-scoreCards-playerView', state.moduleOptions.scoreCards.playerView || 'list');

    // Date format (Appearance & ScoreCards fallback)
    let currentDateFormat = state.moduleOptions.appearance?.dateFormat || state.moduleOptions.scoreCards?.dateFormat || 'yyyy-mm-dd';
    if (currentDateFormat === 'relative') currentDateFormat = 'yyyy-mm-dd';
    if (currentDateFormat === 'mm/dd/yyyy') currentDateFormat = 'mm-dd-yyyy';
    if (currentDateFormat === 'dd/mm/yyyy') currentDateFormat = 'dd-mm-yyyy';
    if (currentDateFormat === 'yyyy/mm/dd') currentDateFormat = 'yyyy-mm-dd';
    const dateSelect = document.getElementById('opt-appearance-dateFormat') || document.getElementById('opt-scoreCards-dateFormat');
    if (dateSelect) {
      if (dateSelect.tagName === 'SELECT') {
        dateSelect.value = currentDateFormat;
      } else {
        setPillGroup(dateSelect.id, currentDateFormat);
      }
    }

    // Advanced stats & Playstyle options
    setCheckbox('opt-advancedStats-playstyleTab', state.moduleOptions.advancedStats.playstyleTab !== false);
    setCheckbox('opt-advancedStats-scoutingSummary', state.moduleOptions.advancedStats.scoutingSummary !== false);
    setCheckbox('opt-advancedStats-performanceBreakdown', state.moduleOptions.advancedStats.performanceBreakdown !== false);
    setCheckbox('opt-advancedStats-bestMaps', state.moduleOptions.advancedStats.bestMaps !== false);

    // History options
    setPillGroup('opt-history-inlineRanking', state.dataSettings.inlineRankingReference || 'previousDayClose');

    // Easter eggs options
    setCheckbox('opt-easterEggs-visuals', state.moduleOptions.easterEggs?.visuals !== false);
    setCheckbox('opt-easterEggs-numbers', state.moduleOptions.easterEggs?.numbers !== false);

    // Sync mode & Telemetry
    const pendingConsent = !hasCommunityConsent();
    const syncMode = pendingConsent ? 'local-only' : state.dataSettings.syncMode || 'hybrid';
    setPillGroup('syncModePillGroup', syncMode);
    updateSyncModeDesc(syncMode);
    setCheckbox('telemetryToggle', !pendingConsent && state.dataSettings.telemetryEnabled === true);
  }

  const SYNC_MODE_DESCRIPTIONS = {
    'cloud-only': 'Cloud Only: Use shared public history without saving new local profile records. Existing records remain until cleared.',
    'hybrid': 'Cloud + Local: Combine shared public history with records saved on this device.',
    'local-only': 'Local Only: Keep records on this device without community connections.',
  };

  function updateSyncModeDesc(mode) {
    const descEl = document.getElementById('syncModeDesc');
    if (descEl) descEl.textContent = SYNC_MODE_DESCRIPTIONS[mode] || SYNC_MODE_DESCRIPTIONS['local-only'];
  }

  function setCheckbox(id, val) {
    const el = document.getElementById(id);
    if (el) el.checked = Boolean(val);
  }

  function setPillGroup(containerId, activeVal) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.val === activeVal);
    });
  }

  // ─── 3. Navigation & Tab Switching ───
  document.querySelectorAll('.popup-nav .nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;
      document.querySelectorAll('.popup-nav .nav-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      document.querySelectorAll('.tab-view').forEach(view => {
        const isActive = view.id === `view-${targetTab}`;
        view.style.display = isActive ? 'flex' : 'none';
        view.classList.toggle('active', isActive);
      });

      if (targetTab === 'data') loadStorageStats();
    });
  });

  // ─── 4. Theme & Size Pickers ───
  document.querySelectorAll('#themePillGroup .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.dataset.theme;
      state.theme = theme;
      root.className = `theme-${state.theme} size-${state.size}`;
      document.querySelectorAll('#themePillGroup .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chrome.storage.local.set({ rhythiaxTheme: theme });
      notifyActiveTabs({ type: 'rhythiax-theme', theme });
      notifyActiveTabs({ type: 'rhythiax-theme-changed', theme });
    });
  });

  document.querySelectorAll('#sizePillGroup .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const size = btn.dataset.size;
      state.size = size;
      root.className = `theme-${state.theme} size-${state.size}`;
      document.querySelectorAll('#sizePillGroup .pill-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      chrome.storage.local.set({ rhythiaxPopupSize: size });
    });
  });

  // ─── 6. Module Switches & Options Binding ───
  function bindModuleToggle(id, moduleKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      state.modules[moduleKey] = el.checked;
      chrome.storage.local.set({ rhythiaxModules: state.modules });
      notifyActiveTabs({ type: 'rhythiax-module-settings', settings: state.modules });
    });
  }

  bindModuleToggle('mod-scoreCards', 'scoreCards');
  bindModuleToggle('mod-titleProgression', 'titleProgression');
  bindModuleToggle('mod-advancedStats', 'advancedStats');
  bindModuleToggle('mod-playerCompare', 'playerCompare');
  bindModuleToggle('mod-easterEggs', 'easterEggs');

  bindOptionSwitch('opt-titleProgression-showProgression', 'titleProgression', 'showProgression');
  bindOptionSwitch('opt-titleProgression-showHistory', 'titleProgression', 'showHistory');

  const historyToggle = document.getElementById('mod-history');
  if (historyToggle) {
    historyToggle.addEventListener('change', () => {
      state.modules.statHistory = historyToggle.checked;
      state.modules.rankingHistory = historyToggle.checked;
      chrome.storage.local.set({ rhythiaxModules: state.modules });
      notifyActiveTabs({ type: 'rhythiax-module-settings', settings: state.modules });
    });
  }

  function bindOptionSwitch(id, moduleName, optionKey) {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('change', () => {
      state.moduleOptions[moduleName][optionKey] = el.checked;
      persistSetting(() => {
        chrome.storage.local.set({ rhythiaxModuleOptions: state.moduleOptions });
        notifyActiveTabs({ type: 'rhythiax-module-options', options: state.moduleOptions });
      });
    });
  }

  bindOptionSwitch('opt-scoreCards-cardBackgrounds', 'scoreCards', 'cardBackgrounds');
  document.querySelectorAll('#opt-scoreCards-modDisplay .pill-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const icons = btn.dataset.val === 'icons';
      state.moduleOptions.scoreCards.showModIcons = icons;
      state.moduleOptions.scoreCards.showModText = !icons;
      setPillGroup('opt-scoreCards-modDisplay', icons ? 'icons' : 'labels');
      persistSetting(() => {
        chrome.storage.local.set({ rhythiaxModuleOptions: state.moduleOptions });
        notifyActiveTabs({ type: 'rhythiax-module-options', options: state.moduleOptions });
      });
    });
  });
  bindOptionSwitch('opt-advancedStats-playstyleTab', 'advancedStats', 'playstyleTab');
  bindOptionSwitch('opt-advancedStats-scoutingSummary', 'advancedStats', 'scoutingSummary');
  bindOptionSwitch('opt-advancedStats-performanceBreakdown', 'advancedStats', 'performanceBreakdown');
  bindOptionSwitch('opt-advancedStats-bestMaps', 'advancedStats', 'bestMaps');
  bindOptionSwitch('opt-easterEggs-visuals', 'easterEggs', 'visuals');
  bindOptionSwitch('opt-easterEggs-numbers', 'easterEggs', 'numbers');

  // Sync mode pill group
  const syncGroup = document.getElementById('syncModePillGroup');
  if (syncGroup) {
    syncGroup.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', event => {
        const val = btn.dataset.val;
        if (!hasCommunityConsent()) {
          chooseCommunity(event, val);
          return;
        }
        syncGroup.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.dataSettings.syncMode = val;
        updateSyncModeDesc(val);
        saveDataChoice({ syncMode: val });
      });
    });
  }

  function updateDateFormatPreview(fmt) {
    const el = document.getElementById('dateFormatPreview');
    if (!el) return;
    const now = new Date();
    const pad = v => String(v).padStart(2, '0');
    const y = now.getFullYear();
    const m = pad(now.getMonth() + 1);
    const d = pad(now.getDate());
    let sample = `e.g. ${y}-${m}-${d}`;
    switch (String(fmt || '').toLowerCase()) {
      case 'mm-dd-yyyy':
      case 'mm/dd/yyyy':
        sample = `e.g. ${m}-${d}-${y}`;
        break;
      case 'dd-mm-yyyy':
      case 'dd/mm/yyyy':
        sample = `e.g. ${d}-${m}-${y}`;
        break;
      case 'yyyy-mm-dd':
      case 'yyyy/mm/dd':
      default:
        sample = `e.g. ${y}-${m}-${d}`;
        break;
    }
    el.textContent = sample;
  }

  function bindPillOption(containerId, moduleName, optionKey, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        container.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.moduleOptions[moduleName][optionKey] = val;
        if (typeof onChange === 'function') {
          onChange(val);
        }
        persistSetting(() => {
          chrome.storage.local.set({ rhythiaxModuleOptions: state.moduleOptions });
          notifyActiveTabs({ type: 'rhythiax-module-options', options: state.moduleOptions });
        });
      });
    });
  }

  bindPillOption('opt-scoreCards-cardLayout', 'scoreCards', 'cardLayout');
  bindPillOption('opt-scoreCards-playerView', 'scoreCards', 'playerView');
  
  const dateFormatEl = document.getElementById('opt-appearance-dateFormat') || document.getElementById('opt-scoreCards-dateFormat');
  if (dateFormatEl) {
    if (dateFormatEl.tagName === 'SELECT') {
      dateFormatEl.addEventListener('change', () => {
        const val = dateFormatEl.value;
        if (!state.moduleOptions.appearance) state.moduleOptions.appearance = {};
        state.moduleOptions.appearance.dateFormat = val;
        if (!state.moduleOptions.scoreCards) state.moduleOptions.scoreCards = {};
        state.moduleOptions.scoreCards.dateFormat = val;
        updateDateFormatPreview(val);
        // Instant save and live tab notification
        chrome.storage.local.set({ rhythiaxModuleOptions: state.moduleOptions });
        notifyActiveTabs({ type: 'rhythiax-module-options', options: state.moduleOptions });
        notifyActiveTabs({ type: 'rhythiax-date-format', dateFormat: val });
      });
    } else {
      bindPillOption(dateFormatEl.id, 'appearance', 'dateFormat', (val) => {
        if (!state.moduleOptions.scoreCards) state.moduleOptions.scoreCards = {};
        state.moduleOptions.scoreCards.dateFormat = val;
        updateDateFormatPreview(val);
        chrome.storage.local.set({ rhythiaxModuleOptions: state.moduleOptions });
        notifyActiveTabs({ type: 'rhythiax-module-options', options: state.moduleOptions });
        notifyActiveTabs({ type: 'rhythiax-date-format', dateFormat: val });
      });
    }
  }

  function bindDataSettingPill(containerId, settingKey) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.val;
        container.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.dataSettings[settingKey] = val;
        saveDataChoice({ [settingKey]: val });
      });
    });
  }

  bindDataSettingPill('opt-history-inlineRanking', 'inlineRankingReference');

  // ─── 7. Cloud & Diagnostics ───
  const telemetryToggle = document.getElementById('telemetryToggle');
  if (telemetryToggle) {
    telemetryToggle.addEventListener('change', () => {
      if (!hasCommunityConsent() && telemetryToggle.checked) {
        telemetryToggle.checked = false;
        openCommunityChoices();
        return;
      }
      state.dataSettings.telemetryEnabled = telemetryToggle.checked;
      saveDataChoice({ telemetryEnabled: telemetryToggle.checked });
    });
  }

  function renderConnectionLogs(logs) {
    const tbody = document.getElementById('diagTableBody');
    if (!tbody) return;
    if (!Array.isArray(logs) || logs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-dim); padding: 12px;">No visits recorded yet. Browse profiles on rhythia.com to see live latency.</td></tr>';
      return;
    }

    const latest = logs[logs.length - 1];
    if (latest?.timestamp) {
      const minsAgo = Math.max(0, Math.round((Date.now() - latest.timestamp) / 60000));
      const badge = document.getElementById('cloudLastSyncBadge');
      if (badge) badge.textContent = minsAgo === 0 ? 'Last synced just now' : `Last synced ${minsAgo}m ago`;
    }

    const rows = logs.slice(-6).map(entry => {
      let time = '—';
      if (entry.timestamp) {
        time = new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } else if (entry.date) {
        time = entry.date.split(',')[1]?.trim() || entry.date;
      }

      // Extract player ID & username from entry or legacy visited string
      let playerId = entry.playerId;
      let username = entry.username;
      if (!playerId && typeof entry.visited === 'string') {
        const idMatch = entry.visited.match(/#(\d+)/);
        if (idMatch) playerId = idMatch[1];
        if (!entry.visited.startsWith('#')) {
          username = entry.visited.replace(/\s*\(#\d+\)/, '').trim();
        }
      }

      const player = username 
        ? `<strong style="color: var(--text-main);">${escapeHtml(username)}</strong> (#${escapeHtml(playerId || '?')})` 
        : `Player #${escapeHtml(playerId || '?')}`;

      // Extract latency
      let latNum = Number(entry.latencyMs);
      if (isNaN(latNum) && typeof entry.timeToReach === 'string') {
        const secMatch = entry.timeToReach.match(/([\d.]+)s/);
        if (secMatch) latNum = parseFloat(secMatch[1]) * 1000;
      }

      let pillClass = 'latency-fast';
      let latText = Number.isFinite(latNum) ? `${(latNum / 1000).toFixed(2)}s` : 'Failed';
      const statusText = entry.statusText || entry.status || '200 OK';

      if (!Number.isFinite(latNum) || entry.status === 'error' || statusText.includes('Offline') || statusText.includes('Timeout') || statusText.includes('Failed')) {
        pillClass = 'latency-bad';
        latText = 'Failed';
      } else if (statusText.includes('Not in DB') || entry.status === 'warning') {
        pillClass = 'latency-med';
      } else if (latNum > 600) {
        pillClass = 'latency-med';
      }

      return `<tr><td>Today ${escapeHtml(time)}</td><td>${player}</td><td><span class="latency-pill ${pillClass}">${latText}</span></td><td>${escapeHtml(statusText)}</td></tr>`;
    });

    tbody.innerHTML = rows.join('');
  }

  // ─── 8. Data & Cache ───
  async function loadStorageStats() {
    try {
      const all = await chrome.storage.local.get(null);
      const prefix = 'rhythiaxData:entry:';
      const entries = Object.entries(all).filter(([k]) => k.startsWith(prefix));
      const profileCount = entries.length;
      let totalBytes = 0;
      entries.forEach(([_, val]) => {
        totalBytes += new TextEncoder().encode(JSON.stringify(val)).length;
      });

      const maxMb = 25;
      const maxBytes = maxMb * 1024 * 1024;
      const percent = Math.min(100, Math.max(1, Math.round((totalBytes / maxBytes) * 100)));

      const labelCount = document.getElementById('storageProfiles');
      const labelSize = document.getElementById('storageSize');
      const bar = document.getElementById('storageBar');

      if (labelCount) labelCount.innerHTML = `Tracked profiles: <strong>${profileCount}</strong>`;
      if (labelSize) {
        const sizeFormatted = totalBytes < 1024 * 1024
          ? `${Math.round(totalBytes / 1024)} KB`
          : `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`;
        labelSize.innerHTML = `<strong>${sizeFormatted}</strong> / ${maxMb} MB`;
      }
      if (bar) bar.style.width = `${percent}%`;
    } catch (err) {
      console.warn('RhythiaX: Failed to calculate storage stats:', err);
    }
  }

  // Clear Visitor Cache
  const btnClearCache = document.getElementById('btnClearCache');
  if (btnClearCache) {
    btnClearCache.addEventListener('click', async () => {
      const confirmed = confirm('Are you sure? This cannot be undone.\n\nThis removes:\n- Local history of ALL profiles\n- Cached community profile history\n\nExtension settings, visit-report cooldowns, official game scores and history on the community server are kept. Cached data may be downloaded again.');
      if (!confirmed) return;

      try {
        const all = await chrome.storage.local.get(null);
        const prefix = 'rhythiaxData:entry:';
        const keysToRemove = [];

        for (const [k, v] of Object.entries(all)) {
          if (k.startsWith(prefix) || k.startsWith('rhythiaxVpsHistoryCache:')) keysToRemove.push(k);
        }

        if (keysToRemove.length > 0) {
          await chrome.storage.local.remove(keysToRemove);
        }
        await loadStorageStats();
        alert(`Cache cleared! Removed ${keysToRemove.length} local history/cache entries.`);
      } catch (err) {
        alert('Failed to clear cache: ' + err.message);
      }
    });
  }

  // Reset to Defaults
  const btnResetDefaults = document.getElementById('btnResetDefaults');
  if (btnResetDefaults) {
    btnResetDefaults.addEventListener('click', async () => {
      const confirmed = confirm('Reset appearance, features settings?\n\nYour community connection choice, profile visit reporting choice are kept. No history is deleted now, but the restored 90-day retention and 25 MB limit may remove older history during later maintenance.');
      if (!confirmed) return;

      state.modules = { ...DEFAULT_MODULES };
      state.moduleOptions = JSON.parse(JSON.stringify(DEFAULT_MODULE_OPTIONS));
      state.theme = 'reimagined';
      state.size = 'default';
      const privacyChoice = {
        syncMode: state.dataSettings.syncMode,
        telemetryEnabled: state.dataSettings.telemetryEnabled,
        communityConsentVersion: state.dataSettings.communityConsentVersion,
      };
      state.dataSettings = { ...DEFAULT_DATA_SETTINGS, ...privacyChoice };

      const { syncMode, telemetryEnabled, communityConsentVersion, ...resetDataSettings } = DEFAULT_DATA_SETTINGS;
      try {
        await persistDataPatch(resetDataSettings);
      } catch (_) {
        alert('Settings could not be reset. Reopen the popup to retry.');
        await loadState();
        return;
      }
      await chrome.storage.local.set({
        rhythiaxModules: state.modules,
        rhythiaxModuleOptions: state.moduleOptions,
        rhythiaxTheme: state.theme,
        rhythiaxPopupSize: state.size,
      });

      applyStateToUI();
      notifyActiveTabs({ type: 'rhythiax-module-settings', settings: state.modules });
      notifyActiveTabs({ type: 'rhythiax-theme-changed', theme: state.theme });
      alert('Settings reset. Your community choices were kept.');
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str ?? '');
    return div.innerHTML;
  }

  // Initial Boot
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadState);
  } else {
    loadState();
  }
}());
