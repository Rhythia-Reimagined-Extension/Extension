// Score-card DOM rendering and enhancement mounts.
var RhythiaX = RhythiaX || {};

(function () {
  const domain = RhythiaX.ScoreCardDomain;

  function absoluteDates() {
    (RhythiaX.SiteDomBridge?.findScoreCards() || RhythiaX.findScoreCards()).forEach(card => {
      const button = card.querySelector('button');
      const target = button?.querySelector('span') || button;
      const text = target?.textContent.trim();
      if (!target || !/\d+\s*(second|minute|hour|day|week|month|year)s?\s*ago/i.test(text) || target.querySelector('.rhythiax-absolute-date')) return;
      const date = RhythiaX.parseRelativeTime(text);
      if (!date) return;
      const value = document.createElement('span');
      value.className = 'rhythiax-absolute-date';
      value.textContent = `${RhythiaX.formatDate(date)} (${RhythiaX.formatRelativeDate(date)})`;
      target.appendChild(value);
    });
  }

  function scoreUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return url.origin === window.location.origin && /^\/score\/[^/?#]+(?:\/|$)/.test(url.pathname) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function replayUrl(value) {
    try {
      const url = new URL(value, window.location.href);
      return url.protocol === 'https:' && (/^\/replay(?:\/|$)/.test(url.pathname) || /\.rhr$/i.test(url.pathname)) ? url.href : '';
    } catch (_) {
      return '';
    }
  }

  function actions(card) {
    const container = document.createElement('div');
    container.className = 'rhythiax-card-buttons';
    const replay = (RhythiaX.SiteDomBridge?.findReplayLink(card)) || RhythiaX.findReplayLink(card);
    const safeReplayUrl = replay && replayUrl(replay.getAttribute('href'));
    const showWatch = RhythiaX.isModuleOptionEnabled?.('scoreCards', 'watchReplay') !== false;

    if (safeReplayUrl) {
      const scoreHref = scoreUrl(domain.parse(card).scoreHref);
      if (showWatch && scoreHref) {
        const view = document.createElement('a');
        view.className = 'rhythiax-card-btn rhythiax-card-btn-view';
        view.href = scoreHref;
        view.title = 'View replay';
        view.setAttribute('aria-label', 'View replay');
        view.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M5 3v18l15-9z"/></svg>';
        container.appendChild(view);
      }
      const download = document.createElement('a');
      download.className = 'rhythiax-card-btn rhythiax-card-btn-download';
      download.href = safeReplayUrl;
      download.target = '_blank';
      download.rel = 'noopener noreferrer';
      download.download = '';
      download.title = 'Download replay';
      download.setAttribute('aria-label', 'Download replay');
      download.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>';
      container.appendChild(download);
    }
    return container.childElementCount ? container : null;
  }

  function redesignModern(card, parsed) {
    const score = parsed.score;
    const gradeKey = score.grade || '?';
    const gradeColor = RhythiaX.GRADE_COLORS[gradeKey] || '#888';
    const gradeBg = RhythiaX.GRADE_BG[gradeKey] || 'rgba(255,255,255,0.05)';
    const gradeStripColor = RhythiaX.GRADE_STRIP_COLORS[gradeKey] || gradeColor;

    const wrapper = document.createElement('div');
    wrapper.className = 'rhythiax-redesign-wrapper rhythiax-modern-card';

    // Left Strip (Grade + Accuracy + Scaled Accuracy Bar)
    const strip = document.createElement('div');
    strip.className = 'rhythiax-card-strip';
    strip.style.backgroundColor = gradeBg;
    strip.style.borderRight = `3px solid ${gradeStripColor}`;

    const gradeLabel = document.createElement('div');
    gradeLabel.className = 'rhythiax-card-grade-label';
    gradeLabel.textContent = gradeKey;
    gradeLabel.style.color = gradeColor;

    const accLabel = document.createElement('div');
    accLabel.className = 'rhythiax-card-acc-label';
    accLabel.textContent = score.accuracy || '—';

    const accBarWrap = document.createElement('div');
    accBarWrap.className = 'rhythiax-card-acc-bar-wrap';
    accBarWrap.title = `Accuracy: ${score.accuracy || '—'}`;

    const accBarFill = document.createElement('div');
    accBarFill.className = 'rhythiax-card-acc-bar-fill';
    const fillPercent = domain.getAccuracyFillPercent(score.accuracy);
    accBarFill.style.width = `${fillPercent}%`;
    accBarFill.style.backgroundColor = gradeColor;
    accBarWrap.appendChild(accBarFill);

    strip.append(gradeLabel, accLabel, accBarWrap);

    // Right Content
    const content = document.createElement('div');
    content.className = 'rhythiax-card-content';

    const header = document.createElement('div');
    header.className = 'rhythiax-card-header';

    const titleGroup = document.createElement('div');
    titleGroup.className = 'rhythiax-card-title-group';

    const titleRow = document.createElement('div');
    titleRow.className = 'rhythiax-card-title-row';

    const title = document.createElement('a');
    title.className = 'rhythiax-card-title';
    const scoreHref = scoreUrl(parsed.scoreHref);
    if (scoreHref) title.href = scoreHref;
    else title.removeAttribute('href');
    title.textContent = parsed.songTitle;
    title.title = parsed.songTitle;
    titleRow.appendChild(title);

    // Mod pills
    const modsList = domain.parseModsList(score);
    if (modsList.length > 0) {
      const modsWrapper = document.createElement('div');
      modsWrapper.className = 'rhythiax-card-mods';
      modsList.forEach(mod => {
        const pill = document.createElement('span');
        pill.className = 'rhythiax-mod-pill';
        pill.textContent = mod;
        const cleanMod = mod.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (/^\d+(\.\d+)?x$/i.test(mod)) {
          const speedNum = RhythiaX.normalizeSpeed(parseFloat(mod));
          const speedClass = `rhythiax-mod-speed-${speedNum.replace('.', '')}`;
          pill.classList.add('rhythiax-mod-speed', speedClass);
        } else {
          pill.classList.add(`rhythiax-mod-${cleanMod}`);
        }
        modsWrapper.appendChild(pill);
      });
      titleRow.appendChild(modsWrapper);
    }
    titleGroup.appendChild(titleRow);

    if (parsed.date) {
      const date = document.createElement('div');
      date.className = 'rhythiax-card-date';
      date.textContent = `${RhythiaX.formatDate(parsed.date)} (${score.timeAgo || RhythiaX.formatRelativeDate(parsed.date)})`;
      titleGroup.appendChild(date);
    }
    header.appendChild(titleGroup);

    const buttons = actions(card);
    if (buttons) header.appendChild(buttons);
    content.appendChild(header);

    // Stats Row
    const statsRow = document.createElement('div');
    statsRow.className = 'rhythiax-card-stats-row';

    // 1. Notes
    const notesBox = document.createElement('div');
    notesBox.className = 'rhythiax-card-stat-box';
    notesBox.innerHTML = `<span class="rhythiax-card-stat-label">Notes</span><span class="rhythiax-card-stat-value">${RhythiaX.formatNumber(parseInt(score.notes, 10) || 0)}</span>`;
    statsRow.appendChild(notesBox);

    // 2. Combo / Misses
    const comboMissBox = document.createElement('div');
    comboMissBox.className = 'rhythiax-card-stat-box';
    const missesNum = parseInt(score.misses, 10) || 0;
    if (score.fullCombo || missesNum === 0) {
      comboMissBox.innerHTML = `<span class="rhythiax-card-stat-label">Combo</span><span class="rhythiax-card-stat-value rhythiax-stat-fullcombo">Full Combo</span>`;
    } else {
      comboMissBox.innerHTML = `<span class="rhythiax-card-stat-label">Misses</span><span class="rhythiax-card-stat-value rhythiax-stat-miss">${missesNum}</span>`;
    }
    statsRow.appendChild(comboMissBox);

    // 3. Raw RP + Weighted RP
    const rpBox = document.createElement('div');
    rpBox.className = 'rhythiax-card-rp-box';
    const rawRp = RhythiaX.formatNumber(Math.round(parseFloat(score.rpEarned) || 0));
    const weightedRp = RhythiaX.formatNumber(Math.round(parseFloat(score.weightedRp) || 0));

    rpBox.innerHTML = `
      <div class="rhythiax-card-rp-main">
        <span class="rhythiax-card-rp-val">${rawRp}</span>
        <span class="rhythiax-card-rp-lbl">RP</span>
      </div>
      <div class="rhythiax-card-rp-divider"></div>
      <div class="rhythiax-card-rp-sub">
        <span class="rhythiax-card-rp-sub-lbl">Weighted</span>
        <span class="rhythiax-card-rp-sub-val">${weightedRp}</span>
      </div>
    `;
    statsRow.appendChild(rpBox);

    content.appendChild(statsRow);
    wrapper.append(strip, content);
    return wrapper;
  }

  function redesignLegacy(card, parsed) {
    const score = parsed.score;
    const gradeKey = score.grade || '?';
    const gradeColor = RhythiaX.GRADE_COLORS[gradeKey] || '#888';
    const gradeBg = RhythiaX.GRADE_BG[gradeKey] || 'rgba(255,255,255,0.05)';
    const gradeStripColor = RhythiaX.GRADE_STRIP_COLORS[gradeKey] || gradeColor;

    const wrapper = document.createElement('div');
    wrapper.className = 'rhythiax-redesign-wrapper rhythiax-legacy-card';

    const strip = document.createElement('div');
    strip.className = 'rhythiax-card-strip';
    strip.style.backgroundColor = gradeBg;
    strip.style.borderRight = `3px solid ${gradeStripColor}`;

    const grade = document.createElement('div');
    grade.className = 'rhythiax-card-grade';
    const gradeLabel = document.createElement('span');
    gradeLabel.className = 'rhythiax-card-grade-label';
    gradeLabel.textContent = gradeKey;
    gradeLabel.style.color = gradeColor;
    const accuracyLabel = document.createElement('span');
    accuracyLabel.className = 'rhythiax-card-acc-label';
    accuracyLabel.textContent = score.accuracy;
    grade.append(gradeLabel, accuracyLabel);
    strip.appendChild(grade);

    const content = document.createElement('div');
    content.className = 'rhythiax-card-content';
    const top = document.createElement('div');
    top.className = 'rhythiax-card-top';
    const title = document.createElement('a');
    title.className = 'rhythiax-card-title';
    const scoreHref = scoreUrl(parsed.scoreHref);
    if (scoreHref) title.href = scoreHref;
    else title.removeAttribute('href');
    title.textContent = parsed.songTitle;
    top.appendChild(title);

    if (parsed.date) {
      const date = document.createElement('span');
      date.className = 'rhythiax-card-date';
      date.textContent = `${RhythiaX.formatDate(parsed.date)} (${score.timeAgo || RhythiaX.formatRelativeDate(parsed.date)})`;
      top.appendChild(date);
    }
    content.appendChild(top);

    const buttons = actions(card);
    if (buttons) content.appendChild(buttons);

    const grid = document.createElement('div');
    grid.className = 'rhythiax-card-stats';
    domain.stats(score).forEach(item => {
      const stat = document.createElement('div');
      stat.className = 'rhythiax-card-stat-item';
      const label = document.createElement('span');
      label.className = 'rhythiax-card-stat-label';
      const value = document.createElement('span');
      value.className = 'rhythiax-card-stat-value';
      if (item.isMisses && item.value === '0') {
        value.textContent = 'Full Combo';
        value.classList.add('rhythiax-stat-fullcombo');
      } else {
        label.textContent = item.label;
        value.textContent = item.value;
        if (item.isMisses) value.classList.add('rhythiax-stat-miss');
      }
      stat.append(label, value);
      grid.appendChild(stat);
    });
    content.appendChild(grid);
    wrapper.append(strip, content);
    return wrapper;
  }

  function redesign(card) {
    const parsed = domain.parse(card);
    const score = parsed.score;
    card.dataset.rhythiaxScoreId = score.scoreId;
    card.dataset.rhythiaxGrade = score.grade;
    card.dataset.rhythiaxSpeed = RhythiaX.normalizeSpeed(score.speed);

    const isLegacy = RhythiaX.getScoreCardLayout?.() === 'legacy';
    return isLegacy ? redesignLegacy(card, parsed) : redesignModern(card, parsed);
  }

  function indicator() {}

  function enhance() {
    if (!RhythiaX.isModuleEnabled('scoreCards') || !RhythiaX.isModuleOptionEnabled('scoreCards', 'customCards')) return;
    const cards = RhythiaX.SiteDomBridge?.findScoreCards() || RhythiaX.findScoreCards();
    cards.forEach(card => {
      if (card.classList.contains('rhythiax-redesigned') || card.querySelector('.rhythiax-redesign-wrapper')) return;
      card.classList.add('rhythiax-score-card');
      const wrapper = redesign(card);
      card.insertBefore(wrapper, card.firstChild);
      card.classList.add('rhythiax-redesigned');
      card.querySelector('.flex.justify-end')?.style.setProperty('display', 'none');
      const type = RhythiaX.ScoreCardService.profileType(card);
      if (type) {
        card.dataset.rhythiaxScoreType = type;
        card.classList.toggle('rhythiax-reigning', type === 'reigning');
      }
      Array.from(card.children).forEach(child => {
        if (child === wrapper || child.classList.contains('rhythiax-expanded-panel')) return;
        child.setAttribute('data-rhythiax-original-display', child.style.display || '');
        child.style.display = 'none';
      });
    });
    RhythiaX.applyConfiguredScoreView?.();
    RhythiaX.log('Enhanced', cards.length, 'score cards');
  }

  RhythiaX.ScoreCardView = { absoluteDates, redesign, enhance, indicator };
})();
