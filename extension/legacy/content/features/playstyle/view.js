// =============================================
// Reimagined for Rhythia — Playstyle Feature: View Module
// The Playstyle tab, built from Rhythia's own pieces: the stat row of its Statistics card, its bordered panels and
// the rounded rows of its lists. Top to bottom: four values, the summary with its status and FAQ, the breakdown of
// the top plays (speed, grades and, with online history, map types) as bars with counts, and the best maps.
// Sections slide in once and the bars grow; reduced motion keeps them still.
// =============================================

var RhythiaX = RhythiaX || {};

(function () {
  const domain = RhythiaX.PlaystyleDomain;
  const scout = RhythiaX.PlaystyleScout;
  const loader = RhythiaX.PlaystyleLoader;

  // Status icons.
  const ICONS = {
    trendingUp: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
    trendingDown: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    pause: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>`,
    activity: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
  };
  // Section icons, Rhythia's lucide set.
  const SECTION_ICONS = {
    summary: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>',
    breakdown: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12h4"/><path d="M3 6h12"/><path d="M3 18h8"/></svg>',
    maps: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11.5 2.5 14 8l6 .7-4.4 4.1 1.2 5.9-5.3-3-5.3 3 1.2-5.9L3 8.7 9 8z"/></svg>',
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
  // Map types from the history service (online history only), in the colours Rhythia's map pages use for them
  // (pages/maps.css), by the names both looks use (shared/game-terms.js). A newer render drops an older one's late answer.
  const MAP_TYPES = [['jump', 'jump', '#f59e0b'], ['stream', 'stream', '#38bdf8'], ['tech', 'tech', '#f472b6'], ['varied', 'other', '#a78bfa']]
    .map(([id, cls, color]) => [id, RhythiaX.GameTerms.typeName(id), cls, color]);
  let mapTypesGen = 0;
  // The observer waiting for the breakdown to come on screen before its map types are asked for.
  let typesWatch = null;

  // Statistics variant B tells what happened from ranked plays and history (scout.buildStory).
  function storyHtml(story, status) {
    const tone = status === 'loss' ? 'negative' : status === 'win' ? 'positive' : '';
    return story.paragraphs.map((text, i) => '<p>' + (i === 0 && story.lead
      ? '<span class="rhythiax-story-lead ' + tone + '">' + story.lead.replace(/[&<>"']/g, '') + '.</span> ' : '') + text + '</p>').join('');
  }

  // The four values in plain words: a number, and what it means under it.
  function values({ scores, speedSummary, momentum, accTrend, fcStats }) {
    const total = scores.length;
    const share = total ? Math.round((domain.getSpeedBuckets(scores)[speedSummary.dominantSpeed] || 0) / total * 100) : 0;
    const move = momentum.comparisonDays
      ? (momentum.rankDelta > 0 ? '▲ ' : momentum.rankDelta < 0 ? '▼ ' : '±') + Math.abs(momentum.rankDelta || 0) + ' ranks in ' + momentum.comparisonDays + ' days'
      : 'Needs 14 days of history';
    const acc = accTrend.hasHistory ? (accTrend.delta > 0 ? '+' : accTrend.delta < 0 ? '−' : '±') + Math.abs(accTrend.delta).toFixed(2) + '%' : '—';
    return {
      speed: total ? share + '% of top plays' : 'No top plays yet',
      momentum: move,
      accuracy: [acc, accTrend.hasHistory ? 'Average accuracy vs ' + accTrend.days + ' days ago' : 'No accuracy history yet'],
      fc: [String(fcStats.count || 0), total ? 'of ' + fcStats.total + ' top plays · ' + fcStats.ratio + '%' : 'No top plays yet'],
    };
  }

  // A bordered panel with Rhythia's section heading (icon, title, and a note on the right).
  function panel(cls, icon, title, note) {
    const box = document.createElement('section');
    box.className = cls + ' rhythiax-ps-panel';
    const head = document.createElement('div');
    head.className = 'rhythiax-ps-head';
    const h = document.createElement('h3');
    h.className = 'rhythiax-ps-title';
    h.innerHTML = SECTION_ICONS[icon] || '';
    h.append(title);
    head.appendChild(h);
    const hint = document.createElement('span');
    hint.className = 'rhythiax-ps-hint';
    hint.textContent = note || '';
    head.appendChild(hint);
    box.appendChild(head);
    return { box, head, hint };
  }

  // One group of the breakdown: a bar split by share, and under it each part with its count and share. Parts with
  // no plays stay in the list, dimmed, so the groups read the same for every player.
  function breakdownGroup(label, parts, total) {
    const section = document.createElement('div');
    section.className = 'rhythiax-breakdown-section';
    const heading = document.createElement('div');
    heading.className = 'rhythiax-breakdown-sublabel';
    heading.textContent = label;
    const bar = document.createElement('div');
    bar.className = 'rhythiax-breakdown-bar';
    bar.setAttribute('role', 'img');
    const list = document.createElement('div');
    list.className = 'rhythiax-breakdown-grid';
    const said = [];
    parts.forEach(({ name, count, color, cls }) => {
      const share = total ? count / total * 100 : 0;
      const shareText = share.toFixed(1).replace(/\.0$/, '') + '%';
      if (count) {
        const piece = document.createElement('span');
        piece.style.flexGrow = String(count);
        piece.style.background = color;
        if (cls) piece.className = cls;
        piece.title = name + ': ' + count + ' · ' + shareText;
        bar.appendChild(piece);
        said.push(name + ' ' + count);
      }
      const item = document.createElement('div');
      item.className = 'rhythiax-breakdown-item' + (count ? '' : ' is-zero') + (cls ? ' ' + cls : '');
      item.title = name + ': ' + count + (count === 1 ? ' score' : ' scores') + ' · ' + shareText;
      item.style.setProperty('--breakdown-color', color);
      const dot = document.createElement('i');
      dot.className = 'rhythiax-breakdown-dot';
      const nameEl = document.createElement('span');
      nameEl.className = 'rhythiax-breakdown-label';
      nameEl.textContent = name;
      const amount = document.createElement('span');
      amount.className = 'rhythiax-breakdown-count';
      amount.textContent = String(count);
      const pct = document.createElement('span');
      pct.className = 'rhythiax-breakdown-share';
      pct.textContent = count ? shareText : '';
      item.setAttribute('aria-label', item.title);
      item.append(dot, nameEl, amount, pct);
      list.appendChild(item);
    });
    if (!said.length) bar.classList.add('is-empty');
    bar.setAttribute('aria-label', label + ': ' + (said.join(', ') || 'none'));
    section.append(heading, bar, list);
    return section;
  }

  // Elements that slide in one after another the first time the pane shows.
  function comeIn(nodes) {
    nodes.forEach((node, i) => {
      node.style.setProperty('--i', String(Math.min(i, 12)));
      node.classList.add('is-in');
    });
  }

  // The players ranked just above and below on the same maps, from the compare answer: how this top stands against
  // theirs, on how many maps it beats most players above, which map type each leans to, and two maps they have
  // that this top has not. Empty when there is no answer to tell from.
  const KIND_WORD = { jump: 'jumps', stream: 'streams', tech: 'tech', varied: 'varied maps' };
  function nearWords(d) {
    if (!d?.available || !d.band?.above || !d.band?.below || !d.summary) return '';
    const b = d.band, m = d.summary, f = n => Number(n || 0).toLocaleString('en-US');
    const esc = s => (RhythiaX.escapeHtml ? RhythiaX.escapeHtml(String(s ?? '')) : String(s ?? ''));
    const verdict = { ahead: 'Ahead of them', at_level: 'At their level', slightly_behind: 'A little behind them', behind: 'Behind them' }[m.verdict];
    const out = [];
    const who = `the players ranked #${f(b.above.from)}–${f(b.above.to)} and #${f(b.below.from)}–${f(b.below.to)}`;
    if (verdict && m.compared >= 10) {
      out.push(`<strong>${verdict}</strong>: against ${who}, higher than <strong>${Math.round((m.share || 0) * 100)}%</strong> of them on ${f(m.compared)} shared maps.`);
      out.push(`Beats most players above on <strong>${f(m.above)}</strong> ${m.above === 1 ? 'map' : 'maps'}; on ${f(m.below)} most players below score higher.`);
    } else {
      out.push(`Fewer than 10 maps shared with ${who} so far.`);
    }
    const lean = side => {
      const v = d.mapTypes?.[side] || {};
      const k = Object.keys(KIND_WORD).sort((x, y) => (v[y] || 0) - (v[x] || 0))[0];
      return k && v[k] > 0 ? [k, Math.round(v[k] * 100)] : null;
    };
    const mine = lean('you'), theirs = lean('above');
    if (mine && theirs) {
      out.push(`This top is mostly ${KIND_WORD[mine[0]]} (${mine[1]}%)${theirs[0] === mine[0] ? ', like the players above' : `; the players above lean to ${KIND_WORD[theirs[0]]} (${theirs[1]}%)`}.`);
    }
    const missing = (d.players?.missing || []).slice(0, 2).map(x => `<strong>${esc(x.title)}</strong>`);
    if (missing.length) out.push(`In their tops but not in this one: ${missing.join(' and ')}.`);
    return out.join(' ');
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

    const root = document.createElement('div');
    root.className = 'rhythiax-playstyle-deck';
    root.dataset.rhythiaxStatsVariant = RhythiaX.getStatsVariant?.() || 'variant_a';
    const animated = [];

    // ── 1. Four values, as the stat row of Rhythia's Statistics card ──
    const m4Grid = document.createElement('div');
    m4Grid.className = 'rhythiax-m4-grid';
    const vb = values({ scores, speedSummary, momentum, accTrend, fcStats });
    const cardSpeed = createMetricCard('Main speed', speedSummary.value, vb.speed);
    const cardMomentum = createMetricCard('Momentum', momentum.label, vb.momentum, momentum.status);
    const cardAcc = createMetricCard('Accuracy trend', vb.accuracy[0], vb.accuracy[1], trendTone(accTrend.delta));
    const cardFc = createMetricCard('Full combos', vb.fc[0], vb.fc[1]);
    m4Grid.append(cardSpeed.card, cardMomentum.card, cardAcc.card, cardFc.card);
    root.appendChild(m4Grid);
    animated.push(m4Grid);

    // ── 2. Summary: status, FAQ, the words and the mods on the top plays ──
    const summary = panel('rhythiax-summary-card', 'summary', 'Summary', '');
    const summaryCard = summary.box;
    const statusBadge = document.createElement('span');
    statusBadge.className = `rhythiax-status-badge ${momentum.status}`;
    statusBadge.innerHTML = `<span class="rhythiax-badge-icon">${getStatusSvg(momentum.iconType)}</span><span>${momentum.badge}</span>`;
    summary.head.querySelector('.rhythiax-ps-title').after(statusBadge);

    const faqBtn = document.createElement('button');
    faqBtn.type = 'button';
    faqBtn.className = 'rhythiax-faq-btn';
    faqBtn.textContent = 'How statuses work';
    faqBtn.setAttribute('aria-expanded', 'false');
    summary.hint.replaceWith(faqBtn);

    const momentumNote = document.createElement('p');
    momentumNote.className = 'rhythiax-momentum-note';
    momentumNote.textContent = momentum.context;
    momentumNote.hidden = !momentum.context;
    summaryCard.appendChild(momentumNote);

    // How statuses work.
    const faqPopover = document.createElement('div');
    faqPopover.className = 'rhythiax-faq-popover';
    faqPopover.style.display = 'none';
    faqPopover.innerHTML = `
      <div class="rhythiax-faq-header">
        <span class="rhythiax-faq-heading">Statuses</span>
        <button type="button" class="rhythiax-faq-close" aria-label="Close FAQ">&times;</button>
      </div>
      <div class="rhythiax-faq-grid">
        <div class="rhythiax-faq-item">
          <span class="rhythiax-faq-tag win">${ICONS.trendingUp} Climbing</span>
          <p>Rank went up over 14 days. A fast climb is at least 5% of the earlier rank and at least 3 places.</p>
        </div>
        <div class="rhythiax-faq-item">
          <span class="rhythiax-faq-tag loss">${ICONS.trendingDown} Dropping</span>
          <p>Rank went down over 14 days, even if RP grew. A sharp drop uses the same 5% and 3-place limits.</p>
        </div>
        <div class="rhythiax-faq-item">
          <span class="rhythiax-faq-tag steady">${ICONS.activity} Holding Steady</span>
          <p>Rank unchanged. Little progress is noted only when the player is active and RP barely grows.</p>
        </div>
        <div class="rhythiax-faq-item">
          <span class="rhythiax-faq-tag elite">${ICONS.shield} Defending Top 30</span>
          <p>Same rank inside the top 30. Low RP gain alone does not count as little progress here.</p>
        </div>
      </div>
      <p class="rhythiax-faq-note">RP over 14 days: under 0.5% gain is low, under 0.1% either way is flat. Sudden moves: 2% of rank in 3 days, at least 3 places. With less history, the real period is shown.</p>
    `;
    const showFaq = open => {
      faqPopover.style.display = open ? 'block' : 'none';
      faqBtn.classList.toggle('active', open);
      faqBtn.setAttribute('aria-expanded', String(open));
    };
    faqBtn.addEventListener('click', () => showFaq(faqPopover.style.display === 'none'));
    faqPopover.querySelector('.rhythiax-faq-close').addEventListener('click', () => showFaq(false));
    summaryCard.appendChild(faqPopover);

    const summaryText = document.createElement('div');
    summaryText.className = 'rhythiax-summary-text';
    const recentScores = scoreSets?.recentScores || [];
    const writeSummary = (points, refined) => {
      if (variantB) {
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

    // The mods on the top plays, as Rhythia's chips.
    const modsBar = document.createElement('div');
    modsBar.className = 'rhythiax-mods-bar';
    const modsLabel = document.createElement('span');
    modsLabel.className = 'rhythiax-mods-label';
    modsLabel.textContent = 'Mods in top plays';
    modsBar.appendChild(modsLabel);
    if (mostPlayedMods.length > 0) {
      mostPlayedMods.forEach(m => {
        const chip = document.createElement('span');
        chip.className = 'rhythiax-mod-chip';
        const strong = document.createElement('strong');
        strong.textContent = m.label;
        if (m.isSpeed && m.speedKey) chip.style.setProperty('--chip-color', domain.SPEED_COLORS[m.speedKey] || 'currentColor');
        const count = document.createElement('span');
        count.textContent = m.count + (m.count === 1 ? ' map' : ' maps');
        chip.append(strong, count);
        modsBar.appendChild(chip);
      });
    } else {
      const none = document.createElement('span');
      none.className = 'rhythiax-mods-none';
      none.textContent = 'None';
      modsBar.appendChild(none);
    }
    summaryCard.appendChild(modsBar);

    // Near this rank, in a few words: Exodus' Scores shows it in full (pages/profile-scores.js nearSection); here it
    // is one row under the mods from the same answer of the history service (online history, top 5,000, Lock).
    // vps-client keeps the answer and shares a request on its way, so a redraw asks nothing new.
    const showSummary = typeof RhythiaX.isModuleOptionEnabled === 'function'
      ? RhythiaX.isModuleOptionEnabled('advancedStats', 'scoutingSummary') !== false
      : true;
    if (showSummary) {
      const nearRow = document.createElement('div');
      nearRow.className = 'rhythiax-near-row';
      nearRow.hidden = true;
      summaryCard.appendChild(nearRow);
      if (playerId && typeof RhythiaX.fetchVpsCompare === 'function') {
        RhythiaX.fetchVpsCompare(playerId, 'lock', null).then(answer => {
          const words = nearWords(answer);
          if (!words || !nearRow.isConnected) return;
          nearRow.innerHTML = `<span class="rhythiax-mods-label">Near this rank</span><p>${words}</p>`;
          nearRow.hidden = false;
          nearRow.classList.add('is-in');
        }, () => {});
      }
      root.appendChild(summaryCard);
      animated.push(summaryCard);
    }

    // ── 3. Breakdown and best maps ──
    const showBreakdown = typeof RhythiaX.isModuleOptionEnabled === 'function'
      ? RhythiaX.isModuleOptionEnabled('advancedStats', 'performanceBreakdown') !== false
      : true;
    const showBestMaps = typeof RhythiaX.isModuleOptionEnabled === 'function'
      ? RhythiaX.isModuleOptionEnabled('advancedStats', 'bestMaps') !== false
      : true;

    const breakdown = panel('rhythiax-breakdown-panel', 'breakdown', 'Breakdown', scores.length ? scores.length + ' top plays' : 'No scores yet');
    const breakdownPanel = breakdown.box;
    breakdownPanel.setAttribute('aria-label', 'Breakdown');
    const breakdownSections = document.createElement('div');
    breakdownSections.className = 'rhythiax-breakdown-sections';
    const group = (label, keys, buckets, colors, suffix) => breakdownGroup(label,
      keys.map(key => ({ name: key + suffix, count: buckets[key] || 0, color: colors[key] })), scores.length);
    breakdownSections.append(
      group('Speed', domain.SPEED_KEYS, speedBuckets, domain.SPEED_COLORS, 'x'),
      group('Grades', domain.GRADE_KEYS, gradeBuckets, domain.GRADE_COLORS, '')
    );
    breakdownPanel.appendChild(breakdownSections);
    // The types of the maps in these plays, added once they arrive: from the history service, or without online
    // history worked out in this browser when the player turned that on.
    // They are asked for once the breakdown is on screen (the Playstyle tab may never be opened), and leaving the page
    // stops the request, or without online history the reading of map files.
    const typesGen = ++mapTypesGen;
    const askTypes = () => RhythiaX.fetchVpsMapKinds?.(scores.map(s => s.songId || s.beatmapHash), RhythiaX.beatmapPageSignal?.()).then(kinds => {
      if (typesGen !== mapTypesGen || !breakdownSections.isConnected || !kinds?.size) return;
      const counts = {};
      let known = 0;
      scores.forEach(s => {
        const k = kinds.get(s.songId || s.beatmapHash);
        if (!k || !MAP_TYPES.some(([id]) => id === k.kind)) return;
        counts[k.kind] = (counts[k.kind] || 0) + 1;
        known++;
      });
      if (!known) return;
      // Without online history the types may be worked out in this browser (shared/map-kinds-basic.js): approximate,
      // and never Techs, so that row is left out.
      const approx = [...kinds.values()].some(k => k?.approximate);
      const section = breakdownGroup('Map types', MAP_TYPES.filter(([id]) => !(approx && id === 'tech')).map(([id, name, cls, color]) =>
        ({ name, count: counts[id] || 0, color: `var(--rhythiax-kind, ${color})`, cls: 'rhythiax-k-' + cls })), known);
      const note = Object.assign(document.createElement('small'), { textContent: known + ' of ' + scores.length + ' known' + (approx ? ' · approximate' : '') });
      if (approx) note.title = 'Worked out in this browser from the map files, without online history. Online history tells Techs.';
      section.querySelector('.rhythiax-breakdown-sublabel').append(note);
      breakdownSections.appendChild(section);
      comeIn([section]);
    }, () => {});
    typesWatch?.disconnect();
    typesWatch = null;
    if (showBreakdown && scores.length) {
      if (typeof IntersectionObserver !== 'function') askTypes();
      else {
        const watch = new IntersectionObserver(entries => {
          if (!entries.some(e => e.isIntersecting)) return;
          watch.disconnect();
          if (typesWatch === watch) typesWatch = null;
          if (typesGen === mapTypesGen && breakdownSections.isConnected) askTypes();
        });
        typesWatch = watch;
        watch.observe(breakdownSections);
      }
    }

    // Best maps: three rows like Rhythia's lists, with the map art as on the score cards (off when "Map art behind
    // cards" is off).
    let bestMapsBox = null;
    if (showBestMaps) {
      bestMapsBox = panel('rhythiax-best-maps-box', 'maps', 'Best maps', '').box;
      const list = document.createElement('div');
      list.className = 'rhythiax-best-maps-list';
      const showArt = RhythiaX.isCardBackgroundsEnabled?.() !== false;
      const token = RhythiaX.navigationToken;
      [['Best accuracy', bestMaps.bestAccuracy], ['Most RP', bestMaps.topRp], ['Most notes', bestMaps.mostNotes]].forEach(([label, item]) => {
        const row = document.createElement('div');
        row.className = 'rhythiax-best-map-item';
        const art = document.createElement('span');
        art.className = 'rhythiax-best-map-art';
        const left = document.createElement('div');
        left.className = 'rhythiax-best-map-left';
        const kind = document.createElement('span');
        kind.className = 'rhythiax-best-map-kind';
        kind.textContent = label;
        const name = document.createElement('span');
        name.className = 'rhythiax-best-map-name';
        name.textContent = item ? item.name : '—';
        if (item) name.title = item.name;
        left.append(kind, name);
        const [main, speed] = item ? String(item.pill).split(' • ') : ['—', ''];
        const pill = document.createElement('span');
        pill.className = `rhythiax-best-map-pill ${item?.kind || 'accuracy'}`;
        const value = document.createElement('b');
        value.textContent = main;
        pill.appendChild(value);
        if (speed) pill.append(Object.assign(document.createElement('small'), { textContent: speed }));
        row.append(art, left, pill);
        const key = item?.score && (item.score.beatmapId || item.score.beatmapHash || item.score.songId);
        if (showArt && key && RhythiaX.resolveBeatmapMeta) {
          RhythiaX.resolveBeatmapMeta(key, { signal: RhythiaX.beatmapPageSignal?.() }).then(meta => {
            if (!meta?.previewUrl || !art.isConnected || token !== RhythiaX.navigationToken) return;
            const img = document.createElement('img');
            img.alt = '';
            img.loading = 'lazy';
            img.src = meta.previewUrl;
            art.appendChild(img);
          }).catch(() => {});
        }
        list.appendChild(row);
      });
      bestMapsBox.appendChild(list);
    }

    if (showBreakdown || showBestMaps) {
      const bottomRow = document.createElement('div');
      bottomRow.className = 'rhythiax-bottom-row';
      if (!showBreakdown || !showBestMaps) bottomRow.classList.add('is-single-column');
      if (showBreakdown) { bottomRow.appendChild(breakdownPanel); animated.push(breakdownPanel); }
      if (showBestMaps && bestMapsBox) { bottomRow.appendChild(bestMapsBox); animated.push(bestMapsBox); }
      root.appendChild(bottomRow);
    }

    container.replaceChildren(root);
    comeIn(animated);

    // ── 4. History, once it loads: momentum and the accuracy trend over up to 30 days ──
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
        const rb = values({ scores, speedSummary, momentum: refinedMomentum, accTrend: refinedAcc, fcStats });
        cardMomentum.val.textContent = refinedMomentum.label;
        cardMomentum.sb.textContent = rb.momentum;
        setTone(cardMomentum.card, refinedMomentum.status);

        cardAcc.val.textContent = rb.accuracy[0];
        cardAcc.sb.textContent = rb.accuracy[1];
        setTone(cardAcc.card, trendTone(refinedAcc.delta));

        statusBadge.className = `rhythiax-status-badge ${refinedMomentum.status}`;
        statusBadge.innerHTML = `<span class="rhythiax-badge-icon">${getStatusSvg(refinedMomentum.iconType)}</span><span>${refinedMomentum.badge}</span>`;
        momentumNote.textContent = refinedMomentum.context;
        momentumNote.hidden = !refinedMomentum.context;

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
