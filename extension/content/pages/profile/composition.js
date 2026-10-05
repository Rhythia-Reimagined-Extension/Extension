// =============================================
// Rhythia X — Profile Page Enhancements
// =============================================

var RhythiaX = RhythiaX || {};

RhythiaX.profileHistoryContext = null;
const PROFILE_EASTER_EGG_CHANCE_PERCENT = 10;
const PROFILE_EASTER_EGG_OVERRIDES = {
  '255585': 1,
};

function getProfileEasterEggChance(playerId) {
  const key = String(playerId);
  const configuredPercent = Object.prototype.hasOwnProperty.call(PROFILE_EASTER_EGG_OVERRIDES, key)
    ? Number(PROFILE_EASTER_EGG_OVERRIDES[key])
    : PROFILE_EASTER_EGG_CHANCE_PERCENT;
  const percent = Number.isFinite(configuredPercent)
    ? Math.min(100, Math.max(0, configuredPercent))
    : PROFILE_EASTER_EGG_CHANCE_PERCENT;
  return percent / 100;
}

function profileDisplayNumber(value) {
  const text = RhythiaX.cleanStatValueString ? RhythiaX.cleanStatValueString(value) : String(value ?? '').trim();
  if (!/\d/.test(text)) return '';
  const number = RhythiaX.parseLocalizedNumber(text);
  return Number.isFinite(number) ? String(number) : '';
}

function extractCleanRankText(container) {
  if (!container) return '';
  const clone = container.cloneNode(true);
  clone.querySelectorAll(
    'small, svg, .rhythiax-profile-history-delta, .rhythiax-history-delta, [class*="delta"], [class*="text-green"], [class*="text-red"], [class*="text-emerald"], [title*="rank" i], [title*="Rank" i], [title*="Climbed" i], [title*="Dropped" i]'
  ).forEach(e => e.remove());

  clone.querySelectorAll('*').forEach(el => {
    const t = el.textContent.trim();
    if (/^[▲▼+\-]\s*\d+/.test(t) || /\bthis week\b/i.test(t)) {
      el.remove();
    }
  });

  if (typeof document !== 'undefined' && typeof document.createTreeWalker === 'function') {
    try {
      const walker = document.createTreeWalker(clone, 4 /* NodeFilter.SHOW_TEXT */, null);
      let node;
      while ((node = walker.nextNode())) {
        const m = node.nodeValue.match(/#\s*([0-9,]+)/);
        if (m) return '#' + m[1].replace(/,/g, '');
      }
    } catch (_) {}
  }

  const match = clone.textContent.match(/#\s*([0-9,]+)/);
  return match ? '#' + match[1].replace(/,/g, '') : '';
}
RhythiaX.extractCleanRankText = extractCleanRankText;

// ─── Extract player data (profile page) ──────
RhythiaX.extractPlayerData = function () {
  let username = '';
  const currentPathId = RhythiaX.ProfilePageAdapter?.playerId?.() || window.location.pathname.match(/^\/player\/([^/]+)\/?$/)?.[1] || '';
  if (RhythiaX.profileHistoryContext?.playerId === currentPathId && RhythiaX.profileHistoryContext?.player?.username && RhythiaX.profileHistoryContext.player.username !== 'Unknown') {
    username = RhythiaX.profileHistoryContext.player.username;
  }
  if (!username) {
    const candidates = RhythiaX.qsa('.text-2xl.font-bold, .text-xl.font-bold, h1, [class*="font-bold"][class*="text-2xl"]');
    for (const el of candidates) {
      if (el.querySelector('a[href*="/clans/"], img[src*="user-avatar"]') || el.closest('a[href*="/clans/"]')) continue;
      if (el.querySelector('button[aria-label*="username" i], svg.lucide-info')) continue;
      if (el.classList?.contains('shrink-0') && el.querySelector('img')) continue;
      const text = el.textContent?.trim() || '';
      if (text && !/^show previous usernames/i.test(text) && !/^clan\b/i.test(text)) {
        username = text;
        break;
      }
    }
  }
  if (!username) username = 'Unknown';
  const flagImg = RhythiaX.qs('img[src*="/flags/"]') || RhythiaX.qs('img[src*=".svg"]');
  const country = flagImg?.src?.match(/\/([A-Z]{2})\.svg/)?.[1] || '';
  const avatar = RhythiaX.qsa('img[src*="user-avatar"]').find(img => (
    String(img.className || '').includes('md:size-[150px]') || String(img.className || '').includes('rounded-')
  ))?.src || RhythiaX.qs('img[src*="user-avatar"]')?.src || '';
  const bio = RhythiaX.qs('.prose p, .prose')?.textContent?.trim() || '';

  let globalRank = '', countryRank = '', rp = '';

  // 1. Header Rank & RP Area (New Single-Column Layout)
  const headerRankArea = RhythiaX.findHeaderRankArea();
  if (headerRankArea) {
    const cards = RhythiaX.qsa('button, div', headerRankArea);
    // Global
    const globalLabel = cards.find(el => el.textContent.trim().toLowerCase() === 'global');
    if (globalLabel) {
      const parent = globalLabel.closest('button') || globalLabel.parentElement;
      if (parent) {
        globalRank = extractCleanRankText(parent);
      }
    }
    // Country
    const countryLabel = cards.find(el => el.textContent.trim().toLowerCase() === 'country');
    if (countryLabel) {
      const parent = countryLabel.closest('button') || countryLabel.parentElement;
      if (parent) {
        countryRank = extractCleanRankText(parent);
      }
    }
    // RP
    const rpLabel = cards.find(el => el.textContent.trim().toLowerCase() === 'rhythm points');
    if (rpLabel) {
      const card = rpLabel.closest('.rounded-lg, [class*="rounded-"]') || rpLabel.parentElement;
      const valEl = card?.querySelector('.tabular-nums, [class*="tabular-nums"], [class*="text-lg"], [class*="text-xl"]')
        || (card?.children && card.children.length > 1 ? card.children[1] : null)
        || card?.lastElementChild;
      if (valEl && valEl !== rpLabel) rp = profileDisplayNumber(valEl);
    }
  }

  // Header RP Fallback if not found in headerRankArea
  if (!rp) {
    const header = RhythiaX.qs('.max-w-\\[1120px\\], .max-w-\\[1100px\\], main') || document;
    const anyRpLabel = RhythiaX.qsa('div, span, p', header).find(el => el.textContent.trim().toLowerCase() === 'rhythm points');
    if (anyRpLabel) {
      const card = anyRpLabel.closest('.rounded-lg, [class*="rounded-"]') || anyRpLabel.parentElement;
      const valEl = card?.querySelector('.tabular-nums, [class*="tabular-nums"], [class*="text-lg"], [class*="text-xl"]')
        || (card?.children && card.children.length > 1 ? card.children[1] : null)
        || card?.lastElementChild;
      if (valEl && valEl !== anyRpLabel) rp = profileDisplayNumber(valEl);
    }
  }

  // Global / Country / RP Fallback
  if (!globalRank || !countryRank) {
    const header = RhythiaX.qs('.max-w-\\[1120px\\], .max-w-\\[1100px\\], main') || document;
    if (!globalRank) {
      const globalButton = RhythiaX.qsa('button, div', header).find(b => b.textContent.includes('Global') && b.textContent.includes('#'));
      if (globalButton) {
        globalRank = extractCleanRankText(globalButton);
      }
    }
    if (!countryRank) {
      const countryButton = RhythiaX.qsa('button, div', header).find(b => b.textContent.includes('Country') && b.textContent.includes('#'));
      if (countryButton) {
        countryRank = extractCleanRankText(countryButton);
      }
    }
  }

  let playCount = '', squaresHit = '', avgAccuracy = '';
  const statsBox = RhythiaX.findOfficialStatsContainer();
  if (statsBox) {
    // New layout: grid with items containing label + value
    const statBlocks = RhythiaX.qsa('div', statsBox).filter(el => {
      const text = el.children[0]?.textContent?.trim().toLowerCase();
      return text && (text === 'play count' || text === 'squares hit' || text === 'avg. accuracy' || text === 'avg. rp' || text === 'rhythm points' || text === 'weighted rp');
    });

    statBlocks.forEach(block => {
      const label = block.children[0]?.textContent?.trim().toLowerCase();
      const valEl = block.children[block.children.length - 1];
      if (label === 'play count') playCount = RhythiaX.parseStatNumber(valEl);
      if (label === 'squares hit') {
        const parsedSquares = RhythiaX.parseStatNumber(valEl);
        squaresHit = parsedSquares > 0 ? String(parsedSquares) : '';
      }
      if (label === 'avg. accuracy') {
        const parsedAccuracy = profileDisplayNumber(valEl);
        avgAccuracy = RhythiaX.normalizeDataMetricValue ? (RhythiaX.normalizeDataMetricValue('avgAccuracy', parsedAccuracy) ?? '') : parsedAccuracy;
      }
      // Only match actual rhythm points or weighted rp, NEVER avg. rp (which is average RP per play ~300)
      if (!rp && (label === 'rhythm points' || label === 'weighted rp')) {
        rp = profileDisplayNumber(valEl);
      }
    });

    // Old layout row fallback (.space-y-3 > div)
    if (!playCount || !squaresHit) {
      RhythiaX.qsa('.space-y-3 > div', statsBox).forEach(row => {
        if (row.classList.contains('rhythiax-injected-stats-section') || row.classList.contains('rhythiax-history-row')) return;
        const label = row.children[0]?.textContent?.trim().toLowerCase();
        const valueEl = row.children[row.children.length - 1];
        if (!rp && (label === 'rhythm points' || label === 'weighted rp')) rp = profileDisplayNumber(valueEl);
        if (label === 'play count') playCount = RhythiaX.parseStatNumber(valueEl);
        if (label === 'squares hit') {
          const parsedSquares = RhythiaX.parseStatNumber(valueEl);
          squaresHit = parsedSquares > 0 ? String(parsedSquares) : '';
        }
        if (label === 'avg. accuracy') {
          const parsedAccuracy = profileDisplayNumber(valueEl);
          avgAccuracy = RhythiaX.normalizeDataMetricValue ? (RhythiaX.normalizeDataMetricValue('avgAccuracy', parsedAccuracy) ?? '') : parsedAccuracy;
        }
      });
    }
  }

  // Sidebar Fallback for older DOM versions
  const sidebar = RhythiaX.qs('.lg\\:col-span-3');
  if (sidebar && (!rp || !playCount)) {
    const lines = sidebar.textContent.split('\n').map(l => l.trim()).filter(Boolean);
    for (let i = 0; i < lines.length; i++) {
      if (!rp && lines[i] === 'RP' && i + 1 < lines.length) rp = profileDisplayNumber(lines[i + 1]);
      if (!playCount && lines[i] === 'Play count' && i + 1 < lines.length) playCount = lines[i + 1].replace(/[, ]/g, '');
      if (!squaresHit && lines[i] === 'Squares hit' && i + 1 < lines.length) {
        const parsedSquares = Number(lines[i + 1].replace(/[, ]/g, ''));
        squaresHit = Number.isFinite(parsedSquares) && parsedSquares > 0 ? String(parsedSquares) : '';
      }
    }
  }

  return { username, country, avatar, bio, globalRank, countryRank, rp, playCount, squaresHit, avgAccuracy };
};

// ─── Header glow ─────────────────────────────
RhythiaX.enhanceProfileHeader = function () {
  const header = RhythiaX.qs('.mx-auto.max-w-\\[1100px\\] > div > div:first-child');
  if (header && !header.classList.contains('profile-header-glow')) {
    header.classList.add('profile-header-glow');
    RhythiaX.log('Added profile header glow');
  }
};

// ─── Shuriel's crown Easter egg ───────────────
RhythiaX.injectProfileCrown = function () {
  if (RhythiaX.isModuleEnabled?.('easterEggs') === false) return;
  const path = window.location.pathname;
  if (!/^\/player\/255585(?:\/|$)/.test(path)) return;
  if (RhythiaX.profileCrownRollPath !== path) {
    RhythiaX.profileCrownRollPath = path;
    RhythiaX.profileCrownEnabled = Math.random() < getProfileEasterEggChance('255585');
  }
  if (!RhythiaX.profileCrownEnabled) return;
  if (RhythiaX.qs('.rhythiax-profile-crown')) return;

  const avatar = RhythiaX.qsa('img[src*="user-avatar"][src*="-255585"]')
    .find(img => img.closest('.relative.shrink-0'));
  const avatarWrapper = avatar?.closest('.relative');
  if (!avatarWrapper) return;

  const crown = document.createElement('div');
  crown.className = 'rhythiax-profile-crown';
  crown.setAttribute('aria-label', 'Crown');
  crown.innerHTML = '<svg viewBox="0 0 64 48" aria-hidden="true"><path d="M5 10 17 20 32 5l15 15 12-10-5 30H10L5 10Z"></path><path class="rhythiax-profile-crown__base" d="M9 37h46v6H9z"></path><circle cx="5" cy="10" r="3"></circle><circle cx="32" cy="5" r="3"></circle><circle cx="59" cy="10" r="3"></circle></svg>';
  avatarWrapper.appendChild(crown);
};

// ─── Creator of Reimagined Badge (Easter egg) ─
RhythiaX.injectProfileCreatorBadge = function () {
  const path = window.location.pathname;
  if (!/^\/player\/255585(?:\/|$)/.test(path)) return;
  if (RhythiaX.qs('.rhythiax-creator-badge')) return;

  const flagImg = RhythiaX.qs('img[src*="/flags/"]');
  const flagLink = flagImg?.closest('a[href*="/leaderboards/"]') || flagImg?.closest('a');
  const metaRow = flagLink?.parentElement
    || RhythiaX.qs('.flex.flex-wrap.items-center.gap-2:has(img[src*="/flags/"])')
    || RhythiaX.qs('div.mt-1.flex.min-w-0.flex-wrap.items-center.gap-2')
    || RhythiaX.qs('.mx-auto.max-w-\\[1100px\\] .flex.flex-wrap.items-center.gap-2');

  if (!metaRow) return;

  const badge = document.createElement('div');
  badge.className = 'rhythiax-creator-badge';
  badge.setAttribute('tabindex', '0');
  badge.setAttribute('role', 'img');
  badge.setAttribute('aria-label', 'Creator of Reimagined');
  badge.innerHTML = `
    <div class="rhythiax-creator-badge__icon-wrap">
      <svg class="rhythiax-creator-badge__icon" viewBox="0 0 512 512" aria-hidden="true">
        <defs>
          <path id="rhythiax-creator-r" d="M119 74h177c75 0 126 41 126 111 0 48-24 82-67 99l80 118H304l-66-105h-44v105H119V74Zm75 65v95h94c39 0 59-17 59-48 0-31-20-47-59-47h-94Z"/>
          <linearGradient id="rhythiax-creator-rim-t" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="40%" stop-color="#d8b4fe"/>
            <stop offset="100%" stop-color="#9333ea"/>
          </linearGradient>
          <linearGradient id="rhythiax-creator-rim-b" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#6b21a8"/>
            <stop offset="100%" stop-color="#19022b"/>
          </linearGradient>
          <linearGradient id="rhythiax-creator-center" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#a855f7"/>
            <stop offset="50%" stop-color="#7e22ce"/>
            <stop offset="100%" stop-color="#4c1d95"/>
          </linearGradient>
          <linearGradient id="rhythiax-creator-r-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffffff"/>
            <stop offset="60%" stop-color="#fdf4ff"/>
            <stop offset="100%" stop-color="#f3e8ff"/>
          </linearGradient>
        </defs>
        <polygon points="256,40 472,256 256,472 40,256" fill="#000000" opacity="0.6" transform="translate(0, 16)"/>
        <polygon points="256,36 476,256 256,476 36,256" fill="url(#rhythiax-creator-rim-b)"/>
        <polygon points="256,36 476,256 410,256 256,102 102,256 36,256" fill="url(#rhythiax-creator-rim-t)"/>
        <polygon points="256,36 476,256 256,476 36,256" fill="none" stroke="#e9d5ff" stroke-width="4" opacity="0.85"/>
        <polygon points="256,96 416,256 256,416 96,256" fill="#140224"/>
        <polygon points="256,102 410,256 256,410 102,256" fill="url(#rhythiax-creator-center)"/>
        <polyline points="108,256 256,108 404,256" fill="none" stroke="#ffffff" stroke-width="4" opacity="0.6"/>
        <use href="#rhythiax-creator-r" fill="#0b0117" transform="translate(0, 12)"/>
        <use href="#rhythiax-creator-r" fill="none" stroke="#120224" stroke-width="24" stroke-linejoin="round"/>
        <use href="#rhythiax-creator-r" fill="url(#rhythiax-creator-r-gradient)"/>
        <path d="M119 74h177c75 0 126 41 126 111 0 6 0 12-2 18-8-60-56-96-124-96H119V74Z" fill="#ffffff" opacity="0.9"/>
      </svg>
    </div>
    <div class="rhythiax-creator-badge__tooltip" role="tooltip">
      <span class="rhythiax-creator-badge__text">Creator of <span class="rhythiax-creator-badge__highlight">Reimagined</span></span>
    </div>
  `.trim();

  if (flagLink && flagLink.isConnected && flagLink.parentElement === metaRow) {
    flagLink.insertAdjacentElement('afterend', badge);
  } else {
    metaRow.appendChild(badge);
  }
};

// ─── Player-specific profile effects ────────────
RhythiaX.injectProfileAvatarEffects = function () {
  if (RhythiaX.isModuleEnabled?.('easterEggs') === false) return;
  const playerId = window.location.pathname.match(/^\/player\/([^/]+)/)?.[1];
  if (playerId !== '5602' && playerId !== '147') return;
  if (RhythiaX.profileAvatarEffectRollPath !== window.location.pathname) {
    RhythiaX.profileAvatarEffectRollPath = window.location.pathname;
    RhythiaX.profileAvatarEffectEnabled = Math.random() < getProfileEasterEggChance(playerId);
  }
  if (!RhythiaX.profileAvatarEffectEnabled) return;
  if (RhythiaX.qs(`.rhythiax-profile-avatar-effect[data-player-id="${playerId}"]`)) return;

  const avatar = RhythiaX.qsa('img[src*="user-avatar"]')
    .find(img => img.closest('.relative.shrink-0'));
  const avatarWrapper = avatar?.closest('.relative');
  if (!avatarWrapper) return;

  const effect = document.createElement('div');
  effect.className = `rhythiax-profile-avatar-effect rhythiax-profile-avatar-effect--${playerId === '5602' ? 'uwu' : 'hair'}`;
  effect.dataset.playerId = playerId;
  effect.setAttribute('aria-hidden', 'true');

  if (playerId === '5602') {
    effect.innerHTML = '<span class="rhythiax-profile-uwu-label"><span class="rhythiax-profile-uwu-face"><span class="rhythiax-profile-uwu-text">UwU...</span></span></span><i class="rhythiax-profile-uwu-spark rhythiax-profile-uwu-spark--a"></i><i class="rhythiax-profile-uwu-spark rhythiax-profile-uwu-spark--b"></i><i class="rhythiax-profile-uwu-spark rhythiax-profile-uwu-spark--c"></i>';
  } else {
    effect.innerHTML = '<span class="rhythiax-profile-wind-line rhythiax-profile-wind-line--one"></span><span class="rhythiax-profile-wind-line rhythiax-profile-wind-line--two"></span><span class="rhythiax-profile-wind-line rhythiax-profile-wind-line--three"></span><svg class="rhythiax-profile-hair" viewBox="0 0 240 170" aria-hidden="true"><defs><linearGradient id="rhythiax-profile-hair-red" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffb066"></stop><stop offset=".32" stop-color="#e95747"></stop><stop offset=".72" stop-color="#a3223b"></stop><stop offset="1" stop-color="#54152e"></stop></linearGradient><linearGradient id="rhythiax-profile-hair-light" x1="0" y1="0" x2="1" y2="0"><stop stop-color="#ffd18a" stop-opacity=".95"></stop><stop offset="1" stop-color="#ee6471" stop-opacity=".05"></stop></linearGradient></defs><path class="rhythiax-profile-hair-lock rhythiax-profile-hair-lock--one" fill="url(#rhythiax-profile-hair-red)" stroke="#6f1c32" stroke-width="2" d="M39 121C17 98 18 58 46 33 65 16 91 15 111 27 87 40 76 57 79 77c3 23-9 42-40 44Z"></path><path class="rhythiax-profile-hair-lock rhythiax-profile-hair-lock--two" fill="url(#rhythiax-profile-hair-red)" stroke="#741b31" stroke-width="2" d="M58 113C43 84 51 43 81 22c24-17 52-12 67 1-24 9-37 28-35 49 3 27-19 42-55 41Z"></path><path class="rhythiax-profile-hair-lock rhythiax-profile-hair-lock--three" fill="url(#rhythiax-profile-hair-red)" stroke="#7d1f34" stroke-width="2" d="M88 102C76 69 91 27 123 17c27-8 50 7 57 24-26 0-42 17-41 40 1 17-17 29-51 21Z"></path><path class="rhythiax-profile-hair-lock rhythiax-profile-hair-lock--four" fill="url(#rhythiax-profile-hair-red)" stroke="#68192f" stroke-width="2" d="M118 102c-2-27 15-56 43-64 27-8 47 7 48 24-22 6-31 22-27 42 3 16-24 24-64-2Z"></path><path class="rhythiax-profile-hair-lock rhythiax-profile-hair-lock--five" fill="url(#rhythiax-profile-hair-red)" stroke="#5e172d" stroke-width="2" d="M147 117c12-25 32-41 62-41 17 0 27 11 24 23-24 2-37 13-44 31-7 17-28 13-42-13Z"></path><path class="rhythiax-profile-hair-shine" fill="none" stroke="url(#rhythiax-profile-hair-light)" stroke-linecap="round" stroke-width="5" d="M56 66c17-27 37-37 60-39M91 74c11-25 27-36 48-41M137 76c9-17 22-26 39-29"></path></svg>';
  }

  avatarWrapper.classList.add('rhythiax-profile-avatar-effect-host');
  avatarWrapper.appendChild(effect);
};

RhythiaX.enhanceHeaderDeltas = function (playerId) {
  if (!playerId) return;
  RhythiaX.removeNativeRankDeltas?.(document);
};

RhythiaX.enhanceTitleProgression = function (player, scoreSets) {
  const card = RhythiaX.ProfilePageAdapter?.titleProgressionCard?.() || RhythiaX.TitleProgression?.Service?.findNativeTitleCard?.(document);
  if (!card) return;

  const showProgression = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showProgression') : true;
  const showHistory = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showHistory') : true;
  const isEnabled = RhythiaX.isModuleEnabled ? RhythiaX.isModuleEnabled('titleProgression') : true;

  if (!isEnabled || (!showProgression && !showHistory)) {
    RhythiaX.TitleProgression?.Service?.unmount?.(card);
    RhythiaX.TitleProgression?.Service?.cleanup?.();
    return;
  }
  const sets = scoreSets || RhythiaX.profileHistoryContext?.scoreSets;
  RhythiaX.TitleProgression?.Service?.mount?.(card, player, sets);
};

// DOM can still belong to the previous player while the SPA route already
// points elsewhere. Only an ID-checked profile response owns these metrics.
RhythiaX.profilePlayerFromApi = function (playerId, profile, mode = 'normal') {
  if (!profile || String(profile.id) !== String(playerId)) return null;
  const prefix = mode === 'spin' || mode === 'vr' ? `${mode}_` : '';
  const points = profile[`${prefix}skill_points`];
  const rank = profile[`${prefix}position`];
  const countryRank = profile[`${prefix}country_position`];
  return {
    id: String(playerId),
    profileMode: prefix ? mode : 'normal',
    username: String(profile.username || 'Unknown').trim(),
    country: String(profile.flag || profile.country || '').trim(),
    avatar: profile.avatar_url || profile.profile_image || '',
    bio: String(profile.about_me || ''),
    rp: points == null ? '' : String(points),
    playCount: prefix || profile.play_count == null ? '' : String(profile.play_count),
    squaresHit: prefix || profile.squares_hit == null ? '' : String(profile.squares_hit),
    globalRank: rank == null ? '' : '#' + rank,
    countryRank: countryRank == null ? '' : '#' + countryRank,
    // Both the cards and the history calculate accuracy from the same score
    // response, never from a native/injected row left by another render.
    avgAccuracy: '',
    rankHistory: prefix ? null : profile.rank_history,
    created_at: profile.created_at,
    userProfile: prefix ? { ...profile, skill_points: points, position: rank, country_position: countryRank, rank_history: null } : profile,
  };
};

RhythiaX.profileScoreSetsForMode = function (sets, mode) {
  if (!sets || (mode !== 'spin' && mode !== 'vr')) return sets;
  const topScores = sets[`${mode}TopScores`] || [];
  return { ...sets, stats: null, scores: topScores, ratingScores: topScores,
    topScores, recentScores: sets[`${mode}RecentScores`] || [], reignScores: [],
    topScoreCount: topScores.length, isLoading: false };
};

// ─── Full injection for profile page ─────────
RhythiaX.injectProfile = function () {
  (RhythiaX.dataCanonicalWrite ? RhythiaX.maintainDataHistory?.() : Promise.resolve())?.catch(error => console.warn("RhythiaX: History maintenance failed:", error));
  if (RhythiaX.injected) {
    return;
  }

  const officialStats = RhythiaX.ProfilePageAdapter.officialStats();
  const headerArea = RhythiaX.ProfilePageAdapter.headerRankArea();

  RhythiaX.log('injectProfile — official stats:', !!officialStats, 'header area:', !!headerArea);

  if (!officialStats && !headerArea) {
    RhythiaX.log('Profile not ready yet');
    return false;
  }

  // Clean up any stale injected elements before re-rendering
  RhythiaX.cleanupStaleElements();

  RhythiaX.log('=== INJECTING PROFILE ===');
  const playerId = RhythiaX.ProfilePageAdapter.playerId();
  const player = {};
  // Native score cards can also be left over from the previous route.
  const scores = [];
  RhythiaX.log('Profile page data parsed', { scoreCount: scores.length });

  const navigationToken = RhythiaX.navigationToken;
  const profileSearch = window.location.search;
  const requestedMode = new URLSearchParams(profileSearch || '').get('mode');
  const profileMode = requestedMode === 'spin' || requestedMode === 'vr' ? requestedMode : 'normal';
  const isNormalProfile = profileMode === 'normal';
  const isCurrentProfile = () => navigationToken === RhythiaX.navigationToken
    && window.location.search === profileSearch
    && String(RhythiaX.ProfilePageAdapter.playerId()) === String(playerId);
  const dataVisitId = `${playerId || 'profile'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const renderProfile = (scoreSets, renderMode, renderPlayer = player) => {
    if (!isCurrentProfile() || String(renderPlayer.id) !== String(playerId)) return false;
    scoreSets = RhythiaX.profileScoreSetsForMode(scoreSets, profileMode);
    const hasApiData = scoreSets && (scoreSets.scores?.length > 0 || !isNormalProfile);
    const isInitialRender = renderMode === 'initial';
    const isCacheRender = renderMode === 'cache';
    if (!isInitialRender) RhythiaX.cleanupStaleElements(true);
    const initialScores = scores || [];
    const initialTopScores = initialScores.filter(s => s.scoreType === 'top' || !s.scoreType);
    const initialReignScores = initialScores.filter(s => s.scoreType === 'reign');
    const initialRecentScores = initialScores.filter(s => s.scoreType === 'recent');
    const data = hasApiData
      ? (isCacheRender ? scoreSets : RhythiaX.mergeWeightedRp(scoreSets, scores))
      : {
          isLoading: !initialScores.length,
          scores: initialScores,
          ratingScores: initialScores,
          topScores: initialTopScores,
          reignScores: initialReignScores,
          recentScores: initialRecentScores
        };
    const accuracy = RhythiaX.StatisticsDomain.averageAccuracy(data.scores || [], { avgAccuracy: '' });
    renderPlayer.avgAccuracy = accuracy === '—' ? '' : Number(accuracy);
    RhythiaX.profileHistoryContext = { playerId, player: renderPlayer, scoreSets: data };
    const renderScores = data.scores || [];
    RhythiaX.log('Rendering profile with', renderScores.length, 'scores, mode:', renderMode);
    if (!RhythiaX.buildStatsPanel(renderPlayer, renderScores, renderPlayer.rp, 'profile', data.ratingScores, { deferProfiles: isInitialRender })) {
      RhythiaX.error('Profile stats were not ready after data loading');
      RhythiaX.clearLoadingState();
      return false;
    }
    const dataCapture = (isNormalProfile && !isCacheRender && hasApiData)
      ? Promise.resolve(RhythiaX.recordProfileDataCapture?.(playerId, renderPlayer, data, {
          visitId: dataVisitId,
          source: isInitialRender ? 'dom' : 'api',
          isCurrentProfile,
          verifiedProfile: true,
        }))
      : Promise.resolve(null);
    dataCapture.catch(error => {
      if (navigationToken === RhythiaX.navigationToken) RhythiaX.captureError(error, 'New profile data capture failed');
    });

    if (isInitialRender || isCacheRender) {
      const enhanceInitialView = () => {
        if (!isCurrentProfile()) {
          return;
        }
        if (isNormalProfile && !data.isLoading) {
          RhythiaX.enhanceHeaderDeltas?.(playerId, renderPlayer);
        }
        RhythiaX.enhanceTitleProgression?.(renderPlayer, data);
        RhythiaX.enhanceProfileHeader?.();
        RhythiaX.injectProfileCrown?.();
        RhythiaX.injectProfileCreatorBadge?.();
        RhythiaX.injectProfileAvatarEffects?.();
        RhythiaX.enhanceOwnFriendsCounter?.();
        RhythiaX.injectDeferredStatsProfiles?.(renderScores, data.ratingScores, 'profile');
      };
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(enhanceInitialView);
      else window.setTimeout(enhanceInitialView, 0);
    }
    // Mount the unified Scores Hub with tabs, 20-items pagination, and instant search
    RhythiaX.mountScoresHub?.(data);
    dataCapture.then(result => {
      if (!isCurrentProfile() || !isNormalProfile) return;
      return RhythiaX.applyProfileHistoryIndicators?.(playerId, result?.snapshot);
    }).then(() => {
      if (!isCurrentProfile() || !isNormalProfile) return;
      const rankingPane = document.querySelector('.rhythiax-pane-ranking');
      if (rankingPane && (rankingPane.dataset.renderedPlayer !== String(playerId) || !rankingPane.hasChildNodes())) {
        rankingPane.dataset.renderedPlayer = String(playerId);
        RhythiaX.renderInlineRankHistory?.(rankingPane, playerId);
      }
      const historyPane = document.querySelector('.rhythiax-pane-stats .rhythiax-history-pane');
      if (historyPane && (historyPane.dataset.renderedPlayer !== String(playerId) || !historyPane.hasChildNodes())) {
        historyPane.dataset.renderedPlayer = String(playerId);
        RhythiaX.renderInlineProgressHistory?.(historyPane, playerId);
      }
    }).catch(error => {
      if (navigationToken === RhythiaX.navigationToken && !/Extension context invalidated/i.test(String(error?.message || error))) {
        RhythiaX.captureError(error, 'Profile history indicators failed');
      }
    });
    return true;
  };

  // Instant cache hydration or initial skeleton state (prevents layout shifts and fake data)
  const cachedScoreSets = playerId ? RhythiaX.getCachedPlayerScoreSets?.(playerId) : null;
  const cachedProfile = playerId ? RhythiaX.getCachedUserProfile?.(playerId) : null;

  const cachedPlayer = RhythiaX.profilePlayerFromApi(playerId, cachedProfile, profileMode);
  const rendered = cachedPlayer && cachedScoreSets
    ? renderProfile(cachedScoreSets, 'cache', cachedPlayer) : false;

  if (!playerId) {
    RhythiaX.log('=== PROFILE INJECTION COMPLETE ===');
    return Boolean(rendered);
  }

  // Mark the request in progress so readiness retries cannot capture stale DOM.
  RhythiaX.injected = true;
  const pendingProfile = { playerId, navigationToken };
  RhythiaX.profileRequestContext = pendingProfile;

  const controller = new AbortController();
  RhythiaX.apiAbortController = controller;
  Promise.all([
    RhythiaX.fetchPlayerScoreSets(playerId, controller.signal),
    RhythiaX.fetchUserProfile ? RhythiaX.fetchUserProfile(playerId, controller.signal) : Promise.resolve(null),
  ]).then(([scoreSets, userProfile]) => {
    if (!isCurrentProfile()) return;
    const updatedPlayer = RhythiaX.profilePlayerFromApi(playerId, userProfile, profileMode);
    if (scoreSets && updatedPlayer) {

      renderProfile(scoreSets, 'api', updatedPlayer);
      const modeScoreSets = RhythiaX.profileScoreSetsForMode(scoreSets, profileMode);
      RhythiaX.profileHistoryContext = { playerId, player: updatedPlayer, scoreSets: modeScoreSets };
      RhythiaX.injectPlayerCompare?.(updatedPlayer);
      RhythiaX.enhanceTitleProgression?.(updatedPlayer, modeScoreSets);
      RhythiaX.reportVpsPlayerVisit?.(playerId);
    }
  }).catch(error => {
    if (!isCurrentProfile()) return;
    if (error?.name !== 'AbortError') {
      Promise.resolve(RhythiaX.recordProfileDataDiagnostic?.(playerId, {
        source: 'api',
        status: 'error',
        reason: 'api-error',
        code: 'api-error',
      })).catch(diagnosticError => RhythiaX.captureError(diagnosticError, 'Profile API diagnostic write failed'));
      RhythiaX.captureError(error, 'Profile data loading failed; keeping visible page data');
    }
  }).finally(() => {
    if (RhythiaX.apiAbortController === controller) RhythiaX.apiAbortController = null;
    if (RhythiaX.profileRequestContext === pendingProfile) RhythiaX.profileRequestContext = null;
  });
  RhythiaX.log('=== PROFILE DATA LOADING ===');
  return true;
};

RhythiaX.ProfilePageComposition = {
  install() {},
  extractPlayer: RhythiaX.extractPlayerData,
  enhanceHeader: RhythiaX.enhanceProfileHeader,
  enhanceTitleProgression: RhythiaX.enhanceTitleProgression,
  injectCrown: RhythiaX.injectProfileCrown,
  injectCreatorBadge: RhythiaX.injectProfileCreatorBadge,
  injectAvatarEffects: RhythiaX.injectProfileAvatarEffects,
  inject: RhythiaX.injectProfile,
};
