// =============================================
// Rhythia Reimagined - Feature modules
// =============================================

var RhythiaX = RhythiaX || {};

RhythiaX.MODULE_DEFAULTS = {
  advancedStats: true,
  scoreCards: true,
  titleProgression: true,
  statHistory: true,
  rankingHistory: true,
  playerCompare: true,
  easterEggs: true,
};

RhythiaX.MODULE_SETTING_DEFAULTS = {
  appearance: { theme: 'reimagined', size: 'default', dateFormat: 'yyyy-mm-dd' },
  scoreCards: { customCards: true, cardLayout: 'variant_a', playerView: 'list', cardBackgrounds: true, dateFormat: 'yyyy-mm-dd', showModIcons: true, showModText: false },
  advancedStats: { playstyleTab: true, scoutingSummary: true, performanceBreakdown: true, bestMaps: true },
  titleProgression: { showProgression: true, showHistory: true, crownMode: '3d' },
  playerCompare: {},
};

RhythiaX.moduleSettings = { ...RhythiaX.MODULE_DEFAULTS };
RhythiaX.moduleOptionSettings = JSON.parse(JSON.stringify(RhythiaX.MODULE_SETTING_DEFAULTS));

RhythiaX.applyModuleOptionSettings = function (settings) {
  RhythiaX.moduleOptionSettings = Object.keys(RhythiaX.MODULE_SETTING_DEFAULTS).reduce((all, name) => {
    const stored = { ...(settings?.[name] || {}) };
    if (name === 'scoreCards') {
      const labelsOnly = stored.showModIcons === false && stored.showModText !== false;
      stored.showModIcons = !labelsOnly;
      stored.showModText = labelsOnly;
    }
    if (name === 'advancedStats') {
      if (stored.performanceBreakdown === undefined && stored.performanceFilters !== undefined) {
        stored.performanceBreakdown = stored.performanceFilters;
      }
      delete stored.performanceFilters;
    }
    if (name === 'advancedStats' && stored.playstyleTab === undefined && stored.playstyleDeck !== undefined) {
      stored.playstyleTab = stored.playstyleDeck;
    }
    return {
      ...all,
      [name]: {
        ...RhythiaX.MODULE_SETTING_DEFAULTS[name],
        ...stored,
      },
    };
  }, {});

  if (!RhythiaX.isModuleOptionEnabled('scoreCards', 'customCards')) {
    RhythiaX.ScoreCardView?.unenhance?.();
  } else if (!RhythiaX.isCardBackgroundsEnabled?.()) {
    document.querySelectorAll('.rhythiax-card-bg').forEach(bg => bg.remove());
  }

  const showProgression = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showProgression') : true;
  const showHistory = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showHistory') : true;
  if (RhythiaX.isModuleEnabled?.('titleProgression') && (showProgression || showHistory)) {
    const card = RhythiaX.ProfilePageAdapter?.titleProgressionCard?.() || RhythiaX.TitleProgression?.Service?.findNativeTitleCard?.(document);
    if (card) {
      const player = RhythiaX.profileHistoryContext?.player || RhythiaX.extractPlayerData?.();
      RhythiaX.TitleProgression?.Service?.mount?.(card, player, RhythiaX.profileHistoryContext?.scoreSets);
    }
  } else {
    const card = RhythiaX.ProfilePageAdapter?.titleProgressionCard?.() || RhythiaX.TitleProgression?.Service?.findNativeTitleCard?.(document);
    if (card) RhythiaX.TitleProgression?.Service?.unmount?.(card);
    RhythiaX.TitleProgression?.Service?.cleanup?.();
  }
};

RhythiaX.isModuleEnabled = function (name) {
  return RhythiaX.moduleSettings[name] !== false;
};

RhythiaX.isModuleOptionEnabled = function (moduleName, optionName) {
  return RhythiaX.moduleOptionSettings[moduleName]?.[optionName] !== false;
};

RhythiaX.getProfileStyle = function () {
  const style = RhythiaX.moduleOptionSettings.advancedStats?.profileStyle;
  return ['soft-blocks', 'profile-surface', 'pill-rows'].includes(style) ? style : 'profile-surface';
};

RhythiaX.getProfileMetric = function () {
  const metric = RhythiaX.moduleOptionSettings.advancedStats?.profileMetric;
  return ['percentage', 'count', 'both'].includes(metric) ? metric : 'percentage';
};

RhythiaX.getTitleProgressionCrownMode = function () {
  const mode = RhythiaX.moduleOptionSettings.titleProgression?.crownMode;
  return mode === '2d' ? '2d' : '3d';
};

RhythiaX.getScoreCardLayout = function () {
  const layout = RhythiaX.moduleOptionSettings.scoreCards?.cardLayout;
  if (layout === 'variant_b' || layout === 'eclipse') return 'variant_b';
  if (layout === 'variant_c' || layout === 'ribbon') return 'variant_c';
  return 'variant_a';
};

RhythiaX.isCardBackgroundsEnabled = function () {
  return RhythiaX.isModuleOptionEnabled('scoreCards', 'cardBackgrounds');
};

RhythiaX.getDateFormat = function () {
  const appFmt = RhythiaX.moduleOptionSettings.appearance?.dateFormat;
  const scFmt = RhythiaX.moduleOptionSettings.scoreCards?.dateFormat;
  let format = 'yyyy-mm-dd';
  if (appFmt && appFmt !== 'yyyy-mm-dd' && appFmt !== 'relative') {
    format = appFmt;
  } else if (scFmt && scFmt !== 'yyyy-mm-dd' && scFmt !== 'relative') {
    format = scFmt;
  } else if (appFmt && appFmt !== 'relative') {
    format = appFmt;
  } else if (scFmt && scFmt !== 'relative') {
    format = scFmt;
  }
  const clean = String(format).toLowerCase().trim();
  const valid = ['yyyy-mm-dd', 'mm-dd-yyyy', 'dd-mm-yyyy', 'mm/dd/yyyy', 'dd/mm/yyyy', 'yyyy/mm/dd'];
  return valid.includes(clean) ? clean : 'yyyy-mm-dd';
};

RhythiaX.isScoreCardModIconsEnabled = function () {
  const options = RhythiaX.moduleOptionSettings.scoreCards || {};
  return !(options.showModIcons === false && options.showModText !== false);
};

RhythiaX.isScoreCardModTextEnabled = function () {
  return !RhythiaX.isScoreCardModIconsEnabled();
};

RhythiaX.applyModuleSettings = function (settings) {
  RhythiaX.moduleSettings = { ...RhythiaX.MODULE_DEFAULTS, ...(settings || {}) };
  document.documentElement.dataset.rhythiaxModulesReady = 'true';
  if (!RhythiaX.isModuleEnabled('scoreCards')) {
    RhythiaX.ScoreCardView?.unenhance?.();
  }
  if (!RhythiaX.isModuleEnabled('playerCompare') || (RhythiaX.isMasterActive && !RhythiaX.isMasterActive())) {
    RhythiaX.CompareView?.cleanup?.();
    document.querySelectorAll('.rhythiax-compare-profile-button, .rhythiax-compare-tray, .rhythiax-compare-modal').forEach(el => el.remove());
  } else {
    if (RhythiaX.PageRouteContext?.type() === 'profile') {
      const player = RhythiaX.profileHistoryContext?.player || RhythiaX.extractPlayerData?.();
      RhythiaX.injectPlayerCompare?.(player);
    } else {
      RhythiaX.CompareView?.renderTray?.();
    }
  }
  const showProgression = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showProgression') : true;
  const showHistory = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showHistory') : true;
  if (!RhythiaX.isModuleEnabled('titleProgression') || (!showProgression && !showHistory)) {
    const card = RhythiaX.ProfilePageAdapter?.titleProgressionCard?.() || RhythiaX.TitleProgression?.Service?.findNativeTitleCard?.(document);
    if (card) RhythiaX.TitleProgression?.Service?.unmount?.(card);
    RhythiaX.TitleProgression?.Service?.cleanup?.();
  } else {
    if (RhythiaX.PageRouteContext?.type() === 'profile') {
      const player = RhythiaX.profileHistoryContext?.player || RhythiaX.extractPlayerData?.();
      RhythiaX.enhanceTitleProgression?.(player);
    }
  }
  if (RhythiaX.EasterEggs) {
    if (RhythiaX.isModuleEnabled('easterEggs')) {
      RhythiaX.EasterEggs.start?.();
    } else {
      RhythiaX.EasterEggs.stop?.();
    }
  }
};

RhythiaX.applyLiveUpdates = function () {
  // 1. Update score cards & layout
  try {
    if (RhythiaX.isModuleEnabled('scoreCards')) {
      RhythiaX.ScoreCardService?.updateScoresHubVisibility?.();
      RhythiaX.enhanceScoreCards?.();
      RhythiaX.ScoreCardView?.reRenderAllCards?.();
    } else {
      RhythiaX.ScoreCardView?.unenhance?.();
      const hub = document.querySelector('.rhythiax-scores-hub');
      if (hub) hub.style.display = 'none';
    }
  } catch (err) {
    RhythiaX.captureError?.(err, 'Live update scoreCards failed');
  }

  // 2. Update stats and playstyle
  try {
    const statsContainer = RhythiaX.findOfficialStatsContainer?.();
    if (statsContainer) {
      const isAdvEnabled = RhythiaX.isModuleEnabled('advancedStats');
      const reimaginedBody = statsContainer.querySelector('.rhythiax-reimagined-stats-body');
      const nativeBody = statsContainer.querySelector('.rhythiax-native-stats-body');
      const tabs = statsContainer.querySelector('.rhythiax-stats-tabs');
      if (tabs) tabs.style.display = isAdvEnabled ? '' : 'none';
      if (!isAdvEnabled) {
        if (reimaginedBody) reimaginedBody.style.display = 'none';
        if (nativeBody) nativeBody.style.display = '';
      }
    }
    RhythiaX.StatisticsView?.updateSubtabVisibility?.();
    RhythiaX.PlaystyleView?.reRender?.();
  } catch (err) {
    RhythiaX.captureError?.(err, 'Live update stats failed');
  }

  // 3. Easter eggs
  try {
    if (RhythiaX.EasterEggs) {
      if (RhythiaX.isModuleEnabled('easterEggs')) {
        RhythiaX.EasterEggs.start?.();
      } else {
        RhythiaX.EasterEggs.stop?.();
      }
    }
  } catch (err) {
    RhythiaX.captureError?.(err, 'Live update easterEggs failed');
  }

  // 4. Update all history tables (Rank & Rating Log, Progress & Activity Log, Metric details)
  try {
    if (typeof RhythiaX.updateAllHistoryTables === 'function') {
      RhythiaX.updateAllHistoryTables();
    }
  } catch (err) {
    RhythiaX.captureError?.(err, 'Live update history tables failed');
  }

  // 5. Update player compare
  try {
    if (RhythiaX.isModuleEnabled('playerCompare') && (RhythiaX.isMasterActive ? RhythiaX.isMasterActive() : true)) {
      if (RhythiaX.PageRouteContext?.type() === 'profile') {
        const player = RhythiaX.profileHistoryContext?.player || RhythiaX.extractPlayerData?.();
        RhythiaX.injectPlayerCompare?.(player);
      } else {
        RhythiaX.CompareView?.renderTray?.();
      }
    } else {
      RhythiaX.CompareView?.cleanup?.();
      document.querySelectorAll('.rhythiax-compare-profile-button, .rhythiax-compare-tray, .rhythiax-compare-modal').forEach(btn => btn.remove());
    }
  } catch (err) {
    RhythiaX.captureError?.(err, 'Live update playerCompare failed');
  }

  // 6. Update Title Progression
  try {
    const card = RhythiaX.ProfilePageAdapter?.titleProgressionCard?.() || RhythiaX.TitleProgression?.Service?.findNativeTitleCard?.(document);
    const showProgression = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showProgression') : true;
    const showHistory = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showHistory') : true;
    if (!RhythiaX.isModuleEnabled('titleProgression') || (!showProgression && !showHistory)) {
      if (card) RhythiaX.TitleProgression?.Service?.unmount?.(card);
      RhythiaX.TitleProgression?.Service?.cleanup?.();
    } else {
      const player = RhythiaX.profileHistoryContext?.player || RhythiaX.extractPlayerData?.();
      if (card) RhythiaX.enhanceTitleProgression?.(player);
    }
  } catch (err) {
    RhythiaX.captureError?.(err, 'Live update titleProgression failed');
  }
};

function loadModuleStorage(key, defaults, apply) {
  return new Promise((resolve) => {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) {
        apply(defaults);
        return resolve();
      }
      chrome.storage.local.get({ [key]: defaults }, result => {
        const error = chrome.runtime?.lastError;
        if (error) {
          apply(defaults);
          resolve();
        } else {
          apply(result?.[key] || defaults);
          resolve();
        }
      });
    } catch (error) {
      apply(defaults);
      resolve();
    }
  });
}

Promise.all([
  loadModuleStorage('rhythiaxMasterActive', true, val => {
    RhythiaX.masterActive = val !== false;
  }),
  loadModuleStorage('rhythiaxModules', RhythiaX.MODULE_DEFAULTS, RhythiaX.applyModuleSettings),
  loadModuleStorage('rhythiaxModuleOptions', RhythiaX.MODULE_SETTING_DEFAULTS, RhythiaX.applyModuleOptionSettings),
]).catch(error => {
  RhythiaX.masterActive = true;
  RhythiaX.applyModuleSettings(RhythiaX.MODULE_DEFAULTS);
  RhythiaX.applyModuleOptionSettings(RhythiaX.MODULE_SETTING_DEFAULTS);
  RhythiaX.captureError?.(error, 'Module storage initialization failed; using defaults');
}).then(() => {
  document.documentElement.dataset.rhythiaxSettingsReady = 'true';
});

if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  chrome.runtime.onMessage.addListener(message => {
    if (message?.type === 'rhythiax-master-toggle') {
      RhythiaX.setMasterActive?.(message.active);
      return;
    }
    if (message?.type === 'rhythiax-module-options') {
      RhythiaX.applyModuleOptionSettings(message.options);
      RhythiaX.applyLiveUpdates();
      return;
    }
    if (message?.type === 'rhythiax-module-settings') {
      RhythiaX.applyModuleSettings(message.settings);
      RhythiaX.applyLiveUpdates();
      return;
    }
  });
}

try {
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        let updated = false;
        if (changes.rhythiaxMasterActive !== undefined) {
          RhythiaX.setMasterActive?.(changes.rhythiaxMasterActive.newValue !== false);
        }
        if (changes.rhythiaxModules?.newValue) {
          RhythiaX.applyModuleSettings(changes.rhythiaxModules.newValue);
          updated = true;
        }
        if (changes.rhythiaxModuleOptions?.newValue) {
          RhythiaX.applyModuleOptionSettings(changes.rhythiaxModuleOptions.newValue);
          updated = true;
        }
        if (updated) {
          RhythiaX.applyLiveUpdates();
        }
      }
    });
  }
} catch (_) {}
