// =============================================
// Reimagined for Rhythia — settings schema
// =============================================
// Every setting the popup shows, where it is saved, and which look uses it.
// The popup builds itself from SETTINGS; Exodus and Classic read the same keys.
//
// Keys and where they live in chrome.storage.local:
//   theme, popupSize, look, exodus.style,
//   mapKindsOffline                        own keys, see ROOT
//   modules.<name>                         rhythiaxModules[name]
//   options.<module>.<name>                rhythiaxModuleOptions[module][name]
//   data.<name>                            rhythiaxDataSettings[name], written by the background
//   exodus.<name>                          rhythiaxExodusOptions[name]
//
// A setting with looks ['classic', 'exodus'] works in both; with one look it is shown only there.
// Adding a setting: one entry here, then read it where it is used.

var RhythiaX = RhythiaX || {};

RhythiaX.SettingsSchema = (function () {
  'use strict';

  const BOTH = ['classic', 'exodus'];
  const CLASSIC = ['classic'];
  const EXODUS = ['exodus'];

  const ROOT = { theme: 'rhythiaxTheme', popupSize: 'rhythiaxPopupSize', look: 'rhythiaxExodus', 'exodus.style': 'rhythiaxExodusStyle', mapKindsOffline: 'rhythiaxMapKindsOffline' };
  const EXODUS_KEY = 'rhythiaxExodusOptions';

  const PAGES = [['home', 'Home'], ['profiles', 'Profiles'], ['leaderboards', 'Leaderboards'], ['maps', 'Maps and scores'], ['skins', 'Skins'],
    ['clans', 'Clans'], ['collections', 'Collections'], ['wiki', 'Wiki'], ['changelog', 'Changelog'], ['support', 'Support']];

  const SETTINGS = [
    // Features
    { key: 'modules.playerCompare', tab: 'features', group: 'Profiles', type: 'switch', looks: BOTH, default: true,
      title: 'Player Compare', desc: 'Two players side by side: duel, radar and shared maps.' },
    { key: 'modules.statHistory', tab: 'features', group: 'Profiles', type: 'switch', looks: BOTH, default: true,
      title: 'Rank and stat history', desc: 'Daily rank, RP and plays, with how they changed.',
      children: [
        { key: 'options.statHistory.layout', type: 'tiles', looks: CLASSIC, default: 'variant_b', title: 'Statistics',
          options: [['variant_a', 'A', 'Tables', 'tables'], ['variant_b', 'B', 'Chart', 'chart']] },
        { key: 'data.inlineRankingReference', type: 'pills', looks: CLASSIC, default: 'previousDayClose', title: 'Changes since',
          options: [['previousDayClose', 'Yesterday'], ['firstSnapshotToday', 'Today’s start']] },
      ] },
    { key: 'modules.titleProgression', tab: 'features', group: 'Profiles', type: 'switch', looks: BOTH, default: true,
      title: 'Title progression', desc: 'Rank milestones and how close the next title is.',
      children: [
        { key: 'options.titleProgression.showProgression', type: 'switch', looks: CLASSIC, default: true, title: 'Progress bar' },
        { key: 'options.titleProgression.showHistory', type: 'switch', looks: CLASSIC, default: true, title: 'Progression history' },
        { key: 'exodus.titleLook', type: 'tiles', looks: EXODUS, default: 'road', title: 'Title look',
          options: [['road', 'Road', '', 'tRoad'], ['ring', 'Ring', '', 'tRing'], ['track', 'Track', '', 'tTrack']] },
      ] },
    { key: 'modules.advancedStats', tab: 'features', group: 'Profiles', type: 'switch', looks: BOTH, default: true,
      title: 'Statistics and playstyle', desc: 'Speed, accuracy and best maps from a player’s top plays.',
      children: [
        { key: 'options.advancedStats.playstyleTab', type: 'switch', looks: CLASSIC, default: true, title: 'Playstyle tab' },
        { key: 'options.advancedStats.scoutingSummary', type: 'switch', looks: CLASSIC, default: true, title: 'Summary card' },
        { key: 'options.advancedStats.performanceBreakdown', type: 'switch', looks: CLASSIC, default: true, title: 'Speed and grades' },
        { key: 'options.advancedStats.bestMaps', type: 'switch', looks: CLASSIC, default: true, title: 'Best maps' },
      ] },
    { key: 'modules.friendsList', tab: 'features', group: 'Profiles', type: 'switch', looks: BOTH, default: true,
      title: 'Friends list', desc: 'On your own profile, online friends first.' },
    { key: 'modules.scoreCards', tab: 'features', group: 'Scores', type: 'switch', looks: CLASSIC, default: true,
      title: 'Score cards', desc: 'Score rows with RP weighting, grades and map art.',
      children: [
        { key: 'options.scoreCards.cardLayout', type: 'tiles', looks: CLASSIC, default: 'variant_e', title: 'Card style',
          options: [['variant_a', 'A', 'Big grade', 'cardA'], ['variant_b', 'B', 'Square art', 'cardB'], ['variant_c', 'C', 'Compact', 'cardC'],
            ['variant_d', 'D', 'Rhythia row', 'cardD'], ['variant_e', 'E', 'Art behind', 'cardE'], ['variant_f', 'F', 'Table', 'cardF']] },
        { key: 'options.scoreCards.playerView', type: 'pills', looks: CLASSIC, default: 'list', title: 'Scores view', options: [['list', 'List'], ['grid', 'Grid']] },
        { key: 'options.scoreCards.modDisplay', type: 'pills', looks: CLASSIC, default: 'icons', title: 'Mods as', options: [['icons', 'Icons'], ['labels', 'Labels']] },
        { key: 'options.scoreCards.cardBackgrounds', type: 'switch', looks: CLASSIC, default: true, title: 'Map art behind cards' },
      ] },
    { key: 'exodus.scoresView', tab: 'features', group: 'Scores', type: 'tiles', looks: EXODUS, default: 'list',
      title: 'Scores layout', desc: 'How a profile shows its scores first.', options: [['list', 'List', '', 'exoList'], ['grid', 'Grid', '', 'exoGrid']] },
    { key: 'exodus.pages', tab: 'features', group: 'Pages', type: 'checks', looks: EXODUS, default: PAGES.map(p => p[0]),
      title: 'Pages Exodus takes over', desc: 'Off keeps Rhythia’s own version of that page.', options: PAGES },
    { key: 'exodus.search', tab: 'features', group: 'Pages', type: 'switch', looks: EXODUS, default: true,
      title: 'Search with Ctrl K', desc: 'Players, maps and clans from any page.' },
    { key: 'modules.easterEggs', tab: 'features', group: 'Extras', type: 'switch', looks: BOTH, default: true,
      title: 'Easter eggs', desc: 'Small surprises here and there.',
      children: [
        { key: 'options.easterEggs.frequency', type: 'pills', looks: BOTH, default: 'normal', title: 'How often',
          options: [['frequent', 'Frequent'], ['normal', 'Normal'], ['rare', 'Rare']] },
      ] },

    // Appearance
    { key: 'theme', tab: 'look', group: 'Colours', type: 'themes', looks: BOTH, default: 'reimagined',
      title: 'Theme', options: [['reimagined', 'Reimagined'], ['dark', 'Dark'], ['white', 'White']] },
    { key: 'exodus.style', tab: 'look', group: 'Colours', type: 'tiles', looks: EXODUS, default: 'lines',
      title: 'Exodus style', options: [['lines', 'Lines', 'Flat, calm', 'lines'], ['float', 'Floating', 'Raised panels', 'float']] },
    { key: 'exodus.homeVideo', tab: 'look', group: 'Motion', type: 'switch', looks: EXODUS, default: true,
      title: 'Moving background on Home', desc: 'Off saves battery and data.' },
    { key: 'options.appearance.dateFormat', tab: 'look', group: 'Formats', type: 'dates', looks: CLASSIC, default: 'yyyy-mm-dd',
      title: 'Date format', options: [['yyyy-mm-dd', 'YYYY-MM-DD'], ['dd-mm-yyyy', 'DD-MM-YYYY'], ['mm-dd-yyyy', 'MM-DD-YYYY']] },
    { key: 'popupSize', tab: 'look', group: 'Formats', type: 'pills', looks: BOTH, default: 'default',
      title: 'Popup size', options: [['default', 'Compact'], ['large', 'Spacious']] },

    // Privacy and data
    { key: 'data.syncMode', tab: 'data', group: 'Community history', type: 'source', looks: BOTH, default: 'hybrid',
      title: 'Where history comes from', options: [['local-only', 'This device', 'device'], ['hybrid', 'Both', 'both'], ['cloud-only', 'Community', 'cloud']],
      notes: {
        'local-only': 'Only what this browser saw. Nothing is sent to the community service. With Both, profiles also show the daily history of the top 5,000 players.',
        hybrid: 'Shared public history plus what this browser saw. Only public player and map IDs, Reimagined Search filters and a random number for this copy of Reimagined go to Reimagined’s history service.',
        'cloud-only': 'Shared public history only. Nothing new is saved on this device. Only public player and map IDs, Reimagined Search filters and a random number for this copy of Reimagined go to Reimagined’s history service.',
      } },
    // Read by shared/map-kinds-basic.js in both looks; online history's types always come first.
    { key: 'mapKindsOffline', tab: 'data', group: 'Community history', type: 'switch', looks: BOTH, default: false,
      title: 'Map types without online history', desc: 'Works out map types in this browser from Rhythia’s map files. Approximate and without Techs; online history is more exact.' },
    { key: 'data.telemetryEnabled', tab: 'data', group: 'Community history', type: 'switch', looks: CLASSIC, default: false,
      title: 'Report profile visits', desc: 'Sends only the public ID of each profile you open, so its history starts being kept. Like any website, the service sees your IP address.' },
    // What is saved in this browser, by kind, each with its size and a way to clear it (popup/popup.js storageCard).
    { key: 'storage', tab: 'data', group: 'On this device', type: 'storage', looks: BOTH, title: 'Storage' },
    { key: 'backup', tab: 'data', group: 'Backup', type: 'backup', looks: BOTH, title: 'Settings and themes' },
    { key: 'reset', tab: 'data', group: 'Start over', type: 'reset', looks: BOTH, title: 'Reset settings' },
  ];

  const walk = (list, fn) => list.forEach(s => { fn(s); if (s.children) walk(s.children, fn); });
  const find = key => { let hit = null; walk(SETTINGS, s => { if (s.key === key) hit = s; }); return hit; };

  // Exodus' own options (rhythiaxExodusOptions) and their defaults, from the exodus.* entries above (exodus.style has
  // its own key), so an option added there reaches the popup and Exodus alike.
  const EXODUS_DEFAULTS = {};
  walk(SETTINGS, s => { if (s.key.startsWith('exodus.') && !ROOT[s.key] && 'default' in s) EXODUS_DEFAULTS[s.key.slice(7)] = Array.isArray(s.default) ? [...s.default] : s.default; });

  // Read one value from a chrome.storage.local result, with the old names and shapes earlier versions left behind,
  // so the popup shows what each look uses.
  function read(store, key) {
    const def = find(key)?.default;
    const [head, a, b] = key.split('.');
    if (key === 'theme') return ['reimagined', 'dark', 'white'].includes(store.rhythiaxTheme) ? store.rhythiaxTheme : 'reimagined';
    if (key === 'popupSize') return store.rhythiaxPopupSize === 'large' ? 'large' : 'default';
    if (key === 'look') return store.rhythiaxExodus === true ? 'exodus' : 'classic';
    if (key === 'exodus.style') return store.rhythiaxExodusStyle === 'float' ? 'float' : 'lines';
    if (key === 'mapKindsOffline') return store.rhythiaxMapKindsOffline === true;
    if (head === 'modules') {
      const m = store.rhythiaxModules || {};
      if (a === 'statHistory') return m.statHistory !== false || m.rankingHistory !== false;
      return m[a] ?? def;
    }
    if (head === 'options') {
      const o = store.rhythiaxModuleOptions?.[a] || {};
      if (a === 'scoreCards' && b === 'modDisplay') return o.showModIcons === false && o.showModText !== false ? 'labels' : 'icons';
      // The card styles' names before 1.2.0, read as Classic reads them (score-cards/store.js normalizeVariant).
      if (a === 'scoreCards' && b === 'cardLayout') {
        const c = String(o.cardLayout || '').toLowerCase().trim();
        const v = ({ flagship: 'variant_a', eclipse: 'variant_b', glass_eclipse: 'variant_b', ribbon: 'variant_c', pro_ribbon: 'variant_c' })[c] || c;
        return ['variant_a', 'variant_b', 'variant_c', 'variant_d', 'variant_e', 'variant_f'].includes(v) ? v : def;
      }
      if (a === 'statHistory' && b === 'layout') return ['variant_a', 'variant_b'].includes(o.layout) ? o.layout : def;
      if (a === 'advancedStats' && b === 'performanceBreakdown') return o.performanceBreakdown ?? o.performanceFilters ?? def;
      if (a === 'advancedStats' && b === 'playstyleTab') return o.playstyleTab ?? o.playstyleDeck ?? def;
      // As Classic reads it (legacy/core/modules.js getDateFormat): the first of the two saved copies with a format
      // other than the default; one the popup does not offer (an early build's 'relative' or slashes) is no choice.
      if (a === 'appearance' && b === 'dateFormat') {
        const pick = v => { const f = String(v || '').toLowerCase().trim(); return f !== def && ['yyyy-mm-dd', 'dd-mm-yyyy', 'mm-dd-yyyy'].includes(f) ? f : ''; };
        return pick(o.dateFormat) || pick(store.rhythiaxModuleOptions?.scoreCards?.dateFormat) || def;
      }
      return o[b] ?? def;
    }
    if (head === 'data') return store.rhythiaxDataSettings?.[a] ?? def;
    if (head === 'exodus') {
      const v = store[EXODUS_KEY]?.[a];
      if (a === 'pages') return Array.isArray(v) ? v.filter(p => PAGES.some(([k]) => k === p)) : [...def];
      return v ?? def;
    }
    return def;
  }

  // Exodus options with defaults filled in.
  const exodusOptions = store => Object.fromEntries(Object.keys(EXODUS_DEFAULTS).map(k => [k, read(store, `exodus.${k}`)]));

  return { ROOT, EXODUS_KEY, SETTINGS, EXODUS_DEFAULTS, walk, find, read, exodusOptions };
})();
