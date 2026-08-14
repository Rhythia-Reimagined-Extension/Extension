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
};

RhythiaX.MODULE_SETTING_DEFAULTS = {
  advancedStats: { ratingProfile: true, tempoProfile: true, profileStyle: 'soft-blocks' },
  scoreCards: { customCards: true, playerView: 'list', scoresView: 'grid', userScoresWeight: false, spinScores: false, watchReplay: true },
  titleProgression: { crownMode: '3d' },
  playerCompare: {},
};

RhythiaX.moduleSettings = { ...RhythiaX.MODULE_DEFAULTS };
RhythiaX.moduleOptionSettings = JSON.parse(JSON.stringify(RhythiaX.MODULE_SETTING_DEFAULTS));

RhythiaX.applyModuleOptionSettings = function (settings) {
  RhythiaX.moduleOptionSettings = Object.keys(RhythiaX.MODULE_SETTING_DEFAULTS).reduce((all, name) => {
    const stored = { ...(settings?.[name] || {}) };
    if (name === 'scoreCards') delete stored.downloadReplay;
    return {
      ...all,
      [name]: {
      ...RhythiaX.MODULE_SETTING_DEFAULTS[name],
      ...(name === 'advancedStats' && stored.ratingProfile === undefined && stored.gradeBreakdown !== undefined
        ? { ratingProfile: stored.gradeBreakdown }
        : {}),
      ...stored,
    },
    };
  }, {});
};

RhythiaX.isModuleEnabled = function (name) {
  return RhythiaX.moduleSettings[name] !== false;
};

RhythiaX.isModuleOptionEnabled = function (moduleName, optionName) {
  return RhythiaX.moduleOptionSettings[moduleName]?.[optionName] !== false;
};

RhythiaX.getProfileStyle = function () {
  const style = RhythiaX.moduleOptionSettings.advancedStats?.profileStyle;
  return ['soft-blocks', 'profile-surface', 'pill-rows'].includes(style) ? style : 'soft-blocks';
};

RhythiaX.getTitleProgressionCrownMode = function () {
  const mode = RhythiaX.moduleOptionSettings.titleProgression?.crownMode;
  return mode === '2d' ? '2d' : '3d';
};

RhythiaX.applyModuleSettings = function (settings) {
  RhythiaX.moduleSettings = { ...RhythiaX.MODULE_DEFAULTS, ...(settings || {}) };
  document.documentElement.dataset.rhythiaxModulesReady = 'true';
};

function loadModuleStorage(key, defaults, apply) {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.get({ [key]: defaults }, result => {
        const error = chrome.runtime?.lastError;
        if (error) reject(new Error(error.message));
        else {
          apply(result?.[key] || defaults);
          resolve();
        }
      });
    } catch (error) {
      reject(error);
    }
  });
}

Promise.resolve(RhythiaX.dataRepositoryReady).then(() => Promise.all([
  loadModuleStorage('rhythiaxModules', RhythiaX.MODULE_DEFAULTS, RhythiaX.applyModuleSettings),
  loadModuleStorage('rhythiaxModuleOptions', RhythiaX.MODULE_SETTING_DEFAULTS, RhythiaX.applyModuleOptionSettings),
])).catch(error => {
  RhythiaX.applyModuleSettings(RhythiaX.MODULE_DEFAULTS);
  RhythiaX.applyModuleOptionSettings(RhythiaX.MODULE_SETTING_DEFAULTS);
  RhythiaX.captureError?.(error, 'Module storage initialization failed; using defaults');
}).then(() => {
  document.documentElement.dataset.rhythiaxSettingsReady = 'true';
});

chrome.runtime.onMessage.addListener(message => {
  if (message?.type === 'rhythiax-module-options') {
    RhythiaX.applyModuleOptionSettings(message.options);
    RhythiaX.applyConfiguredScoreView?.();
    window.setTimeout(() => window.location.reload(), 30);
    return;
  }
  if (message?.type !== 'rhythiax-module-settings') return;
  RhythiaX.applyModuleSettings(message.settings);
  window.setTimeout(() => window.location.reload(), 30);
});
