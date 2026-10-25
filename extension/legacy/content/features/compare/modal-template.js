// =============================================
// Reimagined for Rhythia — Player Compare: window markup
// =============================================
// The comparison window as markup, from the model compare/view.js works out: pure functions,
// no state and no listeners. view.js draws the window with them and wires its controls.

var RhythiaX = RhythiaX || {};

(function () {
  function getAvatarHtml(player, isP2 = false) {
    const avatarUrl = player?.avatar || player?.player?.avatar || '';
    if (avatarUrl) {
      return `<img src="${RhythiaX.escapeHtml(avatarUrl)}" alt="" onerror="this.onerror=null;this.src='/unkimg.png';">`;
    }
    const gradStart = isP2 ? '#60a5fa' : '#c084fc';
    const gradEnd = isP2 ? '#1d4ed8' : '#7c3aed';
    return `<svg viewBox="0 0 100 100">
      <defs>
        <linearGradient id="rhythiax-avatar-${isP2 ? 'p2' : 'p1'}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${gradStart}"/>
          <stop offset="100%" stop-color="${gradEnd}"/>
        </linearGradient>
      </defs>
      <rect width="100" height="100" fill="url(#rhythiax-avatar-${isP2 ? 'p2' : 'p1'})"/>
      <circle cx="50" cy="40" r="18" fill="#ffffff" fill-opacity="0.95"/>
      <path d="M22 84 C24 64 36 58 50 58 C64 58 76 64 78 84 Z" fill="#ffffff" fill-opacity="0.95"/>
    </svg>`;
  }

  function getFlagHtml(country) {
    const c = String(country || '').trim().toUpperCase();
    if (!c) return '';
    if (c === 'PL' || c === 'POLAND') {
      return `<svg viewBox="0 0 16 11" width="16" height="11" style="border-radius:2px;overflow:hidden;border:1px solid currentColor;opacity:0.85;vertical-align:-1px;display:inline-block;margin-right:4px;">
        <rect width="16" height="5.5" fill="#ffffff"/>
        <rect y="5.5" width="16" height="5.5" fill="#dc2626"/>
      </svg>`;
    }
    if (/^[A-Z]{2}$/.test(c)) {
      return `<img src="/flags/${c.toLowerCase()}.svg" alt="${RhythiaX.escapeHtml(c)}" style="width:16px;height:11px;border-radius:2px;vertical-align:-1px;display:inline-block;margin-right:4px;" onerror="this.outerHTML='<span style=\\'margin-right:4px;\\'>${RhythiaX.escapeHtml(c)}</span>'">`;
    }
    return `<span style="margin-right:4px;">${RhythiaX.escapeHtml(c)}</span>`;
  }

  // 4-Axis Diamond Polygon calculation with exact geometric centering
  function getDiamondCoords(acc, spd, clean, winsRatio) {
    const normAcc = Math.max(0.15, Math.min(1, (acc - 85) / 15));
    const normSpd = Math.max(0.15, Math.min(1, (spd - 0.9) / 0.6));
    const normClean = Math.max(0.15, Math.min(1, clean / 100));
    const normWins = Math.max(0.15, Math.min(1, winsRatio));

    const topY = 98 - (normAcc * 64);
    const rightX = 135 + (normSpd * 64);
    const bottomY = 98 + (normClean * 64);
    const leftX = 135 - (normWins * 64);

    return {
      top: { x: 135, y: topY },
      right: { x: rightX, y: 98 },
      bottom: { x: 135, y: bottomY },
      left: { x: leftX, y: 98 },
      points: `135,${topY.toFixed(1)} ${rightX.toFixed(1)},98 135,${bottomY.toFixed(1)} ${leftX.toFixed(1)},98`
    };
  }

  // The whole window for one perspective (activeRef 0 or 1): header, both player cards, the
  // diamond and the four metric cards, and the shared maps toolbar over an empty list.
  function modalHtml(model, activeRef) {
    const { p1, p2, p1Acc, p2Acc, p1Spd, p2Spd, p1Miss, p2Miss, battle, p1Coords, p2Coords } = model;
    const isRefP1 = activeRef === 0;

    // Deltas relative to active perspective
    const accDelta = isRefP1 ? (p1Acc - p2Acc) : (p2Acc - p1Acc);
    const spdDelta = isRefP1 ? (p1Spd - p2Spd) : (p2Spd - p1Spd);
    const missDelta = isRefP1 ? ((p1Miss?.rate ?? 0) - (p2Miss?.rate ?? 0)) : ((p2Miss?.rate ?? 0) - (p1Miss?.rate ?? 0));
    const winsDelta = isRefP1 ? (battle.p1Wins - battle.p2Wins) : (battle.p2Wins - battle.p1Wins);

    const accPillText = (accDelta >= 0 ? '+' : '') + accDelta.toFixed(2) + '%';
    const accPillClass = accDelta >= 0 ? 'is-pos' : 'is-neg';

    const spdPillText = (spdDelta >= 0 ? '+' : '') + spdDelta.toFixed(2) + 'x';
    const spdPillClass = spdDelta >= 0 ? 'is-pos' : 'is-neg';

    const missPillText = missDelta <= 0
      ? '-' + Math.abs(missDelta).toFixed(2) + '% Cleaner'
      : '+' + missDelta.toFixed(2) + '% More Misses';
    const missPillClass = missDelta <= 0 ? 'is-pos' : 'is-neg';

    const winsPillText = winsDelta >= 0
      ? '+' + winsDelta + ' Maps Lead'
      : winsDelta + ' Maps Behind';
    const winsPillClass = winsDelta >= 0 ? 'is-pos' : 'is-neg';

    const activeWins = isRefP1 ? battle.p1Wins : battle.p2Wins;
    const betterTitle = `Better in ${activeWins} ${activeWins === 1 ? 'Map' : 'Maps'}`;

    return `
        <!-- Header -->
        <div class="rhythiax-modal-header">
          <div class="rhythiax-modal-headline">
            <h2>Player Comparison</h2>
            <p>${battle.totalShared} shared maps</p>
          </div>
          <div class="rhythiax-modal-actions">
            <button type="button" class="rhythiax-modal-close-btn" aria-label="Close comparison">
              <svg viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          </div>
        </div>

        <!-- Duel Arena: Interactive Reference Selection -->
        <div class="rhythiax-duel-arena">
          <!-- Player 1 Card -->
          <div class="rhythiax-duel-card ${isRefP1 ? 'is-reference' : 'is-selectable'}" data-ref-index="0" title="${isRefP1 ? 'Current reference player' : 'Click to compare as ' + RhythiaX.escapeHtml(p1.username)}">
            <div class="rhythiax-card-left">
              <div class="rhythiax-card-avatar">
                ${getAvatarHtml(p1, false)}
              </div>
              <div class="rhythiax-card-info">
                <div class="rhythiax-card-name-row">
                  <span class="rhythiax-card-name">${RhythiaX.escapeHtml(p1.username)}</span>
                  ${isRefP1
                    ? '<span class="rhythiax-card-perspective-badge">COMPARING AS</span>'
                    : '<span class="rhythiax-card-switch-hint">Click to compare as ' + RhythiaX.escapeHtml(p1.username) + '</span>'}
                  ${battle.p1Wins > battle.p2Wins ? `<span class="rhythiax-card-lead-badge">LEAD (${battle.p1Wins})</span>` : ''}
                </div>
                <div class="rhythiax-card-ranks">
                  <span>${RhythiaX.escapeHtml(p1.player?.globalRank || p1.globalRank || '#—')} Global</span>
                  <span>·</span>
                  <span>${getFlagHtml(p1.player?.country || p1.country)} Country ${RhythiaX.escapeHtml(p1.player?.countryRank || p1.countryRank || '#—')}</span>
                </div>
              </div>
            </div>
            <div class="rhythiax-card-right">
              <div class="rhythiax-card-wins-val">${battle.p1Wins} / ${battle.totalShared}</div>
              <div class="rhythiax-card-wins-lbl">Map Wins</div>
            </div>
          </div>

          <!-- Player 2 Card -->
          <div class="rhythiax-duel-card ${!isRefP1 ? 'is-reference' : 'is-selectable'}" data-ref-index="1" title="${!isRefP1 ? 'Current reference player' : 'Click to compare as ' + RhythiaX.escapeHtml(p2.username)}">
            <div class="rhythiax-card-left">
              <div class="rhythiax-card-avatar">
                ${getAvatarHtml(p2, true)}
              </div>
              <div class="rhythiax-card-info">
                <div class="rhythiax-card-name-row">
                  <span class="rhythiax-card-name">${RhythiaX.escapeHtml(p2.username)}</span>
                  ${!isRefP1
                    ? '<span class="rhythiax-card-perspective-badge">COMPARING AS</span>'
                    : '<span class="rhythiax-card-switch-hint">Click to compare as ' + RhythiaX.escapeHtml(p2.username) + '</span>'}
                  ${battle.p2Wins > battle.p1Wins ? `<span class="rhythiax-card-lead-badge">LEAD (${battle.p2Wins})</span>` : ''}
                </div>
                <div class="rhythiax-card-ranks">
                  <span>${RhythiaX.escapeHtml(p2.player?.globalRank || p2.globalRank || '#—')} Global</span>
                  <span>·</span>
                  <span>${getFlagHtml(p2.player?.country || p2.country)} Country ${RhythiaX.escapeHtml(p2.player?.countryRank || p2.countryRank || '#—')}</span>
                </div>
              </div>
            </div>
            <div class="rhythiax-card-right">
              <div class="rhythiax-card-wins-val">${battle.p2Wins} / ${battle.totalShared}</div>
              <div class="rhythiax-card-wins-lbl">Map Wins</div>
            </div>
          </div>
        </div>

        <!-- Core Analysis: 4-Axis Diamond Radar + 4 Bento Cards -->
        <div class="rhythiax-core-analysis">
          <!-- 4-Axis Diamond Radar -->
          <div class="rhythiax-radar-box">
            <div class="rhythiax-radar-chart-wrap">
              <svg class="rhythiax-radar-svg" viewBox="0 0 270 195">
                <polygon points="135,34 199,98 135,162 71,98" fill="none" stroke="currentColor" stroke-opacity="0.1" stroke-width="1"/>
                <polygon points="135,56 177,98 135,140 93,98" fill="none" stroke="currentColor" stroke-opacity="0.1" stroke-width="1"/>
                <polygon points="135,77 156,98 135,119 114,98" fill="none" stroke="currentColor" stroke-opacity="0.1" stroke-width="1"/>

                <line x1="135" y1="28" x2="135" y2="168" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="2,2"/>
                <line x1="65" y1="98" x2="205" y2="98" stroke="currentColor" stroke-opacity="0.12" stroke-dasharray="2,2"/>

                <!-- P2 Polygon & Dots (Sky Blue) -->
                <polygon class="rhythiax-radar-poly-p2" points="${p2Coords.points}"/>
                <circle class="rhythiax-radar-dot-p2" cx="${p2Coords.top.x}" cy="${p2Coords.top.y}" r="3"/>
                <circle class="rhythiax-radar-dot-p2" cx="${p2Coords.right.x}" cy="${p2Coords.right.y}" r="3"/>
                <circle class="rhythiax-radar-dot-p2" cx="${p2Coords.bottom.x}" cy="${p2Coords.bottom.y}" r="3"/>
                <circle class="rhythiax-radar-dot-p2" cx="${p2Coords.left.x}" cy="${p2Coords.left.y}" r="3"/>

                <!-- P1 Polygon & Dots (Amethyst / Violet) -->
                <polygon class="rhythiax-radar-poly-p1" points="${p1Coords.points}"/>
                <circle class="rhythiax-radar-dot-p1" cx="${p1Coords.top.x}" cy="${p1Coords.top.y}" r="3.2"/>
                <circle class="rhythiax-radar-dot-p1" cx="${p1Coords.right.x}" cy="${p1Coords.right.y}" r="3.2"/>
                <circle class="rhythiax-radar-dot-p1" cx="${p1Coords.bottom.x}" cy="${p1Coords.bottom.y}" r="3.2"/>
                <circle class="rhythiax-radar-dot-p1" cx="${p1Coords.left.x}" cy="${p1Coords.left.y}" r="3.2"/>

                <!-- Axis vertex labels - perfectly centered and balanced -->
                <text x="135" y="18" text-anchor="middle" fill="currentColor" font-size="10" font-weight="800" letter-spacing="0.05em">ACCURACY</text>
                <text x="208" y="102" text-anchor="start" fill="currentColor" font-size="10" font-weight="800" letter-spacing="0.05em">SPEED</text>
                <text x="135" y="182" text-anchor="middle" fill="currentColor" font-size="10" font-weight="800" letter-spacing="0.05em">CLEANLINESS</text>
                <text x="63" y="94" text-anchor="end" fill="currentColor" font-size="10" font-weight="800" letter-spacing="0.05em">
                  <tspan x="63" dy="0">MAP</tspan>
                  <tspan x="63" dy="12">WINS</tspan>
                </text>
              </svg>
            </div>

            <div class="rhythiax-radar-legend">
              <span class="rhythiax-radar-p1">● ${RhythiaX.escapeHtml(p1.username)}</span>
              <span class="rhythiax-radar-p2">● ${RhythiaX.escapeHtml(p2.username)}</span>
            </div>
          </div>

          <!-- 4 Light Direct Metrics Bento Grid -->
          <div class="rhythiax-bento-grid">
            <!-- Metric 1: Average Accuracy -->
            <div class="rhythiax-bento-card">
              <div class="rhythiax-bento-header">
                <span class="rhythiax-bento-title">Average Accuracy</span>
                <span class="rhythiax-bento-pill ${accPillClass}">${accPillText}</span>
              </div>
              <div class="rhythiax-bento-comparison">
                <div class="rhythiax-player-metric">
                  <span class="rhythiax-player-metric-tag">${RhythiaX.escapeHtml(p1.username)}</span>
                  <span class="rhythiax-player-metric-val ${p1Acc >= p2Acc ? 'is-leader' : ''}">${p1Acc.toFixed(2)}%</span>
                </div>
                <div class="rhythiax-player-metric" style="text-align:right;">
                  <span class="rhythiax-player-metric-tag">${RhythiaX.escapeHtml(p2.username)}</span>
                  <span class="rhythiax-player-metric-val ${p2Acc > p1Acc ? 'is-leader' : ''}">${p2Acc.toFixed(2)}%</span>
                </div>
              </div>
            </div>

            <!-- Metric 2: Average Speed -->
            <div class="rhythiax-bento-card">
              <div class="rhythiax-bento-header">
                <span class="rhythiax-bento-title">Average Speed</span>
                <span class="rhythiax-bento-pill ${spdPillClass}">${spdPillText}</span>
              </div>
              <div class="rhythiax-bento-comparison">
                <div class="rhythiax-player-metric">
                  <span class="rhythiax-player-metric-tag">${RhythiaX.escapeHtml(p1.username)}</span>
                  <span class="rhythiax-player-metric-val ${p1Spd >= p2Spd ? 'is-leader' : ''}">${p1Spd.toFixed(2)}x</span>
                </div>
                <div class="rhythiax-player-metric" style="text-align:right;">
                  <span class="rhythiax-player-metric-tag">${RhythiaX.escapeHtml(p2.username)}</span>
                  <span class="rhythiax-player-metric-val ${p2Spd > p1Spd ? 'is-leader' : ''}">${p2Spd.toFixed(2)}x</span>
                </div>
              </div>
            </div>

            <!-- Metric 3: Average Miss Rate -->
            <div class="rhythiax-bento-card">
              <div class="rhythiax-bento-header">
                <span class="rhythiax-bento-title">Average Miss Rate</span>
                <span class="rhythiax-bento-pill ${missPillClass}">${missPillText}</span>
              </div>
              <div class="rhythiax-bento-comparison">
                <div class="rhythiax-player-metric">
                  <span class="rhythiax-player-metric-tag">${RhythiaX.escapeHtml(p1.username)}</span>
                  <span class="rhythiax-player-metric-val ${(p1Miss?.rate ?? 0) <= (p2Miss?.rate ?? 0) ? 'is-leader' : ''}">${(p1Miss?.rate ?? 0).toFixed(2)}% <small style="font-size:11px;opacity:0.8;">(${(p1Miss?.perMap ?? 0).toFixed(1)}/map)</small></span>
                </div>
                <div class="rhythiax-player-metric" style="text-align:right;">
                  <span class="rhythiax-player-metric-tag">${RhythiaX.escapeHtml(p2.username)}</span>
                  <span class="rhythiax-player-metric-val ${(p2Miss?.rate ?? 0) < (p1Miss?.rate ?? 0) ? 'is-leader' : ''}">${(p2Miss?.rate ?? 0).toFixed(2)}% <small style="font-size:11px;opacity:0.8;">(${(p2Miss?.perMap ?? 0).toFixed(1)}/map)</small></span>
                </div>
              </div>
            </div>

            <!-- Metric 4: Better in N Maps -->
            <div class="rhythiax-bento-card">
              <div class="rhythiax-bento-header">
                <span class="rhythiax-bento-title">${betterTitle}</span>
                <span class="rhythiax-bento-pill ${winsPillClass}">${winsPillText}</span>
              </div>
              <div class="rhythiax-bento-comparison">
                <div class="rhythiax-player-metric">
                  <span class="rhythiax-player-metric-tag">${RhythiaX.escapeHtml(p1.username)}</span>
                  <span class="rhythiax-player-metric-val ${battle.p1Wins >= battle.p2Wins ? 'is-leader' : ''}">${battle.p1Wins} maps <small style="font-size:11px;opacity:0.8;">(${battle.totalShared ? ((battle.p1Wins/battle.totalShared)*100).toFixed(1) : 0}%)</small></span>
                </div>
                <div class="rhythiax-player-metric" style="text-align:right;">
                  <span class="rhythiax-player-metric-tag">${RhythiaX.escapeHtml(p2.username)}</span>
                  <span class="rhythiax-player-metric-val ${battle.p2Wins > battle.p1Wins ? 'is-leader' : ''}">${battle.p2Wins} maps <small style="font-size:11px;opacity:0.8;">(${battle.totalShared ? ((battle.p2Wins/battle.totalShared)*100).toFixed(1) : 0}%)</small></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Shared Maps -->
        <div>
          <div class="rhythiax-clashes-header">
            <span class="rhythiax-clashes-heading">Shared Maps</span>
            <span class="rhythiax-clashes-count">${battle.totalShared} matching scores</span>
          </div>

          <div class="rhythiax-clashes-toolbar">
            <div class="rhythiax-search-wrap">
              <svg class="rhythiax-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
              <input type="search" class="rhythiax-search-input" id="rhythiax-clash-search" placeholder="Search maps…">
            </div>
            <select class="rhythiax-toolbar-select" id="rhythiax-clash-filter">
              <option value="all">All shared maps (${battle.totalShared})</option>
              <option value="delta">Only maps with a difference</option>
            </select>
            <select class="rhythiax-toolbar-select" id="rhythiax-clash-sort">
              <option value="delta">Sort: Biggest difference</option>
              <option value="acc">Sort: Best Accuracy</option>
              <option value="speed">Sort: Highest Speed</option>
            </select>
          </div>

          <div class="rhythiax-clashes-list" id="rhythiax-clashes-container"></div>
        </div>
      `;
  }

  // The shared maps list for a search text, a filter (all, delta) and a sort (delta, acc, speed).
  function clashesHtml(battle, query, filter, sort) {
    let items = [...battle.clashes];

    if (query) {
      items = items.filter(c => c.title.toLowerCase().includes(query));
    }
    if (filter === 'delta') {
      items = items.filter(c => Math.abs(c.delta) > 0.01);
    }

    if (sort === 'acc') {
      items.sort((a, b) => Math.max(b.p1.accuracy, b.p2.accuracy) - Math.max(a.p1.accuracy, a.p2.accuracy));
    } else if (sort === 'speed') {
      items.sort((a, b) => Math.max(b.p1.speed, b.p2.speed) - Math.max(a.p1.speed, a.p2.speed));
    } else {
      items.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    }

    if (!items.length) {
      return `<div style="text-align:center;padding:24px;color:var(--rhythiax-text-muted);">No maps match.</div>`;
    }

    return items.map(c => {
      const p1Status = c.winner === 'p1' ? 'is-winner' : (c.winner === 'p2' ? 'is-loser' : 'is-tie');
      const p2Status = c.winner === 'p2' ? 'is-winner' : (c.winner === 'p1' ? 'is-loser' : 'is-tie');

      const metaStats = [];
      if (c.difficulty) metaStats.push(`${c.difficulty.toFixed(2)}★`);
      if (c.bpm) metaStats.push(`BPM ${c.bpm}`);
      if (c.notes) metaStats.push(`${c.notes} Notes`);

      const p1Mods = Array.isArray(c.p1.mods) ? c.p1.mods : [];
      const p2Mods = Array.isArray(c.p2.mods) ? c.p2.mods : [];

      return `
          <div class="rhythiax-battle-card">
            <div class="rhythiax-map-meta">
              <span class="rhythiax-map-title">${RhythiaX.escapeHtml(c.title)}</span>
              <span class="rhythiax-map-stats">${RhythiaX.escapeHtml(metaStats.join(' · '))}</span>
            </div>
            <div class="rhythiax-score-pill ${p1Status}">
              <div class="rhythiax-pill-left">
                <span class="rhythiax-pill-acc">${c.p1.accuracy.toFixed(2)}%</span>
                <span class="rhythiax-pill-badge">${c.p1.speed.toFixed(2)}x</span>
                ${p1Mods.map(m => `<span class="rhythiax-pill-badge">${RhythiaX.escapeHtml(m)}</span>`).join('')}
              </div>
              <div class="rhythiax-pill-right">
                <span>${c.p1.misses} ${c.p1.misses === 1 ? 'miss' : 'misses'}</span>
                <b>${c.delta >= 0 ? '+' : ''}${c.delta.toFixed(2)}%</b>
              </div>
            </div>
            <div class="rhythiax-score-pill ${p2Status}">
              <div class="rhythiax-pill-left">
                <span class="rhythiax-pill-acc">${c.p2.accuracy.toFixed(2)}%</span>
                <span class="rhythiax-pill-badge">${c.p2.speed.toFixed(2)}x</span>
                ${p2Mods.map(m => `<span class="rhythiax-pill-badge">${RhythiaX.escapeHtml(m)}</span>`).join('')}
              </div>
              <div class="rhythiax-pill-right">
                <span>${c.p2.misses} ${c.p2.misses === 1 ? 'miss' : 'misses'}</span>
                <b>${-c.delta >= 0 ? '+' : ''}${(-c.delta).toFixed(2)}%</b>
              </div>
            </div>
          </div>
        `;
    }).join('');
  }

  RhythiaX.CompareTemplate = { modalHtml, clashesHtml, getDiamondCoords, getAvatarHtml, getFlagHtml };
})();
