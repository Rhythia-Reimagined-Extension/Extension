// =============================================
// Reimagined for Rhythia — Title Progression View
// Rhythia's title bar (Progress) and the History chart, and the card around them
// =============================================

var RhythiaX = RhythiaX || {};
RhythiaX.TitleProgression = RhythiaX.TitleProgression || {};

(function () {
  'use strict';

  const Domain = RhythiaX.TitleProgression.Domain;

  // 4. RENDER REIMAGINED HISTORY VIEW
  function renderHistoryView(playerData) {
    const histData = Domain.generateHistoryData(playerData);

    const legendHtml = `
      <div class="rhythiax-history-top-legend">
        <span><i class="rhythiax-history-legend-dot" style="background:#7ED54F;"></i>Novice</span>
        <span><i class="rhythiax-history-legend-dot" style="background:#04A0B6;"></i>Expert</span>
        <span><i class="rhythiax-history-legend-dot" style="background:#C26F38;"></i>Cand. Master</span>
        <span><i class="rhythiax-history-legend-dot" style="background:#B6463A;"></i>Master</span>
        <span><i class="rhythiax-history-legend-dot" style="background:#8A4FA0;"></i>Cand. GM</span>
      </div>
    `;

    const yAxisHtml = `
      <div class="rhythiax-y-axis-col">
        <span style="top:20.45%">10,000</span>
        <span style="top:38.64%">5,000</span>
        <span style="top:56.82%">2,500</span>
        <span style="top:70.45%">1,500</span>
        <span style="top:86.36%">0</span>
      </div>
    `;

    const xAxisHtml = `
      <div class="rhythiax-x-axis-row">
        ${histData.dateTicks.map(t => `<span>${RhythiaX.escapeHtml(t)}</span>`).join('')}
      </div>
    `;

    let milestoneDots = '';
    let tooltipsHtml = '';

    histData.milestones.forEach(m => {
      const tipId = `r-hist-tip-${m.id}`;
      milestoneDots += `
        <circle cx="${m.x}" cy="${m.y}" r="4.5" fill="${m.color}" stroke="#ffffff" stroke-width="1.5"
                class="rhythiax-history-interactive-dot" tabindex="0" role="img" aria-label="${RhythiaX.escapeHtml(m.tooltipText)}" data-tip-id="${tipId}"/>
      `;
      tooltipsHtml += `
        <div id="${tipId}" class="rhythiax-hist-tooltip-badge" style="left: ${(m.x / 940 * 100).toFixed(1)}%; top: ${(m.y / 220 * 100).toFixed(1)}%; --tag-color: ${m.color};">
          <span class="rhythiax-history-legend-dot" style="background: ${m.color};"></span>
          <span>${RhythiaX.escapeHtml(m.tooltipText)}</span>
        </div>
      `;
    });

    // Current point
    const cur = histData.currentPoint;
    const curTipId = 'r-hist-tip-current';
    milestoneDots += `
      <circle cx="${cur.x}" cy="${cur.y}" r="5" fill="${cur.color}" stroke="#ffffff" stroke-width="2"
              class="rhythiax-history-interactive-dot" tabindex="0" role="img" aria-label="${RhythiaX.escapeHtml(cur.tooltipText)}" data-tip-id="${curTipId}"/>
    `;
    tooltipsHtml += `
      <div id="${curTipId}" class="rhythiax-hist-tooltip-badge" style="right: 14px; top: ${(cur.y / 220 * 100).toFixed(1)}%; transform: translateY(-110%); --tag-color: ${cur.color};">
        <span class="rhythiax-history-legend-dot" style="background: ${cur.color};"></span>
        <span>${RhythiaX.escapeHtml(cur.tooltipText)}</span>
      </div>
    `;

    const svgChart = `
      <svg style="position:absolute; inset:0; width:100%; height:100%;" viewBox="0 0 940 220" preserveAspectRatio="none">
        <!-- Horizontal Reference Threshold Lines -->
        <line x1="50" y1="45" x2="925" y2="45" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3"/>
        <line x1="50" y1="85" x2="925" y2="85" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3"/>
        <line x1="50" y1="125" x2="925" y2="125" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3"/>
        <line x1="50" y1="155" x2="925" y2="155" stroke="rgba(255,255,255,0.06)" stroke-dasharray="3 3"/>
        <line x1="50" y1="190" x2="925" y2="190" stroke="rgba(255,255,255,0.08)"/>

        <!-- Subtle Tier Background Bands (Full Width to x=925) -->
        <rect x="50" y="45" width="875" height="40" fill="rgba(138, 79, 160, 0.05)"/>
        <rect x="50" y="85" width="875" height="40" fill="rgba(182, 70, 58, 0.035)"/>
        <rect x="50" y="125" width="875" height="30" fill="rgba(194, 111, 56, 0.03)"/>
        <rect x="50" y="155" width="875" height="35" fill="rgba(4, 160, 182, 0.03)"/>

        ${histData.milestones.map((m, i) => {
          const next = histData.milestones[i + 1] || histData.currentPoint;
          return `<path d="M ${m.x} ${m.y} L ${next.x} ${next.y}" fill="none" stroke="${m.color}" stroke-width="3" stroke-linejoin="round"/>`;
        }).join('')}

        <!-- Level Up Milestone Dots -->
        ${milestoneDots}
      </svg>
    `;

    return `
      <div class="rhythiax-history-card-wrap">
        ${legendHtml}
        <div class="rhythiax-history-chart-area">
          ${yAxisHtml}
          ${xAxisHtml}
          ${svgChart}
          ${tooltipsHtml}
        </div>
      </div>
    `;
  }

  // 5. THE TRACK: Exodus' Track look (pages/profile-title.js) in Rhythia's dress. A line with a part for each title
  // by the RP it needs, Rhythia's own title art above it on stems, filling with colour as the player gets there,
  // and a dot where the player is. Above: the title, the RP and the rank, and what the next title or Grandmaster
  // needs. Below: one line in Rhythia's words, and past 10,000 RP the top 30 as 27 places and 3 crowns, lit from
  // #30 up to the player's place once they are a Grandmaster. Titles follow Rhythia's rule: Master up to 10,000 RP,
  // Candidate Grandmaster above it, Grandmaster for the top 30 above it.
  // Rhythia's rule (domain.js, shared/game-terms.js): the titles, where each starts, the title for an RP and rank,
  // and how far along the way to the next one a player is.
  const { TITLES, NEXT, rpToGo } = Domain;
  const { percent } = RhythiaX.GameTerms;
  const NEED = ['0 RP', '1,500 RP', '2,500 RP', '5,000 RP', 'Above 10,000 RP', 'Top 30'];
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const fmt = (n, d = 0) => Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmtUp = n => fmt(Math.max(0, Math.ceil(n)));
  const esc = s => (RhythiaX.escapeHtml ? RhythiaX.escapeHtml(String(s)) : String(s));
  const ink = t => (t.id === 'grandmaster' ? 'var(--rhythiax-text-strong, #fff)' : t.c);
  const art = id => `/titles/${id}.png`;
  // The parts of the line, as in Exodus: the RP titles by what they need, then Grandmaster's part.
  const LEGS = [15, 10, 25, 50].map(v => v * 0.78).concat([22]);
  const AT = LEGS.reduce((a, v) => (a.push(a[a.length - 1] + v), a), [0]);
  const TRACK = { Wd: 720, x0: 26, x1: 694, Y: 66, H: 8, GAP: 0.7 };
  const tx = p => TRACK.x0 + (TRACK.x1 - TRACK.x0) * p / 100;
  const nodeX = k => (k === 5 ? tx(100) - 6 : tx(AT[k]) + (k ? 0 : 8));

  // Where the player stands: the title (0 to 5), how far to the next one (0 to 1) and the place on the line (0
  // to 100). Between Candidate Grandmaster and the top 30 the way is the RP #30 has (p30) when it is known,
  // otherwise the rank.
  function standing(rp, rank, p30) {
    const st = RhythiaX.GameTerms.standing(rp, rank, p30);
    return { ...st, pos: st.i === 5 ? 100 : AT[st.i] + LEGS[st.i] * st.u };
  }
  // What the next title or Grandmaster needs, shown large at the right.
  function goal(rp, rank, st, p30, inactive) {
    if (st.i === 5) {
      return { k: rank === 1 ? 'Number one' : rank <= 3 ? 'Podium finish' : 'Grandmaster', big: `#${rank}`, c: ink(TITLES[5]), sm: rank === 1 ? 'The one above the rest' : 'in the world' };
    }
    if (st.i === 4) {
      if (!rank) return { k: 'To Grandmaster', big: 'Not ranked', c: 'var(--rhythiax-text-muted, #94a3b8)', sm: inactive ? 'The next score brings the rank back' : 'Grandmaster needs a rank' };
      const n = rank - 30;
      return { k: `${st.near ? 'Almost there · ' : ''}To Grandmaster`, big: `${fmt(n)} ${n === 1 ? 'place' : 'places'}`, c: TITLES[4].c, sm: p30 > 10000 ? `#30 has ${fmt(Math.round(p30))} RP` : 'to the top 30' };
    }
    const next = TITLES[st.i + 1];
    return { k: `${st.near ? 'Almost there · ' : ''}To ${next.name}`, big: `${fmtUp(rpToGo(st.i, rp))} RP`, c: next.c, sm: `${percent(st.u)}% of the way` };
  }
  // The line under the track, in Rhythia's words where Rhythia has them.
  function barLine(rp, rank, st, p30, inactive) {
    const b = t => `<b class="rhythiax-tbar-em">${t}</b>`;
    if (st.i === 5) {
      if (rank === 1) return 'The one above the rest.';
      return `${rank <= 3 ? 'Podium finish!' : 'Grandmaster,'} ${b(`#${rank}`)} in the world. ${Domain.getStatusSummary(rp, rank).goalText}.`;
    }
    if (st.i === 4) {
      if (!rank) return `No rank while ${inactive ? 'inactive' : 'unranked'}, so Grandmaster waits.`;
      const n = rank - 30;
      return `${n <= 10 ? 'Almost there! ' : ''}${b(`${fmt(n)} ${n === 1 ? 'rank' : 'ranks'}`)} needed to unlock Grandmaster.${p30 > rp ? ` #30 has ${b(`${fmtUp(p30 - rp)} RP`)} more.` : ''}`;
    }
    const next = TITLES[st.i + 1];
    return `${next.name} starts ${st.i === 3 ? 'above' : 'at'} ${fmt(NEXT[st.i])} RP.`;
  }

  function nodeHtml(k) {
    const t = TITLES[k], x = nodeX(k), y = 27;
    return `<g class="rhythiax-track-node" data-k="${k}"><title>${esc(t.name)} · ${NEED[k]}</title>
      <image href="${art(t.id)}" x="${x - 15}" y="${y - 15}" width="30" height="30" class="off"/>
      <clipPath id="rhythiax-tclip-${k}"><rect x="${x - 16}" y="${y + 16}" width="32" height="0"/></clipPath>
      <image href="${art(t.id)}" x="${x - 15}" y="${y - 15}" width="30" height="30" clip-path="url(#rhythiax-tclip-${k})"/></g>`;
  }
  function trackSvg() {
    const { Wd, Y, H, GAP } = TRACK;
    const part = k => `x="${tx(AT[k]) + (k ? GAP * 2 : 0)}" y="${Y}" height="${H}" rx="4"`;
    const beds = TITLES.slice(0, 5).map((t, k) => `<rect class="rhythiax-track-bed" ${part(k)} width="${tx(AT[k + 1]) - tx(AT[k]) - GAP * 4}"/>`).join('');
    const legs = TITLES.slice(0, 5).map((t, k) => `<rect class="rhythiax-track-leg" data-k="${k}" ${part(k)} width="0" fill="${t.c}"/>`).join('');
    const stems = TITLES.map((t, k) => `<line class="rhythiax-track-stem" x1="${nodeX(k)}" y1="48" x2="${nodeX(k)}" y2="${Y - 3}"/>`).join('');
    return `<svg class="rhythiax-track-svg" viewBox="0 0 ${Wd} 104" role="img" aria-label="Titles on the way">${beds}${legs}${stems}`
      + `<circle class="rhythiax-track-dot" cy="${Y + H / 2}" r="7" cx="${tx(0)}"/>${TITLES.map((t, k) => nodeHtml(k)).join('')}`
      + `<text class="rhythiax-track-lab" y="${Y + 32}" text-anchor="middle"></text></svg>`;
  }
  // The top 30: 27 places from #30 to #4, then three crowns.
  function top30(rank, st) {
    if (st.i < 4) return '';
    const gm = st.i === 5, sw = 16, gap = 3.2, x = r => (30 - r) * (sw + gap), total = x(1) + sw;
    const crown = (r, on) => { const a = x(r); return `<path class="rhythiax-track-crown${on ? ` is-on p${r}` : ''}" d="M${a + 1},13 L${a + 2},4 L${a + 5.5},8.5 L${a + 8},2 L${a + 10.5},8.5 L${a + 14},4 L${a + 15},13 Z"/>`; };
    let cells = '';
    for (let r = 30; r >= 1; r--) {
      cells += r <= 3 ? crown(r, gm && r >= rank)
        : `<rect class="rhythiax-tbar-slot${gm && r >= rank ? ' is-on' : ''}${gm && r === rank ? ' is-me' : ''}" x="${x(r)}" y="3" width="${sw}" height="10" rx="3"/>`;
    }
    const me = gm ? `<text class="rhythiax-track-you" x="${x(rank) + sw / 2}" y="-6" text-anchor="middle">#${rank}</text>`
      : `<text class="rhythiax-track-you is-out" x="-10" y="12" text-anchor="end">${rank ? `#${fmt(rank)}` : '—'}</text>`;
    return `<div class="rhythiax-track-t30"><span class="rhythiax-track-k">Top 30</span><svg viewBox="${gm ? -20 : -56} -20 ${total + (gm ? 40 : 58)} 36" aria-label="${gm ? `#${rank} of the top 30` : 'Outside the top 30'}">${me}${cells}</svg></div>`;
  }

  // from: where the player stood at the last visit ({rp, rank}), null on a first look (the track fills from
  // nothing). p30: the RP #30 has, when known. The track is drawn by paintTrack; TitleProgression.Service moves it
  // from data-from-* to data-rp/data-rank once it is seen.
  function renderBar(rp, rank, from, inactive, p30 = 0) {
    const st = standing(rp, rank, p30), t = TITLES[st.i], g = goal(rp, rank, st, p30, inactive);
    const start = from ? { rp: from.rp, rank: from.rank ?? rank } : { rp: 0, rank: st.i === 5 ? 31 : rank };
    const slots = st.i === 5 ? Math.min(27, 31 - rank) : 0;
    return `<div class="rhythiax-track rhythiax-tbar${!rank && st.i === 4 ? ' is-out' : ''}" data-rp="${rp}" data-rank="${rank || 0}" data-from-rp="${start.rp}" data-from-rank="${start.rank || 0}" data-p30="${p30 || ''}" data-inactive="${inactive ? 1 : 0}" data-slots="${slots}">
        <div class="rhythiax-track-head">
          <img class="rhythiax-track-icon" src="${art(t.id)}" alt="">
          <div class="rhythiax-track-who"><b class="rhythiax-track-name" style="color:${ink(t)}">${esc(t.name)}</b>
            <span class="rhythiax-track-sub"><span class="rhythiax-track-rp">${fmt(rp, 2)} RP</span><span class="rhythiax-track-gain"></span><span> · ${rank ? `#${fmt(rank)} global` : 'not ranked'}</span></span></div>
          <div class="rhythiax-track-goal"><span class="rhythiax-track-k">${esc(g.k)}</span><b class="rhythiax-track-big" style="color:${g.c}">${esc(g.big)}</b><span class="rhythiax-track-sm">${esc(g.sm)}</span></div>
        </div>
        ${trackSvg()}
        <p class="rhythiax-track-say rhythiax-tbar-line">${barLine(rp, rank, st, p30, inactive)}</p>
        ${top30(rank, st)}
      </div>`;
  }

  // Draws the track at a moment of the move: the coloured parts, the dot, the rank under it, the title art filling
  // as the player gets close, and the RP counting.
  function paintTrack(el, rp, rank) {
    const p30 = Number(el.dataset.p30) || 0, st = standing(rp, rank, p30), { GAP } = TRACK;
    el.querySelectorAll('.rhythiax-track-leg').forEach(r => {
      const k = Number(r.dataset.k), end = AT[k + 1];
      r.setAttribute('width', Math.max(0, tx(Math.min(end, st.pos)) - tx(AT[k]) - (k ? GAP * 2 : 0) - (st.pos >= end ? GAP * 2 : 0)));
    });
    const hx = tx(Math.min(st.pos, 100)), dot = el.querySelector('.rhythiax-track-dot'), lab = el.querySelector('.rhythiax-track-lab');
    if (dot) {
      dot.setAttribute('cx', hx);
      dot.style.stroke = TITLES[st.i].c;
      dot.classList.toggle('is-gone', st.i === 5);
      dot.classList.toggle('is-hollow', !rank && st.i === 4);
    }
    if (lab) {
      lab.setAttribute('x', clamp(hx, 50, TRACK.Wd - 50));
      lab.textContent = st.i === 5 ? '' : rank ? `#${fmt(rank)}` : 'not ranked';
      lab.style.fill = rank ? ink(TITLES[st.i]) : 'var(--rhythiax-text-muted, #94a3b8)';
    }
    el.querySelectorAll('.rhythiax-track-node').forEach(n => {
      const k = Number(n.dataset.k), reached = k === 5 ? st.i === 5 : k <= st.i, next = k === st.i + 1 || (st.i === 4 && k === 5);
      const f = reached ? 1 : next ? st.u : 0, r = n.querySelector('clipPath rect');
      if (r) { r.setAttribute('height', 32 * f); r.setAttribute('y', 27 + 16 - 32 * f); }
    });
    const rpText = el.querySelector('.rhythiax-track-rp');
    if (rpText) rpText.textContent = `${fmt(rp, 2)} RP`;
    return st;
  }
  // The words, once the RP #30 has is known.
  function words(el) {
    const rp = Number(el.dataset.rp) || 0, rank = Number(el.dataset.rank) || 0, p30 = Number(el.dataset.p30) || 0, inactive = el.dataset.inactive === '1';
    const st = standing(rp, rank, p30), g = goal(rp, rank, st, p30, inactive), q = s => el.querySelector(s);
    if (q('.rhythiax-track-k')) q('.rhythiax-track-k').textContent = g.k;
    if (q('.rhythiax-track-big')) { q('.rhythiax-track-big').textContent = g.big; q('.rhythiax-track-big').style.color = g.c; }
    if (q('.rhythiax-track-sm')) q('.rhythiax-track-sm').textContent = g.sm;
    if (q('.rhythiax-track-say')) RhythiaX.setMarkup ? RhythiaX.setMarkup(q('.rhythiax-track-say'), barLine(rp, rank, st, p30, inactive)) : (q('.rhythiax-track-say').innerHTML = barLine(rp, rank, st, p30, inactive));
  }

  // 6. MAIN BUILDER: BUILDS THE COMPLETE HTML COMPONENT
  function buildTitleProgressionCard(playerData, activeView = 'map') {
    const rp = Domain.parseRp(playerData?.rp);
    const rank = Domain.parseRank(playerData?.globalRank);
    const summary = Domain.getStatusSummary(rp, rank);

    const showProgression = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showProgression') : true;
    const showHistory = RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('titleProgression', 'showHistory') : true;

    let effectiveView = activeView;
    if (!showProgression && showHistory) {
      effectiveView = 'history';
    } else if (showProgression && !showHistory) {
      effectiveView = 'map';
    }

    const isMapActive = effectiveView === 'map';

    return `
      <div class="rhythiax-title-progression-component" data-view="${effectiveView}" data-rank-title="${RhythiaX.escapeHtml(summary.title)}">
        <!-- Card Header -->
        <div class="rhythiax-title-progression-header">
          <div class="rhythiax-header-title">
            <svg class="rhythiax-title-icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
            </svg>
            <span>TITLE PROGRESSION</span>
          </div>

          <div class="rhythiax-pill-switch" role="group" aria-label="Title progression view">
            <button type="button" class="rhythiax-pill-btn ${isMapActive ? 'active' : ''}" data-tab="map" aria-pressed="${isMapActive}">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
              <span>Progression</span>
            </button>
            <button type="button" class="rhythiax-pill-btn ${!isMapActive ? 'active' : ''}" data-tab="history" aria-pressed="${!isMapActive}">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>History</span>
            </button>
          </div>
        </div>

        <!-- Progress: the title bar -->
        ${showProgression ? `
        <div class="rhythiax-title-map-container rhythiax-title-bar-container" style="display: ${isMapActive ? 'block' : 'none'};">
          ${renderBar(rp, rank, playerData?.lastSeen || null, playerData?.inactive === true, Number(playerData?.p30) || 0)}
        </div>
        ` : ''}

        <!-- Reimagined History Chart View -->
        ${showHistory ? `
        <div class="rhythiax-title-history-container" style="display: ${!isMapActive ? 'block' : 'none'};">
          ${renderHistoryView(playerData)}
        </div>
        ` : ''}
      </div>
    `;
  }

  // Export View
  RhythiaX.TitleProgression.View = {
    renderHistoryView,
    renderBar,
    paintTrack,
    words,
    buildTitleProgressionCard
  };

})();
