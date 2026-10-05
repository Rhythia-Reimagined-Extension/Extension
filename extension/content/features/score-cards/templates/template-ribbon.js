// ============================================================================
// Rhythia Reimagined — Score Card Template: Variant C (Pro Ribbon)
// ============================================================================

var RhythiaX = RhythiaX || {};
RhythiaX.ScoreCardTemplates = RhythiaX.ScoreCardTemplates || {};

(function () {
  'use strict';

  function render(scoreData, options = {}) {
    const domain = RhythiaX.ScoreCardDomain;
    const grade = domain.getGrade(scoreData);
    const gradeColor = domain.getGradeColor(grade);
    const gradeGlow = domain.getGradeGlow(grade);

    const rankIdx = scoreData.rankIndex != null ? `#${scoreData.rankIndex}` : '';
    const isReign = Boolean(scoreData.isReign || scoreData.reign);
    const isFc = scoreData.fullCombo || (parseInt(scoreData.misses, 10) === 0);

    const speed = RhythiaX.normalizeSpeed ? RhythiaX.normalizeSpeed(scoreData.speed) : parseFloat(scoreData.speed || 1);
    const speedStr = speed && speed !== '1.00' ? `${speed}x` : '';
    const durationStr = scoreData.lengthMs ? domain.formatDuration(scoreData.lengthMs, speed) : (scoreData.duration || '');

    const card = document.createElement('div');
    card.className = 'rhythiax-sc-card rhythiax-score-card rhythiax-redesigned rhythiax-sc-ribbon';
    card.setAttribute('data-rhythiax-score-id', scoreData.scoreId || '');
    if (scoreData.beatmapHash) card.setAttribute('data-rhythiax-beatmap-hash', scoreData.beatmapHash);
    if (scoreData.beatmapId) card.setAttribute('data-rhythiax-beatmap-id', scoreData.beatmapId);

    card.style.setProperty('--grade-color', gradeColor);
    card.style.setProperty('--grade-glow', gradeGlow);

    // Left group: Rank & Grade box
    const leftGroup = document.createElement('div');
    leftGroup.className = 'rhythiax-sc-ribbon-left';

    if (isReign) {
      leftGroup.innerHTML = `<span class="rhythiax-sc-ribbon-reign">REIGN</span>`;
    } else if (rankIdx) {
      leftGroup.innerHTML = `<span class="rhythiax-sc-ribbon-rank">${rankIdx}</span>`;
    }

    const gradeBox = document.createElement('div');
    gradeBox.className = 'rhythiax-sc-ribbon-grade';
    gradeBox.textContent = grade;
    leftGroup.appendChild(gradeBox);
    card.appendChild(leftGroup);

    const mapper = domain.extractMapper ? domain.extractMapper(scoreData) : (scoreData.mapper || '');
    const formattedDate = domain.formatScoreDate ? domain.formatScoreDate(scoreData.date) : (scoreData.date || '');
    const dateTooltip = domain.getScoreDateTooltip ? domain.getScoreDateTooltip(scoreData.date, formattedDate) : '';
    const hitsInfo = domain.formatHits ? domain.formatHits(scoreData) : { hits: scoreData.hits || scoreData.notes, total: scoreData.notes, formatted: scoreData.notes };

    // Middle: Title & Meta
    const mainGroup = document.createElement('div');
    mainGroup.className = 'rhythiax-sc-ribbon-main';

    const titleRow = document.createElement('div');
    titleRow.className = 'rhythiax-sc-ribbon-title-row';

    const titleLink = document.createElement('a');
    titleLink.className = 'rhythiax-sc-title';
    titleLink.href = scoreData.mapHref || (scoreData.beatmapId ? `/maps/${scoreData.beatmapId}` : '#');
    titleLink.textContent = scoreData.songTitle || 'Unknown Beatmap';
    titleRow.appendChild(titleLink);

    const showIcons = RhythiaX.isScoreCardModIconsEnabled ? RhythiaX.isScoreCardModIconsEnabled() : (RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('scoreCards', 'showModIcons') : true);
    const showText = RhythiaX.isScoreCardModTextEnabled ? RhythiaX.isScoreCardModTextEnabled() : (RhythiaX.isModuleOptionEnabled ? RhythiaX.isModuleOptionEnabled('scoreCards', 'showModText') : true);

    const scoreMods = (showIcons || showText) && domain.getScoreMods ? domain.getScoreMods(scoreData) : [];
    if (scoreMods.length > 0) {
      const modsWrap = document.createElement('div');
      modsWrap.className = 'rhythiax-sc-mods-wrap';
      scoreMods.forEach(mod => {
        const hasIcon = Boolean(showIcons && mod.iconUrl);
        const pill = document.createElement('span');
        pill.className = `rhythiax-sc-mod-pill ${mod.isSpeed ? 'rhythiax-sc-mod-speed' : 'rhythiax-sc-mod-badge'}${hasIcon ? ' has-icon' : ''}${!showText ? ' icon-only' : ''}`;
        pill.title = mod.isSpeed ? `Speed: ${mod.label}` : mod.label;
        if (hasIcon) {
          const icon = document.createElement('img');
          icon.src = mod.iconUrl;
          icon.alt = mod.label;
          icon.className = 'rhythiax-sc-mod-icon';
          icon.onerror = () => domain.handleModIconError(icon, mod.label);
          pill.appendChild(icon);
        }
        if (showText) {
          const labelSpan = document.createElement('span');
          labelSpan.className = 'rhythiax-sc-mod-name';
          labelSpan.textContent = mod.label;
          pill.appendChild(labelSpan);
        }
        modsWrap.appendChild(pill);
      });
      titleRow.appendChild(modsWrap);
    } else if (speedStr && (showIcons || showText)) {
      const speedIcon = showIcons && domain.getSpeedIconUrl ? domain.getSpeedIconUrl(speedStr) : null;
      const hasIcon = Boolean(speedIcon);
      const modPill = document.createElement('span');
      modPill.className = `rhythiax-sc-mod-pill rhythiax-sc-mod-speed${hasIcon ? ' has-icon' : ''}${!showText ? ' icon-only' : ''}`;
      modPill.title = `Speed: ${speedStr}`;
      if (hasIcon) {
        const icon = document.createElement('img');
        icon.src = speedIcon;
        icon.alt = speedStr;
        icon.className = 'rhythiax-sc-mod-icon';
        icon.onerror = () => domain.handleModIconError(icon, speedStr);
        modPill.appendChild(icon);
      }
      if (showText) {
        const labelSpan = document.createElement('span');
        labelSpan.className = 'rhythiax-sc-mod-name';
        labelSpan.textContent = speedStr;
        modPill.appendChild(labelSpan);
      }
      titleRow.appendChild(modPill);
    }
    mainGroup.appendChild(titleRow);

    const metaLine = document.createElement('div');
    metaLine.className = 'rhythiax-sc-meta-line';
    const metaParts = [];
    if (mapper) metaParts.push(`<span class="rhythiax-sc-meta-mapper">mapped by <strong>${escapeHtml(mapper)}</strong></span>`);
    if (formattedDate) metaParts.push(`<span class="rhythiax-sc-meta-date"${dateTooltip ? ` title="${escapeHtml(dateTooltip)}"` : ''}>${escapeHtml(formattedDate)}</span>`);
    metaLine.innerHTML = metaParts.join('<span class="rhythiax-sc-meta-sep">•</span>');
    mainGroup.appendChild(metaLine);

    card.appendChild(mainGroup);

    // Right: Fixed, neatly aligned stats
    const statsGroup = document.createElement('div');
    statsGroup.className = 'rhythiax-sc-ribbon-stats';

    function formatAccuracy(acc) {
      if (acc == null || acc === '' || acc === '—' || /nan/i.test(String(acc))) return '—%';
      const cleaned = String(acc).replace('%', '').trim();
      const num = parseFloat(cleaned);
      return Number.isFinite(num) ? `${num.toFixed(2)}%` : '—%';
    }
    const accVal = formatAccuracy(scoreData.accuracy);
    const hitsVal = hitsInfo.total && hitsInfo.total !== '--'
      ? `${hitsInfo.hits} <span class="rhythiax-sc-dock-sub">/ ${hitsInfo.total}</span>`
      : hitsInfo.hits;

    let missesMarkup = '';
    if (isFc) {
      missesMarkup = `<span class="rhythiax-sc-ribbon-stat-val rhythiax-sc-fc">Full Combo</span>`;
    } else {
      missesMarkup = `<span class="rhythiax-sc-ribbon-stat-val rhythiax-sc-miss">${formatNum(scoreData.misses || 0)}</span>`;
    }

    let rpLabel = 'Weighted RP';
    let rpVal = scoreData.weightedRp != null ? `${formatNum(scoreData.weightedRp)} WRP` : `${formatNum(scoreData.rpEarned || 0)} RP`;
    if (isReign) {
      rpLabel = 'Rating';
      rpVal = `${formatNum(scoreData.rpEarned || scoreData.weightedRp || 0)} RP`;
    }

    statsGroup.innerHTML = `
      <div class="rhythiax-sc-ribbon-stat-col stat-acc">
        <span class="rhythiax-sc-ribbon-stat-lbl">Accuracy</span>
        <span class="rhythiax-sc-ribbon-stat-val rhythiax-sc-acc">${accVal}</span>
      </div>
      <div class="rhythiax-sc-ribbon-stat-col stat-hits">
        <span class="rhythiax-sc-ribbon-stat-lbl">Hits</span>
        <span class="rhythiax-sc-ribbon-stat-val">${hitsVal}</span>
      </div>
      <div class="rhythiax-sc-ribbon-stat-col stat-misses">
        <span class="rhythiax-sc-ribbon-stat-lbl">Misses</span>
        ${missesMarkup}
      </div>
      <div class="rhythiax-sc-ribbon-stat-col stat-rp">
        <span class="rhythiax-sc-ribbon-stat-lbl">${rpLabel}</span>
        <span class="rhythiax-sc-ribbon-stat-val rhythiax-sc-wrp">${rpVal}</span>
      </div>
    `;

    // Action button
    const actionBtn = document.createElement('button');
    actionBtn.type = 'button';
    actionBtn.className = 'rhythiax-sc-action-btn rhythiax-card-btn rhythiax-card-btn-native-actions rhythiax-card-btn-actions';
    actionBtn.title = 'Score options';
    actionBtn.innerHTML = `<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.75"></circle><circle cx="12" cy="12" r="1.75"></circle><circle cx="12" cy="19" r="1.75"></circle></svg>`;
    statsGroup.appendChild(actionBtn);

    card.appendChild(statsGroup);
    domain.placeModsBelowMapper(card);
    return card;
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function formatNum(num) {
    if (RhythiaX.formatNumber) return RhythiaX.formatNumber(num);
    const n = Number(num);
    return Number.isFinite(n) ? n.toLocaleString('en-US') : String(num ?? '');
  }

  RhythiaX.ScoreCardTemplates.variant_c = { render };
})();
