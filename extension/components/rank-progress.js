// =============================================
// Rhythia X — Rank Progress Bar
// =============================================

var RhythiaX = RhythiaX || {};

const RHYTHIAX_RANK_PATH = [
  { name: 'Novice', rp: 0, color: '#7ED54F' },
  { name: 'Expert', rp: 1500, color: '#04A0B6' },
  { name: 'Cand. Master', rp: 2500, color: '#C26F38' },
  { name: 'Master', rp: 5000, color: '#B6463A' },
  { name: 'Cand. GM', rp: 10000, color: '#8A4FA0' },
];
const RHYTHIAX_MAX_RP = 15000;
const RHYTHIAX_PROGRESS_DURATION = 3000;

function rankProgressRp(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, number) : 0;
}

function rankProgressRank(value) {
  const number = Number.parseInt(String(value || '').replace(/[^0-9]/g, ''), 10);
  return Number.isFinite(number) ? number : 0;
}

function rankProgressIsGrandmaster(rank) {
  return rank > 0 && rank <= 30;
}

function rankProgressTierIndex(rp) {
  let index = 0;
  RHYTHIAX_RANK_PATH.forEach((tier, tierIndex) => {
    if (rp >= tier.rp) index = tierIndex;
  });
  return index;
}

function rankProgressSegmentFill(index, rp) {
  const start = RHYTHIAX_RANK_PATH[index].rp;
  const end = RHYTHIAX_RANK_PATH[index + 1]?.rp || RHYTHIAX_MAX_RP;
  if (rp >= end) return 1;
  if (rp < start) return 0;
  return Math.max(index === 0 ? 0.02 : 0, Math.min(1, (rp - start) / (end - start)));
}

function rankProgressMarkerPosition(rp) {
  if (rp >= RHYTHIAX_MAX_RP) return 100;
  const index = rankProgressTierIndex(rp);
  const start = RHYTHIAX_RANK_PATH[index].rp;
  const end = RHYTHIAX_RANK_PATH[index + 1]?.rp || RHYTHIAX_MAX_RP;
  const within = Math.max(0, Math.min(1, (rp - start) / (end - start)));
  return ((index + within) / RHYTHIAX_RANK_PATH.length) * 100;
}

function rankProgressStatus(rp, rank, gmUnlocked) {
  if (gmUnlocked) return 'Grandmaster - Top ' + (rank || 30);
  if (rp > 10000) {
    return rank > 0 ? Math.max(0, rank - 30) + ' places to Grandmaster' : 'Top 30 rank for Grandmaster';
  }
  const nextRp = rp < 1500 ? 1500 : rp < 2500 ? 2500 : rp < 5000 ? 5000 : 10001;
  return RhythiaX.formatNumber(Math.max(0, Math.ceil(nextRp - rp))) + ' RP to ' + (nextRp === 10001 ? 'Candidate Grandmaster' : 'next title');
}

function rankProgressThreshold(progress, from, to) {
  const thresholds = [1500, 2500, 5000, 10000]
    .filter(value => value > Math.min(from, to) && value < Math.max(from, to));
  if (from > to) thresholds.reverse();
  if (!thresholds.length) return progress;
  const hold = 0.035;
  const moving = 1 - thresholds.length * hold;
  let held = 0;
  for (const threshold of thresholds) {
    const thresholdProgress = Math.abs(threshold - from) / Math.abs(to - from);
    const pauseStart = thresholdProgress * moving + held;
    if (progress < pauseStart) return Math.max(0, Math.min(1, (progress - held) / moving));
    if (progress < pauseStart + hold) return thresholdProgress;
    held += hold;
  }
  return Math.max(0, Math.min(1, (progress - held) / moving));
}

function rankProgressEase(progress, from, to) {
  const stepped = rankProgressThreshold(progress, from, to);
  return 1 - Math.pow(1 - stepped, 3);
}

function rankProgressReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

function rankProgressSetTimer(bar, callback, delay) {
  const timer = window.setTimeout(() => {
    bar._rhythiaxTimers?.delete(timer);
    callback();
  }, delay);
  (bar._rhythiaxTimers || (bar._rhythiaxTimers = new Set())).add(timer);
  return timer;
}

function rankProgressCancel(bar) {
  bar?._rhythiaxAnimationCleanup?.();
  bar?._rhythiaxTimers?.forEach(timer => window.clearTimeout(timer));
  if (bar?._rhythiaxTimers) bar._rhythiaxTimers.clear();
  if (bar) {
    bar._rhythiaxAnimationCleanup = null;
    bar.classList.remove('is-animating', 'gm-reveal-charging', 'gm-reveal-flash');
  }
}

function rankProgressRender(bar, state) {
  const rp = rankProgressRp(state.displayRp);
  const currentIndex = rankProgressTierIndex(rp);
  const gmUnlocked = state.gmUnlocked === true;
  const labelIndex = gmUnlocked ? RHYTHIAX_RANK_PATH.length - 1 : currentIndex;
  const activeTier = RHYTHIAX_RANK_PATH[currentIndex];

  bar.classList.toggle('is-grandmaster', gmUnlocked);
  bar.trackRow.classList.toggle('rhythiax-rankpath-track-row-achieved', gmUnlocked);
  bar.target.classList.toggle('rhythiax-rankpath-target-achieved', gmUnlocked);
  bar.marker.style.left = rankProgressMarkerPosition(rp) + '%';
  bar.marker.style.display = gmUnlocked ? 'none' : '';
  bar.marker.style.borderColor = gmUnlocked ? '#fff' : activeTier.color;
  bar.marker.title = rp.toLocaleString() + ' RP';
  bar.target.title = gmUnlocked ? 'Grandmaster - Top ' + (state.displayRank || 30) : 'Grandmaster target: Top 30';
  bar.status.textContent = rankProgressStatus(rp, state.displayRank, gmUnlocked);

  bar.segments.forEach((entry, index) => {
    const fill = rankProgressSegmentFill(index, rp);
    entry.segment.classList.toggle('rhythiax-rankpath-segment-active', fill > 0);
    entry.fill.style.width = fill * 100 + '%';
  });
  bar.labels.forEach((label, index) => {
    label.className = 'rhythiax-rankpath-label'
      + (!gmUnlocked && index < labelIndex ? ' rhythiax-rankpath-label-past' : '')
      + (!gmUnlocked && index === labelIndex ? ' rhythiax-rankpath-label-current' : '');
    label.style.color = !gmUnlocked && index === labelIndex ? activeTier.color : '';
    label.title = index === labelIndex ? rp.toLocaleString() + ' RP' : RHYTHIAX_RANK_PATH[index].name;
  });
}

function rankProgressFinishAnimation(bar, state, toRp, toRank, shouldRevealGrandmaster) {
  state.displayRp = toRp;
  state.displayRank = toRank;
  state.gmUnlocked = false;
  rankProgressRender(bar, state);
  bar.classList.remove('is-animating');

  if (!shouldRevealGrandmaster) {
    bar._rhythiaxAnimationCleanup = null;
    return;
  }

  if (rankProgressReducedMotion()) {
    state.gmUnlocked = true;
    rankProgressRender(bar, state);
    bar._rhythiaxAnimationCleanup = null;
    return;
  }

  bar.classList.add('gm-reveal-charging');
  bar.status.textContent = 'Top 30 reached - crown charging';
  rankProgressSetTimer(bar, () => {
    state.gmUnlocked = true;
    bar.classList.remove('gm-reveal-charging');
    bar.classList.add('gm-reveal-flash');
    rankProgressRender(bar, state);
    rankProgressSetTimer(bar, () => bar.classList.remove('gm-reveal-flash'), 900);
    bar._rhythiaxAnimationCleanup = null;
  }, 320);
  bar._rhythiaxAnimationCleanup = () => {};
}

// ─── Build Rank Progress Bar ──────────────────
RhythiaX.buildRankProgressBar = function (currentRp, globalRank) {
  currentRp = rankProgressRp(currentRp);
  const rankNumber = rankProgressRank(globalRank);
  const initialGrandmaster = rankProgressIsGrandmaster(rankNumber);
  const rankPathBar = document.createElement('div');
  rankPathBar.className = 'rhythiax-rankpath-bar';

  const trackRow = document.createElement('div');
  trackRow.className = 'rhythiax-rankpath-track-row';
  const barContainer = document.createElement('div');
  barContainer.className = 'rhythiax-rankpath-track';
  const segments = [];

  RHYTHIAX_RANK_PATH.forEach(tier => {
    const segment = document.createElement('div');
    segment.className = 'rhythiax-rankpath-segment';
    segment.title = tier.name + ' (' + tier.rp.toLocaleString() + ' RP)';
    const fill = document.createElement('span');
    fill.className = 'rhythiax-rankpath-segment-fill';
    fill.style.background = tier.color;
    segment.appendChild(fill);
    barContainer.appendChild(segment);
    segments.push({ segment, fill });
  });

  const marker = document.createElement('div');
  marker.className = 'rhythiax-rankpath-marker';
  barContainer.appendChild(marker);
  trackRow.appendChild(barContainer);

  const target = document.createElement('div');
  target.className = 'rhythiax-rankpath-target';
  target.dataset.crownMode = RhythiaX.getTitleProgressionCrownMode?.() || '3d';
  target.innerHTML = '<span class="rhythiax-rankpath-target-line"></span><span class="rhythiax-rankpath-crown"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 8l5 3 5-5 5 5 5-3-2 10H4L2 8Z"></path><path d="M4 18h16M7 21h10"></path></svg></span>';
  trackRow.appendChild(target);
  rankPathBar.appendChild(trackRow);

  const labelsRow = document.createElement('div');
  labelsRow.className = 'rhythiax-rankpath-labels';
  const progressLabels = document.createElement('div');
  progressLabels.className = 'rhythiax-rankpath-progress-labels';
  const labels = [];
  RHYTHIAX_RANK_PATH.forEach(tier => {
    const label = document.createElement('span');
    label.className = 'rhythiax-rankpath-label';
    label.textContent = tier.name;
    progressLabels.appendChild(label);
    labels.push(label);
  });
  labelsRow.appendChild(progressLabels);
  const targetLabel = document.createElement('span');
  targetLabel.className = 'rhythiax-rankpath-target-label';
  targetLabel.textContent = 'Grandmaster';
  labelsRow.appendChild(targetLabel);
  rankPathBar.appendChild(labelsRow);

  const status = document.createElement('div');
  status.className = 'rhythiax-rankpath-status';
  rankPathBar.appendChild(status);

  rankPathBar.trackRow = trackRow;
  rankPathBar.track = barContainer;
  rankPathBar.target = target;
  rankPathBar.marker = marker;
  rankPathBar.segments = segments;
  rankPathBar.labels = labels;
  rankPathBar.status = status;
  rankPathBar._rhythiaxState = {
    displayRp: currentRp,
    displayRank: rankNumber,
    gmUnlocked: initialGrandmaster,
  };
  rankProgressRender(rankPathBar, rankPathBar._rhythiaxState);

  rankPathBar._rhythiaxAnimate = function (fromRp, toRp, fromRank, toRank) {
    const startRp = rankProgressRp(fromRp);
    const endRp = rankProgressRp(toRp);
    const startRank = rankProgressRank(fromRank);
    const endRank = rankProgressRank(toRank);
    const shouldRevealGrandmaster = rankProgressIsGrandmaster(endRank) && !rankProgressIsGrandmaster(startRank);
    rankProgressCancel(rankPathBar);

    const state = rankPathBar._rhythiaxState = {
      displayRp: startRp,
      displayRank: startRank,
      gmUnlocked: rankProgressIsGrandmaster(startRank),
    };
    rankProgressRender(rankPathBar, state);
    if (startRp === endRp && startRank === endRank) {
      rankPathBar._rhythiaxAnimationCleanup = null;
      return;
    }
    if (rankProgressReducedMotion()) {
      rankProgressFinishAnimation(rankPathBar, state, endRp, endRank, shouldRevealGrandmaster);
      return;
    }

    rankPathBar.classList.add('is-animating');
    let previousTier = rankProgressTierIndex(startRp);
    const startedAt = performance.now();
    let frameId = 0;
    let finishTimer = null;
    const finish = () => {
      window.cancelAnimationFrame(frameId);
      if (finishTimer) window.clearTimeout(finishTimer);
      rankProgressFinishAnimation(rankPathBar, state, endRp, endRank, shouldRevealGrandmaster);
    };
    const frame = now => {
      const rawProgress = Math.min(1, (now - startedAt) / RHYTHIAX_PROGRESS_DURATION);
      const progress = rankProgressEase(rawProgress, startRp, endRp);
      state.displayRp = startRp + (endRp - startRp) * progress;
      rankProgressRender(rankPathBar, state);
      const nextTier = rankProgressTierIndex(state.displayRp);
      if (nextTier !== previousTier) {
        previousTier = nextTier;
        rankPathBar.track.classList.remove('rhythiax-rankpath-threshold-pulse');
        void rankPathBar.track.offsetWidth;
        rankPathBar.track.classList.add('rhythiax-rankpath-threshold-pulse');
        rankProgressSetTimer(rankPathBar, () => rankPathBar.track.classList.remove('rhythiax-rankpath-threshold-pulse'), 520);
      }
      if (rawProgress < 1) frameId = window.requestAnimationFrame(frame);
    };
    rankPathBar._rhythiaxAnimationCleanup = () => {
      window.cancelAnimationFrame(frameId);
      if (finishTimer) window.clearTimeout(finishTimer);
    };
    frameId = window.requestAnimationFrame(frame);
    finishTimer = rankProgressSetTimer(rankPathBar, finish, RHYTHIAX_PROGRESS_DURATION + 40);
  };

  return rankPathBar;
};

RhythiaX.cleanupRankProgressAnimations = function () {
  document.querySelectorAll('.rhythiax-rankpath-bar').forEach(rankProgressCancel);
};

// Animate the current DOM value from the previous profile snapshot when one
// exists. This keeps a normal reload stable and only animates real RP changes.
RhythiaX.animateTitleProgressionFromCache = async function (playerId, currentRp, globalRank, visit) {
  if (!playerId) return;
  const navigationToken = RhythiaX.navigationToken;
  if (visit?.previousReady) await visit.previousReady;
  if (navigationToken !== RhythiaX.navigationToken) return;
  const bar = document.querySelector('.rhythiax-accordion .rhythiax-rankpath-bar');
  if (!bar?._rhythiaxAnimate) return;
  let previousTitle = visit?.previousPlayer;
  if (!previousTitle) {
    const titleState = await RhythiaX.getDataTitleProgressionState?.(playerId);
    if (navigationToken !== RhythiaX.navigationToken) return;
    previousTitle = titleState ? {
      rp: titleState.rp,
      globalRank: titleState.globalRank,
    } : null;
  }
  const previous = previousTitle;
  const previousRp = previous?.rp;
  if (previousRp === undefined || previousRp === null || previousRp === '') return;
  if (currentRp === undefined || currentRp === null || String(currentRp).trim() === '') return;
  if (globalRank === undefined || globalRank === null || String(globalRank).trim() === '') return;
  const fromRp = rankProgressRp(previousRp);
  const toRp = RhythiaX.parseLocalizedNumber
    ? RhythiaX.parseLocalizedNumber(currentRp)
    : rankProgressRp(currentRp);
  const fromRank = rankProgressRank(previous?.globalRank);
  const toRank = rankProgressRank(globalRank);
  if (!Number.isFinite(toRp) || !Number.isFinite(toRank)) return;
  if (fromRp === toRp && fromRank === toRank) return;
  bar._rhythiaxAnimate(fromRp, toRp, fromRank, toRank);
};

RhythiaX.animateTitleProgressionUpdate = function (visit, updatedPlayer) {
  const bar = document.querySelector('.rhythiax-accordion .rhythiax-rankpath-bar');
  const initial = visit?.initialPlayer;
  if (!bar?._rhythiaxAnimate || !initial || !updatedPlayer) return;
  const parseRp = value => {
    const number = RhythiaX.parseLocalizedNumber ? RhythiaX.parseLocalizedNumber(value) : Number(value);
    return Number.isFinite(number) ? number : 0;
  };
  const fromRp = parseRp(initial.rp);
  const toRp = parseRp(updatedPlayer.rp);
  const fromRank = rankProgressRank(initial.globalRank);
  const toRank = rankProgressRank(updatedPlayer.globalRank);
  if (fromRp === toRp && fromRank === toRank) return;
  bar._rhythiaxAnimate(fromRp, toRp, fromRank, toRank);
};
