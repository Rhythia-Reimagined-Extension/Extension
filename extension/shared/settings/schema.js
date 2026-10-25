// =============================================
// Reimagined for Rhythia — settings schema
// =============================================
// Every setting the popup shows, where it is saved, and which look uses it.
// The popup builds itself from SETTINGS; Exodus and Classic read the same keys.
//
// Keys and where they live in chrome.storage.local:
//   theme, popupSize, look, exodus.style   own keys, see ROOT
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

  const ROOT = { theme: 'rhythiaxTheme', popupSize: 'rhythiaxPopupSize', look: 'rhythiaxExodus', 'exodus.style': 'rhythiaxExodusStyle' };
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
        { key: 'options.titleProgression.showProgression', type: 'switch', looks: CLASSIC, default: true, title: 'Progression map' },
        { key: 'options.titleProgression.showHistory', type: 'switch', looks: CLASSIC, default: true, title: 'Progression history' },
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
    { key: 'modules.easterEggs', tab: 'features', group: 'Extras', type: 'switch', looks: CLASSIC, default: true,
      title: 'Easter eggs', desc: 'Small surprises on some profiles.' },

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
        'local-only': 'Only what this browser saw. Nothing is sent to the community service.',
        hybrid: 'Shared public history plus what this browser saw. The viewed player’s public ID and an anonymous key for this installation are sent to Shuriel’s service (rhythia.shuriel.com).',
        'cloud-only': 'Shared public history only. Nothing new is saved on this device. The viewed player’s public ID and an anonymous key for this installation are sent to Shuriel’s service (rhythia.shuriel.com).',
      } },
    { key: 'data.telemetryEnabled', tab: 'data', group: 'Community history', type: 'switch', looks: CLASSIC, default: false,
      title: 'Report profile visits', desc: 'Sends the public ID of profiles you open, so their history starts being kept. Your IP address is processed to prevent abuse.' },
    { key: 'storage', tab: 'data', group: 'On this device', type: 'storage', looks: BOTH, title: 'Storage' },
    // Only Classic records these visits (rhythiax_connection_logs).
    { key: 'visits', tab: 'data', group: 'Recent profile visits', type: 'visits', looks: CLASSIC, title: 'Recent profile visits' },
  ];

  const EXODUS_DEFAULTS = { pages: PAGES.map(p => p[0]), search: true, homeVideo: true, scoresView: 'list' };

  const walk = (list, fn) => list.forEach(s => { fn(s); if (s.children) walk(s.children, fn); });
  const find = key => { let hit = null; walk(SETTINGS, s => { if (s.key === key) hit = s; }); return hit; };

  // Read one value from a chrome.storage.local result, with the old names and shapes the 1.2.x popup left behind.
  function read(store, key) {
    const def = find(key)?.default;
    const [head, a, b] = key.split('.');
    if (key === 'theme') return ['reimagined', 'dark', 'white'].includes(store.rhythiaxTheme) ? store.rhythiaxTheme : 'reimagined';
    if (key === 'popupSize') return store.rhythiaxPopupSize === 'large' ? 'large' : 'default';
    if (key === 'look') return store.rhythiaxExodus === true ? 'exodus' : 'classic';
    if (key === 'exodus.style') return store.rhythiaxExodusStyle === 'float' ? 'float' : 'lines';
    if (head === 'modules') {
      const m = store.rhythiaxModules || {};
      if (a === 'statHistory') return m.statHistory !== false || m.rankingHistory !== false;
      return m[a] ?? def;
    }
    if (head === 'options') {
      const o = store.rhythiaxModuleOptions?.[a] || {};
      if (a === 'scoreCards' && b === 'modDisplay') return o.showModIcons === false && o.showModText !== false ? 'labels' : 'icons';
      if (a === 'scoreCards' && b === 'cardLayout') return ({ eclipse: 'variant_b', ribbon: 'variant_c' })[o.cardLayout] || (['variant_a', 'variant_b', 'variant_c', 'variant_d', 'variant_e', 'variant_f'].includes(o.cardLayout) ? o.cardLayout : def);
      if (a === 'statHistory' && b === 'layout') return ['variant_a', 'variant_b'].includes(o.layout) ? o.layout : def;
      if (a === 'advancedStats' && b === 'performanceBreakdown') return o.performanceBreakdown ?? o.performanceFilters ?? def;
      if (a === 'advancedStats' && b === 'playstyleTab') return o.playstyleTab ?? o.playstyleDeck ?? def;
      if (a === 'appearance' && b === 'dateFormat') {
        const f = String(o.dateFormat || store.rhythiaxModuleOptions?.scoreCards?.dateFormat || def).replace(/\//g, '-');
        return ['yyyy-mm-dd', 'dd-mm-yyyy', 'mm-dd-yyyy'].includes(f) ? f : def;
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
