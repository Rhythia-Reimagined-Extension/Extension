// =============================================
// Rhythia X — Scores Page Enhancements
// =============================================

var RhythiaX = RhythiaX || {};

function scoresPageDisplayNumber(value) {
  const text = String(value ?? '').trim();
  if (!/\d/.test(text)) return '';
  const number = RhythiaX.parseLocalizedNumber(text);
  return Number.isFinite(number) ? String(number) : '';
}

// ─── Detect scores page ──────────────────────
RhythiaX.isScoresPage = function () {
  const url = window.location.pathname;
  return /^\/player\/[^/]+\/scores(?:\/|$)/.test(url);
};

// ─── Extract player data (scores page) ───────
RhythiaX.extractScoresPagePlayer = function () {
  const username = RhythiaX.qs('.text-4xl.font-bold')?.textContent?.trim() || 'Unknown';

  const flagImg = RhythiaX.qs('img[src*=".svg"]');
  const country = flagImg?.src?.match(/\/([A-Z]{2})\.svg/)?.[1] || '';

  const avatar = (RhythiaX.qs('img.h-36.w-36') || RhythiaX.qs('img[class*="md:h-40"]'))?.src || '';

  const rankEls = RhythiaX.qsa('.text-4xl.font-bold');
  let globalRank = '';
  for (const el of rankEls) {
    const t = el.textContent.trim();
    if (t.startsWith('#')) {
      globalRank = t;
      break;
    }
  }

  const rpBox = RhythiaX.qs('[class*="border-green-500"]') || RhythiaX.qs('[class*="bg-[#22C55E]"]');
  let rp = '';
  if (rpBox) {
    const rpEl = RhythiaX.qs('.text-xl.font-extrabold', rpBox) || rpBox;
    rp = scoresPageDisplayNumber(rpEl.textContent);
  }

  return { username, country, avatar, globalRank, rp };
};

// ─── Find the profile card on /scores page ───
RhythiaX.findScoresProfileCard = function () {
  const candidates = RhythiaX.ScoresPageAdapter.profileCards();
  for (const el of candidates) {
    if (el.querySelector('img.h-36.w-36')) {
      return el;
    }
  }
  return null;
};

RhythiaX.compactScoresProfileCard = function (player) {
  const card = RhythiaX.findScoresProfileCard();
  if (!card || card.dataset.rhythiaxCompactReady) return;
  card.classList.add('rhythiax-scores-profile-compact');
  card.dataset.rhythiaxCompactReady = 'true';
};

RhythiaX.showScoresDataState = function (message, kind) {
  let state = document.querySelector('.rhythiax-scores-data-state');
  if (!state) {
    state = document.createElement('div');
    state.className = 'rhythiax-scores-data-state';
    const card = RhythiaX.findScoresProfileCard();
    card?.parentElement?.appendChild(state);
  }
  if (!state) return;
  state.dataset.state = kind || 'empty';
  state.textContent = message;
};

// ─── Inject stats panel on scores page ───────
RhythiaX.injectScoresStatsPanel = function (player, scores, ratingScores) {
  if (RhythiaX.isModuleEnabled('advancedStats') === false) return true;
  const profileCard = RhythiaX.findScoresProfileCard();
  if (!profileCard) return false;

  const parent = profileCard.parentElement;
  if (!parent) return false;
  // Build profiles before the panel is collapsed so they become part of its
  // hidden body instead of being appended as visible siblings afterwards.
  const panel = RhythiaX.buildStatsPanel(player, scores, player.rp, 'scores', ratingScores);
  if (!panel) return false;
  panel.classList.add('rhythiax-scores-collapse-card');
  const wasOpen = parent.querySelector(':scope > .rhythiax-stats-panel')?.classList.contains('rhythiax-scores-stats-open') === true;
  RhythiaX.collapseScoresStatsPanel(panel);

  const previous = parent.querySelector(':scope > .rhythiax-stats-panel');
  if (previous) previous.replaceWith(panel);
  else parent.insertBefore(panel, profileCard.nextElementSibling);
  // Keep Advanced Stats collapsed by default on /scores. If the user opened it
  // before an API refresh, restore that choice after replacing the panel.
  if (wasOpen) {
    const body = panel.querySelector(':scope > .rhythiax-scores-stats-body');
    const bodyInner = body?.querySelector(':scope > .rhythiax-scores-stats-body-inner');
    const header = panel.querySelector(':scope > .rhythiax-scores-collapse-header');
    panel.classList.add('rhythiax-scores-stats-open');
    header?.setAttribute('aria-expanded', 'true');
    if (body) RhythiaX.animateScoresCollapse(body, true, true, bodyInner);
  }
  RhythiaX.log('Stats panel placed after profile card');
  return panel;
};

RhythiaX.collapseScoresStatsPanel = function (panel) {
  if (!panel || panel.dataset.rhythiaxCollapsedReady) return;
  const body = document.createElement('div');
  body.className = 'rhythiax-scores-stats-body';
  const bodyInner = document.createElement('div');
  bodyInner.className = 'rhythiax-scores-stats-body-inner';
  while (panel.firstChild) bodyInner.appendChild(panel.firstChild);
  const title = bodyInner.querySelector('h3') || document.createElement('h3');
  if (!title.textContent.trim()) title.textContent = 'Advanced Stats';
  title.remove();
  const header = document.createElement('div');
  header.className = 'rhythiax-scores-collapse-header';
  header.tabIndex = 0;
  header.setAttribute('role', 'button');
  header.setAttribute('aria-expanded', 'false');
  const headerRow = document.createElement('div');
  headerRow.className = 'rhythiax-scores-collapse-top-row';
  const chevron = document.createElement('span');
  chevron.className = 'rhythiax-scores-stats-toggle rhythiax-scores-collapse-toggle';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.innerHTML = '<span></span><span></span>';
  headerRow.append(title, chevron);
  header.appendChild(headerRow);
  body.appendChild(bodyInner);
  const setOpen = (open, immediate = false) => {
    panel.classList.toggle('rhythiax-scores-stats-open', open);
    header.setAttribute('aria-expanded', String(open));
    RhythiaX.animateScoresCollapse(body, open, immediate, bodyInner);
    if (immediate) panel.classList.add('rhythiax-collapse-initialized');
  };
  header.addEventListener('click', event => {
    if (event.target.closest('button')) return;
    setOpen(!panel.classList.contains('rhythiax-scores-stats-open'));
  });
  header.addEventListener('keydown', event => {
    if (event.target !== header || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    setOpen(!panel.classList.contains('rhythiax-scores-stats-open'));
  });
  panel.append(header, body);
  panel.dataset.rhythiaxCollapsedReady = 'true';
  setOpen(false, true);
};

// ─── Full injection for scores page ──────────
RhythiaX.injectScores = function () {
  if (RhythiaX.injected) {
    return;
  }
  if (RhythiaX.qs('.rhythiax-stats-panel')) {
    RhythiaX.injected = true;
    return;
  }

  const scoreCards = RhythiaX.ScoresPageAdapter.scoreCards();
  RhythiaX.log('injectScores — score cards:', scoreCards.length);

  if (scoreCards.length === 0) {
    RhythiaX.log('Scores not ready yet');
    return false;
  }

  RhythiaX.cleanupStaleElements();
  RhythiaX.prepareScoresCollapsibles?.();

  RhythiaX.log('=== INJECTING SCORES ===');
  const player = RhythiaX.extractScoresPagePlayer();
  const scores = RhythiaX.extractScores();
  RhythiaX.log('Score page data parsed', { scoreCount: scores.length });

  const playerId = RhythiaX.ScoresPageAdapter.playerId();
  const navigationToken = RhythiaX.navigationToken;

  const renderScores = (scoreSets, renderMode, renderPlayer = player) => {
    if (navigationToken !== RhythiaX.navigationToken) return;
    const hasApiData = scoreSets && scoreSets.scores?.length > 0;
    const isInitialRender = renderMode === 'initial';
    const data = hasApiData
      ? (renderMode === 'cache' ? scoreSets : RhythiaX.mergeWeightedRp(scoreSets, scores))
      : { scores, ratingScores: scores };
    const renderScoresData = data.scores;
    RhythiaX.log('Rendering scores page with', renderScoresData.length, 'scores');
    const statsPanel = RhythiaX.injectScoresStatsPanel(renderPlayer, renderScoresData, data.ratingScores);
    if (!statsPanel) {
      RhythiaX.error('Scores panel was not ready after data loading');
      RhythiaX.clearLoadingState();
      return;
    }
    RhythiaX.compactScoresProfileCard(renderPlayer);
    if (isInitialRender) {
      const enhanceInitialView = () => {
        if (navigationToken !== RhythiaX.navigationToken) {
          return;
        }
        RhythiaX.enhanceScoreCards();
        RhythiaX.injectScoresTools({ immediate: true });
        RhythiaX.wrapTitleProgression?.(renderPlayer.rp, renderPlayer.globalRank);
        RhythiaX.animateTitleProgressionFromCache?.(playerId, renderPlayer.rp, renderPlayer.globalRank);
        RhythiaX.injectAbsoluteDates();
      };
      // Let the native page paint first, then progressively enhance its cards
      // without holding the whole route behind extension work.
      if (typeof window.requestAnimationFrame === 'function') window.requestAnimationFrame(enhanceInitialView);
      else window.setTimeout(enhanceInitialView, 0);
    }
    if (renderMode === 'api') RhythiaX.markDataRefresh();
    return true;
  };

  // Show the redesigned page immediately, then refine stats from the API.
  if (!renderScores(null, 'initial')) {
    RhythiaX.clearLoadingState();
    return false;
  }
  // Only lock out retries after the first complete render succeeded. The site
  // can still be replacing its page tree when injectScores is first called.
  RhythiaX.injected = true;
  if (!playerId) {
    RhythiaX.log('=== SCORES INJECTION COMPLETE ===');
    return true;
  }

  const controller = new AbortController();
  RhythiaX.apiAbortController = controller;
  RhythiaX.fetchPlayerScoreSets(playerId, controller.signal).then(scoreSets => {
    if (scoreSets?.scores?.length) {
      if (navigationToken === RhythiaX.navigationToken) renderScores(scoreSets, 'api');
    } else if (navigationToken === RhythiaX.navigationToken) {
      RhythiaX.showScoresDataState('No score data is available for this player.', 'empty');
    }
  }).catch(error => {
    if (navigationToken !== RhythiaX.navigationToken) return;
    if (error?.name !== 'AbortError') RhythiaX.captureError(error, 'Scores data loading failed; keeping visible page data');
    RhythiaX.showScoresDataState('Score data could not be updated. Showing available page data.', 'error');
  }).finally(() => {
    if (RhythiaX.apiAbortController === controller) RhythiaX.apiAbortController = null;
  });
  RhythiaX.log('=== SCORES DATA LOADING ===');
  return true;
};

RhythiaX.ScoresPageComposition = {
  install() {},
  extractPlayer: RhythiaX.extractScoresPagePlayer,
  findProfileCard: RhythiaX.findScoresProfileCard,
  compactProfileCard: RhythiaX.compactScoresProfileCard,
  showDataState: RhythiaX.showScoresDataState,
  injectStatsPanel: RhythiaX.injectScoresStatsPanel,
  collapseStatsPanel: RhythiaX.collapseScoresStatsPanel,
  inject: RhythiaX.injectScores,
};
