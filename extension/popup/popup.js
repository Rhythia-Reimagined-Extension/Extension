// ==========================================================================
// Reimagined for Rhythia — Popup v5
// ==========================================================================
// Built from shared/settings/schema.js. Each row is one schema entry; the look switch at the top
// decides which entries show. Values are saved where the 1.2.x scripts and Exodus read them.

(function () {
  'use strict';

  const X = RhythiaX.SettingsSchema;
  const DEFAULT_DATA_SETTINGS = {
    retentionDays: 90,
    maxStorageMb: 25,
    openDayMaxMb: 5,
    inlineRankingReference: 'previousDayClose',
    telemetryEnabled: true,
    syncMode: 'hybrid',
    communityConsentVersion: 0,
  };
  const EXODUS_CACHES = ['rhythiaxExodusSnapshots', 'rhythiaxExodusHome', 'rhythiaxExodusBoard', 'rhythiaxExodusBoardHistory', 'rhythiaxExodusPages'];
  // Exodus keeps each saved profile, page and player history under its own key (exodus/core/data.js).
  const EXODUS_CACHE_PREFIXES = ['rhythiaxExodusSnap:', 'rhythiaxExodusHist:', 'rhythiaxExodusPage:'];
  const STORE_KEYS = ['rhythiaxMasterActive', 'rhythiaxTheme', 'rhythiaxPopupSize', 'rhythiaxModules', 'rhythiaxModuleOptions',
    'rhythiaxDataSettings', 'rhythiax_connection_logs', 'rhythiaxExodus', 'rhythiaxExodusStyle', X.EXODUS_KEY];

  const root = document.getElementById('popupRoot');
  const body = document.getElementById('body');
  root.inert = true;

  // What is saved, as stored, and every schema value read from it.
  let store = {};
  let V = {};
  let look = 'classic';
  let tab = 'features';
  let logs = [];

  // ─── Icons ───
  const I = {
    cmp: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    chart: '<path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    card: '<rect x="4" y="5" width="16" height="14" rx="2"/><path d="M8 15v-3M12 15V9M16 15v-5"/>',
    smile: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
    layout: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16M3 9h12"/>',
    play: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3z"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.6 0-.9-.6-1.3-.6-2.1 0-.9.7-1.6 1.6-1.6H17a4 4 0 0 0 4-4C21 6.6 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7" r="1"/>',
    lines: '<path d="M4 6h16M4 12h16M4 18h10"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    size: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    cloud: '<path d="M17.5 19H9a7 7 0 1 1 6.7-9h1.8a4.5 4.5 0 1 1 0 9z"/>',
    pulse: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
    device: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M11 18h2"/>',
    both: '<rect x="2" y="8" width="8" height="13" rx="1.5"/><path d="M14 17h5.5a3.5 3.5 0 0 0 .4-7A5 5 0 0 0 10.6 9"/>',
  };
  const svg = k => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k] || ''}</svg>`;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const POLICY = 'https://shuriel.com/policies/reimagined/history/#privacy';

  // ─── Messages to open Rhythia tabs ───
  function notifyActiveTabs(message) {
    if (!chrome.tabs?.query) return;
    const sent = new Set();
    const send = tabs => {
      (tabs || []).forEach(t => {
        if (t?.id && !sent.has(t.id)) {
          sent.add(t.id);
          Promise.resolve(chrome.tabs.sendMessage(t.id, message)).catch(() => {});
        }
      });
    };
    Promise.resolve(chrome.tabs.query({ url: ['*://*.rhythia.com/*', '*://rhythia.com/*'] })).then(send).catch(() => {});
  }

  // ─── Reading ───
  const hasCommunityConsent = () => store.rhythiaxDataSettings?.communityConsentVersion === 1;

  function readAll() {
    store.rhythiaxDataSettings = { ...DEFAULT_DATA_SETTINGS, ...(store.rhythiaxDataSettings || {}) };
    const next = {};
    X.walk(X.SETTINGS, s => { if ('default' in s || X.ROOT[s.key]) next[s.key] = X.read(store, s.key); });
    // Until the community choice is made, history stays on this device and nothing is reported.
    if (!hasCommunityConsent()) { next['data.syncMode'] = 'local-only'; next['data.telemetryEnabled'] = false; }
    look = X.read(store, 'look');
    V = next;
  }

  async function loadState() {
    root.inert = true;
    try {
      const ready = await chrome.runtime.sendMessage({ type: 'rhythiax-data-ready' });
      if (!ready?.ok) throw new Error(ready?.error || 'Local data is not ready.');
      store = await chrome.storage.local.get(STORE_KEYS);
      if (store.rhythiaxMasterActive === false) {
        chrome.storage.local.set({ rhythiaxMasterActive: true });
        notifyActiveTabs({ type: 'rhythiax-master-toggle', active: true });
      }
      logs = store.rhythiax_connection_logs || [];
      readAll();
      document.getElementById('dataReadinessNotice').hidden = true;
      paintChrome();
      render();
      root.inert = false;
    } catch (err) {
      console.error('RhythiaX: Failed to load popup state:', err);
      const notice = document.getElementById('dataReadinessNotice');
      notice.hidden = false;
      notice.textContent = 'Your local data could not be prepared. Settings are locked to protect it. Reopen this popup to retry.';
    }
  }

  // ─── Saving ───
  async function persistDataPatch(patch) {
    const response = await chrome.runtime.sendMessage({ type: 'rhythiax-storage-mutation', operation: 'data-settings-patch', payload: { patch } });
    if (!response?.ok) throw new Error(response?.error || 'Data settings could not be saved.');
    if (response.value) store.rhythiaxDataSettings = { ...DEFAULT_DATA_SETTINGS, ...response.value };
    notifyActiveTabs({ type: 'rhythiax-data-settings', settings: store.rhythiaxDataSettings });
  }

  async function chooseCommunity(mode) {
    const choice = mode === 'local-only' ? 'local-only' : mode === 'cloud-only' ? 'cloud-no-reports' : 'hybrid-no-reports';
    const response = await chrome.runtime.sendMessage({ type: 'rhythiax-community-consent', choice });
    if (!response?.ok) throw new Error('Community settings could not be saved.');
    store.rhythiaxDataSettings = { ...DEFAULT_DATA_SETTINGS, ...response.value };
    notifyActiveTabs({ type: 'rhythiax-history-settings' });
  }

  async function write(key, value) {
    const [head, a, b] = key.split('.');
    if (key === 'theme') {
      store.rhythiaxTheme = value;
      await chrome.storage.local.set({ rhythiaxTheme: value });
      notifyActiveTabs({ type: 'rhythiax-theme', theme: value });
      notifyActiveTabs({ type: 'rhythiax-theme-changed', theme: value });
    } else if (key === 'popupSize') {
      store.rhythiaxPopupSize = value;
      await chrome.storage.local.set({ rhythiaxPopupSize: value });
    } else if (key === 'look') {
      store.rhythiaxExodus = value === 'exodus';
      await chrome.storage.local.set({ rhythiaxExodus: store.rhythiaxExodus });
    } else if (key === 'exodus.style') {
      store.rhythiaxExodusStyle = value;
      await chrome.storage.local.set({ rhythiaxExodusStyle: value });
    } else if (head === 'modules') {
      const modules = { ...(store.rhythiaxModules || {}) };
      if (a === 'statHistory') { modules.statHistory = value; modules.rankingHistory = value; } else modules[a] = value;
      store.rhythiaxModules = modules;
      await chrome.storage.local.set({ rhythiaxModules: modules });
      notifyActiveTabs({ type: 'rhythiax-module-settings', settings: modules });
    } else if (head === 'options') {
      const options = JSON.parse(JSON.stringify(store.rhythiaxModuleOptions || {}));
      const mod = options[a] = options[a] || {};
      if (a === 'scoreCards' && b === 'modDisplay') { mod.showModIcons = value === 'icons'; mod.showModText = value !== 'icons'; }
      else if (a === 'appearance' && b === 'dateFormat') { mod.dateFormat = value; options.scoreCards = { ...(options.scoreCards || {}), dateFormat: value }; }
      else mod[b] = value;
      if (a === 'advancedStats') { delete mod.performanceFilters; delete mod.playstyleDeck; }
      store.rhythiaxModuleOptions = options;
      await chrome.storage.local.set({ rhythiaxModuleOptions: options });
      notifyActiveTabs({ type: 'rhythiax-module-options', options });
      if (b === 'dateFormat') notifyActiveTabs({ type: 'rhythiax-date-format', dateFormat: value });
    } else if (head === 'data') {
      if (a === 'syncMode' && !hasCommunityConsent()) await chooseCommunity(value);
      else await persistDataPatch({ [a]: value });
    } else if (head === 'exodus') {
      const opts = { ...(store[X.EXODUS_KEY] || {}), [a]: value };
      store[X.EXODUS_KEY] = opts;
      await chrome.storage.local.set({ [X.EXODUS_KEY]: opts });
    }
  }

  async function set(key, value) {
    const before = V[key];
    V[key] = value;
    try {
      await write(key, value);
      readAll();
    } catch (err) {
      console.error('RhythiaX: setting not saved', key, err);
      V[key] = before;
      toast('That setting could not be saved. Try again.');
      render(false);
      return false;
    }
    return true;
  }

  // ─── Small drawings of each variant ───
  // Drawn from the real pages: the same columns, colours and proportions, two or three rows each.
  // Classes (popup.css): t text, m muted text, g grade green, r misses red, b RP blue, a accent,
  // art map art, fade map art that fades in from the left, card a row's frame, bx a boxed value, gb the boxed grade.
  const R = (x, y, w, h, c, rx = 0.8) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${c}"/>`;
  const rows = (ys, fn) => ys.map(fn).join('');
  // A grade letter, centred on x; the third row of a list shows an S like most profiles have.
  const G = (x, y, size, letter = 'A') => `<text x="${x}" y="${y}" font-size="${size}" class="${letter === 'S' ? 'gs' : 'gt'}">${letter}</text>`;
  const third = i => (i === 2 ? 'S' : 'A');
  const box = (x, y, w, h, val) => R(x, y, w, h, 'bx', 1) + R(x + 1.6, y + 1.5, w - 4, 1.1, 'm') + R(x + 1.6, y + h - 3.3, w - 3.5, 1.7, val);
  const ART = {
    // A: large grade in its own column, green edge, four boxed values, map art on the right.
    cardA: R(1, 3, 94, 38, 'card', 3) + R(60, 3, 35, 38, 'fade', 3) + R(1.3, 3.3, 13, 37.4, 'col', 2.8) + R(14.3, 5, 0.7, 34, 'g', 0)
      + G(7.8, 26, 12) + R(18, 8, 30, 2.8, 't') + R(18, 13.5, 21, 1.6, 'm') + R(18, 17.5, 5, 4, 'bx', 0.8)
      + box(18, 27, 10, 8, 'g') + box(30, 27, 10, 8, 't') + box(42, 27, 8, 8, 'r') + box(52, 27, 13, 8, 'a') + R(88, 5.5, 4.5, 4.5, 'bx', 1),
    // B: square map art with the grade on it, boxed values on the right.
    cardB: rows([3, 23], y => R(1, y, 94, 18, 'card', 2.5) + R(3.5, y + 2.5, 13, 13, 'art', 1.5) + R(12, y + 1.6, 5.5, 5, 'gb', 1) + G(14.75, y + 5.5, 4)
      + R(20, y + 3.5, 26, 2.4, 't') + R(20, y + 8, 18, 1.4, 'm') + R(20, y + 11.5, 4, 3.6, 'bx', 0.7)
      + box(51, y + 4.5, 8, 8, 'g') + box(60.5, y + 4.5, 9, 8, 't') + box(71, y + 4.5, 7, 8, 'r') + box(79.5, y + 4.5, 8, 8, 'a') + R(89.5, y + 6.5, 3.5, 4.5, 'bx', 0.8)),
    // C: rank, a boxed grade and the same boxed values, no map art.
    cardC: rows([3, 23], y => R(1, y, 94, 18, 'card', 2.5) + R(3.5, y + 8, 2.5, 1.6, 'm') + R(8, y + 4.5, 8, 9, 'gb', 1.2) + G(12, y + 11.4, 6.5)
      + R(19.5, y + 3.5, 26, 2.4, 't') + R(19.5, y + 8, 18, 1.4, 'm') + R(19.5, y + 11.5, 4, 3.6, 'bx', 0.7)
      + box(51, y + 4.5, 8, 8, 'g') + box(60.5, y + 4.5, 9, 8, 't') + box(71, y + 4.5, 7, 8, 'r') + box(79.5, y + 4.5, 8, 8, 'a') + R(89.5, y + 6.5, 3.5, 4.5, 'bx', 0.8)),
    // D: Rhythia's own row: grade and accuracy first, small map art, misses, hits and RP on the right.
    cardD: rows([2, 16, 30], (y, i) => R(1, y, 94, 12, 'card', 2) + R(1, y, 1.3, 12, 'g', 0.6) + G(5.4, y + 7.7, 4.4, third(i)) + R(8, y + 4.8, 9, 2.4, 't')
      + R(19.5, y + 1.5, 0.5, 9, 'm', 0) + R(22, y + 2, 8, 8, 'art', 1) + R(33, y + 3, 24, 2.2, 't') + R(33, y + 7, 16, 1.4, 'm')
      + R(60, y + 3.5, 4.5, 4.5, 'bx', 0.8) + R(68, y + 5, 4, 2, 'r') + R(75, y + 5, 8, 2, 't') + R(86, y + 3, 5, 2.4, 'b') + R(84, y + 7.2, 7, 1.3, 'm')),
    // E: map art behind the row, large grade, accuracy · misses · hits on one line, RP on the right.
    cardE: rows([2, 16, 30], (y, i) => R(1, y, 94, 12, 'card', 2) + R(38, y, 57, 12, 'fade', 2) + R(1, y, 1.3, 12, 'g', 0.6) + G(6.5, y + 8.8, 7, third(i))
      + R(12, y + 2.3, 27, 2.3, 't') + R(12, y + 5.8, 17, 1.3, 'm') + R(12, y + 8.6, 6, 1.6, 'g') + R(20, y + 8.6, 7, 1.6, 'r') + R(29, y + 8.6, 11, 1.6, 'm')
      + R(70, y + 4, 4.5, 4.5, 'bx', 0.8) + R(78, y + 2.6, 11, 2.8, 't') + R(78, y + 7, 11, 1.3, 'm')),
    // F: one table with a header row.
    cardF: R(1, 2, 94, 40, 'card', 2.5) + R(4, 5.5, 2, 1.4, 'm') + R(9, 5.5, 7, 1.4, 'm') + R(48, 5.5, 7, 1.4, 'm') + R(59, 5.5, 4, 1.4, 'm') + R(66, 5.5, 4, 1.4, 'm')
      + R(73, 5.5, 3.5, 1.4, 'm') + R(80, 5.5, 3, 1.4, 'm') + R(86, 5.5, 6, 1.4, 'm') + R(3, 9, 90, 0.4, 'm', 0)
      + rows([11.5, 21, 30.5], (y, i) => R(4, y + 3, 1.6, 1.8, 'm') + R(8, y + 1, 6.5, 6.5, 'art', 1) + R(16.5, y + 1.5, 22, 1.9, 't') + R(16.5, y + 4.8, 14, 1.2, 'm')
        + G(46, y + 5.1, 3, third(i)) + R(48.5, y + 3, 7, 2, 't') + R(59.5, y + 3, 3, 2, 'r') + R(66, y + 2.2, 3.6, 3.4, 'bx', 0.6) + R(72.5, y + 3, 5, 2, 'm')
        + R(80, y + 3, 4, 2, 'b') + R(86, y + 3, 6, 2, 'm') + (y < 30 ? R(3, y + 9.2, 90, 0.3, 'm', 0) : '')),
    // Statistics A: values on top, the history as a table.
    tables: rows([3, 21, 39, 57, 75], x => R(x, 3, 10, 1.2, 'm') + R(x, 6, 12, 2.6, 't')) + R(1, 13, 94, 29, 'card', 2)
      + R(4, 16.5, 8, 1.3, 'm') + R(30, 16.5, 9, 1.3, 'm') + R(52, 16.5, 9, 1.3, 'm') + R(74, 16.5, 9, 1.3, 'm') + R(1.5, 19.5, 93, 0.4, 'm', 0)
      + rows([22.5, 29, 35.5], y => R(4, y, 10, 1.8, 't') + R(30, y, 12, 1.8, 't') + R(43.5, y, 4, 1.8, 'g') + R(52, y, 9, 1.8, 't') + R(74, y, 10, 1.8, 't') + (y < 35 ? R(1.5, y + 4.4, 93, 0.3, 'm', 0) : '')),
    // Statistics B: values on top, one picked, and its chart.
    chart: R(1.5, 1.5, 17, 10.5, 'pick', 1.5) + rows([3, 21, 39, 57, 75], x => R(x + 0.5, 3, 10, 1.2, 'm') + R(x + 0.5, 5.6, 12, 2.6, 't') + R(x + 0.5, 9.4, 8, 1.2, x === 3 ? 'g' : 'm'))
      + '<path class="aarea" d="M4 40 L4 37 L22 35 L30 35 L34 28 L48 27 L54 21 L62 19 L94 18 L94 40 Z"/><path class="aline" d="M4 37 L22 35 L30 35 L34 28 L48 27 L54 21 L62 19 L94 18"/>'
      + R(4, 41.4, 90, 0.4, 'm', 0),
    // Exodus profile scores as a list.
    exoList: rows([2, 16, 30], (y, i) => R(2, y + 5.5, 2, 2, 'm', 0.3) + R(7, y + 2, 9, 9, 'art', 1.2) + R(19, y + 3, 27, 2.4, 't') + R(19, y + 7.6, 3, 3, 'bx', 0.5)
      + R(24, y + 8.4, 14, 1.4, 'm') + G(56.6, y + 9, 6.5, third(i)) + R(62, y + 5.5, 7, 2.2, 't') + R(72, y + 5.5, 4, 2.2, 'r') + R(79, y + 5.5, 4.5, 2.2, 't')
      + R(87, y + 4.3, 5, 2.4, 'a') + R(87.5, y + 8, 4, 1.2, 'm') + (y < 30 ? R(1, y + 13.6, 94, 0.4, 'm', 0) : '')),
    // Exodus profile scores as a grid of cards.
    exoGrid: rows([1, 33, 65], x => R(x, 2, 30, 40, 'card', 2.5) + R(x + 0.3, 2.3, 29.4, 17, 'art', 2.3) + R(x + 2, 4, 3.6, 2.8, 'tag', 0.6) + R(x + 21, 4, 4.5, 3.6, 'gb', 0.8) + G(x + 23.25, 6.9, 3)
      + R(x + 3, 23, 22, 2.2, 't') + R(x + 3, 27.4, 14, 1.4, 'm')
      + R(x + 3, 33.5, 6, 1.1, 'm') + R(x + 3, 36.5, 6.5, 2.2, 't') + R(x + 12, 33.5, 5, 1.1, 'm') + R(x + 12, 36.5, 4, 2.2, 'r') + R(x + 21, 33.5, 6, 1.1, 'm') + R(x + 21, 36.5, 5, 2.2, 'a')),
    // Exodus style Lines: no panels, sections split by rules, grid cells share their lines.
    lines: R(2, 3, 20, 2.6, 't') + '<path class="aarea" d="M2 19 L2 16 L22 15 L30 10 L52 9 L94 8.5 L94 19 Z"/><path class="aline" d="M2 16 L22 15 L30 10 L52 9 L94 8.5"/>'
      + R(1, 21.5, 94, 0.5, 'm', 0) + R(2, 24.5, 12, 1.8, 't') + '<path class="grid" d="M2 28.5h55M2 35h55M2 41.5h55M2 28.5v13M10 28.5v13M18 28.5v13M26 28.5v13M34 28.5v13M42 28.5v13M50 28.5v13M57 28.5v13"/>'
      + R(26.3, 28.8, 7.4, 6, 'hot', 0) + R(34.3, 28.8, 7.4, 6, 'hot2', 0) + R(61, 22, 0.5, 21, 'm', 0) + R(65, 25, 16, 2.2, 't') + R(65, 30.5, 8, 1.2, 'm') + R(65, 33, 10, 2, 't') + R(79, 30.5, 8, 1.2, 'm') + R(79, 33, 10, 2, 't'),
    // Exodus style Floating: raised panels with space between them, separate rounded cells.
    float: R(1, 1, 94, 19, 'panel', 3) + R(4, 4, 18, 2.4, 't') + '<path class="aarea" d="M4 18 L4 16 L22 15 L30 11 L52 10 L92 9.5 L92 18 Z"/><path class="aline" d="M4 16 L22 15 L30 11 L52 10 L92 9.5"/>'
      + R(1, 23, 61, 20, 'panel', 3) + R(4, 25.5, 11, 1.8, 't') + rows([4, 12, 20, 28, 36, 44, 52], x => R(x, 29.5, 6.5, 5.5, x === 28 ? 'hot' : x === 36 ? 'hot2' : 'cell', 1) + R(x, 36.5, 6.5, 5.5, 'cell', 1))
      + R(65, 23, 30, 20, 'panel', 3) + R(68, 26, 16, 2.2, 't') + R(68, 31.5, 8, 1.2, 'm') + R(68, 34, 10, 2, 't') + R(81, 31.5, 8, 1.2, 'm') + R(81, 34, 10, 2, 't'),
  };
  const drawing = k => ART[k] ? `<svg class="art-svg" viewBox="0 0 96 44" aria-hidden="true">${ART[k]}</svg>` : '';

  // ─── Rendering ───
  const fits = s => s.looks.includes(look);
  // Controls that take the full width under their title instead of sitting on the right.
  const BLOCK = ['tiles', 'themes', 'dates', 'checks', 'source'];
  const THEMES = { reimagined: ['#0f0a18', '#c084fc', '#2a1f42'], dark: ['#0b0c0f', '#60a5fa', '#23272f'], white: ['#f4f5f8', '#7c3aed', '#dfe3ea'] };

  function exampleDate(format) {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    const parts = { yyyy: d.getFullYear(), mm: p(d.getMonth() + 1), dd: p(d.getDate()) };
    return format.split('-').map(k => parts[k]).join('-');
  }

  function control(s) {
    const v = V[s.key];
    const pressed = (k, inner, cls = '') => `<button type="button" class="${cls}" aria-pressed="${v === k}" data-set="${s.key}" data-val="${k}">${inner}</button>`;
    const label = esc(s.title);
    if (s.type === 'switch') return `<button class="sw" type="button" role="switch" aria-checked="${v === true}" aria-label="${label}" data-set="${s.key}"></button>`;
    if (s.type === 'pills') return `<div class="seg" role="group" aria-label="${label}">${s.options.map(([k, l]) => pressed(k, esc(l))).join('')}</div>`;
    if (s.type === 'dates') return `<div class="seg dates" role="group" aria-label="${label}">${s.options.map(([k, l]) => pressed(k, `${exampleDate(k)}<small>${esc(l)}</small>`)).join('')}</div>`;
    if (s.type === 'tiles') return `<div class="tiles n${s.options.length}" role="group" aria-label="${label}">${s.options.map(([k, l, name, art]) =>
      pressed(k, `${drawing(art)}<span><b>${esc(l)}</b>${name ? ` ${esc(name)}` : ''}</span>`, 'tile')).join('')}</div>`;
    if (s.type === 'themes') return `<div class="tiles n3" role="group" aria-label="${label}">${s.options.map(([k, l]) => {
      const [bg, accent, line] = THEMES[k];
      return pressed(k, `<i class="pv" style="--pv-bg:${bg};--pv-a:${accent};--pv-l:${line}"><i></i><i></i><i></i></i><span><b>${esc(l)}</b></span>`, 'tile theme');
    }).join('')}</div>`;
    if (s.type === 'source') return `<div class="tiles n3" role="group" aria-label="${label}">${s.options.map(([k, l, icon]) => pressed(k, `${svg(icon)}<span><b>${esc(l)}</b></span>`, 'tile src')).join('')}</div>`;
    if (s.type === 'checks') return `<div class="cks two" role="group" aria-label="${label}">${s.options.map(([k, l]) => checkbox(s.key, k, l, v.includes(k))).join('')}</div>`;
    return '';
  }

  const checkbox = (key, val, title, on) => `<button type="button" class="ck" role="checkbox" aria-checked="${on}" data-set="${key}"${val ? ` data-val="${val}"` : ''}><i></i>${esc(title)}</button>`;

  const syncNote = s => `<b>${esc(s.options.find(o => o[0] === V[s.key])?.[1] || '')}:</b> ${esc(s.notes[V[s.key]])} <a href="${POLICY}" target="_blank" rel="noreferrer">Privacy policy</a>`;

  // A module's own options: pickers first, then everything it can show as one row of checkboxes.
  function options(kids) {
    const shows = kids.filter(k => k.type === 'switch');
    const rest = kids.filter(k => k.type !== 'switch');
    return rest.map(k => BLOCK.includes(k.type)
      ? `<div class="opt" data-key="${k.key}"><span class="opt-l">${esc(k.title)}</span>${control(k)}</div>`
      : `<div class="opt inline" data-key="${k.key}"><span class="opt-l">${esc(k.title)}</span>${control(k)}</div>`).join('')
      + (shows.length ? `<div class="opt"><span class="opt-l">Show</span><div class="cks ${shows.length > 2 ? 'two' : ''}">${shows.map(k => checkbox(k.key, '', k.title, V[k.key] === true)).join('')}</div></div>` : '');
  }

  function storageCard(i) {
    return `<div class="item" style="--i:${i}" data-key="storage"><div class="store">
        <div class="kv"><span class="k">Profile history</span><span class="v" id="storeSize">…</span></div>
        <div class="bar"><i id="storeBar"></i></div>
        <p class="sub-l" id="storeCount">Counting profiles…</p>
        <div class="kv pages" id="pagesRow" hidden><span class="k">Saved Exodus pages<small>Lets pages open instantly. Safe to clear, they are saved again.</small></span><span class="v" id="pagesSize"></span><button type="button" class="lnk" data-act="clear-pages">Clear</button></div>
        <div class="acts"><button class="btn" type="button" data-act="clear">Clear history</button><button class="btn danger" type="button" data-act="reset">Reset settings</button></div>
      </div></div>`;
  }

  function visitsCard(i) {
    const list = logs.slice(-5).reverse();
    const rows = list.map(e => {
      const name = e.username || (typeof e.visited === 'string' ? e.visited.replace(/\s*\(#\d+\)/, '') : '') || `Player #${e.playerId || '?'}`;
      let ms = Number(e.latencyMs);
      if (!Number.isFinite(ms) && typeof e.timeToReach === 'string') ms = parseFloat(e.timeToReach) * 1000;
      const status = String(e.statusText || e.status || '');
      const failed = !Number.isFinite(ms) || e.status === 'error' || /Offline|Timeout|Failed/.test(status);
      const cls = failed ? 'bad' : (/Not in DB/.test(status) || e.status === 'warning' || ms > 600) ? 'med' : '';
      const time = e.timestamp ? new Date(e.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
      return `<div class="v-row"><b>${esc(name)}</b><time>${esc(time)}</time><span class="lat ${cls}" title="${esc(status)}">${failed ? 'Failed' : `${(ms / 1000).toFixed(2)} s`}</span></div>`;
    }).join('');
    return `<div class="item" style="--i:${i}" data-key="visits"><div class="visits">${rows || '<p class="sub-l">Open a profile on rhythia.com to see how fast its history loads.</p>'}</div></div>`;
  }

  function item(s, i) {
    if (s.type === 'storage') return storageCard(i);
    if (s.type === 'visits') return visitsCard(i);
    const kids = (s.children || []).filter(fits);
    const block = BLOCK.includes(s.type);
    let desc = s.desc || '';
    if (s.key === 'exodus.pages') desc = `${V[s.key].length} of ${s.options.length} on. ${desc}`;
    const head = `<div class="mod"><span class="tx"><b>${esc(s.title)}</b>${desc ? `<small>${esc(desc)}</small>` : ''}</span>${block ? '' : control(s)}</div>`;
    const note = s.notes ? `<p class="note" data-note="${s.key}">${syncNote(s)}</p>` : '';
    const off = s.type === 'switch' && !V[s.key];
    return `<div class="item ${off ? 'off' : ''}" style="--i:${i}" data-key="${s.key}">
      ${head}
      ${block ? `<div class="block">${control(s)}${note}</div>` : ''}
      ${kids.length ? `<div class="subs ${V[s.key] ? 'open' : ''}"><div><div class="opts">${options(kids)}</div></div></div>` : ''}
    </div>`;
  }

  function render(animate = true) {
    const items = X.SETTINGS.filter(s => s.tab === tab && fits(s));
    const groups = [...new Set(items.map(s => s.group))];
    let i = 0;
    const scroll = body.scrollTop;
    body.innerHTML = groups.map(g => `<section class="group"><h3>${esc(g)}${g === 'Recent profile visits' ? '<small>how fast history loaded</small>' : ''}</h3><div class="items">${items.filter(s => s.group === g).map(s => item(s, animate ? i++ : 0)).join('')}</div></section>`).join('');
    if (!animate) { body.querySelectorAll('.item').forEach(r => { r.style.animation = 'none'; }); body.scrollTop = scroll; }
    if (tab === 'data') loadStorageStats();
    paintChrome();
  }

  function paintChrome() {
    root.dataset.theme = V.theme || 'reimagined';
    root.dataset.size = V.popupSize || 'default';
    root.dataset.look = look;
    document.querySelectorAll('#look [data-look]').forEach(b => b.setAttribute('aria-checked', String(b.dataset.look === look)));
    document.getElementById('lookBadge').hidden = look !== 'exodus';
    document.getElementById('consentAlert').hidden = hasCommunityConsent();
    document.querySelectorAll('#tabs [data-tab]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    ink();
  }

  function ink() {
    const b = document.querySelector(`#tabs [data-tab="${tab}"]`), el = document.getElementById('ink');
    if (!b || !b.offsetWidth) return;
    const inset = look === 'exodus' ? 22 : 0;
    el.style.left = `${b.offsetLeft + inset}px`;
    el.style.width = `${b.offsetWidth - inset * 2}px`;
  }

  function swap(fn) {
    body.classList.add('leaving');
    setTimeout(() => { body.classList.remove('leaving'); fn(); render(); body.scrollTop = 0; }, 150);
  }

  let toastT = 0;
  function toast(m) {
    const t = document.getElementById('toast');
    t.textContent = m; t.classList.add('on');
    clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), 2400);
  }

  // ─── Actions ───
  async function setLook(next) {
    if (next === look) return;
    if (!await set('look', next)) return;
    toast(next === 'exodus' ? 'Exodus is on in your Rhythia tabs.' : 'Classic is back on Rhythia.');
    swap(() => {});
  }

  function setTab(next) {
    if (next === tab) return;
    tab = next;
    paintChrome();
    swap(() => {});
  }

  async function onControl(t) {
    const key = t.dataset.set, s = X.find(key);
    if (!s) return;
    if (s.type === 'switch') {
      if (key === 'data.telemetryEnabled' && !hasCommunityConsent()) { toast('Choose where history comes from first.'); return; }
      const next = !V[key];
      t.setAttribute('aria-checked', String(next));
      const card = t.closest('.item');
      if (card && !t.closest('.opts')) { card.querySelector(':scope > .subs')?.classList.toggle('open', next); card.classList.toggle('off', !next); }
      if (!await set(key, next)) return;
    } else if (['pills', 'tiles', 'themes', 'dates', 'source'].includes(s.type)) {
      const group = t.parentElement.querySelectorAll('button');
      group.forEach(b => b.setAttribute('aria-pressed', String(b === t)));
      if (key.startsWith('data.')) group.forEach(b => { b.disabled = true; });
      const ok = await set(key, t.dataset.val);
      group.forEach(b => { b.disabled = false; });
      if (!ok) return;
      const note = body.querySelector(`[data-note="${key}"]`);
      if (note) note.innerHTML = syncNote(s);
      if (key === 'data.syncMode') render(false);
    } else if (s.type === 'checks') {
      const on = V[key].includes(t.dataset.val);
      if (on && V[key].length === 1) { toast('Keep at least one page, or switch to Classic.'); return; }
      t.setAttribute('aria-checked', String(!on));
      if (!await set(key, on ? V[key].filter(x => x !== t.dataset.val) : [...V[key], t.dataset.val])) return;
      render(false);
    }
    paintChrome();
  }

  document.addEventListener('click', e => {
    const t = e.target.closest('button');
    if (!t || root.inert) return;
    if (t.dataset.look) return setLook(t.dataset.look);
    if (t.dataset.tab) return setTab(t.dataset.tab);
    if (t.dataset.go) return setTab(t.dataset.go);
    if (t.dataset.act === 'clear') return clearCache();
    if (t.dataset.act === 'clear-pages') return clearPages();
    if (t.dataset.act === 'reset') return resetDefaults();
    if (t.dataset.set) return onControl(t);
  });
  document.addEventListener('change', e => {
    const key = e.target.dataset?.set;
    if (key && e.target.tagName === 'SELECT') set(key, e.target.value);
  });

  // ─── Storage ───
  const isPageCache = k => EXODUS_CACHES.includes(k) || EXODUS_CACHE_PREFIXES.some(p => k.startsWith(p));
  const sizeOf = list => list.reduce((n, [, v]) => n + new TextEncoder().encode(JSON.stringify(v)).length, 0);
  const mb = bytes => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1048576).toFixed(1)} MB`;

  async function loadStorageStats() {
    try {
      const all = Object.entries(await chrome.storage.local.get(null));
      const entries = all.filter(([k]) => k.startsWith('rhythiaxData:entry:'));
      const pages = all.filter(([k]) => isPageCache(k));
      const bytes = sizeOf(entries), pageBytes = sizeOf(pages);
      const max = (store.rhythiaxDataSettings?.maxStorageMb || 25) * 1024 * 1024;
      const el = id => document.getElementById(id);
      if (!el('storeSize')) return;
      el('storeSize').textContent = `${mb(bytes)} of ${Math.round(max / 1048576)} MB`;
      el('storeBar').style.width = `${Math.min(100, Math.max(1, Math.round(bytes / max * 100)))}%`;
      el('storeCount').textContent = `${entries.length} ${entries.length === 1 ? 'profile' : 'profiles'}, kept up to ${store.rhythiaxDataSettings?.retentionDays || 90} days`;
      // Saved Exodus pages are not history: Exodus saves them again on the next visit.
      el('pagesRow').hidden = look !== 'exodus' && !pages.length;
      el('pagesSize').textContent = pages.length ? mb(pageBytes) : 'None';
      el('pagesRow').querySelector('[data-act]').hidden = !pages.length;
    } catch (err) {
      console.warn('RhythiaX: Failed to calculate storage stats:', err);
    }
  }

  async function clearPages() {
    try {
      const keys = Object.keys(await chrome.storage.local.get(null)).filter(isPageCache);
      if (keys.length) await chrome.storage.local.remove(keys);
      await loadStorageStats();
      toast('Saved Exodus pages cleared. History is kept.');
    } catch (err) {
      toast(`Could not clear saved pages: ${err.message}`);
    }
  }

  // Exodus keeps saved copies of pages, some with community history in them (exodus/core/data.js).
  async function clearCache() {
    const confirmed = confirm('Clear history on this device? This cannot be undone.\n\nThis removes:\n- Local history of all profiles\n- Cached community profile history\n\nSettings, visit-report cooldowns, official game scores and history on the community server are kept. Cached data may be downloaded again.');
    if (!confirmed) return;
    try {
      await chrome.storage.local.set({ rhythiax_history_clear_generation: Date.now() });
      const all = await chrome.storage.local.get(null);
      const keysToRemove = Object.keys(all).filter(k => k.startsWith('rhythiaxData:entry:') || k.startsWith('rhythiaxVpsHistoryCache:') || k.startsWith('rhythiax_ps_hist_') || isPageCache(k));
      if (keysToRemove.length) await chrome.storage.local.remove(keysToRemove);
      await loadStorageStats();
      toast(`History cleared: ${keysToRemove.length} ${keysToRemove.length === 1 ? 'entry' : 'entries'} removed.`);
    } catch (err) {
      toast(`Could not clear history: ${err.message}`);
    }
  }

  async function resetDefaults() {
    const confirmed = confirm('Reset all settings?\n\nYour community history choice and visit reporting choice are kept. No history is deleted now, but the restored 90-day retention and 25 MB limit may remove older history later.');
    if (!confirmed) return;
    const { syncMode, telemetryEnabled, communityConsentVersion, ...resetData } = DEFAULT_DATA_SETTINGS;
    try {
      await persistDataPatch(resetData);
      const modules = {}, options = {};
      X.walk(X.SETTINGS, s => {
        const [head, a, b] = s.key.split('.');
        if (head === 'modules') modules[a] = s.default;
        if (head === 'options' && b !== 'modDisplay') (options[a] = options[a] || {})[b] = s.default;
      });
      modules.rankingHistory = modules.statHistory;
      Object.assign(options.scoreCards, { showModIcons: true, showModText: false, dateFormat: options.appearance.dateFormat });
      await chrome.storage.local.set({
        rhythiaxModules: modules, rhythiaxModuleOptions: options, rhythiaxTheme: 'reimagined', rhythiaxPopupSize: 'default',
        rhythiaxExodus: false, rhythiaxExodusStyle: 'lines', [X.EXODUS_KEY]: { ...X.EXODUS_DEFAULTS, pages: [...X.EXODUS_DEFAULTS.pages] },
      });
      Object.assign(store, await chrome.storage.local.get(STORE_KEYS));
      readAll();
      notifyActiveTabs({ type: 'rhythiax-module-settings', settings: modules });
      notifyActiveTabs({ type: 'rhythiax-module-options', options });
      notifyActiveTabs({ type: 'rhythiax-theme-changed', theme: 'reimagined' });
      render(false);
      toast('Settings reset. Your community choices were kept.');
    } catch (_) {
      toast('Settings could not be reset. Reopen the popup to retry.');
      await loadState();
    }
  }

  // Changes made elsewhere (another popup, a page) show here without a reopen.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || root.inert) return;
    if (!STORE_KEYS.some(k => k in changes)) return;
    for (const [k, c] of Object.entries(changes)) if (STORE_KEYS.includes(k)) store[k] = c.newValue;
    if ('rhythiax_connection_logs' in changes) logs = store.rhythiax_connection_logs || [];
    const before = JSON.stringify([V, look]);
    readAll();
    if (JSON.stringify([V, look]) !== before) render(false);
  });

  // Version from the manifest, release title (e.g. "Exodus") from the packaged changelog.
  const manifest = chrome.runtime.getManifest?.() || {};
  const verEl = document.getElementById('ver');
  verEl.textContent = manifest.version || '';
  fetch('../changelog.md').then(r => r.text()).then(text => {
    const lines = block => block.split(/\r?\n/).map(l => l.trim());
    const entry = text.split(/^---\s*$/m).map(lines).find(b => b.includes(`version: ${manifest.version}`));
    const title = entry?.find(l => l.startsWith('title: '))?.slice(7).trim();
    if (title) verEl.textContent = `${manifest.version} · ${title}`;
  }).catch(() => {});
  addEventListener('resize', ink);
  document.fonts?.ready?.then(ink);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadState);
  else loadState();
}());
