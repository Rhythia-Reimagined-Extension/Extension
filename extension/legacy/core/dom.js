// =============================================
// Reimagined for Rhythia — Classic's DOM helpers and finders for Rhythia's own elements
// =============================================

var RhythiaX = RhythiaX || {};

// ─── DOM helpers ─────────────────────────────
RhythiaX.qs = (sel, ctx) => (ctx || document).querySelector(sel);
RhythiaX.qsa = (sel, ctx) => [...(ctx || document).querySelectorAll(sel)];

// Diagnostics stay silent in every build. log/warn/error/captureError remain so
// callers need no guards; only a lost extension context is acted on.
(function installLogger() {
  const isExtensionContextInvalidated = error => /extension context invalidated|context invalidated/i.test(String(error?.message || error));
  RhythiaX.isExtensionContextInvalidated = isExtensionContextInvalidated;
  RhythiaX.log = () => {};
  RhythiaX.warn = () => {};
  RhythiaX.error = () => {};
  RhythiaX.captureError = error => {
    if (!isExtensionContextInvalidated(error)) return;
    RhythiaX.extensionContextInvalidated = true;
    RhythiaX.onExtensionContextInvalidated?.();
  };
  window.addEventListener('error', event => RhythiaX.captureError(event.error || event.message));
  window.addEventListener('unhandledrejection', event => RhythiaX.captureError(event.reason));
})();

RhythiaX.isOwnProfile = function () {
  if (typeof window === 'undefined' || !window.location?.pathname?.startsWith('/player/')) return false;

  // 1. Check "my profile" navigation link in header / dropdown
  try {
    const links = RhythiaX.qsa ? RhythiaX.qsa('a[href^="/player/"]') : Array.from(document.querySelectorAll('a[href^="/player/"]'));
    const myProfileLink = links.find(link => /my profile/i.test(link.textContent || '') || link.getAttribute('aria-label')?.toLowerCase()?.includes('my profile'));
    if (myProfileLink) {
      const ownHref = myProfileLink.getAttribute('href') || '';
      const cleanOwn = ownHref.split('?')[0].split('#')[0];
      const cleanCurrent = window.location.pathname.split('?')[0].split('#')[0];
      if (cleanOwn && cleanCurrent) return cleanOwn === cleanCurrent;
    }
  } catch (_) {}

  // 2. Friends counter test (on Rhythia, only rendered on the signed-in player's own profile)
  try {
    const sidebar = document.querySelector('.lg\\:col-span-3, [class*="col-span"], main') || document.getElementById('root');
    const candidates = Array.from(sidebar ? sidebar.querySelectorAll('a, button, div') : []).filter(element => {
      if (element.closest('.fixed.top-0, nav, header')) return false;
      return /^\d+\s+friends?$/i.test(element.textContent.trim());
    });
    if (candidates.length > 0) return true;
  } catch (_) {}

  // 3. Settings button / Edit profile indicator (only present on own profile)
  try {
    if (document.querySelector('#root button[aria-label*="setting" i], #root button:has(svg.lucide-settings), #root button:has(img[src*="settingsicon"]), #root a[href="/settings"]')) {
      return true;
    }
  } catch (_) {}

  return false;
};

RhythiaX.findScoreCards = function () {
  const candidates = RhythiaX.qsa(RhythiaX.SCORE_SELECTOR);
  return candidates.filter(el => {
    const cls = el.className || '';
    const style = el.getAttribute('style') || '';
    return cls.includes('bg-[#1a1b1c]')
      || cls.includes('hover:border-[var(--difficulty-color)]')
      || cls.includes('score-card')
      || style.includes('border-left: 5px')
      || style.includes('--difficulty-color')
      || Boolean(el.querySelector('a[href*="/score/"]'))
      || Boolean(el.querySelector('a[href*="/maps/"]'));
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
  // Find the official Statistics/Stats box
  const order1 = RhythiaX.qs('.order-1');
  if (order1 && order1.textContent.includes('Statistics')) {
    return order1;
  }
  const candidates = RhythiaX.qsa('.overflow-hidden.rounded-xl.border, .rounded-xl.border');
  for (const el of candidates) {
    if (el.textContent.includes('Statistics') && (el.textContent.includes('Play Count') || el.textContent.includes('Avg. Accuracy'))) {
      return el;
    }
  }
  for (const el of candidates) {
    if (el.textContent.includes('Stats') && (el.textContent.includes('Rhythm Points') || el.textContent.includes('Weighted RP'))) {
      return el;
    }
  }
  return null;
};

RhythiaX.findHeaderRankArea = function () {
  const header = RhythiaX.qs('.max-w-\\[1120px\\], .max-w-\\[1100px\\], main') || document;
  const globalLabel = RhythiaX.qsa('div, span', header).find(el => el.textContent.trim().toLowerCase() === 'global');
  if (globalLabel) {
    return globalLabel.closest('div[class*="grid-cols-2"], div[class*="-ml-[100px]"], div[class*="grid"]')
      || globalLabel.closest('[style*="grid-template-columns"]')
      || globalLabel.parentElement?.parentElement;
  }
  return null;
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

