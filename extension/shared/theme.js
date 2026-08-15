// =============================================
// Rhythia Reimagined - Theme preferences
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const THEMES = RhythiaX.themePresets || {};
  const DEFAULT_THEME = THEMES['rhythia-reimagined'];
  let activeTheme = null;
  let themeLoaded = false;
  let themeLoadPending = false;
  let themeSnapshot = null;
  const THEME_TRANSITION_MS = 360;

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
  const THEME_NAMES = Object.keys(THEMES);

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

  RhythiaX.themePages = PAGE_KEYS;
  RhythiaX.themeNames = THEME_NAMES;
  RhythiaX.getThemePageKey = getPageKey;

  const THEME_FIELDS = [
    'pageBg', 'surface', 'innerSurface', 'accent', 'accentSoft', 'navSurface',
    'navHover', 'inputSurface', 'imageOverlay', 'text', 'textMuted', 'border',
    'textStrong', 'borderStrong', 'chartTrack', 'shadow', 'radius',
  ];

  function safeThemeValue(value) {
    const text = typeof value === 'string' ? value.trim() : '';
    return text && text.length <= 200 && !/[;{}\\]/.test(text) && !/url\s*\(|expression\s*\(|@import/i.test(text) ? text : null;
  }

  function safeBackgroundImage(value) {
    if (typeof value !== 'string' || !value.trim() || value.length > 2048) return '';
    try {
      const url = new URL(value);
      return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function normalizeTheme(theme) {
    const source = theme && typeof theme === 'object' && !Array.isArray(theme) ? theme : {};
    const preset = typeof source.preset === 'string' && Object.prototype.hasOwnProperty.call(THEMES, source.preset)
      ? source.preset
      : DEFAULT_THEME.preset;
    const normalized = { ...DEFAULT_THEME, ...THEMES[preset], preset };
    THEME_FIELDS.forEach(field => {
      const value = safeThemeValue(source[field]);
      if (value !== null) normalized[field] = value;
    });
    normalized.backgroundImage = safeBackgroundImage(source.backgroundImage);
    return normalized;
  }

  function storage() {
    try {
      return chrome?.storage?.local || null;
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
    const oldBody = document.body.cloneNode(true);
    const computedRoot = getComputedStyle(document.documentElement);
    [
      '--rhythiax-page-bg', '--rhythiax-surface', '--rhythiax-inner-surface',
      '--rhythiax-accent', '--rhythiax-accent-soft', '--rhythiax-nav-surface',
      '--rhythiax-nav-hover', '--rhythiax-input-surface', '--rhythiax-text',
      '--rhythiax-text-muted', '--rhythiax-border', '--rhythiax-text-strong',
      '--rhythiax-border-strong', '--rhythiax-chart-track', '--rhythiax-shadow',
      '--rhythiax-radius', '--rhythiax-image-overlay',
    ].forEach(name => oldBody.style.setProperty(name, computedRoot.getPropertyValue(name).trim()));
    layer.style.backgroundColor = computedRoot.getPropertyValue('--rhythiax-page-bg').trim();
    layer.appendChild(oldBody);
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

  RhythiaX.applyTheme = function (theme) {
    const next = normalizeTheme(theme);
    const hadActiveTheme = Boolean(activeTheme);
    const sameTheme = activeTheme && Object.keys(next).every(key => activeTheme[key] === next[key]);
    activeTheme = next;
    if (sameTheme) {
      document.body?.setAttribute('data-rhythiax-page', getPageKey(window.location.pathname));
      return;
    }
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const shouldAnimate = Boolean(document.body && hadActiveTheme && !sameTheme && !reducedMotion);
    if (themeSnapshot) clearThemeTransition();
    themeSnapshot = shouldAnimate ? createThemeSnapshot() : null;
    const root = document.documentElement;
    root.setAttribute('data-rhythiax-theme-transitioning', '');

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
       const background = next.backgroundImage ? `url(${JSON.stringify(next.backgroundImage)})` : 'none';
      root.style.backgroundImage = background;
      document.body.style.backgroundImage = background;
      root.style.backgroundSize = next.backgroundImage ? 'cover' : '';
      document.body.style.backgroundSize = next.backgroundImage ? 'cover' : '';
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

  RhythiaX.loadTheme = function () {
    // SPA navigation should not remove/repaint the active palette while an
    // asynchronous storage read is pending. Theme changes arrive through the
    // runtime message and storage change listener below.
    if (themeLoaded || themeLoadPending) {
      document.body?.setAttribute('data-rhythiax-page', getPageKey(window.location.pathname));
      return;
    }
    const area = storage();
    if (!area) return;
    themeLoadPending = true;
    try {
      area.get({ rhythiaxTheme: DEFAULT_THEME }, result => {
        try {
          themeLoadPending = false;
          if (chrome.runtime?.lastError || !result) return;
          if (themeLoaded) return;
          themeLoaded = true;
          RhythiaX.applyTheme(result.rhythiaxTheme || DEFAULT_THEME);
        } catch (error) {
          if (!/Extension context invalidated/i.test(String(error?.message || error))) throw error;
        }
      });
    } catch (error) {
      themeLoadPending = false;
      if (!/Extension context invalidated/i.test(String(error?.message || error))) throw error;
    }
  };

  try {
    chrome.runtime?.onMessage?.addListener(message => {
      if (message && message.type === 'rhythiax-theme') {
        themeLoaded = true;
        RhythiaX.applyTheme(message.theme);
      }
    });
  } catch (error) {
    if (!/Extension context invalidated/i.test(String(error?.message || error))) throw error;
  }

  try {
    chrome.storage?.onChanged?.addListener((changes, areaName) => {
      if (areaName === 'local' && changes.rhythiaxTheme?.newValue) {
        themeLoaded = true;
        RhythiaX.applyTheme(changes.rhythiaxTheme.newValue);
      }
    });
  } catch (error) {
    if (!/Extension context invalidated/i.test(String(error?.message || error))) throw error;
  }

  // Paint the fallback immediately, then replace it only when a saved preset
  // is actually available. This prevents the native dark shell from flashing.
  RhythiaX.applyTheme(DEFAULT_THEME);
  RhythiaX.loadTheme();
})();
