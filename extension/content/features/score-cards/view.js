// Score-card DOM rendering and enhancement mounts.
var RhythiaX = RhythiaX || {};

(function () {
  const domain = RhythiaX.ScoreCardDomain;
  function absoluteDates() { (RhythiaX.SiteDomBridge?.findScoreCards() || RhythiaX.findScoreCards()).forEach(card => { const button = card.querySelector('button'); const target = button?.querySelector('span') || button; const text = target?.textContent.trim(); if (!target || !/\d+\s*(second|minute|hour|day|week|month|year)s?\s*ago/i.test(text) || target.querySelector('.rhythiax-absolute-date')) return; const date = RhythiaX.parseRelativeTime(text); if (!date) return; const value = document.createElement('span'); value.className = 'rhythiax-absolute-date'; value.textContent = `${RhythiaX.formatDate(date)} (${RhythiaX.formatRelativeDate(date)})`; target.appendChild(value); }); }
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
    const container = document.createElement('div'); container.className = 'rhythiax-card-buttons';
    const replay = (RhythiaX.SiteDomBridge?.findReplayLink(card)) || RhythiaX.findReplayLink(card);
    const safeReplayUrl = replay && replayUrl(replay.getAttribute('href'));
    if (safeReplayUrl) {
      const scoreHref = scoreUrl(domain.parse(card).scoreHref);
      if (scoreHref) { const view = document.createElement('a'); view.className = 'rhythiax-card-btn'; view.href = scoreHref; view.title = 'View replay'; view.setAttribute('aria-label', 'View replay'); view.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3v18l15-9z"/></svg>'; container.appendChild(view); }
      const download = document.createElement('a'); download.className = 'rhythiax-card-btn'; download.href = safeReplayUrl; download.target = '_blank'; download.rel = 'noopener noreferrer'; download.download = ''; download.title = 'Download replay'; download.setAttribute('aria-label', 'Download replay'); download.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m0 0 5-5m-5 5-5-5M5 15v4h14v-4"/></svg>'; container.appendChild(download);
    }
    return container.childElementCount ? container : null;
  }
  function redesign(card) {
    const parsed = domain.parse(card); const score = parsed.score; card.dataset.rhythiaxScoreId = score.scoreId; card.dataset.rhythiaxGrade = score.grade; card.dataset.rhythiaxSpeed = RhythiaX.normalizeSpeed(score.speed);
    const wrapper = document.createElement('div'); wrapper.className = 'rhythiax-redesign-wrapper';
    const strip = document.createElement('div'); strip.className = 'rhythiax-card-strip'; strip.style.background = RhythiaX.GRADE_BG[score.grade] || 'rgba(255,255,255,0.05)'; strip.style.borderRight = `3px solid ${RhythiaX.GRADE_STRIP_COLORS[score.grade] || '#888'}`;
    const grade = document.createElement('div'); grade.className = 'rhythiax-card-grade'; const gradeLabel = document.createElement('span'); gradeLabel.className = 'rhythiax-card-grade-label'; gradeLabel.textContent = score.grade; gradeLabel.style.color = RhythiaX.GRADE_COLORS[score.grade] || '#888'; const accuracyLabel = document.createElement('span'); accuracyLabel.className = 'rhythiax-card-acc-label'; accuracyLabel.textContent = score.accuracy; grade.append(gradeLabel, accuracyLabel); strip.appendChild(grade);
    const content = document.createElement('div'); content.className = 'rhythiax-card-content'; const top = document.createElement('div'); top.className = 'rhythiax-card-top'; const title = document.createElement('a'); title.className = 'rhythiax-card-title'; const scoreHref = scoreUrl(parsed.scoreHref); if (scoreHref) title.href = scoreHref; else title.removeAttribute('href'); title.textContent = parsed.songTitle; top.appendChild(title);
    if (parsed.date) { const date = document.createElement('span'); date.className = 'rhythiax-card-date'; date.textContent = `${RhythiaX.formatDate(parsed.date)} (${score.timeAgo || RhythiaX.formatRelativeDate(parsed.date)})`; top.appendChild(date); }
    content.appendChild(top); const buttons = actions(card); if (buttons) content.appendChild(buttons); const grid = document.createElement('div'); grid.className = 'rhythiax-card-stats'; domain.stats(score).forEach(item => { const stat = document.createElement('div'); stat.className = 'rhythiax-card-stat-item'; const label = document.createElement('span'); label.className = 'rhythiax-card-stat-label'; const value = document.createElement('span'); value.className = 'rhythiax-card-stat-value'; if (item.isMisses && item.value === '0') { value.textContent = 'Full Combo'; value.classList.add('rhythiax-stat-fullcombo'); } else { label.textContent = item.label; value.textContent = item.value; if (item.isMisses) value.classList.add('rhythiax-stat-miss'); } stat.append(label, value); grid.appendChild(stat); }); content.appendChild(grid); wrapper.append(strip, content); return wrapper;
  }
  function indicator() {}
  function enhance() {
    if (!RhythiaX.isModuleEnabled('scoreCards') || !RhythiaX.isModuleOptionEnabled('scoreCards', 'customCards')) return;
    const cards = RhythiaX.SiteDomBridge?.findScoreCards() || RhythiaX.findScoreCards(); const scoresPage = RhythiaX.isScoresPage?.(); let rank = 0;
    cards.forEach(card => { if (card.classList.contains('rhythiax-redesigned') || card.querySelector('.rhythiax-redesign-wrapper')) return; card.classList.add('rhythiax-score-card'); const wrapper = redesign(card); card.insertBefore(wrapper, card.firstChild); card.classList.add('rhythiax-redesigned'); card.querySelector('.flex.justify-end')?.style.setProperty('display', 'none'); const type = RhythiaX.ScoreCardService.profileType(card); if (type) { card.dataset.rhythiaxScoreType = type; card.classList.toggle('rhythiax-reigning', type === 'reigning'); } if (scoresPage && type !== 'reigning') { const title = wrapper.querySelector('.rhythiax-card-title'); const label = document.createElement('span'); label.className = 'rhythiax-score-rank'; label.textContent = `#${++rank}`; title.before(label); } Array.from(card.children).forEach(child => { if (child === wrapper || child.classList.contains('rhythiax-expanded-panel')) return; child.setAttribute('data-rhythiax-original-display', child.style.display || ''); child.style.display = 'none'; }); });
    RhythiaX.applyConfiguredScoreView?.(); RhythiaX.log('Enhanced', cards.length, 'score cards');
  }
  RhythiaX.ScoreCardView = { absoluteDates, redesign, enhance, indicator };
})();
