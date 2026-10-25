// =============================================
// Reimagined for Rhythia — own Classic themes
// =============================================
// Loaded by Classic (legacy/: paints a theme and edits it) and by the popup (lists and previews themes).
// The colour maths, the check a saved background must pass and the background placing come from
// shared/colour.js, which must load first.
//
// Kept simple on purpose: a background colour or a two-colour gradient, an accent, optionally panels (and how
// see-through they are, at most 40%) and text, a contrast level, the profile banner shown or hidden, and a
// background picture, GIF or video with its position. Everything else is worked out from those, and colours
// are always kept readable.
//
// Saved as chrome.storage.local:
//   rhythiaxClassicThemes        [theme, …] without pictures
//   rhythiaxClassicCustomTheme   id of the theme in use, '' for a built-in one (rhythiaxTheme)
//   rhythiaxClassicThemeImg:<id> the theme's own background: a picture, GIF or video as a data: URL
// A theme also keeps `base` ('dark' or 'white'): which of Classic's built-in stylesheets it builds on. The
// background (engines.js) reads it to load that stylesheet before the page paints.

var RhythiaX = RhythiaX || {};

RhythiaX.ClassicThemes = (function () {
  'use strict';

  const X = RhythiaX.Colour;
  const LIST_KEY = 'rhythiaxClassicThemes';
  const ACTIVE_KEY = 'rhythiaxClassicCustomTheme';
  const IMAGE_PREFIX = 'rhythiaxClassicThemeImg:';
  const MAX_THEMES = 12;

  const PRESETS = [
    { n: 'Dark', page: '#0a0a0a', accent: '#3b82f6' }, { n: 'Purple', page: '#0f0a18', accent: '#c084fc' },
    { n: 'Midnight', page: '#0a1020', accent: '#38bdf8' }, { n: 'Forest', page: '#0b120e', accent: '#4ade80' },
    { n: 'Wine', page: '#140a10', accent: '#f472b6' }, { n: 'Ember', page: '#120c08', accent: '#f59e0b' },
    { n: 'White', page: '#e2e6ed', accent: '#5b21b6' }, { n: 'Paper', page: '#efe9dd', accent: '#c2410c' },
  ];
  const QUICK = ['#3b82f6', '#c084fc', '#f472b6', '#f59e0b', '#4ade80', '#22d3ee', '#f87171'];
  // How far text stands out at each contrast level (minimum ratios; WCAG asks 4.5 for text, 3 for controls),
  // and how far panels lift from the background.
  const LEVEL = {
    soft:   { text: 11, muted: 5,   lift: .025 },
    normal: { text: 14, muted: 7.2, lift: .03 },
    high:   { text: 17, muted: 9,   lift: .045 },
  };
  // Settings with a range, and their defaults.
  // Panels let at most 40% through (panelClear) and blur what is behind them at most 40px, so text on them
  // stays readable without checking every picture.
  const NUMBERS = { bgZoom: [25, 400, 100], bgX: [0, 100, 50], bgY: [0, 100, 50], bgDim: [0, 90, 40], bgBlur: [0, 30, 0], panelClear: [0, 40, 0], panelBlur: [0, 40, 0] };
  const FITS = ['cover', 'contain'];
  const DIRS = X.DIRS;

  function create(name = 'My theme') {
    return normalize({ id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, page: PRESETS[0].page, accent: PRESETS[0].accent });
  }

  // Every value ends up in CSS, so only known keys and well-formed values are kept.
  function normalize(raw) {
    if (!raw || typeof raw !== 'object' || !/^[a-z0-9]{4,24}$/i.test(raw.id || '')) return null;
    const t = {
      id: raw.id, name: String(raw.name || 'My theme').replace(/\s+/g, ' ').trim().slice(0, 40) || 'My theme',
      page: X.hex(raw.page) || PRESETS[0].page, page2: X.hex(raw.page2) || null, dir: DIRS.some(d => d[0] === raw.dir) ? raw.dir : 'down',
      accent: X.hex(raw.accent) || PRESETS[0].accent,
      panel: X.hex(raw.panel) || null, text: X.hex(raw.text) || null,
      contrast: Object.hasOwn(LEVEL, raw.contrast) ? raw.contrast : 'normal', banner: raw.banner === 'hide' ? 'hide' : 'show',
      // A hidden banner keeps its place empty, or with 'close' the profile moves up into it.
      bannerGap: raw.bannerGap === 'close' ? 'close' : 'keep',
      bg: null, bgFit: FITS.includes(raw.bgFit) ? raw.bgFit : 'cover', image: false,
    };
    for (const [k, [lo, hi, def]] of Object.entries(NUMBERS)) t[k] = Number.isFinite(+raw[k]) && raw[k] !== null && raw[k] !== '' ? Math.min(hi, Math.max(lo, Math.round(+raw[k]))) : def;
    if (raw.bg && typeof raw.bg === 'object' && raw.bg.local === true && raw.image === true) {
      t.bg = { local: true, name: String(raw.bg.name || '').slice(0, 80), video: raw.bg.video === true };
      t.image = true;
    }
    t.base = baseOf(t);
    return t;
  }
  const stopsOf = T => [T.page, T.page2].filter(Boolean);
  const baseOf = T => (X.inkFor(stopsOf(T)) === '#000000' ? 'white' : 'dark');
  const list = store => (Array.isArray(store?.[LIST_KEY]) ? store[LIST_KEY].map(normalize).filter(Boolean).slice(0, MAX_THEMES) : []);
  const active = store => { const id = store?.[ACTIVE_KEY]; return id ? list(store).find(t => t.id === id) || null : null; };
  const imageKey = id => IMAGE_PREFIX + id;

  // What a background holds: 'video', 'picture', or '' when it is not a well-formed data: URL.
  const mediaKind = media => (!X.imageOk(media) ? '' : X.isVideo(media) ? 'video' : 'picture');

  // A theme ready to paint: Classic's tokens (legacy/core/theme.js), the extra CSS, and what was changed to
  // keep it readable. `last`, the caller's previous result: checking a background means a pass over several
  // MB, so for the same file its answer is used again (the editor resolves on every frame of a drag).
  function resolve(T, media, last) {
    const L = LEVEL[T.contrast], stops = stopsOf(T), page = X.avg(stops), base = baseOf(T), dark = base === 'dark', ink = dark ? '#ffffff' : '#000000';
    const picked = {};
    // A colour set by hand is moved just far enough to read on the background and on panels.
    const readable = (k, auto, bgs, min) => {
      if (!T[k]) return auto;
      const out = X.reach(T[k], bgs, min, X.inkFor(bgs));
      if (out !== T[k]) picked[k] = T[k];
      return out;
    };
    const surface = T.panel || (dark ? X.mix(page, '#ffffff', L.lift) : X.mix(page, '#ffffff', .85));
    const bgs = [...stops, surface];
    const text = readable('text', X.reach(X.mix(page, ink, .97), bgs, L.text, ink), bgs, 7);
    const muted = X.soften(text, bgs, L.muted);
    const accent = X.reach(T.accent, bgs, 3, ink);
    if (accent !== T.accent) picked.accent = T.accent;
    const lift = (c, t) => X.mix(c, dark ? '#ffffff' : page, t);
    const rgb = X.rgbs(text);
    // See-through panels: the same colours with a little of what is behind showing through.
    const a = 1 - T.panelClear / 100, see = c => (a < 1 ? `rgba(${X.rgbs(c)},${+a.toFixed(2)})` : c);
    const tokens = {
      preset: base, pageBg: T.page, surface: see(surface),
      // surfaceSolid: the panel colour with nothing showing through, for what has to hide what is under it
      // (the fade over the map art on Classic's score cards, dialogs).
      surfaceSolid: surface,
      innerSurface: see(dark ? lift(surface, .04) : X.mix(surface, page, .45)),
      inputSurface: see(dark ? X.mix(page, surface, .6) : X.mix(surface, page, .6)),
      navSurface: see(surface), navHover: `rgba(${X.rgbs(accent)},.18)`,
      // onAccent: the text on a fill of the accent (buttons, the current page), black or white, whichever reads.
      accent, accentSoft: `rgba(${X.rgbs(accent)},.16)`, onAccent: X.inkFor([accent]),
      imageOverlay: dark ? 'rgba(0,0,0,.72)' : `rgba(${X.rgbs(X.mix(page, '#000000', .8))},.62)`,
      text, textStrong: text, textMuted: muted,
      border: `rgba(${rgb},${dark ? .1 : .12})`, borderStrong: `rgba(${rgb},${dark ? .2 : .22})`, chartTrack: `rgba(${rgb},.14)`,
      shadow: dark ? '0 18px 45px rgba(0,0,0,.28)' : '0 1px 3px rgba(15,23,42,.05), 0 6px 16px rgba(15,23,42,.05)',
      radius: '14px',
    };
    // What is checked: [key, label, colour, backgrounds, minimum].
    const checks = [
      ['text', 'Text', text, bgs, 7],
      ['muted', 'Quiet text', muted, bgs, 4.5],
      ['accent', 'Accent', accent, bgs, 3],
    ].map(c => ({ key: c[0], label: c[1], ratio: X.minRatio(c[2], c[3]), min: c[4] }));

    // null: not checked, as the theme has no background of its own.
    const kind = last && last.media === media && last.kind != null ? last.kind : T.bg?.local ? mediaKind(media) : null;
    const video = Boolean(T.bg?.local && T.bg.video && kind === 'video');
    const picture = Boolean(T.bg?.local && !T.bg.video && kind === 'picture');
    const gradient = stops.length > 1;
    // A gradient from light to dark: no text colour reads well on both ends.
    const mixed = gradient && new Set(stops.map(c => X.inkFor([c]))).size > 1;
    // The panel colours without see-through, for the editor's own panel and its colour fields.
    const solid = { surface, inner: dark ? lift(surface, .04) : X.mix(surface, page, .45) };
    const frame = { fit: T.bgFit, zoom: T.bgZoom / 100, x: T.bgX, y: T.bgY, rot: 0, flip: false };
    // Classic's panels: Rhythia's cards and the extension's own boxes.
    const PANELS = ['#root [class*="rounded-xl"][class*="border"]', '#root [class*="rounded-lg"][class*="border"]', '#root footer', '.rhythiax-score-card', '.rhythiax-profile-box', '.rhythiax-stats-panel']
      .map(s => `html body[data-rhythiax-theme] ${s}`).join(',');
    // The profile card without its banner: the banner's place is left empty (the picture, the badges and the
    // buttons over it stay where they are) and the card starts at its tabs.
    const CARD = 'html body[data-rhythiax-page="player"] #root div.overflow-hidden.rounded-xl:has(> div.relative[class*="h-[180px]"] > div.absolute.inset-0.overflow-hidden)';
    const blur = T.panelBlur ? `-webkit-backdrop-filter:blur(${T.panelBlur}px);backdrop-filter:blur(${T.panelBlur}px)` : '';
    // The CSS for the page: the banner, the panels, and with a gradient or a background, the page shown through.
    function css() {
      const r = [];
      if (blur) r.push(`${PANELS}{${blur}}`);
      if (T.banner === 'hide' && T.bannerGap === 'close') {
        // Only room for the picture (it reaches 80px up into the banner on wide screens) and the badges is left.
        const BAN = `${CARD} > div.relative[class*="h-[180px]"]`;
        r.push(`${BAN}{height:48px!important}`, `${BAN} > div.absolute.inset-0.overflow-hidden{display:none!important}`,
          `${BAN} > div.absolute[class*="top-[144px]"]{top:10px!important}`,
          `@media (min-width:1024px){${BAN}{height:104px!important}${BAN} > div.absolute[class*="top-[144px]"]{top:70px!important}}`);
      } else if (T.banner === 'hide') {
        r.push(`${CARD}{position:relative;isolation:isolate;background:transparent!important;border-color:transparent!important;box-shadow:none!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}`,
          `${CARD}::before{content:"";position:absolute;left:0;right:0;top:180px;bottom:0;z-index:-1;border:1px solid var(--rhythiax-border);border-radius:12px;background:var(--rhythiax-surface);pointer-events:none${blur ? ';' + blur : ''}}`,
          `@media (min-width:1024px){${CARD}::before{top:205px}}`,
          `${CARD} > div.relative[class*="h-[180px]"] > div.absolute.inset-0.overflow-hidden{display:none!important}`);
      }
      if (gradient || video || picture) {
        r.push(`html[data-rhythiax-own-bg]{background:${gradient ? `${X.gradient(stops, T.dir)} fixed` : T.page}!important}`,
          'html[data-rhythiax-own-bg] body[data-rhythiax-theme],html[data-rhythiax-own-bg] body[data-rhythiax-theme] #root,html[data-rhythiax-own-bg] body[data-rhythiax-theme] #root > div,html[data-rhythiax-own-bg] body[data-rhythiax-theme] #root > div > div.mx-auto{background:transparent!important}');
      }
      if (video || picture) {
        const b = T.bgBlur, look = `${T.bgDim ? `opacity:${+(1 - T.bgDim / 100).toFixed(2)};` : ''}${b ? `filter:blur(${b}px);` : ''}`;
        r.push(`#rhythiax-own-bg{${X.placeLayer(frame, b)};z-index:-1;pointer-events:none;${look}${picture ? `background:var(--own-pic) ${T.bgX}% ${T.bgY}%/${T.bgFit} no-repeat` : ''}}`,
          `#rhythiax-own-bg > video{display:block;width:100%;height:100%;object-fit:${T.bgFit};object-position:${T.bgX}% ${T.bgY}%}`);
      }
      return r.join('\n');
    }
    // The picture itself, apart from css(): it is large, so the page writes it again only when it changes
    // (legacy/core/theme.js), not on every move of a slider. url: where the page reads it from, the blob: URL of
    // media (shared/colour.js blobHolder), as Chrome draws no data: URL over 2 MB in CSS.
    const pictureCss = (url = media) => (picture ? `#rhythiax-own-bg{--own-pic:url("${url}")}` : '');
    const preview = () => ({ page: X.gradient(stops, T.dir), panel: surface, accent });
    return { T, base, tokens, solid, picked, checks, css, pictureCss, preview, video, picture, gradient, mixed, media, kind };
  }

  // A theme's colours from its picture (shared/colour.js pictureColours): the page is the picture's average,
  // darkened (or, for a light picture, lightened), the accent its most vivid colour, and the picture is darkened
  // toward the page (at least 20%) until the theme's text reads 4.5:1 on its part that is hardest to read on.
  function fromPicture(T, { avg, light, dark, vivid }) {
    const lightPic = X.lum(avg) > .3, page = X.mix(avg, lightPic ? '#ffffff' : '#000000', lightPic ? .55 : .7);
    const accent = vivid || T.accent, text = resolve(normalize({ ...T, page, page2: null, accent, text: null }), '').tokens.text;
    const worst = X.inkFor([page]) === '#000000' ? dark : light;
    let bgDim = 20;
    while (bgDim < NUMBERS.bgDim[1] && X.ratio(text, X.mix(worst, page, bgDim / 100)) < 4.5) bgDim += 5;
    return { page, page2: null, accent, text: null, bgDim };
  }

  return { LIST_KEY, ACTIVE_KEY, MAX_THEMES, PRESETS, QUICK, LEVEL, NUMBERS, DIRS,
    create, normalize, list, active, imageKey, resolve, baseOf, fromPicture };
})();

if (typeof module !== 'undefined') module.exports = RhythiaX.ClassicThemes;
