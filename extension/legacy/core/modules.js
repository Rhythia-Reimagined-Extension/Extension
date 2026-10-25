// =============================================
// Reimagined for Rhythia - Feature modules
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
  scoreCards: { customCards: true, cardLayout: 'variant_e', playerView: 'list', cardBackgrounds: true, dateFormat: 'yyyy-mm-dd', showModIcons: true, showModText: false },
  advancedStats: { playstyleTab: true, scoutingSummary: true, performanceBreakdown: true, bestMaps: true },
  statHistory: { layout: 'variant_b' },
  titleProgression: { showProgression: true, showHistory: true, crownMode: '3d' },
  playerCompare: {},
};

RhythiaX.moduleSettings = { ...RhythiaX.MODULE_DEFAULTS };
RhythiaX.moduleOptionSettings = JSON.parse(JSON.stringify(RhythiaX.MODULE_SETTING_DEFAULTS));

// While Exodus shows the page (RhythiaX.ClassicIdle, core/state.js) a changed setting is kept and marked on
// <html>, but Classic's elements are left alone; they follow when the page is handed back (end of this file).
let moduleUpdatesWaiting = false;
function moduleUpdatesIdle() {
  return RhythiaX.ClassicIdle?.isSuspended?.() === true;
}

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

  // Variants D/E/F hide their map art from CSS, so the switch applies without a re-render.
  document.documentElement.dataset.rhythiaxCardArt = RhythiaX.isCardBackgroundsEnabled?.() === false ? 'off' : 'on';
  if (moduleUpdatesIdle()) {
    moduleUpdatesWaiting = true;
    return;
  }
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

// Statistics variant: A is the history tables, B is one value at a time with a chart (statistics/history-view.js).
RhythiaX.getStatsVariant = function () {
  return RhythiaX.moduleOptionSettings.statHistory?.layout === 'variant_a' ? 'variant_a' : 'variant_b';
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
  // The popup offers these three (shared/settings/schema.js); no version stored a format with slashes.
  const valid = ['yyyy-mm-dd', 'mm-dd-yyyy', 'dd-mm-yyyy'];
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
  // styles/bridge/anti-flicker.css hides Rhythia's score list and Statistics body from the first frame, for
  // Classic's own to take their place; a module that is off puts nothing there, so Rhythia's stay.
  document.documentElement.dataset.rhythiaxModuleScoreCards = String(RhythiaX.isModuleEnabled('scoreCards'));
  document.documentElement.dataset.rhythiaxModuleAdvancedStats = String(RhythiaX.isModuleEnabled('advancedStats'));
  if (moduleUpdatesIdle()) {
    moduleUpdatesWaiting = true;
    return;
  }
  if (!RhythiaX.isModuleEnabled('scoreCards')) {
    RhythiaX.ScoreCardView?.unenhance?.();
  }
  // Friends list off: Rhythia's friends counter and its link work as Rhythia made them again.
  if (!RhythiaX.isModuleEnabled('friendsList')) {
    RhythiaX.unenhanceOwnFriendsCounter?.();
  }
  if (!RhythiaX.isModuleEnabled('playerCompare')) {
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
  if (moduleUpdatesIdle()) {
    moduleUpdatesWaiting = true;
    return;
  }
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
      // The hub hid Rhythia's own score sections (score-cards/hub-native.js); they show in its place again.
      document.querySelectorAll('.rhythiax-native-score-section-hidden').forEach(section => {
        section.classList.remove('rhythiax-native-score-section-hidden');
        section.style.removeProperty('display');
      });
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
    if (RhythiaX.isModuleEnabled('playerCompare')) {
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
  loadModuleStorage('rhythiaxModules', RhythiaX.MODULE_DEFAULTS, RhythiaX.applyModuleSettings),
  loadModuleStorage('rhythiaxModuleOptions', RhythiaX.MODULE_SETTING_DEFAULTS, RhythiaX.applyModuleOptionSettings),
]).catch(error => {
  RhythiaX.applyModuleSettings(RhythiaX.MODULE_DEFAULTS);
  RhythiaX.applyModuleOptionSettings(RhythiaX.MODULE_SETTING_DEFAULTS);
  RhythiaX.captureError?.(error, 'Module storage initialization failed; using defaults');
}).then(() => {
  document.documentElement.dataset.rhythiaxSettingsReady = 'true';
  RhythiaX.ContentBootstrap?.settingsReady?.();
});

function sameSettingValue(a, b) {
  if (a === b) return true;
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object' || Array.isArray(a) !== Array.isArray(b)) return false;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!sameSettingValue(a[key], b[key])) return false;
  }
  return true;
}

// The page's own List/Grid button saves scoreCards.playerView in rhythiaxModuleOptions as well, and
// score-cards/store.js already applies that in every tab: a change of nothing else needs no live update.
// No old value means nothing was saved yet: that first save counts as a view change only when it holds
// nothing but scoreCards.playerView.
function onlyPlayerViewChanged(oldOptions, newOptions) {
  if (!newOptions) return false;
  const withoutPlayerView = options => ({ ...options, scoreCards: { ...(options.scoreCards || {}), playerView: undefined } });
  return sameSettingValue(withoutPlayerView(oldOptions || {}), withoutPlayerView(newOptions));
}

// Every change to the switches and options, from the popup or from any tab, arrives here once per tab.
// The popup has no other path into the tab: a message would run the same live update a second time.
try {
  if (typeof chrome !== 'undefined' && chrome.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName === 'local') {
        let updated = false;
        if (changes.rhythiaxModules?.newValue) {
          RhythiaX.applyModuleSettings(changes.rhythiaxModules.newValue);
          updated = true;
        }
        const options = changes.rhythiaxModuleOptions;
        if (options?.newValue) {
          RhythiaX.applyModuleOptionSettings(options.newValue);
          if (!onlyPlayerViewChanged(options.oldValue, options.newValue)) updated = true;
        }
        if (updated) {
          RhythiaX.applyLiveUpdates();
        }
      }
    });
  }
} catch (_) {}

// Classic has the page again: a change made while Exodus showed it reaches Classic's elements now, before
// route-observer.js builds the page again with the same settings.
RhythiaX.ClassicIdle?.onResume?.(() => {
  if (!moduleUpdatesWaiting) return;
  moduleUpdatesWaiting = false;
  RhythiaX.applyModuleSettings(RhythiaX.moduleSettings);
  RhythiaX.applyModuleOptionSettings(RhythiaX.moduleOptionSettings);
});
