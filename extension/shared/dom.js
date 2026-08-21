// =============================================
// Rhythia X — DOM helpers
// =============================================

var RhythiaX = RhythiaX || {};

// ─── DOM helpers ─────────────────────────────
RhythiaX.qs = (sel, ctx) => (ctx || document).querySelector(sel);
RhythiaX.qsa = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];
RhythiaX.debug = false;
RhythiaX.developerMode = false;

// Keep production diagnostics useful without exposing profile data, tokens or
// the implementation details that are only useful during development.
(function installLogger() {
  const SENSITIVE_KEY = /auth|token|cookie|session|password|secret|credential|email|username|playerid/i;
  const SENSITIVE_TEXT = /(bearer\s+)[^\s]+|rhythia_auth_session_v1\s*[=:]\s*[^\s,;]+/ig;
  const areaFromUrl = () => {
    const path = String(window.location?.pathname || '');
    if (/\/player\//.test(path)) return 'profile';
    if (/\/maps/.test(path)) return 'maps';
    return 'app';
  };
  const clean = (value, key = '') => {
    if (SENSITIVE_KEY.test(key)) return '[redacted]';
    if (value instanceof Error) return { name: value.name, message: clean(value.message), stack: value.stack || '[no stack]' };
    if (typeof value === 'string') return value.replace(SENSITIVE_TEXT, '$1[redacted]');
    if (Array.isArray(value)) return value.slice(0, 20).map(item => clean(item));
    if (value && typeof value === 'object') {
      const output = {};
      Object.entries(value).slice(0, 40).forEach(([entryKey, entryValue]) => { output[entryKey] = clean(entryValue, entryKey); });
      return output;
    }
    return value;
  };
  const isExtensionContextInvalidated = error => /extension context invalidated|context invalidated/i.test(String(error?.message || error));
  const context = message => {
    const text = String(message || '').toLowerCase();
    if (/score|rp|replay/.test(text)) return 'scores';
    if (/profile|player|stat/.test(text)) return 'profile';
    if (/api|fetch|rest|request/.test(text)) return 'api';
    if (/theme|preset/.test(text)) return 'theme';
    return areaFromUrl();
  };
  RhythiaX.isExtensionContextInvalidated = isExtensionContextInvalidated;
  const write = (level, args) => {
    const tag = context(args[0]);
    const prefix = `[RhythiaX][${level}][${tag}]`;
    const output = args.map(value => clean(value));
    if (RhythiaX.developerMode) output.push({ trace: clean(new Error().stack || '[no stack]') });
    const method = level === 'ERROR' ? console.error : level === 'WARN' ? console.warn : console.info;
    method.call(console, prefix, ...output);
  };

  // INFO is intentionally reserved for the private developer build. User
  // diagnostics should stay focused on actionable warnings and errors.
  RhythiaX.log = (...args) => { if (RhythiaX.developerMode) write('INFO', args); };
  RhythiaX.warn = (...args) => { if (RhythiaX.debug || RhythiaX.developerMode) write('WARN', args); };
  RhythiaX.error = (...args) => {
    if (RhythiaX.debug || RhythiaX.developerMode) write('ERROR', args);
  };
  RhythiaX.captureError = (error, ...contextArgs) => {
    if (isExtensionContextInvalidated(error)) {
      RhythiaX.extensionContextInvalidated = true;
      RhythiaX.onExtensionContextInvalidated?.();
      return;
    }
    const source = error instanceof Error ? error : new Error(String(error));
    if (RhythiaX.debug || RhythiaX.developerMode) write('ERROR', [...contextArgs, source]);
  };
  RhythiaX.setDebugLogging = enabled => { RhythiaX.debug = enabled === true; };
  RhythiaX.setDeveloperMode = enabled => { RhythiaX.developerMode = enabled === true; };

  const storage = typeof chrome !== 'undefined' ? chrome.storage?.local : null;
  storage?.get?.({ rhythiaxDebugLogs: false }, result => {
    RhythiaX.setDebugLogging(result?.rhythiaxDebugLogs);
  });
  // DEV_ONLY_START
  storage?.get?.({ rhythiaxDeveloperMode: false }, result => {
    RhythiaX.setDeveloperMode(result?.rhythiaxDeveloperMode);
  });
  // DEV_ONLY_END
  window.addEventListener('error', event => {
    RhythiaX.captureError(event.error || new Error(event.message || 'Unhandled window error'), 'Unhandled window error', { file: event.filename, line: event.lineno, column: event.colno });
  });
  window.addEventListener('unhandledrejection', event => RhythiaX.captureError(event.reason, 'Unhandled promise rejection'));
})();
RhythiaX.clearLoadingState = function () {
  document.querySelector('.rhythiax-loading-indicator')?.remove();
};

RhythiaX.findScoreCards = function () {
  const candidates = RhythiaX.qsa(RhythiaX.SCORE_SELECTOR);
  return candidates.filter(el => {
    const cls = el.className;
    const style = el.getAttribute('style') || '';
    return cls.includes('bg-[#1a1b1c]')
      || cls.includes('hover:border-[var(--difficulty-color)]')
      || style.includes('border-left: 5px')
      || style.includes('--difficulty-color');
  });
};

// The site exposes replay files as direct .rhr downloads. Older versions used
// a /replay/ route, so accept both shapes when score cards are enhanced.
RhythiaX.findReplayLink = function (card) {
  return RhythiaX.qsa('a[href]', card).find(link => {
    const href = link.getAttribute('href') || '';
    const metadata = [
      href,
      link.getAttribute('aria-label') || '',
      link.getAttribute('title') || '',
      link.textContent || '',
    ].join(' ');
    return link.hasAttribute('download')
      || /(?:^|\/)replay(?:\/|[?#]|$)/i.test(href)
      || /\.rhr(?:[?#]|$)/i.test(href)
      || /\breplay\b/i.test(metadata);
  });
};

RhythiaX.findExpandedPanel = function (card) {
  const grid = card.querySelector('.grid.grid-cols-3, [class*="grid-cols-3"], [class*="grid-cols-6"]');
  if (grid) {
    const text = grid.textContent;
    if (text.includes('Mods') && (text.includes('Misses') || text.includes('Notes')) && text.includes('Accuracy')) {
      return grid.parentElement;
    }
  }
  return null;
};

RhythiaX.findOfficialStatsContainer = function () {
  // Find the official Stats box — the one with the chart icon and "Stats" title
  // Must match both original "Rhythm Points" and our renamed "Weighted RP"
  const candidates = RhythiaX.qsa('.overflow-hidden.rounded-xl.border');
  for (const el of candidates) {
    if (el.textContent.includes('Stats') && (el.textContent.includes('Rhythm Points') || el.textContent.includes('Weighted RP'))) {
      return el;
    }
  }
  return null;
};

RhythiaX.ensureProfilesGrid = function (statsContainer) {
  const target = statsContainer || RhythiaX.findOfficialStatsContainer();
  if (!target) return null;

  let profilesGrid = target.querySelector('.rhythiax-profiles-grid')
    || (target.parentElement && Array.from(target.parentElement.children).find(element => element.classList?.contains('rhythiax-profiles-grid')))
    || document.querySelector('.rhythiax-profiles-grid');

  if (!profilesGrid) {
    profilesGrid = document.createElement('div');
    profilesGrid.className = 'rhythiax-profiles-grid rhythiax-profile-page-grid';
    if (!target.parentElement) {
      target.appendChild(profilesGrid);
    } else {
      target.after(profilesGrid);
    }
  } else {
    profilesGrid.classList.add('rhythiax-profile-page-grid');
  }

  return profilesGrid;
};

// ─── Modal Accessibility / Focus Trap Helpers ──
RhythiaX.getFocusableElements = function (container) {
  if (!container) return [];
  const candidates = [...container.querySelectorAll(
    'button:not([disabled]), [href]:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )];
  return candidates.filter(el => {
    if (el.closest('[hidden]')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    if (typeof el.getClientRects === 'function' && el.getClientRects().length === 0 && el.offsetParent === null) return false;
    return true;
  });
};

RhythiaX.trapFocus = function (container, event) {
  if (!container || event.key !== 'Tab') return;
  const focusable = RhythiaX.getFocusableElements(container);
  if (!focusable.length) {
    event.preventDefault();
    return;
  }
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first || !container.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last || !container.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }
};

