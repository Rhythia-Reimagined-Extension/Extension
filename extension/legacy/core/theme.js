// =============================================
// Reimagined for Rhythia - Theme preferences
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const THEMES = RhythiaX.themePresets || {};
  const DEFAULT_THEME = THEMES['rhythia-reimagined'];
  let activeTheme = null;
  let activeOwn = false;
  let themeLoaded = false;
  let themeLoadPending = false;
  let themeSnapshot = null;
  const THEME_TRANSITION_MS = 360;
  // True while Exodus shows the page (RhythiaX.ClassicIdle, see standDown below): the palette is still kept
  // up to date, but nothing of Classic's own theme is on screen and no change is animated.
  let idle = false;

  const PAGE_KEYS = {
    home: '/',
    leaderboards: '/leaderboards',
    maps: '/maps',
    'map-detail': '/maps/:id',
    skins: '/skins',
    clans: '/clans',
    collections: '/collections',
    wiki: '/wiki',
    changelog: '/changelog',
    support: '/support',
    hunt: '/hunt/:year',
    player: '/player/:id',
    'score-replay': '/score/:id',
  };

  function getPageKey(pathname) {
    const path = pathname || window.location.pathname;
    if (path === '/' || path === '') return 'home';
    if (/^\/score\/[^/]+(?:\/|$)/.test(path)) return 'score-replay';
    if (/^\/player(?:\/|$)/.test(path)) return 'player';
    if (/^\/maps\/[^/]+(?:\/|$)/.test(path)) return 'map-detail';
    if (/^\/maps(?:\/|$)/.test(path)) return 'maps';
    if (/^\/hunt\/[^/]+(?:\/|$)/.test(path)) return 'hunt';
    const key = Object.keys(PAGE_KEYS).find(page => {
      if (page === 'home' || page === 'map-detail' || page === 'hunt' || page === 'player') return false;
      return path.startsWith(PAGE_KEYS[page]);
    });
    return key || 'home';
  }


  // onAccent and surfaceSolid come only with an own theme (shared/classic-themes.js); without onAccent the
  // stylesheets keep white text on accent fills, var(--rhythiax-on-accent, #ffffff), and surfaceSolid is
  // read only by own-theme rules (the score cards' map art fade, White's dialogs).
  const THEME_FIELDS = [
    'pageBg', 'surface', 'innerSurface', 'accent', 'accentSoft', 'navSurface',
    'navHover', 'inputSurface', 'imageOverlay', 'text', 'textMuted', 'border',
    'textStrong', 'borderStrong', 'chartTrack', 'shadow', 'radius', 'onAccent', 'surfaceSolid',
  ];

  // A token is a colour, a shadow or a length: hex colours, numbers with units, and rgb(), hsl() or color-mix().
  // Nothing else gets through, so a stored value cannot make the page fetch anything (url(), image-set(),
  // cross-fade(), element(), a quoted string) or leave its declaration.
  const TOKEN_FUNCTIONS = new Set(['rgb', 'rgba', 'hsl', 'hsla', 'color-mix']);
  function safeThemeValue(value) {
    const text = typeof value === 'string' ? value.trim() : '';
    if (!text || text.length > 200 || !/^[\w\s#%(),./+-]+$/.test(text)) return null;
    for (const [, name] of text.matchAll(/([\w-]*)\(/g)) if (!TOKEN_FUNCTIONS.has(name.toLowerCase())) return null;
    for (const [hex] of text.matchAll(/#\w*/g)) if (!/^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return null;
    return text;
  }

  function resolveThemePresetKey(name) {
    if (typeof name !== 'string') return DEFAULT_THEME?.preset || 'rhythia-reimagined';
    const clean = name.trim().toLowerCase();
    if (clean === 'reimagined') return 'rhythia-reimagined';
    return clean;
  }

  function normalizeTheme(theme) {
    let source = {};
    if (typeof theme === 'string') {
      const presetKey = resolveThemePresetKey(theme);
      source = THEMES[presetKey] || { preset: presetKey };
    } else if (theme && typeof theme === 'object' && !Array.isArray(theme)) {
      source = theme;
    }
    const rawPreset = typeof source.preset === 'string' ? resolveThemePresetKey(source.preset) : DEFAULT_THEME?.preset || 'rhythia-reimagined';
    const preset = Object.prototype.hasOwnProperty.call(THEMES, rawPreset)
      ? rawPreset
      : (DEFAULT_THEME?.preset || 'rhythia-reimagined');
    const normalized = { ...DEFAULT_THEME, ...THEMES[preset], preset };
    THEME_FIELDS.forEach(field => {
      const value = safeThemeValue(source[field]);
      if (value !== null) normalized[field] = value;
    });
    return normalized;
  }

  function storage() {
    try {
      return typeof chrome !== 'undefined' ? (chrome?.storage?.local || null) : null;
    } catch (error) {
      // A content script can outlive an extension reload. Storage calls then
      // throw "Extension context invalidated" instead of returning an error.
      return null;
    }
  }

  function createThemeSnapshot() {
    if (!document.body) return null;
    const layer = document.createElement('div');
    layer.className = 'rhythiax-theme-snapshot';
    const computedRoot = getComputedStyle(document.documentElement);
    const bg = computedRoot.getPropertyValue('--rhythiax-page-bg').trim() || '#151326';
    layer.style.backgroundColor = bg;
    layer.style.position = 'fixed';
    layer.style.inset = '0';
    layer.style.zIndex = '2147483640';
    layer.style.pointerEvents = 'none';
    document.documentElement.appendChild(layer);
    return layer;
  }

  function clearThemeTransition() {
    document.documentElement.removeAttribute('data-rhythiax-theme-transitioning');
    if (themeSnapshot) {
      themeSnapshot.remove();
      themeSnapshot = null;
    }
  }

  // opts.instant: no fade (the theme editor paints on every move).
  // opts.own: the tokens are an own theme's (paintOwn below). <html> then carries data-rhythiax-own-theme, and
  // the CSS that sets fixed colours for the built-in White and Dark themes steps aside for them
  // (themes/white/theme.css, bridge/native-surfaces.css, bridge/native-foundation.css, score-card/base.css).
  RhythiaX.applyTheme = function (theme, opts = {}) {
    const next = normalizeTheme(theme);
    const own = Boolean(opts.own);
    const hadActiveTheme = Boolean(activeTheme);
    const sameTheme = activeTheme && activeOwn === own && Object.keys(next).every(key => activeTheme[key] === next[key]);
    activeTheme = next;
    activeOwn = own;
    if (sameTheme) {
      document.body?.setAttribute('data-rhythiax-page', getPageKey(window.location.pathname));
      return;
    }
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const shouldAnimate = Boolean(themeLoaded && document.body && hadActiveTheme && !sameTheme && !reducedMotion && !opts.instant && !idle);
    if (themeSnapshot) clearThemeTransition();
    themeSnapshot = shouldAnimate ? createThemeSnapshot() : null;
    const root = document.documentElement;
    // Transitions are switched off only while an animated change is on screen. Without an animation the
    // palette is painted and the attribute removed in the same task, so styles never saw it; setting it
    // still marked every element on the page for a style recalculation.
    if (shouldAnimate) root.setAttribute('data-rhythiax-theme-transitioning', '');

    const paintTheme = () => {
      root.style.setProperty('--rhythiax-page-bg', next.pageBg);
      root.style.setProperty('--rhythiax-surface', next.surface);
      root.style.setProperty('--rhythiax-inner-surface', next.innerSurface);
      root.style.setProperty('--rhythiax-accent', next.accent);
      root.style.setProperty('--rhythiax-accent-soft', next.accentSoft || `color-mix(in srgb, ${next.accent} 16%, transparent)`);
      root.style.setProperty('--rhythiax-nav-surface', next.navSurface || next.surface);
      root.style.setProperty('--rhythiax-nav-hover', next.navHover || next.accentSoft);
      root.style.setProperty('--rhythiax-input-surface', next.inputSurface || next.innerSurface);
      root.style.setProperty('--rhythiax-image-overlay', next.imageOverlay || 'rgba(0,0,0,.72)');
      root.style.setProperty('--rhythiax-text', next.text);
      root.style.setProperty('--rhythiax-text-muted', next.textMuted);
      root.style.setProperty('--rhythiax-border', next.border);
      root.style.setProperty('--rhythiax-text-strong', next.textStrong);
      root.style.setProperty('--rhythiax-border-strong', next.borderStrong);
      root.style.setProperty('--rhythiax-chart-track', next.chartTrack);
      root.style.setProperty('--rhythiax-shadow', next.shadow);
      root.style.setProperty('--rhythiax-radius', next.radius);
      if (next.onAccent) root.style.setProperty('--rhythiax-on-accent', next.onAccent);
      else root.style.removeProperty('--rhythiax-on-accent');
      if (next.surfaceSolid) root.style.setProperty('--rhythiax-surface-solid', next.surfaceSolid);
      else root.style.removeProperty('--rhythiax-surface-solid');
      if (own) root.setAttribute('data-rhythiax-own-theme', '');
      else root.removeAttribute('data-rhythiax-own-theme');
      root.setAttribute('data-rhythiax-theme', next.preset || 'custom');
      document.body?.setAttribute('data-rhythiax-theme', next.preset || 'custom');
      document.body?.setAttribute('data-rhythiax-page', getPageKey(window.location.pathname));
    };
    paintTheme();

    if (!themeSnapshot) {
      clearThemeTransition();
      return;
    }

    const snapshot = themeSnapshot;
    if (typeof snapshot.animate !== 'function') {
      setTimeout(() => {
        if (themeSnapshot === snapshot) clearThemeTransition();
      }, THEME_TRANSITION_MS);
      return;
    }
    const animation = snapshot.animate(
      [{ opacity: 1 }, { opacity: 0 }],
      { duration: THEME_TRANSITION_MS, easing: 'cubic-bezier(.22, .8, .25, 1)', fill: 'both' }
    );
    const finish = () => {
      if (themeSnapshot === snapshot) clearThemeTransition();
    };
    animation.finished.then(finish, finish);
  };

  // ─── Own themes (shared/classic-themes.js) ───
  // A theme made in Classic's theme editor: its tokens go through applyTheme like a built-in theme; the
  // banner and the background picture or video are a <style> and a layer behind the page.
  const OWN = RhythiaX.ClassicThemes;
  let ownStyle = null, ownPicture = null, ownPictureFor = '', ownLast = null;
  let ownLayer = null, ownVideo = null, ownVideoFor = '', ownVideoUrl = '', previewing = false;
  let pictureUrl = null;
  const ownPictureUrl = media => (pictureUrl ||= RhythiaX.Colour.blobHolder())(media);
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)');

  function paintOwn(theme, media, opts) {
    // The last result goes back in: the background file is checked once, not on every frame of an editor drag.
    const R = ownLast = OWN.resolve(theme, media, ownLast);
    RhythiaX.applyTheme(R.tokens, { ...opts, own: true });
    // While Exodus shows the page only the tokens follow; the rest comes back with standUp. A video the
    // theme no longer has is let go now.
    if (idle) { if (!R.video) paintVideo(''); return; }
    const root = document.documentElement;
    if (!ownStyle) { ownStyle = document.createElement('style'); ownStyle.id = 'rhythiax-own-theme'; }
    if (!ownStyle.isConnected) (document.head || root).appendChild(ownStyle);
    const css = R.css();
    if (ownStyle.textContent !== css) ownStyle.textContent = css;
    paintPicture(R);
    // A gradient or a picture shows through the page: Rhythia's page backgrounds step aside (R.css()).
    root.toggleAttribute('data-rhythiax-own-bg', Boolean(R.gradient || R.video || R.picture));
    if (!R.video && !R.picture) { paintVideo(''); ownLayer?.remove(); return; }
    if (!ownLayer) { ownLayer = document.createElement('div'); ownLayer.id = 'rhythiax-own-bg'; ownLayer.setAttribute('aria-hidden', 'true'); }
    ownLayer.style.setProperty('--own-ar', (innerHeight / Math.max(1, innerWidth)).toFixed(4));
    if (!ownLayer.isConnected) root.appendChild(ownLayer);
    paintVideo(R.video ? media : '');
  }
  // The background picture has a <style> of its own (R.pictureCss()), read from a blob: URL of its bytes. It is
  // written again only when the picture changes, not each time the rest of the theme does.
  function paintPicture(R) {
    const media = R.picture ? R.media : '';
    if (!ownPicture) { ownPicture = document.createElement('style'); ownPicture.id = 'rhythiax-own-picture'; }
    if (!ownPicture.isConnected) (document.head || document.documentElement).appendChild(ownPicture);
    if (media === ownPictureFor) return;
    ownPictureFor = media;
    ownPicture.textContent = media ? R.pictureCss(ownPictureUrl(media)) : '';
    if (!media) ownPictureUrl('');
  }
  // A background video plays muted, always; hidden tabs and reduced motion pause it.
  function paintVideo(media) {
    if (!media) {
      if (ownVideo) { ownVideo.pause(); ownVideo.remove(); ownVideo = null; }
      if (ownVideoUrl) { RhythiaX.Colour.freeUrl(ownVideoUrl); ownVideoUrl = ''; ownVideoFor = ''; }
      return;
    }
    if (ownVideoFor !== media) {
      if (ownVideoUrl) RhythiaX.Colour.freeUrl(ownVideoUrl);
      ownVideoUrl = RhythiaX.Colour.mediaUrl(media);
      ownVideoFor = media;
      if (ownVideo) ownVideo.src = ownVideoUrl;
    }
    if (!ownVideo) {
      ownVideo = Object.assign(document.createElement('video'), { muted: true, defaultMuted: true, loop: true, playsInline: true, disablePictureInPicture: true, src: ownVideoUrl });
      ownVideo.addEventListener('volumechange', () => { if (!ownVideo.muted) ownVideo.muted = true; });
    }
    if (ownVideo.parentNode !== ownLayer) ownLayer.appendChild(ownVideo);
    playOrRest();
  }
  function playOrRest() {
    if (!ownVideo) return;
    if (idle || document.hidden || reducedMotion?.matches) ownVideo.pause(); else ownVideo.play().catch(() => {});
  }
  document.addEventListener?.('visibilitychange', playOrRest);
  reducedMotion?.addEventListener?.('change', playOrRest);
  globalThis.addEventListener?.('resize', () => ownLayer?.style.setProperty('--own-ar', (innerHeight / Math.max(1, innerWidth)).toFixed(4)));
  function clearLayer() {
    paintVideo('');
    ownLayer?.remove();
    document.documentElement.removeAttribute('data-rhythiax-own-bg');
  }
  function clearOwn() {
    if (ownStyle) ownStyle.textContent = '';
    if (ownPicture) ownPicture.textContent = '';
    ownPictureFor = '';
    ownPictureUrl('');
    ownLast = null;
    clearLayer();
  }

  // Classic stands down while Exodus shows the page (RhythiaX.ClassicIdle, legacy/core/state.js). The video
  // is paused and taken off the page with its layer but keeps its blob: decoding it again on the way back
  // would take seconds. The banner and background rules are emptied, and a fade on screen is cut short.
  function standDown() {
    idle = true;
    clearThemeTransition();
    ownVideo?.pause();
    ownLayer?.remove();
    document.documentElement.removeAttribute('data-rhythiax-own-bg');
    if (ownStyle) ownStyle.textContent = '';
  }
  // Classic has the page again: what storage holds now is painted, including changes made in the meantime.
  function standUp() {
    if (!idle) return;
    idle = false;
    readTheme(showStored);
  }
  // state.js loads before this file (engines.js), so ClassicIdle is normally there at once; loadTheme asks
  // again in case it came later. A tab that starts under Exodus starts idle.
  let idleSubscribed = false;
  function subscribeIdle() {
    const Idle = RhythiaX.ClassicIdle;
    if (idleSubscribed || typeof Idle?.onSuspend !== 'function' || typeof Idle?.onResume !== 'function') return;
    idleSubscribed = true;
    Idle.onSuspend(standDown);
    Idle.onResume(standUp);
    if (Idle.isSuspended?.()) standDown();
  }

  // 1.0.1 to 1.1.0 saved the whole built-in preset as rhythiaxTheme, so an upgraded copy still painted that
  // release's colours. Such an object (a built-in preset's name and nothing but a preset's keys) is read as
  // the preset's name, and storage gets that name once. Own themes are saved apart (shared/classic-themes.js),
  // and any other value is returned as it is.
  const OLD_PRESET_KEYS = new Set(['preset', 'backgroundImage', ...THEME_FIELDS]);
  function storedBuiltIn(area, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return value;
    const key = typeof value.preset === 'string' ? resolveThemePresetKey(value.preset) : '';
    if (!Object.prototype.hasOwnProperty.call(THEMES, key) || !Object.keys(value).every(k => OLD_PRESET_KEYS.has(k))) return value;
    const name = key === 'rhythia-reimagined' ? 'reimagined' : key;
    area.set({ rhythiaxTheme: name }, () => void chrome.runtime?.lastError);
    return name;
  }

  // The theme in use from storage: an own theme if one is chosen, else the built-in one.
  function readTheme(done) {
    const area = storage();
    if (!area || !OWN) return false;
    // No default object for rhythiaxTheme: a missing key must not look like a saved preset object.
    area.get({ rhythiaxTheme: '', [OWN.LIST_KEY]: [], [OWN.ACTIVE_KEY]: '' }, result => {
      try {
        if (chrome.runtime?.lastError || !result) return done();
        const builtIn = storedBuiltIn(area, result.rhythiaxTheme) || DEFAULT_THEME;
        const own = OWN.active(result);
        if (!own?.image) return done(builtIn, own, null);
        area.get(OWN.imageKey(own.id), got => done(builtIn, own, chrome.runtime?.lastError ? null : got?.[OWN.imageKey(own.id)] || null));
      } catch (error) {
        if (!/Extension context invalidated/i.test(String(error?.message || error))) throw error;
      }
    });
    return true;
  }
  function showStored(builtIn, own, media) {
    if (previewing) return;
    if (own) paintOwn(own, media);
    else { clearOwn(); RhythiaX.applyTheme(builtIn || DEFAULT_THEME); }
  }
  // For the theme editor (legacy/core/theme-editor.js): paint a theme being edited, then go back to the stored one.
  RhythiaX.ClassicLook = {
    preview(theme, media) {
      previewing = true;
      document.documentElement.setAttribute('data-rhythiax-theme-editing', '');
      paintOwn(theme, media, { instant: true });
    },
    endPreview() {
      previewing = false;
      document.documentElement.removeAttribute('data-rhythiax-theme-editing');
      readTheme(showStored);
    },
  };

  RhythiaX.loadTheme = function () {
    // SPA navigation should not remove/repaint the active palette while an
    // asynchronous storage read is pending. Theme changes arrive through the
    // runtime message and storage change listener below.
    subscribeIdle();
    if (themeLoaded || themeLoadPending) {
      document.body?.setAttribute('data-rhythiax-page', getPageKey(window.location.pathname));
      return;
    }
    const area = storage();
    if (!area) return;
    themeLoadPending = true;
    try {
      readTheme((builtIn, own, media) => {
        themeLoadPending = false;
        if (themeLoaded || (builtIn === undefined && !own)) return;
        themeLoaded = true;
        showStored(builtIn, own, media);
      });
    } catch (error) {
      themeLoadPending = false;
      if (!/Extension context invalidated/i.test(String(error?.message || error))) throw error;
    }
  };

  try {
    if (typeof chrome !== 'undefined') {
      chrome.runtime?.onMessage?.addListener(message => {
        if (message && (message.type === 'rhythiax-theme' || message.type === 'rhythiax-theme-changed') && !previewing) {
          themeLoaded = true;
          // The popup sends this after its storage write: the page shows what storage holds, so an own theme
          // still chosen there stays (a built-in theme picked for the other look leaves Classic's in use).
          // Without a storage answer, the theme the message names is shown.
          const named = () => { if (!previewing) { clearOwn(); RhythiaX.applyTheme(message.theme); } };
          if (!readTheme((builtIn, own, media) => (builtIn === undefined && !own ? named() : showStored(builtIn, own, media)))) named();
        }
      });
    }
  } catch (error) {
    if (!/Extension context invalidated/i.test(String(error?.message || error))) throw error;
  }

  try {
    if (typeof chrome !== 'undefined') {
      chrome.storage?.onChanged?.addListener((changes, areaName) => {
        if (areaName !== 'local' || !OWN) return;
        if (changes.rhythiaxTheme?.newValue || OWN.LIST_KEY in changes || OWN.ACTIVE_KEY in changes) {
          themeLoaded = true;
          readTheme(showStored);
        }
      });
    }
  } catch (error) {
    if (!/Extension context invalidated/i.test(String(error?.message || error))) throw error;
  }

  // Paint the fallback immediately, then replace it only when a saved preset
  // is actually available. This prevents the native dark shell from flashing.
  RhythiaX.applyTheme(DEFAULT_THEME);
  RhythiaX.loadTheme();
})();
