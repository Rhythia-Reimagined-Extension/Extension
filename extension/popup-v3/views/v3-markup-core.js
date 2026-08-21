function icon(name) {
  const paths = {
    overview: '<rect x="4" y="4" width="6" height="6" rx="1"></rect><rect x="14" y="4" width="6" height="6" rx="1"></rect><rect x="4" y="14" width="6" height="6" rx="1"></rect><rect x="14" y="14" width="6" height="6" rx="1"></rect>',
    profile: '<circle cx="12" cy="8" r="3.3"></circle><path d="M5.5 20c.6-3.4 2.7-5.2 6.5-5.2s5.9 1.8 6.5 5.2"></path>',
    scores: '<path d="M5 5.5h14v13H5z"></path><path d="M8 15.5v-3M12 15.5V9M16 15.5v-5"></path>',
    history: '<path d="M5 7.5h14M5 12h14M5 16.5h9"></path><circle cx="4" cy="7.5" r=".7" fill="currentColor" stroke="none"></circle><circle cx="4" cy="12" r=".7" fill="currentColor" stroke="none"></circle><circle cx="4" cy="16.5" r=".7" fill="currentColor" stroke="none"></circle>',
    data: '<path d="M5 7.5h14v11H5z"></path><path d="M8 7.5V5h8v2M8.5 11h7M8.5 14.5h4"></path>',
    about: '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 11v5M12 8.2v.2"></path>',
    stats: '<path d="M5 19V9M12 19V5M19 19v-7"></path><path d="M4 19h16"></path>',
    compare: '<circle cx="8" cy="9" r="3"></circle><circle cx="16" cy="9" r="3"></circle><path d="M3.5 19c.5-2.6 2-4 4.5-4s4 1.4 4.5 4M11.5 19c.5-2.6 2-4 4.5-4s4 1.4 4.5 4"></path>',
    progress: '<path d="M12 3.5 14 7l4 .6-2.9 2.8.7 4-3.8-1.9-3.8 1.9.7-4L6 7.6 10 7z"></path><path d="M8 18h8M9.5 21h5"></path>',
    rank: '<path d="M5 19h14M7 19v-7h3v7M11 19V7h3v12M15 19v-4h3v4"></path>',
    stream: '<path d="M4 15c2.5 0 2.5-6 5-6s2.5 6 5 6 2.5-6 6-6"></path>',
    sparkles: '<path d="m12 3 2.5 5.5L20 11l-5.5 2.5L12 19l-2.5-5.5L4 11l5.5-2.5z"></path><path d="M19 3v4M21 5h-4M5 17v4M7 19H3"></path>',
  };
  return `<svg class="v3-icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.data}</svg>`;
}

function preset() {
  const keys = Object.keys(DEFAULT_MODULES);
  if (keys.every(isEnabled)) return 'default';
  const minimal = ['advancedStats', 'scoreCards', 'playerCompare', 'titleProgression'];
  if (minimal.every(isEnabled) && keys.filter(isEnabled).length === minimal.length) return 'minimal';
  return 'custom';
}

function heading(title, description, back = '', badge = '') {
  const backMarkup = back ? `<button class="v3-back-button" type="button" data-v3-route="${back}">Back</button>` : '';
  const badgeMarkup = badge ? `<span class="v3-build-badge">${badge}</span>` : '';
  return `<div class="v3-screen-heading"><div><h2>${title}</h2><p>${description}</p></div><div class="v3-heading-actions">${badgeMarkup}${backMarkup}</div></div>`;
}

function status() { return `<p class="v3-status" id="v3-status" role="status">${escapeHtml(state.status)}</p>`; }

function switchMarkup(key) {
  return `<label class="v3-switch"><input type="checkbox" role="switch" data-v3-module-toggle="${key}" aria-label="Enable ${escapeHtml(MODULES[key].label)}" ${isEnabled(key) ? 'checked' : ''}><i></i></label>`;
}

function moduleCard(key) {
  const item = MODULES[key];
  return `<article class="v3-module-card${isEnabled(key) ? '' : ' is-disabled'}"><span class="v3-module-icon">${icon(item.icon)}</span><div class="v3-module-copy"><strong>${item.label}</strong><span>${item.description}</span></div><div class="v3-module-actions"><button type="button" class="v3-configure-button" data-v3-configure="${key}">Configure</button>${switchMarkup(key)}</div></article>`;
}

function themeOptions() {
  return [['reimagined', 'Reimagined', 'Purple surfaces'], ['dark', 'Dark', 'Black and blue'], ['white', 'White', 'White and neutral']].map(([key, label, description]) => `<button type="button" class="v3-theme-option${state.theme === key ? ' is-selected' : ''}" data-v3-theme="${key}"><span class="v3-theme-swatch v3-theme-${key}"></span><span><strong>${label}</strong><small>${description}</small></span><em>${state.theme === key ? 'Selected' : ''}</em></button>`).join('');
}

function overview() {
  const groups = {
    profile: ['advancedStats', 'playerCompare', 'titleProgression', 'easterEggs'],
    scores: ['scoreCards'], history: ['statHistory', 'rankingHistory'],
  };
  const cards = Object.entries(groups).map(([key, keys]) => `<button type="button" class="v3-category-card" data-v3-route="${key}"><span class="v3-category-icon">${icon(key === 'profile' ? 'profile' : key === 'scores' ? 'scores' : 'history')}</span><strong>${CATEGORIES[key].label}</strong><span>${CATEGORIES[key].description}</span><em>${keys.filter(isEnabled).length} of ${keys.length} enabled</em></button>`).join('');
  return `${heading('Overview', 'Choose what Rhythia Reimagined changes on the site.', '', preset())}<div class="v3-overview-status"><span class="v3-status-dot"></span><div><strong>${Object.values(state.modules).filter(Boolean).length} modules enabled</strong><span>Settings are saved locally and can be changed at any time.</span></div></div><section class="v3-card"><div class="v3-card-title"><strong>Appearance</strong><span>Applied globally</span></div><span class="v3-label">Theme</span><div class="v3-theme-picker">${themeOptions()}</div><span class="v3-label v3-size-label">Popup size</span><div class="v3-segmented"><button type="button" class="v3-segment${state.size === 'default' ? ' is-selected' : ''}" data-v3-size="default">Default<small>350 x 550</small></button><button type="button" class="v3-segment${state.size === 'large' ? ' is-selected' : ''}" data-v3-size="large">Large<small>400 x 600</small></button></div></section><section class="v3-card"><div class="v3-card-title"><strong>Quick preset</strong><span>Change several modules at once</span></div><div class="v3-preset-row"><button type="button" class="v3-preset-button${preset() === 'default' ? ' is-selected' : ''}" data-v3-preset="default">Default<span>All modules</span></button><button type="button" class="v3-preset-button${preset() === 'minimal' ? ' is-selected' : ''}" data-v3-preset="minimal">Minimal<span>Must-have</span></button><button type="button" class="v3-preset-button${preset() === 'custom' ? ' is-selected' : ''}" data-v3-preset="custom">Custom<span>Manual setup</span></button></div><button type="button" class="v3-secondary-button v3-reset-button" data-v3-reset>Reset to defaults</button><p class="v3-helper">Resets settings only. Saved profiles and collected data are kept.</p></section><section class="v3-card"><div class="v3-card-title"><strong>Features</strong><span>Open a category to configure</span></div><div class="v3-category-grid">${cards}<button type="button" class="v3-category-card" data-v3-route="data"><span class="v3-category-icon">${icon('data')}</span><strong>Data</strong><span>Storage, backup and saved profiles</span><em>Open manager</em></button></div></section>${status()}`;
}

function category(route) {
  const keys = Object.keys(MODULES).filter(key => MODULES[key].category === route);
  return `${heading(CATEGORIES[route].label, CATEGORIES[route].description, 'overview')}<div class="v3-module-list">${keys.map(moduleCard).join('')}</div>${status()}`;
}

// Seeds these controls' initial values. `option-*` ids (module options),
// `debugLogs`, `data-export-scope` and the 9 `history-*` ids
// (V3_HISTORY_PROXY_STATE_KEYS below) are already written natively
// (setV3ModuleOption()/setV3DebugLogging()/the `data-export-scope` change
// listener/saveV3HistorySettings() in v3-data-actions.js), so they read
// straight from `state.moduleOptions`/`state.debugLogs`/`state.exportScope`/
// `state.dataSettings.<field>`.
//
// `history-*` ids map 1:1 to `state.dataSettings` fields (RhythiaX.DATA_DEFAULT_SETTINGS
// in shared/data/data-schema.js). `state.dataSettings` is loaded by refreshDataState()
// (v3-data-actions.js) before the "History & Data" screens can be reached, so the
// `|| {}` guard below only matters for the brief window before that first load
// resolves - same defensive pattern dataBackup() already uses for state.dataSettings.
const V3_HISTORY_PROXY_STATE_KEYS = {
  'history-retention': 'retentionDays',
  'history-max-storage': 'maxStorageMb',
  'history-open-day-storage': 'openDayMaxMb',
  'history-snapshot-interval': 'snapshotIntervalMinutes',
  'history-max-snapshots': 'maxSnapshotsPerDay',
  'history-inline-stats': 'inlineStatsReference',
  'history-inline-ranking': 'inlineRankingReference',
  'history-display-mode': 'historyDisplayMode',
  'history-grouping': 'historyGrouping',
};
function proxyControl(id, label, type = 'select', options = []) {
  const fallback = id === 'option-scoreCards-cardLayout' ? 'modern' : id === 'option-titleProgression-crownMode' ? '3d' : id === 'option-advancedStats-profileStyle' ? 'profile-surface' : '';
  const parsed = v3ParseModuleOptionId(id);
  const historyStateKey = V3_HISTORY_PROXY_STATE_KEYS[id];
  const value = id === 'data-export-scope' ? (state.exportScope || 'all')
    : historyStateKey ? (state.dataSettings || {})[historyStateKey]
    : (parsed ? state.moduleOptions?.[parsed.moduleId]?.[parsed.optionId] : '') || fallback;
  if (type === 'number') return `<label class="v3-setting-row"><span>${label}</span><input type="number" data-v3-proxy="${id}" value="${escapeHtml(value)}"></label>`;
  return `<label class="v3-setting-row"><span>${label}</span><select data-v3-proxy="${id}">${options.map(([key, text]) => `<option value="${key}"${value === key ? ' selected' : ''}>${text}</option>`).join('')}</select></label>`;
}

function choiceControl(id, label, options) {
  const fallback = id === 'option-scoreCards-cardLayout' ? 'modern' : '3d';
  const parsed = v3ParseModuleOptionId(id);
  const value = (parsed ? state.moduleOptions?.[parsed.moduleId]?.[parsed.optionId] : '') || fallback;
  return `<div class="v3-choice-row"><span>${label}</span><div class="v3-segmented v3-choice-group">${options.map(([key, text]) => `<button type="button" class="v3-segment${value === key ? ' is-selected' : ''}" data-v3-choice="${id}" data-v3-value="${key}">${text}</button>`).join('')}</div></div>`;
}

// data-export-* checkbox ids map 1:1 to state.export* fields. This is
// ephemeral per-popup-session UI state (read only at export time by
// v3ExportCheckbox() in v3-data-actions.js), not a persisted storage key -
// so the `input` listener in v3-events.js that sets these fields never
// writes to chrome.storage. Shared with v3-events.js/v3-data-actions.js
// (both load after this file, plain global scope, no module system).
const V3_EXPORT_CHECKBOX_STATE_KEYS = {
  'data-export-open-day': 'exportIncludeOpenDay',
  'data-export-title-state': 'exportIncludeTitleState',
  'data-export-settings': 'exportIncludeSettings',
  'data-export-diagnostics': 'exportIncludeDiagnostics',
};
function checkControl(id, label) {
  const parsed = v3ParseModuleOptionId(id);
  const exportStateKey = V3_EXPORT_CHECKBOX_STATE_KEYS[id];
  const checked = id === 'debugLogs' ? state.debugLogs
    : exportStateKey ? state[exportStateKey]
    : id === 'local-backup-enabled' ? (state.dataSettings || {}).localBackupEnabled
    : parsed ? state.moduleOptions?.[parsed.moduleId]?.[parsed.optionId] : false;
  if (id === 'local-backup-enabled') return `<label class="v3-backup-toggle"><span><strong>Automatic backups</strong><small>Keep closed-day history in your selected local folder.</small></span><span class="v3-backup-toggle-control"><em>${checked ? 'On' : 'Off'}</em><span class="v3-switch"><input type="checkbox" data-v3-proxy="${id}"${checked ? ' checked' : ''} aria-label="${label}"><i></i></span></span></label>`;
  return `<label class="v3-check-row"><input type="checkbox" data-v3-proxy="${id}" ${checked ? 'checked' : ''}><span>${label}</span></label>`;
}

function moduleScreen(key) {
  const item = MODULES[key];
  let body = '';
  if (key === 'advancedStats') body = `<section class="v3-card"><div class="v3-card-title"><strong>Profile sections</strong><span>${isEnabled(key) ? 'Enabled' : 'Module disabled'}</span></div><p class="v3-helper">Custom grade and tempo distribution charts displayed on player profiles.</p>${checkControl('option-advancedStats-ratingProfile', 'Rating Profile (Grade breakdown SS–D)')}${checkControl('option-advancedStats-tempoProfile', 'Tempo Profile (Song speed &amp; BPM breakdown)')}${proxyControl('option-advancedStats-profileStyle', 'Profile layout', 'select', [['soft-blocks', 'Soft Blocks'], ['profile-surface', 'Profile Surface'], ['pill-rows', 'Pill Rows']])}${proxyControl('option-advancedStats-profileMetric', 'Display metric', 'select', [['percentage', 'Show percentage'], ['count', 'Show plays'], ['both', 'Show both']])}</section><div class="v3-info-callout"><strong>Looking for stat history or progress badges?</strong><span>Historical stat rows (Weighted RP, Raw RP, FC Count, etc.) and their delta change badges (+ / - / =) are configured under <b>History &rarr; Stat History</b>.</span></div>`;
  if (key === 'playerCompare') body = '<section class="v3-card"><div class="v3-card-title"><strong>Player Compare</strong><span>Side-by-side context</span></div><p class="v3-helper">Compare player performance, map results and Rhythm Points in one focused view.</p><div class="v3-info-callout"><strong>Included</strong><span>Map comparison, Rhythm Points comparison and score weighting.</span></div></section>';
  if (key === 'scoreCards') body = `<section class="v3-card"><div class="v3-card-title"><strong>Score Cards</strong><span>Player profile</span></div>${checkControl('option-scoreCards-customCards', 'Use custom Score Cards')}${choiceControl('option-scoreCards-cardLayout', 'Card design', [['modern', 'Modern (Default)'], ['legacy', 'Legacy']])}${checkControl('option-scoreCards-watchReplay', 'Show watch replay button')}</section>`;
  if (key === 'statHistory') body = `<section class="v3-card"><div class="v3-card-title"><strong>Stat progress indicators</strong><span>Profile delta badges</span></div><p class="v3-helper">Shows change badges (+ / - / =) next to each profile statistic (Weighted RP, Raw RP, AVG Accuracy, FC Count, Play Count, Squares Hit, Maps/Week).</p>${proxyControl('history-inline-stats', 'Compare against', 'select', [['firstSnapshotToday', 'Open day: first snapshot (Today\'s start)'], ['previousCapture', 'Open day: previous snapshot (Recent change)'], ['previousDayClose', 'Closed day: previous day close (Yesterday)']])}</section><section class="v3-card"><div class="v3-card-title"><strong>Expanded stat history</strong><span>Click-to-view timeline</span></div><p class="v3-helper">Click any stat row on the player profile to toggle an interactive historical breakdown table.</p>${proxyControl('history-display-mode', 'Show records', 'select', [['latestOpenAndClosed', 'Latest open state + closed days'], ['closedOnly', 'Closed days only (final daily values)'], ['allSnapshots', 'All open-day snapshots + closed days'], ['firstSnapshotAndClosed', 'First open-day snapshot + closed days']])}${proxyControl('history-grouping', 'Group records by', 'select', [['daily', 'Daily'], ['weekly', 'Weekly'], ['monthly', 'Monthly']])}</section><div class="v3-info-callout"><strong>Automatic local capture</strong><span>One final snapshot per calendar day is saved permanently for each visited profile. Storage and retention limits are configured in <b>History &amp; Data</b>.</span></div>`;
  if (key === 'rankingHistory') body = `<section class="v3-card"><div class="v3-card-title"><strong>Ranking cards progress</strong><span>Header card delta badges</span></div><p class="v3-helper">Shows rank and RP change badges (+ / - / =) inside the top Global Rank, Country Rank, and Rhythm Points profile cards.</p>${proxyControl('history-inline-ranking', 'Compare against', 'select', [['previousDayClose', 'Closed day: previous day close (Yesterday)'], ['firstSnapshotToday', 'Open day: first snapshot (Today\'s start)'], ['previousCapture', 'Open day: previous snapshot (Recent change)']])}</section><div class="v3-info-callout"><strong>Independent ranking collection</strong><span>Stores Global Rank, Country Rank and Rhythm Points snapshots separately from detailed stat rows to track leaderboard progression over time.</span></div>`;
   if (key === 'titleProgression') body = `<section class="v3-card"><div class="v3-card-title"><strong>Appearance</strong><span>Progress animation</span></div>${choiceControl('option-titleProgression-crownMode', 'Grandmaster crown', [['3d', '3D'], ['2d', '2D']])}<div class="v3-info-callout"><strong>Animation memory</strong><span>Stores one latest RP and Global rank snapshot per profile. This is not a daily history.</span></div></section>`;
  if (key === 'easterEggs') body = '<section class="v3-card"><div class="v3-card-title"><strong>Easter Eggs &amp; Visuals</strong><span>Playful touches</span></div><p class="v3-helper">Animated number effects (67, 69, 420) and cosmetic profile Easter eggs across the site.</p><div class="v3-info-callout"><strong>Performance friendly</strong><span>When disabled, DOM observers, text scanning, and animation interval loops are completely stopped.</span></div></section>';
  return `${heading(item.label, item.description, item.category)}<div class="v3-module-status"><span class="v3-status-dot"></span><div><strong>Module ${isEnabled(key) ? 'enabled' : 'disabled'}</strong><span>Use the switch below to change the main module state.</span></div>${switchMarkup(key)}</div>${body}${status()}`;
}

function dataNav() {
  return `<nav class="data-nav" aria-label="History and Data sections">${[['overview', 'Overview'], ['storage', 'Storage'], ['backup', 'Backup'], ['transfer', 'Export'], ['import', 'Import'], ['profiles', 'Profiles']].map(([key, label]) => `<button type="button" class="${state.dataView === key ? 'is-selected' : ''}" data-v3-data-view="${key}">${label}</button>`).join('')}</nav>`;
}

function summaryMarkup() {
  const summary = state.summary || {};
  const bytes = Number(summary.bytes) || 0;
  const bytesText = bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `<div class="history-summary"><div class="summary-card"><strong>${summary.profileCount ?? 0}</strong><span>Tracked profiles</span></div><div class="summary-card"><strong>${summary.dailyCount ?? 0}</strong><span>Closed stat days</span></div><div class="summary-card"><strong>${summary.openCaptureCount ?? 0}</strong><span>Open captures</span></div><div class="summary-card"><strong>${bytesText}</strong><span>Local cache</span></div></div>`;
}

function aboutLinkMarkup([label, href, description]) {
  const content = `<strong>${label}</strong><small>${description}</small>`;
  return href ? `<a class="v3-about-link" href="${href}" target="_blank" rel="noreferrer">${content}</a>` : `<div class="v3-about-link v3-about-link-static">${content}</div>`;
}

function aboutLinkGroup(title, description, links) {
  return `<section class="v3-card v3-about-group"><div class="v3-card-title"><strong>${title}</strong><span>${description}</span></div><div class="v3-about-links">${links.map(aboutLinkMarkup).join('')}</div></section>`;
}

function aboutScreen() {
  const extensionLinks = [
    ['Chrome Web Store', 'https://chromewebstore.google.com/detail/rhythia-reimagined/ekjfnmfocjohkiieakohbnagjcdbfolb', 'Open official listing'],
    ['Suggest a feature', 'https://github.com/Rhythia-Reimagined-Extension/Extension/issues/new?template=feature_request.md', 'Feature request'],
    ['Report an issue', 'https://github.com/Rhythia-Reimagined-Extension/Extension/issues/new?template=bug_report.md', 'GitHub Issues'],
  ];
  const communityLinks = [
    ['Discord', '', 'ShurielDev'],
    ['GitHub', 'https://github.com/Rhythia-Reimagined-Extension', 'Project organization'],
    ['Rhythia profile', 'https://www.rhythia.com/player/255585', 'Open profile'],
  ];
  return `${heading('About', 'Rhythia Reimagined and useful links.', 'overview')}<div class="v3-about-stack"><section class="v3-card"><div class="v3-card-title"><strong>Rhythia Reimagined</strong><span>About this extension</span></div><p class="v3-helper">Slightly cleaner. Slightly more useful.</p></section>${aboutLinkGroup('Extension & Feedback', 'Use, report, or suggest', extensionLinks)}${aboutLinkGroup('Community & Project', 'People and source', communityLinks)}<section class="v3-card"><div class="v3-card-title"><strong>Diagnostics</strong><span>Optional troubleshooting</span></div>${checkControl('debugLogs', 'Error and warning logging')}<p class="v3-helper">Logs actionable errors and warnings only. Sensitive profile data and sessions are not included.</p></section></div>${status()}`;
}

function dataTargetsMarkup(profiles) {
  return profiles.length ? profiles.map(profile => `<span class="v3-target-profile"><strong>${escapeHtml(profile.name)}</strong><small>Player #${escapeHtml(profile.id)}</small></span>`).join('') : '<span class="v3-empty-target">No tracked profiles</span>';
}

function deleteCategoriesMarkup() {
  return DELETE_CATEGORIES.map(([key, label, description]) => `<label class="v3-delete-option"><input type="checkbox" data-v3-delete-choice="${key}" ${state.deleteChoices[key] ? 'checked' : ''}><span><strong>${label}</strong><small>${description}</small></span></label>`).join('');
}

function openDataSelection(action, scope, choices = null) {
  state.modalReturnFocus = document.activeElement;
  state.deleteWholeProfiles = false;
  state.deleteChoices = choices || (scope === 'global-all' || scope === 'remove'
    ? { statHistory: true, rankingHistory: true, openDay: true, titleProgression: true }
    : { statHistory: true, rankingHistory: true, openDay: false, titleProgression: false });
  state.pendingAction = { action, scope, phase: 'select' };
  render();
}

function confirmationMarkup() {
  const pending = state.pendingAction;
  if (!pending) return '';
  const targets = pending.scope === 'profile' || pending.scope === 'remove' ? (selectedProfile() ? [selectedProfile()] : []) : (state.profiles || []);
  if (pending.phase === 'select') {
    const isAll = pending.scope === 'global-all';
    const isRemove = pending.scope === 'remove';
    const title = isRemove ? 'Remove profile and all data' : isAll ? 'Delete all collected data' : 'Delete selected data';
    const kicker = isRemove ? 'One profile / everything' : isAll ? 'All tracked profiles / everything' : pending.scope === 'profile' ? 'One profile / data only' : 'All tracked profiles / selected categories';
    const copy = isRemove ? 'This removes one complete profile, not a category from the global store.' : isAll ? 'This removes collected records for every tracked profile. It does not remove the profile entries themselves.' : pending.scope === 'profile' ? 'Choose categories to remove from this profile. Nothing from another profile is included.' : 'This is a global cleanup action. Choose categories to remove from every tracked profile shown below.';
     const body = isRemove ? `<div class="v3-modal-warning"><strong>Permanent profile removal</strong><span>Profile identity, saved snapshot, stat history, ranking history, open-day captures, Title Progression data and local JSON will be removed.</span></div>` : isAll ? '<div class="v3-modal-summary"><strong>All collected data will be removed</strong><span>Every snapshot, stat record, ranking record, open-day capture and Title Progression record for the profiles above will be deleted.</span></div><label class="v3-delete-option v3-delete-profiles-option"><input type="checkbox" data-v3-delete-profiles><span><strong>Also include deleting whole profiles</strong><small>Remove the saved profile identities as well as their collected data.</small></span></label>' : `<div class="v3-delete-options">${deleteCategoriesMarkup()}</div><div class="v3-modal-note"><strong>Profiles stay saved</strong><span>Profile identities and entries remain. Only the checked categories are removed from the profiles above.</span></div>`;
    return `<div class="v3-modal-layer" role="presentation"><section class="v3-modal v3-modal-selection${isRemove ? ' is-profile-removal' : isAll ? ' is-global-deletion' : ''}" role="dialog" aria-modal="true"><span class="v3-modal-kicker">${kicker}</span><h3>${title}</h3><p>${copy}</p><div class="v3-modal-target"><span>Profiles included</span><div class="v3-target-profile-list">${dataTargetsMarkup(targets)}</div></div>${body}<div class="v3-modal-actions"><button type="button" class="v3-secondary-button" data-v3-modal-close>Cancel</button><button type="button" class="${isRemove || isAll ? 'v3-danger-button' : 'v3-primary-button'}" data-v3-modal-review>${isRemove ? 'Review profile removal' : isAll ? 'Review full deletion' : 'Review selected data'}</button></div></section></div>`;
  }
  const isRemove = pending.scope === 'remove';
  const isAll = pending.scope === 'global-all';
  const selectedCategories = DELETE_CATEGORIES.filter(([key]) => state.deleteChoices[key]).map(([, label]) => label).join(', ') || 'No categories selected';
  const title = isRemove ? 'Remove this profile permanently?' : isAll ? 'Delete all collected data permanently?' : 'Continue without a backup?';
  const copy = isRemove ? `You are about to remove ${selectedProfile()?.name || 'this profile'}, its profile identity and all associated data.` : isAll ? 'You are about to remove every collected record for all profiles listed above.' : `You are about to permanently delete ${selectedCategories} from ${pending.scope === 'profile' ? selectedProfile()?.name || 'this profile' : 'every profile listed above'}.`;
   const targetText = isRemove ? 'Scope: profile identity and every associated record' : isAll ? `Scope: every collected category for every profile above${state.deleteWholeProfiles ? ' plus whole profile identities' : ''}` : `Categories: ${selectedCategories}`;
   return `<div class="v3-modal-layer" role="presentation"><section class="v3-modal v3-modal-confirm${isRemove ? ' is-profile-removal' : isAll ? ' is-global-deletion' : ''}" role="dialog" aria-modal="true"><span class="v3-modal-kicker">${isRemove ? 'Final profile removal' : isAll ? 'Final global deletion' : 'Final data deletion'}</span><h3>${title}</h3><p>${copy}</p><div class="v3-modal-target"><span>Review scope</span><strong>${targetText}</strong></div><div class="v3-modal-warning"><strong>${isRemove ? 'The profile identity will be removed.' : isAll ? state.deleteWholeProfiles ? 'Collected data and whole profiles will be removed.' : 'All collected data will be removed.' : 'The selected data cannot be restored.'}</strong><span>This action cannot be undone. A local backup is recommended before continuing.</span></div><div class="v3-modal-actions"><button type="button" class="v3-secondary-button" data-v3-modal-back>Back</button><button type="button" class="v3-danger-button" data-v3-modal-confirm>${isRemove ? 'Remove profile permanently' : isAll ? 'Delete all collected data' : 'Continue'}</button></div></section></div>`;
}
