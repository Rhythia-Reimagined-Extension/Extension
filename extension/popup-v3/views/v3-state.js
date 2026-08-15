
const screen = document.querySelector('#v3-screen');
const nav = document.querySelector('#v3-nav');
if (!screen || !nav) throw new Error('Popup V3 surface is missing.');

const MODULES = {
  advancedStats: { label: 'Advanced Stats', description: 'Rating, tempo and score statistics', category: 'profile', icon: 'stats' },
  playerCompare: { label: 'Player Compare', description: 'Compare maps and Rhythm Points side by side', category: 'profile', icon: 'compare' },
  titleProgression: { label: 'Title Progression', description: 'Animated RP and rank progress', category: 'profile', icon: 'progress' },
  scoreCards: { label: 'Score Display', description: 'Score Cards on profiles and /scores', category: 'scores', icon: 'scores' },
  statHistory: { label: 'Stat History', description: 'Daily stat history on profile stats', category: 'history', icon: 'history' },
  rankingHistory: { label: 'Ranking History', description: 'Global, country and RP history', category: 'history', icon: 'rank' },
};
const CATEGORIES = {
  profile: { label: 'Profile', description: 'Profile stats, comparisons and progression.' },
  scores: { label: 'Scores', description: 'Score presentation and replay controls.' },
  history: { label: 'History', description: 'Daily records, ranking history and their display.' },
};
const DEFAULT_MODULES = {
  advancedStats: true, scoreCards: true, titleProgression: true,
  statHistory: true, rankingHistory: true, playerCompare: true,
};
const state = {
  route: 'overview', dataView: 'overview', theme: 'reimagined', size: 'default',
   modules: { ...DEFAULT_MODULES }, moduleOptions: null, debugLogs: false, dataSettings: null, summary: null, profiles: [], backup: null, storageHealth: null,
      profileId: '', profileView: 'overview', profileMetric: 'weightedRp', profileQuery: '', exportScope: 'all', exportProfileId: '', exportIncludeOpenDay: false, exportIncludeTitleState: false, exportIncludeSettings: false, exportIncludeDiagnostics: false, dataImport: null, dataImportSelectionGeneration: 0, status: '', backupIntervalMode: '', backupIncludeOpenDay: false, backupIncludeAppSettings: false, backupRestorePreview: null, backupRestoreRaw: '', backupRestoreSource: '', backupRestoreMode: 'merge', backupRestoreProfiles: [], backupRestoreIncludeHistory: true, backupRestoreIncludeTitle: true, backupRestoreIncludeAppSettings: false, backupRestoreDatePreset: 'all', backupRestoreDateFrom: '', backupRestoreDateTo: '', archive: null, pendingAction: null, modalReturnFocus: null, profileImport: null, profileImportSelectionGeneration: 0,
  deleteWholeProfiles: false,
  deleteChoices: { statHistory: true, rankingHistory: true, openDay: false, titleProgression: false },
};

const DELETE_CATEGORIES = [
  ['statHistory', 'Stat history', 'Closed daily stat records'],
  ['rankingHistory', 'Ranking history', 'Global, country and RP records'],
  ['openDay', 'Open-day captures', 'Snapshots from the current day'],
  ['titleProgression', 'Title Progression data', 'Latest RP and rank progression state'],
];
const HISTORY_METRICS = [
  ['weightedRp', 'Weighted RP'], ['rawRp', 'Raw RP'],
  ['avgAccuracy', 'AVG Accuracy'], ['fcCount', 'FC Count'], ['playCount', 'Play Count'],
  ['squaresHit', 'Squares Hit'], ['mapsPerWeek', 'Maps / Week'],
  ['globalRank', 'Global Rank'], ['countryRank', 'Country Rank'], ['rhythmPoints', 'Rhythm Points'],
];

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const isEnabled = key => state.modules[key] !== false;
