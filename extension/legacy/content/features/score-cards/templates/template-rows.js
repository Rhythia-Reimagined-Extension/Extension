// ============================================================================
// Reimagined for Rhythia — Score Card Templates: Variants D (Row), E (Art), F (Table)
// Rows sized like Rhythia's own score list; numbers without boxes.
// ============================================================================

var RhythiaX = RhythiaX || {};
RhythiaX.ScoreCardTemplates = RhythiaX.ScoreCardTemplates || {};

(function () {
  'use strict';

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function formatNum(num) {
    if (RhythiaX.formatNumber) return RhythiaX.formatNumber(num);
    const n = Number(num);
    return Number.isFinite(n) ? n.toLocaleString('en-US') : String(num ?? '');
  }

  function formatAccuracy(acc) {
    const num = parseFloat(String(acc ?? '').replace('%', ''));
    return Number.isFinite(num) ? `${num.toFixed(2)}%` : '—%';
  }

  // Everything the three rows show, read once.
  function facts(scoreData) {
    const domain = RhythiaX.ScoreCardDomain;
    const grade = domain.getGrade(scoreData);
    const date = domain.formatScoreDate ? domain.formatScoreDate(scoreData.date) : (scoreData.date || '');
    const reign = Boolean(scoreData.isReign || scoreData.reign);
    const weighted = !reign && scoreData.weightedRp != null;
    return {
      grade,
      gradeColor: domain.getGradeColor(grade),
      reign,
      fc: Boolean(scoreData.fullCombo || parseInt(scoreData.misses, 10) === 0),
      acc: formatAccuracy(scoreData.accuracy),
      misses: formatNum(scoreData.misses || 0),
      hits: domain.formatHits ? domain.formatHits(scoreData) : { hits: scoreData.notes, total: scoreData.notes },
      rp: formatNum(scoreData.rpEarned ?? scoreData.weightedRp ?? 0),
      weightedRp: weighted ? formatNum(scoreData.weightedRp) : '',
      weightPercent: weighted && scoreData.weightPercent != null ? `${scoreData.weightPercent}%` : '',
      mapper: domain.extractMapper ? domain.extractMapper(scoreData) : (scoreData.mapper || ''),
      date,
      dateTooltip: domain.getScoreDateTooltip ? domain.getScoreDateTooltip(scoreData.date, date) : '',
    };
  }

  function shell(scoreData, f, variantClass) {
    const card = el('div', `rhythiax-sc-card rhythiax-score-card rhythiax-redesigned rhythiax-sc-row ${variantClass}`);
    card.setAttribute('data-rhythiax-score-id', scoreData.scoreId || '');
    if (scoreData.beatmapHash) card.setAttribute('data-rhythiax-beatmap-hash', scoreData.beatmapHash);
    if (scoreData.beatmapId) card.setAttribute('data-rhythiax-beatmap-id', scoreData.beatmapId);
    card.style.setProperty('--grade-color', f.gradeColor);
    if (scoreData.previewUrl) card.style.setProperty('--card-art-url', `url('${scoreData.previewUrl}')`);
    if (f.reign) card.classList.add('is-reign');
    return card;
  }

  // Title and "mapped by X • date"; previews.js fills the mapper in later when it is missing.
  function titleBlock(scoreData, f) {
    const box = el('div', 'rhythiax-sc-row-main');
    const title = el('a', 'rhythiax-sc-title', scoreData.songTitle || 'Unknown Beatmap');
    title.href = scoreData.mapHref || (scoreData.beatmapId ? `/maps/${scoreData.beatmapId}` : '#');
    box.appendChild(title);
    const meta = el('div', 'rhythiax-sc-meta-line');
    if (f.mapper) {
      const mapper = el('span', 'rhythiax-sc-meta-mapper', 'mapped by ');
      mapper.appendChild(el('strong', '', f.mapper));
      meta.appendChild(mapper);
    }
    if (f.date) {
      if (meta.children.length) meta.appendChild(el('span', 'rhythiax-sc-meta-sep', '•'));
      const date = el('span', 'rhythiax-sc-meta-date', f.date);
      if (f.dateTooltip) date.title = f.dateTooltip;
      meta.appendChild(date);
    }
    box.appendChild(meta);
    return box;
  }

  // Mods, speed included, as one group; follows "Mods as" (icons or labels).
  function modsGroup(scoreData) {
    const domain = RhythiaX.ScoreCardDomain;
    const showIcons = RhythiaX.isScoreCardModIconsEnabled ? RhythiaX.isScoreCardModIconsEnabled() : RhythiaX.isModuleOptionEnabled?.('scoreCards', 'showModIcons') !== false;
    const showText = RhythiaX.isScoreCardModTextEnabled ? RhythiaX.isScoreCardModTextEnabled() : RhythiaX.isModuleOptionEnabled?.('scoreCards', 'showModText') === true;
    const wrap = el('div', 'rhythiax-sc-mods-wrap rhythiax-sc-row-mods');
    if (!showIcons && !showText) return wrap;
    let mods = domain.getScoreMods ? domain.getScoreMods(scoreData) : [];
    if (!mods.length) {
      const speed = RhythiaX.normalizeSpeed ? RhythiaX.normalizeSpeed(scoreData.speed) : parseFloat(scoreData.speed || 1);
      if (speed && speed !== '1.00' && Number(speed) !== 1) {
        const label = `${speed}x`;
        mods = [{ label, isSpeed: true, iconUrl: domain.getSpeedIconUrl ? domain.getSpeedIconUrl(label) : null }];
      }
    }
    mods.forEach(mod => {
      const hasIcon = Boolean(showIcons && mod.iconUrl);
      const pill = el('span', `rhythiax-sc-mod-pill ${mod.isSpeed ? 'rhythiax-sc-mod-speed' : 'rhythiax-sc-mod-badge'}${hasIcon ? ' has-icon' : ''}${!showText ? ' icon-only' : ''}`);
      pill.title = mod.isSpeed ? `Speed: ${mod.label}` : mod.label;
      pill.tabIndex = 0;
      pill.setAttribute('aria-label', pill.title);
      if (hasIcon) {
        const icon = el('img', 'rhythiax-sc-mod-icon');
        icon.src = mod.iconUrl;
        icon.alt = mod.label;
        icon.onerror = () => domain.handleModIconError(icon, mod.label);
        pill.appendChild(icon);
      }
      if (showText || !hasIcon) pill.appendChild(el('span', 'rhythiax-sc-mod-name', mod.label));
      wrap.appendChild(pill);
    });
    return wrap;
  }

  function actionButton() {
    const btn = el('button', 'rhythiax-sc-action-btn rhythiax-card-btn rhythiax-card-btn-native-actions rhythiax-card-btn-actions');
    btn.type = 'button';
    btn.title = 'Score options';
    btn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><circle cx="12" cy="5" r="1.75"></circle><circle cx="12" cy="12" r="1.75"></circle><circle cx="12" cy="19" r="1.75"></circle></svg>';
    return btn;
  }

  // Label over value, no box.
  function stat(label, value, className = '', sub = '') {
    const box = el('div', `rhythiax-sc-row-stat ${className}`.trim());
    box.appendChild(el('span', 'rhythiax-sc-row-label', label));
    const val = el('span', 'rhythiax-sc-row-value');
    if (value instanceof Node) val.appendChild(value); else val.textContent = value;
    box.appendChild(val);
    if (sub) box.appendChild(el('span', 'rhythiax-sc-row-sub', sub));
    return box;
  }

  function missesNode(f) {
    return f.fc ? el('span', 'rhythiax-sc-fc', 'FC') : el('span', 'rhythiax-sc-miss', f.misses);
  }

  function hitsNode(f) {
    const node = el('span', '', String(f.hits.hits ?? '--'));
    if (f.hits.total && f.hits.total !== '--') node.appendChild(el('small', 'rhythiax-sc-row-total', ` / ${f.hits.total}`));
    return node;
  }

  function weightLine(f) {
    if (f.reign) return 'Reign';
    return f.weightedRp ? `${f.weightedRp} weighted${f.weightPercent ? ` · ${f.weightPercent}` : ''}` : '';
  }

  function art(className) {
    const node = el('span', `rhythiax-sc-row-art ${className}`);
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  // D: Rhythia's own row with map art, mapper, hits and RP weight added.
  function renderRow(scoreData) {
    const f = facts(scoreData);
    const card = shell(scoreData, f, 'rhythiax-sc-row-d');
    const grade = el('div', 'rhythiax-sc-row-grade');
    grade.append(el('b', '', f.grade), el('span', 'rhythiax-sc-acc', f.acc));
    const controls = el('div', 'rhythiax-sc-top-controls rhythiax-sc-row-controls');
    controls.append(
      modsGroup(scoreData),
      stat(f.fc ? 'Combo' : 'Misses', missesNode(f), 'is-misses'),
      stat('Hits', hitsNode(f), 'is-hits'),
      stat(f.reign ? 'Rating' : 'RP', `${f.rp}`, 'is-rp', weightLine(f)),
      actionButton()
    );
    const body = el('div', 'rhythiax-sc-row-body');
    body.append(grade, art('rhythiax-sc-row-thumb'), titleBlock(scoreData, f), controls);
    card.appendChild(body);
    return card;
  }

  // E: map art fills the right side behind a solid fade; stats in one line under the title.
  function renderArt(scoreData) {
    const f = facts(scoreData);
    const card = shell(scoreData, f, 'rhythiax-sc-row-e');
    card.appendChild(art('rhythiax-sc-row-backdrop'));
    const grade = el('div', 'rhythiax-sc-row-grade');
    grade.appendChild(el('b', '', f.grade));
    const main = titleBlock(scoreData, f);
    const line = el('div', 'rhythiax-sc-row-line');
    line.appendChild(el('b', 'rhythiax-sc-acc', f.acc));
    const misses = el('span', 'is-misses');
    if (f.fc) misses.appendChild(el('b', 'rhythiax-sc-fc', 'Full combo'));
    else misses.append(el('b', 'rhythiax-sc-miss', f.misses), ' misses');
    const hits = el('span', 'is-hits', `${f.hits.hits ?? '--'}${f.hits.total && f.hits.total !== '--' ? ` / ${f.hits.total}` : ''} hits`);
    const rpInline = el('span', 'is-rp-inline');
    rpInline.append(el('b', '', f.rp), ' RP');
    line.append(misses, hits, rpInline);
    main.appendChild(line);
    const controls = el('div', 'rhythiax-sc-top-controls rhythiax-sc-row-controls');
    const rp = el('div', 'rhythiax-sc-row-rp');
    rp.appendChild(el('b', '', `${f.rp} RP`));
    const sub = weightLine(f);
    if (sub) rp.appendChild(el('small', '', sub));
    controls.append(modsGroup(scoreData), rp, actionButton());
    const body = el('div', 'rhythiax-sc-row-body');
    body.append(grade, main, controls);
    card.appendChild(body);
    return card;
  }

  // F: one line per score; the first row of a list carries the column names.
  function renderTable(scoreData) {
    const f = facts(scoreData);
    const card = shell(scoreData, f, 'rhythiax-sc-row-f rhythiax-sc-table');
    const head = el('div', 'rhythiax-sc-table-head');
    head.setAttribute('aria-hidden', 'true');
    ['#', 'Map', 'Accuracy', 'Misses', 'Mods', 'Hits', 'RP', 'Weighted', ''].forEach(name => head.appendChild(el('span', '', name)));
    const row = el('div', 'rhythiax-sc-table-row');
    const rank = el('span', 'rhythiax-sc-table-rank', f.reign ? 'R' : (scoreData.rankIndex != null ? String(scoreData.rankIndex) : ''));
    if (f.reign) rank.title = 'Reign';
    const map = el('div', 'rhythiax-sc-table-map');
    map.append(art('rhythiax-sc-row-thumb'), titleBlock(scoreData, f));
    const acc = el('span', 'rhythiax-sc-table-acc');
    acc.append(el('b', '', f.grade), el('span', 'rhythiax-sc-acc', f.acc));
    const misses = el('span', 'rhythiax-sc-table-num is-misses');
    misses.title = 'Misses';
    misses.appendChild(missesNode(f));
    const hits = el('span', 'rhythiax-sc-table-num is-hits', String(f.hits.hits ?? '--'));
    hits.title = f.hits.total && f.hits.total !== '--' ? `${f.hits.hits} / ${f.hits.total} hits` : 'Hits';
    const rp = el('span', 'rhythiax-sc-table-num is-rp');
    rp.title = 'RP';
    rp.appendChild(el('b', '', f.rp));
    const weighted = el('span', 'rhythiax-sc-table-num is-weighted', f.reign ? 'Reign' : (f.weightedRp || '—'));
    weighted.title = 'Weighted RP';
    if (f.weightPercent) weighted.appendChild(el('small', '', ` ${f.weightPercent}`));
    const controls = el('div', 'rhythiax-sc-top-controls rhythiax-sc-row-controls');
    controls.appendChild(actionButton());
    row.append(rank, map, acc, misses, modsGroup(scoreData), hits, rp, weighted, controls);
    card.append(head, row);
    return card;
  }

  RhythiaX.ScoreCardTemplates.variant_d = { render: renderRow };
  RhythiaX.ScoreCardTemplates.variant_e = { render: renderArt };
  RhythiaX.ScoreCardTemplates.variant_f = { render: renderTable };
})();
