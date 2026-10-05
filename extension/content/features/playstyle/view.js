// =============================================
// Rhythia X — Playstyle Feature: View Module
// DOM rendering, score breakdown, FAQ popover & UI orchestration
// Pure SVG vectors, zero unicode emojis & readable score distributions
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const domain = RhythiaX.PlaystyleDomain;
  const scout = RhythiaX.PlaystyleScout;
  const loader = RhythiaX.PlaystyleLoader;

  // SVG Icon definitions (zero unicode emojis)
  const ICONS = {
    speed: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>`,
    trendingUp: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    trendingDown: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
    activity: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    target: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>`,
    fc: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
    doc: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
    help: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    sliders: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>`,
    star: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
  };

  function getStatusSvg(iconType) {
    if (iconType === 'shield') return ICONS.shield;
    if (iconType === 'trendingUp') return ICONS.trendingUp;
    if (iconType === 'trendingDown') return ICONS.trendingDown;
    if (iconType === 'pause') return ICONS.pause;
    return ICONS.activity;
  }

  const STATUS_COLORS = {
    win: '#4ade80',
    loss: '#f87171',
    elite: '#c084fc',
    steady: '#2dd4bf',
    alert: '#facc15'
  };

  function createMetricCard(label, value, sub, valueColor, iconSvg) {
    const card = document.createElement('div');
    card.className = 'rhythiax-m4-card';

    const lblRow = document.createElement('div');
    lblRow.className = 'rhythiax-m4-label-row';

    const ico = document.createElement('span');
    ico.className = 'rhythiax-m4-icon';
    ico.innerHTML = iconSvg || '';
    if (valueColor) ico.style.color = valueColor;

    const lbl = document.createElement('span');
    lbl.className = 'rhythiax-m4-label';
    lbl.textContent = label;

    lblRow.append(ico, lbl);

    const val = document.createElement('span');
    val.className = 'rhythiax-m4-value';
    val.textContent = value;
    if (valueColor) val.style.color = valueColor;

    const sb = document.createElement('span');
    sb.className = 'rhythiax-m4-sub';
    sb.textContent = sub;

    card.append(lblRow, val, sb);
    return { card, val, sb, ico };
  }

  let lastRenderCall = null;

  function render(container, context = {}) {
    if (!container) return;
    lastRenderCall = { container, context };

    const scores = context.scores || [];
    const player = context.player || {};
    const playerId = context.playerId || player.id || window.location.pathname.match(/\/player\/([^/]+)/)?.[1];
    const historyContext = RhythiaX.profileHistoryContext;
    const scoreSets = context.scoreSets || (playerId && String(historyContext?.playerId) === String(playerId)
      ? historyContext.scoreSets : null);
    const topScores = context.topScores || scoreSets?.topScores || scores;
    const overallStats = scoreSets?.stats || {};

    // Compute base metrics
    const speedBuckets = domain.getSpeedBuckets(scores);
    const gradeBuckets = domain.getGradeBuckets(scores);
    const fcStats = domain.getFcStats(scores);
    const speedSummary = scout.evaluateSpeedSummary(scores);
    const bestMaps = domain.getBestMaps(scores);
    const mostPlayedMods = domain.getMostPlayedMods(scores, 4);

    // Initial baseline momentum & trend (will be refined once history loads)
    let initialRank = player.globalRank || player.position;
    if (!initialRank && typeof RhythiaX.extractPlayerData === 'function') {
      initialRank = RhythiaX.extractPlayerData()?.globalRank;
    }
    const officialHistory = loader.normalizeOfficialHistory?.(player.rankHistory || player.userProfile?.rank_history) || [];
    const momentumActivity = { scores: topScores, playCount: player.playCount };
    let momentum = scout.evaluateMomentum(initialRank, officialHistory, Date.now(), player.rp, momentumActivity);
    let accTrend = scout.evaluateAccuracyTrend(scores, []);

    // Outer root container
    const root = document.createElement('div');
    root.className = 'rhythiax-playstyle-deck';

    // ─────────────────────────────────────────────
    // 1. TOP 4 METRIC CARDS WITH SVG ICONS
    // ─────────────────────────────────────────────
    const m4Grid = document.createElement('div');
    m4Grid.className = 'rhythiax-m4-grid';

    const momColor = STATUS_COLORS[momentum.status] || '#fafafa';
    const accColor = accTrend.delta > 0 ? '#4ade80' : (accTrend.delta < 0 ? '#f87171' : '#a1a1aa');

    // Card 1: Speed
    const cardSpeed = createMetricCard('Speed', speedSummary.value, speedSummary.sub, speedSummary.color, ICONS.speed);
    // Card 2: Momentum
    const cardMomentum = createMetricCard('Momentum', momentum.label, momentum.sub, momColor, getStatusSvg(momentum.iconType));
    // Card 3: Accuracy Trend
    const cardAcc = createMetricCard('Accuracy Trend', accTrend.formatted, accTrend.sub, accColor, ICONS.target);
    // Card 4: FC Rate
    const cardFc = createMetricCard('FC Rate', fcStats.formatted, fcStats.sub, null, ICONS.fc);

    m4Grid.append(cardSpeed.card, cardMomentum.card, cardAcc.card, cardFc.card);
    root.appendChild(m4Grid);

    // ─────────────────────────────────────────────
    // 2. UNIFIED SUMMARY CARD WITH STATUS BADGE & FAQ
    // ─────────────────────────────────────────────
    const summaryCard = document.createElement('div');
    summaryCard.className = 'rhythiax-summary-card';

    const summaryHeader = document.createElement('div');
    summaryHeader.className = 'rhythiax-summary-header';

    const headerLeft = document.createElement('div');
    headerLeft.className = 'rhythiax-summary-header-left';

    const summaryTitle = document.createElement('span');
    summaryTitle.className = 'rhythiax-summary-title';
    summaryTitle.innerHTML = `<span class="rhythiax-summary-icon">${ICONS.doc}</span> Summary`;

    const statusBadge = document.createElement('span');
    statusBadge.className = `rhythiax-status-badge ${momentum.status}`;
    statusBadge.innerHTML = `<span class="rhythiax-badge-icon">${getStatusSvg(momentum.iconType)}</span><span>${momentum.badge}</span>`;

    headerLeft.append(summaryTitle, statusBadge);

    // FAQ Button
    const faqBtn = document.createElement('button');
    faqBtn.type = 'button';
    faqBtn.className = 'rhythiax-faq-btn';
    faqBtn.title = 'View Playstyle status & momentum criteria';
    faqBtn.setAttribute('aria-label', 'Status FAQ');
    faqBtn.innerHTML = `${ICONS.help}<span>Status FAQ</span>`;

    summaryHeader.append(headerLeft, faqBtn);
    summaryCard.appendChild(summaryHeader);
    const momentumNote = document.createElement('p');
    momentumNote.className = 'rhythiax-momentum-note';
    momentumNote.textContent = momentum.context;
    momentumNote.hidden = !momentum.context;
    summaryCard.appendChild(momentumNote);

    // FAQ Popover Card (Collapsible, pure SVG, zero emoji)
    const faqPopover = document.createElement('div');
    faqPopover.className = 'rhythiax-faq-popover';
    faqPopover.style.display = 'none';
    faqPopover.innerHTML = `
      <div class="rhythiax-faq-header">
        <span class="rhythiax-faq-heading">Playstyle Statuses</span>
        <button type="button" class="rhythiax-faq-close" aria-label="Close FAQ">&times;</button>
      </div>
      <div class="rhythiax-faq-grid">
        <div class="rhythiax-faq-item">
          <span class="rhythiax-faq-tag win">${ICONS.trendingUp} Climbing</span>
          <p>Rank improved over 14 days. A fast climb means at least 5% of the previous rank, with a minimum of 3 places.</p>
        </div>
        <div class="rhythiax-faq-item">
          <span class="rhythiax-faq-tag loss">${ICONS.trendingDown} Dropping</span>
          <p>Rank fell over 14 days, even if RP grew. A sharp drop uses the same 5% threshold, with a minimum of 3 places.</p>
        </div>
        <div class="rhythiax-faq-item">
          <span class="rhythiax-faq-tag steady">${ICONS.activity} Holding Steady</span>
          <p>Rank is unchanged. Stagnation is noted only with recent activity and almost no RP growth.</p>
        </div>
        <div class="rhythiax-faq-item">
          <span class="rhythiax-faq-tag elite">${ICONS.shield} Defending Top 30</span>
          <p>Holding the same rank in the top 30. Low RP gain alone does not count as stagnation here.</p>
        </div>
      </div>
      <p class="rhythiax-faq-note">RP notes use 14 days: below 0.5% gain is low; less than 0.1% movement is almost flat. Sudden moves use 2% over 3 days, minimum 3 places. Shorter history shows its actual comparison period.</p>
    `;

    faqBtn.addEventListener('click', () => {
      const isVisible = faqPopover.style.display !== 'none';
      faqPopover.style.display = isVisible ? 'none' : 'block';
      faqBtn.classList.toggle('active', !isVisible);
    });

    faqPopover.querySelector('.rhythiax-faq-close').addEventListener('click', () => {
      faqPopover.style.display = 'none';
      faqBtn.classList.remove('active');
    });

    summaryCard.appendChild(faqPopover);

    const summaryText = document.createElement('div');
    summaryText.className = 'rhythiax-summary-text';
    summaryText.innerHTML = scout.generateScoutingSummary({
      player,
      scores: topScores,
      overallStats,
      momentum,
      accTrend,
      speedSummary,
      bestMaps,
    });
    summaryCard.appendChild(summaryText);

    // Most Played Mods Bar
    const modsBar = document.createElement('div');
    modsBar.className = 'rhythiax-mods-bar';

    const modsLabel = document.createElement('span');
    modsLabel.className = 'rhythiax-mods-label';
    modsLabel.textContent = 'Top-score Mods:';
    modsBar.appendChild(modsLabel);

    if (mostPlayedMods.length > 0) {
      mostPlayedMods.forEach(m => {
        const chip = document.createElement('span');
        chip.className = 'rhythiax-mod-chip';
        const strong = document.createElement('strong');
        strong.textContent = m.label;
        if (m.isSpeed && m.speedKey) {
          strong.style.color = domain.SPEED_COLORS[m.speedKey] || 'inherit';
        }
        chip.appendChild(strong);
        chip.append(` (${m.count} ${m.count === 1 ? 'map' : 'maps'})`);
        modsBar.appendChild(chip);
      });
    } else {
      const none = document.createElement('span');
      none.className = 'rhythiax-mods-none';
      none.textContent = 'None';
      modsBar.appendChild(none);
    }

    const showSummary = typeof RhythiaX.isModuleOptionEnabled === 'function'
      ? RhythiaX.isModuleOptionEnabled('advancedStats', 'scoutingSummary') !== false
      : true;

    if (showSummary) {
      summaryCard.appendChild(modsBar);
      root.appendChild(summaryCard);
    }

    // ─────────────────────────────────────────────
    // 3. PERFORMANCE BREAKDOWN & BEST MAPS
    // ─────────────────────────────────────────────
    const showBreakdown = typeof RhythiaX.isModuleOptionEnabled === 'function'
      ? RhythiaX.isModuleOptionEnabled('advancedStats', 'performanceBreakdown') !== false
      : true;
    const showBestMaps = typeof RhythiaX.isModuleOptionEnabled === 'function'
      ? RhythiaX.isModuleOptionEnabled('advancedStats', 'bestMaps') !== false
      : true;

    const breakdownPanel = document.createElement('section');
    breakdownPanel.className = 'rhythiax-breakdown-panel';
    breakdownPanel.setAttribute('aria-label', 'Performance Breakdown');
    const breakdownHeader = document.createElement('div');
    breakdownHeader.className = 'rhythiax-breakdown-header';
    const breakdownTitle = document.createElement('span');
    breakdownTitle.className = 'rhythiax-breakdown-title';
    breakdownTitle.textContent = 'Performance Breakdown';
    const breakdownHint = document.createElement('span');
    breakdownHint.className = 'rhythiax-breakdown-hint';
    breakdownHint.textContent = scores.length
      ? scores.length + ' scores · counts below'
      : 'No scores available yet';
    breakdownHeader.append(breakdownTitle, breakdownHint);
    const breakdownSections = document.createElement('div');
    breakdownSections.className = 'rhythiax-breakdown-sections';

    function createBreakdownSection(label, keys, buckets, colors, suffix) {
      const section = document.createElement('div');
      section.className = 'rhythiax-breakdown-section';
      const heading = document.createElement('h3');
      heading.className = 'rhythiax-breakdown-sublabel';
      heading.textContent = label;
      const grid = document.createElement('div');
      grid.className = 'rhythiax-breakdown-grid ' + (suffix ? 'is-speed' : 'is-grade');
      keys.forEach(key => {
        const count = buckets[key] || 0;
        const share = scores.length ? count / scores.length * 100 : 0;
        const shareText = share.toFixed(1).replace(/\.0$/, '') + '%';
        const item = document.createElement('div');
        item.className = 'rhythiax-breakdown-item';
        item.title = key + suffix + ': ' + count + (count === 1 ? ' score' : ' scores') + ' · ' + shareText;
        item.style.setProperty('--breakdown-color', colors[key]);
        const name = document.createElement('span');
        name.className = 'rhythiax-breakdown-label';
        name.textContent = key + suffix;
        const amount = document.createElement('span');
        amount.className = 'rhythiax-breakdown-count';
        amount.textContent = String(count);
        item.setAttribute('aria-label', item.title);
        item.append(name, amount);
        grid.appendChild(item);
      });
      section.append(heading, grid);
      return section;
    }
    breakdownSections.append(
      createBreakdownSection('Speed', domain.SPEED_KEYS, speedBuckets, domain.SPEED_COLORS, 'x'),
      createBreakdownSection('Accuracy grades', domain.GRADE_KEYS, gradeBuckets, domain.GRADE_COLORS, '')
    );
    breakdownPanel.append(breakdownHeader, breakdownSections);

    // Right Panel: Best Maps Box (3 Centered Records)
    let bestMapsBox = null;
    if (showBestMaps) {
      bestMapsBox = document.createElement('div');
      bestMapsBox.className = 'rhythiax-best-maps-box';

      const bestMapsHeader = document.createElement('div');
      bestMapsHeader.className = 'rhythiax-best-maps-header';
      bestMapsHeader.innerHTML = `
        <span class="rhythiax-best-maps-title"><span class="rhythiax-best-icon">${ICONS.star}</span> Best Maps</span>
        <span class="rhythiax-best-maps-hint">Top standout plays</span>
      `;
      bestMapsBox.appendChild(bestMapsHeader);

      const renderBestMapItem = (label, item) => {
        const row = document.createElement('div');
        row.className = 'rhythiax-best-map-item';
        if (!item) {
          row.innerHTML = `
            <div class="rhythiax-best-map-left">
              <span class="rhythiax-best-map-kind">${label}</span>
              <span class="rhythiax-best-map-name">—</span>
            </div>
            <span class="rhythiax-best-map-pill accuracy">—</span>
          `;
          return row;
        }

        const left = document.createElement('div');
        left.className = 'rhythiax-best-map-left';

        const kind = document.createElement('span');
        kind.className = 'rhythiax-best-map-kind';
        kind.textContent = label;

        const name = document.createElement('span');
        name.className = 'rhythiax-best-map-name';
        name.textContent = item.name;
        name.title = item.name; // Full tooltip on hover

        left.append(kind, name);

        const pill = document.createElement('span');
        pill.className = `rhythiax-best-map-pill ${item.kind || 'accuracy'}`;
        pill.textContent = item.pill;

        row.append(left, pill);
        return row;
      };

      bestMapsBox.appendChild(renderBestMapItem('Best Accuracy', bestMaps.bestAccuracy));
      bestMapsBox.appendChild(renderBestMapItem('Top RP Play', bestMaps.topRp));
      bestMapsBox.appendChild(renderBestMapItem('Most Notes Map', bestMaps.mostNotes));
    }

    if (showBreakdown || showBestMaps) {
      const bottomRow = document.createElement('div');
      bottomRow.className = 'rhythiax-bottom-row';
      if (!showBreakdown || !showBestMaps) bottomRow.classList.add('is-single-column');
      if (showBreakdown) bottomRow.appendChild(breakdownPanel);
      if (showBestMaps && bestMapsBox) bottomRow.appendChild(bestMapsBox);
      root.appendChild(bottomRow);
    }

    // Mount to container cleanly
    container.replaceChildren(root);

    // ─────────────────────────────────────────────
    // 4. ASYNC BACKGROUND REFINEMENT (HISTORY & MOMENTUM UP TO 30D)
    // ─────────────────────────────────────────────
    if (playerId) {
      loader.resolvePlayerHistory(playerId, player).then(points => {
        if (!root.isConnected || container.firstElementChild !== root) return;
        const resolvedPoints = points?.length ? points : officialHistory;

        let resolvedRank = player.globalRank || player.position;
        if (!resolvedRank && typeof RhythiaX.extractPlayerData === 'function') {
          resolvedRank = RhythiaX.extractPlayerData()?.globalRank;
        }
        if (!resolvedRank && resolvedPoints[0]?.rank) {
          resolvedRank = resolvedPoints[0].rank;
        }

        const refinedMomentum = scout.evaluateMomentum(resolvedRank, resolvedPoints, Date.now(), player.rp, momentumActivity);
        const refinedAcc = scout.evaluateAccuracyTrend(scores, resolvedPoints);
        const momColor = STATUS_COLORS[refinedMomentum.status] || '#fafafa';
        const aColor = refinedAcc.delta > 0 ? '#4ade80' : (refinedAcc.delta < 0 ? '#f87171' : '#a1a1aa');

        // Update Momentum card
        cardMomentum.val.textContent = refinedMomentum.label;
        cardMomentum.val.style.color = momColor;
        cardMomentum.sb.textContent = refinedMomentum.sub;
        cardMomentum.ico.innerHTML = getStatusSvg(refinedMomentum.iconType);
        cardMomentum.ico.style.color = momColor;

        // Update Accuracy Trend card
        cardAcc.val.textContent = refinedAcc.formatted;
        cardAcc.val.style.color = aColor;
        cardAcc.sb.textContent = refinedAcc.sub;
        cardAcc.ico.style.color = aColor;

        // Update Badge
        statusBadge.className = `rhythiax-status-badge ${refinedMomentum.status}`;
        statusBadge.innerHTML = `<span class="rhythiax-badge-icon">${getStatusSvg(refinedMomentum.iconType)}</span><span>${refinedMomentum.badge}</span>`;
        momentumNote.textContent = refinedMomentum.context;
        momentumNote.hidden = !refinedMomentum.context;

        // Update Summary Text
        summaryText.innerHTML = scout.generateScoutingSummary({
          player,
          scores: topScores,
          overallStats,
          momentum: refinedMomentum,
          accTrend: refinedAcc,
          speedSummary,
          bestMaps,
        });
      }).catch(err => {
        if (typeof RhythiaX.log === 'function') {
          RhythiaX.log('Background playstyle history refinement caught:', err.message);
        }
      });
    }

    return root;
  }

  function reRender() {
    if (lastRenderCall?.container && lastRenderCall.container.isConnected) {
      render(lastRenderCall.container, lastRenderCall.context);
    }
  }

  RhythiaX.PlaystyleView = {
    render,
    reRender,
  };
})();
