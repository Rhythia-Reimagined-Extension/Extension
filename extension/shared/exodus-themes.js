// =============================================
// Reimagined for Rhythia — own Exodus themes
// =============================================
// Loaded by Exodus (which paints a theme and edits it) and by the popup (which lists and previews themes).
// The colour maths, the check a saved background must pass and the background placing come from shared/colour.js,
// which loads first; the CSS an own theme adds to Exodus' page is exodus/core/own-theme.js.
//
// A theme is a few choices (the seed: background, accent, contrast) plus anything set by hand (manual).
// Every other value is worked out from those when the theme is used ("Auto"), with a minimum contrast for
// text and controls. With "Keep everything readable" on (fit), colours set by hand are moved just far enough
// to stay readable too; with it off they are used exactly as picked.
//
// Saved as chrome.storage.local:
//   rhythiaxExodusThemes        [theme, …] without images
//   rhythiaxExodusCustomTheme   id of the theme in use, '' for a built-in one (rhythiaxTheme)
//   rhythiaxExodusThemeImg:<id> the theme's own background: a picture, GIF or video as a data: URL

var RhythiaX = RhythiaX || {};

RhythiaX.ExodusThemes = (function () {
  'use strict';

  const { hex, lum, mix, minRatio, avg, reach, soften, inkFor, gradient, DIRS, imageOk, isVideo, placeLayer } = RhythiaX.Colour;

  const LIST_KEY = 'rhythiaxExodusThemes';
  const ACTIVE_KEY = 'rhythiaxExodusCustomTheme';
  const IMAGE_PREFIX = 'rhythiaxExodusThemeImg:';
  const MAX_THEMES = 24;

  // Built-in themes: the values Exodus' own CSS uses (exodus/core/assets.js).
  const BASE = {
    dark:       { page: '#090a0c', panel: '#111318', field: '#0d0f12', text: '#f4f5f7', text2: '#c5cad3', muted: '#8a929f', accent: '#60a5fa', glass: '#0c0d10', lineCol: '#ffffff', btnBg: '#171a20' },
    reimagined: { page: '#0c0913', panel: '#151021', field: '#100c1a', text: '#f6f2fd', text2: '#d0c7e2', muted: '#968aad', accent: '#c084fc', glass: '#100b1b', lineCol: '#ece2ff', btnBg: '#1c162b' },
    white:      { page: '#f4f5f8', panel: '#ffffff', field: '#ffffff', text: '#0f172a', text2: '#334155', muted: '#64748b', accent: '#2563eb', glass: '#ffffff', lineCol: '#0f172a', btnBg: '#ffffff' },
  };
  // What Exodus' CSS uses today for the parts that have no token of their own.
  const EFFECT = { bgImg: null, bgBlur: 0, bgDim: 35, bgFade: 'none', bgFadeLen: 50, bgSound: 'off', bgVolume: 30, headA: 82, headBlur: 14,
    bgFit: 'cover', bgZoom: 100, bgX: 50, bgY: 50, bgRot: 0, bgFlip: 'off', panelClear: 0, panelBlur: 0,
    bannerMode: 'all', bannerGap: 'close', bannerBlur: 0, bannerO: 100, glassA: 72, glassBlur: 16, lineS: 10, btnSize: 'm' };

  const PRESETS = [
    { n: 'Dark', page: '#090a0c', accent: '#60a5fa' }, { n: 'Reimagined', page: '#0c0913', accent: '#c084fc' },
    { n: 'Midnight', page: '#0a1020', accent: '#38bdf8' }, { n: 'Forest', page: '#0b120e', accent: '#4ade80' },
    { n: 'Wine', page: '#140a10', accent: '#f472b6' }, { n: 'Ember', page: '#120c08', accent: '#f59e0b' },
    { n: 'White', page: '#f4f5f8', accent: '#2563eb' }, { n: 'Paper', page: '#f5f0e6', accent: '#c2410c' },
    { n: 'Dusk', page: '#0c0913', page2: '#2a1340', dir: 'diag', accent: '#c084fc', accent2: '#f472b6' },
    { n: 'Ocean', page: '#05101c', page2: '#0c3346', dir: 'down', accent: '#22d3ee', accent2: '#60a5fa' },
    { n: 'Aurora', page: '#050b10', page2: '#0f3b33', dir: 'glow', accent: '#4ade80', accent2: '#22d3ee' },
    { n: 'Sunrise', page: '#fff7ed', page2: '#fde4ec', dir: 'diag', accent: '#ea580c', accent2: '#db2777' },
  ];
  const QUICK = ['#60a5fa', '#c084fc', '#f472b6', '#f59e0b', '#4ade80', '#22d3ee', '#f87171'];
  // Background images that come with the extension (drawn in CSS).
  const SAMPLES = {
    aurora: 'radial-gradient(ellipse at 20% 20%,#14b8a6 0,transparent 45%),radial-gradient(ellipse at 80% 30%,#7c3aed 0,transparent 50%),radial-gradient(ellipse at 50% 90%,#0ea5e9 0,transparent 50%),#05070d',
    sunset: 'radial-gradient(circle at 75% 25%,#fb923c 0,transparent 35%),linear-gradient(170deg,#7c2d12,#9d174d 45%,#1e1b4b 85%)',
    grid: 'repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0 1px,transparent 1px 40px),repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 1px,transparent 1px 40px),radial-gradient(circle at 50% 0,#1d4ed8 0,transparent 60%),#04060c',
  };
  // How far text and lines stand out at each contrast level: minimum ratios (WCAG asks 4.5 for text, 3 for controls).
  const LEVEL = {
    soft:   { text: 10, text2: 6,   muted: 4.5, lineS: 7,  panel: .035, btnLine: 16 },
    normal: { text: 13, text2: 7,   muted: 4.6, lineS: 10, panel: .05,  btnLine: 20 },
    high:   { text: 16, text2: 9.5, muted: 6,   lineS: 16, panel: .075, btnLine: 32 },
  };

  // ─── Reading what is saved ───
  // Every value ends up in CSS, so only known keys and well-formed values are kept.
  const COLOURS = ['panel', 'field', 'text', 'text2', 'muted', 'accent', 'glass', 'lineCol', 'head', 'btnBg', 'btnLine', 'btnText'];
  const NUMBERS = { bgBlur: [0, 30], bgDim: [0, 90], bgFadeLen: [10, 90], bgVolume: [0, 100], bgZoom: [25, 400], bgX: [0, 100], bgY: [0, 100], bgRot: [-180, 180],
    // See-through panels: at most 40% through and 40px of blur (the Auto amount keeps text readable over the picture).
    panelClear: [0, 40], panelBlur: [0, 40], headA: [0, 100], headBlur: [0, 30], bannerBlur: [0, 30], bannerO: [0, 100],
    glassA: [0, 100], glassBlur: [0, 30], lineS: [0, 40], btnA: [0, 100], btnLineA: [0, 100], btnR: [0, 22] };
  const CHOICES = { bgFade: ['none', 'bottom', 'top', 'left', 'right', 'edges'], bgSound: ['off', 'on'], bgFit: ['cover', 'contain', 'stretch', 'tile'], bgFlip: ['off', 'on'], bannerMode: ['all', 'mine', 'none'], bannerGap: ['close', 'keep'], btnSize: ['s', 'm', 'l'] };
  // The screen is read as 4 × 3 areas when a picture is behind the page.
  const ZONES = 12, ZONE_COLS = 4, ZONE_ROWS = 3;
  // Where an uploaded picture or video sits on the screen (the built-in pictures always fill it).
  const FRAME = ['bgFit', 'bgZoom', 'bgX', 'bgY', 'bgRot', 'bgFlip'];

  function seedFrom(p, contrast = 'normal') {
    return { page: p.page, page2: p.page2 || null, page3: null, dir: p.dir || 'down', accent: p.accent, accent2: p.accent2 || null, contrast };
  }
  function create(name = 'My theme') {
    return { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, style: 'lines', fit: true, seed: seedFrom(PRESETS[0]), manual: {}, image: false };
  }
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || !/^[a-z0-9]{4,24}$/i.test(raw.id || '')) return null;
    const s = raw.seed || {};
    const seed = {
      page: hex(s.page) || PRESETS[0].page, page2: hex(s.page2) || null, page3: null,
      dir: DIRS.some(d => d[0] === s.dir) ? s.dir : 'down', accent: hex(s.accent) || PRESETS[0].accent, accent2: hex(s.accent2) || null,
      contrast: LEVEL[s.contrast] ? s.contrast : 'normal',
    };
    if (seed.page2) seed.page3 = hex(s.page3) || null;
    const manual = {};
    const m = raw.manual && typeof raw.manual === 'object' ? raw.manual : {};
    for (const k of COLOURS) if (hex(m[k])) manual[k] = hex(m[k]);
    for (const [k, [lo, hi]] of Object.entries(NUMBERS)) if (Number.isFinite(+m[k]) && m[k] !== null && m[k] !== '') manual[k] = Math.min(hi, Math.max(lo, Math.round(+m[k])));
    for (const [k, list] of Object.entries(CHOICES)) if (list.includes(m[k])) manual[k] = m[k];
    if (m.bgImg && typeof m.bgImg === 'object') {
      if (SAMPLES[m.bgImg.sample]) manual.bgImg = { sample: m.bgImg.sample };
      else if (m.bgImg.local === true && raw.image === true) manual.bgImg = { local: true, name: String(m.bgImg.name || '').slice(0, 80), video: m.bgImg.video === true };
    }
    // What an uploaded picture looks like where it lies on the screen: 12 areas, each its average colour and how
    // much of it the picture covers, then its dark and its light details (#rrggbbaa#rrggbb#rrggbb). Worked out by
    // the editor (zonesFrom), read by derive(). Areas saved before details were read are #rrggbbaa alone.
    if (manual.bgImg?.local && Array.isArray(m.bgZones) && m.bgZones.length === ZONES && m.bgZones.every(z => /^#[0-9a-f]{8}(#[0-9a-f]{6}#[0-9a-f]{6})?$/.test(z))) manual.bgZones = m.bgZones.slice();
    return { id: raw.id, name: String(raw.name || 'My theme').replace(/\s+/g, ' ').trim().slice(0, 40) || 'My theme',
      style: raw.style === 'float' ? 'float' : 'lines', fit: raw.fit !== false, seed, manual, image: raw.image === true && manual.bgImg?.local === true };
  }
  const list = store => (Array.isArray(store?.[LIST_KEY]) ? store[LIST_KEY].map(normalize).filter(Boolean).slice(0, MAX_THEMES) : []);
  const active = store => { const id = store?.[ACTIVE_KEY]; return id ? list(store).find(t => t.id === id) || null : null; };
  const imageKey = id => IMAGE_PREFIX + id;

  // ─── Reading a picture ───
  // pixels: RGBA of the screen as the picture covers it (transparent where it does not), w × h. Returns the
  // 12 areas (#rrggbbaa#rrggbb#rrggbb: average colour and share covered, then the dark and the light details,
  // the 10th and 90th of its pixels by brightness, so thin strokes on a plain picture count too), the picture's
  // average colour and its most vivid one.
  function zonesFrom(pixels, w, h) {
    const sum = Array.from({ length: ZONES }, () => [0, 0, 0, 0, 0]), all = [0, 0, 0, 0], hues = Array.from({ length: 12 }, () => [0, 0, 0, 0]);
    const seen = Array.from({ length: ZONES }, () => []);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4, a = pixels[i + 3] / 255, r = pixels[i], g = pixels[i + 1], b = pixels[i + 2];
      const at = Math.min(ZONE_ROWS - 1, Math.floor(y * ZONE_ROWS / h)) * ZONE_COLS + Math.min(ZONE_COLS - 1, Math.floor(x * ZONE_COLS / w)), z = sum[at];
      z[0] += r * a; z[1] += g * a; z[2] += b * a; z[3] += a; z[4]++;
      if (a > .5) seen[at].push([.2126 * r + .7152 * g + .0722 * b, r, g, b]);
      all[0] += r * a; all[1] += g * a; all[2] += b * a; all[3] += a;
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0, val = mx / 255;
      if (a > .5 && sat > .35 && val > .35) {
        const hue = mx === mn ? 0 : mx === r ? ((g - b) / (mx - mn) + 6) % 6 : mx === g ? (b - r) / (mx - mn) + 2 : (r - g) / (mx - mn) + 4;
        const k = hues[Math.floor(hue * 2) % 12], wgt = sat * val;
        k[0] += r * wgt; k[1] += g * wgt; k[2] += b * wgt; k[3] += wgt;
      }
    }
    const hx = (r, g, b) => '#' + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
    const zones = sum.map((z, k) => {
      const mean = z[3] ? hx(z[0] / z[3], z[1] / z[3], z[2] / z[3]) : '#000000', px = seen[k].sort((p, q) => p[0] - q[0]);
      const at = f => (px.length ? hx(...px[Math.min(px.length - 1, Math.floor(px.length * f))].slice(1)) : mean);
      return mean + Math.round(255 * z[3] / Math.max(1, z[4])).toString(16).padStart(2, '0') + at(.1) + at(.9);
    });
    const top = hues.reduce((m, k) => (k[3] > m[3] ? k : m));
    return { zones, avg: all[3] ? hx(all[0] / all[3], all[1] / all[3], all[2] / all[3]) : '', vivid: top[3] > w * h * .01 ? hx(top[0] / top[3], top[1] / top[3], top[2] / top[3]) : '' };
  }
  // A background and an accent taken from a picture: its average colour made into a page (light pictures give a
  // light theme, dark ones a dark theme), and its most vivid colour as the accent.
  function fromPicture(avgColour, vivid) {
    const light = lum(avgColour) > .3;
    return { page: mix(avgColour, light ? '#ffffff' : '#000000', light ? .55 : .7), accent: vivid || null };
  }

  // ─── Working a theme out ───
  // Every value of an own theme, in the order they depend on each other. A value set by hand wins over the
  // worked-out one; with fit on, a hand-set colour that must be read is moved just far enough to reach its
  // minimum, and what was picked is kept in d.picked so the editor can say so.
  function derive(T) {
    const s = T.seed, L = LEVEL[s.contrast], page = s.page, stops = [s.page, s.page2, s.page3].filter(Boolean), mid = avg(stops);
    const ink = inkFor(stops), light = ink === '#000000', fit = T.fit !== false, man = T.manual;
    const d = { base: light ? 'white' : 'dark', page, mixed: stops.some(c => (lum(c) > .3) !== light), picked: {} };
    const pick = (k, auto, bgs, min) => {
      if (!(k in man)) return auto;
      const raw = man[k];
      if (!fit || !bgs) return raw;
      const out = reach(raw, bgs, min, inkFor(bgs));
      if (out !== raw) d.picked[k] = raw;
      return out;
    };
    // A picture behind the page (bgZones): it is darkened (or, on a light theme, lightened) toward the page
    // just enough for text to read on every area of it, 7:1, and text is kept readable on it too.
    // Text reads 7:1 on each area's average and 4.5:1 on its dark and light details (strokes, highlights).
    // A blurred picture shows its details smoothed into its areas' colours, fully from a blur of 12px.
    const smooth = Math.min(1, ('bgBlur' in man ? man.bgBlur : EFFECT.bgBlur) / 12);
    const zones = (man.bgZones || []).map(z => ({ c: z.slice(0, 7), a: parseInt(z.slice(7, 9), 16) / 255, dark: z.slice(9, 16) || z.slice(0, 7), light: z.slice(16, 23) || z.slice(0, 7) }))
      .map(z => ({ ...z, dark: mix(z.dark, z.c, smooth), light: mix(z.light, z.c, smooth) }));
    const shown = (dim, key = 'c') => zones.map(z => mix(mid, z[key], z.a * (1 - dim / 100)));
    const details = dim => [...shown(dim, 'dark'), ...shown(dim, 'light')];
    const base = reach(mix(mid, ink, .9), stops, L.text, ink);
    const readsAt = dim => { const t = reach(base, [...stops, ...shown(dim)], L.text, ink); return minRatio(t, shown(dim)) >= 7 && minRatio(t, details(dim)) >= 4.5; };
    let dimAuto = EFFECT.bgDim;
    if (zones.length) while (dimAuto < 90 && !readsAt(dimAuto)) dimAuto += 5;
    d.bgDim = 'bgDim' in man ? man.bgDim : dimAuto;
    d.onPicture = shown(d.bgDim);
    d.pictureDetails = zones.length ? details(d.bgDim) : [];
    const reads = [...stops, ...d.onPicture];
    d.text = pick('text', reach(base, reads, L.text, ink), reads, 7);
    d.text2 = pick('text2', soften(d.text, reads, L.text2), reads, 4.5);
    d.muted = pick('muted', soften(d.text, reads, L.muted), reads, 4.5);
    d.panel = pick('panel', light ? mix(mid, '#ffffff', .75) : mix(mid, d.text, L.panel));
    d.field = pick('field', light ? '#ffffff' : mix(mid, '#000000', .3));
    // The accent is a choice, not worked out; with fit on it is lifted to 3:1 on the page, and moved away from
    // the text drawn on it (Add friend) until that text reads.
    const accents = [s.accent, s.accent2].filter(Boolean);
    let acc = fit ? accents.map(a => reach(a, stops, 3, ink)) : accents;
    if (fit) {
      const on = minRatio('#0b0d12', acc) >= minRatio('#ffffff', acc) ? '#0b0d12' : '#ffffff';
      acc = acc.map(a => reach(a, [on], 4.5, on === '#ffffff' ? '#000000' : '#ffffff'));
    }
    d.accent = acc[0]; d.accent2 = acc[1] || null;
    if (d.accent !== s.accent) d.picked.accent = s.accent;
    if (s.accent2 && d.accent2 !== s.accent2) d.picked.accent2 = s.accent2;
    d.glass = pick('glass', page);
    // Over a picture, the plates (rank box) and panels are as see-through as text on them allows: the plates at
    // least 35% solid and blurred more so they read as glass, panels at most 20% through with a little blur.
    const under = (c, a) => d.onPicture.map(z => mix(z, c, a));
    let glassAuto = EFFECT.glassA, clearAuto = 0;
    if (zones.length) {
      for (glassAuto = 35; glassAuto < 90 && minRatio(d.text, under(d.glass, glassAuto / 100)) < 7; glassAuto += 5);
      for (clearAuto = 20; clearAuto > 0 && minRatio(d.text, under(d.panel, 1 - clearAuto / 100)) < 7; clearAuto -= 5);
    }
    // Text with no panel behind it (section headings, the score's numbers, the profile's tabs) lies on the picture
    // itself. Where the picture is too light or too busy for it, bare text gets a halo of the glass colour
    // (exodus/core/own-theme.js; bare: how strong, 0 to .9, worked out as if the picture behind the text were
    // mixed that far toward the glass colour): needed once text reads under 4.5:1 on an area (3:1
    // on its details) or other text under 4.5:1, then as much as text needs for 7:1 (4.5:1 on details) and other
    // text for 4.5:1. 0 on a picture text already reads on. Links (link) are then lifted just far enough to read
    // 4.5:1 on what is behind them; where that would take them more than 40% of the way to white (black on a
    // light theme), and they would no longer look like the accent, the halo is made stronger instead.
    d.link = null; d.bare = 0;
    if (zones.length) {
      const accent2 = mix(d.accent, light ? '#000000' : '#ffffff', .28), back = (cs, s) => cs.map(c => mix(c, d.glass, s));
      const reads = (s, main, det, other) => minRatio(d.text, back(d.onPicture, s)) >= main && minRatio(d.text, back(d.pictureDetails, s)) >= det
        && [d.text2, d.muted].every(c => minRatio(c, back(d.onPicture, s)) >= other);
      const linkAt = s => reach(accent2, back(d.onPicture, s), 4.5, ink);
      let s = 0;
      if (!reads(0, 4.5, 3, 4.5)) for (s = .1; s < .9 && !reads(s, 7, 4.5, 4.5); s += .05);
      while (s < .9 && minRatio(mix(accent2, ink, .4), back(d.onPicture, s)) < 4.5) s = s ? s + .05 : .1;
      d.bare = +Math.min(.9, s).toFixed(2);
      const link = linkAt(d.bare);
      if (link !== accent2) d.link = link;
    }
    d.glassA = pick('glassA', glassAuto);
    d.glassBlur = pick('glassBlur', zones.length ? 24 : EFFECT.glassBlur);
    d.panelClear = pick('panelClear', clearAuto);
    d.panelBlur = pick('panelBlur', d.panelClear ? 12 : 0);
    d.head = pick('head', page);
    d.lineCol = pick('lineCol', d.text);
    d.lineS = pick('lineS', L.lineS);
    d.btnBg = pick('btnBg', light ? '#ffffff' : mix(page, d.text, .08));
    d.btnA = pick('btnA', T.style === 'lines' ? 0 : 100);
    d.btnLine = pick('btnLine', d.text);
    d.btnLineA = pick('btnLineA', T.style === 'lines' ? L.btnLine : (light ? 14 : 0));
    d.btnR = pick('btnR', T.style === 'lines' ? 8 : 11);
    const fill = mix(page, d.btnBg, d.btnA / 100);
    d.btnText = pick('btnText', reach(d.text, [fill], 4.5, inkFor([fill])), [fill], 4.5);
    return d;
  }
  // The picture settings with which text reads on the theme's picture, for the editor's button (filled in once, then
  // the player's own): a blur from how busy the picture is (how far its dark and light details lie apart in any area),
  // then the least darkening (or lightening) with which text reads 7:1 on every area and nothing on the picture needs
  // a halo (derive()'s bare). A dark, calm picture gets little or none. null without a picture read in areas.
  function readablePicture(T) {
    const zs = T.manual?.bgZones || [];
    if (!zs.length) return null;
    const busy = Math.max(...zs.map(z => Math.abs(lum(z.slice(16, 23) || z.slice(0, 7)) - lum(z.slice(9, 16) || z.slice(0, 7)))));
    const bgBlur = busy < .2 ? 0 : Math.min(16, Math.round(4 + busy * 12));
    for (let bgDim = 0; bgDim < 90; bgDim += 5) {
      const D = derive({ ...T, manual: { ...T.manual, bgBlur, bgDim } });
      if (!D.bare && minRatio(D.text, D.onPicture) >= 7) return { bgBlur, bgDim };
    }
    return { bgBlur, bgDim: 90 };
  }
  // The values derive() works out; every other key is a plain setting with a default (EFFECT).
  const DERIVED = ['text', 'text2', 'muted', 'panel', 'field', 'glass', 'head', 'lineCol', 'lineS', 'btnBg', 'btnA', 'btnLine', 'btnLineA', 'btnR', 'btnText', 'bgDim', 'glassA', 'glassBlur', 'panelClear', 'panelBlur'];

  const SEEDED = ['page', 'page2', 'page3', 'accent', 'accent2'];

  // A theme ready to read from. Built-in themes come as { base, style, seed: null, manual: {} }.
  function resolve(T, image) {
    const D = T.seed ? derive(T) : {};
    const base = T.seed ? D.base : (BASE[T.base] ? T.base : 'reimagined');
    const def = k => {
      const b = BASE[base];
      if (k === 'head') return b.page;
      if (k === 'btnText') return b.text;
      if (k === 'btnLine') return b.lineCol;
      if (k === 'btnA') return T.style === 'lines' ? 0 : 100;
      if (k === 'btnLineA') return T.style === 'lines' ? 20 : 0;
      if (k === 'btnR') return T.style === 'lines' ? 8 : 11;
      return k in b ? b[k] : EFFECT[k];
    };
    const val = k => (k === 'style' ? T.style : T.seed && (DERIVED.includes(k) || k === 'accent' || k === 'accent2' || k === 'page') ? D[k] : k in T.manual ? T.manual[k] : def(k));
    const isAuto = k => Boolean(T.seed) && DERIVED.includes(k) && !(k in T.manual);
    // What was picked for a colour that is shown differently to stay readable, or undefined.
    const picked = k => D.picked?.[k];
    const pageStops = () => (T.seed ? [val('page'), T.seed.page2, T.seed.page3].filter(Boolean) : [val('page')]);
    const accentStops = () => [val('accent'), T.seed ? D.accent2 : null].filter(Boolean);
    const pageBg = () => gradient(pageStops(), T.seed?.dir);
    const accentBg = () => gradient(accentStops(), 'across');
    const onAccent = () => (minRatio('#0b0d12', accentStops()) >= minRatio('#ffffff', accentStops()) ? '#0b0d12' : '#ffffff');
    const btnFill = () => mix(val('page'), val('btnBg'), val('btnA') / 100);
    // What is checked for readability: [key, label, colours, backgrounds, minimum].
    const checks = [
      ['text', 'Main text', () => [val('text')], pageStops, 7],
      ['text2', 'Secondary text', () => [val('text2')], pageStops, 4.5],
      ['muted', 'Quiet text', () => [val('muted')], pageStops, 4.5],
      ['accent', 'Accent', accentStops, pageStops, 3],
      ['btnText', 'Button text', () => [val('btnText')], () => [btnFill()], 4.5],
      ['onAccent', 'Text on the accent', () => [onAccent()], accentStops, 4.5],
    ];
    // With a picture read in areas: text on the worst area of it.
    if (D.onPicture?.length) checks.push(['picture', 'Text on the picture', () => [val('text')], () => D.onPicture, 7]);
    const checkRatio = c => Math.min(...c[2]().map(f => minRatio(f, c[3]())));
    const im = val('bgImg');
    // A video is a <video class="ownbg"> Exodus puts in the page; a picture or GIF is drawn in CSS.
    const video = Boolean(im?.local && im.video && isVideo(image));
    // How an uploaded picture or video is placed: fit (fill the screen, show all of it, stretch, or tile),
    // size, the point that stays put when it grows or shrinks (x, y, as in background-position), turn and mirror.
    const place = k => (im?.local ? val(k) : EFFECT[k]);
    const frame = () => {
      const fit = video && place('bgFit') === 'tile' ? 'cover' : place('bgFit');
      return { fit, zoom: place('bgZoom') / 100, x: place('bgX'), y: place('bgY'), rot: place('bgRot'), flip: place('bgFlip') === 'on' };
    };
    const imageCss = () => {
      if (!im || video) return '';
      if (im.sample) return SAMPLES[im.sample] || '';
      if (!imageOk(image) || isVideo(image)) return '';
      const f = frame(), size = { cover: 'cover', contain: 'contain', stretch: '100% 100%', tile: 'auto' }[f.fit];
      return `var(--own-pic) ${f.x}% ${f.y}%/${size} ${f.fit === 'tile' ? 'repeat' : 'no-repeat'}`;
    };
    const layer = b => placeLayer(frame(), b);

    // The colours a page of controls takes from the theme (the popup, the theme editor): solid, without the picture,
    // as CSS custom properties over the dark or the white look (base).
    const ui = () => {
      const white = base === 'white', panel = val('panel'), text = val('text'), line = RhythiaX.Colour.rgbs(val('lineCol')), accent = val('accent');
      return { '--page': val('page'), '--bg': val('page'), '--panel': panel, '--panel-2': mix(panel, text, .04), '--panel-3': mix(panel, text, .08),
        '--field': val('field'), '--dialog': panel, '--line': `rgba(${line},${white ? .1 : .08})`, '--line-2': `rgba(${line},${white ? .18 : .15})`,
        '--text': text, '--text-2': val('text2'), '--muted': val('muted'), '--accent': accent, '--accent-2': mix(accent, white ? '#000000' : '#ffffff', .28),
        '--accent-soft': `rgba(${RhythiaX.Colour.rgbs(accent)},${white ? .09 : .14})`, '--on-accent': onAccent() };
    };
    // Small previews for the popup's theme tiles.
    const preview = () => ({ page: pageBg(), panel: val('panel'), accent: accentBg() });
    // How loud the background video may be: 0 unless the theme turned sound on.
    const sound = () => (video && val('bgSound') === 'on' ? val('bgVolume') / 100 : 0);
    // imageCss, layer and image: what exodus/core/own-theme.js writes this theme's CSS from.
    return { T, D, base, val, isAuto, picked, pageStops, accentStops, pageBg, accentBg, onAccent, btnFill, checks, checkRatio, imageCss, layer, image, preview, ui, video, sound, frame };
  }

  // The colour maths and the picture checks (shared/colour.js) come with it, as the same functions.
  return { ...RhythiaX.Colour, LIST_KEY, ACTIVE_KEY, MAX_THEMES, PRESETS, QUICK, SAMPLES, LEVEL, SEEDED, DERIVED, FRAME, zonesFrom, fromPicture, readablePicture,
    seedFrom, create, normalize, list, active, imageKey, resolve };
})();

if (typeof module !== 'undefined') module.exports = RhythiaX.ExodusThemes;
