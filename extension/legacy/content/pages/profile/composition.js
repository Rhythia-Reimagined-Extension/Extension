// =============================================
// Reimagined for Rhythia — Classic's profile page: the player read from the API, then its Statistics, Scores
// Hub, title progression and profile extras built on Rhythia's page
// =============================================

var RhythiaX = RhythiaX || {};

RhythiaX.profileHistoryContext = null;
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
        if (row.classList.contains('rhythiax-history-row')) return;
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
      <img class="rhythiax-creator-badge__icon" src="${RhythiaX.APP_ICON || ''}" alt="">
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

// ─── Rhythia's own sections while Classic builds ─
// styles/bridge/anti-flicker.css hides Rhythia's score list and Statistics body from the first frame, until
// the Scores hub and the Statistics panel take their place. When a profile load ends, each part Classic did
// not build (no answer, no stats container, no column for the hub, module off) gets a mark on <html> that
// gives Rhythia's section back; a part it built keeps the hiding, so Rhythia's re-renders of it stay out of
// sight. content/bootstrap/changelog-early.js sets the same marks for a page opened on /player/.
const PROFILE_SECTION_RELEASES = {
  rhythiaxScoresReleased: '.rhythiax-scores-hub',
  rhythiaxStatsReleased: '.rhythiax-reimagined-stats-body',
};
let profileSectionsHiddenFor = null;

function releaseNativeProfileSections() {
  const marks = document.documentElement?.dataset;
  if (!marks) return;
  Object.entries(PROFILE_SECTION_RELEASES).forEach(([mark, built]) => {
    if (document.querySelector(built)) delete marks[mark];
    else marks[mark] = 'true';
  });
}

// Another profile (or mode) hides Rhythia's sections again; a retry for the same one keeps what was decided.
function hideNativeProfileSectionsAgain() {
  if (profileSectionsHiddenFor === RhythiaX.navigationToken) return;
  profileSectionsHiddenFor = RhythiaX.navigationToken;
  const marks = document.documentElement?.dataset;
  if (marks) Object.keys(PROFILE_SECTION_RELEASES).forEach(mark => delete marks[mark]);
}

// ─── Full injection for profile page ─────────
RhythiaX.injectProfile = function () {
  if (RhythiaX.injected) {
    return;
  }
  hideNativeProfileSectionsAgain();

  const officialStats = RhythiaX.ProfilePageAdapter.officialStats();
  const headerArea = RhythiaX.ProfilePageAdapter.headerRankArea();

  RhythiaX.log('injectProfile — official stats:', !!officialStats, 'header area:', !!headerArea);

  if (!officialStats && !headerArea) {
    RhythiaX.log('Profile not ready yet');
    return false;
  }

  // Once the page is ready, not on every attempt before it: each run reads the stored history records.
  (RhythiaX.dataCanonicalWrite ? RhythiaX.maintainDataHistory?.() : Promise.resolve())?.catch(error => console.warn("RhythiaX: History maintenance failed:", error));

  // Clean up any stale injected elements before re-rendering
  RhythiaX.cleanupStaleElements();

  RhythiaX.log('=== INJECTING PROFILE ===');
  const playerId = RhythiaX.ProfilePageAdapter.playerId();

  const navigationToken = RhythiaX.navigationToken;
  const profileSearch = window.location.search;
  const requestedMode = new URLSearchParams(profileSearch || '').get('mode');
  const profileMode = requestedMode === 'spin' || requestedMode === 'vr' ? requestedMode : 'normal';
  const isNormalProfile = profileMode === 'normal';
  const isCurrentProfile = () => navigationToken === RhythiaX.navigationToken
    && window.location.search === profileSearch
    && String(RhythiaX.ProfilePageAdapter.playerId()) === String(playerId);
  const dataVisitId = `${playerId || 'profile'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  // keep: the page already shows exactly this data (painted from the cache), so the panels stay as they
  // are and only the work that needs the fresh answer runs (history capture, indicators, history panes).
  const renderProfile = (scoreSets, renderMode, renderPlayer, keep = false) => {
    if (!isCurrentProfile() || String(renderPlayer?.id) !== String(playerId)) return false;
    scoreSets = RhythiaX.profileScoreSetsForMode(scoreSets, profileMode);
    const hasApiData = scoreSets && (scoreSets.scores?.length > 0 || !isNormalProfile);
    const isCacheRender = renderMode === 'cache';
    if (!keep) RhythiaX.cleanupStaleElements(true);
    // A profile whose answer has no scores: an empty, finished list rather than loading placeholders.
    const data = hasApiData
      ? scoreSets
      : {
          isLoading: false,
          scores: [],
          ratingScores: [],
          topScores: [],
          reignScores: [],
          recentScores: []
        };
    const accuracy = RhythiaX.StatisticsDomain.averageAccuracy(data.scores || [], { avgAccuracy: '' });
    renderPlayer.avgAccuracy = accuracy === '—' ? '' : Number(accuracy);
    RhythiaX.profileHistoryContext = { playerId, player: renderPlayer, scoreSets: data };
    const renderScores = data.scores || [];
    RhythiaX.log('Rendering profile with', renderScores.length, 'scores, mode:', renderMode);
    if (!keep && !RhythiaX.buildStatsPanel(renderPlayer, renderScores, renderPlayer.rp, 'profile', data.ratingScores)) {
      RhythiaX.error('Profile stats were not ready after data loading');
      return false;
    }
    const dataCapture = (isNormalProfile && !isCacheRender && hasApiData)
      ? Promise.resolve(RhythiaX.recordProfileDataCapture?.(playerId, renderPlayer, data, {
          visitId: dataVisitId,
          source: 'api',
          isCurrentProfile,
          verifiedProfile: true,
        }))
      : Promise.resolve(null);
    dataCapture.catch(error => {
      if (navigationToken === RhythiaX.navigationToken) RhythiaX.captureError(error, 'New profile data capture failed');
    });

    if (isCacheRender) {
      const enhanceInitialView = () => {
        if (!isCurrentProfile()) {
          return;
        }
        if (isNormalProfile && !data.isLoading) {
          RhythiaX.enhanceHeaderDeltas?.(playerId, renderPlayer);
        }
        RhythiaX.enhanceTitleProgression?.(renderPlayer, data);
        RhythiaX.enhanceProfileHeader?.();
        RhythiaX.injectProfileCreatorBadge?.();
        RhythiaX.enhanceOwnFriendsCounter?.();
        RhythiaX.injectDeferredStatsProfiles?.(renderScores, data.ratingScores, 'profile');
      };
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(enhanceInitialView);
      else window.setTimeout(enhanceInitialView, 0);
    }
    // Mount the unified Scores Hub with tabs, pagination and instant search
    if (!keep) RhythiaX.mountScoresHub?.(data);
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
  // What the cache paint showed, to tell whether the fresh answer changes anything.
  const sameData = (sets, profile) => { try { return JSON.stringify([sets, profile]); } catch (_) { return ''; } };
  const cachedShown = cachedPlayer && cachedScoreSets ? sameData(cachedScoreSets, cachedProfile) : '';
  const rendered = cachedPlayer && cachedScoreSets
    ? renderProfile(cachedScoreSets, 'cache', cachedPlayer) : false;

  if (!playerId) {
    RhythiaX.log('=== PROFILE INJECTION COMPLETE ===');
    releaseNativeProfileSections();
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

      const unchanged = Boolean(rendered && cachedShown) && sameData(scoreSets, userProfile) === cachedShown;
      renderProfile(scoreSets, 'api', updatedPlayer, unchanged);
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
    // The load is over (drawn, no answer, or an error); a request cut short by leaving the page is not.
    if (isCurrentProfile()) releaseNativeProfileSections();
  });
  RhythiaX.log('=== PROFILE DATA LOADING ===');
  return true;
};

