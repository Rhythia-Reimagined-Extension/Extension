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

// ─── Extract player data (profile page) ──────
RhythiaX.extractPlayerData = function () {
  const username = RhythiaX.qs('.text-xl.font-bold')?.textContent?.trim() || 'Unknown';
  const flagImg = RhythiaX.qs('img[src*="/flags/"]') || RhythiaX.qs('img[src*=".svg"]');
  const country = flagImg?.src?.match(/\/([A-Z]{2})\.svg/)?.[1] || '';
  const avatar = RhythiaX.qsa('img[src*="user-avatar"]').find(img => (
    String(img.className || '').includes('md:size-[150px]')
  ))?.src || RhythiaX.qs('img[src*="user-avatar"]')?.src || '';
  const bio = RhythiaX.qs('.prose p')?.textContent?.trim() || '';

  let globalRank = '', countryRank = '';
  const globalLabel = RhythiaX.qsa('div, span').find(function (el) {
    return el.textContent.trim().toLowerCase() === 'global';
  });
  const rankGrid = globalLabel?.closest('[style*="grid-template-columns"]') || globalLabel?.parentElement?.parentElement;
  if (rankGrid) {
    const globalCard = globalLabel.closest('div.min-w-0') || globalLabel.parentElement;
    const globalButton = globalCard?.querySelector('button');
    globalRank = (RhythiaX.cleanStatValueString ? RhythiaX.cleanStatValueString(globalButton) : globalButton?.textContent?.trim()) || '';

    const rankButtons = RhythiaX.qsa('button', rankGrid).filter(function (button) {
      return button !== globalButton;
    });
    const countryButton = rankButtons.find(function (button) {
      const text = (RhythiaX.cleanStatValueString ? RhythiaX.cleanStatValueString(button) : button.textContent.trim());
      return text.startsWith('#');
    });
    countryRank = (RhythiaX.cleanStatValueString ? RhythiaX.cleanStatValueString(countryButton) : countryButton?.textContent?.trim()) || '';
  }

  let rp = '', playCount = '', squaresHit = '', avgAccuracy = '';
  const sidebar = RhythiaX.qs('.lg\\:col-span-3');
  if (sidebar) {
    // The responsive profile card contains both "Points" and "Rhythm Points"
    // labels. Read the value from that card before using broad sidebar fallbacks.
    const rhythmPointsLabel = RhythiaX.qsa('span, div').find(el => (
      el.textContent.trim().toLowerCase() === 'rhythm points'
      && el.closest('.min-w-0')
    ));
    const rhythmPointsCard = rhythmPointsLabel?.closest('.min-w-0');
    const rhythmPointsValue = rhythmPointsCard?.lastElementChild;
    if (rhythmPointsValue) {
      const parsedRp = profileDisplayNumber(rhythmPointsValue);
      if (parsedRp) rp = parsedRp;
    }

    // Try to find RP from the sidebar (the big RP number)
    const rpEl = sidebar.querySelector('[class*="text-4xl"]');
    if (!rp && rpEl) rp = profileDisplayNumber(rpEl);

    // Read the current label/value rows. The site formats large values with
    // non-breaking spaces, so parsing the complete card text is unreliable.
    const statsBox = RhythiaX.findOfficialStatsContainer();
    if (statsBox) {
      RhythiaX.qsa('.space-y-3 > div', statsBox).forEach(row => {
        if (row.classList.contains('rhythiax-injected-stats-section') || row.classList.contains('rhythiax-history-row')) return;
        const label = row.children[0]?.textContent?.trim().toLowerCase();
        const valueEl = row.children[row.children.length - 1];
        if (!rp && (label === 'rhythm points' || label === 'weighted rp')) rp = profileDisplayNumber(valueEl);
        if (label === 'play count') playCount = RhythiaX.parseStatNumber(valueEl);
        if (label === 'squares hit') squaresHit = RhythiaX.parseStatNumber(valueEl);
        if (label === 'avg. accuracy') {
          const parsedAccuracy = profileDisplayNumber(valueEl);
          avgAccuracy = RhythiaX.normalizeDataMetricValue
            ? (RhythiaX.normalizeDataMetricValue('avgAccuracy', parsedAccuracy) ?? '')
            : parsedAccuracy;
        }
      });
    }

    // Fallback: scan all text in sidebar
    if (!rp) {
      const lines = sidebar.textContent.split('\n').map(l => l.trim()).filter(Boolean);
      for (let i = 0; i < lines.length; i++) {
        if (lines[i] === 'RP' && i + 1 < lines.length) rp = profileDisplayNumber(lines[i + 1]);
        if (!playCount && lines[i] === 'Play count' && i + 1 < lines.length) playCount = lines[i + 1].replace(/[, ]/g, '');
        if (!squaresHit && lines[i] === 'Squares hit' && i + 1 < lines.length) squaresHit = lines[i + 1].replace(/[, ]/g, '');
      }
    }

    // Current profiles label the header value "Rhythm Points" instead of
    // exposing the old standalone "RP" element.
    if (!rp) {
      const rpLabel = RhythiaX.qsa('div, span').find(el => el.textContent.trim().toLowerCase() === 'rhythm points');
      const rpCard = rpLabel?.parentElement;
      const valueEl = rpCard?.children?.[rpCard.children.length - 1];
      if (valueEl && valueEl !== rpLabel) rp = profileDisplayNumber(valueEl);
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

// ─── Player-specific profile effects ────────────
RhythiaX.injectProfileAvatarEffects = function () {
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

RhythiaX.injectRankHistoryButton = function () {
  if (RhythiaX.qs('.rhythiax-rank-history-trigger')) return;
  const globalLabel = RhythiaX.qsa('div, span').find(el => el.textContent.trim().toLowerCase() === 'global');
  const rankGrid = globalLabel?.closest('[style*="grid-template-columns"]') || globalLabel?.parentElement?.parentElement;
  if (!rankGrid || rankGrid.children.length < 3) return;

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'rhythiax-rank-history-trigger';
  trigger.setAttribute('aria-label', 'Show ranking history');
  trigger.title = 'Ranking history';
  trigger.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="12" r="4.5"></circle><path d="M8 9.5V12l1.8 1.2M12.5 17l2.8-3.5 2 1.5 3.2-4.5M18.5 10.5h2v2"></path></svg>';
  trigger.addEventListener('click', event => {
    event.preventDefault();
    event.stopPropagation();
    RhythiaX.showRankHistory();
  });

  rankGrid.classList.add('rhythiax-rank-grid-with-history');
  rankGrid.appendChild(trigger);
};

// ─── Full injection for profile page ─────────
RhythiaX.injectProfile = function () {
  if (RhythiaX.injected) {
    return;
  }
  if (RhythiaX.qs('.rhythiax-stats-panel') || RhythiaX.qs('.rhythiax-injected-stats-section')) {
    RhythiaX.injected = true;
    return;
  }

  const sidebar = RhythiaX.ProfilePageAdapter.sidebar();
  const content = RhythiaX.ProfilePageAdapter.content();
  const scoreCards = RhythiaX.ProfilePageAdapter.scoreCards();
  const officialStats = RhythiaX.ProfilePageAdapter.officialStats();

  RhythiaX.log('injectProfile — sidebar:', !!sidebar, 'content:', !!content, 'official stats:', !!officialStats, 'score cards:', scoreCards.length);

  if (!sidebar || !content || !officialStats || scoreCards.length === 0) {
    RhythiaX.log('Profile not ready yet');
    return false;
  }

  // Clean up any stale injected elements before re-rendering
  RhythiaX.cleanupStaleElements();

  RhythiaX.log('=== INJECTING PROFILE ===');
    const player = RhythiaX.extractPlayerData();
    RhythiaX.injectPlayerCompare(player);
  const scores = RhythiaX.extractScores();
  RhythiaX.log('Profile page data parsed', { scoreCount: scores.length });

  const playerId = RhythiaX.ProfilePageAdapter.playerId();
  const navigationToken = RhythiaX.navigationToken;
  const titleProgressionVisit = RhythiaX.beginTitleProgressionVisit?.(playerId, player);
  const dataVisitId = titleProgressionVisit?.visitId
    || `${playerId || 'profile'}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const renderProfile = (scoreSets, renderMode, renderPlayer = player) => {
    if (navigationToken !== RhythiaX.navigationToken) return;
    const hasApiData = scoreSets && scoreSets.scores?.length > 0;
    const isInitialRender = renderMode === 'initial';
    if (!isInitialRender) RhythiaX.cleanupStaleElements(true);
    const data = hasApiData
      ? (renderMode === 'cache' ? scoreSets : RhythiaX.mergeWeightedRp(scoreSets, scores))
      : { scores, ratingScores: scores };
    RhythiaX.profileHistoryContext = { playerId, player: renderPlayer, scoreSets: data };
    const renderScores = data.scores;
    RhythiaX.log('Rendering profile with', renderScores.length, 'scores');
    if (!RhythiaX.buildStatsPanel(renderPlayer, renderScores, renderPlayer.rp, 'profile', data.ratingScores, { deferProfiles: isInitialRender })) {
      RhythiaX.error('Profile stats were not ready after data loading');
      RhythiaX.clearLoadingState();
      return;
    }
    const dataCapture = Promise.resolve(RhythiaX.recordProfileDataCapture?.(playerId, renderPlayer, data, {
      visitId: dataVisitId,
      source: isInitialRender ? 'dom' : 'api',
    }));
    dataCapture.catch(error => {
      if (navigationToken === RhythiaX.navigationToken) RhythiaX.captureError(error, 'New profile data capture failed');
    });
    if (!document.querySelector('.rhythiax-accordion')) {
      RhythiaX.wrapTitleProgression?.(renderPlayer.rp, renderPlayer.globalRank);
      if (isInitialRender) RhythiaX.animateTitleProgressionFromCache?.(playerId, renderPlayer.rp, renderPlayer.globalRank, titleProgressionVisit);
    }
    if (isInitialRender) RhythiaX.recordTitleProgressionSnapshot?.(titleProgressionVisit, renderPlayer, 'initial');
    if (isInitialRender) {
      const enhanceInitialView = () => {
        if (navigationToken !== RhythiaX.navigationToken) {
          return;
        }
        RhythiaX.injectRankHistoryButton();
        RhythiaX.enhanceProfileHeader();
        RhythiaX.injectProfileCrown();
        RhythiaX.injectProfileAvatarEffects();
        RhythiaX.enhanceOwnFriendsCounter?.();
        RhythiaX.enhanceScoreCards();
        RhythiaX.injectAbsoluteDates();
        RhythiaX.injectDeferredStatsProfiles?.(renderScores, data.ratingScores, 'profile');
      };
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(enhanceInitialView);
      else window.setTimeout(enhanceInitialView, 0);
    }
    // The current profile uses native tabs for Reigning, Top and Recent
    // scores. Delegate the listener once so React can replace the tab panel
    // without losing the plugin's score-card enhancements.
    RhythiaX.installProfileScoreTabs?.();
    dataCapture.then(result => {
      if (navigationToken !== RhythiaX.navigationToken) return;
      RhythiaX.maybeShowLocalBackupPrompt?.(result);
      return RhythiaX.applyProfileHistoryIndicators?.(playerId, result?.snapshot);
    }).catch(error => {
      if (navigationToken === RhythiaX.navigationToken && !/Extension context invalidated/i.test(String(error?.message || error))) {
        RhythiaX.captureError(error, 'Profile history indicators failed');
      }
    });
    return true;
  };

  // Render the visible page data immediately. API data refines it afterwards.
  if (!renderProfile(null, 'initial')) {
    RhythiaX.clearLoadingState();
    return false;
  }
  // Only lock out retries after the first complete render succeeded. The site
  // can still be replacing its page tree when injectProfile is first called.
  RhythiaX.injected = true;
  if (!playerId) {
    RhythiaX.log('=== PROFILE INJECTION COMPLETE ===');
    return true;
  }

  const controller = new AbortController();
  RhythiaX.apiAbortController = controller;
  RhythiaX.fetchPlayerScoreSets(playerId, controller.signal).then(scoreSets => {
    if (navigationToken !== RhythiaX.navigationToken) return;
    if (scoreSets?.scores?.length) {
      const updatedPlayer = RhythiaX.extractPlayerData();
      renderProfile(scoreSets, 'api', updatedPlayer);
      RhythiaX.animateTitleProgressionUpdate?.(titleProgressionVisit, updatedPlayer);
        RhythiaX.recordTitleProgressionSnapshot?.(titleProgressionVisit, updatedPlayer, 'updated');
        RhythiaX.profileHistoryContext = { playerId, player: updatedPlayer, scoreSets };
    }
  }).catch(error => {
    if (navigationToken !== RhythiaX.navigationToken) return;
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
  });
  RhythiaX.log('=== PROFILE DATA LOADING ===');
  return true;
};

RhythiaX.ProfilePageComposition = {
  install() {},
  extractPlayer: RhythiaX.extractPlayerData,
  enhanceHeader: RhythiaX.enhanceProfileHeader,
  injectCrown: RhythiaX.injectProfileCrown,
  injectAvatarEffects: RhythiaX.injectProfileAvatarEffects,
  injectRankHistoryButton: RhythiaX.injectRankHistoryButton,
  inject: RhythiaX.injectProfile,
  maybeShowLocalBackupPrompt: RhythiaX.maybeShowLocalBackupPrompt,
};
