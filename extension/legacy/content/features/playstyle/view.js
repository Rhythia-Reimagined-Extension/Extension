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
    trendingUp: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    trendingDown: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
    activity: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  };

  function getStatusSvg(iconType) {
    if (iconType === 'shield') return ICONS.shield;
    if (iconType === 'trendingUp') return ICONS.trendingUp;
    if (iconType === 'trendingDown') return ICONS.trendingDown;
    if (iconType === 'pause') return ICONS.pause;
    return ICONS.activity;
  }

  // tone colours the value through CSS (a momentum status, or win / loss for a trend), so each theme picks
  // readable shades; no tone keeps it in the normal text colour.
  function createMetricCard(label, value, sub, tone) {
    const card = document.createElement('div');
    card.className = 'rhythiax-m4-card';
    if (tone) card.dataset.tone = tone;

    const lbl = document.createElement('span');
    lbl.className = 'rhythiax-m4-label';
    lbl.textContent = label;

    const val = document.createElement('span');
    val.className = 'rhythiax-m4-value';
    val.textContent = value;

    const sb = document.createElement('span');
    sb.className = 'rhythiax-m4-sub';
    sb.textContent = sub;

    card.append(lbl, val, sb);
    return { card, val, sb };
  }
  const trendTone = delta => (delta > 0 ? 'win' : delta < 0 ? 'loss' : '');
  const setTone = (card, tone) => { if (tone) card.dataset.tone = tone; else delete card.dataset.tone; };

  let lastRenderCall = null;

  // Statistics variant B tells what happened from ranked plays and history (scout.buildStory).
  function storyHtml(story, status) {
    const tone = status === 'loss' ? 'negative' : status === 'win' ? 'positive' : '';
    return story.paragraphs.map((text, i) => '<p>' + (i === 0 && story.lead
      ? '<span class="rhythiax-story-lead ' + tone + '">' + story.lead.replace(/[&<>"']/g, '') + '.</span> ' : '') + text + '</p>').join('');
  }

  // Variant B wording for the four values: a plain number, and what it means under it.
  function valuesB({ scores, speedSummary, momentum, accTrend, fcStats }) {
    const total = scores.length;
    const share = total ? Math.round((domain.getSpeedBuckets(scores)[speedSummary.dominantSpeed] || 0) / total * 100) : 0;
    const move = momentum.comparisonDays
      ? (momentum.rankDelta > 0 ? '▲ ' : momentum.rankDelta < 0 ? '▼ ' : '±') + Math.abs(momentum.rankDelta || 0) + ' ranks · ' + momentum.comparisonDays + ' days'
      : 'Needs 14 days of history';
    const acc = accTrend.hasHistory ? (accTrend.delta > 0 ? '+' : accTrend.delta < 0 ? '−' : '±') + Math.abs(accTrend.delta).toFixed(2) + '%' : '—';
    return {
      speed: total ? share + '% of top plays' : 'No top plays yet',
      momentum: move,
      accuracy: [acc, accTrend.hasHistory ? 'vs ' + accTrend.days + ' days ago' : 'No accuracy history yet'],
      fc: [fcStats.ratio + '%', fcStats.count + ' of ' + fcStats.total + ' top plays'],
    };
  }

  // Variant B Breakdown: one thin bar per group, with the counts in a legend under it.
  function stackedBar(label, keys, buckets, colors, suffix, total) {
    const section = document.createElement('div');
    section.className = 'rhythiax-ps2-stack';
    const heading = document.createElement('span');
    heading.className = 'rhythiax-ps2-sublabel';
    heading.textContent = label;
    const bar = document.createElement('div');
    bar.className = 'rhythiax-ps2-bar';
    bar.setAttribute('role', 'img');
    const legend = document.createElement('div');
    legend.className = 'rhythiax-ps2-legend';
    const parts = [];
    keys.forEach(key => {
      const count = buckets[key] || 0;
      const name = key + suffix;
      if (count) {
        const piece = document.createElement('span');
        piece.style.flex = String(count);
        piece.style.background = colors[key];
        piece.title = name + ': ' + count + ' of ' + total;
        bar.appendChild(piece);
        parts.push(name + ' ' + count);
      }
      const item = document.createElement('span');
      if (!count) item.className = 'is-zero';
      const name_ = document.createElement('b');
      name_.textContent = name;
      if (count) name_.style.color = colors[key];
      item.append(name_, String(count));
      legend.appendChild(item);
    });
    bar.setAttribute('aria-label', label + ': ' + (parts.join(', ') || 'none'));
    section.append(heading, bar, legend);
    return section;
  }

  function render(container, context = {}) {
    if (!container) return;
    lastRenderCall = { container, context };

    const scores = context.scores || [];
    const player = context.player || {};
    const variantB = RhythiaX.getStatsVariant?.() === 'variant_b';
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
    root.dataset.rhythiaxStatsVariant = RhythiaX.getStatsVariant?.() || 'variant_a';
    root.classList.toggle('rhythiax-playstyle-v2', variantB);

    // ─────────────────────────────────────────────
    // 1. TOP 4 METRICS
    // ─────────────────────────────────────────────
    const m4Grid = document.createElement('div');
    m4Grid.className = 'rhythiax-m4-grid';

    const vb = variantB ? valuesB({ scores, speedSummary, momentum, accTrend, fcStats }) : null;
    const cardSpeed = createMetricCard(vb ? 'Main speed' : 'Speed', speedSummary.value, vb ? vb.speed : speedSummary.sub);
    const cardMomentum = createMetricCard('Momentum', momentum.label, vb ? vb.momentum : momentum.sub, momentum.status);
    const cardAcc = createMetricCard('Accuracy Trend', vb ? vb.accuracy[0] : accTrend.formatted, vb ? vb.accuracy[1] : accTrend.sub, trendTone(accTrend.delta));
    const cardFc = createMetricCard('FC Rate', vb ? vb.fc[0] : fcStats.formatted, vb ? vb.fc[1] : fcStats.sub);

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
    summaryTitle.textContent = 'Summary';

    const statusBadge = document.createElement('span');
    statusBadge.className = `rhythiax-status-badge ${momentum.status}`;
    statusBadge.innerHTML = `<span class="rhythiax-badge-icon">${getStatusSvg(momentum.iconType)}</span><span>${momentum.badge}</span>`;

    headerLeft.append(summaryTitle, statusBadge);

    // FAQ Button
    const faqBtn = document.createElement('button');
    faqBtn.type = 'button';
    faqBtn.className = 'rhythiax-faq-btn';
    faqBtn.title = 'View Playstyle status & momentum criteria';
    faqBtn.textContent = 'How statuses work';

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
    const storyMode = variantB;
    const recentScores = scoreSets?.recentScores || [];
    const writeSummary = (points, refined) => {
      if (storyMode) {
        summaryText.classList.add('rhythiax-summary-story');
        momentumNote.hidden = true;
        summaryText.innerHTML = storyHtml(scout.buildStory({ history: points, recent: recentScores, top: topScores,
          rank: player.globalRank || player.position, rp: player.rp }), refined.status); // the status is already the badge above
        return;
      }
      summaryText.innerHTML = scout.generateScoutingSummary({ player, scores: topScores, overallStats, momentum: refined, accTrend, speedSummary, bestMaps });
    };
    writeSummary(officialHistory, momentum);
    summaryCard.appendChild(summaryText);

    // Most Played Mods Bar
    const modsBar = document.createElement('div');
    modsBar.className = 'rhythiax-mods-bar';

    const modsLabel = document.createElement('span');
    modsLabel.className = 'rhythiax-mods-label';
    modsLabel.textContent = 'Top-score mods';
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
      if (!variantB) summaryCard.appendChild(modsBar); // B: the Speed bar below shows the same
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
        item.className = 'rhythiax-breakdown-item' + (count ? '' : ' is-zero');
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
    if (variantB) {
      breakdownTitle.textContent = 'Breakdown';
      breakdownHint.textContent = scores.length ? scores.length + ' top plays' : 'No scores available yet';
      breakdownSections.append(
        stackedBar('Speed', domain.SPEED_KEYS, speedBuckets, domain.SPEED_COLORS, 'x', scores.length),
        stackedBar('Grades', domain.GRADE_KEYS, gradeBuckets, domain.GRADE_COLORS, '', scores.length)
      );
    } else {
      breakdownSections.append(
        createBreakdownSection('Speed', domain.SPEED_KEYS, speedBuckets, domain.SPEED_COLORS, 'x'),
        createBreakdownSection('Accuracy grades', domain.GRADE_KEYS, gradeBuckets, domain.GRADE_COLORS, '')
      );
    }
    breakdownPanel.append(breakdownHeader, breakdownSections);

    // Right Panel: Best Maps Box (3 Centered Records)
    let bestMapsBox = null;
    if (showBestMaps) {
      bestMapsBox = document.createElement('div');
      bestMapsBox.className = 'rhythiax-best-maps-box';

      const bestMapsHeader = document.createElement('div');
      bestMapsHeader.className = 'rhythiax-best-maps-header';
      bestMapsHeader.innerHTML = `
        <span class="rhythiax-best-maps-title">Best maps</span>
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

      if (variantB) {
        // Map art as on the score cards; off when "Map art behind cards" is off.
        bestMapsHeader.querySelector('.rhythiax-best-maps-hint')?.remove();
        bestMapsBox.classList.add('rhythiax-ps2-maps');
        const showArt = RhythiaX.isCardBackgroundsEnabled?.() !== false;
        const token = RhythiaX.navigationToken;
        [['Best accuracy', bestMaps.bestAccuracy], ['Most RP', bestMaps.topRp], ['Most notes', bestMaps.mostNotes]].forEach(([label, item]) => {
          const row = renderBestMapItem(label, item);
          const art = document.createElement('span');
          art.className = 'rhythiax-ps2-art';
          row.prepend(art);
          const key = item?.score && (item.score.beatmapId || item.score.beatmapHash || item.score.songId);
          if (showArt && key && RhythiaX.resolveBeatmapMeta) {
            RhythiaX.resolveBeatmapMeta(key).then(meta => {
              if (!meta?.previewUrl || !art.isConnected || token !== RhythiaX.navigationToken) return;
              const img = document.createElement('img');
              img.alt = '';
              img.loading = 'lazy';
              img.src = meta.previewUrl;
              art.appendChild(img);
            }).catch(() => {});
          }
          bestMapsBox.appendChild(row);
        });
      } else {
        bestMapsBox.appendChild(renderBestMapItem('Best Accuracy', bestMaps.bestAccuracy));
        bestMapsBox.appendChild(renderBestMapItem('Top RP Play', bestMaps.topRp));
        bestMapsBox.appendChild(renderBestMapItem('Most Notes Map', bestMaps.mostNotes));
      }
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
      const historyRevision = loader.getRevision?.();
      const applyHistoryPoints = points => {
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
        const rb = variantB ? valuesB({ scores, speedSummary, momentum: refinedMomentum, accTrend: refinedAcc, fcStats }) : null;
        cardMomentum.val.textContent = refinedMomentum.label;
        cardMomentum.sb.textContent = rb ? rb.momentum : refinedMomentum.sub;
        setTone(cardMomentum.card, refinedMomentum.status);

        cardAcc.val.textContent = rb ? rb.accuracy[0] : refinedAcc.formatted;
        cardAcc.sb.textContent = rb ? rb.accuracy[1] : refinedAcc.sub;
        setTone(cardAcc.card, trendTone(refinedAcc.delta));

        // Update Badge
        statusBadge.className = `rhythiax-status-badge ${refinedMomentum.status}`;
        statusBadge.innerHTML = `<span class="rhythiax-badge-icon">${getStatusSvg(refinedMomentum.iconType)}</span><span>${refinedMomentum.badge}</span>`;
        momentumNote.textContent = refinedMomentum.context;
        momentumNote.hidden = !refinedMomentum.context;

        // Update Summary Text
        accTrend = refinedAcc;
        writeSummary(resolvedPoints, refinedMomentum);
      };
      root._rhythiaxResetHistory = () => applyHistoryPoints([]);
      loader.resolvePlayerHistory(playerId, player).then(points => {
        if (historyRevision !== loader.getRevision?.()) return;
        applyHistoryPoints(points);
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
