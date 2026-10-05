// =============================================
// Rhythia Reimagined — Title Progression View
// SVG Canvas construction, bezier path rendering, waypoint nodes & UI assembly
// =============================================

var RhythiaX = RhythiaX || {};
RhythiaX.TitleProgression = RhythiaX.TitleProgression || {};

(function () {
  'use strict';

  const Domain = RhythiaX.TitleProgression.Domain;
  const Icons = RhythiaX.TitleProgression.Icons || {};

  function escapeHtml(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // 1. RENDER SVG ACTIVE TRACKS VIA DE CASTELJAU
  function renderSvgPaths(rp, rank) {
    const S = Domain.SEGMENTS;

    // Solid tier track colors for each progressive tier segment
    const SEGMENT_COLORS = [
      '#7ED54F', // Novice -> Expert
      '#04A0B6', // Expert -> Cand. Master
      '#C26F38', // Cand. Master -> Master
      '#B6463A', // Master -> Cand. GM
      '#8A4FA0'  // Cand. GM -> GM
    ];

    // Unfilled background track (dashed line)
    let baseTrack = '';
    for (let i = 0; i < 5; i++) {
      const p = Domain.pathFromCubic(S[i]);
      baseTrack += `<path d="${p}" fill="none" stroke="var(--r-track-base, rgba(255, 255, 255, 0.12))" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="6 6"/>\n`;
    }

    // Active track in clean, solid tier colors (no heavy radioactive glow filter)
    let activeTrack = '';
    for (let i = 0; i < 5; i++) {
      const progress = Domain.getSegmentProgress(i, rp, rank);
      if (progress <= 0) continue;

      const strokeColor = (i === 4 && rank === 1) ? '#fbbf24' : SEGMENT_COLORS[i];

      if (progress >= 0.999) {
        // Complete segment
        const d = Domain.pathFromCubic(S[i]);
        activeTrack += `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="3.5" stroke-linecap="round"/>\n`;
      } else {
        // In-progress segment split by de Casteljau
        const split = Domain.deCasteljau(S[i].p0, S[i].p1, S[i].p2, S[i].p3, progress);
        const d = Domain.pathFromCubic(split.subLeft);
        activeTrack += `<path d="${d}" fill="none" stroke="${strokeColor}" stroke-width="3.5" stroke-linecap="round"/>\n`;
      }
    }

    return baseTrack + activeTrack;
  }

  // 2. RENDER THE 6 WAYPOINT NODES
  function renderWaypoints(rp, rank) {
    let out = '';
    const isGm = Domain.isGrandmaster(rank);
    const gmCfg = isGm ? Domain.getPrestigeConfig(rank) : null;

    Domain.WAYPOINTS.forEach((wp, index) => {
      const isGrandmasterNode = index === 5;
      const isUnlocked = Domain.isTierUnlocked ? Domain.isTierUnlocked(index, rp, rank) : true;
      const iconData = Icons[wp.id] || `/titles/${wp.id}.png`;

      let boxBorder = wp.color;
      let extraDecorations = '';
      let boxFilter = '';
      let imgStyle = '';
      let textColor = 'var(--rhythiax-text-strong, #f8fafc)';
      let shortRpColor = 'var(--rhythiax-text-muted, #94a3b8)';

      if (isGrandmasterNode) {
        if (isGm && gmCfg) {
          boxBorder = gmCfg.boxBorder;
          extraDecorations = gmCfg.decorationsSvg;
          boxFilter = 'drop-shadow(0 2px 8px rgba(0, 0, 0, 0.45));';
          imgStyle = (rank === 1)
            ? 'filter: brightness(0) invert(1);'
            : (rank === 2)
              ? 'filter: brightness(0) invert(0.95);'
              : 'filter: brightness(0) invert(0.85);';
        } else {
          // Grandmaster LOCKED - Do not glow!
          boxBorder = 'rgba(255, 255, 255, 0.16)';
          extraDecorations = '';
          boxFilter = 'none';
          imgStyle = 'filter: brightness(0) invert(1); opacity: 0.35;';
          textColor = 'rgba(255, 255, 255, 0.4)';
          shortRpColor = 'rgba(255, 255, 255, 0.25)';
        }
      } else if (isUnlocked) {
        boxBorder = wp.color;
        // Subtle, elegant drop shadow without harsh neon glare
        boxFilter = 'drop-shadow(0 2px 6px rgba(0, 0, 0, 0.38));';
        imgStyle = 'opacity: 1;';
      } else {
        // Locked standard tier - Do not glow!
        boxBorder = 'rgba(255, 255, 255, 0.16)';
        boxFilter = 'none';
        imgStyle = 'opacity: 0.32; filter: grayscale(1) brightness(0.7);';
        textColor = 'rgba(255, 255, 255, 0.4)';
        shortRpColor = 'rgba(255, 255, 255, 0.25)';
      }

      out += `
        <g transform="translate(${wp.x}, ${wp.y})" class="rhythiax-map-node-group" data-tier="${wp.id}" data-unlocked="${isUnlocked}">
          <!-- Decorations (Otoczki, aureole, korony) -->
          ${extraDecorations}

          <!-- Central Token Box -->
          <rect x="-20" y="-20" width="40" height="40" rx="12" fill="var(--r-node-bg, #141124)" stroke="${boxBorder}" stroke-width="${isUnlocked ? 2 : 1.5}"
                style="${boxFilter !== 'none' ? `filter: ${boxFilter};` : ''}"/>

          <!-- Title Emblem (Instant base64 or site url) -->
          <image href="${iconData}" xlink:href="${iconData}" x="-12" y="-12" width="24" height="24" style="${imgStyle}"/>

          <!-- Waypoint Meta Text -->
          <text x="0" y="32" class="rhythiax-waypoint-name" text-anchor="middle" font-size="10.5" font-weight="700" fill="${textColor}" style="pointer-events: none;">${wp.name}</text>
          <text x="0" y="44" class="rhythiax-waypoint-rp" text-anchor="middle" font-size="9" font-family="'JetBrains Mono', monospace" font-weight="600" fill="${shortRpColor}" style="pointer-events: none;">${wp.shortRp}</text>
        </g>
      `;
    });

    return out;
  }

  // 3. RENDER CURRENT PLAYER'S NEEDLE PIN & PILL BADGE
  function renderPlayerPin(rp, rank) {
    const loc = Domain.getMarkerLocation(rp, rank);
    const isGm = Domain.isGrandmaster(rank);
    const formattedRp = (RhythiaX.formatNumber ? RhythiaX.formatNumber(Math.round(rp)) : Math.round(rp).toLocaleString('en-US')) + ' RP';

    let badgeText = formattedRp;
    let pillWidth = 56;
    let borderColor = 'var(--rhythiax-accent, #a855f7)';
    let textColor = 'var(--rhythiax-text-strong, #ffffff)';

    let badgeY = loc.isAtNode ? (loc.y - 44) : (loc.y - 36);

    if (isGm) {
      const cfg = Domain.getPrestigeConfig(rank);
      badgeText = cfg.badgeText;
      pillWidth = cfg.pillWidth;
      borderColor = cfg.boxBorder;
      textColor = rank === 2 ? 'var(--silver-text, #f1f5f9)' : cfg.tierColor;
      badgeY = loc.y + cfg.pinNeedleY.badgeY;
    } else if (rp >= 10000 && rank > 0) {
      badgeText = `#${rank}`;
      pillWidth = 38;
      borderColor = '#8A4FA0';
      textColor = '#c084fc';
    } else if (loc.isAtNode) {
      if (loc.waypointIndex === 0) borderColor = '#7ED54F';
      else if (loc.waypointIndex === 1) borderColor = '#04A0B6';
      else if (loc.waypointIndex === 2) borderColor = '#C26F38';
      else if (loc.waypointIndex === 3) borderColor = '#B6463A';
      else if (loc.waypointIndex === 4) borderColor = '#8A4FA0';
    } else {
      pillWidth = Math.max(52, badgeText.length * 6.5 + 14);
    }

    // Direct continuous needle stem connecting the target dot directly to the badge pointer
    const needleStartY = loc.isAtNode ? (loc.y - 21) : (loc.y - 3.2);
    const needleEndY = badgeY + 13.5;

    return `
      <!-- Player Location Marker Pin -->
      <g class="rhythiax-map-pin-group">
        <!-- Target dot on the path (subtle shadow, not blinding glow) -->
        <circle cx="${loc.x}" cy="${loc.y}" r="3.2" fill="${borderColor}" filter="drop-shadow(0 1px 3px rgba(0, 0, 0, 0.4))"/>

        <!-- Continuous needle stem connecting target dot directly to badge pointer -->
        <line x1="${loc.x}" y1="${needleStartY}" x2="${loc.x}" y2="${needleEndY}" stroke="${borderColor}" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="2.5 2"/>

        <!-- Badge capsule & Pointer triangle -->
        <g transform="translate(${loc.x}, ${badgeY})">
          <polygon points="-3.5, 10 0, 13.5 3.5, 10" fill="var(--r-pin-bg, #120f1c)" stroke="${borderColor}" stroke-width="1.1"/>
          <rect x="-${pillWidth / 2}" y="-10" width="${pillWidth}" height="20" rx="5" fill="var(--r-pin-bg, #120f1c)" stroke="${borderColor}" stroke-width="1.2"
                style="filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.4));"/>
          <text x="0" y="3.5" text-anchor="middle" fill="${textColor}" font-family="'JetBrains Mono', monospace" font-size="9.5" font-weight="800">${badgeText}</text>
        </g>
      </g>
    `;
  }

  // 4. RENDER REIMAGINED HISTORY VIEW
  function renderHistoryView(playerData, scoreSets) {
    const histData = Domain.generateHistoryData(playerData, scoreSets);
    const rp = Domain.parseRp(playerData?.rp);
    const rank = Domain.parseRank(playerData?.globalRank);
    const summary = Domain.getStatusSummary(rp, rank);
    const tierColor = summary.tierColor || '#8A4FA0';

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
        ${histData.dateTicks.map(t => `<span>${escapeHtml(t)}</span>`).join('')}
      </div>
    `;

    let milestoneDots = '';
    let tooltipsHtml = '';

    histData.milestones.forEach(m => {
      const tipId = `r-hist-tip-${m.id}`;
      milestoneDots += `
        <circle cx="${m.x}" cy="${m.y}" r="4.5" fill="${m.color}" stroke="#ffffff" stroke-width="1.5"
                class="rhythiax-history-interactive-dot" tabindex="0" role="img" aria-label="${escapeHtml(m.tooltipText)}" data-tip-id="${tipId}"/>
      `;
      tooltipsHtml += `
        <div id="${tipId}" class="rhythiax-hist-tooltip-badge" style="left: ${(m.x / 940 * 100).toFixed(1)}%; top: ${(m.y / 220 * 100).toFixed(1)}%; --tag-color: ${m.color};">
          <span class="rhythiax-history-legend-dot" style="background: ${m.color};"></span>
          <span>${escapeHtml(m.tooltipText)}</span>
        </div>
      `;
    });

    // Current point
    const cur = histData.currentPoint;
    const curTipId = 'r-hist-tip-current';
    milestoneDots += `
      <circle cx="${cur.x}" cy="${cur.y}" r="5" fill="${cur.color}" stroke="#ffffff" stroke-width="2"
              class="rhythiax-history-interactive-dot" tabindex="0" role="img" aria-label="${escapeHtml(cur.tooltipText)}" data-tip-id="${curTipId}"/>
    `;
    tooltipsHtml += `
      <div id="${curTipId}" class="rhythiax-hist-tooltip-badge" style="right: 14px; top: ${(cur.y / 220 * 100).toFixed(1)}%; transform: translateY(-110%); --tag-color: ${cur.color};">
        <span class="rhythiax-history-legend-dot" style="background: ${cur.color};"></span>
        <span>${escapeHtml(cur.tooltipText)}</span>
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

  // 5. MAIN BUILDER: BUILDS THE COMPLETE HTML COMPONENT
  function buildTitleProgressionCard(playerData, activeView = 'map', scoreSets = null) {
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
      <div class="rhythiax-title-progression-component" data-view="${effectiveView}" data-rank-title="${escapeHtml(summary.title)}">
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

        <!-- Adventure Map Canvas View -->
        ${showProgression ? `
        <div class="rhythiax-title-map-container" style="display: ${isMapActive ? 'block' : 'none'};">
          <div class="rhythiax-title-map-arena">
            <!-- Radial background grid dots -->
            <div class="rhythiax-map-bg-grid"></div>

            <!-- Vector Map SVG -->
            <svg class="rhythiax-map-svg" viewBox="0 0 960 220" preserveAspectRatio="xMidYMid meet" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
              ${renderSvgPaths(rp, rank)}
              ${renderWaypoints(rp, rank)}
              ${renderPlayerPin(rp, rank)}
            </svg>
          </div>

          <!-- Bottom Status Summary Footer: Clean centered Goal with modern typography -->
          <div class="rhythiax-title-progression-footer">
            <div class="rhythiax-footer-goal-centered">
              <span>${rank === 1 ? '<strong class="rhythiax-status-goal text-amber-400">Top Rhythia Player</strong>' : `Goal: <strong class="rhythiax-status-goal">${summary.goalText}</strong>`}</span>
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Reimagined History Chart View -->
        ${showHistory ? `
        <div class="rhythiax-title-history-container" style="display: ${!isMapActive ? 'block' : 'none'};">
          ${renderHistoryView(playerData, scoreSets)}
        </div>
        ` : ''}
      </div>
    `;
  }

  // Export View
  RhythiaX.TitleProgression.View = {
    renderSvgPaths,
    renderWaypoints,
    renderPlayerPin,
    renderHistoryView,
    buildTitleProgressionCard
  };

})();
