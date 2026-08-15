// =============================================
// Rhythia X — Rank Progress Bar
// =============================================

var RhythiaX = RhythiaX || {};

const RHYTHIAX_RANK_PATH = [
  { name: 'Novice', rp: 0, color: '#7ED54F', shortRp: '0 RP' },
  { name: 'Expert', rp: 1500, color: '#04A0B6', shortRp: '1.5k' },
  { name: 'Cand. Master', rp: 2500, color: '#C26F38', shortRp: '2.5k' },
  { name: 'Master', rp: 5000, color: '#B6463A', shortRp: '5k' },
  { name: 'Cand. GM', rp: 10000, color: '#8A4FA0', shortRp: '10k' },
];
const RHYTHIAX_MAX_RP = 10000;
const RHYTHIAX_CAND_GM_MAX_RANK = 400; // Rank at which Cand. GM segment starts (~400 down to 30)
const RHYTHIAX_PROGRESS_DURATION = 1400;

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

function rankProgressSegmentFill(index, rp, rank) {
  // First 4 tiers (Novice -> Master) scale based on RP thresholds (0 -> 10,000 RP)
  if (index < 4) {
    const start = RHYTHIAX_RANK_PATH[index].rp;
    const end = RHYTHIAX_RANK_PATH[index + 1]?.rp || RHYTHIAX_MAX_RP;
    if (rp >= end) return 1;
    if (rp < start) return 0;
    return Math.max(index === 0 ? 0.02 : 0, Math.min(1, (rp - start) / (end - start)));
  }

  // 5th tier (Cand. GM): Scales 100% based on Global Rank (#400 -> #30)
  if (rp < 10000) return 0;
  if (rank > 0 && rank <= 30) return 1; // Grandmaster achieved = 100%

  const currentRank = rank > 0 ? rank : RHYTHIAX_CAND_GM_MAX_RANK;
  const clampedRank = Math.min(RHYTHIAX_CAND_GM_MAX_RANK, Math.max(30, currentRank));
  const rankProgress = (RHYTHIAX_CAND_GM_MAX_RANK - clampedRank) / (RHYTHIAX_CAND_GM_MAX_RANK - 30);

  return Math.max(0.03, Math.min(0.99, rankProgress));
}

function rankProgressMarkerPosition(rp, rank) {
  const index = rankProgressTierIndex(rp);
  if (index < 4) {
    const start = RHYTHIAX_RANK_PATH[index].rp;
    const end = RHYTHIAX_RANK_PATH[index + 1]?.rp || RHYTHIAX_MAX_RP;
    const within = Math.max(0, Math.min(1, (rp - start) / (end - start)));
    return ((index + within) / RHYTHIAX_RANK_PATH.length) * 100;
  }

  // In Cand. GM the marker position corresponds to progress towards Top 30
  const segmentFill = rankProgressSegmentFill(4, rp, rank);
  return ((4 + segmentFill) / RHYTHIAX_RANK_PATH.length) * 100;
}

function rankProgressStatusInfo(rp, rank, gmUnlocked) {
  if (gmUnlocked) {
    return {
      title: 'Grandmaster',
      goal: `Top #${rank || 30} Global`,
    };
  }
  const formattedRp = (RhythiaX.formatNumber ? RhythiaX.formatNumber(Math.round(rp)) : Math.round(rp).toLocaleString('en-US')) + ' RP';
  if (rp >= 10000) {
    const places = Math.max(0, rank - 30);
    return {
      title: formattedRp,
      goal: rank > 0 ? `${places} places to Grandmaster` : 'Top 30 rank for Grandmaster',
    };
  }
  const nextRp = rp < 1500 ? 1500 : rp < 2500 ? 2500 : rp < 5000 ? 5000 : 10000;
  const diff = Math.max(0, Math.ceil(nextRp - rp));
  const formattedDiff = RhythiaX.formatNumber ? RhythiaX.formatNumber(diff) : diff.toLocaleString('en-US');
  return {
    title: formattedRp,
    goal: `${formattedDiff} RP to next title`,
  };
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
    bar.targetWrap?.classList.remove('gm-unlock-pulse');
  }
}

function rankProgressRender(bar, state, options = {}) {
  const rp = rankProgressRp(state.displayRp);
  const rank = rankProgressRank(state.displayRank);
  const roundedRp = Math.round(rp);
  const currentIndex = rankProgressTierIndex(roundedRp);
  const activeTier = RHYTHIAX_RANK_PATH[currentIndex];
  const gmAchieved = options.forceGm !== undefined ? options.forceGm : (state.gmUnlocked === true || rankProgressIsGrandmaster(rank));
  const markerPct = options.forceMarkerPct !== undefined ? options.forceMarkerPct : rankProgressMarkerPosition(roundedRp, rank);

  bar.style.setProperty('--active-tier-color', gmAchieved ? '#ffffff' : activeTier.color);
  bar.classList.toggle('is-grandmaster', gmAchieved);
  bar.classList.toggle('is-gm', gmAchieved);
  bar.targetWrap.classList.toggle('achieved', gmAchieved);
  bar.targetWrap.classList.toggle('rhythiax-rankpath-target-achieved', gmAchieved);

  // Segments fill
  bar.segments.forEach((entry, index) => {
    let fill = rankProgressSegmentFill(index, roundedRp, rank);
    if (options.forceSegmentFill !== undefined) {
      fill = options.forceSegmentFill(index, roundedRp, rank);
    } else if (gmAchieved) {
      fill = 1;
    }
    entry.segment.classList.toggle('rhythiax-rankpath-segment-active', fill > 0);
    entry.segment.classList.toggle('active', fill > 0);
    entry.fill.style.width = (fill * 100) + '%';
    if (gmAchieved) {
      entry.fill.style.background = '';
    } else {
      entry.fill.style.background = RHYTHIAX_RANK_PATH[index].color;
    }
  });

  // Marker
  bar.marker.style.left = markerPct + '%';
  if (gmAchieved || options.hideMarker) {
    bar.marker.classList.add('is-hidden');
    bar.marker.style.display = 'none';
  } else {
    bar.marker.classList.remove('is-hidden');
    bar.marker.style.display = '';
  }
  bar.marker.style.borderColor = activeTier.color;
  bar.marker.title = roundedRp.toLocaleString('en-US') + ' RP';

  // Tier column labels
  bar.tierCols.forEach((col, index) => {
    col.className = 'rhythiax-rankpath-tier-col r-tier-col';
    if (gmAchieved || index < currentIndex) {
      col.classList.add('past', 'rhythiax-rankpath-label-past');
    } else if (index === currentIndex) {
      col.classList.add('current', 'rhythiax-rankpath-label-current');
    }
  });

  // Target crown title
  bar.targetWrap.title = gmAchieved
    ? `Grandmaster - Top ${rank || 30}`
    : 'Grandmaster target: Top 30';

  // Centered status capsule
  const statusInfo = rankProgressStatusInfo(roundedRp, rank, gmAchieved);
  bar.statusCapsule.classList.toggle('is-gm', gmAchieved);
  bar.statusRp.textContent = statusInfo.title;
  bar.statusGoal.textContent = statusInfo.goal;
}

function rankProgressTriggerLevelUpEffect(bar, tierIndex) {
  if (rankProgressReducedMotion()) return;

  // 1. Track pulse
  bar.track.classList.remove('rhythiax-rankpath-threshold-pulse', 'r-threshold-pulse');
  void bar.track.offsetWidth;
  bar.track.classList.add('rhythiax-rankpath-threshold-pulse', 'r-threshold-pulse');
  rankProgressSetTimer(bar, () => bar.track.classList.remove('rhythiax-rankpath-threshold-pulse', 'r-threshold-pulse'), 520);

  // 2. Tier Col Pop
  const col = bar.tierCols[tierIndex];
  if (col) {
    col.classList.remove('pop');
    void col.offsetWidth;
    col.classList.add('pop');
    rankProgressSetTimer(bar, () => col.classList.remove('pop'), 500);
  }

  // 3. Status Capsule Pop
  bar.statusCapsule.classList.remove('pop');
  void bar.statusCapsule.offsetWidth;
  bar.statusCapsule.classList.add('pop');
  rankProgressSetTimer(bar, () => bar.statusCapsule.classList.remove('pop'), 500);
}

// ─── Build Rank Progress Bar ──────────────────
RhythiaX.buildRankProgressBar = function (currentRp, globalRank) {
  currentRp = rankProgressRp(currentRp);
  const rankNumber = rankProgressRank(globalRank);
  const initialGrandmaster = rankProgressIsGrandmaster(rankNumber);

  const rankPathBar = document.createElement('div');
  rankPathBar.className = 'rhythiax-rankpath-bar rhythiax-rankpath-bar-v2';

  // Track Row
  const trackRow = document.createElement('div');
  trackRow.className = 'rhythiax-rankpath-track-row r-track-row';

  const barContainer = document.createElement('div');
  barContainer.className = 'rhythiax-rankpath-track r-segments-track';
  const segments = [];

  RHYTHIAX_RANK_PATH.forEach(tier => {
    const segment = document.createElement('div');
    segment.className = 'rhythiax-rankpath-segment r-segment';
    segment.style.setProperty('--segment-color', tier.color);
    segment.title = `${tier.name} (${tier.rp.toLocaleString('en-US')} RP)`;

    const fill = document.createElement('span');
    fill.className = 'rhythiax-rankpath-segment-fill r-segment-fill';
    fill.style.background = tier.color;

    segment.appendChild(fill);
    barContainer.appendChild(segment);
    segments.push({ segment, fill });
  });

  const marker = document.createElement('div');
  marker.className = 'rhythiax-rankpath-marker r-track-marker';
  barContainer.appendChild(marker);
  trackRow.appendChild(barContainer);

  const targetWrap = document.createElement('div');
  targetWrap.className = 'rhythiax-rankpath-target r-target-wrap';
  targetWrap.dataset.crownMode = RhythiaX.getTitleProgressionCrownMode?.() || '3d';
  targetWrap.innerHTML = '<span class="rhythiax-rankpath-target-line r-target-line"></span><span class="rhythiax-rankpath-crown r-crown-v1"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 8l5 3 5-5 5 5 5-3-2 10H4L2 8Z"></path><path d="M4 18h16M7 21h10"></path></svg></span>';
  trackRow.appendChild(targetWrap);
  rankPathBar.appendChild(trackRow);

  // Labels Row
  const labelsRow = document.createElement('div');
  labelsRow.className = 'rhythiax-rankpath-labels r-labels-row';

  const progressLabels = document.createElement('div');
  progressLabels.className = 'rhythiax-rankpath-progress-labels r-tier-labels';
  const tierCols = [];

  RHYTHIAX_RANK_PATH.forEach((tier, i) => {
    const col = document.createElement('div');
    col.className = 'rhythiax-rankpath-tier-col r-tier-col';
    col.style.setProperty('--tier-color', tier.color);

    const nameSpan = document.createElement('span');
    nameSpan.className = 'rhythiax-rankpath-label r-tier-name';
    nameSpan.textContent = tier.name;

    const rpSpan = document.createElement('span');
    rpSpan.className = 'r-tier-rp';
    rpSpan.textContent = tier.shortRp;

    col.appendChild(nameSpan);
    col.appendChild(rpSpan);
    progressLabels.appendChild(col);
    tierCols.push(col);
  });
  labelsRow.appendChild(progressLabels);

  const targetLabelWrap = document.createElement('div');
  targetLabelWrap.className = 'rhythiax-rankpath-target-label-wrap r-gm-label-wrap';
  const targetLabel = document.createElement('span');
  targetLabel.className = 'rhythiax-rankpath-target-label r-gm-label';
  targetLabel.textContent = 'Grandmaster';
  targetLabelWrap.appendChild(targetLabel);
  labelsRow.appendChild(targetLabelWrap);
  rankPathBar.appendChild(labelsRow);

  // Status Wrapper & Centered Capsule
  const statusWrapper = document.createElement('div');
  statusWrapper.className = 'rhythiax-rankpath-status-wrapper r-status-wrapper';

  const statusTrackArea = document.createElement('div');
  statusTrackArea.className = 'r-status-track-area';

  const statusCapsule = document.createElement('div');
  statusCapsule.className = 'rhythiax-rankpath-status-capsule r-status-capsule';

  const statusRp = document.createElement('span');
  statusRp.className = 'rhythiax-rankpath-status-rp r-status-rp';

  const statusDot = document.createElement('span');
  statusDot.className = 'rhythiax-rankpath-status-dot r-status-dot';

  const statusGoal = document.createElement('span');
  statusGoal.className = 'rhythiax-rankpath-status-goal r-status-goal';

  statusCapsule.appendChild(statusRp);
  statusCapsule.appendChild(statusDot);
  statusCapsule.appendChild(statusGoal);
  statusTrackArea.appendChild(statusCapsule);
  statusWrapper.appendChild(statusTrackArea);

  const statusSpacer = document.createElement('div');
  statusSpacer.className = 'r-status-spacer';
  statusWrapper.appendChild(statusSpacer);

  rankPathBar.appendChild(statusWrapper);

  // References
  rankPathBar.trackRow = trackRow;
  rankPathBar.track = barContainer;
  rankPathBar.target = targetWrap;
  rankPathBar.targetWrap = targetWrap;
  rankPathBar.marker = marker;
  rankPathBar.segments = segments;
  rankPathBar.tierCols = tierCols;
  rankPathBar.statusCapsule = statusCapsule;
  rankPathBar.statusRp = statusRp;
  rankPathBar.statusGoal = statusGoal;

  rankPathBar._rhythiaxState = {
    displayRp: currentRp,
    displayRank: rankNumber,
    gmUnlocked: initialGrandmaster,
  };
  rankProgressRender(rankPathBar, rankPathBar._rhythiaxState);

  // ─── Animation Method ────────────────────────
  rankPathBar._rhythiaxAnimate = function (fromRp, toRp, fromRank, toRank) {
    const startRp = rankProgressRp(fromRp);
    const endRp = rankProgressRp(toRp);
    const startRank = rankProgressRank(fromRank);
    const endRank = rankProgressRank(toRank);

    rankProgressCancel(rankPathBar);

    const targetIsGm = rankProgressIsGrandmaster(endRank);
    const startIsGm = rankProgressIsGrandmaster(startRank);
    const isTransitioningToGm = !startIsGm && targetIsGm;

    const state = rankPathBar._rhythiaxState = {
      displayRp: startRp,
      displayRank: startRank,
      gmUnlocked: startIsGm,
    };
    rankProgressRender(rankPathBar, state);

    if (startRp === endRp && startRank === endRank) {
      rankPathBar._rhythiaxAnimationCleanup = null;
      return;
    }

    if (rankProgressReducedMotion()) {
      state.displayRp = endRp;
      state.displayRank = endRank;
      state.gmUnlocked = targetIsGm;
      rankProgressRender(rankPathBar, state);
      rankPathBar._rhythiaxAnimationCleanup = null;
      return;
    }

    rankPathBar.classList.add('is-animating');
    let previousTier = rankProgressTierIndex(startRp);
    const startedAt = performance.now();
    let frameId = 0;

    const frame = now => {
      const rawProgress = Math.min(1, (now - startedAt) / RHYTHIAX_PROGRESS_DURATION);
      // Snappy cubic ease-out
      const ease = 1 - Math.pow(1 - rawProgress, 3);
      const currRp = startRp + (endRp - startRp) * ease;
      const currRank = Math.round(startRank + (endRank - startRank) * ease);

      state.displayRp = currRp;
      state.displayRank = currRank;

      const currTier = rankProgressTierIndex(currRp);
      if (currTier !== previousTier) {
        previousTier = currTier;
        rankProgressTriggerLevelUpEffect(rankPathBar, currTier);
      }

      if (isTransitioningToGm) {
        // Phase 1: (0 -> 0.72) Glide marker all the way to 100% (the edge before crown)
        // Phase 2: (0.72 -> 1.0) Marker absorbs into crown, crown glows and transforms
        if (rawProgress < 0.72) {
          const subProgress = rawProgress / 0.72;
          const subEase = 1 - Math.pow(1 - subProgress, 2.5);
          const startPct = rankProgressMarkerPosition(startRp, startRank);
          const currentMarkerPct = startPct + (100 - startPct) * subEase;

          rankProgressRender(rankPathBar, state, {
            forceGm: false,
            forceMarkerPct: currentMarkerPct,
            forceSegmentFill: (i, r, rk) => {
              if (i < 4) return 1;
              return (currentMarkerPct - 80) / 20;
            },
          });
        } else {
          if (!rankPathBar.targetWrap.classList.contains('gm-unlock-pulse')) {
            rankPathBar.targetWrap.classList.add('gm-unlock-pulse');
            rankProgressSetTimer(rankPathBar, () => rankPathBar.targetWrap.classList.remove('gm-unlock-pulse'), 800);
          }
          rankProgressRender(rankPathBar, state, {
            forceGm: true,
            hideMarker: true,
          });
        }
      } else {
        rankProgressRender(rankPathBar, state);
      }

      if (rawProgress < 1) {
        frameId = window.requestAnimationFrame(frame);
      } else {
        rankPathBar.classList.remove('is-animating');
        state.displayRp = endRp;
        state.displayRank = endRank;
        state.gmUnlocked = targetIsGm;
        rankProgressRender(rankPathBar, state);
        rankPathBar._rhythiaxAnimationCleanup = null;
      }
    };

    rankPathBar._rhythiaxAnimationCleanup = () => {
      window.cancelAnimationFrame(frameId);
    };
    frameId = window.requestAnimationFrame(frame);
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
